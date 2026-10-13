// AI · 等级 1（自动生成自 bots/ai/src/core.mjs）
// AI 核心（6 个等级共用；生成脚本把 TIER 替换成 1..6）。只用官方 API。
import { getObjectsByPrototype, getTicks, getTerrainAt, getRange } from 'game/utils';
import { Creep, StructureSpawn, StructureContainer, StructureTower, StructureExtension, Flag, Resource, Source } from 'game/prototypes';
import { MOVE, CARRY, ATTACK, RANGED_ATTACK, HEAL, WORK, TOUGH, RESOURCE_ENERGY, ERR_NOT_IN_RANGE, BODYPART_COST, TERRAIN_SWAMP, TERRAIN_WALL } from 'game/constants';
import { CostMatrix } from 'game/path-finder';
import { arenaInfo } from 'game';
import { BodyPart, ScoreCollector } from 'arena';

const T = 1;
// 等级能力表：越高越聪明
const K = {
  maxBody: [0, 300, 450, 600, 750, 900, 1000][T],     // 单个兵最多花多少能量
  army: [0, 3, 5, 7, 10, 14, 18][T],                   // 军队规模上限
  haulers: [0, 1, 2, 3, 4, 5, 6][T],
  spawnGap: [0, 40, 20, 8, 3, 0, 0][T],                // 两次出兵之间“发呆”的回合
  towers: T >= 2, kite: T >= 3, healAI: T >= 3, focus: T >= 4, retreat: T >= 4, adapt: T >= 5, rotate: T >= 6, matrix: T >= 6, group: false,
  lag: [0, 0.6, 0.45, 0.32, 0.2, 0.1, 0][T],          // “走神”概率：低等级的兵有时这一回合什么都不做
  push: [0, 1, 3, 4, 6, 7, 8][T],                      // 凑够多少战斗兵才进攻
};
const S = { last: -999, role: {}, bad: [] };   // bad：我方兵中过“冰冻/伤害”效果的位置（学到的危险区）
const has = (c, t) => !!c.body && c.body.some(p => p.type === t && p.hits > 0);
const cnt = (c, t) => (c.body || []).filter(p => p.type === t && p.hits > 0).length;
const fighter = c => has(c, ATTACK) || has(c, RANGED_ATTACK);
let mine, foes, mySpawn, enemySpawn, enemyTowers, cm;

function learnZones() {
  for (const c of mine) for (const e of c.effects || []) if ((e.effectType === 'freeze' || e.effectType === 'damage') && !S.bad.some(b => b.x === c.x && b.y === c.y)) S.bad.push({ x: c.x, y: c.y });
}
function zoneMatrix() {
  const m = new CostMatrix();
  for (const b of S.bad) for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const x = b.x + dx, y = b.y + dy; if (x >= 0 && y >= 0 && x < 100 && y < 100 && getTerrainAt({ x, y }) !== TERRAIN_WALL) m.set(x, y, 60); }
  for (const o of [...getObjectsByPrototype(StructureSpawn), ...getObjectsByPrototype(StructureTower), ...getObjectsByPrototype(StructureExtension), ...getObjectsByPrototype(Creep)]) m.set(o.x, o.y, 255);
  return m;
}
let zm;
function matrix() {
  if (!K.matrix) return undefined;
  const m = zm ? zm.clone() : new CostMatrix();
  // 运输兵绕开敌方塔的射程和敌方战斗兵附近（沼泽本来就贵，这里再加价）
  const danger = [...enemyTowers.map(t => [t, 10]), ...foes.filter(fighter).map(e => [e, 4])];
  for (const [t, r] of danger) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const x = t.x + dx, y = t.y + dy; if (x < 0 || y < 0 || x > 99 || y > 99) continue;
    const tt = getTerrainAt({ x, y }); if (tt !== TERRAIN_WALL) m.set(x, y, Math.max(m.get(x, y), tt === TERRAIN_SWAMP ? 30 : 20));
  }
  for (const o of [...getObjectsByPrototype(StructureSpawn), ...getObjectsByPrototype(StructureTower), ...getObjectsByPrototype(StructureExtension), ...getObjectsByPrototype(Creep)]) m.set(o.x, o.y, 255);
  return m;
}
const lazy = c => { if (!K.lag) return false; let h = getTicks() * 2654435761; for (const ch of String(c.id)) h = Math.imul(h ^ ch.charCodeAt(0), 2246822519); return ((h >>> 0) % 1000) / 1000 < K.lag; };
const go = (c, t) => c.moveTo(t, cm && S.role[c.id] === 'hauler' ? { costMatrix: cm } : zm ? { costMatrix: zm } : undefined);

