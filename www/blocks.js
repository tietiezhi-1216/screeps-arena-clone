// Arena 积木（新手版）：中文自然语句，隐藏 API / 类名；隐式“当前这个兵”（每个我的兵 做 里的 creep）。
// 交互沿用 screeps-blockly-mobile（zelos 渲染 + 顶部分类条 + 点按添加 + 身体部件表单）。生成的代码全部是官方 Arena API（见 LIB）。
(function () {
const JS = Blockly.JavaScript, O = JS.ORDER_NONE, OF = JS.ORDER_FUNCTION_CALL, OA = JS.ORDER_ATOMIC, OR = JS.ORDER_RELATIONAL;
const v = (b, n, d = 'undefined') => JS.valueToCode(b, n, O) || d;
const B = {}, CAT = {};
const CATS = [
  { id: 'base', name: '基地', icon: 'home', colour: '#2e8b57' },
  { id: 'unit', name: '兵', icon: 'users', colour: '#c0703a' },
  { id: 'act', name: '动作', icon: 'swords', colour: '#b5484c' },
  { id: 'target', name: '目标', icon: 'target', colour: '#3d85c6' },
  { id: 'cond', name: '判断', icon: 'git-branch', colour: '#5b80a5' },
  { id: 'num', name: '数值', icon: 'calculator', colour: '#5b67a5' },
];
function def(cat, type, json, gen) { json.type = type; json.colour = CATS.find(c => c.id === cat).colour; Blockly.defineBlocksWithJsonArray([json]); JS.forBlock[type] = gen; (CAT[cat] = CAT[cat] || []).push(type); B[type] = 1; }
const stmt = { previousStatement: null, nextStatement: null, inputsInline: true };
const q = s => JSON.stringify(String(s));

// ---------- 身体部件 ----------
const PARTS = [['move', '移动', '#a9b7c6', 50], ['work', '工作', '#ffe56d', 100], ['carry', '搬运', '#777777', 50], ['attack', '攻击', '#f93842', 80], ['ranged_attack', '远程', '#5d80b2', 150], ['heal', '治疗', '#65fd62', 250], ['tough', '护甲', '#ffffff', 10]];
const PI = Object.fromEntries(PARTS.map(p => [p[0], p]));
const ORDER = ['tough', 'work', 'carry', 'attack', 'ranged_attack', 'heal', 'move'];
const PRESETS = [['战士', 'tough:2,attack:3,move:5'], ['弓箭手', 'ranged_attack:2,move:2'], ['医疗兵', 'heal:1,move:1'], ['搬运工', 'carry:3,move:3'], ['工人', 'work:2,carry:2,move:4']];
const parseBody = s => { const c = {}; for (const t of String(s || '').split(',')) { const [k, n] = t.trim().split(':'); if (PI[k]) c[k] = (c[k] || 0) + (n == null ? 1 : Math.max(0, Math.min(50, +n || 0))); } return c; };
const bodyStr = c => ORDER.filter(k => c[k] > 0).map(k => `${k}:${c[k]}`).join(',');
const bodyList = c => ORDER.flatMap(k => Array(c[k] || 0).fill(k));
const bodyCost = c => ORDER.reduce((a, k) => a + (c[k] || 0) * PI[k][3], 0);
const bodyN = c => ORDER.reduce((a, k) => a + (c[k] || 0), 0);
const bodyText = c => bodyN(c) ? ORDER.filter(k => c[k]).map(k => PI[k][1] + '×' + c[k]).join(' ') : '点此选择';
class FieldBody extends Blockly.Field {
  constructor(value) { super(value || 'attack:1,move:1'); this.SERIALIZABLE = true; this.CURSOR = 'pointer'; }
  static fromJson(o) { return new FieldBody(o.value); }
  doClassValidation_(nv) { const c = parseBody(nv); return bodyN(c) > 0 && bodyN(c) <= 50 ? bodyStr(c) : null; }
  getText_() { return bodyText(parseBody(this.getValue())); }
  showEditor_() { openBodyPanel(this.getValue(), val => this.setValue(val)); }
}
Blockly.fieldRegistry.register('field_body', FieldBody);
function openBodyPanel(value, done) {
  let c = parseBody(value); const host = document.getElementById('editor') || document.body;
  const d = document.createElement('div'); d.id = 'bodyPanel'; d.className = 'dlg'; host.appendChild(d);
  const draw = () => { const n = bodyN(c), cost = bodyCost(c);
    d.innerHTML = `<div class="box bp"><div class="dt">选择身体部件</div>
      <div class="bpPre">${PRESETS.map(([t, b]) => `<button data-pre="${b}">${t}</button>`).join('')}</div>
      <div class="bpList">${PARTS.map(([k, t, col, co]) => `<div class="bpRow"><i style="background:${col}"></i><span class="bpN">${t}</span><span class="bpC">${co}</span><button data-m="${k}">−</button><b>${c[k] || 0}</b><button data-p="${k}">+</button></div>`).join('')}</div>
      <div class="bpBar">${bodyList(c).map(k => `<i style="background:${PI[k][2]}"></i>`).join('')}</div>
      <div class="bpSum"><span>${n}/50 个部件</span><span class="${cost > 1000 ? 'bad' : ''}">需要 <b>${cost}</b> 能量${cost > 1000 ? '（超过基地上限 1000）' : ''}</span></div>
      <div class="row2"><button data-a="no" class="btn">取消</button><button data-a="ok" class="btn primary"${n && cost <= 1000 ? '' : ' disabled'}>确定</button></div></div>`; };
  draw();
  d.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) { if (e.target === d) d.remove(); return; }
    if (b.dataset.pre) c = parseBody(b.dataset.pre);
    else if (b.dataset.p) { if (bodyN(c) < 50) c[b.dataset.p] = (c[b.dataset.p] || 0) + 1; }
    else if (b.dataset.m) c[b.dataset.m] = Math.max(0, (c[b.dataset.m] || 0) - 1);
    else if (b.dataset.a === 'no') return d.remove();
    else if (b.dataset.a === 'ok') { d.remove(); return done(bodyStr(c)); }
    draw(); });
}

