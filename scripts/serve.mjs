#!/usr/bin/env node
// 零依赖静态服务器：node scripts/serve.mjs [port] 然后打开 http://localhost:8080/web/
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), port = +process.argv[2] || 8080;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
http.createServer((q, s) => { let p = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (!p.startsWith(root)) return s.writeHead(403).end();
  if (q.url === '/') { s.writeHead(302, { location: '/web/' }); return s.end(); } if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  fs.readFile(p, (e, d) => e ? s.writeHead(404).end('404') : s.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'text/plain' }).end(d)); })
  .listen(port, () => console.log(`http://localhost:${port}/web/`));
