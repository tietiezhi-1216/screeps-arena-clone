// Arena 积木（v0.11 官方 API 版）：每个官方函数 / 方法 / 属性 / 常量都有一块中文积木，不显示函数名；另有判断、循环、数字、文字、列表、变量、函数等通用积木。
// 交互沿用 screeps-blockly-mobile（zelos 渲染 + 底部分类条 + 点按添加 + 身体部件表单）。生成代码 1:1 调用官方 Arena API，无任何封装好的高级方法。
(function () {
const JS = Blockly.JavaScript, O = JS.ORDER_NONE ?? 99, OF = JS.ORDER_FUNCTION_CALL ?? 2, OA = JS.ORDER_ATOMIC ?? 0, OR = JS.ORDER_RELATIONAL ?? 8, OM = JS.ORDER_MEMBER ?? 1.2;
const v = (b, n, d = 'undefined') => JS.valueToCode(b, n, O) || d;
const B = {}, CAT = {};
const CATS = [
  { id: 'info', name: '游戏信息', icon: 'info-circle', colour: '#4a6fa5' },
  { id: 'find', name: '查找', icon: 'search', colour: '#3d85c6' },
  { id: 'prop', name: '对象属性', icon: 'list-details', colour: '#2f8f9d' },
  { id: 'creep', name: '兵的动作', icon: 'users', colour: '#c0703a' },
  { id: 'base', name: '基地与建筑', icon: 'home', colour: '#2e8b57' },
  { id: 'map', name: '地图与寻路', icon: 'map', colour: '#7a6a3a' },
  { id: 'const', name: '常量', icon: 'bolt', colour: '#8a5a9e' },
  { id: 'logic', name: '判断', icon: 'help', colour: '#5b80a5' },
  { id: 'loop', name: '循环', icon: 'refresh', colour: '#5ba55b' },
  { id: 'math', name: '数字', icon: 'chart-bar', colour: '#5b67a5' },
  { id: 'text', name: '文字', icon: 'edit', colour: '#5ba58c' },
  { id: 'list', name: '列表', icon: 'menu-2', colour: '#745ba5' },
  { id: 'var', name: '变量', icon: 'device-floppy', colour: '#a55b80', custom: 'VARIABLE' },
  { id: 'func', name: '函数', icon: 'puzzle', colour: '#995ba5', custom: 'PROCEDURE' },
];
const COLOUR = Object.fromEntries(CATS.map(c => [c.id, c.colour]));
// def(分类, 类型, JSON, 代码生成, 积木栏里的默认值{inputs, fields, extraState})
function def(cat, type, json, gen, fly) { json.type = type; json.colour = json.colour || COLOUR[cat]; Blockly.defineBlocksWithJsonArray([json]); JS.forBlock[type] = gen; (CAT[cat] = CAT[cat] || []).push({ kind: 'block', type, ...(fly || {}) }); B[type] = cat; }
const stmt = { previousStatement: null, nextStatement: null, inputsInline: true };
const q = s => JSON.stringify(String(s));

// ---------- 身体部件 ----------
const PARTS = [['move', '移动', '#a9b7c6', 50], ['work', '工作', '#ffe56d', 100], ['carry', '搬运', '#777777', 50], ['attack', '攻击', '#f93842', 80], ['ranged_attack', '远程', '#5d80b2', 150], ['heal', '治疗', '#65fd62', 250], ['tough', '护甲', '#ffffff', 10]];
const PI = Object.fromEntries(PARTS.map(p => [p[0], p]));
const ORDER = ['tough', 'work', 'carry', 'attack', 'ranged_attack', 'heal', 'move'];
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
const esc = t => String(t).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
// 身体部件面板；opts.name 不为 undefined 时带“身份名称”输入框（新建/编辑身份）
function openBodyPanel(value, done, opts = {}) {
  let c = parseBody(value); const withName = opts.name !== undefined; let name = opts.name || '', err = '';
  const d = document.createElement('div'); d.id = 'bodyPanel'; d.className = 'dlg'; document.body.appendChild(d);
  const draw = () => { const n = bodyN(c), cost = bodyCost(c), ok = n && cost <= 1000 && (!withName || name.trim());
    d.innerHTML = `<div class="box bp"><div class="dt">${esc(opts.title || '选择身体部件')}</div>
      ${withName ? `<input class="bpName" maxlength="12" placeholder="身份名称，比如 前锋" value="${esc(name)}"><div class="bpErr">${esc(err)}</div>` : ''}
      <div class="bpList">${PARTS.map(([k, t, col, co]) => `<div class="bpRow"><i style="background:${col}"></i><span class="bpN">${t}</span><span class="bpC">${co}</span><button data-m="${k}">−</button><b>${c[k] || 0}</b><button data-p="${k}">+</button></div>`).join('')}</div>
      <div class="bpBar">${bodyList(c).map(k => `<i style="background:${PI[k][2]}"></i>`).join('')}</div>
      <div class="bpSum"><span>${n}/50 个部件</span><span class="${cost > 1000 ? 'bad' : ''}">需要 <b>${cost}</b> 能量${cost > 1000 ? '（超过基地上限 1000）' : ''}</span></div>
      <div class="row2"><button data-a="no" class="btn">取消</button><button data-a="ok" class="btn primary"${ok ? '' : ' disabled'}>确定</button></div></div>`; };
  draw();
  d.addEventListener('input', e => { if (!e.target.classList.contains('bpName')) return; name = e.target.value; err = ''; const okb = d.querySelector('[data-a=ok]'); okb.disabled = !(bodyN(c) && bodyCost(c) <= 1000 && name.trim()); d.querySelector('.bpErr').textContent = ''; });
  d.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) { if (e.target === d) d.remove(); return; }
    if (b.dataset.p) { if (bodyN(c) < 50) c[b.dataset.p] = (c[b.dataset.p] || 0) + 1; }
    else if (b.dataset.m) c[b.dataset.m] = Math.max(0, (c[b.dataset.m] || 0) - 1);
    else if (b.dataset.a === 'no') return d.remove();
    else if (b.dataset.a === 'ok') { if (withName) { const e2 = opts.check?.(name.trim()); if (e2) { err = e2; draw(); return; } }
      d.remove(); return withName ? done(name.trim(), bodyStr(c)) : done(bodyStr(c)); }
    draw(); });
  if (withName) setTimeout(() => d.querySelector('.bpName')?.focus(), 50);
  return d;
}

// ---------- 应用内输入框：变量 / 函数参数命名（替代系统 prompt） ----------
function askText(msg, def, done) {
  const d = document.createElement('div'); d.id = 'bodyPanel'; d.className = 'dlg'; document.body.appendChild(d);
  d.innerHTML = `<div class="box bp"><div class="dt">${esc(msg)}</div><input class="bpName" maxlength="24" value="${esc(def || '')}"><div class="row2"><button data-a="no" class="btn">取消</button><button data-a="ok" class="btn primary">确定</button></div></div>`;
  const inp = d.querySelector('input'); setTimeout(() => inp.focus(), 50);
  const end = v => { d.remove(); done(v); };
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') end(inp.value); });
  d.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) { if (e.target === d) end(null); return; } end(b.dataset.a === 'ok' ? inp.value : null); });
}
if (typeof document !== 'undefined' && Blockly.dialog?.setPrompt) {
  Blockly.dialog.setPrompt(askText);
  Blockly.dialog.setAlert((msg, cb) => askText(msg, '', () => cb && cb()));
}
Object.assign(Blockly.Msg, { NEW_VARIABLE: '＋ 新建变量', NEW_VARIABLE_TITLE: '变量名字（可以用中文）：', PROCEDURES_DEFNORETURN_PROCEDURE: '做某事', PROCEDURES_DEFRETURN_PROCEDURE: '算某值', PROCEDURES_DEFNORETURN_TITLE: '定义函数', PROCEDURES_DEFRETURN_TITLE: '定义函数', PROCEDURES_BEFORE_PARAMS: '参数：', PROCEDURES_CALL_BEFORE_PARAMS: '参数：' });

