// 由积木自动生成
import { getObjectsByPrototype, getObjectById, getTicks, getRange, findInRange, findClosestByPath, findClosestByRange, getTerrainAt } from 'game/utils';
import { Creep, StructureSpawn, StructureTower, StructureContainer, StructureExtension, Source, Resource, Flag, ConstructionSite, StructureRampart, StructureWall } from 'game/prototypes';
import { MOVE, WORK, CARRY, ATTACK, RANGED_ATTACK, HEAL, TOUGH, RESOURCE_ENERGY, ERR_NOT_IN_RANGE } from 'game/constants';
import { searchPath } from 'game/path-finder';
import { BodyPart } from 'arena';

export function loop() {
  var enemySpawn, creep;
  if (getObjectsByPrototype(StructureSpawn).filter(o => o.my)[0] && !getObjectsByPrototype(StructureSpawn).filter(o => o.my)[0].spawning) getObjectsByPrototype(StructureSpawn).filter(o => o.my)[0].spawnCreep([MOVE, MOVE, ATTACK, ATTACK]);
  enemySpawn = getObjectsByPrototype(StructureSpawn).filter(o => o.my === false)[0];
  var creep_list = getObjectsByPrototype(Creep).filter(o => o.my);
  for (var creep_index in creep_list) {
    creep = creep_list[creep_index];
    if (enemySpawn && creep.attack(enemySpawn) === ERR_NOT_IN_RANGE) creep.moveTo(enemySpawn);
  }
}
