// Collect and Control（Season Alpha / Beta，基础 / 高级）
// 官方 typings（screeps/arena-definitions season_alpha|season_beta/collect_and_control）只公开：
//   ScoreCollector { my?, resourceType, score, scoreTotal } 及常量 RESOURCE_SCORE / RESOURCE_SCORE_X|Y|Z / EFFECT_FREEZE|HEAL|DAMAGE。
// 以下地图、刷新频率、scoreTotal、控制权规则均为 APPROX（官方未公开数值）：
//   - 中场随机（镜像）刷出 score 资源（Resource，resourceType=score*）；
//   - creep.transfer(collector, resourceType) 记分到该玩家，并获得该收集器控制权（my=true）；
//   - 任一玩家在任一收集器分数 ≥ scoreTotal 立即获胜；超时则总分高者胜；己方 spawn 被毁则判负。
import { W, H } from '../engine/pathfinder.js';
import * as P from '../engine/prototypes.js';
import * as C from '../constants.js';
import { createMatch as sas } from './spawnAndSwamp.js';

export const RESOURCE_SCORE = 'score', RESOURCE_SCORE_X = 'score_x', RESOURCE_SCORE_Y = 'score_y', RESOURCE_SCORE_Z = 'score_z';
export const EFFECT_FREEZE = 'freeze', EFFECT_HEAL = 'heal', EFFECT_DAMAGE = 'damage';
export const CONFIG = { ticksLimit: 2000, scoreTotal: 1000, scoreEvery: 20, scoreAmount: [20, 60], zoneRadius: 2, zoneHeal: 30, zoneDamage: 30 };

function build({ seed, players, config, level, types, collectors }) {
  const cfg = { ...CONFIG, ...config };
  const w = sas({ seed, players, config: { ticksLimit: cfg.ticksLimit, centerContainerEvery: 1e9 } });
  w.arena.name = 'Collect and Control'; w.arena.level = level; w.arena.season = 'alpha';
  w.extraResources = [...types];
  const cols = collectors.map(([x, y], i) => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) w.terrain[(y + dy) * W + x + dx] = 0;
    return w.add(new P.ScoreCollector(w, x, y, types[i], cfg.scoreTotal));
  });
  const consts = level === 1 ? { RESOURCE_SCORE } : { RESOURCE_SCORE_X, RESOURCE_SCORE_Y, RESOURCE_SCORE_Z };
  w.arenaModule = { ScoreCollector: P.ScoreCollector, ...consts, EFFECT_FREEZE, EFFECT_HEAL, EFFECT_DAMAGE };
  w.collectors = cols;
  // EFFECT_FREEZE / HEAL / DAMAGE 区域（APPROX：位置、半径、数值）；进入区域的 creep 获得同名 effect（持续到离开）
  const zones = [[EFFECT_FREEZE, 35, 30], [EFFECT_HEAL, 35, 70], [EFFECT_DAMAGE, 40, 50]].flatMap(([e, x, y]) => [[e, x, y], [e, W - 1 - x, y]])
    .map(([e, x, y]) => w.add(new P.EffectZone(w, x, y, e, cfg.zoneRadius)));
  w.rules.unshift(world => {
    for (const c of world.all(P.Creep)) {
      if (c.spawning) continue;
      for (const z of zones) {
        if (Math.max(Math.abs(c.x - z.x), Math.abs(c.y - z.y)) > z._r) continue;
        if (z.effect === EFFECT_FREEZE) { c._addEffect(EFFECT_FREEZE, {}, world.tick + 1, 'zone'); c.fatigue = Math.max(c.fatigue, 2); }
        else if (z.effect === EFFECT_HEAL) { c._addEffect(EFFECT_HEAL, { offset: cfg.zoneHeal }, world.tick + 1, 'zone'); world._healCreep(c, cfg.zoneHeal); }
        else { c._addEffect(EFFECT_DAMAGE, { offset: cfg.zoneDamage }, world.tick + 1, 'zone'); c._addEffect(C.EFF_HITS_LOSS, { offset: cfg.zoneDamage }, world.tick + 1, 'zone-loss'); }
      }
    }
  });
  const total = p => cols.reduce((a, c) => a + (c._scores[p] || 0), 0);
  const prev = w.rules.pop(); // S&S 规则：保留 spawn 判负
  w.rules.push(world => {
    if (world.tick % cfg.scoreEvery === 0) {
      for (let tries = 0; tries < 50; tries++) {
        const x = 25 + Math.floor(world.rng() * 24), y = 5 + Math.floor(world.rng() * (H - 10)), mx = W - 1 - x;
        if (!world.walkable(x, y) || !world.walkable(mx, y) || world.at(x, y).length || world.at(mx, y).length) continue;
        const [a, b] = cfg.scoreAmount, n = a + Math.floor(world.rng() * (b - a + 1)), t = types[Math.floor(world.rng() * types.length)];
        for (const xx of [x, mx]) world.add(new P.Resource(world, xx, y, n, t));
        break;
      }
    }
    prev(world); if (world.result) return;
    for (const c of cols) { const win = players.filter(p => (c._scores[p] || 0) >= c.scoreTotal); if (win.length === 1) { world.result = { winner: win[0], reason: 'score collected' }; return; } }
    if (world.tick >= world.ticksLimit) { const [a, b] = players.map(total); world.result = a === b ? { winner: null, reason: 'timeout (score tie)' } : { winner: players[a > b ? 0 : 1], reason: 'timeout (higher score)' }; }
  });
  return w;
}
export const createMatch = ({ seed = 1, players = ['p1', 'p2'], config = {} } = {}) =>
  build({ seed, players, config, level: 1, types: [RESOURCE_SCORE], collectors: [[50, 50]] });
export const createAdvanced = ({ seed = 1, players = ['p1', 'p2'], config = {} } = {}) =>
  build({ seed, players, config: { ticksLimit: 3000, ...config }, level: 2, types: [RESOURCE_SCORE_X, RESOURCE_SCORE_Y, RESOURCE_SCORE_Z], collectors: [[50, 20], [50, 50], [50, 80]] });
