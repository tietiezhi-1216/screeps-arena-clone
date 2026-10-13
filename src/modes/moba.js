// 三路推塔（MOBA）与 山头争夺（King of the Hill）—— 本项目原创模式，规则见 docs/MOBA.md / docs/KING_OF_THE_HILL.md。
// 只使用官方对象：StructureSpawn / StructureTower / StructureContainer / Creep / Flag，塔的伤害、射程、冷却、能耗全部按官方常量。
import { W, H } from '../engine/pathfinder.js';
import * as P from '../engine/prototypes.js';
import * as C from '../constants.js';
import { World } from '../engine/world.js';

export const MOBA_CONFIG = {
  ticksLimit: 3000, spawnInitialEnergy: 1000, spawnIncome: 5,      // 基地每回合自动 +5 能量
  towerAutoRange: 10,           // 玩家没下令时，塔自动攻击 10 格内最近的敌方兵（官方射程 20，自动只打近处）
  towerRegen: 1,                // 塔每回合回 1 能量（官方容量 10、每发 10 能量、冷却 10）
  laneBoxEvery: 100, laneBoxEnergy: 300, laneBoxLife: 150,
};
export const LANES = [12, 50, 88];               // 上 / 中 / 下 路的 y
export const MOBA_SPAWNS = [{ x: 5, y: 50 }, { x: 94, y: 50 }];
export const TOWER_X = [16, 32];                  // 每路两座塔（内塔、外塔），右侧镜像
export function mobaTerrain() {
  const t = new Uint8Array(W * H).fill(1);
  const open = (x, y, v = 0) => { if (x > 0 && y > 0 && x < W - 1 && y < H - 1) t[y * W + x] = v; };
  for (let y = 4; y <= 95; y++) for (let x = 2; x <= 9; x++) { open(x, y); open(W - 1 - x, y); }   // 两侧基地纵走廊
  for (const ly of LANES) for (let x = 2; x < W - 2; x++) for (let dy = -2; dy <= 2; dy++) open(x, ly + dy);
  for (const ly of LANES) for (let x = 42; x <= 57; x++) for (const dy of [-2, 2]) open(x, ly + dy, 2);      // 河道沼泽（两边）
  for (let y = 15; y <= 85; y++) if (!LANES.some(ly => Math.abs(y - ly) <= 2)) for (const x of [49, 50]) open(x, y, 2); // 河道：连通三路的沼泽小道
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (x === 0 || y === 0 || x === W - 1 || y === H - 1) t[y * W + x] = 1;
  return t;
}
export function createMoba({ seed = 1, players = ['p1', 'p2'], config = {} } = {}) {
  const cfg = { ...MOBA_CONFIG, ...config };
  const w = new World({ seed, terrain: mobaTerrain(), players, ticksLimit: cfg.ticksLimit, arena: { name: 'Three Lanes', level: 1 } });
  const spawns = players.map((p, i) => { const s = w.add(new P.StructureSpawn(w, MOBA_SPAWNS[i].x, MOBA_SPAWNS[i].y, p)); s.store.energy = cfg.spawnInitialEnergy; return s; });
  const towers = [];
  players.forEach((p, i) => {
    for (const ly of LANES) for (const tx of TOWER_X) { const t = w.add(new P.StructureTower(w, i ? W - 1 - tx : tx, ly, p)); t.store.energy = C.TOWER_CAPACITY; towers.push(t); }
    const bt = w.add(new P.StructureTower(w, i ? W - 1 - 8 : 8, 50, p)); bt.store.energy = C.TOWER_CAPACITY; towers.push(bt); // 基地塔
  });
  w.mobaTowers = towers;
  w.rules.push(world => {
    for (const s of spawns) if (s.exists) s.store.energy = Math.min(C.SPAWN_ENERGY_CAPACITY, (s.store.energy || 0) + cfg.spawnIncome);
    for (const t of towers) {
      if (!t.exists) continue;
      t.store.energy = Math.min(C.TOWER_CAPACITY, (t.store.energy || 0) + cfg.towerRegen);
      if (t.cooldown || (t.store.energy || 0) < C.TOWER_ENERGY_COST) continue;
      let best = null, bd = 1e9;
      for (const c of world.all(P.Creep)) { if (c.spawning || c._owner === t._owner) continue; const d = P.range(t, c); if (d <= cfg.towerAutoRange && d < bd) { bd = d; best = c; } }
      if (best) world.intent(t, 'tower', { kind: 'attack', target: best.id });   // 下一回合结算；玩家自己下令会覆盖
    }
    if (world.tick % cfg.laneBoxEvery === 0) for (const ly of LANES) for (const x of [40, W - 1 - 40]) {
      const b = world.add(new P.StructureContainer(world, x, ly + 1, null, { decayIn: cfg.laneBoxLife })); b.store.energy = cfg.laneBoxEnergy; }
    const alive = spawns.filter(s => s.exists);
    if (alive.length < spawns.length) { world.result = alive.length ? { winner: alive[0]._owner, reason: 'base destroyed' } : { winner: null, reason: 'both bases destroyed' }; return; }
    const tw = players.map(p => towers.filter(t => t.exists && t._owner === p).length);
    world.score = { [players[0]]: 7 - tw[1], [players[1]]: 7 - tw[0] };
    if (world.tick >= world.ticksLimit) {
      if (tw[0] !== tw[1]) world.result = { winner: players[tw[0] > tw[1] ? 0 : 1], reason: 'timeout (more towers)' };
      else { const h = spawns.map(s => s.hits); world.result = h[0] === h[1] ? { winner: null, reason: 'timeout' } : { winner: players[h[0] > h[1] ? 0 : 1], reason: 'timeout (base hp)' }; }
    }
  });
  return w;
}

