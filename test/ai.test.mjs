// v0.12 AI：6 个等级（入门/简单/普通/困难/专家/大师），全部模式无报错；相邻等级的天梯在 scripts/ai-ladder.mjs 里跑（这里跑缩小版）
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import { runMatch } from '../src/engine/match.js';
import { TIERS, LADDER_MODES, play } from '../scripts/ai-ladder.mjs';
test('6 AI tiers exist, generated from one core, only import official modules', () => {
  assert.deepEqual(TIERS, ['beginner', 'easy', 'normal', 'hard', 'expert', 'master']);
  for (const t of TIERS) { const s = fs.readFileSync(`bots/ai/${t}.mjs`, 'utf8'); for (const m of s.matchAll(/from '([^']+)'/g)) assert.match(m[1], /^(game(\/(utils|prototypes|constants|path-finder))?|arena)$/, `${t}: ${m[1]}`); }
});
test('every tier runs on every mode without errors or CPU timeouts', () => {
  for (const t of TIERS) for (const mode of LADDER_MODES) {
    const logs = []; runMatch({ mode, seed: 2, maxTicks: 120, scripts: [fs.readFileSync(`bots/ai/${t}.mjs`, 'utf8'), fs.readFileSync('bots/ai/normal.mjs', 'utf8')], onFrame: f => logs.push(...(f.log.p1 || [])) });
    assert.deepEqual(logs.filter(l => /error|CPU/i.test(l)), [], `${t}@${mode}`);
  }
});
test('ladder smoke: master beats beginner on every mode (both sides)', () => {
  for (const mode of LADDER_MODES) for (const sw of [0, 1]) { const r = sw ? play('beginner', 'master', mode, 1, 1500) : play('master', 'beginner', mode, 1, 1500); assert.equal(r.w, 'master', `${mode} side ${sw}`); }
});
