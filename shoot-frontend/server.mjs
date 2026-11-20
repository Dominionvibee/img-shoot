import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)));
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
};

export function createAppServer() {
  return createServer(async (request, response) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    } catch {
      response.writeHead(400).end('Bad request');
      return;
    }

    const target = resolve(root, `.${pathname}`);
    if (target !== root && !target.startsWith(`${root}${sep}`)) {
      response.writeHead(403).end('Forbidden');
      return;
    }

    let file = target;
    try {
      if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
      const content = await readFile(file);
      response.writeHead(200, {
        'Content-Type': mimeTypes[extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff'
      });
      response.end(content);
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') response.writeHead(404).end('Not found');
      else response.writeHead(500).end('Internal server error');
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.PORT || 4173);
  createAppServer().listen(port, '127.0.0.1', () => {
    console.log(`IMG Shoot frontend available at http://127.0.0.1:${port}`);
  });
}
