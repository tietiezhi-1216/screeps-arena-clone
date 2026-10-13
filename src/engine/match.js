import { PlayerRuntime } from './sandbox.js';
import { createMatch as spawnAndSwamp } from '../modes/spawnAndSwamp.js';
export const MODES = { 'spawn-and-swamp': spawnAndSwamp };
// 运行整局，返回回放：{ meta, terrain(base64-ish array), frames[] }
export function runMatch({ mode = 'spawn-and-swamp', seed = 1, scripts, compile, onFrame, maxTicks } = {}) {
  const players = ['p1', 'p2'];
  const world = MODES[mode]({ seed, players });
  const rts = players.map((p, i) => new PlayerRuntime(world, p, scripts[i], { compile }));
  const frames = [world.snapshot()];
  while (!world.result && (!maxTicks || world.tick <= maxTicks)) {
    for (const rt of rts) rt.run();
    world.step(); const f = world.snapshot(); frames.push(f); onFrame?.(f);
  }
  return { meta: { mode, seed, players, arena: world.arena, result: world.result, ticks: world.tick - 1 }, terrain: Array.from(world.terrain), frames, world };
}
