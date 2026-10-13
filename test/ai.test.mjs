import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import { runMatch } from '../src/engine/match.js';
const CORE = ['spawn-and-swamp', 'spawn-and-swamp-advanced', 'capture-the-flag', 'capture-the-flag-advanced', 'collect-and-control', 'collect-and-control-advanced'];
const DIFF = ['easy', 'normal', 'hard'];
test('AI easy/normal/hard run on all 6 official mode variants without errors', () => {
  const player = fs.readFileSync('bots/rush.mjs', 'utf8');
  for (const d of DIFF) {
    const ai = fs.readFileSync(`bots/ai/${d}.mjs`, 'utf8');
    for (const mode of CORE) {
      const r = runMatch({ mode, seed: 4, scripts: [player, ai], maxTicks: 40 });
      assert.ok(!/Error|not exported|Cannot find module/.test(JSON.stringify(r.frames.map(f => f.log))), `${d}@${mode}`);
    }
  }
});
test('AI hard is more aggressive than easy on spawn-and-swamp (more creeps by tick 200)', () => {
  const idle = 'export function loop(){}';
  const easy = runMatch({ mode: 'spawn-and-swamp', seed: 1, scripts: [idle, fs.readFileSync('bots/ai/easy.mjs', 'utf8')], maxTicks: 200 });
  const hard = runMatch({ mode: 'spawn-and-swamp', seed: 1, scripts: [idle, fs.readFileSync('bots/ai/hard.mjs', 'utf8')], maxTicks: 200 });
  const count = r => r.frames.at(-1).objs.filter(o => o.t === 'Creep' && o.o === 'p2' && !o.sp).length;
  assert.ok(count(hard) >= count(easy), `hard ${count(hard)} vs easy ${count(easy)}`);
});