// ---------- 下拉选项 ----------
const ROLES = [['战士', 'warrior'], ['弓箭手', 'archer'], ['医疗兵', 'medic'], ['搬运工', 'hauler'], ['工人', 'worker']];
const ROLES_ALL = [['兵', 'all'], ...ROLES];
const TARGETS = [['敌人', 'enemy'], ['敌方基地', 'enemySpawn'], ['我的基地', 'mySpawn'], ['受伤的队友', 'hurtAlly'], ['队友', 'ally'], ['有能量的箱子', 'container'], ['地上的能量', 'energy'], ['能量矿', 'source'],
  ['还没夺到的旗帜', 'flag'], ['我的旗帜', 'myFlag'], ['身体部件', 'bodypart'], ['分数', 'score'], ['分数收集器', 'collector'], ['敌方塔', 'enemyTower'], ['我的工地', 'site']];
const BUILD = [['塔', 'StructureTower'], ['堡垒', 'StructureRampart'], ['扩展', 'StructureExtension'], ['墙', 'StructureWall'], ['箱子', 'StructureContainer']];
const PARTDD = PARTS.map(p => [p[1], p[0]]);
const me = 'creep';

// ---------- 基地 ----------
def('base', 'b_spawn', { message0: '我的基地 制造 %1 %2', args0: [{ type: 'field_dropdown', name: 'ROLE', options: ROLES }, { type: 'field_body', name: 'BODY', value: 'tough:2,attack:3,move:5' }], ...stmt, tooltip: '基地空闲且能量够时，造一个兵' },
  b => `H.spawn(${q(b.getFieldValue('ROLE'))}, ${JSON.stringify(bodyList(parseBody(b.getFieldValue('BODY'))))});\n`);
def('base', 'b_keep', { message0: '保持 %1 有 %2 个 %3', args0: [{ type: 'field_dropdown', name: 'ROLE', options: ROLES }, { type: 'field_number', name: 'N', value: 3, min: 0, max: 50, precision: 1 }, { type: 'field_body', name: 'BODY', value: 'tough:2,attack:3,move:5' }], ...stmt, tooltip: '不够数量时自动补充；排在上面的先造' },
  b => `H.keep(${q(b.getFieldValue('ROLE'))}, ${+b.getFieldValue('N')}, ${JSON.stringify(bodyList(parseBody(b.getFieldValue('BODY'))))});\n`);
