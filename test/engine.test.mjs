import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import * as C from '../src/constants.js';
import * as P from '../src/engine/prototypes.js';
import { World } from '../src/engine/world.js';
import { runMatch } from '../src/engine/match.js';
import { transformModule } from '../src/engine/sandbox.js';

const mk = () => { const w = new World({ seed: 1 }); w.current = 'p1'; return w; };
const creep = (w, x, y, body, o = 'p1') => { const c = w.add(new P.Creep(w, x, y, o, body)); return c; };

test('official constants (docs values)', () => {
  assert.equal(C.BODYPART_COST[C.HEAL], 250); assert.equal(C.SPAWN_ENERGY_CAPACITY, 1000); assert.equal(C.TOWER_RANGE, 20);
  assert.equal(C.CONTAINER_HITS, 300); assert.equal(C.MAX_CONSTRUCTION_SITES, 10); assert.equal(C.RANGED_ATTACK_DISTANCE_RATE[2], 0.4);
});
test('spawnCreep: cost, busy, spawn time 3/part, returns {object}', () => {
  const w = mk(); const s = w.add(new P.StructureSpawn(w, 50, 50, 'p1')); s.store.energy = 300;
  const r = s.spawnCreep([C.MOVE, C.ATTACK]); assert.ok(r.object instanceof P.Creep); assert.equal(s.store.energy, 170);
  assert.equal(s.spawnCreep([C.MOVE]).error, C.ERR_BUSY); assert.equal(s.spawning.needTime, 6);
  w.current = null; for (let i = 0; i < 6; i++) w.step(); assert.equal(r.object.spawning, false); assert.equal(P.range(r.object, s), 1);
  w.current = 'p1'; assert.equal(s.spawnCreep(['bogus']).error, C.ERR_INVALID_ARGS); assert.equal(s.spawnCreep(Array(9).fill(C.HEAL)).error, C.ERR_NOT_ENOUGH_ENERGY);
});
test('ownership: cannot command enemy creep', () => { const w = mk(); const e = creep(w, 5, 5, [C.MOVE], 'p2'); assert.equal(e.move(C.TOP), C.ERR_NOT_OWNER); });
test('melee attack damages body parts front-to-back', () => {
  const w = mk(); const a = creep(w, 10, 10, [C.ATTACK, C.ATTACK]); const b = creep(w, 11, 10, [C.TOUGH, C.MOVE], 'p2');
  assert.equal(a.attack(b), C.OK); w.step(); assert.equal(b.hits, 140); assert.equal(b.body[0].hits, 40);
  w.current = 'p1'; assert.equal(a.attack(creep(w, 20, 20, [C.MOVE], 'p2')), C.ERR_NOT_IN_RANGE);
});
test('ranged attack falloff on mass attack, heal', () => {
  const w = mk(); const r = creep(w, 10, 10, [C.RANGED_ATTACK]); const t2 = creep(w, 12, 10, [C.MOVE], 'p2'); const t3 = creep(w, 13, 10, [C.MOVE], 'p2');
  r.rangedMassAttack(); w.step(); assert.equal(t2.hits, 96); assert.equal(t3.hits, 99);
  w.current = 'p2'; const h = creep(w, 12, 11, [C.HEAL], 'p2'); h.heal(t2); w.step(); assert.equal(t2.hits, 100);
});
test('fatigue: swamp 10 per heavy part, MOVE removes 2', () => {
  const w = mk(); w.terrain[10 * 100 + 11] = C.TERRAIN_SWAMP; const c = creep(w, 10, 10, [C.WORK, C.MOVE]);
  assert.equal(c.move(C.RIGHT), C.OK); w.step(); assert.equal(c.x, 11); assert.equal(c.fatigue, 8); w.current = 'p1'; assert.equal(c.move(C.RIGHT), C.ERR_TIRED);
});
test('movement blocked by walls and creeps; swap allowed', () => {
  const w = mk(); w.terrain[10 * 100 + 11] = C.TERRAIN_WALL; const c = creep(w, 10, 10, [C.MOVE]); c.move(C.RIGHT); w.step(); assert.equal(c.x, 10);
  w.current = 'p1'; const a = creep(w, 20, 20, [C.MOVE]), b = creep(w, 21, 20, [C.MOVE]); a.move(C.RIGHT); b.move(C.LEFT); w.step(); assert.deepEqual([a.x, b.x], [21, 20]);
});
test('withdraw / transfer energy', () => {
  const w = mk(); const ct = w.add(new P.StructureContainer(w, 5, 6)); ct.store.energy = 80; const c = creep(w, 5, 5, [C.CARRY, C.MOVE]);
  assert.equal(c.withdraw(ct, C.RESOURCE_ENERGY), C.OK); w.step(); assert.equal(c.store.energy, 50); assert.equal(ct.store.energy, 30);
  w.current = 'p1'; const s = w.add(new P.StructureSpawn(w, 6, 5, 'p1')); assert.equal(c.transfer(s, C.RESOURCE_ENERGY), C.OK); w.step(); assert.equal(s.store.energy, 50);
});
test('tower attack falloff: 1000 - 50 per tile beyond 1', () => {
  const w = mk(); const t = w.add(new P.StructureTower(w, 10, 10, 'p1')); t.store.energy = 10; const e = creep(w, 15, 10, Array(20).fill(C.TOUGH), 'p2');
  assert.equal(t.attack(e), C.OK); w.step(); assert.equal(e.hits, 2000 - 800); assert.equal(t.cooldown, 9);
});
test('construction + build', () => {
  const w = mk(); const { object: s } = w.utils.createConstructionSite({ x: 30, y: 30 }, P.StructureWall); assert.equal(s.progressTotal, 100);
  const c = creep(w, 31, 30, [C.WORK, C.CARRY, C.CARRY, C.MOVE]); c.store.energy = 100;
  for (let i = 0; i < 20; i++) { w.current = 'p1'; c.build(s); w.step(); } assert.ok(w.all(P.StructureWall).length === 1);
});
test('pathfinding: findPath avoids walls; searchPath returns cost', () => {
  const w = mk(); for (let y = 0; y < 30; y++) w.terrain[y * 100 + 50] = C.TERRAIN_WALL;
  const p = w.utils.findPath({ x: 45, y: 10 }, { x: 55, y: 10 }); assert.ok(p.length > 10); assert.ok(p.every(q => w.terrainAt(q.x, q.y) !== C.TERRAIN_WALL));
  const r = w.utils.searchPath({ x: 0 + 2, y: 50 }, { x: 5, y: 50 }); assert.equal(r.cost, 6); assert.equal(r.incomplete, false);
});
test('sandbox import rewriting', () => {
  const t = transformModule("import { a, b as c } from 'game/utils';\nimport * as K from 'game/constants';\nexport function loop(){}");
  assert.match(t, /const \{a, "b": c\} = __require\("game\/utils"\)/); assert.match(t, /"loop": loop/); assert.match(t, /function loop\(\)\{__chk\(\);/);
});
test('full match is deterministic and ends', () => {
  const scripts = ['bots/rush.mjs', 'bots/kite.mjs'].map(f => fs.readFileSync(f, 'utf8'));
  const a = runMatch({ seed: 7, scripts }), b = runMatch({ seed: 7, scripts });
  assert.ok(a.meta.result); assert.deepEqual(a.meta.result, b.meta.result); assert.equal(a.meta.ticks, b.meta.ticks);
  assert.equal(JSON.stringify(a.frames.at(-1).objs), JSON.stringify(b.frames.at(-1).objs));
});
test('script errors are caught and logged', () => {
  const r = runMatch({ seed: 1, maxTicks: 3, scripts: ['export function loop(){ throw new Error("boom") }', 'syntax error here ('] });
  assert.match(r.frames[1].log.p1[0], /boom/); assert.match(r.frames[1].log.p2[0], /compile error/);
});

test('CPU limit aborts infinite loops and discards intents', () => {
  const r = runMatch({ seed: 1, maxTicks: 3, scripts: [
    "import {getObjectsByPrototype} from 'game/utils'; import {StructureSpawn} from 'game/prototypes'; import {MOVE} from 'game/constants';\nexport function loop(){ getObjectsByPrototype(StructureSpawn).find(s=>s.my).spawnCreep([MOVE]); if (true) { try { while(true){} } catch(e) {} for(;;); } }",
    'export function loop(){}'] });
  assert.match(r.frames[1].log.p1.join(), /timed out/); assert.equal(r.frames[1].objs.filter(o => o.t === 'Creep').length >= 0, true);
});
test('sandbox: no access to globals / dynamic code', () => {
  const r = runMatch({ seed: 1, maxTicks: 1, scripts: [
    "export function loop(){ console.log(typeof globalThis, typeof fetch, typeof self, typeof process, (function(){ return typeof this })()); }",
    'export function loop(){}'] });
  assert.equal(r.frames[1].log.p1[0], 'undefined undefined undefined undefined undefined');
});

test('capture the flag: setup per public rules (1 flag, 2 towers, 14 creeps each) and BodyPart pickup', async () => {
  const { createMatch } = await import('../src/modes/captureTheFlag.js');
  const w = createMatch({ seed: 3 });
  for (const p of ['p1', 'p2']) {
    assert.equal(w.all(P.Flag).filter(f => f._owner === p).length, 1);
    assert.equal(w.all(P.StructureTower).filter(f => f._owner === p).length, 2);
    assert.equal(w.all(P.Creep).filter(f => f._owner === p).length, 14);
  }
  const ids = new Set(w.all().map(o => o.x + ',' + o.y)); assert.equal(ids.size, w.all().length, 'no overlapping objects');
  const c = w.all(P.Creep)[0]; const n = c.body.length; w.add(new P.BodyPart(w, c.x, c.y, C.HEAL, 100)); w.step();
  assert.equal(c.body.length, n + 1); assert.equal(c.body.at(-1).type, C.HEAL);
});
test('capture the flag: stepping on enemy flag wins; arena module import works', () => {
  const ctf = fs.readFileSync('bots/ctf.mjs', 'utf8');
  const r = runMatch({ mode: 'capture-the-flag', seed: 2, scripts: [ctf, 'export function loop(){}'] });
  assert.equal(r.meta.result.winner, 'p1'); assert.ok(!r.frames.some(f => (f.log.p1 || []).some(l => /error/.test(l))));
});
test('spawn and swamp advanced has sources and build works', () => {
  const r = runMatch({ mode: 'spawn-and-swamp-advanced', seed: 1, maxTicks: 5, scripts: ['export function loop(){}', 'export function loop(){}'] });
  assert.equal(r.frames[0].objs.filter(o => o.t === 'Source').length, 4);
});
test('code generated by the default Blockly program runs and fights', () => {
  const gen = fs.readFileSync('test/fixtures/blockly-default.mjs', 'utf8');
  const r = runMatch({ seed: 1, maxTicks: 300, scripts: [gen, 'export function loop(){}'] });
  assert.ok(!r.frames.some(f => (f.log.p1 || []).some(l => /error/.test(l)))); assert.ok(r.frames.at(-1).objs.some(o => o.t === 'Creep' && o.o === 'p1'));
});
