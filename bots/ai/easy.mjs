// AI · 简单：慢节奏、少出兵、不主动进攻；三大官方模式通用
import { getObjectsByPrototype, getTicks } from 'game/utils';
import { Creep, StructureSpawn, StructureContainer, StructureTower, Flag, Resource } from 'game/prototypes';
import { MOVE, CARRY, ATTACK, RESOURCE_ENERGY, ERR_NOT_IN_RANGE } from 'game/constants';
import { arenaInfo } from 'game';
import { ScoreCollector } from 'arena';

const mine = () => getObjectsByPrototype(Creep).filter(c => c.my && !c.spawning);
const foes = () => getObjectsByPrototype(Creep).filter(c => !c.my && !c.spawning);
const has = (c, t) => c.body.some(p => p.type === t && p.hits > 0);

function swamp() {
  const spawn = getObjectsByPrototype(StructureSpawn).find(s => s.my);
  const enemy = getObjectsByPrototype(StructureSpawn).find(s => !s.my);
  const m = mine();
  if (spawn && !spawn.spawning && m.length < 3) spawn.spawnCreep(m.filter(c => has(c, CARRY)).length < 1 ? [CARRY, MOVE] : [ATTACK, MOVE]);
  for (const c of m) {
    if (has(c, CARRY)) {
      if ((c.store[RESOURCE_ENERGY] || 0) > 0) { if (c.transfer(spawn, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) c.moveTo(spawn); }
      else { const box = c.findClosestByRange(getObjectsByPrototype(StructureContainer).filter(b => (b.store[RESOURCE_ENERGY] || 0) > 0)); if (box && c.withdraw(box, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) c.moveTo(box); }
    } else if (enemy && getTicks() > 400) { if (c.attack(enemy) === ERR_NOT_IN_RANGE) c.moveTo(enemy); }
    else if (spawn) c.moveTo({ x: spawn.x + (spawn.x < 50 ? 3 : -3), y: spawn.y });
  }
}
function ctf() {
  const m = mine(), enemies = foes();
  for (const t of getObjectsByPrototype(StructureTower).filter(t => t.my)) { const e = t.findClosestByRange(enemies); if (e && t.getRangeTo(e) <= 15) t.attack(e); }
  const myFlag = getObjectsByPrototype(Flag).find(f => f.my);
  for (const c of m) {
    const e = c.findClosestByRange(enemies);
    if (e && c.getRangeTo(e) <= 1 && has(c, ATTACK)) c.attack(e);
    else if (myFlag) c.moveTo({ x: myFlag.x + (myFlag.x < 50 ? 4 : -4), y: myFlag.y });
  }
}
function collect() {
  const spawn = getObjectsByPrototype(StructureSpawn).find(s => s.my);
  const m = mine();
  if (spawn && !spawn.spawning && m.length < 2) spawn.spawnCreep([CARRY, MOVE]);
  const col = getObjectsByPrototype(ScoreCollector)[0];
  for (const c of m) {
    const held = Object.keys(c.store).find(k => k.startsWith('score') && c.store[k] > 0);
    if (held && col) { if (c.transfer(col, held) === ERR_NOT_IN_RANGE) c.moveTo(col); continue; }
    const r = c.findClosestByRange(getObjectsByPrototype(Resource).filter(r => (r.resourceType || '').startsWith('score')));
    if (r && c.pickup(r) === ERR_NOT_IN_RANGE) c.moveTo(r);
  }
}
export function loop() {
  const n = arenaInfo?.name || '';
  if (n.includes('Flag')) ctf(); else if (n.includes('Collect')) collect(); else swamp();
}