def('base', 'b_towers', { message0: '我的塔 自动 %1', args0: [{ type: 'field_dropdown', name: 'M', options: [['攻击最近的敌人', 'attack'], ['治疗受伤的队友', 'heal'], ['先治疗再攻击', 'both']] }], ...stmt },
  b => `H.towers(${q(b.getFieldValue('M'))});\n`);
def('base', 'b_build', { message0: '在 %1 旁边 放一个 %2 工地', args0: [{ type: 'input_value', name: 'T' }, { type: 'field_dropdown', name: 'S', options: BUILD }], ...stmt, tooltip: '只放一次；之后让工人去“建造工地”' },
  b => `H.place(${v(b, 'T')}, ${b.getFieldValue('S')});\n`);

// ---------- 兵 ----------
def('unit', 'u_each', { message0: '每个我的 %1 做：', args0: [{ type: 'field_dropdown', name: 'ROLE', options: ROLES_ALL }], message1: '%1', args1: [{ type: 'input_statement', name: 'DO' }], previousStatement: null, nextStatement: null, tooltip: '里面的动作都由“这个兵”执行' },
  b => `for (const ${me} of H.mine(${q(b.getFieldValue('ROLE'))})) {\n${JS.statementToCode(b, 'DO')}}\n`);
def('unit', 'u_fight', { message0: '按身体自动战斗', ...stmt, tooltip: '有攻击就近战，有远程就边打边退，有治疗就救队友' }, () => `H.fight(${me});\n`);
def('unit', 'u_role', { message0: '这个兵是 %1', args0: [{ type: 'field_dropdown', name: 'ROLE', options: ROLES }], output: 'Boolean' }, b => [`(!!${me} && H.roleOf(${me}) === ${q(b.getFieldValue('ROLE'))})`, OA]);

// ---------- 动作（由“这个兵”执行；够不着会自己走过去） ----------
def('act', 'a_attack', { message0: '靠近并攻击 %1', args0: [{ type: 'input_value', name: 'T' }], ...stmt }, b => `H.attack(${me}, ${v(b, 'T')});\n`);
def('act', 'a_ranged', { message0: '远程攻击 %1 保持距离', args0: [{ type: 'input_value', name: 'T' }], ...stmt }, b => `H.kite(${me}, ${v(b, 'T')});\n`);
def('act', 'a_heal', { message0: '靠近并治疗 %1', args0: [{ type: 'input_value', name: 'T' }], ...stmt }, b => `H.heal(${me}, ${v(b, 'T')});\n`);
def('act', 'a_move', { message0: '移动到 %1', args0: [{ type: 'input_value', name: 'T' }], ...stmt }, b => `H.move(${me}, ${v(b, 'T')});\n`);
def('act', 'a_flee', { message0: '远离 %1 到 %2 格外', args0: [{ type: 'input_value', name: 'T' }, { type: 'field_number', name: 'R', value: 4, min: 1, max: 20, precision: 1 }], ...stmt }, b => `H.flee(${me}, ${v(b, 'T')}, ${+b.getFieldValue('R')});\n`);
def('act', 'a_gather', { message0: '采集能量并送回基地', ...stmt, tooltip: '没能量就去箱子 / 能量矿 / 地上取，装满了送回基地' }, () => `H.gather(${me});\n`);
def('act', 'a_give', { message0: '把能量送到 %1', args0: [{ type: 'input_value', name: 'T' }], ...stmt }, b => `H.give(${me}, ${v(b, 'T')});\n`);
def('act', 'a_pick', { message0: '捡起 %1', args0: [{ type: 'input_value', name: 'T' }], ...stmt }, b => `H.pick(${me}, ${v(b, 'T')});\n`);
def('act', 'a_score', { message0: '收集分数送到收集器', ...stmt, tooltip: '收集与控制模式：捡分数，送进对应的收集器' }, () => `H.score(${me});\n`);
def('act', 'a_buildsite', { message0: '建造最近的工地', ...stmt, tooltip: '没能量会先去取能量' }, () => `H.build(${me});\n`);
def('act', 'a_wait', { message0: '原地待命', ...stmt }, () => '');