// 山头争夺：地图中央有一面中立旗帜，旗帜周围 2 格内只有一方的兵时这一方每回合得 1 分，先到 300 分获胜。
export const HILL_CONFIG = { ticksLimit: 2000, scoreToWin: 300, hillRadius: 2, spawnInitialEnergy: 800, spawnIncome: 3 };
export function hillTerrain(seed) {
  // 左右镜像：几块岩石掩体 + 两片沼泽 + 中央开阔的山头（种子只微调岩石位置）
  const t = new Uint8Array(W * H), j = seed % 3;
  const blob = (cx, cy, r, v) => { for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) if (x > 0 && y > 0 && x < W / 2 && y < H - 1 && Math.hypot(x - cx, y - cy) <= r + .3) t[y * W + x] = v; };
  blob(30, 28, 7, 2); blob(30, 72, 7, 2);                       // 沼泽
  for (const [x, y, r] of [[22, 40 + j, 2], [22, 60 - j, 2], [38, 34, 3], [38, 66, 3], [42, 50, 2], [14, 20, 3], [14, 80, 3], [30, 10, 2], [30, 90, 2]]) blob(x, y, r, 1);
  for (let y = 0; y < H; y++) for (let x = 0; x < W / 2; x++) t[y * W + W - 1 - x] = t[y * W + x];
  for (let y = 45; y <= 55; y++) for (let x = 45; x <= 54; x++) t[y * W + x] = 0;
  for (let i = 0; i < W; i++) { t[i] = t[(H - 1) * W + i] = t[i * W] = t[i * W + W - 1] = 1; }
  return t;
}
export function createHill({ seed = 1, players = ['p1', 'p2'], config = {} } = {}) {
  const cfg = { ...HILL_CONFIG, ...config };
  const terrain = hillTerrain(seed);
  for (const s of MOBA_SPAWNS) for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const x = s.x + dx, y = s.y + dy; if (x > 0 && x < W - 1) terrain[y * W + x] = 0; }
  const w = new World({ seed, terrain, players, ticksLimit: cfg.ticksLimit, arena: { name: 'King of the Hill', level: 1 } });
  const spawns = players.map((p, i) => { const s = w.add(new P.StructureSpawn(w, MOBA_SPAWNS[i].x, MOBA_SPAWNS[i].y, p)); s.store.energy = cfg.spawnInitialEnergy; return s; });
  const flag = w.add(new P.Flag(w, 50, 50, null));
  w.score = { [players[0]]: 0, [players[1]]: 0 };
  w.rules.push(world => {
    for (const s of spawns) if (s.exists) s.store.energy = Math.min(C.SPAWN_ENERGY_CAPACITY, (s.store.energy || 0) + cfg.spawnIncome);
    const near = players.map(p => world.all(P.Creep).some(c => !c.spawning && c._owner === p && P.range(c, flag) <= cfg.hillRadius));
    if (near[0] !== near[1]) { const p = players[near[0] ? 0 : 1]; flag._owner = p; world.score[p]++; }
    else if (!near[0]) flag._owner = flag._owner; // 无人时保持上一位占领者（只显示，不加分）
    const alive = spawns.filter(s => s.exists);
    if (alive.length < spawns.length) { world.result = alive.length ? { winner: alive[0]._owner, reason: 'spawn destroyed' } : { winner: null, reason: 'both spawns destroyed' }; return; }
    const win = players.filter(p => world.score[p] >= cfg.scoreToWin);
    if (win.length === 1) world.result = { winner: win[0], reason: 'hill held' };
    else if (world.tick >= world.ticksLimit) { const [a, b] = players.map(p => world.score[p]); world.result = a === b ? { winner: null, reason: 'timeout (score tie)' } : { winner: players[a > b ? 0 : 1], reason: 'timeout (higher score)' }; }
  });
  return w;
}
