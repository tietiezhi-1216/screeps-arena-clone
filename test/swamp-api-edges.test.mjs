import test from 'node:test'; import assert from 'node:assert/strict';
import * as C from '../src/constants.js';
import * as P from '../src/engine/prototypes.js';
import { World } from '../src/engine/world.js';
import { runMatch } from '../src/engine/match.js';
import { createMatch } from '../src/modes/spawnAndSwamp.js';

const mk = () => { const w = new World({ seed: 1 }); w.current = 'p1'; return w; };
const creep = (w, x, y, body, o = 'p1') => w.add(new P.Creep(w, x, y, o, body));

test('spawn regenerates 1 energy per tick up to capacity', () => {
  const w = mk(); const s = w.add(new P.StructureSpawn(w, 10, 10, 'p1')); s.store.energy = 10;
  w.current = null; w.step(); assert.equal(s.store.energy, 11);
  s.store.energy = C.SPAWN_ENERGY_CAPACITY; w.step(); assert.equal(s.store.energy, C.SPAWN_ENERGY_CAPACITY);
});
test('extensions anywhere fund spawnCreep (no distance filter)', () => {
  const w = mk(); const s = w.add(new P.StructureSpawn(w, 10, 10, 'p1')); s.store.energy = 0;
  const e = w.add(new P.StructureExtension(w, 80, 80, 'p1')); e.store.energy = 100;
  const r = s.spawnCreep([C.MOVE, C.MOVE]); assert.ok(r.object);
  assert.equal(e.store.energy, 100, 'deferred until step'); w.current = null; w.step();
  assert.equal(e.store.energy, 0); assert.ok(s.spawning);
});
test('spawnCreep drains spawn before extensions', () => {
  const w = mk(); const s = w.add(new P.StructureSpawn(w, 10, 10, 'p1')); s.store.energy = 80;
  const e = w.add(new P.StructureExtension(w, 12, 10, 'p1')); e.store.energy = 100;
  s.spawnCreep([C.MOVE, C.MOVE]); w.current = null; w.step();
  // 扣 100：spawn 80 + ext 20，再 +SPAWN_ENERGY_REGEN
  assert.equal(s.store.energy, C.SPAWN_ENERGY_REGEN); assert.equal(e.store.energy, 80);
});
test('rampart absorbs melee and rangedMassAttack', () => {
  const w = mk();
  const victim = creep(w, 20, 20, [C.TOUGH, C.TOUGH], 'p2');
  const ramp = w.add(new P.StructureRampart(w, 20, 20, 'p2'));
  const a = creep(w, 21, 20, [C.ATTACK]); a.attack(victim); w.step();
  assert.equal(victim.hits, 200); assert.equal(ramp.hits, C.RAMPART_HITS - C.ATTACK_POWER);
  w.current = 'p1'; const r = creep(w, 20, 22, [C.RANGED_ATTACK]); r.rangedMassAttack(); w.step();
  assert.equal(victim.hits, 200); assert.ok(ramp.hits < C.RAMPART_HITS - C.ATTACK_POWER);
});
test('heal range 1 / rangedHeal range 3; attack ConstructionSite', () => {
  const w = mk();
  const t = creep(w, 10, 10, [C.TOUGH], 'p1'); t.hits = 50; t.body[0].hits = 50;
  const h = creep(w, 12, 10, [C.HEAL]); assert.equal(h.heal(t), C.ERR_NOT_IN_RANGE); assert.equal(h.rangedHeal(t), C.OK); w.step();
  assert.equal(t.hits, 54);
  w.current = 'p1'; const { object: site } = w.utils.createConstructionSite({ x: 30, y: 30 }, P.StructureWall);
  const a = creep(w, 30, 31, [C.ATTACK]); assert.equal(a.attack(site), C.OK); w.step(); assert.equal(site.exists, false);
});
test('same-tick intent conflicts: attack clears heal', () => {
  const w = mk(); const a = creep(w, 10, 10, [C.ATTACK, C.HEAL]); const b = creep(w, 11, 10, [C.TOUGH], 'p2');
  assert.equal(a.heal(a), C.OK); assert.equal(a.attack(b), C.OK);
  const before = a.hits; w.step(); assert.equal(b.hits, 100 - C.ATTACK_POWER); assert.equal(a.hits, before);
});
test('harvest drops excess when carry full; container absorbs drops', () => {
  const w = mk(); const src = w.add(new P.Source(w, 5, 5, 100, 100));
  const c = creep(w, 5, 6, [C.WORK, C.CARRY]); c.store.energy = 50;
  const ct = w.add(new P.StructureContainer(w, 5, 6)); ct.store.energy = 0;
  assert.equal(c.harvest(src), C.OK); w.step();
  assert.equal(c.store.energy, 50); assert.equal(ct.store.energy, 2);
  assert.equal(src.energy, Math.min(src.energyCapacity, 100 - 2 + C.SOURCE_ENERGY_REGEN));
});
test('pull transfers fatigue to puller', () => {
  const w = mk(); w.terrain[10 * 100 + 11] = C.TERRAIN_SWAMP;
  const puller = creep(w, 10, 10, [C.MOVE, C.MOVE]);
  const heavy = creep(w, 9, 10, [C.WORK, C.WORK, C.WORK, C.WORK, C.MOVE]);
  puller.pull(heavy); puller.move(C.RIGHT); heavy.move(C.RIGHT);
  w.step(); assert.equal(puller.x, 11); assert.equal(heavy.x, 10);
  assert.ok(puller.fatigue > 0); assert.equal(heavy.fatigue, 0);
});
test('dead body parts do not add fatigue weight', () => {
  const w = mk(); w.terrain[10 * 100 + 11] = C.TERRAIN_SWAMP;
  const c = creep(w, 10, 10, [C.WORK, C.WORK, C.MOVE]); c.body[0].hits = 0; c.hits = 200;
  c.move(C.RIGHT); w.step(); assert.equal(c.fatigue, 8);
});
test('basic match: spawn regenerates energy each tick', () => {
  const r = runMatch({ mode: 'spawn-and-swamp', seed: 1, maxTicks: 1, scripts: ['export function loop(){}', 'export function loop(){}'] });
  const spawnE0 = r.frames[0].objs.find(o => o.t === 'StructureSpawn' && o.o === 'p1').e;
  const spawnE1 = r.frames[1].objs.find(o => o.t === 'StructureSpawn' && o.o === 'p1').e;
  assert.equal(spawnE1, spawnE0 + 1);
});
test('center containers despawn after lifetime', () => {
  const w = createMatch({ seed: 2, config: { centerContainerEvery: 1000, centerContainerLifetime: 3 } });
  w.current = null;
  const c1 = w.add(new P.StructureContainer(w, 40, 40, null, { decayIn: 3 })); c1.store.energy = 100;
  const c2 = w.add(new P.StructureContainer(w, 59, 40, null, { decayIn: 3 })); c2.store.energy = 100;
  const id1 = c1.id, id2 = c2.id;
  for (let i = 0; i < 4; i++) w.step();
  assert.equal(w.objects.get(id1), undefined);
  assert.equal(w.objects.get(id2), undefined);
});
test('road on swamp has 2500 hits', () => {
  const w = mk(); w.terrain[40 * 100 + 40] = C.TERRAIN_SWAMP;
  const road = w.add(new P.StructureRoad(w, 40, 40)); assert.equal(road.hitsMax, C.ROAD_HITS_SWAMP);
});
test('rangedAttack and rangedMassAttack conflict', () => {
  const w = mk(); const r = creep(w, 10, 10, [C.RANGED_ATTACK]); const t = creep(w, 12, 10, [C.TOUGH], 'p2');
  r.rangedAttack(t); r.rangedMassAttack(); w.step();
  assert.equal(t.hits, 100 - Math.round(C.RANGED_ATTACK_POWER * C.RANGED_ATTACK_DISTANCE_RATE[2]));
});
test('constants: SPAWN_ENERGY_REGEN and ROAD_HITS_SWAMP', () => {
  assert.equal(C.SPAWN_ENERGY_REGEN, 1);
  assert.equal(C.ROAD_HITS_SWAMP, 2500);
  assert.equal(C.SOURCE_ENERGY_CAPACITY, 1000);
  assert.equal(C.TOWER_FALLOFF_RANGE, 20);
});
