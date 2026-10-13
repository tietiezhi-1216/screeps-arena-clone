// Canvas 渲染：风格参考 Screeps Arena（深色地形、沼泽暗绿、圆形 creep 外圈按部件着色、所有者主色）
export const TS = 8, N = 100;
export const COLORS = { p1: '#5ec8ff', p2: '#ff6f6f', neutral: '#bbbbbb', energy: '#ffe56d' };
const PART = { m: '#a9b7c6', w: '#ffe56d', c: '#777777', a: '#f93842', r: '#5d80b2', h: '#65fd62', t: '#ffffff' };
// 地形：移植 screeps-blockly-mobile 的融合轮廓画法（官方配色：平原 #2b2b2b、墙 #111 相邻融合圆角、沼泽 #292b18 细描边）
const TT = 16; // 地形贴图分辨率（每格像素），绘制时缩放到 TS
export function terrainCanvas(terrain) {
  const NN = N * TT, c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(NN, NN) : Object.assign(document.createElement('canvas'), { width: NN, height: NN });
  const g = c.getContext('2d'), T = (x, y) => (x < 0 || y < 0 || x >= N || y >= N) ? 1 : terrain[y * N + x];
  g.fillStyle = '#2b2b2b'; g.fillRect(0, 0, NN, NN);
  const blob = (is, fill, rOut, rIn) => {
    g.fillStyle = fill; g.beginPath(); const h = TT / 2;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const X = x * TT, Y = y * TT;
      if (is(x, y)) {
        for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
          const qx = X + h + (sx < 0 ? -h : 0), qy = Y + h + (sy < 0 ? -h : 0);
          if (is(x + sx, y) || is(x, y + sy)) { g.rect(qx, qy, h, h); continue; }
          const cx_ = X + h, cy_ = Y + h, ox = X + h + sx * h, oy = Y + h + sy * h, r = rOut * TT;
          g.moveTo(cx_, cy_); g.lineTo(ox, cy_); g.lineTo(ox, oy - sy * r); g.arcTo(ox, oy, ox - sx * r, oy, r); g.lineTo(cx_, oy); g.closePath();
        }
      } else if (rIn) {
        for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
          if (!(is(x + sx, y) && is(x, y + sy) && is(x + sx, y + sy))) continue;
          const ox = X + h + sx * h, oy = Y + h + sy * h, r = rIn * TT;
          const a0 = sy > 0 ? Math.PI / 2 : -Math.PI / 2, a1 = sx > 0 ? 0 : Math.PI, d = ((a1 - a0) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
          g.moveTo(ox, oy); g.lineTo(ox - sx * r, oy); g.arc(ox - sx * r, oy - sy * r, r, a0, a1, d > Math.PI); g.closePath();
        }
      }
    }
    g.fill();
  };
  const isS = (x, y) => T(x, y) === 2;
  blob(isS, '#292b18', .35, 0);
  g.strokeStyle = '#3a3e1d'; g.lineWidth = 1.5; g.beginPath();
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (isS(x, y)) {
    const X = x * TT, Y = y * TT, m = 5;
    if (!isS(x, y - 1)) { g.moveTo(X + m, Y + .75); g.lineTo(X + TT - m, Y + .75); } if (!isS(x, y + 1)) { g.moveTo(X + m, Y + TT - .75); g.lineTo(X + TT - m, Y + TT - .75); }
    if (!isS(x - 1, y)) { g.moveTo(X + .75, Y + m); g.lineTo(X + .75, Y + TT - m); } if (!isS(x + 1, y)) { g.moveTo(X + TT - .75, Y + m); g.lineTo(X + TT - .75, Y + TT - m); }
  }
  g.stroke();
  blob((x, y) => T(x, y) === 1, '#111111', .45, .3);
  return c;
}
const cx = v => v * TS + TS / 2;
// 扁平精灵：以 (0,0) 为中心、单位为像素（1 格 = TS=8）。u = 放大系数，全图缩放时保持可读
const D = '#1a1f27', RIM = '#0d1015';
const circ = (g, r, fill) => { g.fillStyle = fill; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill(); };
const ring = (g, r, w, col, a0 = 0, a1 = 7) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.arc(0, 0, r, a0, a1); g.stroke(); };
const rrect = (g, x, y, w, h, r, fill) => { g.fillStyle = fill; g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); g.fill(); };
export function drawSprite(g, o, col) {
  switch (o.t) {
    case 'StructureRoad': circ(g, 1.6, '#4a5260'); break;
    case 'AreaEffect': g.globalAlpha = .35; rrect(g, -4, -4, 8, 8, 1.5, '#58f'); g.globalAlpha = 1; break;
    case 'Portal': ring(g, 4, 1.4, '#b58cff'); circ(g, 1.8, '#b58cff'); break;
    case 'ConstructionBoost': g.fillStyle = '#ffe56d'; g.beginPath(); g.moveTo(0, -4); g.lineTo(3.6, 3); g.lineTo(-3.6, 3); g.closePath(); g.fill(); break;
    case 'StructureGoal': rrect(g, -5, -5, 10, 10, 2, RIM); rrect(g, -3.8, -3.8, 7.6, 7.6, 1.4, col); break;
    case 'ScoreCollector': { circ(g, 6.5, RIM); ring(g, 5.2, 1.6, '#b58cff'); g.save(); g.rotate(Math.PI / 4); rrect(g, -2.4, -2.4, 4.8, 4.8, .8, '#e0c8ff'); g.restore(); break; }
    case 'Resource': { const r = Math.min(3.2, 1.4 + Math.sqrt(o.e) / 10); circ(g, r + .7, RIM); circ(g, r, o.rt ? '#c9a2ff' : '#ffe56d'); break; }
    case 'Source': { rrect(g, -4.2, -4.2, 8.4, 8.4, 1.6, '#3b3620'); const s = 6.4 * Math.sqrt(o.e / o.c); rrect(g, -s / 2, -s / 2, s, s, 1, '#ffe56d'); break; }
    case 'StructureContainer': { rrect(g, -3.6, -4.2, 7.2, 8.4, 1.4, RIM); rrect(g, -2.8, -3.4, 5.6, 6.8, .8, '#3b4250'); const h = 6.8 * o.e / o.c; if (h > 0) rrect(g, -2.8, 3.4 - h, 5.6, h, .8, '#ffe56d'); break; }
    case 'StructureExtension': circ(g, 3.4, RIM); ring(g, 2.7, 1.2, col); circ(g, 1.9 * Math.sqrt(o.e / (o.c || 1)), '#ffe56d'); break;
    case 'Flag': { circ(g, 2, RIM); circ(g, 1.2, col); g.fillStyle = '#d8dde6'; g.fillRect(-.5, -5.5, 1, 6); g.fillStyle = col; g.beginPath(); g.moveTo(.5, -5.5); g.lineTo(5, -4); g.lineTo(.5, -2.4); g.closePath(); g.fill(); break; }
    case 'BodyPart': { g.save(); g.rotate(Math.PI / 4); rrect(g, -2.6, -2.6, 5.2, 5.2, 1, RIM); rrect(g, -1.9, -1.9, 3.8, 3.8, .6, PART[o.bt === 'ranged_attack' ? 'r' : o.bt[0]] || '#fff'); g.restore(); break; }
    case 'StructureWall': rrect(g, -4, -4, 8, 8, 1.2, '#40464f'); break;
    case 'StructureRampart': g.globalAlpha = .55; g.strokeStyle = col; g.lineWidth = 1.4; g.beginPath(); g.roundRect ? g.roundRect(-4, -4, 8, 8, 2) : g.rect(-4, -4, 8, 8); g.stroke(); g.globalAlpha = 1; break;
    case 'ConstructionSite': g.setLineDash([1.6, 1.4]); ring(g, 3, 1, col); g.setLineDash([]); circ(g, .9, col); break;
    case 'StructureSpawn': {
      circ(g, 7.6, RIM); ring(g, 6.2, 2.2, col); circ(g, 5, D); circ(g, 4.2 * Math.sqrt(o.e / o.c), '#ffe56d');
      if (o.spn) ring(g, 8.8, 1.4, '#fff', -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * o.spn[0] / o.spn[1]); break; }
    case 'StructureTower': { circ(g, 5, RIM); circ(g, 4, D); ring(g, 4, 1.4, col); rrect(g, -1.1, -6.2, 2.2, 5, .6, col); circ(g, 1.6 * Math.sqrt((o.e || 0) / (o.c || 1)), '#ffe56d'); break; }
    case 'Creep': {
      const parts = o.b.split(','), n = parts.length;
      circ(g, 4.6, RIM);
      parts.forEach((p, i) => { const a0 = -Math.PI / 2 + i * 2 * Math.PI / n; ring(g, 3.7, 1.7, p.endsWith('!') ? '#3a3f47' : PART[p[0]], a0 + .06, a0 + 2 * Math.PI / n - .06); });
      circ(g, 2.5, col); if (o.e) circ(g, 1.1, '#ffe56d');
      if (o.esc) ring(g, 5.4, .9, '#ffe56d'); break; }
  }
}
export function drawFrame(g, terrainC, f, prev, k = 1, sel, u = 1) {
  g.imageSmoothingEnabled = true; g.drawImage(terrainC, 0, 0, N * TS, N * TS);
  const pm = prev ? new Map(prev.objs.map(o => [o.id, o])) : new Map();
  const pos = o => { const p = pm.get(o.id); if (!p || o.t !== 'Creep') return [cx(o.x), cx(o.y)]; return [cx(p.x + (o.x - p.x) * k), cx(p.y + (o.y - p.y) * k)]; };
  const order = ['EffectZone', 'AreaEffect', 'Portal', 'ConstructionBoost', 'StructureGoal', 'StructureRoad', 'BodyPart', 'Flag', 'ConstructionSite', 'Resource', 'Source', 'StructureContainer', 'StructureExtension', 'StructureWall', 'StructureSpawn', 'StructureTower', 'Creep', 'StructureRampart', 'ScoreCollector'];
  const objs = [...f.objs].sort((a, b) => order.indexOf(a.t) - order.indexOf(b.t));
  for (const o of objs) {
    const [x, y] = pos(o), col = COLORS[o.o] || COLORS.neutral;
    if (o.t === 'Creep' && o.sp) continue;
    if (o.t === 'EffectZone') { const rr = cx(o.x + o.r + 0.5) - cx(o.x - o.r - 0.5); g.globalAlpha = .16; g.fillStyle = o.ef === 'freeze' ? '#6cf' : o.ef === 'heal' ? '#6f6' : '#f55'; g.fillRect(x - rr / 2, y - rr / 2, rr, rr); g.globalAlpha = 1; continue; }
    const us = (o.t === 'StructureWall' || o.t === 'StructureRoad') ? 1 : u;
    g.save(); g.translate(x, y); g.scale(us, us); drawSprite(g, o, col);
    if (o.h != null && o.h < o.hm && (o.t === 'Creep' || o.t === 'StructureSpawn' || o.t === 'StructureTower')) hpBar(g, 0, o.t === 'Creep' ? -7 : -10.5, o.h / o.hm, col);
    if (sel && sel === o.id) { g.strokeStyle = '#fff'; g.lineWidth = .8; g.strokeRect(-6, -6, 12, 12); }
    g.restore();
  }
  if (k > 0.3) for (const e of f.ev || []) {
    if (e.t === 'part') continue;
    if (e.t === 'die') { g.strokeStyle = '#ffe56d'; g.globalAlpha = 1 - k; g.lineWidth = u; g.beginPath(); g.arc(cx(e.at[0]), cx(e.at[1]), 6 * k * u, 0, 7); g.stroke(); g.globalAlpha = 1; continue; }
    g.strokeStyle = e.t === 'heal' ? '#65fd62' : e.k === 'ranged' ? '#5d80b2' : e.k === 'tower' ? '#ffb74d' : '#f93842';
    g.lineWidth = 1.2 * Math.min(u, 2); g.beginPath(); g.moveTo(cx(e.f[0]), cx(e.f[1])); g.lineTo(cx(e.to[0]), cx(e.to[1])); g.stroke();
  }
  for (const pid in f.vis || {}) for (const it of f.vis[pid]) drawVisual(g, it);
}
function hpBar(g, x, y, r, col) { g.fillStyle = '#0d1015'; g.fillRect(x - 5.5, y - .4, 11, 2.4); g.fillStyle = r > .5 ? '#65fd62' : r > .25 ? '#ffd34e' : '#f93842'; g.fillRect(x - 5, y, 10 * Math.max(0, r), 1.6); }
function drawVisual(g, it) {
  const s = it[it.length - 1] || {}; g.globalAlpha = s.opacity ?? 0.5; g.lineWidth = (s.strokeWidth ?? s.width ?? 0.1) * TS;
  if (it[0] === 'c') { g.fillStyle = s.fill || '#fff'; g.beginPath(); g.arc(cx(it[1][0]), cx(it[1][1]), (s.radius ?? .15) * TS, 0, 7); g.fill(); }
  if (it[0] === 'l') { g.strokeStyle = s.color || '#fff'; g.beginPath(); g.moveTo(cx(it[1][0]), cx(it[1][1])); g.lineTo(cx(it[2][0]), cx(it[2][1])); g.stroke(); }
  if (it[0] === 'r') { g.fillStyle = s.fill || '#fff'; g.fillRect(it[1][0] * TS, it[1][1] * TS, it[2] * TS, it[3] * TS); }
  if (it[0] === 'p') { g.strokeStyle = s.stroke || '#fff'; g.beginPath(); it[1].forEach(([x, y], i) => i ? g.lineTo(cx(x), cx(y)) : g.moveTo(cx(x), cx(y))); g.stroke(); }
  if (it[0] === 't') { g.fillStyle = s.color || '#fff'; g.font = `${(s.font ?? .7) * TS}px sans-serif`; g.textAlign = 'center'; g.fillText(it[1], cx(it[2][0]), cx(it[2][1])); }
  g.globalAlpha = 1;
}
