// Capture the Flag —— 对照官方 API / Steam changelog / 实机 tick-1 快照对齐。
// 详见 docs/CAPTURE_THE_FLAG.md（已确认 vs 仍近似）。
import { W, H } from '../engine/pathfinder.js';
import { mulberry32 } from '../engine/rng.js';
import * as C from '../constants.js';
import * as P from '../engine/prototypes.js';
import { World } from '../engine/world.js';
import { liveCtfTerrain } from './ctfTerrain.js';

export const CTF_CREEP_COUNT = 14;
export const CTF_BASIC_TOWERS_PER_PLAYER = 2;
export const CTF_ADVANCED_TICKS_LIMIT = 10000;
export const CTF_BASIC_TICKS_LIMIT = 2000; // APPROX
export const CTF_MAP_SIZE = 100;
export const CTF_TOWER_CAPACITY = C.TOWER_CAPACITY;
export const CTF_ARENA_NAME = 'Capture the Flag';
export const CTF_SEASON = 'season_2';
export const CTF_IMPORT_BASIC = 'arena/season_2/capture_the_flag/basic';
export const CTF_IMPORT_ADVANCED = 'arena/season_2/capture_the_flag/advanced';

const M = C.MOVE, A = C.ATTACK, R = C.RANGED_ATTACK, HL = C.HEAL, T = C.TOUGH, Y = C.CARRY;
export const BODY_CARRIER = [Y, Y, Y, M, M, M, M, M, M];
export const BODY_HEALER = [HL, HL, HL, HL, HL, HL, M, M, M, M, M, M];
export const BODY_RANGED = [R, R, R, R, R, R, M, M, M, M, M, M];
export const BODY_MELEE = [T, T, T, A, A, A, M, M, M, M, M, M];
export const ROSTER = [
  BODY_CARRIER, BODY_CARRIER,
  BODY_HEALER, BODY_HEALER, BODY_HEALER, BODY_HEALER,
  BODY_RANGED, BODY_RANGED, BODY_RANGED, BODY_RANGED,
  BODY_MELEE, BODY_MELEE, BODY_MELEE, BODY_MELEE,
];

export const CONFIG = {
  ticksLimit: CTF_BASIC_TICKS_LIMIT,
  partEvery: 25,
  partDecay: 300,
  towerRecharge: 0,
  towerEnergy: 0,
  containerEnergy: 1000,
};

export const ADVANCED_LAYOUT = {
  flags: [[3, 3, 0], [16, 83, null], [84, 15, null], [96, 96, 1]],
  towers: [[2, 2, 0], [17, 82, null], [83, 16, null], [97, 97, 1]],
  containers: [[1, 1], [13, 86], [87, 12], [98, 98]],
  creeps: [
    [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [6, 8], [7, 8],
    [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 6], [8, 7],
  ],
};

export const BASIC_BASES = [{ x: 8, y: 8 }, { x: 91, y: 91 }];
export const BASES = BASIC_BASES;

function mirror(x, y) { return [W - 1 - x, H - 1 - y]; }

export function generateTerrain(seed) {
  const r = mulberry32(seed ^ 0x5eed), t = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (x + y > W - 1) continue;
    const v = r(); t[y * W + x] = v < 0.06 ? 1 : v < 0.3 ? 2 : 0;
  }
  for (let i = 10; i < W - 10; i++) for (let d = -2; d <= 2; d++) {
    const x = i, y = W - 1 - i + d;
    if (x >= 0 && y >= 0 && x < W && y < H && x + y <= W - 1) t[y * W + x] = 2;
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (x + y > W - 1) t[y * W + x] = t[(H - 1 - y) * W + (W - 1 - x)];
  for (let i = 0; i < W; i++) { t[i] = t[(H - 1) * W + i] = t[i * W] = t[i * W + W - 1] = 1; }
  for (const b of BASIC_BASES) for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) {
    const x = b.x + dx, y = b.y + dy;
    if (x > 0 && y > 0 && x < W - 1 && y < H - 1) t[y * W + x] = 0;
  }
  return t;
}

function linkControl(flag, obj) {
  Object.defineProperty(obj, '_controlledBy', { value: flag, writable: true, configurable: true });
}

function captureFlag(flag, owner, world) {
  if (flag._owner === owner) return;
  flag._owner = owner;
  for (const o of world.all()) {
    if (o._controlledBy === flag && Object.prototype.hasOwnProperty.call(o, '_owner')) o._owner = owner;
  }
  world.events.push({ t: 'flag', at: [flag.x, flag.y], owner });
}