// ---------- 玩家自定义身份（随脚本保存；默认没有任何身份） ----------
const NONE = '__none', NEW = '__new', MANAGE = '__manage';
const Roles = { list: [], // [{ name, body }]
  get(n) { return this.list.find(r => r.name === n); },
  check(n, self) { if (!n) return '请输入名称'; if (n === '兵' || n.startsWith('__')) return '这个名字不能用'; if (this.list.some(r => r.name === n && r !== self)) return '已经有同名身份'; return ''; },
  add(name, body) { const r = { name, body }; this.list.push(r); return r; },
  rename(ws, old, nw) { const r = this.get(old); if (!r) return; r.name = nw; forRoleFields(ws, f => { if (f.getValue() === old) { f.getOptions(false); f.setValue(nw); } }); },
  remove(ws, n) { this.list = this.list.filter(r => r.name !== n); forRoleFields(ws, f => { if (f.getValue() === n) { f.getOptions(false); f.setValue(NONE); } }); },
};
const forRoleFields = (ws, fn) => { if (!ws) return; for (const b of ws.getAllBlocks(false)) { const f = b.getField('ROLE'); if (f) fn(f); } };
Blockly.serialization.registry.register('arenaRoles', {
  save: () => Roles.list.length ? Roles.list.map(r => ({ name: r.name, body: r.body })) : null,
  load: (st) => { Roles.list = (Array.isArray(st) ? st : []).filter(r => r && r.name).map(r => ({ name: String(r.name), body: bodyStr(parseBody(r.body)) || 'move:1' })); },
  clear: () => { Roles.list = []; }, priority: 90, // 先于积木加载，下拉框才能认出身份名
});
const roleOptions = all => () => [...(all ? [['兵', 'all']] : []), ['选择身份', NONE], ...Roles.list.map(r => [r.name, r.name]), ['＋ 新建身份', NEW], ...(Roles.list.length ? [['管理身份…', MANAGE]] : [])];
function roleValidator(v) {
  const ws = this.getSourceBlock()?.workspace; if (ws?.isFlyout) return v === NEW || v === MANAGE ? null : v;
  if (v === NEW) { setTimeout(() => newRole(ws, (name) => { this.getOptions(false); this.setValue(name); }), 0); return null; }
  if (v === MANAGE) { setTimeout(() => manageRoles(ws), 0); return null; }
  return v;
}
function fireChange(ws) { if (ws) ws.fireChangeListener(new (Blockly.Events.get(Blockly.Events.FINISHED_LOADING))(ws)); }
function newRole(ws, then) { openBodyPanel('', (name, body) => { Roles.add(name, body); then?.(name); fireChange(ws); }, { name: '', title: '新建身份', check: n => Roles.check(n) }); }
function manageRoles(ws) {
  const d = document.createElement('div'); d.id = 'bodyPanel'; d.className = 'dlg'; document.body.appendChild(d);
  const draw = () => { d.innerHTML = `<div class="box bp"><div class="dt">管理身份</div><div class="rlList">${Roles.list.map((r, i) => `<div class="rlRow"><span class="rlN">${esc(r.name)}</span><span class="rlB">${bodyText(parseBody(r.body))}</span><button data-e="${i}" class="btn sm">编辑</button><button data-x="${i}" class="btn sm danger">删除</button></div>`).join('') || '<div class="rlEmpty">还没有身份</div>'}</div>
    <div class="row2"><button data-a="new" class="btn">＋ 新建身份</button><button data-a="no" class="btn primary">完成</button></div></div>`; };
  draw();
  d.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) { if (e.target === d) d.remove(); return; }
    if (b.dataset.a === 'no') return d.remove();
    if (b.dataset.a === 'new') { d.remove(); return newRole(ws, () => manageRoles(ws)); }
    const r = Roles.list[+(b.dataset.e ?? b.dataset.x)]; if (!r) return;
    if (b.dataset.x != null) { if (b.dataset.sure) { Roles.remove(ws, r.name); fireChange(ws); draw(); } else { b.dataset.sure = 1; b.textContent = '确认删除'; } return; }
    d.remove(); openBodyPanel(r.body, (name, body) => { r.body = body; if (name !== r.name) Roles.rename(ws, r.name, name); fireChange(ws); manageRoles(ws); }, { name: r.name, title: '编辑身份', check: n => Roles.check(n, r) });
  });
}
class FieldRole extends Blockly.FieldDropdown {
  constructor(all) { super(roleOptions(all)); this.setValidator(roleValidator); }
  static fromJson(o) { return new FieldRole(!!o.all); }
}
Blockly.fieldRegistry.register('field_role', FieldRole);
const roleDD = all => ({ type: 'field_role', name: 'ROLE', all });
const roleBody = n => bodyList(parseBody(Roles.get(n)?.body));
const isRole = n => !!Roles.get(n);
// ---------- 官方 API 积木（v0.11）：每个官方函数 / 方法 / 属性 / 常量都有对应积木；文字全中文，生成的代码 1:1 调用官方 API ----------
const USED = new Map(); // 模块 → 用到的导出名（生成 import）
const use = (mod, n) => { if (!USED.has(mod)) USED.set(mod, new Set()); USED.get(mod).add(n); return n; };
const UT = n => use('game/utils', n), PR = n => use('game/prototypes', n), KC = n => use('game/constants', n), AR = n => use('arena', n), PF = n => use('game/path-finder', n), GM = n => use('game', n), VS = n => use('game/visual', n);
const API = {}; // 官方符号 → 积木类型（覆盖率测试用）
const cover = (type, ...syms) => { for (const s of syms) (API[s] = API[s] || []).push(type); };
const val = (name, check) => ({ type: 'input_value', name, ...(check ? { check } : {}) });
const dd = (name, options) => ({ type: 'field_dropdown', name, options });
const num = n => ({ shadow: { type: 'math_number', fields: { NUM: n } } });
const txt = s => ({ shadow: { type: 'text', fields: { TEXT: s } } });
const sh = (type, fields) => ({ shadow: { type, fields } });
const blk = (type, fields, inputs) => ({ block: { type, ...(fields ? { fields } : {}), ...(inputs ? { inputs } : {}) } });
const opt = (b, n) => JS.valueToCode(b, n, O); // 可选参数：没接就不传
const args = (...a) => { while (a.length && !a.at(-1)) a.pop(); return a.map(x => x || 'undefined').join(', '); };
const R = '__r'; // 上一个动作的结果（模块级变量，跨回合保留）
const act = (obj, call) => `${R} = (${obj})?.${call};\n`;

// 原型（类型）：[中文, 类名, 来源 p=game/prototypes a=arena]
const PROTOS = [['兵', 'Creep', 'p'], ['基地', 'StructureSpawn', 'p'], ['塔', 'StructureTower', 'p'], ['箱子', 'StructureContainer', 'p'], ['扩展', 'StructureExtension', 'p'],
  ['堡垒', 'StructureRampart', 'p'], ['道路', 'StructureRoad', 'p'], ['墙', 'StructureWall', 'p'], ['能量矿', 'Source', 'p'], ['地上的资源', 'Resource', 'p'], ['工地', 'ConstructionSite', 'p'],
  ['旗帜', 'Flag', 'p'], ['建筑（全部）', 'Structure', 'p'], ['有主人的建筑', 'OwnedStructure', 'p'], ['游戏对象（全部）', 'GameObject', 'p'],
  ['地上的身体部件', 'BodyPart', 'a'], ['分数收集器', 'ScoreCollector', 'a'], ['区域效果', 'AreaEffect', 'a'], ['建造加成点', 'ConstructionBoost', 'a'], ['目标建筑', 'StructureGoal', 'a'],
  ['传送门', 'Portal', 'a'], ['加成旗帜', 'BonusFlag', 'a'], ['得分旗帜', 'ScoreFlag', 'a'], ['护送兵', 'EscortCreep', 'a']];
