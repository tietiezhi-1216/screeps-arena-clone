// 示例 bot（Collect and Control）：搬运工捡 score 资源交给对应 ScoreCollector，避开 freeze/damage 区域由寻路自理
import { getObjectsByPrototype } from 'game/utils';
import { Creep, StructureSpawn, Resource } from 'game/prototypes';
import { MOVE, CARRY, ERR_NOT_IN_RANGE } from 'game/constants';
import { ScoreCollector } from 'arena';
export function loop() {
  const spawn = getObjectsByPrototype(StructureSpawn).find(s => s.my);
  const mine = getObjectsByPrototype(Creep).filter(c => c.my && !c.spawning);
  if (spawn && mine.length < 6) spawn.spawnCreep([CARRY, CARRY, MOVE, MOVE]);
  const cols = getObjectsByPrototype(ScoreCollector);
  for (const c of mine) {
    const held = Object.keys(c.store).find(k => k.startsWith('score') && c.store[k] > 0);
    if (held) { const col = cols.find(x => x.resourceType === held); if (col && c.transfer(col, held) === ERR_NOT_IN_RANGE) c.moveTo(col); continue; }
    const r = c.findClosestByPath(getObjectsByPrototype(Resource).filter(r => r.resourceType.startsWith('score')));
    if (r && c.pickup(r) === ERR_NOT_IN_RANGE) c.moveTo(r);
  }
}
