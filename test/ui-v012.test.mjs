// v0.12 界面：单一版本的模式卡（含两个新模式及封面）、6 档电脑、个人中心、creep 朝向与部件排布、徽章
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
const html = fs.readFileSync('www/index.html', 'utf8'), app = fs.readFileSync('www/app.js', 'utf8'), render = fs.readFileSync('www/render.js', 'utf8');
test('no basic/advanced split; 5 modes with covers', () => {
  assert.ok(!/id="level"/.test(html)); assert.ok(!/'基础'|'高级'/.test(app));
  const ids = [...app.matchAll(/\{ id: '([\w-]+)', engine: '([\w-]+)', name: '([^']+)', d: '[^']+', cover: '([\w.-]+)' \}/g)];
  assert.deepEqual(ids.map(m => m[3]), ['出生与沼泽', '夺旗', '收集与控制', '三路推塔', '山头争夺']);
  for (const m of ids) assert.ok(fs.existsSync('www/' + m[4]), m[4]);
});
test('6 AI tiers in the setup list, each has a bot file', () => {
  const d = [...html.matchAll(/data-diff="(\w+)"/g)].map(m => m[1]); assert.deepEqual(d, ['beginner', 'easy', 'normal', 'hard', 'expert', 'master']);
  for (const t of d) assert.ok(fs.existsSync(`bots/ai/${t}.mjs`));
});
test('profile page: name, badge editor, stats', () => {
  for (const id of ['profile', 'pfBadge', 'pfName', 'pfStats', 'pfTypes', 'pfC1', 'pfC2', 'pfC3', 'goProfile']) assert.ok(html.includes(`id="${id}"`), id);
  assert.ok(html.includes('badges.js')); assert.match(app, /recordResult\(/);
});
test('renderer: creeps rotate toward movement smoothly; MOVE at back, other parts centred at front; badges on creeps and spawns', () => {
  assert.match(render, /function facing\(/); assert.match(render, /arc\(Math\.PI, live\('m'\)/); assert.match(render, /let st = -total \/ 2/);
  assert.match(render, /export function setBadges/); assert.match(render, /PLAYERS\[o\.o\]\?\.name/);
});
