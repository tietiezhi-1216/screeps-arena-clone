// 玩家脚本：与官方一致，写 ES 模块 `import ... from 'game/...'` 并 `export function loop()`。
// 这里把 import/export 改写成对注入模块表的解构，然后在隔离作用域里执行。
import * as C from '../constants.js';
import { PROTOTYPES } from './prototypes.js';
import { CostMatrix } from './pathfinder.js';

export function transformModule(src) {
  let out = src.replace(/import\s*\*\s*as\s+(\w+)\s+from\s*['"]([^'"]+)['"]\s*;?/g, (_, n, m) => `const ${n} = __require(${JSON.stringify(m)});`);
  out = out.replace(/import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]\s*;?/g, (_, names, m) =>
    `const {${names.split(',').map(s => s.trim()).filter(Boolean).map(s => s.replace(/\s+as\s+/, ': ')).join(', ')}} = __require(${JSON.stringify(m)});`);
  out = out.replace(/import\s+(\w+)\s+from\s*['"]([^'"]+)['"]\s*;?/g, (_, n, m) => `const ${n} = __require(${JSON.stringify(m)}).default;`);
  const exported = [];
  out = out.replace(/export\s+(async\s+)?function\s+(\w+)/g, (_, a, n) => { exported.push(n); return `${a || ''}function ${n}`; });
  out = out.replace(/export\s+(const|let|var|class)\s+(\w+)/g, (_, k, n) => { exported.push(n); return `${k} ${n}`; });
  return out + `\n;return { ${exported.join(', ')} };`;
}

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

// compile: (code, globals) => fn。浏览器/Worker 用 Function；Node 可传入 vm 版本获得超时保护。
export function defaultCompile(code) { return new Function('__require', 'console', code); }

export class PlayerRuntime {
  constructor(world, pid, source, { compile = defaultCompile } = {}) {
    this.world = world; this.pid = pid; this.error = null; this.logs = [];
    const mods = modulesFor(world, pid);
    const require = m => { if (!(m in mods)) throw new Error(`Cannot find module '${m}'`); return mods[m]; };
    const console = { log: (...a) => this.logs.push(a.map(x => typeof x === 'string' ? x : safeJson(x)).join(' ')) };
    console.error = console.warn = console.info = console.log;
    try { this.exports = compile(transformModule(source))(require, console); if (typeof this.exports.loop !== 'function') throw new Error('loop() is not exported'); }
    catch (e) { this.error = String(e && e.stack || e); this.exports = { loop() {} }; }
  }
  run() {
    const w = this.world; w.current = this.pid; this.logs = []; const vis = [];
    Visual._sink = v => vis.push(v);
    try { this.exports.loop(); } catch (e) { this.logs.push('[error] ' + (e && e.stack || e).toString().split('\n').slice(0, 3).join('\n')); }
    Visual._sink = null; w.current = null;
    if (this.error) this.logs.unshift('[compile error] ' + this.error);
    w.logs[this.pid] = this.logs; w.visuals[this.pid] = vis.flatMap(v => v._items);
  }
}
function safeJson(x) { try { return JSON.stringify(x, (k, v) => k === '_w' ? undefined : v); } catch { return String(x); } }
