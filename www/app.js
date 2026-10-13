import { TS, N, terrainCanvas, drawFrame } from './render.js';
import { transformModule } from './src/engine/sandbox.js';
import { HostSession, ClientSession, nativeTransport, LAN_PORT } from './src/net/lan.js';
import * as K from './src/constants.js';
import { PROTOTYPES } from './src/engine/prototypes.js';
import { MODES, MODE_NAMES } from './src/engine/match.js';
import { PLAN_TYPES } from './src/net/lan.js';
const IC = n => (window.icon ? window.icon(n) : '');
window.applyIcons?.();
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const BOTS = { 'rush（近战冲锋）': 'bots/rush.mjs', 'kite（远程风筝）': 'bots/kite.mjs', 'ctf（夺旗）': 'bots/ctf.mjs', 'collect（收集与控制）': 'bots/collect.mjs', '空白模板': null };
const AI = { easy: 'bots/ai/easy.mjs', normal: 'bots/ai/normal.mjs', hard: 'bots/ai/hard.mjs' };
const BLANK = `import { getObjectsByPrototype } from 'game/utils';\nimport { Creep, StructureSpawn } from 'game/prototypes';\nimport { MOVE, ATTACK, ERR_NOT_IN_RANGE } from 'game/constants';\n\nexport function loop() {\n  const spawn = getObjectsByPrototype(StructureSpawn).find(s => s.my);\n  \n}\n`;
$('#ver').textContent = $('#startVer').textContent = 'v' + (window.APP_VERSION || 'dev');

// ---------- 导航 ----------
const PANELS = ['#room', '#menu'];
const openPanel = id => { PANELS.forEach(p => $(p).classList.toggle('hidden', p !== id)); };
const show = v => { // 'play' | 'code'
  $('#editor').classList.toggle('hidden', v !== 'code'); $('#start').classList.add('hidden'); openPanel(null);
  if (v === 'code') { fitEditor(); if (edModes?.[cur] === 'blocks') setTimeout(() => blocks?.resize(), 0); } else resize(); };
$('#btnCode').onclick = () => show('code'); $('#edClose').onclick = () => show('play');
$('#btnRoom').onclick = () => openPanel($('#room').classList.contains('hidden') ? '#room' : null);
$('#btnMenu').onclick = () => openPanel($('#menu').classList.contains('hidden') ? '#menu' : null);
$('#roomClose').onclick = $('#mClose').onclick = () => openPanel(null);
$('#sNet').onclick = () => { $('#start').classList.add('hidden'); openPanel('#room'); };
$('#sPractice').onclick = () => { $('#start').classList.add('hidden'); openPanel('#room'); };
$('#sCode').onclick = () => show('code');
const CORE = ['spawn-and-swamp','spawn-and-swamp-advanced','capture-the-flag','capture-the-flag-advanced','collect-and-control','collect-and-control-advanced'];
for (const k of CORE) $('#mode').add(new Option(MODE_NAMES[k] || k, k));
$('#mode').value = localStorage.mode || 'spawn-and-swamp'; $('#seed').value = localStorage.seed || 1;

