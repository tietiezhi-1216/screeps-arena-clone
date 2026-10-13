import { TS, N, terrainCanvas, drawFrame } from './render.js';
import { transformModule } from './src/engine/sandbox.js';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const BOTS = { 'rush（近战冲锋）': 'bots/rush.mjs', 'kite（远程风筝）': 'bots/kite.mjs', '空白模板': null };
const BLANK = `import { getObjectsByPrototype } from 'game/utils';\nimport { Creep, StructureSpawn } from 'game/prototypes';\nimport { MOVE, ATTACK, ERR_NOT_IN_RANGE } from 'game/constants';\n\nexport function loop() {\n  const spawn = getObjectsByPrototype(StructureSpawn).find(s => s.my);\n  \n}\n`;
$('#ver').textContent = 'v' + (window.APP_VERSION || 'dev');

// ---------- 导航 ----------
const show = v => { $$('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.v === v)); $$('.view').forEach(e => e.classList.toggle('on', e.id === 'v-' + v)); if (v === 'play') resize(); if (v === 'code') fitEditor(); };
$$('.tabs button').forEach(b => b.onclick = () => show(b.dataset.v));

// ---------- 代码编辑器（移动端友好：快捷符号键、代码片段、字号、语法检查） ----------
const ta = $('#code'), codes = [localStorage.code0, localStorage.code1]; let cur = 0;
async function loadTpl(i, name) { codes[i] = BOTS[name] ? await (await fetch(BOTS[name])).text() : BLANK; localStorage['code' + i] = codes[i]; if (i === cur) setCode(); }
function setCode() { ta.value = codes[cur] || ''; fitEditor(); }
function fitEditor() { const n = ta.value.split('\n').length; $('#gutter').textContent = Array.from({ length: n }, (_, i) => i + 1).join('\n'); ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; ta.style.width = 'auto'; ta.style.minWidth = ta.scrollWidth + 'px'; }
for (const k in BOTS) $('#tpl').add(new Option(k, k)); $('#tpl').selectedIndex = 0;
$('#tpl').onchange = () => { if (confirm(`用「${$('#tpl').value}」替换玩家 ${cur + 1} 的代码？`)) loadTpl(cur, $('#tpl').value); $('#tpl').selectedIndex = 0; };
$$('.seg button').forEach(b => b.onclick = () => { cur = +b.dataset.p; $$('.seg button').forEach(x => x.classList.toggle('on', x === b)); setCode(); });
ta.oninput = () => { codes[cur] = ta.value; localStorage['code' + cur] = ta.value; fitEditor(); };
function insert(text, back = 0) { ta.focus(); ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, 'end'); if (back) ta.selectionStart = ta.selectionEnd = ta.selectionEnd - back; ta.oninput(); }
ta.onkeydown = e => { if (e.key === 'Tab') { e.preventDefault(); insert('  '); } else if (e.key === 'Enter') { e.preventDefault(); const line = ta.value.slice(0, ta.selectionStart).split('\n').pop(); const ind = line.match(/^\s*/)[0] + (/[{(\[]\s*$/.test(line) ? '  ' : ''); insert('\n' + ind); } };
const KEYS = [['⇥', '  '], ['{', '{}', 1], ['}', '}'], ['(', '()', 1], [')', ')'], ['[', '[]', 1], [']', ']'], [';', ';'], ['.', '.'], [',', ', '], ['=', ' = '], ['=>', ' => '], ["'", "''", 1], ['!', '!'], ['<', ' < '], ['>', ' > '], ['&&', ' && '], ['||', ' || '], ['===', ' === ']];
for (const [l, t, b] of KEYS) { const k = document.createElement('button'); k.textContent = l; k.onpointerdown = e => e.preventDefault(); k.onclick = () => insert(t, b); $('#keys').append(k); }
const SNIPS = [['spawnCreep', "spawn.spawnCreep([MOVE, ATTACK]);"], ['我的 creeps', "const mine = getObjectsByPrototype(Creep).filter(c => c.my);"], ['敌方 creeps', "const enemies = getObjectsByPrototype(Creep).filter(c => !c.my);"],
  ['for creep', "for (const creep of mine) {\n  \n}", 2], ['attack/moveTo', "if (creep.attack(target) === ERR_NOT_IN_RANGE) creep.moveTo(target);"], ['rangedAttack', "if (creep.rangedAttack(target) === ERR_NOT_IN_RANGE) creep.moveTo(target);"],
  ['withdraw', "if (creep.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) creep.moveTo(container);"], ['transfer', "if (creep.transfer(spawn, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) creep.moveTo(spawn);"],
  ['findClosestByPath', "const t = creep.findClosestByPath(enemies);"], ['getTicks', "getTicks()"], ['console.log', "console.log();", 2]];
for (const [l, t, b] of SNIPS) { const k = document.createElement('button'); k.textContent = l; k.onpointerdown = e => e.preventDefault(); k.onclick = () => insert(t, b); $('#snips').append(k); }
let fs = +localStorage.fs || 14; const setFs = d => { fs = Math.max(10, Math.min(24, fs + d)); localStorage.fs = fs; document.documentElement.style.setProperty('--fs', fs + 'px'); fitEditor(); }; setFs(0);
$('#fsm').onclick = () => setFs(-1); $('#fsp').onclick = () => setFs(1);
function check(i) { try { transformModule(codes[i] || ''); return null; } catch (e) { return `玩家 ${i + 1}：${e.message}`; } }
$('#check').onclick = () => { const e = check(cur); $('#codeMsg').textContent = e || '✓ 语法正确'; $('#codeMsg').className = e ? 'err' : ''; };
(async () => { for (const i of [0, 1]) if (!codes[i]) await loadTpl(i, Object.keys(BOTS)[i]); setCode(); })();

// ---------- 对局 ----------
let worker, watchdog;
function startMatch() {
  const errs = [0, 1].map(check).filter(Boolean); if (errs.length) { show('code'); $('#codeMsg').textContent = errs.join('\n'); $('#codeMsg').className = 'err'; return; }
  worker?.terminate(); clearTimeout(watchdog); show('play'); $('#status').textContent = '模拟中…'; $('#result').textContent = ''; $('#empty').classList.add('hidden');
  worker = new Worker('worker.js', { type: 'module' });
  // 看门狗：Worker 内已有逐 tick CPU 限制；这里兜底，长时间无进度就直接终止
  const arm = () => { clearTimeout(watchdog); watchdog = setTimeout(() => { worker.terminate(); $('#status').textContent = '模拟无响应，已终止'; }, 15000); }; arm();
  worker.onmessage = e => { const d = e.data; arm();
    if (d.progress) $('#status').textContent = `模拟中… ${d.progress}`;
    if (d.error) { clearTimeout(watchdog); $('#status').textContent = '错误'; alert(d.error); }
    if (d.replay) { clearTimeout(watchdog); worker.terminate(); setReplay(d.replay); playing = true; updPlay(); } };
  worker.postMessage({ scripts: codes, seed: +$('#seed').value, mode: $('#mode').value });
}
$('#runTop').onclick = startMatch;

// ---------- 地图视图：双指缩放 / 拖动 / 点选 ----------
const cv = $('#cv'), g = cv.getContext('2d'); let dpr = 1, view = { s: 1, x: 0, y: 0 }, fitted = false;
function resize() { dpr = window.devicePixelRatio || 1; const r = cv.getBoundingClientRect(); if (!r.width) return; cv.width = r.width * dpr; cv.height = r.height * dpr; if (!fitted) fit(); draw(); }
function fit() { const W = cv.width / dpr, H = cv.height / dpr; const s = Math.min(W - 8, H - 124) / (N * TS); view = { s, x: (W - N * TS * s) / 2, y: 44 + (H - 124 - N * TS * s) / 2 }; fitted = true; draw(); }
window.addEventListener('resize', () => { fitted = false; resize(); }); $('#fit').onclick = fit;
const pts = new Map(); let gesture = null, moved = 0;
cv.onpointerdown = e => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.offsetX, y: e.offsetY }); moved = 0; startGesture(); };
function startGesture() { const p = [...pts.values()]; if (p.length === 1) gesture = { one: p[0], v: { ...view } }; else if (p.length >= 2) { const [a, b] = p; gesture = { mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, d: Math.hypot(a.x - b.x, a.y - b.y), v: { ...view } }; } }
cv.onpointermove = e => { if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.offsetX, y: e.offsetY }); const p = [...pts.values()];
  if (p.length === 1 && gesture?.one) { const dx = p[0].x - gesture.one.x, dy = p[0].y - gesture.one.y; moved = Math.max(moved, Math.abs(dx) + Math.abs(dy)); view.x = gesture.v.x + dx; view.y = gesture.v.y + dy; }
  else if (p.length >= 2 && gesture?.mid) { moved = 99; const [a, b] = p, mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, k = Math.hypot(a.x - b.x, a.y - b.y) / gesture.d; zoomAt(gesture.v, gesture.mid, mid, k); }
  draw(); };
