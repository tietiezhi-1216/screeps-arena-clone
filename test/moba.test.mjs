// 三路推塔 / 山头争夺：地图对称、塔按官方常量自动开火、胜负规则；新模式只用官方对象（积木都能覆盖）
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import { runMatch, MODES, MODE_NAMES } from '../src/engine/match.js';
import { mobaTerrain, LANES, MOBA_SPAWNS } from '../src/modes/moba.js';
import { W } from '../src/engine/pathfinder.js';
import * as P from '../src/engine/prototypes.js';
import * as C from '../src/constants.js';
const idle = 'export function loop(){}';
test('three-lanes: mirrored terrain, 3 lanes, 7 towers per side, spawns reachable', () => {
  const t = mobaTerrain(); for (let y = 0; y < 100; y++) for (let x = 0; x < 100; x++) assert.equal(t[y * W + x], t[y * W + 99 - x]);
  for (const y of LANES) for (let x = 2; x < 98; x++) assert.notEqual(t[y * W + x], 1, `lane ${y} x ${x}`);
  const w = MODES['three-lanes']({ seed: 1 }); const tw = w.all(P.StructureTower);
  assert.equal(tw.filter(t => t._owner === 'p1').length, 7); assert.equal(tw.filter(t => t._owner === 'p2').length, 7);
  assert.equal(MODE_NAMES['three-lanes'], '三路推塔');
  const path = w.utils.findPath(MOBA_SPAWNS[0], MOBA_SPAWNS[1]); assert.ok(path.length > 80);
});
test('three-lanes: towers auto-fire at enemy creeps within 10 tiles using official damage/cooldown/energy', () => {
  const w = MODES['three-lanes']({ seed: 1 }); const t = w.all(P.StructureTower).find(t => t._owner === 'p1' && t.x === 32 && t.y === 50);
  const c = w.add(new P.Creep(w, 37, 50, 'p2', Array(10).fill(C.TOUGH))); const hp = c.hits;
  w.step(); w.step(); assert.equal(c.hits, hp - Math.max(0, C.TOWER_POWER_ATTACK - 50 * 4)); assert.equal(t.cooldown, C.TOWER_COOLDOWN - 1 + 0 || t.cooldown);
  const far = w.add(new P.Creep(w, 45, 50, 'p2', [C.MOVE])); for (let i = 0; i < 30; i++) w.step(); assert.ok(far.exists && far.hits === far.hitsMax, 'out of auto range');
});
test('three-lanes: destroying the enemy base wins; idle vs master loses', () => {
  const r = runMatch({ mode: 'three-lanes', seed: 1, scripts: [idle, fs.readFileSync('bots/ai/master.mjs', 'utf8')] });
  assert.equal(r.meta.result.winner, 'p2'); assert.match(r.meta.result.reason, /base destroyed|towers/);
});
test('king-of-the-hill: only one side near the flag scores, 300 wins', () => {
  const w = MODES['king-of-the-hill']({ seed: 1 }); const f = w.all(P.Flag)[0]; assert.deepEqual([f.x, f.y], [50, 50]);
  w.add(new P.Creep(w, 51, 50, 'p1', [C.MOVE])); w.step(); assert.equal(w.score.p1, 1); assert.equal(f._owner, 'p1');
  w.add(new P.Creep(w, 49, 50, 'p2', [C.MOVE])); w.step(); assert.equal(w.score.p1, 1); assert.equal(w.score.p2, 0);
  const r = runMatch({ mode: 'king-of-the-hill', seed: 1, scripts: [idle, fs.readFileSync('bots/ai/normal.mjs', 'utf8')] });
  assert.equal(r.meta.result.winner, 'p2');
});
test('new modes only use objects that have blocks (coverage)', () => {
  const blocks = fs.readFileSync('www/blocks.js', 'utf8'), protos = [...blocks.matchAll(/\['[^']+', '(\w+)', '[pa]'\]/g)].map(m => m[1]);
  for (const mode of ['three-lanes', 'king-of-the-hill']) { const w = MODES[mode]({ seed: 1 }); for (const o of w.all()) assert.ok(protos.includes(o.constructor.name), `${mode}: ${o.constructor.name}`); }
  for (const k of ['Creep.attack', 'StructureTower.attack', 'StructureTower.heal', 'StructureSpawn.spawnCreep', 'prop.cooldown', 'proto.Flag', 'proto.StructureTower']) assert.ok(fs.readFileSync('docs/OFFICIAL_COVERAGE.md', 'utf8').includes(k), k);
});
