import { describe, it, expect, vi } from 'vitest';
import worker from './index';
import { CloudflareWfPProvider } from '../hosting/CloudflareWfPProvider';

const token = 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789+/ABCD';
const context = { waitUntil() {}, passThroughOnException() {} } as unknown as ExecutionContext;
const env = { CONTROL_SHARED_SECRET: 'test-control-secret' } as never;
async function publish(body: string) {
  return worker.fetch(new Request('https://control.example/publish?instanceId=itestwarnings', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-mini-sites-secret': 'test-control-secret' },
    body: JSON.stringify({ files: [{ path: 'dashboard.html', b64: Buffer.from(body).toString('base64') }] }),
  }), env, context);
}
describe('control publish warning policy', () => {
  it('provisions entropy-only content and returns value-free warning metadata', async () => {
    const provision = vi.spyOn(CloudflareWfPProvider.prototype, 'createInstance').mockResolvedValue();
    try {
      const result = await publish(`<p>${token}</p>`);
      expect(result.status).toBe(200);
      expect(await result.json()).toMatchObject({ ok: true, warnings: [{ file: 'dashboard.html', line: 1, kind: 'high-entropy' }] });
      expect(provision).toHaveBeenCalledOnce();
    } finally { provision.mockRestore(); }
  });
  it('blocks named credentials before provisioning even beside a resource URL', async () => {
    const provision = vi.spyOn(CloudflareWfPProvider.prototype, 'createInstance').mockResolvedValue();
    try {
      const result = await publish('<img src="data:image/png;base64,AAAA"> AKIAIOSFODNN7EXAMPLE');
      expect(result.status).toBe(422);
      expect(await result.json()).toMatchObject({ ok: false, code: 'SECRET_DETECTED' });
      expect(provision).not.toHaveBeenCalled();
    } finally { provision.mockRestore(); }
  });
});
