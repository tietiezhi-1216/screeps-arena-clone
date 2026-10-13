// AI · 困难：积极扩张、多兵种协同、主动抢分/夺旗；三大官方模式通用
import { getObjectsByPrototype, getTicks } from 'game/utils';
import { Creep, StructureSpawn, StructureContainer, StructureTower, StructureExtension, Flag, Resource, Source } from 'game/prototypes';
import { MOVE, CARRY, ATTACK, RANGED_ATTACK, HEAL, WORK, TOUGH, RESOURCE_ENERGY, ERR_NOT_IN_RANGE } from 'game/constants';
import { arenaInfo } from 'game';
import { ScoreCollector, BodyPart } from 'arena';

const mine = () => getObjectsByPrototype(Creep).filter(c => c.my && !c.spawning);
const foes = () => getObjectsByPrototype(Creep).filter(c => !c.my && !c.spawning);
const has = (c, t) => c.body.some(p => p.type === t && p.hits > 0);

function swamp() {
  const spawn = getObjectsByPrototype(StructureSpawn).find(s => s.my);
  const enemy = getObjectsByPrototype(StructureSpawn).find(s => !s.my);
  const m = mine();
  const haulers = m.filter(c => has(c, CARRY) && !has(c, ATTACK));
  const workers = m.filter(c => has(c, WORK));
  const melee = m.filter(c => has(c, ATTACK));
  const ranged = m.filter(c => has(c, RANGED_ATTACK));
  const healers = m.filter(c => has(c, HEAL));
  if (spawn && !spawn.spawning) {
    if (haulers.length < 3) spawn.spawnCreep([CARRY, CARRY, CARRY, MOVE, MOVE, MOVE]);
    else if (workers.length < 1 && arenaInfo.level > 1) spawn.spawnCreep([WORK, WORK, CARRY, MOVE, MOVE]);
    else if (healers.length < 1) spawn.spawnCreep([HEAL, HEAL, MOVE, MOVE]);
    else if (melee.length < 3) spawn.spawnCreep([TOUGH, ATTACK, ATTACK, MOVE, MOVE, MOVE]);
    else spawn.spawnCreep([RANGED_ATTACK, RANGED_ATTACK, MOVE, MOVE]);
  }
  for (const h of haulers) {
    if ((h.store[RESOURCE_ENERGY] || 0) > 0) {
      const ext = h.findClosestByRange(getObjectsByPrototype(StructureExtension).filter(e => e.my && e.store.getFreeCapacity(RESOURCE_ENERGY) > 0));
      if (ext && h.transfer(ext, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) h.moveTo(ext);
      else if (h.transfer(spawn, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) h.moveTo(spawn);
    } else {
      const box = h.findClosestByPath(getObjectsByPrototype(StructureContainer).filter(b => (b.store[RESOURCE_ENERGY] || 0) > 50));
      const src = h.findClosestByPath(getObjectsByPrototype(Source).filter(s => s.energy > 0));
      if (box && h.withdraw(box, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) h.moveTo(box);
      else if (src && h.harvest(src) === ERR_NOT_IN_RANGE) h.moveTo(src);
    }
  }
  for (const w of workers) {
    const src = w.findClosestByPath(getObjectsByPrototype(Source).filter(s => s.energy > 0));
    if (src && w.harvest(src) === ERR_NOT_IN_RANGE) w.moveTo(src);
  }
  for (const h of healers) {
    const hurt = h.findClosestByRange(m.filter(c => c.hits < c.hitsMax && c !== h));
    if (hurt) { if (h.heal(hurt) === ERR_NOT_IN_RANGE) { h.rangedHeal(hurt); h.moveTo(hurt); } }
    else { const buddy = h.findClosestByRange(melee.concat(ranged)); if (buddy) h.moveTo(buddy); }
  }
  for (const f of melee.concat(ranged)) {
    const e = f.findClosestByRange(foes());
    const target = e || enemy; if (!target) continue;
    if (has(f, RANGED_ATTACK)) { if (f.rangedAttack(target) === ERR_NOT_IN_RANGE) f.moveTo(target); }
    else if (f.attack(target) === ERR_NOT_IN_RANGE) f.moveTo(target);
  }
}
function ctf() {
  const m = mine(), enemies = foes();
  const enemyFlag = getObjectsByPrototype(Flag).find(f => f.my === false), myFlag = getObjectsByPrototype(Flag).find(f => f.my);
  const parts = getObjectsByPrototype(BodyPart);
  for (const t of getObjectsByPrototype(StructureTower).filter(t => t.my)) {
    const hurt = t.findClosestByRange(m.filter(c => c.hits < c.hitsMax));
    const e = t.findClosestByRange(enemies);
    if (e && t.getRangeTo(e) <= 20) t.attack(e); else if (hurt) t.heal(hurt);
  }
  const push = getTicks() > 80 || m.filter(c => has(c, ATTACK) || has(c, RANGED_ATTACK)).length >= 6;
  for (const c of m) {
    const e = c.findClosestByRange(enemies);
    if (has(c, HEAL)) {
      const hurt = c.findClosestByRange(m.filter(x => x.hits < x.hitsMax && x !== c));
      if (hurt) { if (c.heal(hurt) === ERR_NOT_IN_RANGE) { c.rangedHeal(hurt); c.moveTo(hurt); } }
      else if (push && enemyFlag) c.moveTo(enemyFlag);
      continue;
    }
    if (has(c, RANGED_ATTACK) && e && c.getRangeTo(e) <= 3) c.rangedAttack(e);
    if (has(c, ATTACK) && e && c.getRangeTo(e) <= 1) c.attack(e);
    const part = c.findClosestByRange(parts);
    if (e && c.getRangeTo(e) <= 10) c.moveTo(e);
    else if (part && c.getRangeTo(part) <= 8) c.moveTo(part);
    else if (push && enemyFlag) c.moveTo(enemyFlag);
    else if (myFlag) c.moveTo({ x: myFlag.x + (myFlag.x < 50 ? 10 : -10), y: myFlag.y });
  }
}
function collect() {
  const spawn = getObjectsByPrototype(StructureSpawn).find(s => s.my);
  const m = mine(); const fighters = m.filter(c => has(c, ATTACK) || has(c, RANGED_ATTACK));
  if (spawn && !spawn.spawning) {
    if (m.length - fighters.length < 6) spawn.spawnCreep([CARRY, CARRY, CARRY, MOVE, MOVE, MOVE]);
    else if (fighters.length < 4) spawn.spawnCreep([ATTACK, ATTACK, MOVE, MOVE, MOVE]);
  }
  const cols = getObjectsByPrototype(ScoreCollector);
  for (const c of m) {
    if (has(c, ATTACK) || has(c, RANGED_ATTACK)) {
      const e = c.findClosestByRange(foes());
      if (e) { if (has(c, RANGED_ATTACK) && c.rangedAttack(e) === ERR_NOT_IN_RANGE) c.moveTo(e); else if (c.attack(e) === ERR_NOT_IN_RANGE) c.moveTo(e); }
      else { const threat = cols.find(x => x.my === false) || cols[0]; if (threat) c.moveTo(threat); }
      continue;
    }
    const held = Object.keys(c.store).find(k => k.startsWith('score') && c.store[k] > 0);
    if (held) { const col = cols.find(x => x.resourceType === held) || cols[0]; if (col && c.transfer(col, held) === ERR_NOT_IN_RANGE) c.moveTo(col); continue; }
    const r = c.findClosestByPath(getObjectsByPrototype(Resource).filter(r => (r.resourceType || '').startsWith('score')));
    if (r && c.pickup(r) === ERR_NOT_IN_RANGE) c.moveTo(r);
    else if (cols[0]) c.moveTo(cols[0]);
  }
}
export function loop() {
  const n = arenaInfo?.name || '';
  if (n.includes('Flag')) ctf(); else if (n.includes('Collect')) collect(); else swamp();
}