function zoomAt(v0, from, to, k) { const s = Math.max(0.2, Math.min(12, v0.s * k)); const wx = (from.x - v0.x) / v0.s, wy = (from.y - v0.y) / v0.s; view = { s, x: to.x - wx * s, y: to.y - wy * s }; }
const up = e => { const was = pts.size; pts.delete(e.pointerId); if (was === 1 && moved < 8) pick(e.offsetX, e.offsetY); startGesture(); };
cv.onpointerup = up; cv.onpointercancel = up;
cv.onwheel = e => { e.preventDefault(); const p = { x: e.offsetX, y: e.offsetY }; zoomAt(view, p, p, e.deltaY < 0 ? 1.15 : 1 / 1.15); draw(); };

// ---------- 回放 ----------
let replay = null, terr = null, frame = 0, playing = false, acc = 0, last = 0, sel = null, sheet = 'inspect';
const speeds = [0.5, 1, 2, 4, 8, 16, 32]; let si = 1;
function setReplay(r) { replay = r; terr = terrainCanvas(r.terrain); frame = 0; $('#scrub').max = r.frames.length - 1; $('#status').textContent = `完成 · ${r.meta.ticks} tick`; $('#empty').classList.add('hidden'); fitted = false; resize(); }
const updPlay = () => $('#play').textContent = playing ? '❚❚' : '▶';
$('#play').onclick = () => { if (!replay) return startMatch(); if (frame >= replay.frames.length - 1) frame = 0; playing = !playing; updPlay(); };
$('#step').onclick = () => { if (!replay) return; playing = false; updPlay(); frame = Math.min(replay.frames.length - 1, frame + 1); draw(); };
$('#speed').onclick = () => { si = (si + 1) % speeds.length; $('#speed').textContent = speeds[si] + '×'; };
$('#scrub').oninput = e => { frame = +e.target.value; acc = 0; draw(); };
$('#save').onclick = () => { if (!replay) return alert('还没有回放'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(replay)], { type: 'application/json' })); a.download = `arena-replay-${replay.meta.seed}.json`; a.click(); };
$('#load').onclick = () => $('#file').click(); $('#file').onchange = async e => { setReplay(JSON.parse(await e.target.files[0].text())); show('play'); };
$('#updBtn').onclick = () => window.checkUpdate ? window.checkUpdate(true) : alert('仅安卓应用支持');
function pick(px, py) { if (!replay) return; const x = Math.floor((px - view.x) / view.s / TS), y = Math.floor((py - view.y) / view.s / TS);
  const near = replay.frames[frame].objs.filter(o => Math.abs(o.x - x) <= (view.s < 1 ? 1 : 0) && Math.abs(o.y - y) <= (view.s < 1 ? 1 : 0)).sort((a, b) => (b.t === 'Creep') - (a.t === 'Creep'));
  sel = near[0]?.id || null; if (sel) openSheet('inspect'); draw(); }