const protoRef = n => { const p = PROTOS.find(x => x[1] === n); return p && p[2] === 'a' ? AR(n) : PR(n); };
const PROTO_DD = PROTOS.map(p => [p[0], p[1]]);
const BUILD_DD = [['塔', 'StructureTower'], ['扩展', 'StructureExtension'], ['堡垒', 'StructureRampart'], ['道路', 'StructureRoad'], ['墙', 'StructureWall'], ['箱子', 'StructureContainer'], ['基地', 'StructureSpawn']];
// 属性：[中文, 属性名, 所属原型（覆盖率键）]
const PROPS = [['编号', 'id', 'GameObject'], ['横坐标 x', 'x', 'GameObject'], ['纵坐标 y', 'y', 'GameObject'], ['还存在', 'exists', 'GameObject'], ['剩余消失回合', 'ticksToDecay', 'GameObject'],
  ['身上的效果', 'effects', 'GameObject'], ['控制它的旗帜', 'controlledBy', 'GameObject'],
  ['生命', 'hits', 'Creep'], ['最大生命', 'hitsMax', 'Creep'], ['是我的', 'my', 'Creep'], ['疲劳', 'fatigue', 'Creep'], ['正在出生 / 正在制造', 'spawning', 'Creep'], ['身体', 'body', 'Creep'], ['仓库', 'store', 'Creep'],
  ['出兵方向', 'directions', 'StructureSpawn'], ['冷却回合', 'cooldown', 'StructureTower'],
  ['剩余能量', 'energy', 'Source'], ['能量上限', 'energyCapacity', 'Source'], ['数量', 'amount', 'Resource'], ['资源种类', 'resourceType', 'Resource'],
  ['建造进度', 'progress', 'ConstructionSite'], ['建造总量', 'progressTotal', 'ConstructionSite'], ['建好的建筑', 'structure', 'ConstructionSite'],
  ['部件种类', 'type', 'BodyPart'], ['总共需要回合', 'needTime', 'Spawning'], ['还需回合', 'remainingTime', 'Spawning'], ['正在造的兵', 'creep', 'Spawning'],
  ['已得分数', 'score', 'ScoreCollector'], ['目标总分', 'scoreTotal', 'ScoreCollector'], ['区域效果种类', 'effect', 'AreaEffect'], ['传送目的地', 'destination', 'Portal'],
  ['加成种类', 'bonusType', 'BonusFlag'], ['效果种类', 'effectType', 'ScoreFlag'], ['每回合得分', 'scorePerTick', 'ScoreFlag'],
  ['效果数据', 'data', 'Effect'], ['结束回合', 'endTime', 'Effect'], ['倍率', 'multiplier', 'EffectData'], ['加成值', 'offset', 'EffectData'],
  ['新造出的对象', 'object', 'Result'], ['错误码', 'error', 'Result'],
  ['路线上的格子', 'path', 'PathResult'], ['计算次数', 'ops', 'PathResult'], ['路线花费', 'cost', 'PathResult'], ['没找全', 'incomplete', 'PathResult']];
const PROP_DD = PROPS.map(p => [p[0], p[1]]);
const PARTDD = PARTS.map(p => [p[1], p[0].toUpperCase()]);
const CODES = [['成功', 'OK'], ['不是我的', 'ERR_NOT_OWNER'], ['找不到路', 'ERR_NO_PATH'], ['名字已存在', 'ERR_NAME_EXISTS'], ['正忙', 'ERR_BUSY'], ['找不到', 'ERR_NOT_FOUND'],
  ['能量不够', 'ERR_NOT_ENOUGH_ENERGY'], ['资源不够', 'ERR_NOT_ENOUGH_RESOURCES'], ['扩展不够', 'ERR_NOT_ENOUGH_EXTENSIONS'], ['目标无效', 'ERR_INVALID_TARGET'], ['已经满了', 'ERR_FULL'],
  ['够不着（距离太远）', 'ERR_NOT_IN_RANGE'], ['参数不对', 'ERR_INVALID_ARGS'], ['太累（疲劳）', 'ERR_TIRED'], ['缺少需要的部件', 'ERR_NO_BODYPART']];
const DIRS = [['上', 'TOP'], ['右上', 'TOP_RIGHT'], ['右', 'RIGHT'], ['右下', 'BOTTOM_RIGHT'], ['下', 'BOTTOM'], ['左下', 'BOTTOM_LEFT'], ['左', 'LEFT'], ['左上', 'TOP_LEFT']];
const TERRAINS = [['平地', 'TERRAIN_PLAIN'], ['墙', 'TERRAIN_WALL'], ['沼泽', 'TERRAIN_SWAMP']];
const RES = [['能量', 'RESOURCE_ENERGY', 'c'], ['分数', 'RESOURCE_SCORE', 'a'], ['分数 X', 'RESOURCE_SCORE_X', 'a'], ['分数 Y', 'RESOURCE_SCORE_Y', 'a'], ['分数 Z', 'RESOURCE_SCORE_Z', 'a']];
const NUMS = [['近战攻击力', 'ATTACK_POWER'], ['远程攻击力', 'RANGED_ATTACK_POWER'], ['治疗量', 'HEAL_POWER'], ['远程治疗量', 'RANGED_HEAL_POWER'], ['采集速度', 'HARVEST_POWER'], ['建造速度', 'BUILD_POWER'],
  ['修理量', 'REPAIR_POWER'], ['修理花费', 'REPAIR_COST'], ['拆除量', 'DISMANTLE_POWER'], ['拆除花费', 'DISMANTLE_COST'], ['每个部件的生命', 'BODYPART_HITS'], ['搬运部件容量', 'CARRY_CAPACITY'],
  ['兵最多部件数', 'MAX_CREEP_SIZE'], ['每个部件出生回合', 'CREEP_SPAWN_TIME'], ['最多工地数', 'MAX_CONSTRUCTION_SITES'], ['沼泽修路花费倍数', 'CONSTRUCTION_COST_ROAD_SWAMP_RATIO'], ['墙上修路花费倍数', 'CONSTRUCTION_COST_ROAD_WALL_RATIO'],
  ['箱子容量', 'CONTAINER_CAPACITY'], ['箱子生命', 'CONTAINER_HITS'], ['扩展能量容量', 'EXTENSION_ENERGY_CAPACITY'], ['扩展生命', 'EXTENSION_HITS'], ['堡垒生命', 'RAMPART_HITS'], ['堡垒最大生命', 'RAMPART_HITS_MAX'],
  ['墙生命', 'WALL_HITS'], ['墙最大生命', 'WALL_HITS_MAX'], ['道路生命', 'ROAD_HITS'], ['沼泽道路生命', 'ROAD_HITS_SWAMP'], ['道路磨损', 'ROAD_WEAROUT'], ['资源消散速度', 'RESOURCE_DECAY'],
  ['能量矿恢复速度', 'SOURCE_ENERGY_REGEN'], ['能量矿容量', 'SOURCE_ENERGY_CAPACITY'], ['基地能量容量', 'SPAWN_ENERGY_CAPACITY'], ['基地生命', 'SPAWN_HITS'], ['基地能量恢复', 'SPAWN_ENERGY_REGEN'],
  ['塔能量容量', 'TOWER_CAPACITY'], ['塔冷却回合', 'TOWER_COOLDOWN'], ['塔每次耗能', 'TOWER_ENERGY_COST'], ['塔衰减', 'TOWER_FALLOFF'], ['塔衰减距离', 'TOWER_FALLOFF_RANGE'], ['塔生命', 'TOWER_HITS'],
  ['塔最佳距离', 'TOWER_OPTIMAL_RANGE'], ['塔攻击力', 'TOWER_POWER_ATTACK'], ['塔治疗量', 'TOWER_POWER_HEAL'], ['塔修理量', 'TOWER_POWER_REPAIR'], ['塔射程', 'TOWER_RANGE']];
