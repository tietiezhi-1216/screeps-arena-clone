// 示例 bot（Escort Run）：护送者走向敌方半场的终点 Flag，近战兵贴身护卫
import { getObjectsByPrototype } from 'game/utils';
import { Creep, StructureSpawn, Flag } from 'game/prototypes';
import { MOVE, ATTACK, ERR_NOT_IN_RANGE } from 'game/constants';
import { EscortCreep } from 'arena';
export function loop() {
  const spawn = getObjectsByPrototype(StructureSpawn).find(s => s.my);
  if (spawn) spawn.spawnCreep([ATTACK, ATTACK, MOVE, MOVE]);
  const esc = getObjectsByPrototype(EscortCreep).find(c => c.my); if (!esc) return;
  const goal = getObjectsByPrototype(Flag).filter(f => f.constructor === Flag).sort((a, b) => b.getRangeTo(spawn || esc) - a.getRangeTo(spawn || esc))[0];
  if (goal) esc.moveTo(goal);
  for (const c of getObjectsByPrototype(Creep).filter(c => c.my && !c.spawning && c !== esc)) {
    const foe = c.findClosestByRange(getObjectsByPrototype(Creep).filter(e => !e.my));
    if (foe && c.getRangeTo(foe) < 5) { if (c.attack(foe) === ERR_NOT_IN_RANGE) c.moveTo(foe); } else c.moveTo(esc);
  }
}