function openSheet(s) { sheet = s; $('#sheet').classList.add('on'); $$('.sheet-tabs button[data-s]').forEach(b => b.classList.toggle('on', b.dataset.s === s)); draw(); }
$$('.sheet-tabs button[data-s]').forEach(b => b.onclick = () => openSheet(b.dataset.s)); $('#sheetClose').onclick = () => { $('#sheet').classList.remove('on'); sel = null; draw(); };
$('#conBtn').onclick = () => $('#sheet').classList.contains('on') ? $('#sheetClose').onclick() : openSheet('p1');
const BODY = { m: 'MOVE', w: 'WORK', c: 'CARRY', a: 'ATTACK', r: 'RANGED_ATTACK', h: 'HEAL', t: 'TOUGH' };
function draw(k = 1) {
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#0e0f12'; g.fillRect(0, 0, cv.width, cv.height);
  if (!replay) return; const f = replay.frames[frame];
  g.setTransform(dpr * view.s, 0, 0, dpr * view.s, dpr * view.x, dpr * view.y); g.imageSmoothingEnabled = false;
  drawFrame(g, terr, f, replay.frames[frame - 1], k, sel);
  $('#tick').textContent = f.tick - 1; $('#scrub').value = frame;
  for (const p of ['p1', 'p2']) { const cs = f.objs.filter(o => o.t === 'Creep' && o.o === p).length, sp = f.objs.find(o => o.t === 'StructureSpawn' && o.o === p);
    $('#' + p + 'info').textContent = `👾${cs} ♥${sp ? sp.h : 0} ⚡${sp ? sp.e : 0}${f.cpu?.[p] != null ? ` ⏱${f.cpu[p].toFixed(1)}ms` : ''}`; }
  $('#result').textContent = f.result ? (f.result.winner ? (f.result.winner === 'p1' ? '玩家 1 胜利' : '玩家 2 胜利') : '平局') : '';
  $('#result').style.color = f.result?.winner === 'p1' ? 'var(--p1)' : f.result?.winner === 'p2' ? 'var(--p2)' : '#fff';
  if (!$('#sheet').classList.contains('on')) return;
  if (sheet === 'inspect') { const o = sel && f.objs.find(o => o.id === sel);
    $('#sheetBody').textContent = o ? [`${o.t}  #${o.id}`, `pos  (${o.x}, ${o.y})`, o.o && `owner  ${o.o}`, o.h != null && `hits  ${o.h} / ${o.hm}`, o.e != null && `energy  ${o.e} / ${o.c}`, o.f != null && `fatigue  ${o.f}`, o.b && 'body  ' + o.b.split(',').map(b => BODY[b[0]] + (b.endsWith('!') ? '✗' : '')).join(' '), o.st && `${o.st} ${o.p}/${o.pt}`].filter(Boolean).join('\n') : (sel ? '（对象已不存在）' : '点地图上的对象查看详情'); }
  else $('#sheetBody').textContent = replay.frames.slice(Math.max(0, frame - 40), frame + 1).flatMap(fr => (fr.log?.[sheet] || []).map(l => `[${fr.tick - 1}] ${l}`)).join('\n') || '（无输出）';
}
function raf(t) { const dt = Math.min(100, t - last); last = t;
  if (replay && playing) { if (frame < replay.frames.length - 1) { acc += dt * speeds[si] / 200; while (acc >= 1 && frame < replay.frames.length - 1) { acc--; frame++; } draw(Math.min(1, acc)); } else { playing = false; updPlay(); } }
  else if (pts.size) {} requestAnimationFrame(raf); }
requestAnimationFrame(raf); setTimeout(resize, 0);