const EFFS = [['攻击加强', 'EFF_ATTACK_BOOST', 'c'], ['建造加强', 'EFF_CONSTRUCTION_BOOST', 'c'], ['治疗加强', 'EFF_HEAL_BOOST', 'c'], ['移动加强', 'EFF_MOVE_BOOST', 'c'], ['远程攻击加强', 'EFF_RANGED_ATTACK_BOOST', 'c'], ['工作加强', 'EFF_WORK_BOOST', 'c'],
  ['攻击修正', 'EFF_ATTACK_MODIFIER', 'c'], ['远程攻击修正', 'EFF_RANGED_ATTACK_MODIFIER', 'c'], ['治疗修正', 'EFF_HEAL_MODIFIER', 'c'], ['受伤修正', 'EFF_DAMAGE_TAKEN_MODIFIER', 'c'], ['疲劳修正', 'EFF_FATIGUE_MODIFIER', 'c'], ['持续掉血', 'EFF_HITS_LOSS', 'c'],
  ['冰冻区域', 'EFFECT_FREEZE', 'a'], ['治疗区域', 'EFFECT_HEAL', 'a'], ['伤害区域', 'EFFECT_DAMAGE', 'a'], ['减速区域', 'EFFECT_SLOWDOWN', 'a'], ['建造加成区域', 'EFFECT_CONSTRUCTION_BOOST', 'a']];
const ARENA_K = [['本模式回合上限', 'TICKS_LIMIT'], ['每回合最多得分', 'MAX_SCORE_PER_TICK'], ['得分旗帜种类表', 'FLAG_TYPES']];
const SPROTO = [['基地', 'spawn'], ['扩展', 'extension'], ['道路', 'road'], ['墙', 'constructedWall'], ['堡垒', 'rampart'], ['塔', 'tower'], ['箱子', 'container']];
const HEAP = [['堆总大小', 'total_heap_size'], ['可执行堆大小', 'total_heap_size_executable'], ['物理内存', 'total_physical_size'], ['可用大小', 'total_available_size'], ['已用大小', 'used_heap_size'],
  ['上限', 'heap_size_limit'], ['已分配内存', 'malloced_memory'], ['分配峰值', 'peak_malloced_memory'], ['是否清零回收', 'does_zap_garbage'], ['上下文数量', 'number_of_native_contexts'],
  ['分离的上下文数量', 'number_of_detached_contexts'], ['外部分配大小', 'externally_allocated_size']];
const INFO = [['名称', 'name'], ['级别（基础 / 高级）', 'level'], ['赛季', 'season'], ['回合上限', 'ticksLimit'], ['每回合计算时间上限', 'cpuTimeLimit'], ['第一回合计算时间上限', 'cpuTimeLimitFirstTick']];
const CMP = [['等于', '==='], ['不等于', '!=='], ['大于', '>'], ['小于', '<'], ['至少', '>='], ['至多', '<=']];

// ---------- 游戏信息 ----------
def('info', 'g_ticks', { message0: '现在是第几回合', output: 'Number' }, () => [`${UT('getTicks')}()`, OF]); cover('g_ticks', 'utils.getTicks');
def('info', 'g_cpu', { message0: '这回合已用的计算时间（纳秒）', output: 'Number' }, () => [`${UT('getCpuTime')}()`, OF]); cover('g_cpu', 'utils.getCpuTime');
def('info', 'g_arena', { message0: '本局的 %1', args0: [dd('K', INFO)], output: null }, b => [`${GM('arenaInfo')}.${b.getFieldValue('K')}`, OM]); cover('g_arena', 'game.arenaInfo', ...INFO.map(i => 'arenaInfo.' + i[1]));
def('info', 'g_heap', { message0: '内存情况：%1', args0: [dd('K', HEAP)], output: 'Number' }, b => [`${UT('getHeapStatistics')}().${b.getFieldValue('K')}`, OM]); cover('g_heap', 'utils.getHeapStatistics');

// ---------- 查找 ----------
def('find', 'f_all', { message0: '所有的 %1', args0: [dd('T', PROTO_DD)], output: 'Array' }, b => [`${UT('getObjectsByPrototype')}(${protoRef(b.getFieldValue('T'))})`, OF]);
cover('f_all', 'utils.getObjectsByPrototype', ...PROTOS.map(p => 'proto.' + p[1]));
def('find', 'f_filter', { message0: '%1 里 %2 %3 %4 的那些', args0: [val('L', 'Array'), dd('P', PROP_DD), dd('OP', CMP), val('V')], output: 'Array', inputsInline: true },
  b => [`(${v(b, 'L', '[]')} || []).filter(o => o?.${b.getFieldValue('P')} ${b.getFieldValue('OP')} ${v(b, 'V', 'true')})`, OF], { inputs: { L: blk('f_all', { T: 'Creep' }), V: sh('logic_boolean', { BOOL: 'TRUE' }) }, fields: { P: 'my' } });
def('find', 'f_closest', { message0: '%1 里离 %2 最近的（按 %3）', args0: [val('L', 'Array'), val('F'), dd('M', [['直线距离', 'findClosestByRange'], ['走路距离', 'findClosestByPath']])], output: null, inputsInline: true },
  b => [`${UT(b.getFieldValue('M'))}(${v(b, 'F', 'null')}, ${v(b, 'L', '[]')})`, OF]); cover('f_closest', 'utils.findClosestByRange', 'utils.findClosestByPath');
def('find', 'f_closestopt', { message0: '%1 里离 %2 走路最近的，寻路选项 %3', args0: [val('L', 'Array'), val('F'), val('OPT')], output: null, inputsInline: true },
  b => [`${UT('findClosestByPath')}(${args(v(b, 'F', 'null'), v(b, 'L', '[]'), opt(b, 'OPT'))})`, OF], { inputs: { OPT: blk('m_opts') } });
def('find', 'f_inrange', { message0: '%1 里离 %2 不超过 %3 格的', args0: [val('L', 'Array'), val('F'), val('N', 'Number')], output: 'Array', inputsInline: true },
  b => [`${UT('findInRange')}(${v(b, 'F', 'null')}, ${v(b, 'L', '[]')}, ${v(b, 'N', '1')})`, OF], { inputs: { N: num(3) } }); cover('f_inrange', 'utils.findInRange');
def('find', 'f_range', { message0: '%1 和 %2 相距几格', args0: [val('A'), val('B')], output: 'Number', inputsInline: true }, b => [`${UT('getRange')}(${v(b, 'A', 'null')}, ${v(b, 'B', 'null')})`, OF]); cover('f_range', 'utils.getRange');
def('find', 'f_byid', { message0: '编号是 %1 的对象', args0: [val('ID')], output: null, inputsInline: true }, b => [`${UT('getObjectById')}(${v(b, 'ID', "''")})`, OF], { inputs: { ID: txt('') } }); cover('f_byid', 'utils.getObjectById');
def('find', 'f_objects', { message0: '场上所有对象', output: 'Array' }, () => [`${UT('getObjects')}()`, OF]); cover('f_objects', 'utils.getObjects');
def('find', 'o_rangeto', { message0: '从 %1 量到 %2 的距离', args0: [val('O'), val('P')], output: 'Number', inputsInline: true }, b => [`(${v(b, 'O', 'null')})?.getRangeTo(${v(b, 'P', 'null')})`, OM]); cover('o_rangeto', 'GameObject.getRangeTo');
def('find', 'o_closest', { message0: '从 %1 看，%2 里最近的（按 %3）', args0: [val('O'), val('L', 'Array'), dd('M', [['直线距离', 'findClosestByRange'], ['走路距离', 'findClosestByPath']])], output: null, inputsInline: true },
  b => [`(${v(b, 'O', 'null')})?.${b.getFieldValue('M')}(${v(b, 'L', '[]')})`, OM]); cover('o_closest', 'GameObject.findClosestByRange', 'GameObject.findClosestByPath');
def('find', 'o_inrange', { message0: '从 %1 看，%2 里 %3 格以内的', args0: [val('O'), val('L', 'Array'), val('N', 'Number')], output: 'Array', inputsInline: true },
  b => [`(${v(b, 'O', 'null')})?.findInRange(${v(b, 'L', '[]')}, ${v(b, 'N', '1')})`, OM], { inputs: { N: num(3) } }); cover('o_inrange', 'GameObject.findInRange');

