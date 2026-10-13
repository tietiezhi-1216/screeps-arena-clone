// 用真实对局画面生成模式封面（与游戏内渲染完全一致：100×100 格、官方配色）：node scripts/gen-covers.mjs [端口]
// 需要先 node scripts/serve.mjs <端口>。输出 www/cover-lanes.jpg、www/cover-hill.jpg（720×720）。
import puppeteer from 'puppeteer-core'; import fs from 'node:fs';
const port = +process.argv[2] || 8090;
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const p = await b.newPage(); await p.goto(`http://localhost:${port}/www/index.html`, { waitUntil: 'networkidle0' });
for (const [mode, out, tick, view] of [['three-lanes', 'cover-lanes.jpg', 4, [52, 40, 20]], ['king-of-the-hill', 'cover-hill.jpg', 4, [40, 40, 20]]]) {
  const data = await p.evaluate(async (mode, tick, view) => {
    const R = await import('./render.js'); const { MODES } = await import('./src/engine/match.js'); const P = await import('./src/engine/prototypes.js');
    // 摆一场真实的交战（引擎对象 + 官方规则结算几回合），再按游戏内渲染画出来
    const w = MODES[mode]({ seed: 3 }); const B = { a: ['tough', 'attack', 'attack', 'attack', 'move', 'move', 'move', 'move'], r: ['ranged_attack', 'ranged_attack', 'ranged_attack', 'move', 'move', 'move'], h: ['heal', 'heal', 'move', 'move'] };
    const cx = view[0] + view[2] / 2, cy = view[1] + view[2] / 2;
    const L = mode === 'three-lanes' ? [[-7, -1, 'a'], [-7, 1, 'a'], [-9, 0, 'r'], [-10, -1, 'r'], [-11, 1, 'h'], [-5, 0, 'a']] : [[-3, -1, 'a'], [-3, 1, 'a'], [-5, 0, 'r'], [-6, 2, 'h'], [-1, 0, 'a']];
    L.forEach(([dx, dy, k]) => { w.add(new P.Creep(w, cx + dx, cy + dy, 'p1', B[k])); w.add(new P.Creep(w, cx - dx + (mode === 'three-lanes' ? 8 : 0), cy - dy, 'p2', B[k])); });
    const prev = []; for (let i = 0; i < tick; i++) { for (const c of w.all(P.Creep)) { const foes = w.all(P.Creep).filter(e => e._owner !== c._owner); w.current = c._owner; const e = foes.sort((a, b) => P.range(c, a) - P.range(c, b))[0];
      if (e) { if (c.body.some(b => b.type === 'heal')) { const m = w.all(P.Creep).find(x => x._owner === c._owner && x.hits < x.hitsMax); if (m) c.rangedHeal(m); } else if (c.body.some(b => b.type === 'ranged_attack')) c.rangedAttack(e); else if (P.range(c, e) <= 1) c.attack(e); if (P.range(c, e) > (c.body.some(b => b.type === 'attack') ? 1 : 3)) c.moveTo(e); } }
      w.current = null; prev.push(w.snapshot()); w.step(); }
    const r = { terrain: Array.from(w.terrain), frames: [...prev, w.snapshot()] };
    R.setBadges({ p1: { badge: { type: 7, color1: 32, color2: 1, color3: 60, param: 0 } }, p2: { badge: { type: 12, color1: 21, color2: 1, color3: 60, param: 0 } } });
    await new Promise(res => setTimeout(res, 300));
    const c = document.createElement('canvas'); c.width = c.height = 720; const g = c.getContext('2d');
    const terr = R.terrainCanvas(r.terrain), [vx, vy, vn] = view, s = 720 / (vn * R.TS); // 取地图的一块（vn×vn 格）放大
    g.fillStyle = '#0A0A0A'; g.fillRect(0, 0, 720, 720); g.setTransform(s, 0, 0, s, -vx * R.TS * s, -vy * R.TS * s);
    R.drawFrame(g, terr, r.frames.at(-1), r.frames.at(-2), 1, null, 1);
    return c.toDataURL('image/jpeg', 0.9);
  }, mode, tick, view);
  fs.writeFileSync('www/' + out, Buffer.from(data.split(',')[1], 'base64')); console.log('wrote', out);
}
await b.close();
