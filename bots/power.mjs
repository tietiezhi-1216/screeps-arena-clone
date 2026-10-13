// 示例 bot（Power Split）：每个 BonusFlag 派一名占领者，其余冲敌方 Spawn
import { getObjectsByPrototype } from 'game/utils';
import { Creep, StructureSpawn } from 'game/prototypes';
import { MOVE, ATTACK, ERR_NOT_IN_RANGE } from 'game/constants';
import { BonusFlag } from 'arena';
export function loop() {
  const spawn = getObjectsByPrototype(StructureSpawn).find(s => s.my), enemy = getObjectsByPrototype(StructureSpawn).find(s => !s.my);
  if (spawn) spawn.spawnCreep([ATTACK, ATTACK, MOVE, MOVE]);
  const flags = getObjectsByPrototype(BonusFlag), mine = getObjectsByPrototype(Creep).filter(c => c.my && !c.spawning);
  mine.forEach((c, i) => {
    if (i < flags.length) { if (!flags[i].my || c.x !== flags[i].x || c.y !== flags[i].y) c.moveTo(flags[i]); }
    else if (enemy && c.attack(enemy) === ERR_NOT_IN_RANGE) c.moveTo(enemy);
  });
}
