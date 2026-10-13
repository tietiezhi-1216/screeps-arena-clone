import { PlayerRuntime } from './sandbox.js';
import * as P from './prototypes.js';
import { sanitizePlan } from '../net/lan.js';
import { createMatch as spawnAndSwamp, createAdvanced as spawnAndSwampAdvanced } from '../modes/spawnAndSwamp.js';
import { createMatch as captureTheFlag, createAdvanced as captureTheFlagAdvanced } from '../modes/captureTheFlag.js';
import { createMatch as collectAndControl, createAdvanced as collectAndControlAdvanced } from '../modes/collectAndControl.js';
import * as S from '../modes/seasons.js';
import { createMoba, createHill } from '../modes/moba.js';
export const MODES = { 'construct-and-control': S.constructAndControlS1, 'construct-and-control-s2': S.constructAndControlS2, 'portal-exploration': S.portalExploration, 'power-split': S.powerSplitS2, 'power-split-advanced': S.powerSplitS2Advanced, 'power-split-s3': S.powerSplitS3, 'power-split-s3-advanced': S.powerSplitS3Advanced, 'pain-and-gain': S.painAndGain, 'escort-run': S.escortRunS3, 'escort-run-s4': S.escortRunS4, 'collect-and-control': collectAndControl, 'collect-and-control-advanced': collectAndControlAdvanced, 'spawn-and-swamp': spawnAndSwamp, 'spawn-and-swamp-advanced': spawnAndSwampAdvanced, 'capture-the-flag': captureTheFlag, 'capture-the-flag-advanced': captureTheFlagAdvanced, 'three-lanes': createMoba, 'king-of-the-hill': createHill };
export const MODE_NAMES = { 'construct-and-control': 'Construct and Control（S1）', 'construct-and-control-s2': 'Construct and Control（S2）', 'portal-exploration': 'Portal Exploration（S1）', 'power-split': 'Power Split（S2 基础）', 'power-split-advanced': 'Power Split（S2 高级）', 'power-split-s3': 'Power Split（S3 基础）', 'power-split-s3-advanced': 'Power Split（S3 高级）', 'pain-and-gain': 'Pain and Gain（S4）', 'escort-run': 'Escort Run（S3）', 'escort-run-s4': 'Escort Run（S4）', 'collect-and-control': 'Collect and Control（基础）', 'collect-and-control-advanced': 'Collect and Control（高级）', 'spawn-and-swamp': 'Spawn and Swamp（基础）', 'spawn-and-swamp-advanced': 'Spawn and Swamp（高级）', 'capture-the-flag': 'Capture the Flag（基础）', 'capture-the-flag-advanced': 'Capture the Flag（高级）', 'three-lanes': '三路推塔', 'king-of-the-hill': '山头争夺' };
// 逐 tick 推进的对局（联机房主/实时观战用）
export function createLiveMatch({ mode = 'spawn-and-swamp', seed = 1, scripts, plans, compile, hardRun, onCompiled, cpuMode = 'budget' } = {}) {
  const players = ['p1', 'p2'];
  const world = MODES[mode]({ seed, players });
  // 建造规划：开局按各自 Spawn 相对坐标（p2 水平镜像）放置 ConstructionSite（与玩家代码调用 createConstructionSite 等价）
  (plans || []).forEach((plan, i) => { const p = players[i], sp = world.all(P.StructureSpawn).find(s => s._owner === p); if (!sp) return;
    world.current = p; for (const o of sanitizePlan(plan)) { const proto = P.PROTOTYPES[o.type]; world.utils.createConstructionSite({ x: sp.x + (i ? -o.dx : o.dx), y: sp.y + o.dy }, proto); } world.current = null; });
  world.cpuMode = cpuMode;
  const rts = players.map((p, i) => new PlayerRuntime(world, p, scripts[i], { compile, hardRun, cpuMode }));
  onCompiled?.();
  const meta = () => ({ mode, seed, players, arena: world.arena, result: world.result, ticks: world.tick - 1 });
  return { world, meta, terrain: Array.from(world.terrain), first: world.snapshot(), get done() { return !!world.result; },
    setCode(i, src) { rts[i] = new PlayerRuntime(world, players[i], src, { compile, hardRun, cpuMode }); },
    step() { for (const rt of rts) rt.run(); world.step(); return world.snapshot(); } };
}
// 运行整局，返回回放：{ meta, terrain, frames[] }
export function runMatch({ onFrame, maxTicks, ...opts } = {}) {
  const m = createLiveMatch(opts); const frames = [m.first];
  while (!m.done && (!maxTicks || m.world.tick <= maxTicks)) { const f = m.step(); frames.push(f); onFrame?.(f); }
  return { meta: m.meta(), terrain: m.terrain, frames, world: m.world };
}
