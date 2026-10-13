// 模拟 Worker：引擎 + 两名玩家脚本都在这里跑，主线程只负责渲染；主线程另有看门狗，Worker 卡死会被直接终止。
// 整局模式：一次跑完返回回放；live 模式（联机房主）：按 dt 节奏逐 tick 推送帧。
import { runMatch, createLiveMatch } from './src/engine/match.js';
import { lockdown } from './src/engine/sandbox.js';
const post = self.postMessage.bind(self), timer = self.setTimeout.bind(self);
for (const k of ['fetch', 'XMLHttpRequest', 'WebSocket', 'importScripts', 'indexedDB', 'caches', 'EventSource', 'BroadcastChannel', 'Worker']) { try { delete self[k]; self[k] = undefined; } catch (e) {} }
self.onmessage = e => {
  const { scripts, seed, mode, live, dt = 200 } = e.data;
  self.onmessage = ev => { if (ev.data.dt) cur.dt = ev.data.dt; }; const cur = { dt };
  try {
    if (!live) {
      let n = 0;
      const r = runMatch({ scripts, seed, mode, onCompiled: lockdown, onFrame: f => { if (++n % 50 === 0) post({ progress: f.tick }); } });
      delete r.world; post({ replay: r }); return;
    }
    const m = createLiveMatch({ scripts, seed, mode, onCompiled: lockdown });
    post({ start: { meta: m.meta(), terrain: m.terrain, first: m.first } });
    const loop = () => { const t0 = Date.now(); const f = m.step(); post({ frame: f });
      if (m.done) post({ end: m.meta() }); else timer(loop, Math.max(0, cur.dt - (Date.now() - t0))); };
    timer(loop, cur.dt);
  } catch (err) { post({ error: String(err.stack || err) }); }
};
