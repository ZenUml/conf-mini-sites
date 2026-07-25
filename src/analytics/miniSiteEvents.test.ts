import { describe, it, expect } from 'vitest';
import { buildMiniSiteEvent, MINI_SITE_EVENT_NAMES } from './miniSiteEvents';
import type { MiniSiteAnalyticsEvent, MiniSiteEventContext } from './miniSiteEvents';

const NOW_MS = 1_753_500_000_000;
const opts = { now: () => NOW_MS, insertId: () => 'insert-id-1' };
const fullContext: MiniSiteEventContext = {
  cloudId: 'cloud-1',
  accountId: 'account-1',
  instanceId: 'inst-1',
  environmentType: 'PRODUCTION',
};

describe('MINI_SITE_EVENT_NAMES', () => {
  it('is a prefixed, deduplicated catalog', () => {
    expect(new Set(MINI_SITE_EVENT_NAMES).size).toBe(MINI_SITE_EVENT_NAMES.length);
    for (const name of MINI_SITE_EVENT_NAMES) expect(name.startsWith('mini_site_')).toBe(true);
  });
});

describe('buildMiniSiteEvent', () => {
  it('stamps event name, properties, and the injected clock/id (time converted to seconds)', () => {
    const event: MiniSiteAnalyticsEvent = {
      name: 'mini_site_publish_succeeded',
      properties: { file_count: 3, total_bytes: 4096, duration_ms: 120 },
    };
    const out = buildMiniSiteEvent(event, fullContext, opts);
    expect(out.event).toBe('mini_site_publish_succeeded');
    expect(out.properties.file_count).toBe(3);
    expect(out.properties.total_bytes).toBe(4096);
    expect(out.properties.duration_ms).toBe(120);
    expect(out.insertId).toBe('insert-id-1');
    expect(out.time).toBe(Math.floor(NOW_MS / 1000));
  });

  it('attaches all common dimensions from context', () => {
    const event: MiniSiteAnalyticsEvent = {
      name: 'mini_site_render_succeeded',
      properties: { duration_ms: 5 },
    };
    const out = buildMiniSiteEvent(event, fullContext, opts);
    expect(out.properties.cloud_id).toBe('cloud-1');
    expect(out.properties.account_id).toBe('account-1');
    expect(out.properties.instance_id).toBe('inst-1');
    expect(out.properties.environment_type).toBe('PRODUCTION');
  });

  it('falls back to unknown_* sentinels for missing dimensions (never omits the property)', () => {
    const event: MiniSiteAnalyticsEvent = {
      name: 'mini_site_render_failed',
      properties: { reason: 'grant_bad_signature', duration_ms: 2 },
    };
    const out = buildMiniSiteEvent(event, {}, opts);
    expect(out.properties.cloud_id).toBe('unknown_cloud_id');
    expect(out.properties.account_id).toBe('unknown_account_id');
    expect(out.properties.instance_id).toBe('unknown_instance_id');
    expect(out.properties.environment_type).toBe('unknown_environment_type');
  });

  it('distinctId prefers accountId, then cloudId, then instanceId, then a sentinel', () => {
    const event: MiniSiteAnalyticsEvent = { name: 'mini_site_license_blocked_publish', properties: {} };
    expect(buildMiniSiteEvent(event, fullContext, opts).distinctId).toBe('account-1');
    expect(buildMiniSiteEvent(event, { cloudId: 'cloud-1', instanceId: 'inst-1' }, opts).distinctId).toBe('cloud-1');
    expect(buildMiniSiteEvent(event, { instanceId: 'inst-1' }, opts).distinctId).toBe('inst-1');
    expect(buildMiniSiteEvent(event, {}, opts).distinctId).toBe('unknown_account_id');
  });

  it('never includes a file path or file name property (privacy — bundle_validated failure)', () => {
    const event: MiniSiteAnalyticsEvent = {
      name: 'mini_site_bundle_validated',
      properties: { outcome: 'fail', reason: 'MISSING_INDEX_HTML', file_count: 5, total_bytes: 1024 },
    };
    const out = buildMiniSiteEvent(event, fullContext, opts);
    expect(Object.keys(out.properties)).not.toContain('path');
    expect(Object.keys(out.properties)).not.toContain('file');
    expect(Object.keys(out.properties)).not.toContain('file_name');
  });

  it('secret_scan_rejected carries only the bounded hit kind, never file/line', () => {
    const event: MiniSiteAnalyticsEvent = {
      name: 'mini_site_secret_scan_rejected',
      properties: { hit_count: 2, first_hit_kind: 'aws-access-key-id', file_count: 4, total_bytes: 2048 },
    };
    const out = buildMiniSiteEvent(event, fullContext, opts);
    expect(out.properties.first_hit_kind).toBe('aws-access-key-id');
    expect(Object.keys(out.properties)).not.toContain('file');
    expect(Object.keys(out.properties)).not.toContain('line');
  });

  it('two calls with distinct insertId injections produce distinct insertIds (dedup key varies per call)', () => {
    let n = 0;
    const dynOpts = { now: () => NOW_MS, insertId: () => `id-${n++}` };
    const event: MiniSiteAnalyticsEvent = { name: 'mini_site_publisher_opened', properties: { has_published_site: false } };
    const a = buildMiniSiteEvent(event, fullContext, dynOpts);
    const b = buildMiniSiteEvent(event, fullContext, dynOpts);
    expect(a.insertId).not.toBe(b.insertId);
  });
});
