// 示例 bot（Construct and Control）：采集容器能量，在家附近建 StructureGoal；顺路吃 ConstructionBoost
import { getObjectsByPrototype, createConstructionSite } from 'game/utils';
import { Creep, StructureSpawn, StructureContainer, ConstructionSite } from 'game/prototypes';
import { MOVE, CARRY, WORK, RESOURCE_ENERGY, ERR_NOT_IN_RANGE } from 'game/constants';
import { StructureGoal, ConstructionBoost } from 'arena';
export function loop() {
  const spawn = getObjectsByPrototype(StructureSpawn).find(s => s.my); if (!spawn) return;
  const mine = getObjectsByPrototype(Creep).filter(c => c.my && !c.spawning);
  if (mine.length < 5) spawn.spawnCreep([WORK, WORK, CARRY, CARRY, MOVE, MOVE]);
  let site = getObjectsByPrototype(ConstructionSite).find(s => s.my);
  if (!site) site = createConstructionSite({ x: spawn.x + (spawn.x < 50 ? 4 : -4), y: spawn.y }, StructureGoal).object;
  for (const c of mine) {
    const boost = getObjectsByPrototype(ConstructionBoost).find(b => c.getRangeTo(b) <= 3);
    if (boost && !c.effects) { c.moveTo(boost); continue; }
    if (c.store[RESOURCE_ENERGY] > 0 && site) { if (c.build(site) === ERR_NOT_IN_RANGE) c.moveTo(site); }
    else { const box = c.findClosestByPath(getObjectsByPrototype(StructureContainer).filter(b => b.store[RESOURCE_ENERGY] > 0)) || spawn;
      if (c.withdraw(box, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) c.moveTo(box); }
  }
}
