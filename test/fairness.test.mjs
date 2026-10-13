import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import * as C from '../src/constants.js';
import * as P from '../src/engine/prototypes.js';
import { World } from '../src/engine/world.js';
import { runMatch } from '../src/engine/match.js';

test('same-tile move contention: winner is hash(seed,pos,id), not player registration order', () => {
  const run = (seed, orderP1First = true) => {
    const w = new World({ seed });
    const a = new P.Creep(w, 10, 10, 'p1', [C.MOVE]); a.id = 'idA';
    const b = new P.Creep(w, 12, 10, 'p2', [C.MOVE]); b.id = 'idB';
    w.objects.clear(); w.objects.set(a.id, a); w.objects.set(b.id, b);
    if (orderP1First) { w.current = 'p1'; a.move(C.RIGHT); w.current = 'p2'; b.move(C.LEFT); }
    else { w.current = 'p2'; b.move(C.LEFT); w.current = 'p1'; a.move(C.RIGHT); }
    w.step();
    return a.x === 11 ? 'p1' : b.x === 11 ? 'p2' : 'none';
  };
  const r1 = run(42, true), r2 = run(42, false);
  assert.notEqual(r1, 'none');
  assert.equal(r1, r2, 'registration order must not change winner');
  assert.equal(r1, run(42, true), 'deterministic');
  const winners = new Set();
  for (let seed = 1; seed <= 40; seed++) winners.add(run(seed, true));
  assert.ok(winners.has('p1') && winners.has('p2'), `expected both sides across seeds, got ${[...winners]}`);
});

test('mirror bots across many seeds: neither side systematically wins (CTF + swamp)', () => {
  const ctf = fs.readFileSync('bots/ctf.mjs', 'utf8');
  const rush = fs.readFileSync('bots/rush.mjs', 'utf8');
  const tally = (mode, script, seeds) => {
    let p1 = 0, p2 = 0, draw = 0;
    for (const seed of seeds) {
      const r = runMatch({ mode, seed, scripts: [script, script], cpuMode: 'budget' });
      if (r.meta.result?.winner === 'p1') p1++;
      else if (r.meta.result?.winner === 'p2') p2++;
      else draw++;
    }
    return { p1, p2, draw };
  };
  const seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const c = tally('capture-the-flag', ctf, seeds);
  assert.ok(c.p1 < seeds.length, `CTF p1 won all ${JSON.stringify(c)}`);
  assert.ok(c.p2 + c.draw > 0, `CTF p2 never won nor drew: ${JSON.stringify(c)}`);
  assert.ok(c.p1 <= 9 && c.p2 <= 9, `CTF bias too strong: ${JSON.stringify(c)}`);
  const s = tally('spawn-and-swamp', rush, seeds);
  assert.ok(s.p1 < seeds.length, `swamp p1 won all ${JSON.stringify(s)}`);
  assert.ok(s.p2 + s.draw > 0, `swamp p2 never won nor drew: ${JSON.stringify(s)}`);
  assert.ok(s.p1 <= 9 && s.p2 <= 9, `swamp bias too strong: ${JSON.stringify(s)}`);
});

test('budget CPU is deterministic across repeated runs', () => {
  const scripts = ['bots/rush.mjs', 'bots/kite.mjs'].map(f => fs.readFileSync(f, 'utf8'));
  const a = runMatch({ seed: 9, scripts, cpuMode: 'budget' });
  const b = runMatch({ seed: 9, scripts, cpuMode: 'budget' });
  assert.deepEqual(a.meta.result, b.meta.result);
  assert.equal(a.meta.ticks, b.meta.ticks);
  assert.equal(JSON.stringify(a.frames.at(-1).objs), JSON.stringify(b.frames.at(-1).objs));
});
