// 测试辅助：无头加载 Blockly + www/blocks.js，并提供用积木 JSON 拼程序的小工具
import fs from 'node:fs'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
export const Blockly = require('blockly'); Blockly.JavaScript = require('blockly/javascript').javascriptGenerator;
Blockly.setLocale(require('blockly/msg/zh-hans'));
globalThis.Blockly = Blockly; globalThis.window = globalThis;
if (!window.ArenaBlocks) new Function(fs.readFileSync(new URL('../www/blocks.js', import.meta.url), 'utf8'))();
export const AB = window.ArenaBlocks;
const STMT = /^(DO\d*|ELSE|STACK)$/;
export function program() {
  const vars = []; const ids = {};
  const vid = n => ids[n] || (vars.push({ name: n, id: 'v' + vars.length }), ids[n] = 'v' + (vars.length - 1));
  const chain = bs => { bs = bs.filter(Boolean); for (let i = bs.length - 2; i >= 0; i--) bs[i].next = { block: bs[i + 1] }; return bs[0]; };
  const B = (type, fields, inputs, extraState) => ({ type, ...(fields ? { fields } : {}), ...(extraState ? { extraState } : {}),
    ...(inputs ? { inputs: Object.fromEntries(Object.entries(inputs).filter(([, v]) => v).map(([k, v]) => [k, { block: STMT.test(k) ? chain([].concat(v)) : v }])) } : {}) });
  const P = {
    B, chain, n: x => B('math_number', { NUM: x }), t: s => B('text', { TEXT: s }), bool: x => B('logic_boolean', { BOOL: x ? 'TRUE' : 'FALSE' }),
    set: (n, v) => B('variables_set', { VAR: { id: vid(n) } }, { VALUE: v }), get: n => B('variables_get', { VAR: { id: vid(n) } }),
    each: (n, list, body) => B('controls_forEach', { VAR: { id: vid(n) } }, { LIST: list, DO: body }),
    all: T => B('f_all', { T }), mineOf: (T, my = true) => B('f_filter', { P: 'my', OP: '===' }, { L: B('f_all', { T }), V: P.bool(my) }),
    first: L => B('lists_getIndex', { MODE: 'GET', WHERE: 'FIRST' }, { VALUE: L }),
    filter: (L, prop, op, v) => B('f_filter', { P: prop, OP: op }, { L, V: v }),
    prop: (o, p) => B('p_get', { P: p }, { O: o }), code: k => B('k_code', { K: k }), res: k => B('k_res', { K: k }),
    eq: (a, b, op = 'EQ') => B('logic_compare', { OP: op }, { A: a, B: b }),
    if: (c, then, els) => B('controls_if', null, { IF0: c, DO0: then, ...(els ? { ELSE: els } : {}) }, els ? { hasElse: true } : undefined),
    closest: (L, F, M = 'findClosestByRange') => B('f_closest', { M }, { L, F }),
    result: () => B('a_result'),
    orMove: (actBlock, who, target) => [actBlock, P.if(P.eq(P.result(), P.code('ERR_NOT_IN_RANGE')), B('a_moveto', null, { C: who, T: target }))],
    load(blocks, roles) { const ws = new Blockly.Workspace(); Blockly.serialization.workspaces.load({ ...(roles ? { arenaRoles: roles } : {}), variables: vars, blocks: { languageVersion: 0, blocks: [].concat(blocks) } }, ws); return ws; },
    gen(blocks, roles) { return AB.toCode(P.load(blocks, roles)); },
  };
  return P;
}
