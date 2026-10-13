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
  // 沼泽描边：连续实线，沿融合轮廓（直边 + 凸角圆弧），不再是分段虚线
  g.strokeStyle = '#3a3e1d'; g.lineWidth = 1.5; g.beginPath(); const R = .35 * TT, w = .75;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (isS(x, y)) {
    const X = x * TT, Y = y * TT, cv = (sx, sy) => !isS(x + sx, y) && !isS(x, y + sy); // 凸角
    const r = (sx, sy) => cv(sx, sy) ? R : 0;
    if (!isS(x, y - 1)) { g.moveTo(X + r(-1, -1), Y + w); g.lineTo(X + TT - r(1, -1), Y + w); }
    if (!isS(x, y + 1)) { g.moveTo(X + r(-1, 1), Y + TT - w); g.lineTo(X + TT - r(1, 1), Y + TT - w); }
    if (!isS(x - 1, y)) { g.moveTo(X + w, Y + r(-1, -1)); g.lineTo(X + w, Y + TT - r(-1, 1)); }
    if (!isS(x + 1, y)) { g.moveTo(X + TT - w, Y + r(1, -1)); g.lineTo(X + TT - w, Y + TT - r(1, 1)); }
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) if (cv(sx, sy)) {
      const ccx = X + TT / 2 + sx * (TT / 2 - R), ccy = Y + TT / 2 + sy * (TT / 2 - R), rr = R - w;
      const a0 = sx < 0 ? Math.PI : 0, a1 = sy < 0 ? -Math.PI / 2 : Math.PI / 2;
      g.moveTo(ccx + Math.cos(a0) * rr, ccy + Math.sin(a0) * rr); g.arc(ccx, ccy, rr, a0, a1, (sx < 0) === (sy < 0) ? false : true);
    }
  }
  g.stroke();
  blob((x, y) => T(x, y) === 1, '#111111', .45, .3);
  return c;
}
const cx = v => v * TS + TS / 2;
// 扁平精灵：单位 = 格（以格中心为原点，调用方按 TS 缩放）。比例对照官方客户端 / Screeps World 渲染器：
// creep 半径 .43（部件环 .345，中心 .27）· spawn 外径 1 格（半径 .5，核心 .41）· extension/tower 半径 .4 · container .5×.6 · source .6 方块
const RIM = '#000', CORE = '#111';
const circ = (g, r, fill) => { g.fillStyle = fill; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill(); };
const ring = (g, r, w, col, a0 = 0, a1 = 7) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'butt'; g.beginPath(); g.arc(0, 0, r, a0, a1); g.stroke(); };
const rrect = (g, x, y, w, h, r, fill, stroke, lw) => { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } };
const EN = '#ffe56d';
// 玩家徽章（官方 ScreepsBadge 图案）：setBadges({ p1: {badge, name}, p2: {...} })，渲染时画在 creep / spawn 中心
const BADGE = {}; export const PLAYERS = {};
export function setBadges(map) {
  for (const k of Object.keys(PLAYERS)) delete PLAYERS[k];
  for (const [pid, v] of Object.entries(map || {})) { PLAYERS[pid] = v; const key = JSON.stringify(v.badge || null);
    if (BADGE[pid]?.key === key) continue; BADGE[pid] = { key, img: null };
    if (!v.badge || typeof window === 'undefined' || !window.ScreepsBadge) continue;
    const img = new Image(); img.onload = () => { BADGE[pid].img = img; }; let svg = window.ScreepsBadge.svg(v.badge, 64); if (!svg.includes('xmlns')) svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); }
}
function badge(g, pid, r) { const b = pid && BADGE[pid]?.img; if (!b) return false; g.save(); g.beginPath(); g.arc(0, 0, r, 0, 7); g.clip(); g.drawImage(b, -r, -r, 2 * r, 2 * r); g.restore(); return true; }
// creep 朝向：移动时朝向移动方向，停下保持原朝向；每次绘制按最短角度平滑转过去（约 0.25 秒转完）
const FACE = new Map(); let lastT = 0;
function facing(o, p, now, dt) {
  let f = FACE.get(o.id); const want = p && (p.x !== o.x || p.y !== o.y) ? Math.atan2(o.y - p.y, o.x - p.x) : f ? f.want : (o.o === 'p2' ? Math.PI : 0);
  if (!f) { f = { cur: want, want }; FACE.set(o.id, f); }
  f.want = want; let d = ((want - f.cur + Math.PI * 3) % (Math.PI * 2)) - Math.PI; const step = Math.min(1, dt / 120);
  f.cur += d * step; return f.cur;
}
export function drawSprite(g, o, col) {
  switch (o.t) {
    case 'StructureRoad': circ(g, .15, '#4a5260'); break;
    case 'AreaEffect': g.globalAlpha = .35; rrect(g, -.5, -.5, 1, 1, .1, '#58f'); g.globalAlpha = 1; break;
    case 'Portal': ring(g, .4, .08, '#b58cff'); circ(g, .2, '#b58cff'); break;
    case 'ConstructionBoost': g.fillStyle = EN; g.beginPath(); g.moveTo(0, -.4); g.lineTo(.36, .3); g.lineTo(-.36, .3); g.closePath(); g.fill(); break;
    case 'StructureGoal': rrect(g, -.45, -.45, .9, .9, .1, RIM, col, .07); break;
    case 'ScoreCollector': circ(g, .5, RIM); ring(g, .42, .07, '#b58cff'); circ(g, .34, CORE); g.save(); g.rotate(Math.PI / 4); rrect(g, -.15, -.15, .3, .3, .04, '#e0c8ff'); g.restore(); break;
    case 'Resource': circ(g, Math.min(.25, .1 + Math.sqrt(o.e) / 120), o.rt ? '#c9a2ff' : EN); break;
    case 'Source': { rrect(g, -.3, -.3, .6, .6, .06, '#3b3620'); const s = .5 * Math.sqrt(o.e / o.c); if (s > 0) rrect(g, -s / 2, -s / 2, s, s, .04, EN); break; }
    case 'StructureContainer': { rrect(g, -.25, -.3, .5, .6, .05, '#1d1d1d', '#a0a0a0', .06); const h = .48 * o.e / o.c; if (h > 0) { g.fillStyle = EN; g.fillRect(-.19, .24 - h, .38, h); } break; }
    case 'StructureExtension': circ(g, .4, RIM); ring(g, .34, .07, col); circ(g, .28, CORE); circ(g, .26 * Math.sqrt(o.e / (o.c || 1)), EN); break;
    case 'Flag': g.fillStyle = '#d8dde6'; g.fillRect(-.22, -.42, .06, .84); g.fillStyle = col; g.beginPath(); g.moveTo(-.16, -.42); g.lineTo(.36, -.24); g.lineTo(-.16, -.06); g.closePath(); g.fill(); break;
    case 'BodyPart': g.save(); g.rotate(Math.PI / 4); rrect(g, -.2, -.2, .4, .4, .05, PART[o.bt === 'ranged_attack' ? 'r' : o.bt[0]] || '#fff', RIM, .05); g.restore(); break;
    case 'StructureWall': rrect(g, -.5, -.5, 1, 1, .06, CORE, '#4a4a4a', .06); break;
    case 'StructureRampart': g.globalAlpha = .4; rrect(g, -.5, -.5, 1, 1, .12, col); g.globalAlpha = 1; rrect(g, -.47, -.47, .94, .94, .12, null, col, .06); break;
    case 'ConstructionSite': g.setLineDash([.08, .06]); ring(g, .3, .06, col); g.setLineDash([]); circ(g, .08, col); break;
    case 'StructureSpawn':
      circ(g, .5, RIM); ring(g, .45, .045, col); circ(g, .41, CORE); if (o.e) ring(g, .385, .05, EN, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * Math.min(1, o.e / o.c)); if (!badge(g, o.o, .32)) circ(g, .3, col);
      if (o.spn) ring(g, .45, .1, '#fff', -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * o.spn[0] / o.spn[1]); break;
    case 'StructureTower': circ(g, .4, RIM); ring(g, .34, .07, col); circ(g, .27, CORE); circ(g, .25 * Math.sqrt((o.e || 0) / (o.c || 1)), EN); rrect(g, -.1, -.62, .2, .5, 0, CORE, col, .05); break;
    case 'Creep': {
      // 对照官方 / World 渲染：每个部件一段弧（弧长 = 1/50 圈），MOVE 在后方居中，其余部件在前方居中、左右对称依次展开；TOUGH 为外圈。
      // 本函数以“前方 = 右（角度 0）”绘制，调用方已按朝向旋转。损坏的部件不画（与官方一致：只显示还有生命的部件）。
      const parts = o.b.split(','), live = t => parts.filter(p => p[0] === t && !p.endsWith('!')).length, PER = Math.PI * 2 / 50;
      if (live('t')) ring(g, .47, .05, `rgba(255,255,255,${Math.min(.9, .45 + live('t') / 20)})`);
      circ(g, .43, '#222'); ring(g, .43, .03, col);
      const arc = (c, sp, colr) => { if (sp > 0) ring(g, .345, .13, colr, c - sp / 2, c + sp / 2); };
      arc(Math.PI, live('m') * PER, PART.m);
      const front = ['w', 'a', 'r', 'h', 'c'].filter(t => live(t)), total = front.reduce((a, t) => a + live(t), 0) * PER;
      let st = -total / 2; for (const t of front) { const sp = live(t) * PER; arc(st + sp / 2, sp, PART[t]); st += sp; }
      circ(g, .27, CORE);
      break; }
  }
}
export function drawFrame(g, terrainC, f, prev, k = 1, sel, u = 1) {
  g.imageSmoothingEnabled = true; g.drawImage(terrainC, 0, 0, N * TS, N * TS);
  const pm = prev ? new Map(prev.objs.map(o => [o.id, o])) : new Map();
  const pos = o => { const p = pm.get(o.id); if (!p || o.t !== 'Creep') return [cx(o.x), cx(o.y)]; return [cx(p.x + (o.x - p.x) * k), cx(p.y + (o.y - p.y) * k)]; };
  const order = ['EffectZone', 'AreaEffect', 'Portal', 'ConstructionBoost', 'StructureGoal', 'StructureRoad', 'BodyPart', 'Flag', 'ConstructionSite', 'Resource', 'Source', 'StructureContainer', 'StructureExtension', 'StructureWall', 'StructureSpawn', 'StructureTower', 'Creep', 'StructureRampart', 'ScoreCollector'];
  const now = typeof performance !== 'undefined' ? performance.now() : 0, dt = lastT ? Math.min(100, now - lastT) : 16; lastT = now;
  const objs = [...f.objs].sort((a, b) => order.indexOf(a.t) - order.indexOf(b.t));
  for (const o of objs) {
    const [x, y] = pos(o), col = COLORS[o.o] || COLORS.neutral;
    if (o.t === 'Creep' && o.sp) continue;
    if (o.t === 'EffectZone') { const rr = cx(o.x + o.r + 0.5) - cx(o.x - o.r - 0.5); g.globalAlpha = .16; g.fillStyle = o.ef === 'freeze' ? '#6cf' : o.ef === 'heal' ? '#6f6' : '#f55'; g.fillRect(x - rr / 2, y - rr / 2, rr, rr); g.globalAlpha = 1; continue; }
    g.save(); g.translate(x, y); g.scale(TS, TS);
    if (o.t === 'Creep') { g.save(); g.rotate(facing(o, pm.get(o.id), now, dt)); drawSprite(g, o, col); g.restore(); if (!badge(g, o.o, .2)) circ(g, .17, col); if (o.e) ring(g, .235, .045, EN); if (o.esc) ring(g, .52, .04, EN); } else drawSprite(g, o, col);
    if (o.t === 'StructureSpawn' && PLAYERS[o.o]?.name) { g.font = '600 .42px sans-serif'; g.textAlign = 'center'; g.fillStyle = '#000'; g.fillText(PLAYERS[o.o].name, .03, -.78); g.fillStyle = col; g.fillText(PLAYERS[o.o].name, 0, -.8); }
    if (o.h != null && o.h < o.hm && (o.t === 'Creep' || o.t === 'StructureSpawn' || o.t === 'StructureTower')) hpBar(g, 0, -.68, o.h / o.hm, col);
    if (sel && sel === o.id) { g.strokeStyle = '#fff'; g.lineWidth = .06; g.strokeRect(-.55, -.55, 1.1, 1.1); }
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
function hpBar(g, x, y, r, col) { g.fillStyle = '#000'; g.fillRect(x - .45, y - .06, .9, .14); g.fillStyle = r > .5 ? '#65fd62' : r > .25 ? '#ffd34e' : '#f93842'; g.fillRect(x - .43, y - .04, .86 * Math.max(0, r), .1); }
function drawVisual(g, it) {
  const s = it[it.length - 1] || {}; g.globalAlpha = s.opacity ?? 0.5; g.lineWidth = (s.strokeWidth ?? s.width ?? 0.1) * TS;
  if (it[0] === 'c') { g.fillStyle = s.fill || '#fff'; g.beginPath(); g.arc(cx(it[1][0]), cx(it[1][1]), (s.radius ?? .15) * TS, 0, 7); g.fill(); }
  if (it[0] === 'l') { g.strokeStyle = s.color || '#fff'; g.beginPath(); g.moveTo(cx(it[1][0]), cx(it[1][1])); g.lineTo(cx(it[2][0]), cx(it[2][1])); g.stroke(); }
  if (it[0] === 'r') { g.fillStyle = s.fill || '#fff'; g.fillRect(it[1][0] * TS, it[1][1] * TS, it[2] * TS, it[3] * TS); }
  if (it[0] === 'p') { g.strokeStyle = s.stroke || '#fff'; g.beginPath(); it[1].forEach(([x, y], i) => i ? g.lineTo(cx(x), cx(y)) : g.moveTo(cx(x), cx(y))); g.stroke(); }
  if (it[0] === 't') { g.fillStyle = s.color || '#fff'; g.font = `${(s.font ?? .7) * TS}px sans-serif`; g.textAlign = 'center'; g.fillText(it[1], cx(it[2][0]), cx(it[2][1])); }
  g.globalAlpha = 1;
}
