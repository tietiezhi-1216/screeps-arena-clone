// 示例 bot（Portal Exploration）：近战兵走最近的传送门穿越中墙，再冲敌方 Spawn
import { getObjectsByPrototype } from 'game/utils';
import { Creep, StructureSpawn } from 'game/prototypes';
import { MOVE, ATTACK, ERR_NOT_IN_RANGE } from 'game/constants';
import { Portal } from 'arena';
export function loop() {
  const spawn = getObjectsByPrototype(StructureSpawn).find(s => s.my), enemy = getObjectsByPrototype(StructureSpawn).find(s => !s.my);
  if (spawn) spawn.spawnCreep([ATTACK, ATTACK, MOVE, MOVE]);
  const home = spawn ? spawn.x < 50 : true;
  for (const c of getObjectsByPrototype(Creep).filter(c => c.my && !c.spawning)) {
    const crossed = home ? c.x > 50 : c.x < 49;
    if (!crossed) { const p = c.findClosestByPath(getObjectsByPrototype(Portal).filter(p => home ? p.x < 50 : p.x > 49)); if (p) c.moveTo(p); }
    else if (enemy && c.attack(enemy) === ERR_NOT_IN_RANGE) c.moveTo(enemy);
  }
}
