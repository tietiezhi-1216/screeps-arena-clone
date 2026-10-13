// 玩家脚本：与官方一致，写 ES 模块 `import ... from 'game/...'` 并 `export function loop()`。
// 这里把 import/export 改写成对注入模块表的解构，然后在隔离作用域里执行。
import * as C from '../constants.js';
import { PROTOTYPES } from './prototypes.js';
import { CostMatrix } from './pathfinder.js';
import { parse } from '../vendor/acorn.mjs';

// 用 acorn 解析玩家 ES 模块：import/export 改写为对注入模块表的解构；在每个循环体、函数体入口插入 __chk()（CPU 限时检查点）。
export function transformModule(src) {
  const ast = parse(src, { ecmaVersion: 'latest', sourceType: 'module' });
  const edits = [], exported = [];
  const rep = (start, end, text) => edits.push({ start, end, text });
  const ins = (pos, text) => edits.push({ start: pos, end: pos, text });
  const req = m => `__require(${JSON.stringify(m)})`;
  for (const n of ast.body) {
    if (n.type === 'ImportDeclaration') {
      const parts = [], m = n.source.value; let ns = null, def = null;
      for (const sp of n.specifiers) {
        if (sp.type === 'ImportNamespaceSpecifier') ns = sp.local.name; else if (sp.type === 'ImportDefaultSpecifier') def = sp.local.name;
        else { const im = sp.imported.name ?? sp.imported.value; parts.push(im === sp.local.name ? im : `${JSON.stringify(im)}: ${sp.local.name}`); }
      }
      const out = []; if (ns) out.push(`const ${ns} = ${req(m)};`); if (def) out.push(`const ${def} = ${req(m)}.default;`); if (parts.length) out.push(`const {${parts.join(', ')}} = ${req(m)};`);
      rep(n.start, n.end, out.join(' '));
    } else if (n.type === 'ExportNamedDeclaration') {
      if (n.declaration) { rep(n.start, n.declaration.start, ''); const d = n.declaration;
        if (d.id) exported.push([d.id.name, d.id.name]); else for (const v of d.declarations) if (v.id.type === 'Identifier') exported.push([v.id.name, v.id.name]); }
      else { if (n.source) throw new SyntaxError('re-export from modules is not supported'); for (const sp of n.specifiers) exported.push([sp.exported.name, sp.local.name]); rep(n.start, n.end, ''); }
    } else if (n.type === 'ExportDefaultDeclaration') { rep(n.start, n.declaration.start, 'const __default = '); exported.push(['default', '__default']); }
    else if (n.type === 'ExportAllDeclaration') throw new SyntaxError('export * is not supported');
  }
  const LOOPS = new Set(['ForStatement', 'ForInStatement', 'ForOfStatement', 'WhileStatement', 'DoWhileStatement']);
  const FUNCS = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression']);
  (function walk(n) {
    if (!n || typeof n.type !== 'string') return;
    if (LOOPS.has(n.type) || FUNCS.has(n.type)) {
      const b = n.body;
      if (b.type === 'BlockStatement') ins(b.start + 1, '__chk();');
      else if (n.type === 'ArrowFunctionExpression') { ins(b.start, '(__chk(), '); ins(b.end, ')'); }
      else { ins(b.start, '{__chk();'); ins(b.end, '}'); }
    }
    for (const k in n) { if (k === 'type' || k === 'start' || k === 'end') continue; const v = n[k];
      if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v.type === 'string') walk(v); }
  })(ast);
  edits.sort((x, y) => y.start - x.start || (y.end - y.start) - (x.end - x.start));
  let out = src; for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  return `'use strict';\n{\n${out}\n;return { ${exported.map(([e, l]) => `${JSON.stringify(e)}: ${l}`).join(', ')} };\n}`;
}

export class CpuLimitError extends Error { constructor() { super('Script execution timed out: CPU time limit reached'); this.name = 'CpuLimitError'; } }
// 屏蔽给玩家脚本的全局名（同时配合 'use strict'，函数里的 this 也拿不到全局对象）
export const SHADOWED = ['globalThis', 'self', 'window', 'global', 'process', 'require', 'module', 'postMessage', 'fetch', 'XMLHttpRequest', 'importScripts', 'WebSocket', 'Worker', 'Function', 'setTimeout', 'setInterval', 'queueMicrotask', 'indexedDB', 'caches', 'localStorage', 'document', 'navigator', 'location'];
// 在当前 realm 里封死动态代码执行（eval / Function 构造器，包括通过 (()=>{}).constructor 拿到的），
// 必须在所有玩家脚本编译完成之后调用；插桩无法覆盖动态生成的代码，所以干脆禁止。
export const LOCKDOWN_SRC = `(() => { const deny = function () { throw new EvalError('Dynamic code execution is disabled in the arena sandbox'); };
  for (const F of [function () {}, async function () {}, function* () {}, async function* () {}]) {
    const proto = Object.getPrototypeOf(F); try { Object.defineProperty(proto, 'constructor', { value: deny, writable: false, configurable: false }); } catch (e) {} }
  try { Object.defineProperty(globalThis, 'eval', { value: deny, writable: false, configurable: false }); } catch (e) {}
  try { Object.defineProperty(globalThis, 'Function', { value: deny, writable: false, configurable: false }); } catch (e) {} })();`;
