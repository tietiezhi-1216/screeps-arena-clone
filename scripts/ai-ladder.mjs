// AI 等级循环赛：node scripts/ai-ladder.mjs [每对每模式种子数] [最大回合]
// 每对 AI 在每个模式下用多个种子、双方互换出生位对战；到达回合上限仍未分胜负时按“局面评估”判定：
// 先看模式分数（收集器/山头/推塔数），再看双方兵与建筑的剩余生命总和。
import { runMatch } from '../src/engine/match.js'; import fs from 'node:fs';
export const TIERS = ['beginner', 'easy', 'normal', 'hard', 'expert', 'master'];
export const LADDER_MODES = ['spawn-and-swamp-advanced', 'capture-the-flag-advanced', 'collect-and-control-advanced', 'three-lanes', 'king-of-the-hill'];
export function judge(r) {
  if (r.meta.result?.winner) return r.meta.result.winner;
  const f = r.frames.at(-1), sc = p => (f.score ? f.score[p] || 0 : f.objs.filter(o => o.t === 'ScoreCollector').reduce((a, c) => a + (c.sc?.[p] || 0), 0) + f.objs.filter(o => o.t === 'Flag' && o.o === p).length);
  const hp = p => f.objs.filter(o => o.o === p && o.h != null).reduce((a, o) => a + o.h, 0);
  const a = [sc('p1'), sc('p2')]; if (a[0] !== a[1]) return a[0] > a[1] ? 'p1' : 'p2';
  const h = [hp('p1'), hp('p2')]; return h[0] === h[1] ? null : h[0] > h[1] ? 'p1' : 'p2';
}
export function play(a, b, mode, seed, maxTicks) {
  const src = n => fs.readFileSync(new URL(`../bots/ai/${n}.mjs`, import.meta.url), 'utf8');
  const r = runMatch({ mode, seed, maxTicks, scripts: [src(a), src(b)] });
  const w = judge(r); const errs = r.frames.flatMap(f => Object.values(f.log || {}).flat()).filter(l => /Error|CPU/.test(l));
  return { w: w === 'p1' ? a : w === 'p2' ? b : null, errs, ticks: r.meta.ticks };
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , pair, mode, seeds = '4', max = '1500'] = process.argv; const [a, b] = pair.split(':');
  let wa = 0, wb = 0, d = 0, errs = 0;
  for (let s = 1; s <= +seeds; s++) for (const sw of [0, 1]) { const r = sw ? play(b, a, mode, s, +max) : play(a, b, mode, s, +max); errs += r.errs.length; if (r.w === a) wa++; else if (r.w === b) wb++; else d++; }
  console.log(JSON.stringify({ a, b, mode, wa, wb, d, errs }));
}
