import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
};

const fileFor = (dist, base, url) => {
  const path = decodeURIComponent(new URL(url, 'http://localhost').pathname);
  if (!path.startsWith(base)) return null;
  const file = normalize(join(dist, path.slice(base.length)));
  if (!file.startsWith(dist)) return null;
  if (existsSync(file) && statSync(file).isDirectory()) return join(file, 'index.html');
  return file;
};

/** Serves a built site under its base path on a free local port, and resolves to its address and a close function. */
export function serveDist(dist, base) {
  const server = createServer((request, response) => {
    const file = fileFor(dist, base, request.url ?? '/');
    if (!file || !existsSync(file)) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(response);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ url: `http://127.0.0.1:${port}${base}`, close: () => new Promise((done) => server.close(done)) });
    });
  });
}
