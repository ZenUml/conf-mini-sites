import { describe, it, expect, beforeEach, vi } from 'vitest';
import { startSessionReplay, __resetSessionReplayForTests } from './sessionReplay';

function fakeSdk() {
  return {
    init: vi.fn(),
    identify: vi.fn(),
    register: vi.fn(),
    start_session_recording: vi.fn(),
  };
}

const CONFIG = {
  token: 'tok-1',
  recordSessionsPercent: 100,
  cloudId: 'cloud-1',
  accountId: 'account-1',
  environmentType: 'PRODUCTION',
  surface: 'publisher',
};

describe('startSessionReplay', () => {
  beforeEach(() => __resetSessionReplayForTests());

  it('records, identifies and registers the common dimensions', async () => {
    const sdk = fakeSdk();
    const outcome = await startSessionReplay(CONFIG, { loader: async () => sdk });

    expect(outcome).toBe('started');
    expect(sdk.init).toHaveBeenCalledWith('tok-1', expect.objectContaining({ record_sessions_percent: 100 }));
    expect(sdk.identify).toHaveBeenCalledWith('account-1');
    expect(sdk.register).toHaveBeenCalledWith(expect.objectContaining({
      product_type: 'mini-sites',
      cloud_id: 'cloud-1',
      environment_type: 'PRODUCTION',
      surface: 'publisher',
    }));
    expect(sdk.start_session_recording).toHaveBeenCalledTimes(1);
  });

  it('does not autocapture — the resolver owns the funnel events', async () => {
    const sdk = fakeSdk();
    await startSessionReplay(CONFIG, { loader: async () => sdk });
    expect(sdk.init.mock.calls[0][1]).toMatchObject({ autocapture: false, track_pageview: false });
  });

  // The whole point of the lazy loader: an unsampled session must not fetch the SDK at all.
  it('never loads the SDK when there is no token', async () => {
    const loader = vi.fn();
    expect(await startSessionReplay({ recordSessionsPercent: 100 }, { loader })).toBe('skipped_no_token');
    expect(loader).not.toHaveBeenCalled();
  });

  it('never loads the SDK when the sample rate is zero or absent', async () => {
    const loader = vi.fn();
    expect(await startSessionReplay({ token: 'tok-1', recordSessionsPercent: 0 }, { loader })).toBe('skipped_sampled');
    expect(await startSessionReplay({ token: 'tok-1' }, { loader })).toBe('skipped_sampled');
    expect(loader).not.toHaveBeenCalled();
  });

  it('starts at most once per iframe', async () => {
    const sdk = fakeSdk();
    const loader = async () => sdk;
    expect(await startSessionReplay(CONFIG, { loader })).toBe('started');
    expect(await startSessionReplay(CONFIG, { loader })).toBe('skipped_already_started');
    expect(sdk.start_session_recording).toHaveBeenCalledTimes(1);
  });

  // A blocked CDN, a CSP miss or an SDK change must degrade to nothing, never throw into the caller.
  it('swallows a loader failure', async () => {
    const loader = async () => { throw new Error('blocked by CSP'); };
    await expect(startSessionReplay(CONFIG, { loader })).resolves.toBe('failed');
  });

  it('swallows an SDK that loads without start_session_recording', async () => {
    const broken = { init: vi.fn(), identify: vi.fn(), register: vi.fn() };
    await expect(startSessionReplay(CONFIG, { loader: async () => broken })).resolves.toBe('failed');
  });
});
