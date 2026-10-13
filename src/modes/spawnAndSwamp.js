// Spawn and Swamp（基础版）：100×100 大片沼泽地图，双方各一个 Spawn，摧毁对方 Spawn 获胜；2000 tick 未分胜负则平局。
// 地图生成与容器刷新为本项目的近似实现（官方未公开地图生成算法），数值规则均来自官方常量。
import { W, H } from '../engine/pathfinder.js';
import { mulberry32 } from '../engine/rng.js';
import * as C from '../constants.js';
import * as P from '../engine/prototypes.js';
import { World } from '../engine/world.js';

export const CONFIG = { ticksLimit: 2000, spawnInitialEnergy: 500, homeContainers: 3, homeContainerEnergy: 500, centerContainerEvery: 50, centerContainerEnergy: [200, 500] };

export function generateTerrain(seed) {
  const r = mulberry32(seed), t = new Uint8Array(W * H);
  // 左右镜像对称，保证公平
  let g = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W / 2; x++) { const v = r(); g[y * W + x] = v < 0.07 ? 1 : v < 0.55 ? 2 : 0; }
  for (let it = 0; it < 3; it++) { const n = new Uint8Array(g); for (let y = 0; y < H; y++) for (let x = 0; x < W / 2; x++) {
    let s = 0, wl = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const v = g[Math.min(H - 1, Math.max(0, y + dy)) * W + Math.min(W / 2 - 1, Math.max(0, x + dx))]; if (v === 2) s++; if (v === 1) wl++; }
    n[y * W + x] = wl >= 5 ? 1 : s >= 5 ? 2 : wl >= 3 && r() < 0.3 ? 1 : 0; } g = n; }
  for (let y = 0; y < H; y++) for (let x = 0; x < W / 2; x++) { t[y * W + x] = g[y * W + x]; t[y * W + (W - 1 - x)] = g[y * W + x]; }
  for (let i = 0; i < W; i++) { t[i] = t[(H - 1) * W + i] = t[i * W] = t[i * W + W - 1] = 1; t[W + i] = t[(H - 2) * W + i] = t[i * W + 1] = t[i * W + W - 2] = 1; }
  return t;
}
export const SPAWNS = [{ x: 8, y: 50 }, { x: 91, y: 50 }];
export function createMatch({ seed = 1, players = ['p1', 'p2'], config = {} } = {}) {
  const cfg = { ...CONFIG, ...config }, terrain = generateTerrain(seed);
  // 清理出生区
  for (const s of SPAWNS) for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const x = s.x + dx, y = s.y + dy; if (x > 1 && x < W - 2) terrain[y * W + x] = 0; }
  const w = new World({ seed, terrain, players, ticksLimit: cfg.ticksLimit, arena: { name: 'Spawn and Swamp', level: 1 } });
  const spawns = players.map((p, i) => { const s = w.add(new P.StructureSpawn(w, SPAWNS[i].x, SPAWNS[i].y, p)); s.store.energy = cfg.spawnInitialEnergy; return s; });
  // 每方出生点旁的容器（镜像）
  const off = [[-2, -3], [-2, 0], [-2, 3]];
  spawns.forEach((s, i) => off.slice(0, cfg.homeContainers).forEach(([dx, dy]) => { const c = w.add(new P.StructureContainer(w, s.x + (i ? -dx : dx), s.y + dy)); c.store.energy = cfg.homeContainerEnergy; }));
  // 中场周期性刷出带能量的中立容器（镜像成对，保证公平）
  w.rules.push(world => {
    if (world.tick % cfg.centerContainerEvery === 0) {
      for (let tries = 0; tries < 50; tries++) {
        const x = 20 + Math.floor(world.rng() * 30), y = 3 + Math.floor(world.rng() * (H - 6)), mx = W - 1 - x;
        if (!world.walkable(x, y) || !world.walkable(mx, y) || world.at(x, y).length || world.at(mx, y).length) continue;
        const [a, b] = cfg.centerContainerEnergy, e = a + Math.floor(world.rng() * (b - a + 1));
        for (const xx of [x, mx]) { const c = world.add(new P.StructureContainer(world, xx, y)); c.store.energy = e; }
        break;
      }
    }
    const alive = spawns.filter(s => s.exists);
    if (alive.length < spawns.length) world.result = alive.length ? { winner: alive[0]._owner, reason: 'spawn destroyed' } : { winner: null, reason: 'both spawns destroyed' };
  });
  return w;
}

// 高级版：在基础版之上，每方家门口加 2 个 Source（可采集），开放建造（Extension / Tower / Rampart / Wall / Road / Container）。
// 能量来源以 Source 为主，中场容器刷新保留；数值规则用官方常量，地图布局为近似实现。
export function createAdvanced({ seed = 1, players = ['p1', 'p2'], config = {} } = {}) {
  const w = createMatch({ seed, players, config: { homeContainerEnergy: 300, ...config } });
  w.arena.name = 'Spawn and Swamp'; w.arena.level = 2;
  SPAWNS.forEach((s, i) => [[3, -3], [3, 3]].forEach(([dx, dy]) => w.add(new P.Source(w, s.x + (i ? -dx : dx), s.y + dy, 1000, 1000))));
  return w;
}
