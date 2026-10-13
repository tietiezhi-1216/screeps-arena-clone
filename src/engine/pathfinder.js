// game/path-finder：CostMatrix + searchPath（A*，8 方向，参数与默认值按官方文档）
import { TERRAIN_WALL, TERRAIN_SWAMP } from '../constants.js';
export const W = 100, H = 100;
export class CostMatrix {
  constructor() { this._bits = new Uint8Array(W * H); }
  set(x, y, cost) { if (x >= 0 && y >= 0 && x < W && y < H) this._bits[y * W + x] = cost; }
  get(x, y) { return this._bits[y * W + x]; }
  clone() { const c = new CostMatrix(); c._bits.set(this._bits); return c; }
}
const range = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
class Heap { constructor() { this.a = []; } push(n) { const a = this.a; a.push(n); let i = a.length - 1; while (i) { const p = (i - 1) >> 1; if (a[p].f <= a[i].f) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() { const a = this.a, top = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { let l = 2 * i + 1, r = l + 1, m = i; if (l < a.length && a[l].f < a[m].f) m = l; if (r < a.length && a[r].f < a[m].f) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top; } get size() { return this.a.length; } }

// terrainAt(x,y) -> TERRAIN_*；extraCost(x,y) -> 额外不可通行判定（由世界注入，比如障碍物建筑），返回 255 表示阻挡
export function makeSearchPath(terrainAt, defaultMatrix) {
  return function searchPath(origin, goal, opts = {}) {
    const goals = (Array.isArray(goal) ? goal : [goal]).map(g => g.pos ? { x: g.pos.x, y: g.pos.y, range: g.range ?? 0 } : { x: g.x, y: g.y, range: g.range ?? 0 });
    const plain = opts.plainCost ?? 2, swamp = opts.swampCost ?? 10, maxOps = opts.maxOps ?? 50000, maxCost = opts.maxCost ?? Infinity;
    const hw = opts.heuristicWeight ?? 1.2, flee = !!opts.flee, cm = opts.costMatrix || (defaultMatrix && defaultMatrix());
    const h = (x, y) => { let m = Infinity; for (const g of goals) { const d = flee ? Math.max(0, g.range - range({ x, y }, g)) : Math.max(0, range({ x, y }, g) - g.range); if (d < m) m = d; } return m; };
    const cost = (x, y) => { if (x < 0 || y < 0 || x >= W || y >= H) return 255; const c = cm ? cm.get(x, y) : 0; if (c) return c; const t = terrainAt(x, y); return t === TERRAIN_WALL ? 255 : t === TERRAIN_SWAMP ? swamp : plain; };
    const g = new Float64Array(W * H).fill(Infinity), from = new Int32Array(W * H).fill(-1), closed = new Uint8Array(W * H);
    const s = origin.y * W + origin.x; g[s] = 0; const open = new Heap(); open.push({ i: s, f: hw * h(origin.x, origin.y) });
    let ops = 0, best = s, bestH = h(origin.x, origin.y);
    while (open.size && ops < maxOps) {
      const { i } = open.pop(); if (closed[i]) continue; closed[i] = 1; ops++;
      const x = i % W, y = (i / W) | 0, hh = h(x, y);
      if (hh < bestH || (hh === bestH && g[i] < g[best])) { best = i; bestH = hh; }
      if (hh === 0) { best = i; bestH = 0; break; }
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; const c = cost(nx, ny); if (c >= 255) continue;
        const j = ny * W + nx, ng = g[i] + c; if (ng >= g[j] || ng > maxCost) continue; g[j] = ng; from[j] = i; open.push({ i: j, f: ng + hw * h(nx, ny) });
      }
    }
    const path = []; for (let i = best; i !== s && i >= 0; i = from[i]) path.push({ x: i % W, y: (i / W) | 0 }); path.reverse();
    return { path, ops, cost: g[best] === Infinity ? 0 : g[best], incomplete: bestH !== 0 };
  };
}