// ---------- 目标 ----------
def('target', 't_near', { message0: '最近的 %1', args0: [{ type: 'field_dropdown', name: 'K', options: TARGETS }], output: 'Target' }, b => [`H.near(${q(b.getFieldValue('K'))}, ${me})`, OF]);
def('target', 't_weak', { message0: '生命最少的 %1', args0: [{ type: 'field_dropdown', name: 'K', options: [['敌人', 'enemy'], ['队友', 'ally']] }], output: 'Target' }, b => [`H.weakest(${q(b.getFieldValue('K'))})`, OF]);
def('target', 't_self', { message0: '我自己', output: 'Target' }, () => [me, OA]);

// ---------- 判断 ----------
def('cond', 'c_if', { message0: '如果 %1', args0: [{ type: 'input_value', name: 'C', check: 'Boolean' }], message1: '那么 %1', args1: [{ type: 'input_statement', name: 'DO' }], ...stmt, inputsInline: false }, b => `if (${v(b, 'C', 'false')}) {\n${JS.statementToCode(b, 'DO')}}\n`);
def('cond', 'c_ifelse', { message0: '如果 %1', args0: [{ type: 'input_value', name: 'C', check: 'Boolean' }], message1: '那么 %1', args1: [{ type: 'input_statement', name: 'DO' }], message2: '否则 %1', args2: [{ type: 'input_statement', name: 'ELSE' }], ...stmt, inputsInline: false },
  b => `if (${v(b, 'C', 'false')}) {\n${JS.statementToCode(b, 'DO')}} else {\n${JS.statementToCode(b, 'ELSE')}}\n`);
def('cond', 'c_exists', { message0: '有 %1', args0: [{ type: 'input_value', name: 'T' }], output: 'Boolean', inputsInline: true }, b => [`!!(${v(b, 'T')})`, OA]);
def('cond', 'c_within', { message0: '%1 在 %2 格内', args0: [{ type: 'input_value', name: 'T' }, { type: 'field_number', name: 'R', value: 3, min: 0, max: 100, precision: 1 }], output: 'Boolean', inputsInline: true }, b => [`H.within(${me}, ${v(b, 'T')}, ${+b.getFieldValue('R')})`, OF]);
def('cond', 'c_hp', { message0: '我的生命 低于 %1 %', args0: [{ type: 'field_number', name: 'P', value: 50, min: 1, max: 100, precision: 1 }], output: 'Boolean' }, b => [`(!!${me} && ${me}.hits < ${me}.hitsMax * ${+b.getFieldValue('P') / 100})`, OA]);
def('cond', 'c_bag', { message0: '我的背包 %1', args0: [{ type: 'field_dropdown', name: 'S', options: [['装满了', 'full'], ['是空的', 'empty'], ['有能量', 'some']] }], output: 'Boolean' }, b => [`H.bag(${me}, ${q(b.getFieldValue('S'))})`, OF]);
def('cond', 'c_part', { message0: '我有 %1 部件', args0: [{ type: 'field_dropdown', name: 'T', options: PARTDD }], output: 'Boolean' }, b => [`H.has(${me}, ${q(b.getFieldValue('T'))})`, OF]);
def('cond', 'c_and', { message0: '%1 %2 %3', args0: [{ type: 'input_value', name: 'A', check: 'Boolean' }, { type: 'field_dropdown', name: 'OP', options: [['并且', '&&'], ['或者', '||']] }, { type: 'input_value', name: 'B', check: 'Boolean' }], output: 'Boolean', inputsInline: true }, b => [`(${v(b, 'A', 'false')} ${b.getFieldValue('OP')} ${v(b, 'B', 'false')})`, OA]);
def('cond', 'c_not', { message0: '不是 %1', args0: [{ type: 'input_value', name: 'A', check: 'Boolean' }], output: 'Boolean' }, b => [`!(${v(b, 'A', 'false')})`, OA]);
def('cond', 'c_cmp', { message0: '%1 %2 %3', args0: [{ type: 'input_value', name: 'A', check: 'Number' }, { type: 'field_dropdown', name: 'OP', options: [['大于', '>'], ['小于', '<'], ['等于', '==='], ['至少', '>=']] }, { type: 'input_value', name: 'B', check: 'Number' }], output: 'Boolean', inputsInline: true },
  b => [`(${v(b, 'A', '0')} ${b.getFieldValue('OP')} ${v(b, 'B', '0')})`, OA]);