// ---------- 对象属性 ----------
def('prop', 'p_get', { message0: '%1 的 %2', args0: [val('O'), dd('P', PROP_DD)], output: null, inputsInline: true }, b => [`(${v(b, 'O', 'null')})?.${b.getFieldValue('P')}`, OM], { fields: { P: 'hits' } });
cover('p_get', ...PROPS.map(p => 'prop.' + p[1]));
def('prop', 'p_store', { message0: '%1 存着的 %2 数量', args0: [val('O'), val('R')], output: 'Number', inputsInline: true }, b => [`((${v(b, 'O', 'null')})?.store?.[${v(b, 'R', 'undefined')}] ?? 0)`, OA], { inputs: { R: blk('k_res') } });
def('prop', 'p_cap', { message0: '%1 的仓库 %2 资源（可不填）%3', args0: [val('O'), dd('M', [['总容量', 'getCapacity'], ['已用', 'getUsedCapacity'], ['剩余空间', 'getFreeCapacity']]), val('R')], output: 'Number', inputsInline: true },
  b => [`(${v(b, 'O', 'null')})?.store?.${b.getFieldValue('M')}(${opt(b, 'R')})`, OM], { inputs: { R: blk('k_res') } }); cover('p_cap', 'Store.getCapacity', 'Store.getUsedCapacity', 'Store.getFreeCapacity', 'proto.Store');
def('prop', 'p_is', { message0: '%1 是 %2 吗', args0: [val('O'), dd('T', PROTO_DD)], output: 'Boolean', inputsInline: true }, b => [`(${v(b, 'O', 'null')} instanceof ${protoRef(b.getFieldValue('T'))})`, OR]);
def('prop', 'p_exists', { message0: '%1 有东西（不是空）', args0: [val('O')], output: 'Boolean', inputsInline: true }, b => [`(${v(b, 'O', 'null')} != null)`, OA]);
def('prop', 'p_bodypart', { message0: '身体部件 %1 的 %2', args0: [val('O'), dd('P', [['种类', 'type'], ['生命', 'hits']])], output: null, inputsInline: true }, b => [`(${v(b, 'O', 'null')})?.${b.getFieldValue('P')}`, OM]); cover('p_bodypart', 'prop.type', 'prop.hits');

// ---------- 兵的动作（结果存进“上一个动作的结果”） ----------
const C1 = (type, label, m, ...syms) => { def('creep', type, { message0: label, args0: [val('C'), val('T')], ...stmt }, b => act(v(b, 'C', 'null'), `${m}(${v(b, 'T', 'null')})`)); cover(type, ...syms); };
def('creep', 'a_move', { message0: '让 %1 朝 %2 走一格', args0: [val('C'), val('D')], ...stmt }, b => act(v(b, 'C', 'null'), `move(${v(b, 'D', 'undefined')})`), { inputs: { D: blk('k_dir') } }); cover('a_move', 'Creep.move');
def('creep', 'a_moveto', { message0: '让 %1 走向 %2 寻路选项（可不填）%3', args0: [val('C'), val('T'), val('OPT')], ...stmt }, b => act(v(b, 'C', 'null'), `moveTo(${args(v(b, 'T', 'null'), opt(b, 'OPT'))})`)); cover('a_moveto', 'Creep.moveTo');
C1('a_attack', '让 %1 近战攻击 %2', 'attack', 'Creep.attack');
C1('a_ranged', '让 %1 远程攻击 %2', 'rangedAttack', 'Creep.rangedAttack');
def('creep', 'a_mass', { message0: '让 %1 对 3 格内所有敌人远程攻击', args0: [val('C')], ...stmt }, b => act(v(b, 'C', 'null'), 'rangedMassAttack()')); cover('a_mass', 'Creep.rangedMassAttack');
C1('a_heal', '让 %1 治疗 %2', 'heal', 'Creep.heal');
C1('a_rheal', '让 %1 远程治疗 %2', 'rangedHeal', 'Creep.rangedHeal');
C1('a_harvest', '让 %1 采集 %2', 'harvest', 'Creep.harvest');
C1('a_build', '让 %1 建造 %2', 'build', 'Creep.build');
C1('a_pickup', '让 %1 捡起 %2', 'pickup', 'Creep.pickup');
C1('a_pull', '让 %1 拉着 %2', 'pull', 'Creep.pull');
def('creep', 'a_transfer', { message0: '让 %1 把 %2 交给 %3 数量（可不填）%4', args0: [val('C'), val('R'), val('T'), val('N', 'Number')], ...stmt },
  b => act(v(b, 'C', 'null'), `transfer(${args(v(b, 'T', 'null'), v(b, 'R', 'undefined'), opt(b, 'N'))})`), { inputs: { R: blk('k_res') } }); cover('a_transfer', 'Creep.transfer');
def('creep', 'a_withdraw', { message0: '让 %1 从 %2 取出 %3 数量（可不填）%4', args0: [val('C'), val('T'), val('R'), val('N', 'Number')], ...stmt },
  b => act(v(b, 'C', 'null'), `withdraw(${args(v(b, 'T', 'null'), v(b, 'R', 'undefined'), opt(b, 'N'))})`), { inputs: { R: blk('k_res') } }); cover('a_withdraw', 'Creep.withdraw');
def('creep', 'a_drop', { message0: '让 %1 扔下 %2 数量（可不填）%3', args0: [val('C'), val('R'), val('N', 'Number')], ...stmt },
  b => act(v(b, 'C', 'null'), `drop(${args(v(b, 'R', 'undefined'), opt(b, 'N'))})`), { inputs: { R: blk('k_res') } }); cover('a_drop', 'Creep.drop');
def('creep', 'a_result', { message0: '上一个动作的结果', output: null, tooltip: '是一个结果码；制造兵 / 放工地时是一份结果（可取“新造出的对象”“错误码”）' }, () => [R, OA]);

// ---------- 基地与建筑 ----------
def('base', 's_spawn', { message0: '让 %1 制造一个兵，身体是 %2', args0: [val('S'), val('B', 'Array')], ...stmt }, b => act(v(b, 'S', 'null'), `spawnCreep(${v(b, 'B', '[]')})`), { inputs: { B: blk('s_body') } });
cover('s_spawn', 'StructureSpawn.spawnCreep', 'SpawnCreepResult');
def('base', 's_body', { message0: '身体 %1', args0: [{ type: 'field_body', name: 'BODY' }], output: 'Array', tooltip: '点一下选择身体部件' }, b => [JSON.stringify(bodyList(parseBody(b.getFieldValue('BODY')))), OA]);
def('base', 's_role', { message0: '身份 %1 的身体', args0: [roleDD(false)], output: 'Array', tooltip: '身份由你自己新建：名字、身体部件都自己定' }, b => [JSON.stringify(roleBody(b.getFieldValue('ROLE'))), OA]);
def('base', 's_dirs', { message0: '让 %1 只往 %2 方向出兵', args0: [val('S'), val('D', 'Array')], ...stmt }, b => act(v(b, 'S', 'null'), `setDirections(${v(b, 'D', '[]')})`),
  { inputs: { D: { block: { type: 'lists_create_with', extraState: { itemCount: 2 }, inputs: { ADD0: blk('k_dir'), ADD1: blk('k_dir', { K: 'BOTTOM' }) } } } } }); cover('s_dirs', 'StructureSpawn.setDirections');
