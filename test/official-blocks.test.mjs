// v0.11 官方 API 积木：覆盖率、代码生成、无封装助手、自定义身份、函数/变量，以及用积木拼出的完整程序在 6 个官方模式里赢简单 AI
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import { Blockly, AB, program } from './helpers-blocks.mjs';
import { runMatch } from '../src/engine/match.js';
import { transformModule } from '../src/engine/sandbox.js';
const SRC = fs.readFileSync(new URL('../www/blocks.js', import.meta.url), 'utf8');
const EASY = fs.readFileSync(new URL('../bots/ai/beginner.mjs', import.meta.url), 'utf8');
const noErr = r => { const bad = r.frames.flatMap(f => f.log?.p1 || []).filter(l => /error/i.test(l)); assert.deepEqual(bad, []); };

test('coverage: every official API in docs/OFFICIAL_COVERAGE.md has a block in a category', () => {
  const md = fs.readFileSync(new URL('../docs/OFFICIAL_COVERAGE.md', import.meta.url), 'utf8');
  const keys = md.match(/```api\n([\s\S]*?)```/)[1].split(/\s+/).filter(Boolean);
  assert.ok(keys.length >= 250, 'manifest size ' + keys.length);
  const inCat = new Set(Object.values(AB.CAT).flat().map(e => e.type));
  const missing = keys.filter(k => !(AB.API[k] || []).some(t => Blockly.Blocks[t] && inCat.has(t)));
  assert.deepEqual(missing, []);
  for (const k of ['utils.getObjectsByPrototype', 'Creep.attack', 'StructureSpawn.spawnCreep', 'pathFinder.searchPath', 'pathFinder.CostMatrix', 'const.ERR_NOT_IN_RANGE', 'const.BODYPART_COST', 'arena.RESOURCE_SCORE_X', 'proto.BodyPart', 'prop.fatigue']) assert.ok(keys.includes(k), k);
});
test('categories: 14 categories in order, each non-empty (var/func are dynamic)', () => {
  assert.deepEqual(AB.CATS.map(c => c.name), ['游戏信息', '查找', '对象属性', '兵的动作', '基地与建筑', '地图与寻路', '常量', '判断', '循环', '数字', '文字', '列表', '变量', '函数']);
  for (const c of AB.CATS) if (!c.custom) assert.ok(AB.CAT[c.id].length > 0, c.name);
});
test('labels are plain Chinese: no function / constant names on custom blocks', () => {
  const ws = new Blockly.Workspace();
  for (const t of Object.keys(AB.BLOCKS)) { const b = ws.newBlock(t); const s = b.toString();
    assert.ok(!/[a-z][A-Z]|[A-Z]{2,}_|\w+\(|getObjects|spawnCreep|moveTo/.test(s), `${t}: ${s}`); }
});
test('no pre-packaged helpers: removed blocks, no H.* runtime', () => {
  for (const t of ['b_keep', 'b_spawn', 'u_each', 'u_fight', 'a_gather', 'a_score', 't_near', 'n_count', 'c_within']) assert.ok(!Blockly.Blocks[t], 'still defined: ' + t);
  assert.ok(!/const LIB|H\.(keep|fight|gather|near|attack)\(/.test(SRC));
  for (const w of ['靠近并攻击', '保持 %1 有', '按身体自动战斗', '采集能量并送回基地']) assert.ok(!SRC.includes(w), w);
});
test('every flyout block generates code that compiles in the sandbox, without helpers', () => {
  for (const e of Object.values(AB.CAT).flat()) {
    const ws = new Blockly.Workspace(); const b = Blockly.serialization.blocks.append(e, ws);
    if (e.type === 'controls_flow_statements') { const loop = ws.newBlock('controls_whileUntil'); loop.getInput('DO').connection.connect(b.previousConnection); }
    else if (b.outputConnection) { const s = ws.newBlock('t_log'); s.getInput('V').connection.connect(b.outputConnection); }
    const code = AB.toCode(ws); assert.doesNotThrow(() => transformModule(code), e.type + '\n' + code); assert.ok(!/\bH\./.test(code), e.type);
  }
});
test('general blocks: number input, math, variables persist across ticks, functions with params + return', () => {
  const P = program(), { B } = P;
  const fn = B('procedures_defreturn', { NAME: '加倍' }, { STACK: [], RETURN: B('math_arithmetic', { OP: 'MULTIPLY' }, { A: P.get('数'), B: P.n(2) }) }, { params: [{ name: '数', id: 'v_p' }] });
  fn.extraState.params[0].id = (() => { P.get('数'); return 'v0'; })();
  const main = P.chain([
    P.if(B('logic_compare', { OP: 'EQ' }, { A: B('g_ticks'), B: P.n(1) }), P.set('计数', P.n(0))),
    B('math_change', { VAR: { id: 'v1' } }, { DELTA: P.n(1) }),
    B('controls_repeat_ext', null, { TIMES: P.n(3), DO: B('math_change', { VAR: { id: 'v1' } }, { DELTA: P.n(1) }) }),
    B('t_log', null, { V: B('text_join', null, { ADD0: P.t('结果'), ADD1: B('procedures_callreturn', null, { ARG0: P.get('计数') }, { name: '加倍', params: ['数'] }) }, { itemCount: 2 }) }),
  ]);
  const code = P.gen([fn, main]);
  assert.match(code, /function 加倍\(数\)/); assert.match(code, /^var .*计数/m); assert.ok(!/\bH\./.test(code));
  const seen = []; runMatch({ seed: 1, scripts: [code, 'export function loop(){}'], maxTicks: 3, onFrame: f => seen.push(...(f.log?.p1 || []).map(String)) });
  const logs = seen.join('\n');
  assert.match(logs, /结果8/); assert.match(logs, /结果16/); assert.match(logs, /结果24/);
});
test('body panel value + player roles → official body array for spawnCreep; rename / delete', () => {
  const P = program(), { B } = P;
  assert.match(P.gen(B('s_spawn', null, { S: P.first(P.mineOf('StructureSpawn')), B: B('s_body', { BODY: 'move:2,attack:1,tough:1' }) })), /spawnCreep\(\["tough","attack","move","move"\]\)/);
  const ws = P.load(B('s_spawn', null, { S: P.first(P.mineOf('StructureSpawn')), B: B('s_role', { ROLE: '前锋' }) }), [{ name: '前锋', body: 'attack:2,move:2' }]);
  const role = ws.getAllBlocks(false).find(b => b.type === 's_role');
  assert.deepEqual(role.getField('ROLE').getOptions().map(o => o[1]), ['__none', '前锋', '__new', '__manage']);
  assert.match(AB.toCode(ws), /spawnCreep\(\["attack","attack","move","move"\]\)/);
  AB.Roles.rename(ws, '前锋', '先锋'); assert.equal(role.getFieldValue('ROLE'), '先锋');
  AB.Roles.remove(ws, '先锋'); assert.equal(role.getFieldValue('ROLE'), '__none'); assert.match(AB.toCode(ws), /spawnCreep\(\[\]\)/);
  for (const w of ['战士', '弓箭手', '医疗兵', '搬运工', '工人']) assert.ok(!SRC.includes(w), w);
});
test('generation: official imports per module, optional args omitted, results via 上一个动作的结果', () => {
  const P = program(), { B } = P;
  const code = P.gen(P.chain([
    B('a_transfer', null, { C: P.get('兵'), R: P.res('RESOURCE_SCORE_X'), T: P.get('目标') }),
    B('c_site', { T: 'StructureTower' }, { P: B('m_pos', null, { X: P.n(10), Y: P.n(12) }) }),
    B('t_log', null, { V: P.prop(P.result(), 'error') }),
    P.set('路', B('m_search', null, { A: P.get('兵'), G: B('m_goal', null, { P: P.get('目标'), R: P.n(3) }), OPT: B('m_opts', null, { FLEE: P.bool(true), CM: B('m_cm') }) })),
  ]));
  assert.match(code, /import \{ RESOURCE_SCORE_X \} from 'arena';/); assert.match(code, /import \{ CostMatrix, searchPath \} from 'game\/path-finder';/);
  assert.match(code, /transfer\(目标, RESOURCE_SCORE_X\);/); assert.match(code, /createConstructionSite\(\(\{ x: 10, y: 12 \}\), StructureTower\)/);
  assert.match(code, /searchPath\(兵, \(\{ pos: 目标, range: 3 \}\), \(\{ flee: true, costMatrix: new \(CostMatrix\)\(\) \}\)\)/);
  assert.match(code, /console\.log\(\(__r\)\?\.error\)/);
});

// ---------- 完整示例程序（只用积木拼）：每个官方模式都赢简单 AI ----------
function swampProgram(P, { B, get: g } = P) {
  return P.chain([
    P.set('我的基地', P.first(P.mineOf('StructureSpawn'))), P.set('敌方基地', P.first(P.mineOf('StructureSpawn', false))),
    B('s_spawn', null, { S: g('我的基地'), B: B('s_body', { BODY: 'ranged_attack:2,move:2' }) }),
    P.each('兵', P.mineOf('Creep'), P.orMove(B('a_ranged', null, { C: g('兵'), T: g('敌方基地') }), g('兵'), g('敌方基地'))),
  ]);
}
function flagProgram(P, { B, get: g } = P) {
  return P.chain([
    P.set('敌人', P.mineOf('Creep', false)),
    P.each('塔', P.mineOf('StructureTower'), B('t_act', { M: 'attack' }, { S: g('塔'), T: P.closest(g('敌人'), g('塔')) })),
    P.each('兵', P.mineOf('Creep'), [P.set('目标', P.closest(g('敌人'), g('兵'))),
      P.if(B('p_exists', null, { O: g('目标') }), [B('a_attack', null, { C: g('兵'), T: g('目标') }), B('a_ranged', null, { C: g('兵'), T: g('目标') }), B('a_heal', null, { C: g('兵'), T: g('兵') }), B('a_moveto', null, { C: g('兵'), T: g('目标') })],
        B('a_moveto', null, { C: g('兵'), T: P.closest(P.filter(P.all('Flag'), 'my', '!==', P.bool(true)), g('兵')) }))]),
  ]);
}
function collectProgram(P, { B, get: g } = P) {
  const scores = () => P.closest(P.filter(P.all('Resource'), 'resourceType', '!==', P.res('RESOURCE_ENERGY')), g('兵'));
  return P.chain([
    B('s_spawn', null, { S: P.first(P.mineOf('StructureSpawn')), B: B('s_role', { ROLE: '搬分员' }) }),
    P.each('兵', P.mineOf('Creep'), P.if(P.eq(B('p_cap', { M: 'getUsedCapacity' }, { O: g('兵') }), P.n(0)),
      P.orMove(B('a_pickup', null, { C: g('兵'), T: scores() }), g('兵'), scores()),
      P.each('收集器', P.all('ScoreCollector'), P.if(P.eq(B('p_store', null, { O: g('兵'), R: P.prop(g('收集器'), 'resourceType') }), P.n(0), 'GT'),
        P.orMove(B('a_transfer', null, { C: g('兵'), R: P.prop(g('收集器'), 'resourceType'), T: g('收集器') }), g('兵'), g('收集器')))))),
  ]);
}
const ROLES = [{ name: '搬分员', body: 'carry:2,move:2' }];
for (const [modes, make] of [[['spawn-and-swamp-advanced'], swampProgram], [['capture-the-flag-advanced'], flagProgram], [['collect-and-control-advanced'], collectProgram]]) // v0.12：界面里每个模式只剩一个版本
  for (const mode of modes) test(`example block program beats beginner AI (入门): ${mode}`, () => {
    const P = program(); const code = P.gen(make(P), ROLES); assert.ok(!/\bH\./.test(code));
    const r = runMatch({ mode, seed: 1, scripts: [code, EASY], maxTicks: 4000 }); noErr(r);
    assert.equal(r.meta.result?.winner, 'p1', JSON.stringify(r.meta.result));
  });
test('old v0.10 scripts (removed block types) load as an empty workspace without crashing', () => {
  const ws = new Blockly.Workspace(); const old = { arenaRoles: [{ name: '前锋', body: 'attack:1,move:1' }], blocks: { languageVersion: 0, blocks: [{ type: 'b_keep', fields: { ROLE: '前锋', N: 3 } }] } };
  try { Blockly.serialization.workspaces.load(old, ws); } catch { ws.clear(); }
  assert.equal(ws.getAllBlocks(false).length, 0); assert.match(AB.toCode(ws), /export function loop\(\) \{\n\}/);
});
