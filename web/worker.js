import { runMatch } from '../src/engine/match.js';
self.onmessage = e => {
  const { scripts, seed, mode } = e.data;
  try {
    let n = 0; const r = runMatch({ scripts, seed, mode, onFrame: f => { if (++n % 100 === 0) self.postMessage({ progress: f.tick }); } });
    delete r.world; self.postMessage({ replay: r });
  } catch (err) { self.postMessage({ error: String(err.stack || err) }); }
};
