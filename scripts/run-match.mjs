#!/usr/bin/env node
// 用法：node scripts/run-match.mjs bots/rush.mjs bots/kite.mjs [--seed 1] [--out replay.json]
import fs from 'node:fs'; import vm from 'node:vm';
import { runMatch } from '../src/engine/match.js';
const args = process.argv.slice(2); const flag = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : d; };
const seed = +flag('--seed', 1), out = flag('--out', null);
const [a = 'bots/rush.mjs', b = 'bots/kite.mjs'] = args;
// Node 下用 vm 编译，单次 loop 超时 50ms（官方 cpuTimeLimit），首 tick 不限
const compile = code => { const fn = vm.runInNewContext(`(function(__require, console){${code}\n})`, {}, { timeout: 1000 }); return fn; };
const t0 = Date.now();
const r = runMatch({ seed, scripts: [fs.readFileSync(a, 'utf8'), fs.readFileSync(b, 'utf8')], compile });
console.log(`${a} vs ${b} seed=${seed}: ${JSON.stringify(r.meta.result)} after ${r.meta.ticks} ticks (${Date.now() - t0} ms)`);
if (out) { delete r.world; fs.writeFileSync(out, JSON.stringify(r)); console.log('replay ->', out); }