// ---------- 数值 ----------
def('num', 'n_num', { message0: '%1', args0: [{ type: 'field_number', name: 'N', value: 0 }], output: 'Number' }, b => [String(+b.getFieldValue('N')), OA]);
def('num', 'n_count', { message0: '我的 %1 数量', args0: [{ type: 'field_dropdown', name: 'ROLE', options: ROLES_ALL }], output: 'Number' }, b => [`H.mine(${q(b.getFieldValue('ROLE'))}).length`, OF]);
def('num', 'n_enemies', { message0: '敌人数量', output: 'Number' }, () => ['H.foes().length', OF]);
def('num', 'n_energy', { message0: '基地能量', output: 'Number' }, () => ['H.baseEnergy()', OF]);
def('num', 'n_tick', { message0: '游戏时间', output: 'Number' }, () => ['getTicks()', OF]);
def('num', 'n_dist', { message0: '到 %1 的距离', args0: [{ type: 'input_value', name: 'T' }], output: 'Number', inputsInline: true }, b => [`H.dist(${me}, ${v(b, 'T')})`, OF]);

// 运行时助手：只用官方 Arena API（getObjectsByPrototype / findClosestByPath / spawnCreep / attack / moveTo …）
const LIB = `const H = (() => {
  const roles = H_ROLES; let spawned = 0;
  const all = T => T ? getObjectsByPrototype(T) : [];
  const has = (c, t) => !!c && !!c.body && c.body.some(p => p.type === t && p.hits > 0);
  const mySpawn = () => all(StructureSpawn).find(s => s.my);
  const enemySpawn = () => all(StructureSpawn).find(s => s.my === false);
  const foes = () => all(Creep).filter(c => c.my === false && !c.spawning);
  const roleOf = c => roles.get(c.id);
  const mine = r => all(Creep).filter(c => c.my && !c.spawning && (r === 'all' || roleOf(c) === r));
  const energyOf = o => (o && o.store && o.store[RESOURCE_ENERGY]) || 0;
  const isScore = r => r && r.resourceType !== RESOURCE_ENERGY;
  const pickList = k => {
    switch (k) {
      case 'enemy': return foes();
      case 'enemySpawn': return [enemySpawn()].filter(Boolean);
      case 'mySpawn': return [mySpawn()].filter(Boolean);
      case 'hurtAlly': return all(Creep).filter(c => c.my && !c.spawning && c.hits < c.hitsMax);
      case 'ally': return all(Creep).filter(c => c.my && !c.spawning);
      case 'container': return all(StructureContainer).filter(c => energyOf(c) > 0);
      case 'energy': return all(Resource).filter(r => r.resourceType === RESOURCE_ENERGY);
      case 'source': return all(Source).filter(s => s.energy > 0);
      case 'flag': return all(Flag).filter(f => !f.my);
      case 'myFlag': return all(Flag).filter(f => f.my);
      case 'bodypart': return all(BodyPart);
      case 'score': return all(Resource).filter(isScore);
      case 'collector': return all(ScoreCollector);
      case 'enemyTower': return all(StructureTower).filter(t => t.my === false);
      case 'site': return all(ConstructionSite).filter(s => s.my);
    }
    return [];
  };
  const near = (k, from, list) => { const L = (list || pickList(k)).filter(o => o !== from); if (!L.length) return null; const f = from || mySpawn(); return f ? (f.findClosestByPath ? f.findClosestByPath(L) : findClosestByPath(f, L)) || findClosestByRange(f, L) : L[0]; };
  const move = (c, t) => { if (c && t) c.moveTo(t); };
  const doOr = (c, t, act, ...a) => { if (!c || !t) return false; const r = c[act](t, ...a); if (r === ERR_NOT_IN_RANGE) c.moveTo(t); return r === OK || r === ERR_NOT_IN_RANGE; };
  const flee = (c, t, n) => { if (!c || !t) return; const r = searchPath(c, { pos: t, range: n }, { flee: true }); if (r.path.length) c.moveTo(r.path[0]); };
  const attack = (c, t) => { if (!t) return; if (has(c, ATTACK)) return doOr(c, t, 'attack'); if (has(c, RANGED_ATTACK)) return doOr(c, t, 'rangedAttack'); move(c, t); };
  const kite = (c, t) => { if (!c || !t) return; const d = getRange(c, t); if (d <= 3) c.rangedAttack(t); if (d < 3) flee(c, t, 3); else if (d > 3) c.moveTo(t); };
  const heal = (c, t) => { if (!c || !t) return; const d = getRange(c, t); if (d <= 1) c.heal(t); else { if (d <= 3) c.rangedHeal(t); c.moveTo(t); } };
  const give = (c, t) => doOr(c, t, 'transfer', RESOURCE_ENERGY);
  const pick = (c, t) => { if (!c || !t) return; if (t.amount != null) doOr(c, t, 'pickup'); else move(c, t); };
  const fetch = c => { const box = near('container', c), drop = near('energy', c), src = has(c, WORK) && near('source', c);
    if (box) return doOr(c, box, 'withdraw', RESOURCE_ENERGY); if (drop) return doOr(c, drop, 'pickup'); if (src) return doOr(c, src, 'harvest'); };
  const gather = c => { if (!c) return; if (c.store.getFreeCapacity(RESOURCE_ENERGY) === 0 || (energyOf(c) > 0 && !near('container', c) && !near('energy', c))) give(c, mySpawn()); else fetch(c); };
  const score = c => { if (!c) return; const held = Object.keys(c.store).find(r => r !== RESOURCE_ENERGY && c.store[r] > 0);
    if (held) { const col = near(null, c, all(ScoreCollector).filter(s => s.resourceType === held)); if (col) doOr(c, col, 'transfer', held); return; }
    const s = near('score', c); if (s) doOr(c, s, 'pickup'); };
  const build = c => { if (!c) return; const s = near('site', c); if (!s) return; if (energyOf(c) > 0) doOr(c, s, 'build'); else fetch(c); };
  const place = (t, T) => { if (!t || !T || placed.has(T)) return; placed.add(T);
    for (const [dx, dy] of [[0, 2], [2, 0], [0, -2], [-2, 0], [2, 2], [-2, -2], [2, -2], [-2, 2]]) { const r = createConstructionSite({ x: t.x + dx, y: t.y + dy }, T); if (r && r.object) return; } };
  const placed = new Set();
  const spawn = (role, body) => { const s = mySpawn(); if (!s || s.spawning || spawned) return false; const r = s.spawnCreep(body); if (r && r.object) { roles.set(r.object.id, role); spawned = 1; return true; } return false; };
  const keep = (role, n, body) => { if (mine(role).length + pending(role) < n) spawn(role, body); };
  const pending = role => all(Creep).filter(c => c.my && c.spawning && roleOf(c) === role).length;
  const towers = m => { for (const t of all(StructureTower).filter(t => t.my)) { const hurt = near('hurtAlly', t), foe = near('enemy', t);
    if ((m === 'heal' || m === 'both') && hurt) t.heal(hurt); else if (m !== 'heal' && foe && getRange(t, foe) <= 50) t.attack(foe); } };
  const fight = c => { const f = near('enemy', c) || enemySpawn();
    if (has(c, HEAL) && !has(c, ATTACK) && !has(c, RANGED_ATTACK)) { const h = near('hurtAlly', c); return h ? heal(c, h) : move(c, near('ally', c)); }
    if (has(c, RANGED_ATTACK) && !has(c, ATTACK)) return kite(c, f); if (has(c, HEAL) && c.hits < c.hitsMax) c.heal(c); attack(c, f); };
  const within = (c, t, n) => !!(c && t) && getRange(c, t) <= n;
  const bag = (c, s) => !c ? false : s === 'full' ? c.store.getFreeCapacity(RESOURCE_ENERGY) === 0 : s === 'empty' ? c.store.getUsedCapacity() === 0 : energyOf(c) > 0;
  const weakest = k => { const L = k === 'enemy' ? foes() : all(Creep).filter(c => c.my && !c.spawning && c.hits < c.hitsMax); return L.sort((a, b) => a.hits / a.hitsMax - b.hits / b.hitsMax)[0] || null; };
  const dist = (c, t) => (c && t) ? getRange(c, t) : 999;
  const baseEnergy = () => energyOf(mySpawn());
  return { tick() { spawned = 0; }, mine, foes, roleOf, near, move, attack, kite, heal, flee, give, pick, gather, score, build, place, spawn, keep, towers, fight, within, bag, has, weakest, dist, baseEnergy };
})();
`;
const HEADER = `import { getObjectsByPrototype, getTicks, getRange, findClosestByPath, findClosestByRange, createConstructionSite } from 'game/utils';
import { Creep, StructureSpawn, StructureTower, StructureContainer, StructureExtension, StructureRampart, StructureWall, Source, Resource, Flag, ConstructionSite } from 'game/prototypes';
import { MOVE, WORK, CARRY, ATTACK, RANGED_ATTACK, HEAL, TOUGH, RESOURCE_ENERGY, OK, ERR_NOT_IN_RANGE } from 'game/constants';
import { searchPath } from 'game/path-finder';
import { BodyPart, ScoreCollector } from 'arena';
`;
function toCode(ws) {
  JS.init(ws); const top = ws.getTopBlocks(true); let body = '';
  for (const b of top) { if (b.outputConnection) continue; body += JS.blockToCode(b); }
  JS.nameDB_ && JS.nameDB_.reset && JS.nameDB_.reset();
  return `// 由积木自动生成（官方 Arena API）\n${HEADER}const H_ROLES = new Map();\n${LIB}\nexport function loop() {\n  H.tick(); const creep = null;\n${indent(body)}}\n`;
}
const indent = s => s.split('\n').map(l => l ? '  ' + l : l).join('\n');
const DEFAULT_WS = null;
const THEME = Blockly.Theme.defineTheme('arena-dark', { name: 'arena-dark', base: Blockly.Themes.Classic,
  componentStyles: { workspaceBackgroundColour: '#1E1E1E', toolboxBackgroundColour: '#2B2B2B', toolboxForegroundColour: '#e6e6e6', flyoutBackgroundColour: '#2B2B2B', flyoutForegroundColour: '#e6e6e6', flyoutOpacity: 1, scrollbarColour: '#555', scrollbarOpacity: 0.6, insertionMarkerColour: '#ffffff', insertionMarkerOpacity: 0.3, cursorColour: '#d0d0d0' } });

