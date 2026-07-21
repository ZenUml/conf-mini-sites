// Minimal static file servers for capture. Two of them run during Act 1:
//   :3000 -> promo/site        (the real prototype; the address bar's claim must be literally true)
//   :3100 -> promo/capture     (chrome-shell.html, which iframes :3000)
// Deliberately dependency-free — this must not drag a dev-server framework into the repo.
import { createServer, type Server } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

export function startStatic(dir: string, port: number): Promise<Server> {
  const root = resolve(dir);
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://localhost');
      // normalize + prefix check: a capture server still shouldn't serve the whole disk on `..`
      let rel = decodeURIComponent(url.pathname);
      if (rel.endsWith('/')) rel += 'index.html';
      const filePath = normalize(join(root, rel));
      if (!filePath.startsWith(root)) {
        res.writeHead(403).end('forbidden');
        return;
      }
      const info = await stat(filePath);
      const target = info.isDirectory() ? join(filePath, 'index.html') : filePath;
      const body = await readFile(target);
      res.writeHead(200, {
        'content-type': MIME[extname(target).toLowerCase()] || 'application/octet-stream',
        'cache-control': 'no-store',
      });
      res.end(body);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
    }
  });
  return new Promise((res, rej) => {
    server.once('error', (e: NodeJS.ErrnoException) => {
      rej(e.code === 'EADDRINUSE'
        ? new Error(`port ${port} is already in use — free it (lsof -nP -iTCP:${port} -sTCP:LISTEN) before capturing`)
        : e);
    });
    // Bound to the IPv4 loopback on purpose; see the note in chrome-shell.html about ::1 winning
    // name resolution and shadowing this server.
    server.listen(port, '127.0.0.1', () => res(server));
  });
}

export function stopStatic(server: Server): Promise<void> {
  return new Promise((res) => server.close(() => res()));
}
