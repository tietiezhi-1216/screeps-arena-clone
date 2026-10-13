// 新手积木 → 代码生成测试：在 Node 里无头加载 Blockly + www/blocks.js，按积木 JSON 生成代码，检查不含 API 拼写错误并在三种模式中真实运行
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import { createRequire } from 'node:module';
import { runMatch } from '../src/engine/match.js';
import { transformModule } from '../src/engine/sandbox.js';
const require = createRequire(import.meta.url);
const Blockly = require('blockly'); Blockly.JavaScript = require('blockly/javascript').javascriptGenerator;
globalThis.Blockly = Blockly; globalThis.window = globalThis;
new Function(fs.readFileSync(new URL('../www/blocks.js', import.meta.url), 'utf8'))();
// 旧写法 { ROLE, BODY } 自动转成玩家自定义身份（arenaRoles）
const rolesOf = (o, acc = new Map()) => { if (o && typeof o === 'object') { if (o.fields?.BODY && o.fields.ROLE) { acc.set(o.fields.ROLE, o.fields.BODY); delete o.fields.BODY; } for (const v of Object.values(o)) rolesOf(v, acc); } return acc; };
const gen = (blocks, extra = []) => { const ws = new Blockly.Workspace(); const r = rolesOf(blocks); const arenaRoles = [...extra, ...[...r].map(([name, body]) => ({ name, body }))];
  Blockly.serialization.workspaces.load({ arenaRoles, blocks: { languageVersion: 0, blocks } }, ws); return window.ArenaBlocks.toCode(ws); };
const chain = (...bs) => { for (let i = bs.length - 2; i >= 0; i--) bs[i].next = { block: bs[i + 1] }; return bs[0]; };
const T = k => ({ block: { type: 't_near', fields: { K: k } } });
const each = (role, ...acts) => ({ type: 'u_each', fields: { ROLE: role }, inputs: { DO: { block: chain(...acts) } } });
const ownCreeps = (r, p) => r.frames.at(-1).objs.filter(o => o.t === 'Creep' && o.o === p);
const noErr = r => assert.ok(!r.frames.some(f => (f.log?.p1 || []).some(l => /error/i.test(l))), JSON.stringify(r.frames.find(f => (f.log?.p1 || []).some(l => /error/i.test(l)))?.log?.p1));

test('every block type generates code that compiles', () => {
  const types = Object.keys(Blockly.Blocks).filter(t => /^(b|u|a|t|c|n)_/.test(t));
  assert.ok(types.length >= 30);
  for (const t of types) { const ws = new Blockly.Workspace(); const b = ws.newBlock(t); const code = window.ArenaBlocks.toCode(ws); transformModule(code); assert.ok(code.includes('export function loop')); }
});
test('body field: counts → official body array and cost limit', () => {
  const code = gen([{ type: 'b_spawn', fields: { ROLE: 'warrior', BODY: 'move:2,attack:1,tough:1' } }]);
  assert.match(code, /H\.spawn\("warrior", \["tough","attack","move","move"\]\)/);
});
test('Spawn and Swamp: keep warriors + haulers, attack enemy base', () => {
  const code = gen([chain({ type: 'b_keep', fields: { ROLE: 'hauler', N: 2, BODY: 'carry:2,move:2' } }, { type: 'b_keep', fields: { ROLE: 'warrior', N: 6, BODY: 'attack:2,move:2' } },
    each('hauler', { type: 'a_gather' }), each('warrior', { type: 'a_attack', inputs: { T: T('enemySpawn') } }))]);
  const r = runMatch({ seed: 3, maxTicks: 400, scripts: [code, 'export function loop(){}'] }); noErr(r);
  assert.ok(ownCreeps(r, 'p1').length >= 3);
  const es = r.frames.at(-1).objs.find(o => o.t === 'StructureSpawn' && o.o === 'p2'); assert.ok(!es || es.h < es.hm || r.frames.at(-1).result?.winner === 'p1');
});
test('Capture the Flag: auto fight + capture flags, towers', () => {
  const code = gen([chain({ type: 'b_towers', fields: { M: 'both' } }, each('all', { type: 'c_ifelse', inputs: { C: { block: { type: 'c_within', fields: { R: 4 }, inputs: { T: T('enemy') } } }, DO: { block: { type: 'u_fight' } }, ELSE: { block: { type: 'a_move', inputs: { T: T('flag') } } } } }))]);
  const r = runMatch({ mode: 'capture-the-flag', seed: 2, maxTicks: 300, scripts: [code, 'export function loop(){}'] }); noErr(r);
  assert.ok(r.frames.at(-1).objs.some(o => o.t === 'Flag' && o.o === 'p1'));
});
test('Collect and Control: haulers score points', () => {
  const code = gen([chain({ type: 'b_keep', fields: { ROLE: 'hauler', N: 4, BODY: 'carry:2,move:2' } }, each('hauler', { type: 'a_score' }))]);
  const r = runMatch({ mode: 'collect-and-control', seed: 2, maxTicks: 600, scripts: [code, 'export function loop(){}'] }); noErr(r);
  const sc = r.frames.at(-1).objs.filter(o => o.t === 'ScoreCollector').reduce((a, c) => a + (c.sc?.p1 || 0), 0); assert.ok(sc > 0, 'score ' + sc);
});