def('base', 's_cancel', { message0: '取消 %1 正在制造的兵', args0: [val('S')], ...stmt }, b => `${R} = (${v(b, 'S', 'null')})?.spawning?.cancel();\n`); cover('s_cancel', 'Spawning.cancel', 'proto.Spawning');
def('base', 't_act', { message0: '让塔 %1 %2 %3', args0: [val('S'), dd('M', [['攻击', 'attack'], ['治疗', 'heal']]), val('T')], ...stmt, inputsInline: true }, b => act(v(b, 'S', 'null'), `${b.getFieldValue('M')}(${v(b, 'T', 'null')})`));
cover('t_act', 'StructureTower.attack', 'StructureTower.heal');
def('base', 'c_site', { message0: '在 %1 放一个 %2 工地', args0: [val('P'), dd('T', BUILD_DD)], ...stmt, inputsInline: true }, b => `${R} = ${UT('createConstructionSite')}(${v(b, 'P', 'null')}, ${PR(b.getFieldValue('T'))});\n`, { inputs: { P: blk('m_pos', null, { X: num(50), Y: num(50) }) } });
cover('c_site', 'utils.createConstructionSite', 'CreateConstructionSiteResult');
def('base', 'c_remove', { message0: '拆掉工地 %1', args0: [val('S')], ...stmt }, b => `${R} = (${v(b, 'S', 'null')})?.remove();\n`); cover('c_remove', 'ConstructionSite.remove');

// ---------- 地图与寻路 ----------
def('map', 'm_pos', { message0: '位置 横 %1 纵 %2', args0: [val('X', 'Number'), val('Y', 'Number')], output: null, inputsInline: true }, b => [`({ x: ${v(b, 'X', '0')}, y: ${v(b, 'Y', '0')} })`, OA], { inputs: { X: num(50), Y: num(50) } });
def('map', 'm_terrain', { message0: '%1 的地形', args0: [val('P')], output: null, inputsInline: true }, b => [`${UT('getTerrainAt')}(${v(b, 'P', 'null')})`, OF]); cover('m_terrain', 'utils.getTerrainAt');
def('map', 'm_dir', { message0: '横着差 %1 竖着差 %2 是哪个方向', args0: [val('DX', 'Number'), val('DY', 'Number')], output: null, inputsInline: true }, b => [`${UT('getDirection')}(${v(b, 'DX', '0')}, ${v(b, 'DY', '0')})`, OF], { inputs: { DX: num(1), DY: num(0) } }); cover('m_dir', 'utils.getDirection');
def('map', 'm_findpath', { message0: '从 %1 到 %2 的路线，选项（可不填）%3', args0: [val('A'), val('B'), val('OPT')], output: 'Array', inputsInline: true }, b => [`${UT('findPath')}(${args(v(b, 'A', 'null'), v(b, 'B', 'null'), opt(b, 'OPT'))})`, OF]); cover('m_findpath', 'utils.findPath');
def('map', 'o_pathto', { message0: '从 %1 出发到 %2 的路线，选项（可不填）%3', args0: [val('O'), val('P'), val('OPT')], output: 'Array', inputsInline: true }, b => [`(${v(b, 'O', 'null')})?.findPathTo(${args(v(b, 'P', 'null'), opt(b, 'OPT'))})`, OM]); cover('o_pathto', 'GameObject.findPathTo');
def('map', 'm_search', { message0: '搜索路径 从 %1 到 %2 选项（可不填）%3', args0: [val('A'), val('G'), val('OPT')], output: null, inputsInline: true }, b => [`${PF('searchPath')}(${args(v(b, 'A', 'null'), v(b, 'G', 'null'), opt(b, 'OPT'))})`, OF], { inputs: { G: blk('m_goal', null, { R: num(1) }) } }); cover('m_search', 'pathFinder.searchPath');
def('map', 'm_goal', { message0: '目标 %1 范围 %2 格', args0: [val('P'), val('R', 'Number')], output: null, inputsInline: true }, b => [`({ pos: ${v(b, 'P', 'null')}, range: ${v(b, 'R', '0')} })`, OA], { inputs: { R: num(1) } }); cover('m_goal', 'pathFinder.goal');
const OPTS = [['PLAIN', '平地花费', 'plainCost'], ['SWAMP', '沼泽花费', 'swampCost'], ['FLEE', '反过来远离目标', 'flee'], ['MAXOPS', '最多计算次数', 'maxOps'], ['MAXCOST', '最大花费', 'maxCost'],
  ['HW', '估算权重', 'heuristicWeight'], ['CM', '花费地图', 'costMatrix'], ['IGNORE', '忽略这些对象', 'ignore']];
def('map', 'm_opts', { message0: '寻路选项', message1: OPTS.map((o, i) => `${o[1]} %${i + 1}`).join(' '), args1: OPTS.map(o => ({ ...val(o[0]), align: 'RIGHT' })), output: 'Options', inputsInline: false, tooltip: '没接的选项用默认值' },
  b => [`({ ${OPTS.map(o => [o[2], opt(b, o[0])]).filter(x => x[1]).map(([k, c]) => `${k}: ${c}`).join(', ')} })`, OA]); cover('m_opts', ...OPTS.map(o => 'pathFinder.opts.' + o[2]));
def('map', 'm_cm', { message0: '新的花费地图', output: null }, () => [`new (${PF('CostMatrix')})()`, OA]); cover('m_cm', 'pathFinder.CostMatrix');
def('map', 'm_cmset', { message0: '在花费地图 %1 把 横 %2 纵 %3 设为 %4', args0: [val('M'), val('X', 'Number'), val('Y', 'Number'), val('V', 'Number')], ...stmt }, b => `(${v(b, 'M', 'null')})?.set(${v(b, 'X', '0')}, ${v(b, 'Y', '0')}, ${v(b, 'V', '0')});\n`, { inputs: { X: num(0), Y: num(0), V: num(255) } }); cover('m_cmset', 'CostMatrix.set');
def('map', 'm_cmget', { message0: '花费地图 %1 在 横 %2 纵 %3 的花费', args0: [val('M'), val('X', 'Number'), val('Y', 'Number')], output: 'Number', inputsInline: true }, b => [`(${v(b, 'M', 'null')})?.get(${v(b, 'X', '0')}, ${v(b, 'Y', '0')})`, OM], { inputs: { X: num(0), Y: num(0) } }); cover('m_cmget', 'CostMatrix.get');
def('map', 'm_cmclone', { message0: '复制花费地图 %1', args0: [val('M')], output: null, inputsInline: true }, b => [`(${v(b, 'M', 'null')})?.clone()`, OM]); cover('m_cmclone', 'CostMatrix.clone');
def('map', 'v_new', { message0: '新画笔 图层 %1 一直保留 %2', args0: [val('L', 'Number'), val('P', 'Boolean')], output: null, inputsInline: true }, b => [`new (${VS('Visual')})(${v(b, 'L', '0')}, ${v(b, 'P', 'false')})`, OA], { inputs: { L: num(0), P: sh('logic_boolean', { BOOL: 'FALSE' }) } }); cover('v_new', 'visual.Visual', 'Visual.layer', 'Visual.persistent');
const STY = [['RADIUS', '半径', 'radius'], ['FILL', '填充色', 'fill'], ['OPACITY', '透明度', 'opacity'], ['STROKE', '线条色', 'stroke'], ['SW', '线宽', 'strokeWidth'], ['LS', '线型', 'lineStyle'],
  ['COLOR', '文字色', 'color'], ['FONT', '字体', 'font'], ['ALIGN', '对齐', 'align'], ['BG', '背景色', 'backgroundColor'], ['BP', '背景边距', 'backgroundPadding']];
def('map', 'v_style', { message0: '画笔样式', message1: STY.map((o, i) => `${o[1]} %${i + 1}`).join(' '), args1: STY.map(o => ({ ...val(o[0]), align: 'RIGHT' })), output: 'Style', inputsInline: false },
  b => [`({ ${STY.map(o => [o[2], opt(b, o[0])]).filter(x => x[1]).map(([k, c]) => `${k}: ${c}`).join(', ')} })`, OA], { inputs: { FILL: txt('#ff0000') } }); cover('v_style', ...STY.map(o => 'VisualStyle.' + o[2]));
