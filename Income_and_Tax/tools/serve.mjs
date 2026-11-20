import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

const port = Number(process.env.INCOME_TAX_PORT || 8139);
const types = { '.html': 'text/html', '.css': 'text/css', '.mjs': 'text/javascript',
  '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json' };

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const file = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname).slice(1);
    if (!/^[a-zA-Z0-9&._/-]+$/.test(file) || file.split('/').some(part => part.startsWith('.'))) {
      response.writeHead(404).end();
      return;
    }
    const body = await readFile(new URL('../' + file.replaceAll('&', '%26'), import.meta.url));
    response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(body);
  } catch {
    response.writeHead(404).end();
  }
}).listen(port, '127.0.0.1', () => process.stdout.write('http://127.0.0.1:' + port + '/\n'));
