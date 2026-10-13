// 示例 bot：搬运工从容器拿能量回 Spawn，同时持续出近战兵直冲敌方 Spawn
import { getObjectsByPrototype, getTicks } from 'game/utils';
import { Creep, StructureSpawn, StructureContainer } from 'game/prototypes';
import { MOVE, CARRY, ATTACK, RESOURCE_ENERGY, ERR_NOT_IN_RANGE } from 'game/constants';

export function loop() {
  const spawn = getObjectsByPrototype(StructureSpawn).find(s => s.my);
  const enemySpawn = getObjectsByPrototype(StructureSpawn).find(s => !s.my);
  const mine = getObjectsByPrototype(Creep).filter(c => c.my && !c.spawning);
  const haulers = mine.filter(c => c.body.some(p => p.type === CARRY));
  const fighters = mine.filter(c => c.body.some(p => p.type === ATTACK));
  if (spawn && !spawn.spawning) {
    if (haulers.length < 2) spawn.spawnCreep([CARRY, MOVE, CARRY, MOVE]);
    else spawn.spawnCreep([ATTACK, ATTACK, MOVE, MOVE]);
  }
  for (const h of haulers) {
    if (h.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
      if (h.transfer(spawn, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) h.moveTo(spawn);
    } else {
      const c = h.findClosestByPath(getObjectsByPrototype(StructureContainer).filter(c => c.store[RESOURCE_ENERGY] > 0));
      if (c && h.withdraw(c, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) h.moveTo(c);
    }
  }
  for (const f of fighters) {
    const enemy = f.findClosestByRange(getObjectsByPrototype(Creep).filter(c => !c.my && !c.spawning));
    const target = enemy && f.getRangeTo(enemy) < 6 ? enemy : enemySpawn;
    if (target && f.attack(target) === ERR_NOT_IN_RANGE) f.moveTo(target);
  }
  if (getTicks() % 100 === 0) console.log('tick', getTicks(), 'creeps', mine.length);
}
