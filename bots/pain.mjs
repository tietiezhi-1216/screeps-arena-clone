// 示例 bot（Pain and Gain）：只占高分旗（每 tick 封顶 MAX_SCORE_PER_TICK），控制自身 debuff
import { getObjectsByPrototype } from 'game/utils';
import { Creep, StructureSpawn } from 'game/prototypes';
import { MOVE, ATTACK } from 'game/constants';
import { ScoreFlag, MAX_SCORE_PER_TICK } from 'arena';
export function loop() {
  const spawn = getObjectsByPrototype(StructureSpawn).find(s => s.my);
  const mine = getObjectsByPrototype(Creep).filter(c => c.my && !c.spawning);
  if (spawn && mine.length < 4) spawn.spawnCreep([ATTACK, MOVE, MOVE]);
  const flags = getObjectsByPrototype(ScoreFlag).sort((a, b) => b.scorePerTick - a.scorePerTick);
  let budget = MAX_SCORE_PER_TICK; const want = [];
  for (const f of flags) if (f.scorePerTick <= budget && !want.some(w => w.scorePerTick === f.scorePerTick)) { want.push(f); budget -= f.scorePerTick; }
  mine.forEach((c, i) => { const f = want[i % Math.max(1, want.length)]; if (f) c.moveTo(f); });
}
