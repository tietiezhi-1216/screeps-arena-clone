// 赛季模式：Construct and Control（S1/S2）、Portal Exploration（S1）、Power Split（S2/S3）、Pain and Gain（S4）、Escort Run（S3/S4）。
// API（原型 / 常量）严格按 screeps/arena-definitions 导出；官方未公开的地图与数值规则均为 APPROX，见 docs/SEASON_MODES.md。
import { W, H } from '../engine/pathfinder.js';
import * as C from '../constants.js';
import * as P from '../engine/prototypes.js';
import { createMatch as sas, SPAWNS } from './spawnAndSwamp.js';

const mirrorX = x => W - 1 - x;
const clear = (w, x, y, r = 0) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const xx = x + dx, yy = y + dy; if (xx > 1 && yy > 1 && xx < W - 2 && yy < H - 2) w.terrain[yy * W + xx] = 0; } };
const creepsAt = (w, x, y) => w.at(x, y).filter(o => o instanceof P.Creep && !o.spawning);
function base(seed, players, ticksLimit, name, season, level = 1, keepSpawnRule = true) {
  const w = sas({ seed, players, config: { ticksLimit, centerContainerEvery: 1e9 } });
  w.arena.name = name; w.arena.season = season; w.arena.level = level; w.arena.ticksLimit = w.ticksLimit = ticksLimit;
  const spawnRule = w.rules.pop(); if (keepSpawnRule) w.rules.push(spawnRule);
  return w;
}
// 占领：唯一一方 creep 站在旗上即归属该方（同 CTF 规则）
function contest(w, flag) { const os = [...new Set(creepsAt(w, flag.x, flag.y).map(c => c._owner))]; if (os.length === 1 && flag._owner !== os[0]) { flag._owner = os[0]; return true; } return false; }
const timeoutByScore = (w, players, score, why = 'timeout (higher score)') => {
  if (w.result || w.tick < w.ticksLimit) return; const [a, b] = players.map(p => score[p] || 0);
  w.result = a === b ? { winner: null, reason: 'timeout (score tie)' } : { winner: players[a > b ? 0 : 1], reason: why };
};

// ---------- Construct and Control ----------
export const EFFECT_SLOWDOWN = 'slowdown', EFFECT_CONSTRUCTION_BOOST = 'eff_construction_boost';
export const CNC = { ticksLimit: 2000, goalCost: 3000, boostEvery: 100, boostLife: 100, boostDuration: 200, boostMultiplier: 2, slowdownMultiplier: 2 };
function constructAndControl(season) {
  return ({ seed = 1, players = ['p1', 'p2'], config = {} } = {}) => {
    const cfg = { ...CNC, ...config }, w = base(seed, players, cfg.ticksLimit, 'Construct and Control', season);
    w.extraConstruction = { StructureGoal: cfg.goalCost };
    w.arenaModule = { AreaEffect: P.AreaEffect, ConstructionBoost: P.ConstructionBoost, StructureGoal: P.StructureGoal, EFFECT_SLOWDOWN, EFFECT_CONSTRUCTION_BOOST };
    // 中线一条减速带（APPROX）
    for (let y = 3; y < H - 3; y += 1) for (const x of [49, 50]) if (w.terrainAt(x, y) !== C.TERRAIN_WALL && y % 3) w.add(new P.AreaEffect(w, x, y, EFFECT_SLOWDOWN));
    w.rules.push(world => {
      for (const a of world.all(P.AreaEffect)) for (const c of creepsAt(world, a.x, a.y)) c._addEffect(EFFECT_SLOWDOWN, { multiplier: cfg.slowdownMultiplier }, world.tick + 1, 'area');
      for (const b of world.all(P.ConstructionBoost)) {
        const c = creepsAt(world, b.x, b.y)[0];
        if (c) { c._addEffect(C.EFF_CONSTRUCTION_BOOST, { multiplier: cfg.boostMultiplier }, world.tick + cfg.boostDuration, 'cboost'); world.remove(b); }
        else if (b.ticksToDecay <= 0) world.remove(b);
      }
      if (world.tick % cfg.boostEvery === 0) for (let i = 0; i < 30; i++) {
        const x = 20 + Math.floor(world.rng() * 25), y = 5 + Math.floor(world.rng() * (H - 10));
        if (world.walkable(x, y) && world.walkable(mirrorX(x), y) && !world.at(x, y).length) { for (const xx of [x, mirrorX(x)]) world.add(new P.ConstructionBoost(world, xx, y, cfg.boostLife)); break; }
      }
      const built = [...new Set(world.all(P.StructureGoal).map(g => g._owner))];
      if (built.length === 1) world.result = { winner: built[0], reason: 'goal structure built' };
      else if (built.length > 1) world.result = { winner: null, reason: 'both goals built' };
    });
    return w;
  };
}
export const constructAndControlS1 = constructAndControl('season_1'), constructAndControlS2 = constructAndControl('season_2');

