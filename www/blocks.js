// Arena 积木：做法沿用 screeps-blockly-mobile（Blockly 11 + zelos 渲染 + 顶部分类条 + 点按添加），生成的是 Arena 风格 ES 模块代码。
(function () {
const JS = Blockly.JavaScript, O = JS.ORDER_NONE, OM = JS.ORDER_MEMBER, OF = JS.ORDER_FUNCTION_CALL, OA = JS.ORDER_ATOMIC;
const v = (b, n, d = 'undefined') => JS.valueToCode(b, n, O) || d;
const vm = (b, n) => JS.valueToCode(b, n, OM) || 'undefined';
const PROTOS = ['Creep', 'StructureSpawn', 'StructureTower', 'StructureContainer', 'StructureExtension', 'Source', 'Resource', 'Flag', 'BodyPart', 'ConstructionSite', 'StructureRampart', 'StructureWall'];
const PARTS = ['MOVE', 'WORK', 'CARRY', 'ATTACK', 'RANGED_ATTACK', 'HEAL', 'TOUGH'];
const dd = l => l.map(x => Array.isArray(x) ? x : [x, x]);
const B = {}, CAT = {};
function def(cat, type, json, gen) { json.type = type; json.colour = CATS.find(c => c.id === cat).colour; Blockly.defineBlocksWithJsonArray([json]); JS.forBlock[type] = gen; (CAT[cat] = CAT[cat] || []).push(type); B[type] = 1; }
const CATS = [
  { id: 'obj', name: '查找', colour: '#3d85c6' }, { id: 'act', name: '动作', colour: '#a04848' }, { id: 'spawn', name: '出兵', colour: '#2e8b57' },
  { id: 'prop', name: '属性', colour: '#7a6a2e' }, { id: 'logic', name: '逻辑', colour: '#5b80a5' }, { id: 'loop', name: '循环', colour: '#5ba55b' },
  { id: 'math', name: '数学', colour: '#5b67a5' }, { id: 'list', name: '列表', colour: '#745ba5' }, { id: 'var', name: '变量', colour: '#a55b80', custom: 'VARIABLE' },
  { id: 'fn', name: '函数', colour: '#995ba5', custom: 'PROCEDURE' }, { id: 'text', name: '文本', colour: '#5ba58c' },
];
CAT.logic = ['controls_if', 'logic_compare', 'logic_operation', 'logic_negate', 'logic_boolean', 'logic_null'];
CAT.loop = ['controls_forEach', 'controls_repeat_ext', 'controls_whileUntil', 'controls_flow_statements'];
CAT.math = ['math_number', 'math_arithmetic', 'math_modulo', 'math_random_int', 'math_on_list'];
CAT.list = ['lists_create_with', 'lists_length', 'lists_isEmpty', 'lists_getIndex'];
CAT.text = ['text', 'text_join', 'text_print'];
const FILTERS = [['全部', 'all'], ['我的', 'my'], ['敌方', 'enemy'], ['中立', 'neutral']];
def('obj', 'arena_objects', { message0: '%1 的 %2 列表', args0: [{ type: 'field_dropdown', name: 'F', options: FILTERS }, { type: 'field_dropdown', name: 'P', options: dd(PROTOS) }], output: 'Array', tooltip: 'getObjectsByPrototype(...).filter(...)' },
  b => { const p = b.getFieldValue('P'), f = b.getFieldValue('F'); return [`getObjectsByPrototype(${p})${f === 'my' ? '.filter(o => o.my)' : f === 'enemy' ? '.filter(o => o.my === false)' : f === 'neutral' ? '.filter(o => o.my === undefined)' : ''}`, OF]; });
def('obj', 'arena_first', { message0: '%1 中第一个', args0: [{ type: 'input_value', name: 'L' }], output: null }, b => [`${vm(b, 'L')}[0]`, OM]);
def('obj', 'arena_closest', { message0: '离 %1 最近（%2）的 %3', args0: [{ type: 'input_value', name: 'A' }, { type: 'field_dropdown', name: 'M', options: [['路径', 'findClosestByPath'], ['直线', 'findClosestByRange']] }, { type: 'input_value', name: 'L' }], output: null, inputsInline: true },
  b => [`${vm(b, 'A')}.${b.getFieldValue('M')}(${v(b, 'L', '[]')})`, OF]);
def('obj', 'arena_in_range', { message0: '%1 中离 %2 ≤ %3 格的', args0: [{ type: 'input_value', name: 'L' }, { type: 'input_value', name: 'A' }, { type: 'input_value', name: 'R', check: 'Number' }], output: 'Array', inputsInline: true },
  b => [`findInRange(${v(b, 'A')}, ${v(b, 'L', '[]')}, ${v(b, 'R', '1')})`, OF]);
def('obj', 'arena_with_part', { message0: '%1 中带 %2 部件的', args0: [{ type: 'input_value', name: 'L' }, { type: 'field_dropdown', name: 'T', options: dd(PARTS) }], output: 'Array', inputsInline: true },
  b => [`${vm(b, 'L')}.filter(c => c.body && c.body.some(p => p.type === ${b.getFieldValue('T')} && p.hits > 0))`, OF]);
def('obj', 'arena_hurt', { message0: '%1 中受伤的', args0: [{ type: 'input_value', name: 'L' }], output: 'Array', inputsInline: true }, b => [`${vm(b, 'L')}.filter(o => o.hits < o.hitsMax)`, OF]);
def('obj', 'arena_pos', { message0: '坐标 x %1 y %2', args0: [{ type: 'input_value', name: 'X', check: 'Number' }, { type: 'input_value', name: 'Y', check: 'Number' }], output: null, inputsInline: true }, b => [`({ x: ${v(b, 'X', '0')}, y: ${v(b, 'Y', '0')} })`, OA]);
const ACTS = [['攻击', 'attack'], ['远程攻击', 'rangedAttack'], ['治疗', 'heal'], ['远程治疗', 'rangedHeal'], ['移动到', 'moveTo'], ['采集', 'harvest'], ['建造', 'build'], ['捡起', 'pickup'], ['拉动', 'pull']];
def('act', 'arena_act', { message0: '%1 %2 %3', args0: [{ type: 'input_value', name: 'C' }, { type: 'field_dropdown', name: 'A', options: ACTS }, { type: 'input_value', name: 'T' }], previousStatement: null, nextStatement: null, inputsInline: true },
  b => `${vm(b, 'C')}.${b.getFieldValue('A')}(${v(b, 'T')});\n`);
def('act', 'arena_act_or_move', { message0: '%1 %2 %3 ，够不着就走过去', args0: [{ type: 'input_value', name: 'C' }, { type: 'field_dropdown', name: 'A', options: ACTS.filter(a => a[1] !== 'moveTo') }, { type: 'input_value', name: 'T' }], previousStatement: null, nextStatement: null, inputsInline: true },
  b => { const c = vm(b, 'C'), t = v(b, 'T'); return `if (${t} && ${c}.${b.getFieldValue('A')}(${t}) === ERR_NOT_IN_RANGE) ${c}.moveTo(${t});\n`; });
def('act', 'arena_energy', { message0: '%1 %2 能量 %3 ，够不着就走过去', args0: [{ type: 'input_value', name: 'C' }, { type: 'field_dropdown', name: 'A', options: [['从…取出', 'withdraw'], ['存入…', 'transfer']] }, { type: 'input_value', name: 'T' }], previousStatement: null, nextStatement: null, inputsInline: true },
  b => { const c = vm(b, 'C'), t = v(b, 'T'); return `if (${t} && ${c}.${b.getFieldValue('A')}(${t}, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) ${c}.moveTo(${t});\n`; });
def('act', 'arena_mass', { message0: '%1 范围远程攻击', args0: [{ type: 'input_value', name: 'C' }], previousStatement: null, nextStatement: null, inputsInline: true }, b => `${vm(b, 'C')}.rangedMassAttack();\n`);
def('act', 'arena_flee', { message0: '%1 远离 %2 到 %3 格外', args0: [{ type: 'input_value', name: 'C' }, { type: 'input_value', name: 'T' }, { type: 'input_value', name: 'R', check: 'Number' }], previousStatement: null, nextStatement: null, inputsInline: true },
  b => { const c = vm(b, 'C'); return `{ const __r = searchPath(${c}, { pos: ${v(b, 'T')}, range: ${v(b, 'R', '4')} }, { flee: true }); if (__r.path.length) ${c}.moveTo(__r.path[0]); }\n`; });
def('act', 'arena_tower', { message0: '塔 %1 %2 %3', args0: [{ type: 'input_value', name: 'C' }, { type: 'field_dropdown', name: 'A', options: [['攻击', 'attack'], ['治疗', 'heal']] }, { type: 'input_value', name: 'T' }], previousStatement: null, nextStatement: null, inputsInline: true },
  b => `if (${v(b, 'T')}) ${vm(b, 'C')}.${b.getFieldValue('A')}(${v(b, 'T')});\n`);
def('spawn', 'arena_spawn', { message0: '%1 生产 creep，身体 %2', args0: [{ type: 'input_value', name: 'S' }, { type: 'field_input', name: 'BODY', text: 'MOVE, ATTACK' }], previousStatement: null, nextStatement: null, inputsInline: true, tooltip: '部件：' + PARTS.join(' ') },
  b => { const body = b.getFieldValue('BODY').split(/[\s,]+/).map(s => s.toUpperCase()).filter(s => PARTS.includes(s)); return `if (${vm(b, 'S')} && !${vm(b, 'S')}.spawning) ${vm(b, 'S')}.spawnCreep([${body.join(', ')}]);\n`; });
def('spawn', 'arena_part', { message0: '部件 %1', args0: [{ type: 'field_dropdown', name: 'T', options: dd(PARTS) }], output: null }, b => [b.getFieldValue('T'), OA]);
const PROPS = [['生命', 'hits'], ['最大生命', 'hitsMax'], ['x', 'x'], ['y', 'y'], ['是我的', 'my'], ['疲劳', 'fatigue'], ['正在生产', 'spawning'], ['能量', 'store.energy'], ['剩余容量', 'store.getFreeCapacity()'], ['塔冷却', 'cooldown'], ['部件类型', 'type']];
def('prop', 'arena_prop', { message0: '%1 的 %2', args0: [{ type: 'input_value', name: 'O' }, { type: 'field_dropdown', name: 'P', options: PROPS }], output: null, inputsInline: true },
  b => { const p = b.getFieldValue('P'); return [p.startsWith('store.') ? `(${vm(b, 'O')}.${p.replace('store.energy', 'store[RESOURCE_ENERGY]')} || 0)` : `${vm(b, 'O')}.${p}`, OM]; });
def('prop', 'arena_has_part', { message0: '%1 有 %2 部件', args0: [{ type: 'input_value', name: 'O' }, { type: 'field_dropdown', name: 'T', options: dd(PARTS) }], output: 'Boolean', inputsInline: true },
  b => [`${vm(b, 'O')}.body.some(p => p.type === ${b.getFieldValue('T')} && p.hits > 0)`, OF]);
def('prop', 'arena_range', { message0: '%1 到 %2 的距离', args0: [{ type: 'input_value', name: 'A' }, { type: 'input_value', name: 'B' }], output: 'Number', inputsInline: true }, b => [`getRange(${v(b, 'A')}, ${v(b, 'B')})`, OF]);
def('prop', 'arena_ticks', { message0: '当前 tick', output: 'Number' }, () => ['getTicks()', OF]);
def('prop', 'arena_exists', { message0: '%1 存在', args0: [{ type: 'input_value', name: 'O' }], output: 'Boolean', inputsInline: true }, b => [`!!(${v(b, 'O')})`, OA]);
def('text', 'arena_log', { message0: '控制台输出 %1', args0: [{ type: 'input_value', name: 'T' }], previousStatement: null, nextStatement: null }, b => `console.log(${v(b, 'T', "''")});\n`);

const HEADER = `import { getObjectsByPrototype, getObjectById, getTicks, getRange, findInRange, findClosestByPath, findClosestByRange, getTerrainAt } from 'game/utils';
import { Creep, StructureSpawn, StructureTower, StructureContainer, StructureExtension, Source, Resource, Flag, ConstructionSite, StructureRampart, StructureWall } from 'game/prototypes';
import { MOVE, WORK, CARRY, ATTACK, RANGED_ATTACK, HEAL, TOUGH, RESOURCE_ENERGY, ERR_NOT_IN_RANGE } from 'game/constants';
import { searchPath } from 'game/path-finder';
import { BodyPart } from 'arena';
`;
function toCode(ws) {
  JS.init(ws); const top = ws.getTopBlocks(true); let body = '', defs = '';
  for (const b of top) { if (b.outputConnection) continue; const c = JS.blockToCode(b); if (b.type.startsWith('procedures_def')) continue; body += c; }
  defs = Object.values(JS.definitions_ || {}).join('\n'); // 变量声明 + 函数定义
  JS.nameDB_ && JS.nameDB_.reset && JS.nameDB_.reset();
  return `// 由积木自动生成\n${HEADER}\nexport function loop() {\n${indent(defs)}\n${indent(body)}}\n`;
}
const indent = s => s.split('\n').map(l => l ? '  ' + l : l).join('\n');
const blk = (type, fields, inputs, next) => ({ type, ...(fields ? { fields } : {}), ...(inputs ? { inputs } : {}), ...(next ? { next: { block: next } } : {}) });
const val_ = b => ({ block: b }), varGet = id => blk('variables_get', { VAR: { id } });
const DEFAULT_WS = { variables: [{ name: 'creep', id: 'vc' }, { name: 'enemySpawn', id: 've' }],
  blocks: { languageVersion: 0, blocks: [{ ...blk('arena_spawn', { BODY: 'MOVE, MOVE, ATTACK, ATTACK' }, { S: val_(blk('arena_first', null, { L: val_(blk('arena_objects', { F: 'my', P: 'StructureSpawn' })) })) },
    blk('variables_set', { VAR: { id: 've' } }, { VALUE: val_(blk('arena_first', null, { L: val_(blk('arena_objects', { F: 'enemy', P: 'StructureSpawn' })) })) },
      blk('controls_forEach', { VAR: { id: 'vc' } }, { LIST: val_(blk('arena_objects', { F: 'my', P: 'Creep' })), DO: { block: blk('arena_act_or_move', { A: 'attack' }, { C: val_(varGet('vc')), T: val_(varGet('ve')) }) } }))), x: 20, y: 20 }] } };
const THEME = Blockly.Theme.defineTheme('arena-dark', { name: 'arena-dark', base: Blockly.Themes.Classic,
  componentStyles: { workspaceBackgroundColour: '#1C2533', toolboxBackgroundColour: '#222c3c', toolboxForegroundColour: '#e6e6e6', flyoutBackgroundColour: '#222c3c', flyoutForegroundColour: '#e6e6e6', flyoutOpacity: 1, scrollbarColour: '#555', scrollbarOpacity: 0.6, insertionMarkerColour: '#ffffff', insertionMarkerOpacity: 0.3, cursorColour: '#d0d0d0' } });

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
      closeCat: close,
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