test('roles: no built-in roles, only player-created ones (+ 新建/管理 entries)', () => {
  const src = fs.readFileSync(new URL('../www/blocks.js', import.meta.url), 'utf8');
  for (const w of ['战士', '弓箭手', '医疗兵', '搬运工', '工人']) assert.ok(!src.includes(w), 'built-in role left: ' + w);
  const ws = new Blockly.Workspace(); Blockly.serialization.workspaces.load({ blocks: { languageVersion: 0, blocks: [{ type: 'b_keep' }, { type: 'u_each', y: 200 }] } }, ws);
  const [keep, each] = ws.getTopBlocks(true);
  assert.deepEqual(keep.getField('ROLE').getOptions().map(o => o[1]), ['__none', '__new']);
  assert.deepEqual(each.getField('ROLE').getOptions().map(o => o[1]), ['all', '__none', '__new']);
  assert.ok(!window.ArenaBlocks.toCode(ws).includes('H.keep'), 'unset role generates nothing');
  assert.equal(Blockly.serialization.workspaces.save(ws).arenaRoles, undefined);
});
test('roles: saved with script, drive dropdown + code, rename and delete', () => {
  const ws = new Blockly.Workspace(); const R = window.ArenaBlocks.Roles;
  Blockly.serialization.workspaces.load({ arenaRoles: [{ name: '前锋', body: 'move:2,attack:2' }, { name: '奶妈', body: 'heal:1,move:1' }], blocks: { languageVersion: 0, blocks: [{ type: 'b_keep', fields: { ROLE: '前锋', N: 4 }, next: { block: { type: 'u_each', fields: { ROLE: '前锋' } } } }] } }, ws);
  const keep = ws.getTopBlocks(true)[0];
  assert.deepEqual(keep.getField('ROLE').getOptions().map(o => o[1]), ['__none', '前锋', '奶妈', '__new', '__manage']);
  assert.match(window.ArenaBlocks.toCode(ws), /H\.keep\("前锋", 4, \["attack","attack","move","move"\]\)/);
  assert.deepEqual(Blockly.serialization.workspaces.save(ws).arenaRoles, [{ name: '前锋', body: 'attack:2,move:2' }, { name: '奶妈', body: 'heal:1,move:1' }]);
  assert.equal(R.check('奶妈'), '已经有同名身份'); assert.ok(R.check('')); assert.equal(R.check('坦克'), '');
  R.rename(ws, '前锋', '先锋'); assert.ok(ws.getAllBlocks(false).every(b => b.getFieldValue('ROLE') === '先锋'));
  assert.match(window.ArenaBlocks.toCode(ws), /H\.mine\("先锋"\)/);
  R.remove(ws, '先锋'); assert.equal(keep.getFieldValue('ROLE'), '__none'); assert.ok(!window.ArenaBlocks.toCode(ws).includes('H.keep'));
});
test('roles: custom role spawns real creeps tagged with its name', () => {
  const code = gen([chain({ type: 'b_keep', fields: { ROLE: '小兵', N: 3 } }, each('小兵', { type: 'a_attack', inputs: { T: T('enemySpawn') } }))], [{ name: '小兵', body: 'attack:1,move:1' }]);
  const r = runMatch({ seed: 3, maxTicks: 200, scripts: [code, 'export function loop(){}'] }); noErr(r); assert.ok(ownCreeps(r, 'p1').length >= 2);
});