// ---------- Portal Exploration ----------
export const PORTAL = { ticksLimit: 2000 };
export function portalExploration({ seed = 1, players = ['p1', 'p2'], config = {} } = {}) {
  const cfg = { ...PORTAL, ...config }, w = base(seed, players, cfg.ticksLimit, 'Portal Exploration', 'season_1');
  w.arenaModule = { Portal: P.Portal };
  // 中央竖墙（APPROX），只能经传送门穿越
  for (let y = 2; y < H - 2; y++) for (const x of [49, 50]) w.terrain[y * W + x] = C.TERRAIN_WALL;
  for (const [ax, ay, bx, by] of [[46, 20, 53, 80], [46, 80, 53, 20], [46, 50, 53, 50]]) {
    clear(w, ax, ay, 1); clear(w, bx, by, 1);
    w.add(new P.Portal(w, ax, ay, { x: bx + 1, y: by })); w.add(new P.Portal(w, bx, by, { x: ax - 1, y: ay }));
  }
  w.rules.unshift(world => { // 先于胜负判定：传送
    for (const p of world.all(P.Portal)) for (const c of creepsAt(world, p.x, p.y)) {
      const d = p.destination; if (world.walkable(d.x, d.y)) { world.events.push({ t: 'portal', f: [c.x, c.y], to: [d.x, d.y] }); c.x = d.x; c.y = d.y; }
    }
  });
  return w;
}

// ---------- Power Split ----------
export const POWER = { ticksLimit: 2000, bonusMultiplier: 1.5 };
const BONUS_EFF = { [C.ATTACK]: C.EFF_ATTACK_BOOST, [C.RANGED_ATTACK]: C.EFF_RANGED_ATTACK_BOOST, [C.HEAL]: C.EFF_HEAL_BOOST, [C.WORK]: C.EFF_WORK_BOOST, [C.MOVE]: C.EFF_MOVE_BOOST };
function powerSplit(season, level) {
  return ({ seed = 1, players = ['p1', 'p2'], config = {} } = {}) => {
    const cfg = { ...POWER, ticksLimit: level === 2 ? 5000 : 2000, ...config }, w = base(seed, players, cfg.ticksLimit, 'Power Split', season, level);
    w.arenaModule = { BonusFlag: P.BonusFlag };
    const types = level === 2 ? [C.ATTACK, C.RANGED_ATTACK, C.HEAL, C.WORK, C.MOVE] : [C.ATTACK, C.RANGED_ATTACK, C.HEAL];
    const flags = types.map((t, i) => { const y = Math.round((i + 1) * H / (types.length + 1)); clear(w, 50, y, 1); return w.add(new P.BonusFlag(w, 50, y, t)); });
    w.rules.unshift(world => {
      for (const f of flags) contest(world, f);
      for (const c of world.all(P.Creep)) for (const f of flags) {
        if (f._owner === c._owner) c._addEffect(BONUS_EFF[f.bonusType], { multiplier: cfg.bonusMultiplier }, world.tick + 1, 'bonus:' + f.id);
      }
    });
    return w;
  };
}
export const powerSplitS2 = powerSplit('season_2', 1), powerSplitS2Advanced = powerSplit('season_2', 2), powerSplitS3 = powerSplit('season_3', 1), powerSplitS3Advanced = powerSplit('season_3', 2);

