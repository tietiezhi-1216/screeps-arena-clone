import test from 'node:test'; import assert from 'node:assert/strict';
import { runMatch, MODES } from '../src/engine/match.js';
import * as P from '../src/engine/prototypes.js';
import * as C from '../src/constants.js';
const idle = 'export function loop(){}';
test('constants: EFF modifiers present', () => { for (const k of ['EFF_ATTACK_MODIFIER','EFF_RANGED_ATTACK_MODIFIER','EFF_HEAL_MODIFIER','EFF_DAMAGE_TAKEN_MODIFIER','EFF_FATIGUE_MODIFIER','EFF_HITS_LOSS']) assert.equal(C[k], k.toLowerCase()); });
test('sandbox: STRUCTURE_PROTOTYPES, full HeapInfo, effects, arena C&C exports', () => {
  const src = `import { STRUCTURE_PROTOTYPES } from 'game/constants'; import { StructureSpawn } from 'game/prototypes';
  import { getHeapStatistics, getObjectsByPrototype } from 'game/utils'; import { ScoreCollector, RESOURCE_SCORE } from 'arena';
  export function loop(){ const h = getHeapStatistics(); const s = getObjectsByPrototype(StructureSpawn)[0];
    const c = getObjectsByPrototype(ScoreCollector)[0];
    console.log(JSON.stringify([STRUCTURE_PROTOTYPES.spawn === StructureSpawn, 'externally_allocated_size' in h, s.effects, RESOURCE_SCORE, c.resourceType, c.scoreTotal, c.my, c.score])); }`;
  const r = runMatch({ mode: 'collect-and-control', scripts: [src, idle], maxTicks: 1 });
  const line = JSON.stringify(r.frames[1].log).match(/\[true.*?\]/)[0].replace(/\\"/g, '"');
  assert.deepEqual(JSON.parse(line), [true, true, null, 'score', 'score', 1000, null, 0]);
});
test('collect-and-control: transfer score to collector scores, controls, wins', () => {
  const w = MODES['collect-and-control']({ seed: 3, config: { scoreTotal: 50 } });
  const col = w.collectors[0]; const c = w.add(new P.Creep(w, col.x + 1, col.y, 'p1', ['carry', 'move']));
  c.store.score = 50; w.current = 'p1';
  assert.equal(c.transfer(col, 'energy'), C.ERR_NOT_ENOUGH_RESOURCES);
  assert.equal(c.transfer(col, 'score'), C.OK); w.current = null; w.step();
  w.current = 'p1'; assert.equal(col.my, true); assert.equal(col.score, 50);
  assert.deepEqual(w.result, { winner: 'p1', reason: 'score collected' });
});
test('collect-and-control: score resources appear and can be dropped by type', () => {
  const r = runMatch({ mode: 'collect-and-control-advanced', scripts: [idle, idle], maxTicks: 60 });
  assert.ok(r.world.all(P.Resource).some(o => o.resourceType.startsWith('score_')));
  assert.equal(r.world.collectors.length, 3);
});
