import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs';
import { runMatch, MODES } from '../src/engine/match.js';
import * as P from '../src/engine/prototypes.js';
import * as C from '../src/constants.js';
const idle = 'export function loop(){}';
const mk = (mode, cfg) => MODES[mode]({ seed: 2, config: cfg });
const creep = (w, x, y, o, body) => w.add(new P.Creep(w, x, y, o, body));
const free = (w, x, y) => { for (const o of w.at(x, y)) w.remove(o); w.terrain[y * 100 + x] = 0; };

test('effects: shape {effectType,data,endTime}, expiry, EFF_* modifiers', () => {
  const w = mk('spawn-and-swamp'); free(w, 30, 30); free(w, 31, 30);
  const a = creep(w, 30, 30, 'p1', [C.ATTACK, C.MOVE]), t = creep(w, 31, 30, 'p2', [C.TOUGH, C.TOUGH, C.TOUGH, C.TOUGH, C.MOVE]);
  a._addEffect(C.EFF_ATTACK_MODIFIER, { multiplier: 2 }, w.tick + 5);
  t._addEffect(C.EFF_DAMAGE_TAKEN_MODIFIER, { multiplier: 0.5, offset: 5 });
  w.current = 'p1'; assert.deepEqual(a.effects, [{ effectType: C.EFF_ATTACK_MODIFIER, data: { multiplier: 2 }, endTime: w.tick + 5 }]);
  a.attack(t); w.current = null; w.step();
  assert.equal(t.hits, 500 - (60 * 0.5 + 5));
  for (let i = 0; i < 6; i++) w.step(); assert.equal(a.effects, undefined);
});
test('effects: EFF_HITS_LOSS, EFF_HEAL_MODIFIER, EFF_FATIGUE_MODIFIER', () => {
  const w = mk('spawn-and-swamp'); free(w, 30, 30); free(w, 31, 30); free(w, 30, 31);
  const c = creep(w, 30, 30, 'p1', [C.TOUGH, C.MOVE]); c._addEffect(C.EFF_HITS_LOSS, { offset: 7 }); w.step(); assert.equal(c.hits, 193);
  const h = creep(w, 31, 30, 'p1', [C.HEAL, C.MOVE]); h._addEffect(C.EFF_HEAL_MODIFIER, { multiplier: 0.5 }); c._effects = [];
  w.current = 'p1'; h.heal(c); w.current = null; w.step(); assert.equal(c.hits, 199);
  const m = creep(w, 30, 31, 'p1', [C.MOVE, C.TOUGH]); w.terrain[32 * 100 + 30] = 0; for (const o of w.at(30, 32)) w.remove(o);
  m._addEffect(C.EFF_FATIGUE_MODIFIER, { multiplier: 3 }); w.current = 'p1'; m.move(C.BOTTOM); w.current = null; w.step();
  assert.equal(m.y, 32); assert.equal(m.fatigue, 2 * 3 - 2);
});
test('collect-and-control: FREEZE/HEAL/DAMAGE zones apply effects', () => {
  const w = mk('collect-and-control'); const zs = w.all(P.EffectZone); assert.equal(zs.length, 6);
  const by = e => zs.find(z => z.effect === e);
  const f = creep(w, by('freeze').x, by('freeze').y, 'p1', [C.MOVE]), d = creep(w, by('damage').x, by('damage').y, 'p1', [C.TOUGH, C.MOVE]);
  w.step(); w.current = 'p1';
  assert.equal(f.effects[0].effectType, 'freeze'); assert.ok(f.fatigue > 0);
  w.step(); assert.equal(d.hits, 200 - 30);
});
test('construct-and-control: arena exports, slowdown area, boost pickup, StructureGoal wins', () => {
  for (const m of ['construct-and-control', 'construct-and-control-s2']) {
    const w = mk(m, { goalCost: 10 }); assert.deepEqual(Object.keys(w.arenaModule).sort(), ['AreaEffect', 'ConstructionBoost', 'EFFECT_CONSTRUCTION_BOOST', 'EFFECT_SLOWDOWN', 'StructureGoal']);
    assert.ok(w.all(P.AreaEffect).every(a => a.effect === 'slowdown'));
    free(w, 30, 30); free(w, 31, 30);
    const b = w.add(new P.ConstructionBoost(w, 30, 30, 50)); assert.equal(b.ticksToDecay, 50);
    const c = creep(w, 30, 30, 'p1', [C.WORK, C.CARRY, C.MOVE]); c.store.energy = 50;
    w.current = 'p1'; const { object: site } = w.utils.createConstructionSite({ x: 31, y: 30 }, P.StructureGoal); assert.equal(site.progressTotal, 10);
    w.current = null; w.step(); assert.ok(!b.exists); w.current = 'p1'; assert.equal(c.effects[0].effectType, C.EFF_CONSTRUCTION_BOOST);
    c.build(site); w.current = null; w.step();
    assert.deepEqual(w.result, { winner: 'p1', reason: 'goal structure built' });
  }
});
test('portal-exploration: Portal.destination teleports creeps', () => {
  const w = mk('portal-exploration'); const p = w.all(P.Portal)[0];
  assert.ok(Object.isFrozen(p.destination)); const c = creep(w, p.x, p.y, 'p1', [C.MOVE]); w.step();
  assert.deepEqual([c.x, c.y], [p.destination.x, p.destination.y]);
});
test('power-split: BonusFlag capture boosts bonusType for owner', () => {
  const w = mk('power-split'); const f = w.all(P.BonusFlag).find(f => f.bonusType === C.ATTACK); assert.ok(f instanceof P.Flag);
  creep(w, f.x, f.y, 'p1', [C.MOVE]); const a = creep(w, 20, 20, 'p1', [C.ATTACK]); w.step();
  w.current = 'p1'; assert.equal(f.my, true); assert.equal(P.effVal(a, C.EFF_ATTACK_BOOST, 30), 45);
  assert.equal(mk('power-split-advanced').all(P.BonusFlag).length, 5);
});
test('pain-and-gain: ScoreFlag scores (capped) and applies debuff', () => {
  const w = mk('pain-and-gain'); assert.equal(w.arenaModule.TICKS_LIMIT, 2000); assert.equal(w.arenaModule.MAX_SCORE_PER_TICK, 25);
  const fs_ = w.all(P.ScoreFlag); for (const f of fs_.filter(f => f.x < 50)) creep(w, f.x, f.y, 'p1', [C.MOVE]);
  w.step(); assert.equal(w.score.p1, 25);
  const c = w.all(P.Creep).find(c => c._owner === 'p1'); w.current = 'p1';
  assert.ok(c.effects.some(e => e.effectType === C.EFF_DAMAGE_TAKEN_MODIFIER));
});
test('escort-run: EscortCreep is a Creep; reaching the goal wins', () => {
  const w = mk('escort-run'); const e = w.all(P.EscortCreep).find(c => c._owner === 'p1');
  assert.ok(e instanceof P.Creep); const g = w.escortGoals[0]; e.x = g.x; e.y = g.y; w.step();
  assert.deepEqual(w.result, { winner: 'p1', reason: 'escort reached goal' });
});
test('example bots run without errors in their modes', () => {
  for (const [m, b] of [['collect-and-control', 'collect'], ['construct-and-control', 'construct'], ['portal-exploration', 'portal'], ['power-split', 'power'], ['pain-and-gain', 'pain'], ['escort-run', 'escort']]) {
    const r = runMatch({ mode: m, seed: 1, scripts: [fs.readFileSync(`bots/${b}.mjs`, 'utf8'), idle], maxTicks: 150 });
    assert.ok(!/Error/.test(JSON.stringify(r.frames.map(f => f.log))), `${b} errors`);
  }
});
