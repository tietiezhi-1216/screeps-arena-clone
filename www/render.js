// Canvas 渲染：风格参考 Screeps Arena（深色地形、沼泽暗绿、圆形 creep 外圈按部件着色、所有者主色）
export const TS = 8, N = 100;
export const COLORS = { p1: '#5ec8ff', p2: '#ff6f6f', neutral: '#bbbbbb', energy: '#ffe56d' };
const PART = { m: '#a9b7c6', w: '#ffe56d', c: '#777777', a: '#f93842', r: '#5d80b2', h: '#65fd62', t: '#ffffff' };
export function terrainCanvas(terrain) {
  const c = new OffscreenCanvas(N * TS, N * TS), g = c.getContext('2d');
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const t = terrain[y * N + x]; g.fillStyle = t === 1 ? '#0c0c0c' : t === 2 ? '#2c3a20' : '#3a3a3a'; g.fillRect(x * TS, y * TS, TS, TS); if (t === 1) { g.fillStyle = '#1e1e1e'; g.fillRect(x * TS + 1, y * TS + 1, TS - 2, TS - 2); }
  }
  g.strokeStyle = '#ffffff08'; for (let i = 0; i <= N; i += 10) { g.beginPath(); g.moveTo(i * TS, 0); g.lineTo(i * TS, N * TS); g.moveTo(0, i * TS); g.lineTo(N * TS, i * TS); g.stroke(); }
  return c;
}
const cx = v => v * TS + TS / 2;
export function drawFrame(g, terrainC, f, prev, k = 1, sel) {
  g.drawImage(terrainC, 0, 0);
  const pm = prev ? new Map(prev.objs.map(o => [o.id, o])) : new Map();
  const pos = o => { const p = pm.get(o.id); if (!p || o.t !== 'Creep') return [cx(o.x), cx(o.y)]; return [cx(p.x + (o.x - p.x) * k), cx(p.y + (o.y - p.y) * k)]; };
  const order = ['EffectZone', 'AreaEffect', 'Portal', 'ConstructionBoost', 'StructureGoal', 'StructureRoad', 'BodyPart', 'Flag', 'ConstructionSite', 'Resource', 'Source', 'StructureContainer', 'StructureExtension', 'StructureWall', 'StructureSpawn', 'StructureTower', 'Creep', 'StructureRampart', 'ScoreCollector'];
  const objs = [...f.objs].sort((a, b) => order.indexOf(a.t) - order.indexOf(b.t));
  for (const o of objs) {
    const [x, y] = pos(o), col = COLORS[o.o] || COLORS.neutral;
    switch (o.t) {
      case 'StructureRoad': g.fillStyle = '#555'; g.beginPath(); g.arc(x, y, 1.5, 0, 7); g.fill(); break;
      case 'EffectZone': { const rr = cx(o.x + o.r + 0.5) - cx(o.x - o.r - 0.5); g.globalAlpha = .18; g.fillStyle = o.ef === 'freeze' ? '#6cf' : o.ef === 'heal' ? '#6f6' : '#f55'; g.fillRect(x - rr / 2, y - rr / 2, rr, rr); g.globalAlpha = 1; break; }
      case 'AreaEffect': g.globalAlpha = .35; g.fillStyle = '#58f'; g.fillRect(x - 4, y - 4, 8, 8); g.globalAlpha = 1; break;
      case 'Portal': g.strokeStyle = '#b6f'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, 4, 0, 7); g.stroke(); g.beginPath(); g.arc(x, y, 2, 0, 7); g.stroke(); break;
      case 'ConstructionBoost': g.fillStyle = '#fd4'; g.beginPath(); g.moveTo(x, y - 4); g.lineTo(x + 4, y + 3); g.lineTo(x - 4, y + 3); g.fill(); break;
      case 'StructureGoal': g.fillStyle = col; g.strokeStyle = '#fff'; g.lineWidth = 1; g.fillRect(x - 4.5, y - 4.5, 9, 9); g.strokeRect(x - 4.5, y - 4.5, 9, 9); break;
      case 'ScoreCollector': g.strokeStyle = col || '#c9f'; g.lineWidth = 1.5; g.fillStyle = '#2a1838'; g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#c9f'; g.beginPath(); g.arc(x, y, 2, 0, 7); g.fill(); break;
      case 'Resource': g.fillStyle = o.rt ? '#c9f' : COLORS.energy; g.beginPath(); g.arc(x, y, Math.min(3.5, 1 + Math.sqrt(o.e) / 8), 0, 7); g.fill(); break;
      case 'Source': g.fillStyle = '#4a4222'; g.fillRect(x - 3.5, y - 3.5, 7, 7); g.fillStyle = COLORS.energy; const s = 6 * o.e / o.c; g.fillRect(x - s / 2, y - s / 2, s, s); break;
      case 'StructureContainer': g.fillStyle = '#3d3d3d'; g.strokeStyle = '#bbb'; g.lineWidth = 1; g.fillRect(x - 3, y - 3.5, 6, 7); g.strokeRect(x - 3, y - 3.5, 6, 7); g.fillStyle = COLORS.energy; { const h = 6 * o.e / o.c; g.fillRect(x - 2, y + 3 - h, 4, h); } break;
      case 'StructureExtension': g.strokeStyle = col; g.fillStyle = '#181818'; g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); g.stroke(); g.fillStyle = COLORS.energy; g.beginPath(); g.arc(x, y, 2 * o.e / o.c, 0, 7); g.fill(); break;
      case 'Flag': g.strokeStyle = '#ddd'; g.lineWidth = 1; g.beginPath(); g.moveTo(x - 2.5, y + 4); g.lineTo(x - 2.5, y - 4); g.stroke(); g.fillStyle = col; g.beginPath(); g.moveTo(x - 2.5, y - 4); g.lineTo(x + 4, y - 2); g.lineTo(x - 2.5, y); g.fill(); break;
      case 'BodyPart': g.fillStyle = PART[o.bt === 'ranged_attack' ? 'r' : o.bt[0]] || '#fff'; g.beginPath(); g.moveTo(x, y - 3); g.lineTo(x + 3, y); g.lineTo(x, y + 3); g.lineTo(x - 3, y); g.fill(); break;
      case 'StructureWall': g.fillStyle = '#3a3a3a'; g.fillRect(x - 4, y - 4, 8, 8); break;
      case 'StructureRampart': g.strokeStyle = col; g.lineWidth = 1.5; g.globalAlpha = .6; g.strokeRect(x - 3.5, y - 3.5, 7, 7); g.globalAlpha = 1; break;
      case 'ConstructionSite': g.strokeStyle = col; g.lineWidth = 1; g.setLineDash([1.5, 1.5]); g.beginPath(); g.arc(x, y, 3, 0, 7); g.stroke(); g.setLineDash([]); break;
      case 'StructureSpawn': {
        g.fillStyle = '#181818'; g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); g.strokeStyle = col; g.lineWidth = 2; g.stroke();
        g.fillStyle = COLORS.energy; g.beginPath(); g.arc(x, y, 4.5 * Math.sqrt(o.e / o.c), 0, 7); g.fill();
        if (o.spn) { g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, 9, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * o.spn[0] / o.spn[1]); g.stroke(); }
        hpBar(g, x, y - 11, o.h / o.hm, col); break; }
      case 'StructureTower': g.fillStyle = '#181818'; g.strokeStyle = col; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); g.stroke(); g.fillStyle = col; g.fillRect(x - 1, y - 6, 2, 5); break;
      case 'Creep': {
        if (o.sp) break; const parts = o.b.split(','), n = parts.length;
        parts.forEach((p, i) => { g.strokeStyle = p.endsWith('!') ? '#333' : PART[p[0]]; g.lineWidth = 1.6; g.beginPath(); const a0 = -Math.PI / 2 + i * 2 * Math.PI / n; g.arc(x, y, 3.6, a0, a0 + 2 * Math.PI / n - 0.08); g.stroke(); });
        g.fillStyle = col; g.beginPath(); g.arc(x, y, 2.4, 0, 7); g.fill();
        if (o.esc) { g.strokeStyle = '#fd4'; g.lineWidth = 1; g.beginPath(); g.arc(x, y, 5.2, 0, 7); g.stroke(); }
        if (o.e) { g.fillStyle = COLORS.energy; g.beginPath(); g.arc(x, y, 1.2, 0, 7); g.fill(); }
        if (o.h < o.hm) hpBar(g, x, y - 6, o.h / o.hm, col); break; }
    }
    if (sel && sel === o.id) { g.strokeStyle = '#fff'; g.lineWidth = 1; g.strokeRect(x - 5, y - 5, 10, 10); }
  }
  if (k > 0.3) for (const e of f.ev || []) {
    if (e.t === 'part') continue;
    if (e.t === 'die') { g.strokeStyle = '#ff0'; g.globalAlpha = 1 - k; g.beginPath(); g.arc(cx(e.at[0]), cx(e.at[1]), 6 * k, 0, 7); g.stroke(); g.globalAlpha = 1; continue; }
    g.strokeStyle = e.t === 'heal' ? '#65fd62' : e.k === 'ranged' ? '#5d80b2' : e.k === 'tower' ? '#ffb74d' : '#f93842';
    g.lineWidth = 1.2; g.beginPath(); g.moveTo(cx(e.f[0]), cx(e.f[1])); g.lineTo(cx(e.to[0]), cx(e.to[1])); g.stroke();
  }
  for (const pid in f.vis || {}) for (const it of f.vis[pid]) drawVisual(g, it);
}
function hpBar(g, x, y, r, col) { g.fillStyle = '#000a'; g.fillRect(x - 5, y, 10, 1.6); g.fillStyle = r > .5 ? '#65fd62' : r > .25 ? '#ffd34e' : '#f93842'; g.fillRect(x - 5, y, 10 * Math.max(0, r), 1.6); }
function drawVisual(g, it) {
  const s = it[it.length - 1] || {}; g.globalAlpha = s.opacity ?? 0.5; g.lineWidth = (s.strokeWidth ?? s.width ?? 0.1) * TS;
  if (it[0] === 'c') { g.fillStyle = s.fill || '#fff'; g.beginPath(); g.arc(cx(it[1][0]), cx(it[1][1]), (s.radius ?? .15) * TS, 0, 7); g.fill(); }
  if (it[0] === 'l') { g.strokeStyle = s.color || '#fff'; g.beginPath(); g.moveTo(cx(it[1][0]), cx(it[1][1])); g.lineTo(cx(it[2][0]), cx(it[2][1])); g.stroke(); }
  if (it[0] === 'r') { g.fillStyle = s.fill || '#fff'; g.fillRect(it[1][0] * TS, it[1][1] * TS, it[2] * TS, it[3] * TS); }
  if (it[0] === 'p') { g.strokeStyle = s.stroke || '#fff'; g.beginPath(); it[1].forEach(([x, y], i) => i ? g.lineTo(cx(x), cx(y)) : g.moveTo(cx(x), cx(y))); g.stroke(); }
  if (it[0] === 't') { g.fillStyle = s.color || '#fff'; g.font = `${(s.font ?? .7) * TS}px sans-serif`; g.textAlign = 'center'; g.fillText(it[1], cx(it[2][0]), cx(it[2][1])); }
  g.globalAlpha = 1;
}