// 交互沿用 screeps-blockly-mobile：顶部分类 chips → 全宽积木列表（按最宽积木缩放、竖向滚动）；点按 = 添加到可见区域；长按 = 拖出
window.ArenaBlocks = {
  CATS, toCode,
  create(div, saved, onChange) {
    const ws = Blockly.inject(div, { toolbox: { kind: 'flyoutToolbox', contents: [] }, trashcan: false, renderer: 'zelos', theme: THEME,
      zoom: { controls: false, wheel: true, pinch: true, startScale: 0.8, minScale: 0.4, maxScale: 2 }, move: { scrollbars: true, drag: true, wheel: true },
      grid: { spacing: 24, length: 2, colour: '#2c3748', snap: true } });
    if (saved) { try { Blockly.serialization.workspaces.load(saved, ws); } catch (e) { ws.clear(); } } // 默认空白工作区（无内置程序）
    const fly = ws.getFlyout(); let flyScale = 0.8, lpArmed = false;
    fly.getFlyoutScale = () => flyScale;
    const reflow = fly.reflowInternal_.bind(fly);
    fly.reflowInternal_ = function () { reflow(); const W = Math.round(div.getBoundingClientRect().width);
      if (W > 0 && this.width_ !== W) { this.width_ = W; this.setBackgroundPath(W, this.height_ || 0); this.position(); ws.resize(); } };
    fly.dragAngleRange_ = 0; fly.isScrollable = () => true; fly.wouldDelete = () => false;
    fly.getClientRect = (orig => function () { return this.isVisible() ? orig.call(this) : null; })(fly.getClientRect);
    fly.getWidth = (orig => function () { return this.isVisible() ? orig.call(this) : 0; })(fly.getWidth); // 隐藏时不占工作区左侧空间
    let lpT = null, lp0 = null;
    div.addEventListener('pointerdown', e => { if (!fly.isVisible() || !e.target.closest('.blocklyFlyout .blocklyDraggable')) return; lp0 = [e.clientX, e.clientY];
      clearTimeout(lpT); lpT = setTimeout(() => { fly.dragAngleRange_ = 180; lpArmed = true; navigator.vibrate && navigator.vibrate(20); }, 380); }, true);
    div.addEventListener('pointermove', e => { if (lp0 && !lpArmed && Math.hypot(e.clientX - lp0[0], e.clientY - lp0[1]) > 8) { clearTimeout(lpT); lp0 = null; } }, true);
    const lpEnd = () => { clearTimeout(lpT); lp0 = null; setTimeout(() => { fly.dragAngleRange_ = 0; lpArmed = false; }, 0); };
    div.addEventListener('pointerup', lpEnd, true); div.addEventListener('pointercancel', lpEnd, true);
    fly.hide();
    const api = { ws, onFly: null, isOpen: () => fly.isVisible() };
    const close = () => { fly.hide(); api.onFly?.(null); Blockly.svgResize(ws); };
    ws.addChangeListener(e => {
      if (e.type === Blockly.Events.BLOCK_DRAG && e.isStart && fly.isVisible()) close();
      if (!e.isUiEvent) onChange(toCode(ws), Blockly.serialization.workspaces.save(ws));
    });
    fly.getWorkspace().addChangeListener(e => { if (e.type !== Blockly.Events.CLICK || !e.blockId || !fly.isVisible()) return; setTimeout(() => {
      const src = fly.getWorkspace().getBlockById(e.blockId)?.getRootBlock(); if (!src) return; const st = Blockly.serialization.blocks.save(src, { addCoordinates: false });
      close(); const sc = ws.scale, el = ws.getParentSvg().getBoundingClientRect(), ox = ws.scrollX, oy = ws.scrollY; const nb = Blockly.serialization.blocks.append(st, ws);
      const n = ws.getTopBlocks(false).length; setTimeout(() => { const el = ws.getParentSvg().getBoundingClientRect(), r = nb.getSvgRoot().getBoundingClientRect(); nb.moveBy((el.left + 24 + (n % 4) * 16 - r.left) / ws.scale, (el.top + 24 + (n % 6) * 28 - r.top) / ws.scale); }, 80); }, 0); });
    Object.assign(api, {
      openCat(id) {
        const c = CATS.find(c => c.id === id); if (!c) return;
        if (fly.isVisible() && api.cur === id) return close();
        api.cur = id;
        const contents = c.custom === 'VARIABLE' ? Blockly.DataCategory.flyoutCategory(ws) : c.custom === 'PROCEDURE' ? Blockly.Procedures.flyoutCategory(ws) : CAT[id].map(type => ({ kind: 'block', type }));
        flyScale = 0.8; fly.show(contents);
        const W = div.getBoundingClientRect().width - 24; let maxW = 0;
        for (const b of fly.getWorkspace().getTopBlocks(false)) maxW = Math.max(maxW, b.getHeightWidth().width);
        const sc = Math.max(0.45, Math.min(0.85, W / (maxW || 1))); if (Math.abs(sc - flyScale) > 0.01) { flyScale = sc; fly.show(contents); }
        for (const b of fly.getWorkspace().getAllBlocks(false)) for (const inp of b.inputList) for (const f of inp.fieldRow) if (f.setEnabled) f.setEnabled(false);
        fly.scrollToStart && fly.scrollToStart(); api.onFly?.(id); Blockly.svgResize(ws);
      },
      closeCat: close, flyOpen: () => fly.isVisible(),
      code: () => toCode(ws), resize: () => Blockly.svgResize(ws),
      load(state) { Blockly.Events.disable(); ws.clear(); if (state) try { Blockly.serialization.workspaces.load(state, ws); } catch (e) {} Blockly.Events.enable(); ws.clearUndo(); onChange(toCode(ws), Blockly.serialization.workspaces.save(ws)); },
      undo: r => ws.undo(!!r), zoom: d => ws.zoomCenter(d), center: () => ws.scrollCenter(),
      deleteSelected() { const s = Blockly.getSelected && Blockly.getSelected(); if (s && s.workspace === ws && s.isDeletable()) s.dispose(true, true); },
      count: () => ws.getAllBlocks(false).length,
    });
    onChange(toCode(ws), Blockly.serialization.workspaces.save(ws));
    return api;
  },
};
})();
