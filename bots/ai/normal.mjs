// AI · 普通：均衡经济与战斗；三大官方模式通用
import { getObjectsByPrototype, getTicks } from 'game/utils';
import { Creep, StructureSpawn, StructureContainer, StructureTower, Flag, Resource, Source } from 'game/prototypes';
import { MOVE, CARRY, ATTACK, RANGED_ATTACK, HEAL, WORK, RESOURCE_ENERGY, ERR_NOT_IN_RANGE } from 'game/constants';
import { arenaInfo } from 'game';
import { ScoreCollector } from 'arena';

const mine = () => getObjectsByPrototype(Creep).filter(c => c.my && !c.spawning);
const foes = () => getObjectsByPrototype(Creep).filter(c => !c.my && !c.spawning);
const has = (c, t) => c.body.some(p => p.type === t && p.hits > 0);

function swamp() {
  const spawn = getObjectsByPrototype(StructureSpawn).find(s => s.my);
  const enemy = getObjectsByPrototype(StructureSpawn).find(s => !s.my);
  const m = mine(); const haulers = m.filter(c => has(c, CARRY)), fighters = m.filter(c => has(c, ATTACK) || has(c, RANGED_ATTACK));
  if (spawn && !spawn.spawning) {
    if (haulers.length < 2) spawn.spawnCreep([CARRY, CARRY, MOVE, MOVE]);
    else if (fighters.length < 4) spawn.spawnCreep([ATTACK, ATTACK, MOVE, MOVE]);
    else spawn.spawnCreep([RANGED_ATTACK, MOVE, MOVE]);
  }
  for (const h of haulers) {
    if ((h.store[RESOURCE_ENERGY] || 0) > 0) { if (h.transfer(spawn, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) h.moveTo(spawn); }
    else {
      const src = h.findClosestByPath(getObjectsByPrototype(Source).filter(s => s.energy > 0));
      const box = h.findClosestByPath(getObjectsByPrototype(StructureContainer).filter(b => (b.store[RESOURCE_ENERGY] || 0) > 0));
      const t = box || src;
      if (t) { if (box && h.withdraw(box, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) h.moveTo(box); else if (src && h.harvest(src) === ERR_NOT_IN_RANGE) h.moveTo(src); }
    }
  }
  for (const f of fighters) {
    const e = f.findClosestByRange(foes());
    const target = e && f.getRangeTo(e) < 8 ? e : enemy;
    if (!target) continue;
    if (has(f, RANGED_ATTACK) && f.rangedAttack(target) === ERR_NOT_IN_RANGE) f.moveTo(target);
    else if (f.attack(target) === ERR_NOT_IN_RANGE) f.moveTo(target);
  }
}
function ctf() {
  const m = mine(), enemies = foes();
  const enemyFlag = getObjectsByPrototype(Flag).find(f => f.my === false), myFlag = getObjectsByPrototype(Flag).find(f => f.my);
  for (const t of getObjectsByPrototype(StructureTower).filter(t => t.my)) { const e = t.findClosestByRange(enemies); if (e) t.attack(e); }
  const push = getTicks() > 120 || m.length >= enemies.length;
  for (const c of m) {
    const e = c.findClosestByRange(enemies);
    if (has(c, HEAL)) {
      const hurt = c.findClosestByRange(m.filter(x => x.hits < x.hitsMax && x !== c));
      if (hurt) { if (c.heal(hurt) === ERR_NOT_IN_RANGE) { c.rangedHeal(hurt); c.moveTo(hurt); } } else if (enemyFlag && push) c.moveTo(enemyFlag);
      continue;
    }
    if (has(c, RANGED_ATTACK) && e && c.getRangeTo(e) <= 3) c.rangedAttack(e);
    if (has(c, ATTACK) && e && c.getRangeTo(e) <= 1) c.attack(e);
    if (e && c.getRangeTo(e) <= 6) c.moveTo(e);
    else if (push && enemyFlag) c.moveTo(enemyFlag);
    else if (myFlag) c.moveTo({ x: myFlag.x + (myFlag.x < 50 ? 8 : -8), y: myFlag.y + (myFlag.y < 50 ? 6 : -6) });
  }
}
function collect() {
  const spawn = getObjectsByPrototype(StructureSpawn).find(s => s.my);
  const m = mine(); const fighters = m.filter(c => has(c, ATTACK));
  if (spawn && !spawn.spawning) {
    if (m.length - fighters.length < 4) spawn.spawnCreep([CARRY, CARRY, MOVE, MOVE]);
    else if (fighters.length < 2) spawn.spawnCreep([ATTACK, MOVE, MOVE]);
  }
  const cols = getObjectsByPrototype(ScoreCollector);
  for (const c of m) {
    if (has(c, ATTACK)) {
      const e = c.findClosestByRange(foes()); if (e && c.attack(e) === ERR_NOT_IN_RANGE) c.moveTo(e);
      else if (cols[0]) c.moveTo(cols[0]); continue;
    }
    const held = Object.keys(c.store).find(k => k.startsWith('score') && c.store[k] > 0);
    if (held) { const col = cols.find(x => x.resourceType === held) || cols[0]; if (col && c.transfer(col, held) === ERR_NOT_IN_RANGE) c.moveTo(col); continue; }
    const r = c.findClosestByPath(getObjectsByPrototype(Resource).filter(r => (r.resourceType || '').startsWith('score')));
    if (r && c.pickup(r) === ERR_NOT_IN_RANGE) c.moveTo(r);
  }
}
export function loop() {
  const n = arenaInfo?.name || '';
  if (n.includes('Flag')) ctf(); else if (n.includes('Collect')) collect(); else swamp();
}
