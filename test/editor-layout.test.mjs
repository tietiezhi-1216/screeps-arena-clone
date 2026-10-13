// 积木页布局（v0.10.4 分类栏内缩）对齐 DESIGN.md「Editor layout」：满屏工作区、左上 32×32 按钮列（间距 6）、底部分类栏高 37、无滚动条
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import http from 'node:http'; import path from 'node:path';
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
let puppeteer = null; try { puppeteer = (await import('puppeteer-core')).default; } catch {}
const skip = !puppeteer || !fs.existsSync(CHROME) ? 'puppeteer-core / Chrome 不可用' : false;
const root = path.resolve(new URL('..', import.meta.url).pathname);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.mjs': 'text/javascript' };
for (const [w, h] of [[915, 412], [412, 915]]) test(`editor layout ${w}x${h}`, { skip, timeout: 60000 }, async () => {
  const srv = http.createServer((q, s) => { let p = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (p.endsWith('/')) p += 'index.html';
    fs.readFile(p, (e, d) => e ? s.writeHead(404).end() : s.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'text/plain' }).end(d)); });
  await new Promise(r => srv.listen(0, r));
  const b = await puppeteer.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  try {
    const pg = await b.newPage(); await pg.setViewport({ width: w, height: h });
    await pg.goto(`http://localhost:${srv.address().port}/www/`, { waitUntil: 'networkidle0' });
    const wait = ms => new Promise(r => setTimeout(r, ms)); await pg.waitForFunction(() => window.BackStack && document.querySelector('#goScripts')?.onclick !== undefined); await wait(500);
    await pg.evaluate(() => document.querySelector('#goScripts').click()); await wait(300);
    await pg.evaluate(() => document.querySelector('#newScript').click()); await wait(300);
    await pg.evaluate(() => [...document.querySelectorAll('#dlg button')].pop().click()); await pg.waitForSelector('#cats button'); await wait(400);
    const m = await pg.evaluate(() => { const r = s => { const e = document.querySelector(s); const b = e.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; };
      const btns = [...document.querySelectorAll('#edTools button')].map(e => e.getBoundingClientRect());
      const vis = [...document.querySelectorAll('#blocklyDiv .blocklyScrollbarHorizontal,#blocklyDiv .blocklyScrollbarVertical')].some(e => getComputedStyle(e).display !== 'none');
      return { ws: r('#blocklyDiv'), tabs: r('#edTabs'), btn: { w: btns[0].width, h: btns[0].height, x: btns[0].left, y: btns[0].top, gap: btns[1].top - btns[0].bottom }, cat: r('#cats button'), done: r('#edDone'), bord: getComputedStyle(document.querySelector('#blocklyDiv')).borderTopWidth, vis, header: !!document.querySelector('#editor .edbar'), empty: document.querySelector('#edEmpty').textContent }; });
    assert.deepEqual([m.ws.x, m.ws.y, m.ws.w, m.ws.h], [0, 0, w, h - 37]);
    assert.equal(m.tabs.h, 45); assert.equal(m.tabs.y, h - 45);
    // 分类栏两端/底部内缩，避开圆角与手势横条（含「完成」）
    assert.ok(m.cat.x >= 16, '左端内缩 ' + m.cat.x); assert.ok(m.done.x + m.done.w <= w - 16, '完成右端内缩'); assert.ok(m.done.y + m.done.h <= h - 12, '底部留白');
    assert.deepEqual([m.btn.w, m.btn.h, m.btn.x, m.btn.y, m.btn.gap], [32, 32, 8, 8, 6]);
    assert.equal(m.cat.h, 28); assert.equal(m.done.h, 28);
    assert.equal(m.bord, '0px'); assert.equal(m.vis, false); assert.equal(m.header, false); assert.equal(m.empty, '点下方分类添加积木');
  } finally { await b.close(); srv.close(); }
});
