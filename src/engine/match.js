import { PlayerRuntime } from './sandbox.js';
import { createMatch as spawnAndSwamp, createAdvanced as spawnAndSwampAdvanced } from '../modes/spawnAndSwamp.js';
import { createMatch as captureTheFlag } from '../modes/captureTheFlag.js';
export const MODES = { 'spawn-and-swamp': spawnAndSwamp, 'spawn-and-swamp-advanced': spawnAndSwampAdvanced, 'capture-the-flag': captureTheFlag };
export const MODE_NAMES = { 'spawn-and-swamp': 'Spawn and Swamp（基础）', 'spawn-and-swamp-advanced': 'Spawn and Swamp（高级）', 'capture-the-flag': 'Capture the Flag（基础）' };
// 逐 tick 推进的对局（联机房主/实时观战用）
export function createLiveMatch({ mode = 'spawn-and-swamp', seed = 1, scripts, compile, hardRun, onCompiled } = {}) {
  const players = ['p1', 'p2'];
  const world = MODES[mode]({ seed, players });
  const rts = players.map((p, i) => new PlayerRuntime(world, p, scripts[i], { compile, hardRun }));
  onCompiled?.();
  const meta = () => ({ mode, seed, players, arena: world.arena, result: world.result, ticks: world.tick - 1 });
  return { world, meta, terrain: Array.from(world.terrain), first: world.snapshot(), get done() { return !!world.result; },
    setCode(i, src) { rts[i] = new PlayerRuntime(world, players[i], src, { compile, hardRun }); },
    step() { for (const rt of rts) rt.run(); world.step(); return world.snapshot(); } };
}
// 运行整局，返回回放：{ meta, terrain, frames[] }
export function runMatch({ onFrame, maxTicks, ...opts } = {}) {
  const m = createLiveMatch(opts); const frames = [m.first];
  while (!m.done && (!maxTicks || m.world.tick <= maxTicks)) { const f = m.step(); frames.push(f); onFrame?.(f); }
  return { meta: m.meta(), terrain: m.terrain, frames, world: m.world };
}
