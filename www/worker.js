// 模拟 Worker：引擎 + 两名玩家脚本都在这里跑，主线程只负责渲染；主线程另有看门狗，Worker 卡死会被直接终止。
import { runMatch } from './src/engine/match.js';
import { lockdown } from './src/engine/sandbox.js';
const post = self.postMessage.bind(self);
// 玩家脚本用不到的网络/IO 能力直接移除（纵深防御；脚本本身也拿不到 self/globalThis）
for (const k of ['fetch', 'XMLHttpRequest', 'WebSocket', 'importScripts', 'indexedDB', 'caches', 'EventSource', 'BroadcastChannel', 'Worker']) { try { delete self[k]; self[k] = undefined; } catch (e) {} }
self.onmessage = e => {
  const { scripts, seed, mode } = e.data;
  try {
    let n = 0;
    const r = runMatch({ scripts, seed, mode, onCompiled: lockdown, onFrame: f => { if (++n % 50 === 0) post({ progress: f.tick }); } });
    delete r.world; post({ replay: r });
  } catch (err) { post({ error: String(err.stack || err) }); }
  self.onmessage = () => post({ error: 'worker is single-use' });
};
