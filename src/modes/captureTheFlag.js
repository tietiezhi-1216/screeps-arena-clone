// Capture the Flag（基础版）：双方各占一角，有 1 面旗、2 座塔、14 个预置 creep（没有 Spawn）。
// 让任意一个己方 creep 踩上对方的旗即获胜；全灭对方也获胜；到时限平局。
// 地图中部周期性掉落 BodyPart，creep 踩上去就给自己加上这个部件（上限 MAX_CREEP_SIZE）。
// 公开资料确认：角落对角布局、每方 1 旗 + 2 塔 + 14 creep、BodyPart{type,ticksToDecay}；
// 地图细节、creep 具体身体组成、BodyPart 刷新频率、塔充能速度为本项目近似实现。
import { W, H } from '../engine/pathfinder.js';
import { mulberry32 } from '../engine/rng.js';
import * as C from '../constants.js';
import * as P from '../engine/prototypes.js';
import { World } from '../engine/world.js';

export const CONFIG = { ticksLimit: 2000, partEvery: 25, partDecay: 300, towerRecharge: 1, towerEnergy: 10 };
export const ROSTER = [
  ...Array(4).fill([C.MOVE, C.MOVE, C.ATTACK, C.ATTACK]),
  ...Array(4).fill([C.MOVE, C.MOVE, C.RANGED_ATTACK]),
  ...Array(2).fill([C.MOVE, C.HEAL]),
  ...Array(4).fill([C.TOUGH, C.TOUGH, C.MOVE, C.MOVE, C.ATTACK]),
];
export const BASES = [{ x: 8, y: 8 }, { x: 91, y: 91 }];

export function generateTerrain(seed) {
  const r = mulberry32(seed ^ 0x5eed), t = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (x + y > W - 1) continue; // 只生成对角线一侧，另一侧中心对称
    const v = r(); t[y * W + x] = v < 0.06 ? 1 : v < 0.3 ? 2 : 0;
  }
  // 斜穿地图的“河”（沼泽带）与几处墙块，制造推进路线
  for (let i = 10; i < W - 10; i++) for (let d = -2; d <= 2; d++) { const x = i, y = W - 1 - i + d; if (x + y <= W - 1 && y >= 0 && y < H) t[y * W + x] = 2; }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (x + y > W - 1) t[y * W + x] = t[(H - 1 - y) * W + (W - 1 - x)];
  for (let i = 0; i < W; i++) { t[i] = t[(H - 1) * W + i] = t[i * W] = t[i * W + W - 1] = 1; }
  for (const b of BASES) for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) { const x = b.x + dx, y = b.y + dy; if (x > 0 && y > 0 && x < W - 1 && y < H - 1) t[y * W + x] = 0; }
  return t;
}
export function createMatch({ seed = 1, players = ['p1', 'p2'], config = {} } = {}) {
  const cfg = { ...CONFIG, ...config };
  const w = new World({ seed, terrain: generateTerrain(seed), players, ticksLimit: cfg.ticksLimit, arena: { name: 'Capture the Flag', level: 1 } });
  w.arenaModule = { BodyPart: P.BodyPart };
  const flags = [], towers = [];
  players.forEach((p, i) => {
    const b = BASES[i], s = i ? -1 : 1;
    flags.push(w.add(new P.Flag(w, b.x, b.y, p)));
    for (const [dx, dy] of [[4, 1], [1, 4]]) { const t = w.add(new P.StructureTower(w, b.x + s * dx, b.y + s * dy, p)); t.store.energy = cfg.towerEnergy; towers.push(t); }
    ROSTER.forEach((body, k) => w.add(new P.Creep(w, b.x + s * (2 + (k % 5)), b.y + s * (2 + Math.floor(k / 5) * 2 + (k % 5 > 2 ? 1 : 0)) + (k >= 10 ? s : 0), p, body)));
  });
  const TYPES = [C.MOVE, C.ATTACK, C.RANGED_ATTACK, C.HEAL, C.TOUGH];
  w.rules.push(world => {
    // 塔慢慢充能（近似）
    for (const t of towers) if (t.exists) t.store.energy = Math.min(C.TOWER_CAPACITY, (t.store.energy || 0) + cfg.towerRecharge);
    // 拾取 BodyPart
    for (const bp of world.all(P.BodyPart)) {
      if (bp.ticksToDecay <= 0) { world.remove(bp); continue; }
      const c = world.at(bp.x, bp.y).find(o => o instanceof P.Creep && !o.spawning);
      if (c && c.body.length < C.MAX_CREEP_SIZE) { c.body.push({ type: bp.type, hits: C.BODYPART_HITS }); c.hitsMax += C.BODYPART_HITS; c.hits += C.BODYPART_HITS; world.remove(bp); world.events.push({ t: 'part', at: [bp.x, bp.y] }); }
    }
    // 中部成对（中心对称）刷新 BodyPart
    if (world.tick % cfg.partEvery === 0) for (let tries = 0; tries < 40; tries++) {
      const x = 30 + Math.floor(world.rng() * 40), y = 30 + Math.floor(world.rng() * 40), mx = W - 1 - x, my = H - 1 - y;
      if (!world.walkable(x, y) || !world.walkable(mx, my) || world.at(x, y).length || world.at(mx, my).length) continue;
      const type = TYPES[Math.floor(world.rng() * TYPES.length)];
      world.add(new P.BodyPart(world, x, y, type, cfg.partDecay)); world.add(new P.BodyPart(world, mx, my, type, cfg.partDecay)); break;
    }
    // 胜负
    const cap = players.map((p, i) => world.at(flags[1 - i].x, flags[1 - i].y).some(o => o instanceof P.Creep && o._owner === p));
    const alive = players.map(p => world.all(P.Creep).some(c => c._owner === p));
    if (cap[0] !== cap[1]) world.result = { winner: players[cap[0] ? 0 : 1], reason: 'flag captured' };
    else if (cap[0]) world.result = { winner: null, reason: 'both flags captured' };
    else if (alive[0] !== alive[1]) world.result = { winner: players[alive[0] ? 0 : 1], reason: 'all enemy creeps destroyed' };
    else if (!alive[0]) world.result = { winner: null, reason: 'all creeps destroyed' };
  });
  return w;
}
