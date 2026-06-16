import { describe, it, expect } from 'vitest';
import { bytesToBase64, buildInstanceWorkerSource } from './wfpWorkerScript';
import { bundleOf } from './providerContract';

const enc = new TextEncoder();

describe('bytesToBase64', () => {
  it('round-trips bytes through base64 (matches atob)', () => {
    const bytes = enc.encode('hello <world> & "quotes"');
    const b64 = bytesToBase64(bytes);
    const back = atob(b64);
    const out = Uint8Array.from(back, (c) => c.charCodeAt(0));
    expect(new TextDecoder().decode(out)).toBe('hello <world> & "quotes"');
  });

  it('handles bytes beyond the chunk boundary (> 0x8000)', () => {
    const big = new Uint8Array(0x8000 + 100).map((_, i) => i % 256);
    const b64 = bytesToBase64(big);
    const out = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    expect(out.length).toBe(big.length);
    expect(out[0x8000 + 50]).toBe((0x8000 + 50) % 256);
  });
});

describe('buildInstanceWorkerSource', () => {
  // Evaluate the generated module the way a Worker would, then drive its default.fetch.
  async function loadWorker(source: string): Promise<{ fetch: (r: Request) => Promise<Response> }> {
    const url = 'data:text/javascript;base64,' + bytesToBase64(enc.encode(source));
    const mod = await import(/* @vite-ignore */ url);
    return mod.default;
  }

  it('serves the entrypoint at "/" with its content-type', async () => {
    const bundle = bundleOf('index.html', { 'index.html': '<h1>hi</h1>', 'assets/app.js': 'console.log(1)' });
    const worker = await loadWorker(buildInstanceWorkerSource(bundle));
    const res = await worker.fetch(new Request('https://instance/'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(await res.text()).toContain('hi');
  });

  it('serves a relative sub-resource with the right content-type', async () => {
    const bundle = bundleOf('index.html', { 'index.html': 'x', 'assets/app.js': 'console.log(1)' });
    const worker = await loadWorker(buildInstanceWorkerSource(bundle));
    const res = await worker.fetch(new Request('https://instance/assets/app.js'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('javascript');
    expect(await res.text()).toContain('console.log');
  });

  it('404s an unknown path and sets nosniff', async () => {
    const bundle = bundleOf('index.html', { 'index.html': 'x' });
    const worker = await loadWorker(buildInstanceWorkerSource(bundle));
    const ok = await worker.fetch(new Request('https://instance/'));
    expect(ok.headers.get('x-content-type-options')).toBe('nosniff');
    const miss = await worker.fetch(new Request('https://instance/nope.js'));
    expect(miss.status).toBe(404);
  });

  it('does not break out of the module for HTML containing </script>', async () => {
    const bundle = bundleOf('index.html', { 'index.html': '<div></script><script>x</script></div>' });
    const worker = await loadWorker(buildInstanceWorkerSource(bundle));
    const res = await worker.fetch(new Request('https://instance/'));
    expect(await res.text()).toContain('</script>');
  });
});
