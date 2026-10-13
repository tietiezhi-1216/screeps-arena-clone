// Spawn and Swamp（基础 / 高级）
// 已对照官方文档的规则见 docs/SPAWN_AND_SWAMP.md。
// 地图生成、家门口容器、中场容器刷新、高级 Source/Rampart 布局 —— 官方未公开，以下为近似（镜像对称）。
import { W, H } from '../engine/pathfinder.js';
import { mulberry32 } from '../engine/rng.js';
import * as C from '../constants.js';
import * as P from '../engine/prototypes.js';
import { World } from '../engine/world.js';

export const CONFIG = {
  ticksLimit: 2000,           // 近似：运行时以 arenaInfo.ticksLimit 为准
  spawnInitialEnergy: 500,    // 近似：未公布
  homeContainers: 3,          // 近似
  homeContainerEnergy: 500,   // 近似
  centerContainerEvery: 50,   // 近似；changelog：不断出现
  centerContainerEnergy: [200, 500], // 近似
  centerContainerLifetime: 100,  // 近似；changelog：很快消失
};

export function generateTerrain(seed) {
  const r = mulberry32(seed), t = new Uint8Array(W * H);
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
  for (const s of SPAWNS) for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const x = s.x + dx, y = s.y + dy; if (x > 1 && x < W - 2) terrain[y * W + x] = 0; }
  const w = new World({ seed, terrain, players, ticksLimit: cfg.ticksLimit, arena: { name: 'Spawn and Swamp', level: 1 } });
  const spawns = players.map((p, i) => { const s = w.add(new P.StructureSpawn(w, SPAWNS[i].x, SPAWNS[i].y, p)); s.store.energy = cfg.spawnInitialEnergy; return s; });
  const off = [[-2, -3], [-2, 0], [-2, 3]];
  spawns.forEach((s, i) => off.slice(0, cfg.homeContainers).forEach(([dx, dy]) => {
    const c = w.add(new P.StructureContainer(w, s.x + (i ? -dx : dx), s.y + dy));
    c.store.energy = cfg.homeContainerEnergy;
  }));
  w.rules.push(world => {
    if (world.tick % cfg.centerContainerEvery === 0) {
      for (let tries = 0; tries < 50; tries++) {
        const x = 20 + Math.floor(world.rng() * 30), y = 3 + Math.floor(world.rng() * (H - 6)), mx = W - 1 - x;
        if (!world.walkable(x, y) || !world.walkable(mx, y) || world.at(x, y).length || world.at(mx, y).length) continue;
        const [a, b] = cfg.centerContainerEnergy, e = a + Math.floor(world.rng() * (b - a + 1));
        for (const xx of [x, mx]) {
          const c = world.add(new P.StructureContainer(world, xx, y, null, { decayIn: cfg.centerContainerLifetime }));
          c.store.energy = e;
        }
        break;
      }
    }
    const alive = spawns.filter(s => s.exists);
    if (alive.length < spawns.length) world.result = alive.length ? { winner: alive[0]._owner, reason: 'spawn destroyed' } : { winner: null, reason: 'both spawns destroyed' };
  });
  return w;
}

// Advanced：changelog ticksLimit=10000；Source 1000/10 官方；布局近似
export const ADVANCED_CONFIG = { ticksLimit: 10000, homeContainerEnergy: 300, sourcesPerSide: 2 };
export function createAdvanced({ seed = 1, players = ['p1', 'p2'], config = {} } = {}) {
  const cfg = { ...ADVANCED_CONFIG, ...config };
  const w = createMatch({ seed, players, config: { homeContainerEnergy: cfg.homeContainerEnergy, ticksLimit: cfg.ticksLimit, ...config } });
  w.arena.name = 'Spawn and Swamp'; w.arena.level = 2;
  w.ticksLimit = cfg.ticksLimit; w.arena.ticksLimit = cfg.ticksLimit;
  SPAWNS.forEach((s, i) => {
    [[3, -3], [3, 3]].slice(0, cfg.sourcesPerSide).forEach(([dx, dy]) =>
      w.add(new P.Source(w, s.x + (i ? -dx : dx), s.y + dy, C.SOURCE_ENERGY_CAPACITY, C.SOURCE_ENERGY_CAPACITY)));
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const x = s.x + dx, y = s.y + dy;
      if (!w.at(x, y).some(o => o instanceof P.StructureRampart)) w.add(new P.StructureRampart(w, x, y, players[i]));
    }
  });
  return w;
}
