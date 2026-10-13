#!/usr/bin/env node
// 用法：node scripts/run-match.mjs bots/rush.mjs bots/kite.mjs [--seed 1] [--out replay.json]
import fs from 'node:fs'; import vm from 'node:vm';
import { runMatch } from '../src/engine/match.js';
const args = process.argv.slice(2); const flag = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : d; };
const seed = +flag('--seed', 1), out = flag('--out', null);
const [a = 'bots/rush.mjs', b = 'bots/kite.mjs'] = args;
// Node 下：玩家脚本在独立 vm realm 中编译；每 tick 的 loop 在 vm 中带硬超时执行（除插桩检查点外的第二道保险）
import { SHADOWED, LOCKDOWN_SRC } from '../src/engine/sandbox.js';
const ctx = vm.createContext({});
const compile = code => vm.runInContext(`(function(__require, console, __chk, ${SHADOWED.join(', ')}){${code}\n})`, ctx, { timeout: 1000 });
const t0 = Date.now();
const r = runMatch({ onCompiled: () => vm.runInContext(LOCKDOWN_SRC, ctx), seed, scripts: [fs.readFileSync(a, 'utf8'), fs.readFileSync(b, 'utf8')], compile, cpuMode: 'budget' });
console.log(`${a} vs ${b} seed=${seed}: ${JSON.stringify(r.meta.result)} after ${r.meta.ticks} ticks (${Date.now() - t0} ms)`);
if (out) { delete r.world; fs.writeFileSync(out, JSON.stringify(r)); console.log('replay ->', out); }
