// 回归：更新弹窗必须能弹出、能点（触摸），并盖过应用对话框 / Blockly / 对局画布；点版本号与「检查更新」都触发手动检查
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import http from 'node:http'; import path from 'node:path';
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
let puppeteer = null; try { puppeteer = (await import('puppeteer-core')).default; } catch {}
const skip = !puppeteer || !fs.existsSync(CHROME) ? 'puppeteer-core / Chrome 不可用' : false;
const root = path.resolve(new URL('..', import.meta.url).pathname);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.mjs': 'text/javascript' };

test('update dialog: manual check via version/row, tappable above dialogs, editor and match', { skip, timeout: 60000 }, async () => {
  const srv = http.createServer((q, s) => { let p = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (p.endsWith('/')) p += 'index.html';
    fs.readFile(p, (e, d) => e ? s.writeHead(404).end() : s.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'text/plain' }).end(d)); });
  await new Promise(r => srv.listen(0, r));
  const b = await puppeteer.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  try {
    const pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.emulate({ viewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }, userAgent: 'Mozilla/5.0 (Linux; Android 14) Mobile' });
    await pg.evaluateOnNewDocument(() => { window.__calls = 0; const of = window.fetch; window.fetch = (u, o) => String(u).includes('api.github.com') ? (window.__calls++, Promise.resolve(new Response(JSON.stringify({ tag_name: 'v99.0.0', body: '## 新功能\n- **粗体** 和 `代码`', assets: [{ name: 'a.apk', size: 1e7, browser_download_url: 'x' }] }), { status: 200 }))) : of(u, o); });
    await pg.goto(`http://localhost:${srv.address().port}/www/`, { waitUntil: 'networkidle0' });
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const topIs = sel => pg.evaluate(s => { const e = document.querySelector(s); const r = e.getBoundingClientRect(); return e.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); }, sel);
    const shown = () => pg.evaluate(() => { const d = document.querySelector('.uu'); return !!d && !d.classList.contains('hidden'); });
    const tap = async sel => { await (await pg.$(sel)).tap(); await wait(300); };
    for (const trigger of ['#ver', '#chkUpd']) {
      assert.ok(await topIs(trigger), trigger + ' 可点');
      const n = await pg.evaluate(() => window.__calls); await tap(trigger);
      assert.equal(await pg.evaluate(() => window.__calls), n + 1, trigger + ' 触发检查'); assert.ok(await shown(), trigger + ' 弹出');
      assert.equal(await pg.evaluate(() => document.querySelector('.uu').parentNode === document.body), true);
      assert.match(await pg.$eval('.uuNotes', e => e.innerHTML), /<b>粗体<\/b>/);
      assert.ok(await topIs('.uuGo')); assert.ok(await topIs('.uuLater'));
      await tap('.uuLater'); assert.equal(await shown(), false, '稍后 可关闭');
    }
    // 编辑器 / 对局页 + 应用对话框（z=90）打开时，弹窗仍在最上层且按钮能点
    for (const scr of ['editor', 'match']) {
      await pg.evaluate(id => { document.querySelectorAll('.screen').forEach(x => x.classList.toggle('on', x.id === id)); const d = document.getElementById('dlg'); d && d.classList.remove('hidden'); }, scr);
      await pg.evaluate(() => window.manualCheckUpdate()); await wait(200);
      assert.ok(await shown()); assert.ok(await topIs('.uuGo'), scr + ' 立即更新可点'); assert.ok(await topIs('.uuLater'), scr + ' 稍后可点');
      await tap('.uuGo'); assert.match(await pg.$eval('.uuMsg', e => e.textContent), /不支持应用内安装/, scr + ' 立即更新有响应');
      await tap('.uuLater'); assert.equal(await shown(), false);
    }
    assert.deepEqual(errs, []);
  } finally { await b.close(); srv.close(); }
});