const VIS = (type, label, extra, call, sym, fly) => { def('map', type, { message0: label.replace(/%(\d+)$/, '样式（可不填）%$1'), args0: [val('V'), ...extra.map(e => val(e)), val('S', 'Style')], ...stmt }, b => `(${v(b, 'V', 'null')})?.${call(b)};\n`, fly); cover(type, sym); };
VIS('v_circle', '用画笔 %1 在 %2 画圆 %3', ['P'], b => `circle(${args(v(b, 'P', 'null'), opt(b, 'S'))})`, 'Visual.circle');
VIS('v_line', '用画笔 %1 从 %2 到 %3 画线 %4', ['A', 'B'], b => `line(${args(v(b, 'A', 'null'), v(b, 'B', 'null'), opt(b, 'S'))})`, 'Visual.line');
VIS('v_rect', '用画笔 %1 在 %2 画 宽 %3 高 %4 的方块 %5', ['P', 'W', 'H'], b => `rect(${args(v(b, 'P', 'null'), v(b, 'W', '1'), v(b, 'H', '1'), opt(b, 'S'))})`, 'Visual.rect', { inputs: { W: num(1), H: num(1) } });
VIS('v_poly', '用画笔 %1 连起这些点 %2 %3', ['L'], b => `poly(${args(v(b, 'L', '[]'), opt(b, 'S'))})`, 'Visual.poly');
VIS('v_text', '用画笔 %1 写字 %2 在 %3 %4', ['T', 'P'], b => `text(${args(v(b, 'T', "''"), v(b, 'P', 'null'), opt(b, 'S'))})`, 'Visual.text', { inputs: { T: txt('你好') } });
def('map', 'v_clear', { message0: '擦掉画笔 %1 画的东西', args0: [val('V')], ...stmt }, b => `(${v(b, 'V', 'null')})?.clear();\n`); cover('v_clear', 'Visual.clear');
def('map', 'v_size', { message0: '画笔 %1 已画的大小', args0: [val('V')], output: 'Number', inputsInline: true }, b => [`(${v(b, 'V', 'null')})?.size()`, OM]); cover('v_size', 'Visual.size');

// ---------- 常量 ----------
const KD = (type, label, list, fieldName = 'K') => def('const', type, { message0: label, args0: [dd(fieldName, list.map(x => [x[0], x[1]]))], output: null },
  b => { const k = b.getFieldValue(fieldName), it = list.find(x => x[1] === k); return [it && it[2] === 'a' ? AR(k) : KC(k), OA]; });
KD('k_code', '结果码 %1', CODES); cover('k_code', ...CODES.map(c => 'const.' + c[1]));
KD('k_part', '部件 %1', PARTDD); cover('k_part', ...PARTDD.map(c => 'const.' + c[1]));
KD('k_dir', '方向 %1', DIRS); cover('k_dir', ...DIRS.map(c => 'const.' + c[1]));
KD('k_terrain', '地形 %1', TERRAINS); cover('k_terrain', ...TERRAINS.map(c => 'const.' + c[1]));
KD('k_res', '资源 %1', RES); cover('k_res', ...RES.map(c => (c[2] === 'a' ? 'arena.' : 'const.') + c[1]));
KD('k_num', '数值 %1', NUMS); cover('k_num', ...NUMS.map(c => 'const.' + c[1]));
KD('k_eff', '效果 %1', EFFS); cover('k_eff', ...EFFS.map(c => (c[2] === 'a' ? 'arena.' : 'const.') + c[1]));
KD('k_arena', '%1', ARENA_K.map(x => [...x, 'a'])); cover('k_arena', ...ARENA_K.map(c => 'arena.' + c[1]));
def('const', 'k_partcost', { message0: '%1 部件的价格', args0: [val('P')], output: 'Number', inputsInline: true }, b => [`${KC('BODYPART_COST')}[${v(b, 'P', 'undefined')}]`, OM], { inputs: { P: blk('k_part') } }); cover('k_partcost', 'const.BODYPART_COST');
def('const', 'k_buildcost', { message0: '%1 的建造花费', args0: [dd('T', BUILD_DD)], output: 'Number' }, b => [`${KC('CONSTRUCTION_COST')}[${q(b.getFieldValue('T'))}]`, OM]); cover('k_buildcost', 'const.CONSTRUCTION_COST');
def('const', 'k_rate', { message0: '距离 %1 格时远程攻击的伤害比例', args0: [val('N', 'Number')], output: 'Number', inputsInline: true }, b => [`${KC('RANGED_ATTACK_DISTANCE_RATE')}[${v(b, 'N', '0')}]`, OM], { inputs: { N: num(2) } }); cover('k_rate', 'const.RANGED_ATTACK_DISTANCE_RATE');
def('const', 'k_lists', { message0: '%1', args0: [dd('K', [['挡路的对象种类表', 'OBSTACLE_OBJECT_TYPES'], ['全部资源种类表', 'RESOURCES_ALL']])], output: 'Array' }, b => [KC(b.getFieldValue('K')), OA]); cover('k_lists', 'const.OBSTACLE_OBJECT_TYPES', 'const.RESOURCES_ALL');
def('const', 'k_sproto', { message0: '建筑代号 %1 对应的类型', args0: [dd('K', SPROTO)], output: null }, b => [`${KC('STRUCTURE_PROTOTYPES')}[${q(b.getFieldValue('K'))}]`, OM]); cover('k_sproto', 'const.STRUCTURE_PROTOTYPES');

// ---------- 判断 / 循环 / 数字 / 文字 / 列表（通用积木，Blockly 自带 + 少量补充） ----------
def('math', 'n_minmax', { message0: '%1 和 %2 里 %3 的', args0: [val('A', 'Number'), val('B', 'Number'), dd('M', [['较小', 'min'], ['较大', 'max']])], output: 'Number', inputsInline: true },
  b => [`Math.${b.getFieldValue('M')}(${v(b, 'A', '0')}, ${v(b, 'B', '0')})`, OF], { inputs: { A: num(1), B: num(2) } });
def('text', 't_str', { message0: '把 %1 变成文字', args0: [val('V')], output: 'String', inputsInline: true }, b => [`String(${v(b, 'V', "''")})`, OF]);
def('text', 't_log', { message0: '在日志里显示 %1', args0: [val('V')], ...stmt }, b => `console.log(${v(b, 'V', "''")});\n`, { inputs: { V: txt('你好') } });
def('list', 'li_sort', { message0: '%1 按 %2 %3 排好', args0: [val('L', 'Array'), dd('P', PROP_DD), dd('D', [['从小到大', '1'], ['从大到小', '-1']])], output: 'Array', inputsInline: true },
  b => { const p = b.getFieldValue('P'), d = b.getFieldValue('D'); return [`[...(${v(b, 'L', '[]')} || [])].sort((a, b) => ((a?.${p} > b?.${p}) - (a?.${p} < b?.${p})) * ${d})`, OF]; });
def('list', 'li_push', { message0: '把 %1 加到列表 %2 末尾', args0: [val('V'), val('L', 'Array')], ...stmt }, b => `(${v(b, 'L', '[]')})?.push(${v(b, 'V', 'null')});\n`);
def('list', 'li_includes', { message0: '列表 %1 里有 %2', args0: [val('L', 'Array'), val('V')], output: 'Boolean', inputsInline: true }, b => [`!!(${v(b, 'L', '[]')})?.includes(${v(b, 'V', 'null')})`, OA]);

