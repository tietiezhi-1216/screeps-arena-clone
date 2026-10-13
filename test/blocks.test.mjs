// 新手积木 → 代码生成测试：在 Node 里无头加载 Blockly + www/blocks.js，按积木 JSON 生成代码，检查不含 API 拼写错误并在三种模式中真实运行
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import { createRequire } from 'node:module';
import { runMatch } from '../src/engine/match.js';
import { transformModule } from '../src/engine/sandbox.js';
const require = createRequire(import.meta.url);
const Blockly = require('blockly'); Blockly.JavaScript = require('blockly/javascript').javascriptGenerator;
globalThis.Blockly = Blockly; globalThis.window = globalThis;
new Function(fs.readFileSync(new URL('../www/blocks.js', import.meta.url), 'utf8'))();
const gen = blocks => { const ws = new Blockly.Workspace(); Blockly.serialization.workspaces.load({ blocks: { languageVersion: 0, blocks } }, ws); return window.ArenaBlocks.toCode(ws); };
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
