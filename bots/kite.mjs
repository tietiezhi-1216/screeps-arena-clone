// 示例 bot：远程 + 治疗混编，风筝打法，聚到 4 人再推进
import { getObjectsByPrototype } from 'game/utils';
import { Creep, StructureSpawn, StructureContainer } from 'game/prototypes';
import { MOVE, CARRY, RANGED_ATTACK, HEAL, RESOURCE_ENERGY, ERR_NOT_IN_RANGE } from 'game/constants';
import { searchPath } from 'game/path-finder';
import { Visual } from 'game/visual';

let wave = 0;
export function loop() {
  const spawn = getObjectsByPrototype(StructureSpawn).find(s => s.my);
  const enemySpawn = getObjectsByPrototype(StructureSpawn).find(s => !s.my);
  const mine = getObjectsByPrototype(Creep).filter(c => c.my && !c.spawning);
  const enemies = getObjectsByPrototype(Creep).filter(c => !c.my && !c.spawning);
  const haulers = mine.filter(c => c.body.some(p => p.type === CARRY));
  const army = mine.filter(c => !c.body.some(p => p.type === CARRY));
  if (spawn && !spawn.spawning) {
    if (haulers.length < 2) spawn.spawnCreep([CARRY, MOVE, CARRY, MOVE]);
    else spawn.spawnCreep(wave++ % 3 === 2 ? [HEAL, MOVE] : [RANGED_ATTACK, MOVE, MOVE]);
  }
  for (const h of haulers) {
    if (h.store[RESOURCE_ENERGY] > 0) { if (h.transfer(spawn, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) h.moveTo(spawn); }
    else { const c = h.findClosestByPath(getObjectsByPrototype(StructureContainer).filter(c => c.store[RESOURCE_ENERGY] > 0)); if (c && h.withdraw(c, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) h.moveTo(c); }
  }
  const go = army.length >= 4;
  for (const c of army) {
    if (c.body.some(p => p.type === HEAL)) {
      const hurt = c.findClosestByRange(mine.filter(m => m.hits < m.hitsMax));
      if (hurt) { if (c.heal(hurt) === ERR_NOT_IN_RANGE) { c.rangedHeal(hurt); c.moveTo(hurt); } continue; }
      const lead = c.findClosestByRange(army.filter(a => a !== c)); if (lead) c.moveTo(lead); continue;
    }
    const e = c.findClosestByRange(enemies);
    if (e && c.getRangeTo(e) <= 3) {
      c.rangedAttack(e);
      if (c.getRangeTo(e) < 3) { const r = searchPath(c, { pos: e, range: 4 }, { flee: true }); if (r.path.length) c.moveTo(r.path[0]); }
      new Visual().line(c, e, { color: '#ff5555' });
    } else if (go && enemySpawn) { if (c.rangedAttack(enemySpawn) === ERR_NOT_IN_RANGE) c.moveTo(enemySpawn); }
    else if (spawn) c.moveTo({ x: spawn.x + (spawn.x < 50 ? 4 : -4), y: spawn.y });
  }
}
