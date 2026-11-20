import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleReferenceApi } from './src/reference-api.mjs';
import { handleRouteCache } from './src/route-cache.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff': 'font/woff',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.pdf': 'application/pdf',
};

export function createFrontendServer() {
  return createServer(async (req, res) => {
    try {
      if (await handleRouteCache(req, res)) return;
      if (await handleReferenceApi(req, res)) return;
      if (!['GET', 'HEAD'].includes(req.method)) {
        res.writeHead(405, { Allow: 'GET, HEAD' }); res.end('Method not allowed'); return;
      }
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      let target = resolve(root, `.${pathname}`);
      if (target !== resolve(root) && !target.startsWith(`${resolve(root)}${sep}`)) {
        res.writeHead(403); res.end('Forbidden'); return;
      }
      let info;
      try {
        info = await stat(target);
        if (info.isDirectory()) { target = resolve(target, 'index.html'); info = await stat(target); }
      } catch {
        // Content routes use the application router. Missing assets must never
        // receive HTML with a success response.
        if (extname(pathname) || /^\/(?:assets|src|data|wp-json)(?:\/|$)/.test(pathname)) {
          res.writeHead(404); res.end('Not found'); return;
        }
        target = resolve(root, 'index.html'); info = await stat(target);
      }
      if (!info.isFile()) { res.writeHead(404); res.end('Not found'); return; }
      const headers = { 'Content-Type': types[extname(target).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'no-cache', 'Accept-Ranges': 'bytes', 'X-Content-Type-Options': 'nosniff' };
      let start = 0; let end = info.size - 1; let status = 200;
      if (req.headers.range) {
        const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
        if (!range || (!range[1] && !range[2])) {
          res.writeHead(416, { 'Content-Range': `bytes */${info.size}` }); res.end(); return;
        }
        if (!range[1]) { start = Math.max(0, info.size - Number(range[2])); }
        else { start = Number(range[1]); end = range[2] ? Math.min(Number(range[2]), end) : end; }
        if (start > end || start >= info.size || !Number.isSafeInteger(start) || !Number.isSafeInteger(end)) {
          res.writeHead(416, { 'Content-Range': `bytes */${info.size}` }); res.end(); return;
        }
        status = 206; headers['Content-Range'] = `bytes ${start}-${end}/${info.size}`;
      }
      headers['Content-Length'] = info.size === 0 ? 0 : end - start + 1;
      res.writeHead(status, headers);
      if (req.method === 'HEAD' || info.size === 0) { res.end(); return; }
      const stream = createReadStream(target, { start, end });
      stream.on('error', () => res.destroy());
      res.on('close', () => stream.destroy());
      stream.pipe(res);
    } catch (error) {
      if (!res.headersSent) res.writeHead(error instanceof URIError ? 400 : 500);
      res.end(error instanceof URIError ? 'Invalid path' : 'Unable to serve the local snapshot');
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4173);
  const server = createFrontendServer();
  server.listen(port, '127.0.0.1', () => console.log(`IMG Models frontend available at http://127.0.0.1:${server.address().port}`));
}