const bodyCap = () => arenaInfo.name.includes('Collect') ? Math.min(K.maxBody, 600) : K.maxBody; // 收集模式：兵要快，不追求大
function body(kind) {
  const budget = Math.min(kind === 'hauler' ? (T >= 3 ? 300 : 200) : bodyCap(), mySpawn ? (mySpawn.store[RESOURCE_ENERGY] || 0) : 0);
  const unit = { hauler: [CARRY, MOVE], worker: [WORK, CARRY, MOVE], melee: [ATTACK, MOVE], ranged: [RANGED_ATTACK, MOVE], healer: [HEAL, MOVE], tank: [TOUGH, ATTACK, MOVE, MOVE] }[kind];
  const uc = unit.reduce((a, p) => a + BODYPART_COST[p], 0); const n = Math.min(Math.floor(budget / uc), Math.floor(50 / unit.length));
  if (n < 1) return null; const b = [];
  if (T >= 4 && (kind === 'melee' || kind === 'ranged')) { const front = [], back = []; for (let i = 0; i < n; i++) unit.forEach(p => (p === MOVE ? back : front).push(p)); return [...front.filter(p => p !== ATTACK && p !== RANGED_ATTACK), ...front.filter(p => p === ATTACK || p === RANGED_ATTACK), ...back]; }
  for (let i = 0; i < n; i++) b.push(...unit); return b;
}
function wantKind(m) {
  const n = k => m.filter(c => S.role[c.id] === k).length;
  const econ = /Swamp|Lanes|Collect/.test(arenaInfo.name), hcap = arenaInfo.name.includes('Lanes') ? 1 : 99;
  const threat = foes.filter(fighter).length, armyN = m.filter(c => S.role[c.id] !== 'hauler').length;
  if (econ && n('hauler') < Math.min(K.haulers + (arenaInfo.name.includes('Collect') ? 1 : 0), hcap, 1 + Math.floor(armyN / (arenaInfo.name.includes('Collect') ? 1 : 2))) && !(T >= 4 && threat > armyN + 1 && n('hauler') >= 1)) return 'hauler';
  const army = m.filter(c => S.role[c.id] !== 'hauler');
  if (army.length >= K.army) return null;
  if (T <= 2 && arenaInfo.name.includes('Hill')) return 'melee';
  if (T <= 1) return 'melee';
  if (T <= 2) return army.length % 2 ? 'ranged' : 'melee';
  // 根据对手组成调整：对手近战多 → 多放远程风筝；对手远程多 → 近战坦克冲脸；总要有治疗
  let eM = 0, eR = 0; for (const e of foes) { eM += cnt(e, ATTACK); eR += cnt(e, RANGED_ATTACK); }
  const heal = n('healer'), dps = n('melee') + n('ranged') + n('tank');
  if (K.healAI && dps >= 3 && heal * 3 < dps) return 'healer';
  if (arenaInfo.name.includes('Hill')) return (K.healAI && heal * 2 < dps - 1) ? 'healer' : (T >= 5 ? 'tank' : 'melee');
  if (K.adapt) { if (eM > eR * 1.3) return 'ranged'; if (eR > eM * 1.3) return n('tank') <= n('ranged') ? 'tank' : 'ranged'; }
  return n('ranged') <= n('melee') ? 'ranged' : 'melee';
}
function spawnLogic() {
  if (!mySpawn || mySpawn.spawning) return;
  if (getTicks() - S.last < K.spawnGap) return;
  const k = wantKind(mine); if (!k) return; const b = body(k);
  if (!b || b.reduce((a, p) => a + BODYPART_COST[p], 0) > (mySpawn.store[RESOURCE_ENERGY] || 0)) return;
  // 中高等级：攒够一个完整的兵再出（家门口有敌人时立刻出兵）
  if (T >= 3 && k !== 'hauler') { const want = Math.min(bodyCap(), mySpawn.store.getCapacity(RESOURCE_ENERGY) || 1000) * (T >= 5 ? 0.9 : 0.6);
    const danger = foes.some(e => fighter(e) && getRange(e, mySpawn) < 15);
    if ((mySpawn.store[RESOURCE_ENERGY] || 0) < want && !danger) return; }
  const r = mySpawn.spawnCreep(b); if (r.object) { S.role[r.object.id] = k; S.last = getTicks(); }
}
function scoreHaul(h) {
  const held = Object.keys(h.store).find(k => k.startsWith('score') && h.store[k] > 0);
  const cols = getObjectsByPrototype(ScoreCollector);
  if (held) { const col = cols.find(x => x.resourceType === held) || cols[0]; if (col && h.transfer(col, held) === ERR_NOT_IN_RANGE) go(h, col); return true; }
  let rs = getObjectsByPrototype(Resource).filter(r => (r.resourceType || '').startsWith('score'));
  if (K.retreat) rs = rs.filter(r => !foes.some(e => fighter(e) && getRange(e, r) < 4));
  const r = T >= 3 ? h.findClosestByPath(rs) : h.findClosestByRange(rs);
  if (r) { if (h.pickup(r) === ERR_NOT_IN_RANGE) go(h, r); return true; }
  return false;
}
function haul(h) {
  if (arenaInfo.name.includes('Collect') && S.role[h.id + 's'] && scoreHaul(h)) return;
  if ((h.store[RESOURCE_ENERGY] || 0) > 0 && (h.store.getFreeCapacity(RESOURCE_ENERGY) === 0 || T < 3 || !h.findClosestByRange(boxes()))) {
    if (mySpawn && h.transfer(mySpawn, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) go(h, mySpawn); return;
  }
  const safe = boxes().filter(b => !K.retreat || !foes.some(e => fighter(e) && getRange(e, b) < 5));
  const box = T >= 3 ? h.findClosestByPath(safe) : h.findClosestByRange(safe);
  if (box) { if (h.withdraw(box, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) go(h, box); return; }
  if (arenaInfo.name.includes('Collect') && scoreHaul(h)) return;
  const r = h.findClosestByRange(getObjectsByPrototype(Resource).filter(r => r.resourceType === RESOURCE_ENERGY));
  if (r) { if (h.pickup(r) === ERR_NOT_IN_RANGE) go(h, r); return; }
  if (mySpawn && (h.store[RESOURCE_ENERGY] || 0) > 0 && h.transfer(mySpawn, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) go(h, mySpawn);
}
const boxes = () => getObjectsByPrototype(StructureContainer).filter(b => (b.store[RESOURCE_ENERGY] || 0) > 0);
function pickTarget(c, list) {
  if (!list.length) return null;
  if (!K.focus) return c.findClosestByRange(list);
  // 集火：自己打得到的敌人里挑生命最低的（大家都挑最低的 → 自然集火）
  const reach = has(c, RANGED_ATTACK) || c instanceof StructureTower ? 3 : 1;
  const inR = list.filter(e => getRange(c, e) <= reach);
  if (inR.length) return inR.sort((a, b) => a.hits - b.hits)[0];
  return c.findClosestByRange(list);
}
function objective() {
  const n = arenaInfo.name;
  if (n.includes('Flag')) { const fl = getObjectsByPrototype(Flag); return fl.filter(f => !f.my).sort((a, b) => (a.my === false) - (b.my === false))[0] || enemySpawn; }
  if (n.includes('Hill')) return getObjectsByPrototype(Flag)[0];
  if (n.includes('Lanes')) { // 拆塔：先拆最靠近我方的敌塔（高等级选防守最弱的那一路）
    const ts = enemyTowers; if (!ts.length) return enemySpawn;
    return mySpawn ? ts.sort((a, b) => getRange(a, mySpawn) - getRange(b, mySpawn))[0] : ts[0]; }
  if (n.includes('Collect')) return getObjectsByPrototype(ScoreCollector)[0];
  return enemySpawn;
}
function fight(c, army, obj, pushing, rally) {
  const enemies = foes;
  const tgt = pickTarget(c, enemies.filter(e => getRange(c, e) <= 12));
  const hurt = c.hits < c.hitsMax * 0.35;
  if (has(c, HEAL)) {
    const pool = army.filter(x => x.hits < x.hitsMax);
    const near = pool.filter(x => getRange(c, x) <= 1); const p = K.healAI && near.length ? near.sort((a, b) => a.hits / a.hitsMax - b.hits / b.hitsMax)[0] : c.findClosestByRange(pool);
    if (p) { if (getRange(c, p) <= 1) c.heal(p); else { c.rangedHeal(p); go(c, p); } if (!fighter(c)) return; }
    else if (c.hits < c.hitsMax) c.heal(c);
    if (!fighter(c)) { const buddy = c.findClosestByRange(army.filter(x => x !== c && fighter(x))); if (buddy && getRange(c, buddy) > 1) go(c, buddy); else if (!buddy && rally) go(c, rally); return; }
  }
  if (K.retreat && hurt) { const h = c.findClosestByRange(army.filter(h => has(h, HEAL) && h !== c)); if (h && getRange(c, h) > 2) { if (tgt && has(c, RANGED_ATTACK) && getRange(c, tgt) <= 3) c.rangedAttack(tgt); if (tgt && has(c, ATTACK) && getRange(c, tgt) <= 1) c.attack(tgt); go(c, h); return; } }
  if (tgt) {
    const d = getRange(c, tgt);
    if (has(c, RANGED_ATTACK)) {
      const close = enemies.filter(e => getRange(c, e) <= 3);
      if (K.kite && close.length >= 3) c.rangedMassAttack(); else if (d <= 3) c.rangedAttack(tgt);
      if (K.kite && !arenaInfo.name.includes('Hill') && !has(c, ATTACK) && enemies.some(e => has(e, ATTACK) && getRange(c, e) <= 2)) { const back = rally || mySpawn; if (back) go(c, back); return; }
      if (d > (K.kite ? 3 : 1)) go(c, tgt);
    } else { if (d <= 1) c.attack(tgt); else go(c, tgt); }
    return;
  }
  // 没有敌人在附近：打建筑 / 推目标
  const st = obj && obj.hits !== undefined && obj.my === false ? obj : null;
  if (st) { if (has(c, RANGED_ATTACK) && getRange(c, st) <= 3) c.rangedAttack(st); if (has(c, ATTACK) && getRange(c, st) <= 1) c.attack(st); }
  if (pushing && obj) { if (!st || getRange(c, st) > (has(c, RANGED_ATTACK) ? 3 : 1)) go(c, obj); }
  else if (rally && getRange(c, rally) > 2) go(c, rally);
}
function ctfTowers(myT) {
  for (const t of myT) {
    const e = pickTarget(t, foes.filter(e => getRange(t, e) <= (T >= 5 ? 12 : 20)));
    const hurt = mine.filter(c => c.hits < c.hitsMax * 0.6 && getRange(t, c) <= 10).sort((a, b) => a.hits - b.hits)[0];
    if (T >= 5 && hurt && (!e || hurt.hits < hurt.hitsMax * 0.3)) t.heal(hurt); else if (e) t.attack(e); else if (hurt) t.heal(hurt);
  }
}
export function loop() {
  const all = getObjectsByPrototype(Creep);
  mine = all.filter(c => c.my && !c.spawning); foes = all.filter(c => c.my === false && !c.spawning);
  const sp = getObjectsByPrototype(StructureSpawn); mySpawn = sp.find(s => s.my); enemySpawn = sp.find(s => s.my === false);
  const tw = getObjectsByPrototype(StructureTower); enemyTowers = tw.filter(t => t.my === false);
  if (T >= 3 && arenaInfo.name.includes('Collect')) { learnZones(); zm = S.bad.length ? zoneMatrix() : undefined; } else zm = undefined;
  cm = K.matrix ? matrix() : undefined;
  if (K.towers) ctfTowers(tw.filter(t => t.my));
  spawnLogic();
  for (const c of mine) if (!S.role[c.id]) S.role[c.id] = has(c, HEAL) && !fighter(c) ? 'healer' : fighter(c) ? 'melee' : (has(c, CARRY) && !has(c, WORK)) ? 'hauler' : 'worker';
  const army = mine.filter(c => S.role[c.id] !== 'hauler' && S.role[c.id] !== 'worker');
  let hi = 0; for (const c of mine) if (S.role[c.id] === 'hauler' && !lazy(c)) { if (arenaInfo.name.includes('Collect')) S.role[c.id + 's'] = (hi++ >= 1) || !mySpawn; haul(c); }
  for (const c of mine) if (S.role[c.id] === 'worker') { const s = c.findClosestByRange(getObjectsByPrototype(Source).filter(s => s.energy > 0)); if (!s) { haul(c); continue; } if ((c.store.getFreeCapacity(RESOURCE_ENERGY) || 0) === 0) { if (c.transfer(mySpawn, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) go(c, mySpawn); } else if (c.harvest(s) === ERR_NOT_IN_RANGE) go(c, s); }
  const obj = objective();
  const fighters = army.filter(fighter).length;
  const ctfPush = arenaInfo.name.includes('Flag') && (T < 4 || fighters >= foes.filter(fighter).length);
  const pushing = ctfPush || (/Hill|Collect/.test(arenaInfo.name) && fighters >= Math.min(K.push, 2)) || fighters >= K.push || getTicks() > (arenaInfo.ticksLimit || 2000) * 0.6 || !mySpawn;
  let rally = null;
  if (mySpawn && obj) { if (!S.rally || getTicks() % 100 === 0) { const pth = mySpawn.findPathTo(obj); S.rally = pth[Math.min(pth.length - 1, 7)]; } rally = S.rally; }
  if (arenaInfo.name.includes('Hill') && obj) rally = { x: obj.x + (mySpawn && mySpawn.x < 50 ? -1 : 1), y: obj.y };
  else if (K.group && mySpawn && obj) { // 集结点：基地到目标之间 1/3 处；成团后再推进
    const xs = army.map(c => c.x), ys = army.map(c => c.y);
    rally = pushing && army.length ? { x: Math.round(xs.reduce((a, b) => a + b, 0) / xs.length), y: Math.round(ys.reduce((a, b) => a + b, 0) / ys.length) } : { x: Math.round(mySpawn.x + (obj.x - mySpawn.x) * 0.25), y: Math.round(mySpawn.y + (obj.y - mySpawn.y) * 0.25) };
  }
  // 抱团：成团推进时，跑太前的兵等一等
  for (const c of army) {
    if (lazy(c)) continue;
    if (K.group && pushing && rally && getRange(c, rally) > 6 && !foes.some(e => getRange(c, e) <= 4)) { go(c, rally); continue; }
    const part = arenaInfo.name.includes('Flag') && T >= 3 ? c.findClosestByRange(getObjectsByPrototype(BodyPart).filter(p => getRange(c, p) <= 6)) : null;
    if (part && !foes.some(e => getRange(c, e) <= 5)) { go(c, part); continue; }
    fight(c, army, obj, pushing, rally);
  }
}