// ---------- Pain and Gain ----------
export const TICKS_LIMIT = 2000, MAX_SCORE_PER_TICK = 25;
// FLAG_TYPES：typings 只给结构 Record<string,{scorePerTick,effectType}>，数值 APPROX
export const FLAG_TYPES = Object.freeze({
  bronze: Object.freeze({ scorePerTick: 5, effectType: C.EFF_HEAL_MODIFIER }),
  silver: Object.freeze({ scorePerTick: 10, effectType: C.EFF_RANGED_ATTACK_MODIFIER }),
  gold: Object.freeze({ scorePerTick: 15, effectType: C.EFF_ATTACK_MODIFIER }),
  platinum: Object.freeze({ scorePerTick: 20, effectType: C.EFF_DAMAGE_TAKEN_MODIFIER }),
});
const PAIN = { [C.EFF_HEAL_MODIFIER]: { multiplier: 0.75 }, [C.EFF_RANGED_ATTACK_MODIFIER]: { multiplier: 0.75 }, [C.EFF_ATTACK_MODIFIER]: { multiplier: 0.75 }, [C.EFF_DAMAGE_TAKEN_MODIFIER]: { multiplier: 1.25 } };
export function painAndGain({ seed = 1, players = ['p1', 'p2'], config = {} } = {}) {
  const w = base(seed, players, config.ticksLimit ?? TICKS_LIMIT, 'Pain and Gain', 'season_4', 1, false);
  w.arenaModule = { ScoreFlag: P.ScoreFlag, TICKS_LIMIT, MAX_SCORE_PER_TICK, FLAG_TYPES };
  const score = w.score = {}; const kinds = Object.values(FLAG_TYPES);
  const flags = [];
  kinds.forEach((k, i) => { const y = 15 + i * 23; for (const x of [35, mirrorX(35)]) { clear(w, x, y); flags.push(w.add(new P.ScoreFlag(w, x, y, k.effectType, k.scorePerTick))); } });
  w.rules.push(world => {
    for (const f of flags) contest(world, f);
    for (const p of players) {
      const mine = flags.filter(f => f._owner === p);
      score[p] = (score[p] || 0) + Math.min(MAX_SCORE_PER_TICK, mine.reduce((a, f) => a + f.scorePerTick, 0));
      for (const c of world.all(P.Creep)) if (c._owner === p) for (const f of mine) c._addEffect(f.effectType, PAIN[f.effectType], world.tick + 1, 'pain:' + f.id);
    }
    timeoutByScore(world, players, score);
  });
  return w;
}

// ---------- Escort Run ----------
export const ESCORT = { ticksLimit: 2000, body: [C.MOVE, C.MOVE, C.TOUGH, C.TOUGH, C.TOUGH, C.TOUGH] };
function escortRun(season) {
  return ({ seed = 1, players = ['p1', 'p2'], config = {} } = {}) => {
    const cfg = { ...ESCORT, ...config }, w = base(seed, players, cfg.ticksLimit, 'Escort Run', season, 1, false);
    w.arenaModule = { EscortCreep: P.EscortCreep };
    // 每方护送者从己方 spawn 旁出发，终点为敌方半场边缘的中立 Flag（APPROX）
    const escorts = players.map((p, i) => { const s = SPAWNS[i], x = s.x + (i ? -2 : 2); clear(w, x, s.y + 5); return w.add(new P.EscortCreep(w, x, s.y + 5, p, cfg.body)); });
    const goals = players.map((p, i) => { const x = i ? 12 : W - 13, y = 50; clear(w, x, y, 1); return w.add(new P.Flag(w, x, y, null)); });
    w.escortGoals = goals;
    w.rules.push(world => {
      const reached = players.filter((p, i) => escorts[i].exists && escorts[i].x === goals[i].x && escorts[i].y === goals[i].y);
      const alive = escorts.map(e => e.exists);
      if (reached.length === 1) world.result = { winner: reached[0], reason: 'escort reached goal' };
      else if (reached.length === 2) world.result = { winner: null, reason: 'both escorts reached goal' };
      else if (alive[0] !== alive[1]) world.result = { winner: players[alive[0] ? 0 : 1], reason: 'enemy escort destroyed' };
      else if (!alive[0]) world.result = { winner: null, reason: 'both escorts destroyed' };
      else if (world.tick >= world.ticksLimit) { const d = escorts.map((e, i) => P.range(e, goals[i])); world.result = d[0] === d[1] ? { winner: null, reason: 'timeout' } : { winner: players[d[0] < d[1] ? 0 : 1], reason: 'timeout (escort closer to goal)' }; }
    });
    return w;
  };
}
export const escortRunS3 = escortRun('season_3'), escortRunS4 = escortRun('season_4');