// ---------- 代码编辑器（移动端友好：快捷符号键、代码片段、字号、语法检查） ----------
const ta = $('#code'), codes = [localStorage.code0, localStorage.code1]; let cur = 0;
async function loadTpl(i, name) { codes[i] = BOTS[name] ? await (await fetch(BOTS[name])).text() : BLANK; localStorage['code' + i] = codes[i]; if (i === cur) setCode(); }
function setCode() { ta.value = codes[cur] || ''; fitEditor(); }
function fitEditor() { $('#hl').innerHTML = highlight(ta.value) + '\n'; const n = ta.value.split('\n').length; $('#gutter').textContent = Array.from({ length: n }, (_, i) => i + 1).join('\n'); ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; ta.style.width = 'auto'; ta.style.minWidth = ta.scrollWidth + 'px'; }
for (const k in BOTS) $('#tpl').add(new Option(k, k)); $('#tpl').selectedIndex = 0;
$('#diff').value = localStorage.diff || 'normal'; $('#diff').onchange = () => localStorage.diff = $('#diff').value;
$('#tpl').onchange = () => { if (confirm(`用「${$('#tpl').value}」替换当前代码？`)) { edModes[cur] = localStorage['ed' + cur] = 'text'; loadTpl(cur, $('#tpl').value).then(setEdMode); } $('#tpl').selectedIndex = 0; };
ta.oninput = () => { codes[cur] = ta.value; localStorage['code' + cur] = ta.value; fitEditor(); suggest(); };
ta.onkeyup = ta.onclick = () => suggest();
function insert(text, back = 0) { ta.focus(); ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, 'end'); if (back) ta.selectionStart = ta.selectionEnd = ta.selectionEnd - back; ta.oninput(); }
ta.onkeydown = e => { if (e.key === 'Tab') { e.preventDefault(); insert('  '); } else if (e.key === 'Enter') { e.preventDefault(); const line = ta.value.slice(0, ta.selectionStart).split('\n').pop(); const ind = line.match(/^\s*/)[0] + (/[{(\[]\s*$/.test(line) ? '  ' : ''); insert('\n' + ind); } };
const KEYS = [['⇥', '  '], ['{', '{}', 1], ['}', '}'], ['(', '()', 1], [')', ')'], ['[', '[]', 1], [']', ']'], [';', ';'], ['.', '.'], [',', ', '], ['=', ' = '], ['=>', ' => '], ["'", "''", 1], ['!', '!'], ['<', ' < '], ['>', ' > '], ['&&', ' && '], ['||', ' || '], ['===', ' === ']];
for (const [l, t, b] of KEYS) { const k = document.createElement('button'); k.textContent = l; k.onpointerdown = e => e.preventDefault(); k.onclick = () => insert(t, b); $('#keys').append(k); }
const SNIPS = [['spawnCreep', "spawn.spawnCreep([MOVE, ATTACK]);"], ['我的 creeps', "const mine = getObjectsByPrototype(Creep).filter(c => c.my);"], ['敌方 creeps', "const enemies = getObjectsByPrototype(Creep).filter(c => !c.my);"],
  ['for creep', "for (const creep of mine) {\n  \n}", 2], ['attack/moveTo', "if (creep.attack(target) === ERR_NOT_IN_RANGE) creep.moveTo(target);"], ['rangedAttack', "if (creep.rangedAttack(target) === ERR_NOT_IN_RANGE) creep.moveTo(target);"],
  ['withdraw', "if (creep.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) creep.moveTo(container);"], ['transfer', "if (creep.transfer(spawn, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) creep.moveTo(spawn);"],
  ['findClosestByPath', "const t = creep.findClosestByPath(enemies);"], ['getTicks', "getTicks()"], ['console.log', "console.log();", 2]];
for (const [l, t, b] of SNIPS) { const k = document.createElement('button'); k.className = 'snip'; k.textContent = l; k.onpointerdown = e => e.preventDefault(); k.onclick = () => insert(t, b); $('#snips').append(k); }
// ---- 语法高亮（透明 textarea 叠在高亮层上） ----
const KW = new Set('import export from function const let var if else for while do return break continue new of in true false null undefined this typeof instanceof try catch finally throw class extends switch case default async await'.split(' '));
const API_WORDS = [...Object.keys(K), ...Object.keys(PROTOTYPES), 'BodyPart', 'getObjectsByPrototype', 'getObjectById', 'getObjects', 'getTicks', 'getRange', 'getDirection', 'getTerrainAt', 'getCpuTime', 'findInRange', 'findClosestByRange', 'findClosestByPath', 'findPath', 'createConstructionSite', 'searchPath', 'CostMatrix', 'Visual', 'arenaInfo',
  'spawnCreep', 'moveTo', 'move', 'attack', 'rangedAttack', 'rangedMassAttack', 'heal', 'rangedHeal', 'harvest', 'build', 'transfer', 'withdraw', 'pickup', 'drop', 'pull', 'getRangeTo', 'findPathTo', 'store', 'body', 'hits', 'hitsMax', 'fatigue', 'spawning', 'my', 'exists', 'ticksToDecay', 'getFreeCapacity', 'getUsedCapacity', 'getCapacity', 'console', 'log', 'filter', 'find', 'forEach', 'some', 'length', 'Math'];
const APISET = new Set(API_WORDS);
const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
function highlight(src) {
  return src.replace(/(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|('(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)(\s*\()?|([&<>])/g, (m, c, str, num, id, call, ch) => {
    if (c) return `<span class="c">${esc(c)}</span>`; if (str) return `<span class="s">${esc(str)}</span>`; if (num) return `<span class="n">${num}</span>`;
    if (ch) return esc(ch);
    const cls = KW.has(id) ? 'k' : /^[A-Z][A-Z0-9_]+$/.test(id) ? 'x' : APISET.has(id) ? 'a' : call ? 'f' : '';
    return (cls ? `<span class="${cls}">${id}</span>` : id) + (call || '');
  });
}
// ---- 自动补全：输入时在片段条显示候选，点按替换当前前缀 ----
function suggest() {
  const pre = ta.value.slice(0, ta.selectionStart).match(/[A-Za-z_$][\w$]*$/)?.[0] || '';
  const bar = $('#snips'); bar.querySelectorAll('.sug').forEach(b => b.remove()); bar.querySelectorAll('.snip').forEach(b => b.classList.toggle('hidden', !!pre));
  if (!pre) return;
  const words = new Set([...API_WORDS, ...(ta.value.match(/[A-Za-z_$][\w$]{2,}/g) || [])]); words.delete(pre);
  const list = [...words].filter(w => w.toLowerCase().startsWith(pre.toLowerCase())).sort((a, b) => APISET.has(b) - APISET.has(a) || a.length - b.length).slice(0, 12);
  for (const w of list.reverse()) { const k = document.createElement('button'); k.className = 'sug'; k.textContent = w; k.onpointerdown = e => e.preventDefault();
    k.onclick = () => { const p = ta.selectionStart; ta.setRangeText(w, p - pre.length, p, 'end'); ta.oninput(); }; bar.prepend(k); }
}
let fs = +localStorage.fs || 14; const setFs = d => { fs = Math.max(10, Math.min(24, fs + d)); localStorage.fs = fs; document.documentElement.style.setProperty('--fs', fs + 'px'); fitEditor(); }; setFs(0);
$('#fsm').onclick = () => setFs(-1); $('#fsp').onclick = () => setFs(1);
function check(i, src = codes[i]) { try { transformModule(src || ''); return null; } catch (e) { return e.message; } }
$('#check').onclick = () => { const e = check(cur); $('#codeMsg').textContent = e || '语法正确'; $('#codeMsg').className = e ? 'err' : ''; };

// ---- 积木模式（每个玩家各自选择 文本 / 积木；积木模式下代码由积木生成） ----
const edModes = [localStorage.ed0 || 'text', localStorage.ed1 || 'text']; let blocks = null, blocksFor = -1;
function setEdMode() {
  const m = edModes[cur]; $$('#edMode button').forEach(b => b.classList.toggle('on', b.dataset.m === m));
  $('#textEd').classList.toggle('hidden', m === 'blocks'); $('#blocksEd').classList.toggle('hidden', m !== 'blocks');
  $('#keys').classList.toggle('hidden', m === 'blocks'); $('#snips').classList.toggle('hidden', m === 'blocks');
  if (m !== 'blocks') return setCode();
  if (!window.ArenaBlocks) { $('#codeMsg').textContent = '积木组件未加载'; return; }
  if (blocks && blocksFor === cur) return blocks.resize();
  if (blocks) { blocks.ws.dispose(); $('#blocklyDiv').innerHTML = ''; }
  let saved = null; try { saved = JSON.parse(localStorage['blocks' + cur]); } catch (e) {}
  const me = cur; blocksFor = cur;
  blocks = ArenaBlocks.create($('#blocklyDiv'), saved, (code, state) => { codes[me] = code; localStorage['code' + me] = code; localStorage['blocks' + me] = JSON.stringify(state); });
  if (!$('#catbar').children.length) for (const c of ArenaBlocks.CATS) { const b = document.createElement('button'); b.textContent = c.name; b.style.setProperty('--c', c.colour); b.onclick = () => blocks.openCat(c.id); $('#catbar').append(b); }
  setTimeout(() => blocks.resize(), 0);
}
$$('#edMode button').forEach(b => b.onclick = () => {
  const m = b.dataset.m; if (m === edModes[cur]) return;
  if (m === 'blocks' && !confirm('切换到积木模式后，代码将由积木生成（当前文本代码会被覆盖，可随时切回文本继续手改）。继续？')) return;
  edModes[cur] = m; localStorage['ed' + cur] = m; if (m === 'blocks') blocksFor = -1; setEdMode(); });

// ---------- 对局 ----------
let worker, watchdog;
async function startMatch() {
  const e0 = check(0); if (e0) { show('code'); $('#codeMsg').textContent = e0; $('#codeMsg').className = 'err'; return; }
  const botCode = await (await fetch(AI[$('#diff').value] || AI.normal)).text();
  worker?.terminate(); clearTimeout(watchdog); show('play'); $('#status').textContent = '模拟中'; $('#result').textContent = '';
  worker = new Worker('worker.js', { type: 'module' });
  // 看门狗：Worker 内已有逐 tick CPU 限制；这里兜底，长时间无进度就直接终止
  const arm = () => { clearTimeout(watchdog); watchdog = setTimeout(() => { worker.terminate(); $('#status').textContent = '模拟无响应，已终止'; }, 15000); }; arm();
  worker.onmessage = e => { const d = e.data; arm();
    if (d.progress) $('#status').textContent = `模拟 ${d.progress}`;
    if (d.error) { clearTimeout(watchdog); $('#status').textContent = '错误'; alert(d.error); }
    if (d.replay) { clearTimeout(watchdog); worker.terminate(); setReplay(d.replay); playing = true; updPlay(); } };
  worker.postMessage({ scripts: [codes[0], botCode], plans: [plan, []], seed: +$('#seed').value, mode: $('#mode').value });
}

// ---------- 地图视图：双指缩放 / 拖动 / 点选 ----------
const cv = $('#cv'), g = cv.getContext('2d'); let dpr = 1, view = { s: 1, x: 0, y: 0 }, fitted = false;
function resize() { dpr = window.devicePixelRatio || 1; const r = cv.getBoundingClientRect(); if (!r.width) return; cv.width = r.width * dpr; cv.height = r.height * dpr; if (!fitted) fit(); draw(); }
function fit() { const W = cv.width / dpr, H = cv.height / dpr; const top = 34, bot = 64 + (replay && !preview ? 44 : 0); const s = Math.min(W - 8, H - top - bot - 4) / (N * TS); view = { s, x: (W - N * TS * s) / 2, y: top + (H - top - bot - N * TS * s) / 2 }; fitted = true; draw(); }
window.addEventListener('resize', () => { fitted = false; resize(); });
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
let preview = false, live = false, replay = null, terr = null, frame = 0, playing = false, acc = 0, last = 0, sel = null, sheet = 'inspect';
const speeds = [0.5, 1, 2, 4, 8, 16, 32]; let si = 1;
function setReplay(r) { preview = false; live = false; replay = r; terr = terrainCanvas(r.terrain); frame = 0; $('#scrub').max = r.frames.length - 1; $('#ctl').classList.remove('hidden'); $('#status').textContent = ''; fitted = false; resize(); }
const updPlay = () => { $('#play .ic').innerHTML = IC(playing ? 'player-pause' : 'player-play'); $('#play .lb').textContent = playing ? '暂停' : '播放'; };
$('#play').onclick = () => { if (!replay || preview) return startMatch(); if (frame >= replay.frames.length - 1) frame = 0; playing = !playing; updPlay(); };
$('#step').onclick = () => { if (!replay) return; playing = false; updPlay(); frame = Math.min(replay.frames.length - 1, frame + 1); draw(); };
$('#speed').onclick = () => { si = (si + 1) % speeds.length; $('#speed .lb').textContent = speeds[si] + 'x'; };
$('#scrub').oninput = e => { frame = +e.target.value; acc = 0; draw(); };
$('#save').onclick = () => { if (!replay) return alert('还没有回放'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(replay)], { type: 'application/json' })); a.download = `arena-replay-${replay.meta.seed}.json`; a.click(); };
$('#load').onclick = () => $('#file').click(); $('#file').onchange = async e => { setReplay(JSON.parse(await e.target.files[0].text())); show('play'); };
$('#runTop').onclick = startMatch;
$('#updBtn').onclick = () => window.checkUpdate ? window.checkUpdate(true) : alert('仅安卓应用支持');
function pick(px, py) { if (!replay) return; const x = Math.floor((px - view.x) / view.s / TS), y = Math.floor((py - view.y) / view.s / TS);
  if (building) return placeAt(x, y);
  const near = replay.frames[frame].objs.filter(o => Math.abs(o.x - x) <= (view.s < 1 ? 1 : 0) && Math.abs(o.y - y) <= (view.s < 1 ? 1 : 0)).sort((a, b) => (b.t === 'Creep') - (a.t === 'Creep'));
  sel = near[0]?.id || null; if (sel) openSheet('inspect'); draw(); }
function openSheet(s) { sheet = s; $('#sheet').classList.add('on'); $$('#sheet .pnTabs button').forEach(b => b.classList.toggle('on', b.dataset.s === s)); draw(); }
$$('#sheet .pnTabs button').forEach(b => b.onclick = () => openSheet(b.dataset.s)); $('#sheetClose').onclick = () => { $('#sheet').classList.remove('on'); sel = null; draw(); };
$('#conBtn').onclick = () => $('#sheet').classList.contains('on') ? $('#sheetClose').onclick() : openSheet('p1');
const BODY = { m: 'MOVE', w: 'WORK', c: 'CARRY', a: 'ATTACK', r: 'RANGED_ATTACK', h: 'HEAL', t: 'TOUGH' };
function draw(k = 1) {
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#0e0f12'; g.fillRect(0, 0, cv.width, cv.height);
  if (!replay) return; const f = replay.frames[frame];
  g.setTransform(dpr * view.s, 0, 0, dpr * view.s, dpr * view.x, dpr * view.y); g.imageSmoothingEnabled = false;
  drawFrame(g, terr, f, replay.frames[frame - 1], k, sel); drawPlan();
  $('#tick').textContent = f.tick - 1; $('#scrub').value = frame;
  for (const p of ['p1', 'p2']) { const cs = f.objs.filter(o => o.t === 'Creep' && o.o === p).length, sp = f.objs.find(o => o.t === 'StructureSpawn' && o.o === p);
    $('#' + p + 'info').innerHTML = `${IC('users')}<span class="v">${cs}</span>${sp ? `${IC('home')}<span class="v">${sp.h}</span>${IC('bolt')}<span class="v">${sp.e}</span>` : ''}${f.score?.[p] != null ? `${IC('trophy')}<span class="v">${f.score[p]}</span>` : ''}`; }
  $('#result').textContent = preview ? '' : f.result ? (f.result.winner ? (f.result.winner === 'p1' ? '玩家 1 胜利' : '玩家 2 胜利') : '平局') : '';
  $('#result').style.color = f.result?.winner === 'p1' ? 'var(--p1)' : f.result?.winner === 'p2' ? 'var(--p2)' : '#fff';
  if (!$('#sheet').classList.contains('on')) return;
  if (sheet === 'inspect') { const o = sel && f.objs.find(o => o.id === sel);
    $('#sheetBody').textContent = o ? [`${o.t}  #${o.id}`, `pos  (${o.x}, ${o.y})`, o.o && `owner  ${o.o}`, o.h != null && `hits  ${o.h} / ${o.hm}`, o.e != null && `energy  ${o.e} / ${o.c}`, o.f != null && `fatigue  ${o.f}`, o.b && 'body  ' + o.b.split(',').map(b => BODY[b[0]] + (b.endsWith('!') ? '(x)' : '')).join(' '), o.fx && 'effects  ' + o.fx.join(' '), o.st && `${o.st} ${o.p}/${o.pt}`].filter(Boolean).join('\n') : (sel ? '（对象已不存在）' : '点地图上的对象查看详情'); }
  else $('#sheetBody').textContent = replay.frames.slice(Math.max(0, frame - 40), frame + 1).flatMap(fr => (fr.log?.[sheet] || []).map(l => `[${fr.tick - 1}] ${l}`)).join('\n') || '（无输出）';
}
function raf(t) { const dt = Math.min(100, t - last); last = t;
  if (replay && playing) { if (frame < replay.frames.length - 1) { acc += dt * speeds[si] / 200; while (acc >= 1 && frame < replay.frames.length - 1) { acc--; frame++; } draw(Math.min(1, acc)); } else if (!live) { playing = false; updPlay(); } }
  else if (pts.size) {} requestAnimationFrame(raf); }
requestAnimationFrame(raf); setTimeout(resize, 0);

// ---------- 局域网联机 ----------
let lanHost = null, lanClient = null, liveWorker = null;
$('#nick').value = localStorage.nick || ''; $('#nick').onchange = () => localStorage.nick = $('#nick').value;
const nick = () => $('#nick').value.trim() || '玩家';
const pid = localStorage.pid || (localStorage.pid = 'u' + Math.random().toString(36).slice(2, 10));
const netSt = t => $('#netStatus').textContent = t;
const lanUi = (on, host) => { $('#lanStart').classList.toggle('hidden', !host); $('#lanSend').classList.toggle('hidden', !on || host); $('#lanLeave').classList.toggle('hidden', !on); };
const showLobby = ps => $('#lobby').innerHTML = ps.map(p => `<div class="lp ${p.slot}">${p.slot === 'spectator' ? IC('eye') || IC('user') : '<i class="dot"></i>'}<b>${esc(p.name)}</b><span>${p.slot === 'p1' ? '房主' : p.slot === 'p2' ? (p.hasCode ? '已提交' : '未提交') : '观战'}</span></div>`).join('');
function liveBegin(st) { preview = false; live = true; replay = { meta: st.meta, terrain: st.terrain, frames: [st.first] }; terr = terrainCanvas(st.terrain); frame = 0; $('#scrub').max = 0; $('#ctl').classList.remove('hidden'); playing = true; updPlay(); fitted = false; show('play'); resize(); }
function liveFrame(f) { if (!replay) return; replay.frames.push(f); $('#scrub').max = replay.frames.length - 1; if (frame >= replay.frames.length - 3) si = Math.max(si, 1); $('#status').textContent = 'LAN'; }
function liveEnd() { live = false; $('#status').textContent = '结束'; replay.meta.result = replay.frames.at(-1).result; }
$('#hostBtn').onclick = async () => {
  const t = nativeTransport(); if (!t) return alert('开房需要安卓 App（浏览器无法监听端口）');
  let r; try { r = await t.plugin.start({ port: LAN_PORT, name: nick() }); } catch (e) { return alert('开房失败：' + e.message); }
  lanHost = new HostSession(t, { name: nick() }); lanHost.onLobby = showLobby; lanHost.lobby(); lanUi(true, true);
  netSt(`房间 ${(r.ips || []).join(' / ')}:${LAN_PORT}`); $('#hosts').textContent = '';
};
$('#lanStart').onclick = () => {
  const guest = lanHost?.guestCode(); if (guest == null) return alert('等待对手加入'); if (!guest) return alert('对手还没提交代码');
  const err = [0].map(check).filter(Boolean); if (err.length) return alert(err[0]);
  liveWorker?.terminate(); liveWorker = new Worker('worker.js', { type: 'module' });
  liveWorker.onmessage = e => { const d = e.data;
    if (d.start) { lanHost.start(d.start.meta, d.start.terrain, d.start.first); liveBegin(d.start); }
    if (d.frame) { lanHost.tick(d.frame); liveFrame(d.frame); }
    if (d.end) { lanHost.end(d.end.result); liveEnd(); liveWorker.terminate(); }
    if (d.error) { alert(d.error); liveWorker.terminate(); } };
  liveWorker.postMessage({ scripts: [codes[0], guest], plans: [plan, lanHost.guestPlan()], seed: +$('#seed').value, mode: $('#mode').value, live: true, dt: 200 });
};
function join(addr) {
  lanClient?.close(); const url = `ws://${addr.includes(':') ? addr : addr + ':' + LAN_PORT}`;
  lanClient = new ClientSession(url, { pid, name: nick(), code: codes[0], plan });
  lanClient.onStatus = s => { netSt(s); lanUi(s !== '连接断开' && s !== '连接失败', false); };
  lanClient.onLobby = showLobby; lanClient.onStart = liveBegin; lanClient.onTick = liveFrame; lanClient.onEnd = liveEnd;
}
$('#joinBtn').onclick = () => { const ip = $('#ip').value.trim(); if (!ip) return; localStorage.ip = ip; join(ip); };
$('#ip').value = localStorage.ip || '';
$('#lanSend').onclick = () => { const e = check(cur); if (e) return alert(e); lanClient?.sendCode(codes[0], plan); netSt('代码已提交'); };
$('#findBtn').onclick = async () => {
  const t = nativeTransport(); if (!t) return alert('搜索需要安卓 App；也可以手动输入 IP');
  $('#hosts').textContent = '搜索中'; try { const r = await t.plugin.discover({ timeout: 3500 }); $('#hosts').textContent = r.hosts.length ? '' : '未找到房间';
    for (const h of r.hosts) { const b = document.createElement('button'); b.textContent = `${h.name} · ${h.ip}`; b.onclick = () => { $('#ip').value = h.ip; join(`${h.ip}:${h.port}`); }; $('#hosts').append(b); } }
  catch (e) { $('#hosts').textContent = '搜索失败：' + e.message; }
};
$('#lanLeave').onclick = async () => { lanClient?.close(); lanClient = null; liveWorker?.terminate(); if (lanHost) { try { await lanHost.t.plugin.stop(); } catch (e) {} lanHost = null; } lanUi(false, false); $('#lobby').textContent = ''; netSt('未连接'); };

// ---------- 地图预览 + 建造规划 ----------
function buildPreview() {
  localStorage.mode = $('#mode').value; localStorage.seed = $('#seed').value;
  if (live) return; const w = MODES[$('#mode').value]({ seed: +$('#seed').value || 1, players: ['p1', 'p2'] });
  const f = w.snapshot(); preview = true; replay = { meta: { seed: +$('#seed').value }, terrain: Array.from(w.terrain), frames: [f] }; terr = terrainCanvas(replay.terrain); frame = 0;
  $('#ctl').classList.add('hidden'); playing = false; updPlay(); $('#status').textContent = ''; fitted = false; resize();
}
$('#mode').onchange = $('#seed').onchange = buildPreview;
let plan = []; try { plan = JSON.parse(localStorage.plan || '[]'); } catch (e) {}
let building = false, btype = PLAN_TYPES[0];
const PN = { StructureWall: '墙', StructureRampart: '城墙', StructureRoad: '道路', StructureContainer: '容器', StructureExtension: '扩展', StructureTower: '塔' };
for (const t of PLAN_TYPES) { const b = document.createElement('button'); b.textContent = PN[t]; b.dataset.t = t; b.onclick = () => { btype = t; $$('#bpList button').forEach(x => x.classList.toggle('on', x === b)); }; $('#bpList').append(b); }
$('#bpList button').classList.add('on');
const mySpawn = () => replay?.frames[frame]?.objs.find(o => o.t === 'StructureSpawn' && o.o === 'p1');
const updBB = () => $('#bbMsg').textContent = `${plan.length}/10`;
$('#btnBuild').onclick = () => { if (!replay || !preview) buildPreview(); building = !building; $('#buildBar').classList.toggle('hidden', !building); $('#btnBuild').classList.toggle('on', building); openPanel(null); updBB(); draw(); };
$('#bbDone').onclick = () => $('#btnBuild').onclick();
$('#bbClear').onclick = () => { plan = []; localStorage.plan = '[]'; updBB(); draw(); };
function placeAt(x, y) { const sp = mySpawn(); if (!sp) return; const dx = x - sp.x, dy = y - sp.y;
  const i = plan.findIndex(p => p.dx === dx && p.dy === dy); if (i >= 0) plan.splice(i, 1); else if (plan.length < 10 && replay.terrain[y * N + x] !== 1) plan.push({ dx, dy, type: btype });
  localStorage.plan = JSON.stringify(plan); updBB(); draw(); }
function drawPlan() { if (!preview && !building) return; const sp = mySpawn(); if (!sp) return;
  g.save(); g.setLineDash([2, 2]); g.lineWidth = 1; g.strokeStyle = '#7ee2a0';
  for (const p of plan) { const x = (sp.x + p.dx) * TS, y = (sp.y + p.dy) * TS; g.strokeRect(x + 0.5, y + 0.5, TS - 1, TS - 1); g.fillStyle = '#7ee2a0'; g.font = '6px sans-serif'; g.fillText(PN[p.type][0], x + 1.5, y + 6.5); }
  g.restore(); }
buildPreview();

(async () => { if (!codes[0]) await loadTpl(0, Object.keys(BOTS)[0]); setCode(); setEdMode(); })();
