import { describe, it, expect, vi } from 'vitest';
import { sendMiniSiteEvents } from './mixpanelClient';
import type { MixpanelServiceEvent } from './miniSiteEvents';

const event: MixpanelServiceEvent = {
  event: 'publish_succeeded',
  properties: { file_count: 3, total_bytes: 100, cloud_id: 'cloud-1' },
  distinctId: 'cloud-1',
  insertId: 'insert-1',
  time: 1_753_500_000,
};

function fakeFetch(response: { ok: boolean; status?: number }) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const impl = vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return { ok: response.ok, status: response.status ?? (response.ok ? 200 : 500) } as Response;
  });
  return { impl: impl as unknown as typeof fetch, calls };
}

describe('sendMiniSiteEvents', () => {
  it('no-ops without a network call when the token is missing', async () => {
    const { impl, calls } = fakeFetch({ ok: true });
    await sendMiniSiteEvents([event], { token: undefined, fetchImpl: impl });
    expect(calls.length).toBe(0);
  });

  it('no-ops without a network call when there are no events', async () => {
    const { impl, calls } = fakeFetch({ ok: true });
    await sendMiniSiteEvents([], { token: 'proj-token', fetchImpl: impl });
    expect(calls.length).toBe(0);
  });

  it('POSTs to the Import API with Basic-auth over the token and the event batch', async () => {
    const { impl, calls } = fakeFetch({ ok: true });
    await sendMiniSiteEvents([event], { token: 'proj-token', fetchImpl: impl });
    expect(calls.length).toBe(1);
    expect(calls[0]!.url).toBe('https://api.mixpanel.com/import');
    expect(calls[0]!.init.method).toBe('POST');
    const headers = calls[0]!.init.headers as Record<string, string>;
    expect(headers.authorization).toBe(`Basic ${btoa('proj-token:')}`);
    expect(headers['content-type']).toBe('application/json');

    const body = JSON.parse(calls[0]!.init.body as string);
    expect(body).toEqual([
      {
        event: 'publish_succeeded',
        properties: {
          file_count: 3,
          total_bytes: 100,
          cloud_id: 'cloud-1',
          token: 'proj-token',
          time: 1_753_500_000,
          $insert_id: 'insert-1',
          distinct_id: 'cloud-1',
        },
      },
    ]);
  });

  it('batches multiple events into a single request', async () => {
    const { impl, calls } = fakeFetch({ ok: true });
    const second: MixpanelServiceEvent = { ...event, event: 'render_succeeded', insertId: 'insert-2' };
    await sendMiniSiteEvents([event, second], { token: 'proj-token', fetchImpl: impl });
    expect(calls.length).toBe(1);
    const body = JSON.parse(calls[0]!.init.body as string);
    expect(body.length).toBe(2);
  });

  it('swallows a non-ok response rather than throwing', async () => {
    const { impl } = fakeFetch({ ok: false, status: 401 });
    await expect(sendMiniSiteEvents([event], { token: 'bad-token', fetchImpl: impl })).resolves.toBeUndefined();
  });

  it('swallows a network rejection rather than throwing', async () => {
    const throwing = vi.fn(async () => {
      throw new Error('network down');
    }) as unknown as typeof fetch;
    await expect(sendMiniSiteEvents([event], { token: 'proj-token', fetchImpl: throwing })).resolves.toBeUndefined();
  });
});
