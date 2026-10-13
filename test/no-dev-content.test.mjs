// 回归：更新弹窗不显示 SHA-256 等技术信息；界面里不出现 GitHub/仓库/求星等开发者内容
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import http from 'node:http'; import path from 'node:path';
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
let puppeteer = null; try { puppeteer = (await import('puppeteer-core')).default; } catch {}
const skip = !puppeteer || !fs.existsSync(CHROME) ? 'puppeteer-core / Chrome 不可用' : false;
const root = path.resolve(new URL('..', import.meta.url).pathname);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg' };
const BAD = /sha-?256|校验值|github|仓库|star|commit|debug|开发者|[0-9a-f]{40,64}/i;
const HEX = 'a'.repeat(64);
test('no SHA / GitHub / developer strings in rendered UI', { skip, timeout: 60000 }, async () => {
  const srv = http.createServer((q, s) => { let p = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (p.endsWith('/')) p += 'index.html';
    fs.readFile(p, (e, d) => e ? s.writeHead(404).end() : s.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'text/plain' }).end(d)); });
  await new Promise(r => srv.listen(0, r));
  const b = await puppeteer.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  try {
    const pg = await b.newPage(); await pg.setViewport({ width: 412, height: 915 });
    await pg.evaluateOnNewDocument(h => { const of = window.fetch; window.fetch = (u, o) => String(u).includes('api.github.com') ? Promise.resolve(new Response(JSON.stringify({ tag_name: 'v99.0.0',
      body: `## 新功能\n- 好玩的改动\n\nSHA-256: ${h}\n- 安装包校验值：${h}`, assets: [{ name: 'a.apk', size: 1e7, browser_download_url: 'x' }] }), { status: 200 })) : of(u, o); }, HEX);
    await pg.goto(`http://localhost:${srv.address().port}/www/`, { waitUntil: 'networkidle0' });
    assert.doesNotMatch(await pg.evaluate(() => document.body.innerText), BAD, '首页');
    assert.equal(await pg.evaluate(() => '__sa' in window), false);
    await pg.evaluate(() => window.manualCheckUpdate()); await new Promise(r => setTimeout(r, 400));
    const t = await pg.$eval('.uu', e => e.innerText);
    assert.match(t, /好玩的改动/); assert.doesNotMatch(t, BAD, '更新弹窗');
  } finally { await b.close(); srv.close(); }
});
