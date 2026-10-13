// 回归：安卓返回键逐层关闭再逐级返回，首页按两次才退出
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import http from 'node:http'; import path from 'node:path';
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
let puppeteer = null; try { puppeteer = (await import('puppeteer-core')).default; } catch {}
const skip = !puppeteer || !fs.existsSync(CHROME) ? 'puppeteer-core / Chrome 不可用' : false;
const root = path.resolve(new URL('..', import.meta.url).pathname);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.mjs': 'text/javascript' };

test('back button: layers first, then page by page, double-press exit on home', { skip, timeout: 60000 }, async () => {
  const srv = http.createServer((q, s) => { let p = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (p.endsWith('/')) p += 'index.html';
    fs.readFile(p, (e, d) => e ? s.writeHead(404).end() : s.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'text/plain' }).end(d)); });
  await new Promise(r => srv.listen(0, r));
  const b = await puppeteer.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  try {
    const pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.evaluateOnNewDocument(() => { window.__exit = 0; window.__exitHook = () => window.__exit++; });
    await pg.goto(`http://localhost:${srv.address().port}/www/`, { waitUntil: 'networkidle0' });
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const back = async () => { await pg.evaluate(() => window.hardwareBack()); await wait(150); };
    const scr = () => pg.evaluate(() => document.querySelector('.screen.on').id);
    const click = async s => { await pg.evaluate(s => document.querySelector(s).click(), s); await wait(300); };
    assert.equal(await pg.evaluate(() => typeof window.hardwareBack), 'function', '已注册 backButton');
    assert.ok(await pg.evaluate(() => window.BackStack && BackStack._layers.length >= 6), '使用系列共用 back-stack.js');
    assert.equal(await pg.evaluate(() => /hardwareBack\(\)\s*\{/.test(document.documentElement.outerHTML)), false);
    await click('#goScripts'); assert.equal(await scr(), 'scripts');
    await click('#newScript'); assert.ok(await pg.$('#dlg:not(.hidden)'));
    await back(); assert.equal(await pg.$('#dlg:not(.hidden)'), null, '返回先关对话框'); assert.equal(await scr(), 'scripts');
    await click('#newScript'); await pg.evaluate(() => [...document.querySelectorAll('#dlg button')].pop().click()); await wait(500);
    assert.equal(await scr(), 'editor');
    await click('#cats button'); assert.equal(await pg.evaluate(() => document.querySelector('.blocklyFlyout') && getComputedStyle(document.querySelector('.blocklyFlyout')).display !== 'none'), true);
    await back(); assert.equal(await scr(), 'editor', '先收起积木抽屉');
    // 动态弹窗（身体部件面板同类）
    await pg.evaluate(() => { const d = document.createElement('div'); d.className = 'dlg'; d.id = 'bodyPanel'; document.body.appendChild(d); });
    await back(); assert.equal(await pg.$('#bodyPanel'), null, '先关部件面板'); assert.equal(await scr(), 'editor');
    // 更新弹窗
    await pg.evaluate(() => { const u = UpdateUI.create({}); u.show({ tag: 'v9', current: 'v1', notes: '' }); });
    await back(); assert.equal(await pg.$('.uu:not(.hidden)'), null, '先关更新弹窗');
    await back(); assert.equal(await scr(), 'scripts', '编辑器返回到脚本页而不是首页');
    await back(); assert.equal(await scr(), 'home');
    await back(); assert.equal(await pg.evaluate(() => window.__exit), 0, '首页第一次不退出');
    assert.equal(await pg.$eval('#toast', e => e.textContent), '再按一次退出');
    await back(); assert.equal(await pg.evaluate(() => window.__exit), 1, '2 秒内第二次退出');
    // 超过 2 秒的两次返回不退出
    await pg.evaluate(() => { let t = 1e9; BackStack._now = () => t; window.__adv = ms => { t += ms; }; });
    await back(); await pg.evaluate(() => window.__adv(2500)); await back();
    assert.equal(await pg.evaluate(() => window.__exit), 1, '间隔超过 2 秒不退出');
    await pg.evaluate(() => { BackStack._now = null; });
    assert.deepEqual(errs, []);
  } finally { await b.close(); srv.close(); }
});