// Blockly 自带的通用积木（中文由 msg-zh 提供），放进对应分类；数字输入都用可直接点按输入的数字块
const BUILTIN = {
  logic: [{ type: 'controls_if' }, { type: 'controls_if', extraState: { hasElse: true } }, { type: 'controls_if', extraState: { elseIfCount: 1, hasElse: true } },
    { type: 'logic_compare', inputs: { A: num(0), B: num(0) } }, { type: 'logic_operation' }, { type: 'logic_negate' }, { type: 'logic_boolean' }, { type: 'logic_null' }, { type: 'logic_ternary' }],
  loop: [{ type: 'controls_repeat_ext', inputs: { TIMES: num(10) } }, { type: 'controls_whileUntil' }, { type: 'controls_for', inputs: { FROM: num(1), TO: num(10), BY: num(1) } },
    { type: 'controls_forEach' }, { type: 'controls_flow_statements', fields: { FLOW: 'BREAK' } }, { type: 'controls_flow_statements', fields: { FLOW: 'CONTINUE' } }],
  math: [{ type: 'math_number', fields: { NUM: 0 } }, { type: 'math_arithmetic', inputs: { A: num(1), B: num(1) } }, { type: 'math_modulo', inputs: { DIVIDEND: num(10), DIVISOR: num(3) } },
    { type: 'math_single', fields: { OP: 'ABS' }, inputs: { NUM: num(-5) } }, { type: 'math_round', inputs: { NUM: num(3.6) } }, { type: 'math_random_int', inputs: { FROM: num(1), TO: num(100) } },
    { type: 'math_random_float' }, { type: 'math_on_list', fields: { OP: 'MIN' } }, { type: 'math_number_property', inputs: { NUMBER_TO_CHECK: num(0) } }, { type: 'math_constrain', inputs: { VALUE: num(50), LOW: num(1), HIGH: num(100) } }],
  text: [{ type: 'text' }, { type: 'text_join' }, { type: 'text_length', inputs: { VALUE: txt('abc') } }, { type: 'text_isEmpty', inputs: { VALUE: txt('') } }],
  list: [{ type: 'lists_create_empty' }, { type: 'lists_create_with' }, { type: 'lists_repeat', inputs: { NUM: num(5) } }, { type: 'lists_length' }, { type: 'lists_isEmpty' },
    { type: 'lists_getIndex' }, { type: 'lists_setIndex' }, { type: 'lists_indexOf' }, { type: 'lists_getSublist' }, { type: 'lists_sort' }],
};
for (const [cat, list] of Object.entries(BUILTIN)) CAT[cat] = [...list.map(x => ({ kind: 'block', ...x })), ...(CAT[cat] || [])];

// 生成代码：变量、函数放在模块顶层（跨回合保留）；其余积木每回合在 loop() 里按从上到下执行
const RESERVED = ['loop', R, 'Math', 'console', 'String', 'Infinity', 'undefined'];
function toCode(ws) {
  USED.clear(); JS.addReservedWords(RESERVED.join(','));
  JS.init(ws); let body = '';
  const top = ws.getTopBlocks(true);
  for (const b of top) { if (b.outputConnection || !b.isEnabled()) continue; const c = JS.blockToCode(b); if (typeof c === 'string') body += c; }
  const defs = JS.finish('').trim();
  const imports = [...USED].map(([m, s]) => `import { ${[...s].sort().join(', ')} } from '${m}';`).join('\n');
  return `// 由积木自动生成（官方 Arena API）\n${imports}${imports ? '\n' : ''}let ${R};\n${defs ? defs + '\n' : ''}export function loop() {\n${indent(body)}}\n`;
}
// 官方导出名不能被玩家变量 / 函数名占用
for (const list of [PROTOS.map(p => p[1]), CODES.map(c => c[1]), PARTDD.map(c => c[1]), DIRS.map(c => c[1]), TERRAINS.map(c => c[1]), RES.map(c => c[1]), NUMS.map(c => c[1]), EFFS.map(c => c[1]), ARENA_K.map(c => c[1]),
  ['getTicks', 'getCpuTime', 'getHeapStatistics', 'getObjectsByPrototype', 'getObjects', 'getObjectById', 'getRange', 'getDirection', 'getTerrainAt', 'findInRange', 'findClosestByRange', 'findClosestByPath', 'findPath', 'createConstructionSite',
    'searchPath', 'CostMatrix', 'Visual', 'arenaInfo', 'BODYPART_COST', 'CONSTRUCTION_COST', 'RANGED_ATTACK_DISTANCE_RATE', 'OBSTACLE_OBJECT_TYPES', 'RESOURCES_ALL', 'STRUCTURE_PROTOTYPES']]) RESERVED.push(...list);
// 变量 / 函数名允许用中文（JS 本身支持），生成的代码更好读
if (Blockly.Names && !Blockly.Names.__cjk) { const orig = Blockly.Names.prototype.safeName; Blockly.Names.prototype.safeName = function (n) { return /^[\p{L}_$][\p{L}\p{N}_$]*$/u.test(n || '') ? n : orig.call(this, n); }; Blockly.Names.__cjk = 1; }
const indent = s => s.split('\n').map(l => l ? '  ' + l : l).join('\n');
const THEME = Blockly.Theme.defineTheme('arena-dark', { name: 'arena-dark', base: Blockly.Themes.Classic,
  componentStyles: { workspaceBackgroundColour: '#1E1E1E', toolboxBackgroundColour: '#2B2B2B', toolboxForegroundColour: '#e6e6e6', flyoutBackgroundColour: '#2B2B2B', flyoutForegroundColour: '#e6e6e6', flyoutOpacity: 1, scrollbarColour: '#555', scrollbarOpacity: 0.6, insertionMarkerColour: '#ffffff', insertionMarkerOpacity: 0.3, cursorColour: '#d0d0d0' } });

// 交互沿用 screeps-blockly-mobile：顶部分类 chips → 全宽积木列表（按最宽积木缩放、竖向滚动）；点按 = 添加到可见区域；长按 = 拖出
window.ArenaBlocks = {
  CATS, toCode, Roles, API, CAT, BLOCKS: B,
  create(div, saved, onChange) {
    const ws = Blockly.inject(div, { toolbox: { kind: 'flyoutToolbox', contents: [] }, trashcan: false, renderer: 'zelos', theme: THEME,
      zoom: { controls: false, wheel: true, pinch: true, startScale: 0.8, minScale: 0.4, maxScale: 2 }, move: { scrollbars: true, drag: true, wheel: true },
      grid: { spacing: 24, length: 2, colour: '#2c3748', snap: true } });
    Roles.list = [];
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
    ws.registerButtonCallback('CREATE_VARIABLE', bt => Blockly.Variables.createVariableButtonHandler(bt.getTargetWorkspace(), () => api.cur === 'var' && fly.isVisible() && api.openCat('var', true)));
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
      openCat(id, refresh) {
        const c = CATS.find(c => c.id === id); if (!c) return;
        if (!refresh && fly.isVisible() && api.cur === id) return close();
        api.cur = id;
        const contents = c.custom === 'VARIABLE' ? (Blockly.DataCategory || Blockly.Variables).flyoutCategory(ws) : c.custom === 'PROCEDURE' ? Blockly.Procedures.flyoutCategory(ws) : CAT[id];
        flyScale = 0.8; fly.show(contents);
        const W = div.getBoundingClientRect().width - 24; let maxW = 0;
        for (const b of fly.getWorkspace().getTopBlocks(false)) maxW = Math.max(maxW, b.getHeightWidth().width);
        const sc = Math.max(0.45, Math.min(0.85, W / (maxW || 1))); if (Math.abs(sc - flyScale) > 0.01) { flyScale = sc; fly.show(contents); }
        for (const b of fly.getWorkspace().getAllBlocks(false)) for (const inp of b.inputList) for (const f of inp.fieldRow) if (f.setEnabled) f.setEnabled(false);
        fly.scrollToStart && fly.scrollToStart(); api.onFly?.(id); Blockly.svgResize(ws);
      },
      closeCat: close, flyOpen: () => fly.isVisible(),
      code: () => toCode(ws), resize: () => Blockly.svgResize(ws),
      load(state) { Blockly.Events.disable(); ws.clear(); Roles.list = []; if (state) try { Blockly.serialization.workspaces.load(state, ws); } catch (e) { ws.clear(); Roles.list = []; } /* 旧版积木已移除：载入失败就留空白 */ Blockly.Events.enable(); ws.clearUndo(); onChange(toCode(ws), Blockly.serialization.workspaces.save(ws)); },
      undo: r => ws.undo(!!r), zoom: d => ws.zoomCenter(d), center: () => ws.scrollCenter(),
      deleteSelected() { const s = Blockly.getSelected && Blockly.getSelected(); if (s && s.workspace === ws && s.isDeletable()) s.dispose(true, true); },
      count: () => ws.getAllBlocks(false).length,
    });
    onChange(toCode(ws), Blockly.serialization.workspaces.save(ws));
    return api;
  },
};
})();