function attachCtfRules(w, { flags, towers, cfg, players }) {
  const TYPES = [C.MOVE, C.ATTACK, C.RANGED_ATTACK, C.HEAL, C.TOUGH, C.CARRY];
  w.rules.push(world => {
    if (cfg.towerRecharge > 0) {
      for (const t of towers) if (t.exists) t.store.energy = Math.min(C.TOWER_CAPACITY, (t.store.energy || 0) + cfg.towerRecharge);
    }
    for (const bp of world.all(P.BodyPart)) {
      if (bp.ticksToDecay <= 0) { world.remove(bp); continue; }
      const c = world.at(bp.x, bp.y).find(o => o instanceof P.Creep && !o.spawning);
      if (c && c.body.length < C.MAX_CREEP_SIZE) {
        c.body.push({ type: bp.type, hits: C.BODYPART_HITS });
        c.hitsMax += C.BODYPART_HITS; c.hits += C.BODYPART_HITS;
        world.remove(bp); world.events.push({ t: 'part', at: [bp.x, bp.y] });
      }
    }
    if (world.tick % cfg.partEvery === 0) for (let tries = 0; tries < 40; tries++) {
      const x = 30 + Math.floor(world.rng() * 40), y = 30 + Math.floor(world.rng() * 40);
      const [mx, my] = mirror(x, y);
      if (!world.walkable(x, y) || !world.walkable(mx, my) || world.at(x, y).length || world.at(mx, my).length) continue;
      const type = TYPES[Math.floor(world.rng() * TYPES.length)];
      world.add(new P.BodyPart(world, x, y, type, cfg.partDecay));
      world.add(new P.BodyPart(world, mx, my, type, cfg.partDecay));
      break;
    }
    for (const flag of flags) {
      if (!flag.exists) continue;
      const squatters = world.at(flag.x, flag.y).filter(o => o instanceof P.Creep && !o.spawning);
      const owners = [...new Set(squatters.map(c => c._owner))];
      if (owners.length === 1) captureFlag(flag, owners[0], world);
    }
    const byOwner = players.map(p => flags.filter(f => f._owner === p).length);
    if (byOwner[0] === flags.length) world.result = { winner: players[0], reason: 'all flags captured' };
    else if (byOwner[1] === flags.length) world.result = { winner: players[1], reason: 'all flags captured' };
    else {
      const alive = players.map(p => world.all(P.Creep).some(c => c._owner === p));
      if (alive[0] !== alive[1]) world.result = { winner: players[alive[0] ? 0 : 1], reason: 'all enemy creeps destroyed' };
      else if (!alive[0]) world.result = { winner: null, reason: 'all creeps destroyed' };
    }
  });
}

export function createMatch({ seed = 1, players = ['p1', 'p2'], config = {} } = {}) {
  const cfg = { ...CONFIG, ...config };
  const w = new World({
    seed, terrain: generateTerrain(seed), players, ticksLimit: cfg.ticksLimit,
    arena: { name: CTF_ARENA_NAME, level: 1, season: CTF_SEASON },
  });
  w.arenaModule = { BodyPart: P.BodyPart };
  const flags = [], towers = [];
  players.forEach((p, i) => {
    const b = BASIC_BASES[i], s = i ? -1 : 1;
    const flag = w.add(new P.Flag(w, b.x, b.y, p));
    flags.push(flag);
    for (const [dx, dy] of [[4, 1], [1, 4]]) {
      const t = w.add(new P.StructureTower(w, b.x + s * dx, b.y + s * dy, p));
      t.store.energy = cfg.towerEnergy;
      linkControl(flag, t);
      towers.push(t);
    }
    const box = w.add(new P.StructureContainer(w, b.x + s * 2, b.y - s * 2, null)); // APPROX 家门口容器，避开 creep 落点
    box.store.energy = cfg.containerEnergy;
    linkControl(flag, box);
    ROSTER.forEach((body, k) => {
      const x = b.x + s * (2 + (k % 5));
      const y = b.y + s * (2 + Math.floor(k / 5) * 2 + (k % 5 > 2 ? 1 : 0)) + (k >= 10 ? s : 0);
      w.add(new P.Creep(w, x, y, p, body));
    });
  });
  attachCtfRules(w, { flags, towers, cfg, players });
  return w;
}

export function createAdvanced({ seed = 1, players = ['p1', 'p2'], config = {} } = {}) {
  const cfg = { ...CONFIG, ticksLimit: CTF_ADVANCED_TICKS_LIMIT, ...config };
  const w = new World({
    seed, terrain: liveCtfTerrain(), players, ticksLimit: cfg.ticksLimit,
    arena: { name: CTF_ARENA_NAME, level: 2, season: CTF_SEASON },
  });
  w.arenaModule = { BodyPart: P.BodyPart };
  const L = ADVANCED_LAYOUT;
  const flags = L.flags.map(([x, y, oi]) => w.add(new P.Flag(w, x, y, oi == null ? null : players[oi])));
  const towers = L.towers.map(([x, y, oi], i) => {
    const t = w.add(new P.StructureTower(w, x, y, oi == null ? null : players[oi]));
    t.store.energy = cfg.towerEnergy;
    linkControl(flags[i], t);
    return t;
  });
  L.containers.forEach(([x, y], i) => {
    const box = w.add(new P.StructureContainer(w, x, y, null));
    box.store.energy = cfg.containerEnergy;
    linkControl(flags[i], box);
  });
  players.forEach((p, pi) => {
    L.creeps.forEach(([x, y], k) => {
      const [cx, cy] = pi === 0 ? [x, y] : mirror(x, y);
      w.add(new P.Creep(w, cx, cy, p, ROSTER[k]));
    });
  });
  attachCtfRules(w, { flags, towers, cfg, players });
  return w;
}