export function lockdown() { (0, eval)(LOCKDOWN_SRC); }
const now = () => globalThis.performance ? performance.now() : Date.now();

export class Visual {
  constructor(layer = 0, persistent = false) { this.layer = layer; this.persistent = persistent; this._items = []; Visual._sink?.(this); }
  _p(o) { return [o.x, o.y]; }
  circle(pos, style = {}) { this._items.push(['c', this._p(pos), style]); return this; }
  line(a, b, style = {}) { this._items.push(['l', this._p(a), this._p(b), style]); return this; }
  poly(points, style = {}) { this._items.push(['p', points.map(this._p), style]); return this; }
  rect(pos, w, h, style = {}) { this._items.push(['r', this._p(pos), w, h, style]); return this; }
  text(t, pos, style = {}) { this._items.push(['t', String(t), this._p(pos), style]); return this; }
  clear() { this._items = []; return this; }
  size() { return JSON.stringify(this._items).length; }
}

// 为某个玩家构造模块表
export function modulesFor(world, pid) {
  const utils = { ...world.utils }; delete utils.searchPath;
  const arenaInfo = { name: world.arena.name, level: world.arena.level, season: world.arena.season, ticksLimit: world.arena.ticksLimit, cpuTimeLimit: world.arena.cpuTimeLimit, cpuTimeLimitFirstTick: world.arena.cpuTimeLimitFirstTick };
  const pf = { searchPath: world.utils.searchPath, CostMatrix };
  const mods = {
    'game/constants': C, 'game/prototypes': PROTOTYPES, 'game/utils': utils, 'game/path-finder': pf, 'game/visual': { Visual },
    'game': { arenaInfo, utils, prototypes: PROTOTYPES, constants: C, pathFinder: pf, visual: { Visual } },
    'arena': { ...PROTOTYPES, ...(world.arenaModule || {}) },
  };
  for (const k of Object.keys(PROTOTYPES)) mods[`game/prototypes/${k.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}`] = PROTOTYPES;
  return mods;
}

// compile: (code) => fn(__require, console, __chk, ...SHADOWED)。默认用 Function；Node 可传 vm 版本（独立 realm）。
export function defaultCompile(code) { return new Function('__require', 'console', '__chk', ...SHADOWED, code); }

export class PlayerRuntime {
  constructor(world, pid, source, { compile = defaultCompile, hardRun } = {}) {
    this.world = world; this.pid = pid; this.error = null; this.logs = []; this.cpu = { used: 0, limit: 0, start: 0, tripped: false }; this.ticks = 0; this.hardRun = hardRun;
    const mods = modulesFor(world, pid);
    const require = m => { if (/^arena(\/|$)/.test(m)) return mods.arena; if (!(m in mods)) throw new Error(`Cannot find module '${m}'`); return mods[m]; };
    const console = { log: (...a) => { if (this.logs.length < 200) this.logs.push(a.map(x => typeof x === 'string' ? x : safeJson(x)).join(' ').slice(0, 1000)); } };
    console.error = console.warn = console.info = console.debug = console.log;
    const cpu = this.cpu; this._chk = () => { if (cpu.tripped || now() - cpu.start > cpu.limit) { cpu.tripped = true; throw new CpuLimitError(); } };
    this.cpu.limit = world.arena.cpuTimeLimitFirstTick; this.cpu.start = now();
    try { this.exports = compile(transformModule(source))(require, console, this._chk, ...SHADOWED.map(() => undefined)); if (typeof this.exports.loop !== 'function') throw new Error('loop() is not exported'); }
    catch (e) { this.error = String(e && e.stack || e).split('\n').slice(0, 3).join('\n'); this.exports = { loop() {} }; }
    world.utilsCpu = world.utilsCpu || {};
  }
  run() {
    const w = this.world; w.current = this.pid; this.logs = []; const vis = [];
    Visual._sink = v => vis.push(v);
    const cpu = this.cpu; cpu.limit = this.ticks++ === 0 ? w.arena.cpuTimeLimitFirstTick : w.arena.cpuTimeLimit; cpu.tripped = false; cpu.start = now(); w._cpuStartMs = cpu.start;
    try { this.hardRun ? this.hardRun(this.exports.loop, cpu.limit) : this.exports.loop(); }
    catch (e) { if (cpu.tripped || /timed out/i.test(String(e))) { cpu.tripped = true; this.logs.push(`[cpu] Script execution timed out (> ${cpu.limit} ms), tick aborted`); }
      else this.logs.push('[error] ' + (e && e.stack || e).toString().split('\n').slice(0, 3).join('\n')); }
    cpu.used = now() - cpu.start;
    if (cpu.tripped) for (const o of w.all()) if (o._owner === this.pid) w.intents.delete(o.id); // 超时：本 tick 指令全部作废
    Visual._sink = null; w.current = null;
    if (this.error) this.logs.unshift('[compile error] ' + this.error);
    w.logs[this.pid] = this.logs; w.visuals[this.pid] = vis.flatMap(v => v._items); w.cpu = { ...(w.cpu || {}), [this.pid]: Math.round(cpu.used * 1000) / 1000 };
  }
}
function safeJson(x) { try { return JSON.stringify(x, (k, v) => k === '_w' ? undefined : v); } catch { return String(x); } }
