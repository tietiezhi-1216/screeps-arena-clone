// Screeps Arena（移动版）v0.8：首页 → 我的脚本（选择/编辑） → 模式 → 人机难度 / 局域网 → 对局。仅积木编程；脚本库保存在本地，每个脚本标注竞技场。
import { TS, N, terrainCanvas, drawFrame } from './render.js';
import { transformModule } from './src/engine/sandbox.js';
import { HostSession, ClientSession, nativeTransport, LAN_PORT } from './src/net/lan.js';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const IC = n => (window.icon ? window.icon(n) : '');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
window.applyIcons?.();
$('#ver').textContent = 'v' + (window.APP_VERSION || 'dev');

let blocks = null, code = '', lanHost = null, lanClient = null, liveWorker = null;
// ---------- 存储：脚本库（localStorage）+ 回放（IndexedDB） ----------
const KS = { lib: 'sa.scripts', cur: 'sa.cur', level: 'sa.level', nick: 'sa.nick', ip: 'sa.ip' };
const MODES = [
  { id: 'spawn-and-swamp', name: '出生与沼泽', d: '摧毁敌方 Spawn', cover: 'cover-swamp.jpg' },
  { id: 'capture-the-flag', name: '夺旗', d: '夺取全部旗帜', cover: 'cover-flag.jpg' },
  { id: 'collect-and-control', name: '收集与控制', d: '收集分数送入收集器', cover: 'cover-collect.jpg' },
];
const MN = Object.fromEntries(MODES.map(m => [m.id, m.name]));
const arenaName = (mode, level) => `${MN[mode] || mode} · ${level === 2 ? '高级' : '基础'}`;
let lib = []; try { lib = JSON.parse(localStorage[KS.lib] || '[]'); } catch (e) {}
if (!lib.length) { // 从 v0.7 的“每竞技场一份”迁移
  for (const m of MODES) for (const lv of [1, 2]) { const k = `sa.ws.${m.id}${lv === 2 ? '-advanced' : ''}`; const ws = localStorage[k]; if (ws && ws !== 'null' && ws.includes('blocks')) lib.push({ id: 's' + Date.now().toString(36) + lib.length, name: arenaName(m.id, lv), mode: m.id, level: lv, ws: JSON.parse(ws), t: Date.now() }); }
}
const saveLib = () => { localStorage[KS.lib] = JSON.stringify(lib); };
const state = { vs: 'ai', mode: 'spawn-and-swamp', level: +localStorage[KS.level] || 1, diff: 'normal', cur: localStorage[KS.cur] || lib[0]?.id || null };
const curScript = () => lib.find(s => s.id === state.cur) || null;
const idb = new Promise(res => { const r = indexedDB.open('screeps-arena', 1); r.onupgradeneeded = () => r.result.createObjectStore('replays', { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = () => res(null); });
const tx = async (mode, fn) => { const db = await idb; if (!db) return null; return new Promise(res => { const t = db.transaction('replays', mode); const q = fn(t.objectStore('replays')); t.oncomplete = () => res(q?.result); t.onerror = () => res(null); }); };
async function saveReplay(r) {
  const id = Date.now(); await tx('readwrite', s => s.put({ id, mode: r.meta.mode, ticks: r.meta.ticks, result: r.meta.result, vs: state.vs, script: curScript()?.name, data: r }));
  const all = (await tx('readonly', s => s.getAll())) || []; all.sort((a, b) => b.id - a.id); for (const x of all.slice(20)) await tx('readwrite', s => s.delete(x.id));
}

// ---------- 导航 ----------
const stack = ['home'];
function go(id, push = true) { $$('.screen').forEach(s => s.classList.toggle('on', s.id === id)); if (push && stack.at(-1) !== id) stack.push(id); if (id === 'match') resize(); if (id === 'editor') setTimeout(() => blocks?.resize(), 0); if (id === 'home') renderHome(); if (id === 'scripts') renderLib(); }
function back() { if ($('#sheet:not(.hidden),#dlg:not(.hidden)')) return closeDlg(); if (stack.length > 1) stack.pop(); const id = stack.at(-1); if (['lobby', 'setup', 'modes', 'home'].includes(id)) stopLive(); go(id, false); }
$$('[data-back]').forEach(b => b.onclick = back);
window.Capacitor?.Plugins?.App?.addListener?.('backButton', () => (stack.length > 1 || !$('#dlg').classList.contains('hidden') ? back() : window.Capacitor.Plugins.App.exitApp?.()));

// ---------- 对话框 ----------
let dlgOk = null;
function closeDlg() { $('#dlg').classList.add('hidden'); $('#sheet').classList.add('hidden'); }
function dialog(title, html, ok, okText = '确定') { $('#dlgT').textContent = title; $('#dlgB').innerHTML = html; $('#dlgOk').textContent = okText; dlgOk = ok; $('#dlg').classList.remove('hidden'); window.applyIcons?.($('#dlgB')); }
$('#dlgNo').onclick = closeDlg; $('#dlgOk').onclick = () => { if (dlgOk?.() !== false) closeDlg(); };
$('#dlg').onclick = e => { if (e.target.id === 'dlg') closeDlg(); }; $('#sheet').onclick = e => { if (e.target.id === 'sheet') closeDlg(); };
const segHtml = (id, opts, v) => `<div class="seg" id="${id}">${opts.map(([k, t]) => `<button data-v="${k}" class="${k == v ? 'on' : ''}">${t}</button>`).join('')}</div>`;
const segVal = id => $(`#${id} .on`)?.dataset.v;
document.addEventListener('click', e => { const b = e.target.closest('#dlgB .seg button'); if (!b) return; b.parentNode.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); });

// ---------- 首页 ----------
function renderHome() { const s = curScript(); $('#homeCur').innerHTML = `<span class="k">出战脚本</span><span class="n">${s ? esc(s.name) : '未选择'}</span>`; }
renderHome();
$('#goStart').onclick = $('#goScripts').onclick = () => go('scripts');

// ---------- 我的脚本 ----------
const fmt = t => { const d = new Date(t), z = n => String(n).padStart(2, '0'); return `${d.getMonth() + 1}/${d.getDate()} ${z(d.getHours())}:${z(d.getMinutes())}`; };
function renderLib() {
  const L = $('#slist'); L.innerHTML = ''; L.classList.toggle('list', lib.length > 0);
  if (!lib.length) L.innerHTML = '<div class="empty">还没有脚本，点右上角新建</div>';
  for (const s of [...lib].sort((a, b) => b.t - a.t)) {
    const n = s.ws?.blocks?.blocks?.length || 0; const el = document.createElement('div'); el.className = 'item' + (s.id === state.cur ? ' on' : '');
    el.innerHTML = `<span class="rd"></span><div class="it"><div class="in">${esc(s.name)}</div><div class="is"><span class="tag">${arenaName(s.mode, s.level)}</span>${fmt(s.t)}</div></div><button class="sm" data-icon="dots-vertical"></button>`;
    el.onclick = e => { if (e.target.closest('.sm')) return more(s); state.cur = s.id; localStorage[KS.cur] = s.id; renderLib(); };
    L.append(el);
  }
  window.applyIcons?.(L); $('#scEdit').disabled = $('#scNext').disabled = !curScript();
}
function newScript(base) {
  const mode = base?.mode || MODES[0].id, level = base?.level || 1;
  dialog(base ? '复制脚本' : '新建脚本', `<input id="fName" maxlength="24" value="${esc(base ? base.name + ' 副本' : '脚本 ' + (lib.length + 1))}">${segHtml('fMode', MODES.map(m => [m.id, m.name]), mode)}${segHtml('fLevel', [[1, '基础'], [2, '高级']], level)}`, () => {
    const name = $('#fName').value.trim(); if (!name) return false;
    const s = { id: 's' + Date.now().toString(36), name, mode: segVal('fMode'), level: +segVal('fLevel'), ws: base ? JSON.parse(JSON.stringify(base.ws || null)) : null, t: Date.now() };
    lib.push(s); saveLib(); state.cur = s.id; localStorage[KS.cur] = s.id; renderLib(); if (!base) openEditor();
  }, base ? '复制' : '创建');
}
function more(s) {
  $('#sheetB').innerHTML = `<button data-a="edit" data-icon="pencil"><span class="lb">编辑积木</span></button><button data-a="ren" data-icon="cursor-text"><span class="lb">重命名 / 竞技场</span></button><button data-a="dup" data-icon="copy"><span class="lb">复制</span></button><button data-a="del" class="danger" data-icon="trash"><span class="lb">删除</span></button>`;
  window.applyIcons?.($('#sheetB')); $('#sheet').classList.remove('hidden');
  $('#sheetB').onclick = e => { const a = e.target.closest('button')?.dataset.a; if (!a) return; closeDlg(); state.cur = s.id; localStorage[KS.cur] = s.id;
    if (a === 'edit') openEditor();
    if (a === 'dup') newScript(s);
    if (a === 'ren') dialog('重命名', `<input id="fName" maxlength="24" value="${esc(s.name)}">${segHtml('fMode', MODES.map(m => [m.id, m.name]), s.mode)}${segHtml('fLevel', [[1, '基础'], [2, '高级']], s.level)}`, () => { const n = $('#fName').value.trim(); if (!n) return false; s.name = n; s.mode = segVal('fMode'); s.level = +segVal('fLevel'); saveLib(); renderLib(); });
    if (a === 'del') dialog('删除脚本', `<div class="state">删除「${esc(s.name)}」？此操作无法撤销</div>`, () => { lib = lib.filter(x => x !== s); saveLib(); if (state.cur === s.id) { state.cur = lib[0]?.id || null; localStorage[KS.cur] = state.cur || ''; } renderLib(); }, '删除');
    renderLib(); };
}
$('#newScript').onclick = () => newScript();
$('#scEdit').onclick = () => curScript() && openEditor();
$('#scNext').onclick = () => { const s = curScript(); if (!s) return; state.level = s.level; setLevel(s.level); renderModes(); go('modes'); };

// ---------- 模式 ----------
const seg = (id, cb) => { const el = $(id); const set = v => { $$(id + ' button').forEach(b => b.classList.toggle('on', b.dataset.v == v)); }; el.onclick = e => { const b = e.target.closest('button'); if (!b) return; set(b.dataset.v); cb(b.dataset.v); }; return set; };
const setLevel = seg('#level', v => { state.level = +v; localStorage[KS.level] = v; });
setLevel(state.level);
function renderModes() { const s = curScript(); $('#mcards').innerHTML = '';
  for (const m of MODES) { const b = document.createElement('button'); b.className = 'mc'; b.style.backgroundImage = `url(${m.cover})`;
    b.innerHTML = `${s?.mode === m.id ? '<span class="badge">脚本适用</span>' : ''}<div class="cap"><span class="mt">${m.name}</span><span class="md">${m.d}</span></div>`;
    b.onclick = () => { state.mode = m.id; $('#setupTitle').textContent = arenaName(m.id, state.level); $('#banner').style.backgroundImage = `url(${m.cover})`; go('setup'); }; $('#mcards').append(b); } }
renderModes();
$$('#aiList .row').forEach(b => b.onclick = () => { state.vs = 'ai'; state.diff = b.dataset.diff; startAi(); });
$('#goLan').onclick = () => { state.vs = 'lan'; go('lobby'); scan(); };
const modeId = () => `${state.mode}${state.level === 2 ? '-advanced' : ''}`;

// ---------- 积木编辑器 ----------
function openEditor() { const s = curScript(); if (!s) return; $('#edName').textContent = s.name; go('editor'); if (blocks) blocks.load(s.ws); else initBlocks(); refreshCode(); setTimeout(() => { blocks?.resize(); if (blocks?.count()) blocks.center(); }, 30); }
function refreshCode() { code = blocks?.code?.() || ''; $('#edEmpty').classList.toggle('hidden', !!blocks && blocks.count() > 0); }
function initBlocks() {
  if (!window.ArenaBlocks) return;
  blocks = ArenaBlocks.create($('#blocklyDiv'), curScript()?.ws || null, (c, st) => { code = c; const s = curScript(); if (s && stack.at(-1) === 'editor') { s.ws = st; s.t = Date.now(); saveLib(); } $('#edEmpty').classList.toggle('hidden', !!blocks && blocks.count() > 0); lanClient?.sendCode(code); });
  for (const c of ArenaBlocks.CATS) { const b = document.createElement('button'); b.textContent = c.name; b.style.setProperty('--c', c.colour); b.dataset.c = c.id; b.onclick = () => blocks.openCat(c.id); $('#cats').append(b); }
  blocks.onFly = id => { $$('#cats button').forEach(b => b.classList.toggle('on', b.dataset.c === id)); $('#editor').classList.toggle('fly', !!id); };
}
// 加载出战脚本的代码（不进入编辑器也能出战）
function loadCode() { const s = curScript(); if (!s) { code = ''; return; } if (!blocks) initBlocks(); blocks?.load(s.ws); code = blocks?.code?.() || ''; }
$('#edDone').onclick = $('#edBack').onclick = () => { if (blocks?.isOpen()) return blocks.closeCat(); back(); };
$('#edUndo').onclick = () => blocks.undo(false); $('#edRedo').onclick = () => blocks.undo(true);
$('#edZin').onclick = () => blocks.zoom(1); $('#edZout').onclick = () => blocks.zoom(-1); $('#edTrash').onclick = () => blocks.deleteSelected();
const myCode = () => code || 'export function loop() {}\n';
const checkCode = () => { try { transformModule(myCode()); return null; } catch (e) { return e.message; } };

// ---------- 对局视图 ----------
const cv = $('#cv'), g = cv.getContext('2d'); let dpr = 1, view = { s: 1, x: 0, y: 0 }, fitted = false;
let replay = null, terr = null, frame = 0, playing = false, acc = 0, last = 0, sel = null, live = false;
const speeds = [1, 2, 4, 8]; let si = 0;
function resize() { dpr = window.devicePixelRatio || 1; const r = cv.getBoundingClientRect(); if (!r.width) return; cv.width = r.width * dpr; cv.height = r.height * dpr; if (!fitted) fit(); draw(); }
function fit() { const W = cv.width / dpr, H = cv.height / dpr, land = W > H, top = 40, bot = land ? 8 : 62, right = land ? 228 : 0; const s = Math.min(W - right - 16, H - top - bot) / (N * TS); view = { s, x: (W - right - N * TS * s) / 2, y: top + (H - top - bot - N * TS * s) / 2 }; fitted = true; }
window.addEventListener('resize', () => { fitted = false; resize(); });
const pts = new Map(); let gesture = null, moved = 0;
cv.onpointerdown = e => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.offsetX, y: e.offsetY }); moved = 0; startG(); };
function startG() { const p = [...pts.values()]; if (p.length === 1) gesture = { one: p[0], v: { ...view } }; else if (p.length >= 2) { const [a, b] = p; gesture = { mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, d: Math.hypot(a.x - b.x, a.y - b.y), v: { ...view } }; } }
cv.onpointermove = e => { if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.offsetX, y: e.offsetY }); const p = [...pts.values()];
  if (p.length === 1 && gesture?.one) { const dx = p[0].x - gesture.one.x, dy = p[0].y - gesture.one.y; moved = Math.max(moved, Math.abs(dx) + Math.abs(dy)); view.x = gesture.v.x + dx; view.y = gesture.v.y + dy; }
  else if (p.length >= 2 && gesture?.mid) { moved = 99; const [a, b] = p, mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, k = Math.hypot(a.x - b.x, a.y - b.y) / gesture.d; zoomAt(gesture.v, gesture.mid, mid, k); }
  draw(); };
function zoomAt(v0, from, to, k) { const s = Math.max(0.3, Math.min(14, v0.s * k)); const wx = (from.x - v0.x) / v0.s, wy = (from.y - v0.y) / v0.s; view = { s, x: to.x - wx * s, y: to.y - wy * s }; }
const up = e => { const was = pts.size; pts.delete(e.pointerId); if (was === 1 && moved < 8) pick(e.offsetX, e.offsetY); startG(); };
cv.onpointerup = up; cv.onpointercancel = up;
cv.onwheel = e => { e.preventDefault(); const p = { x: e.offsetX, y: e.offsetY }; zoomAt(view, p, p, e.deltaY < 0 ? 1.15 : 1 / 1.15); draw(); };
const NAMES = { Creep: 'Creep', StructureSpawn: 'Spawn', StructureTower: 'Tower', StructureContainer: 'Container', StructureExtension: 'Extension', StructureRampart: 'Rampart', StructureWall: 'Wall', StructureRoad: 'Road', Source: 'Source', Resource: 'Resource', Flag: 'Flag', BodyPart: 'BodyPart', ScoreCollector: 'ScoreCollector', ConstructionSite: 'ConstructionSite', EffectZone: 'Zone' };
const BODY = { m: 'MOVE', w: 'WORK', c: 'CARRY', a: 'ATTACK', r: 'RANGED', h: 'HEAL', t: 'TOUGH' };
function pick(px, py) { if (!replay) return; const x = Math.floor((px - view.x) / view.s / TS), y = Math.floor((py - view.y) / view.s / TS), r = view.s < 1.2 ? 1 : 0;
  const near = replay.frames[frame].objs.filter(o => Math.abs(o.x - x) <= r && Math.abs(o.y - y) <= r && o.t !== 'EffectZone').sort((a, b) => (b.t === 'Creep') - (a.t === 'Creep'));
  sel = near[0]?.id || null; draw(); }
function inspect(f) {
  const o = sel && f.objs.find(o => o.id === sel); $('#inspect').classList.toggle('hidden', !o); if (!o) return;
  const kv = (k, v) => v == null ? '' : `<div class="kv"><span>${k}</span><b>${v}</b></div>`;
  $('#inspect').innerHTML = `<div class="t">${NAMES[o.t] || o.t}${o.o ? ` · ${o.o === 'p1' ? '我方' : '对方'}` : ''}</div>${kv('位置', `${o.x}, ${o.y}`)}${o.h != null ? kv('生命', `${o.h} / ${o.hm}`) : ''}${o.e != null && o.t !== 'Creep' ? kv('能量', o.c ? `${o.e} / ${o.c}` : o.e) : ''}${o.b ? kv('身体', o.b.split(',').map(b => BODY[b[0]]).join(' ')) : ''}${o.sc ? kv('分数', `${o.sc.p1 || 0} : ${o.sc.p2 || 0}`) : ''}`;
}
function scoreOf(f, p) {
  if (f.score) return f.score[p] || 0;
  const cols = f.objs.filter(o => o.t === 'ScoreCollector'); if (cols.length) return cols.reduce((a, c) => a + (c.sc?.[p] || 0), 0);
  const flags = f.objs.filter(o => o.t === 'Flag'); if (flags.length) return flags.filter(o => o.o === p).length;
  return f.objs.filter(o => o.t === 'Creep' && o.o === p && !o.sp).length;
}
function draw(k = 1) {
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#141b26'; g.fillRect(0, 0, cv.width, cv.height);
  if (!replay) return; const f = replay.frames[frame];
  g.setTransform(dpr * view.s, 0, 0, dpr * view.s, dpr * view.x, dpr * view.y);
  drawFrame(g, terr, f, replay.frames[frame - 1], k, sel);
  $('#tick').textContent = f.tick - 1; $('#energy').textContent = f.objs.filter(o => o.o === 'p1' && (o.t === 'StructureSpawn' || o.t === 'StructureExtension')).reduce((a, o) => a + (o.e || 0), 0); runSt(); $('#scrub').value = frame; $('#s1').textContent = scoreOf(f, 'p1'); $('#s2').textContent = scoreOf(f, 'p2');
  inspect(f);
  if (f.result && frame === replay.frames.length - 1 && !live) showResult(f.result);
}
function showResult(r) {
  if (!$('#result').classList.contains('hidden')) return;
  const me = 'p1', win = r.winner === me, draw_ = !r.winner;
  $('#resTitle').textContent = draw_ ? '平局' : win ? '胜利' : '失败'; $('#resTitle').style.color = draw_ ? '#fff' : win ? 'var(--acc)' : 'var(--mute)';
  $('#resSub').textContent = (!draw_ && !win && r.reason === 'spawn destroyed') ? '我方 Spawn 被摧毁' : (!draw_ && !win && r.reason === 'all flags captured') ? '对方夺得全部旗帜' : (!draw_ && !win && r.reason === 'all enemy creeps destroyed') ? '我方全灭' : (REASON[r.reason] || r.reason || ''); $('#result').classList.remove('hidden');
}
const REASON = { 'spawn destroyed': '敌方 Spawn 被摧毁', timeout: '时间到', 'all flags captured': '夺得全部旗帜', 'all enemy creeps destroyed': '敌方全灭', 'score collected': '分数达成', 'timeout (higher score)': '时间到 · 分数领先', 'timeout (score tie)': '时间到 · 分数相同' };
const runSt = () => { const end = replay && !live && frame >= replay.frames.length - 1, el = $('#runSt'); el.textContent = end ? '已结束' : playing ? '运行中' : '已暂停'; el.className = 'st' + (end ? ' end' : playing ? '' : ' pause'); };
const updPlay = () => { runSt(); $('#play .ic').innerHTML = IC(playing ? 'player-pause' : 'player-play'); };
$('#play').onclick = () => { if (!replay) return; if (frame >= replay.frames.length - 1 && !live) { frame = 0; $('#result').classList.add('hidden'); } playing = !playing; updPlay(); };
$('#speed').onclick = () => { si = (si + 1) % speeds.length; $('#speed').textContent = speeds[si] + 'x'; };
$('#scrub').oninput = e => { frame = +e.target.value; acc = 0; $('#result').classList.add('hidden'); draw(); };
$('#mClose').onclick = $('#resBack').onclick = () => { playing = false; stopLive(); $('#result').classList.add('hidden'); back(); };
$('#resAgain').onclick = () => { $('#result').classList.add('hidden'); if (state.vs === 'ai') startAi(); else back(); };
function setReplay(r, keep) { replay = r; terr = terrainCanvas(r.terrain); frame = 0; acc = 0; sel = null; $('#scrub').max = r.frames.length - 1; $('#result').classList.add('hidden'); fitted = false; if (!keep) { playing = true; updPlay(); } resize(); }
function raf(t) { const dt = Math.min(100, t - last); last = t;
  if (replay && playing) { if (frame < replay.frames.length - 1) { acc += dt * speeds[si] / 150; while (acc >= 1 && frame < replay.frames.length - 1) { acc--; frame++; } draw(Math.min(1, acc)); } else if (!live) { playing = false; updPlay(); draw(); } }
  requestAnimationFrame(raf); }
requestAnimationFrame(raf);

// ---------- 人机练习 ----------
let worker = null;
async function startAi() {
  loadCode(); const err = checkCode(); if (err) { alert('积木生成的代码有误：' + err); return openEditor(); }
  const ai = await (await fetch(`bots/ai/${state.diff}.mjs`)).text();
  worker?.terminate(); replay = null; go('match'); $('#busy').classList.remove('hidden'); $('#busyT').textContent = '模拟中';
  worker = new Worker('worker.js', { type: 'module' });
  let dog = setTimeout(() => { worker.terminate(); $('#busyT').textContent = '模拟超时'; }, 120000);
  worker.onmessage = e => { const d = e.data;
    if (d.progress) $('#busyT').textContent = `模拟中 ${d.progress}`;
    if (d.error) { clearTimeout(dog); $('#busy').classList.add('hidden'); alert(d.error); }
    if (d.replay) { clearTimeout(dog); worker.terminate(); $('#busy').classList.add('hidden'); d.replay.meta.vs = 'ai:' + state.diff; setReplay(d.replay); saveReplay(d.replay); } };
  worker.postMessage({ scripts: [myCode(), ai], seed: 1 + (Date.now() % 9973), mode: modeId() });
}

// ---------- 局域网 ----------
const nick = () => localStorage[KS.nick] || ('玩家' + (localStorage.pid || '').slice(-3));
const pid = localStorage.pid || (localStorage.pid = 'u' + Math.random().toString(36).slice(2, 10));
const netState = t => $('#netState').textContent = t;
function players(ps) { $('#rooms').innerHTML = ''; $('#players').innerHTML = ps.map(p => `<div class="row"><span class="lb">${esc(p.name)}</span><span class="v">${p.slot === 'p1' ? '房主' : p.slot === 'p2' ? (p.hasCode ? '已就绪' : '准备中') : '观战'}</span></div>`).join(''); }
function lobbyMode(m) { // idle | host | client
  $('#lobbyMain').classList.toggle('hidden', m === 'client'); $('#lobbyMain .lb').textContent = m === 'host' ? '开始对局' : '创建房间';
  $('#lobbyMain .ic').innerHTML = IC(m === 'host' ? 'player-play' : 'home'); $('#showManual').classList.toggle('hidden', m !== 'idle'); $('#scan').classList.toggle('hidden', m !== 'idle');
}
lobbyMode('idle');
async function scan() {
  if (lanHost || lanClient) return; const t = nativeTransport(); $('#players').innerHTML = '';
  if (!t) { netState('需要在安卓 App 内使用局域网'); $('#rooms').innerHTML = ''; return; }
  netState('正在搜索房间'); try { const r = await t.plugin.discover({ timeout: 3000 });
    $('#rooms').innerHTML = ''; netState(r.hosts.length ? '选择一个房间加入' : '附近没有房间，可以创建一个');
    for (const h of r.hosts) { const b = document.createElement('button'); b.className = 'row'; b.innerHTML = `<span class="lb">${esc(h.name)}</span><span class="v">${h.ip}</span>`; b.onclick = () => join(`${h.ip}:${h.port}`); $('#rooms').append(b); } }
  catch (e) { netState('搜索失败'); }
}
$('#scan').onclick = scan;
$('#showManual').onclick = () => { $('#manual').classList.toggle('hidden'); $('#ip').value = localStorage[KS.ip] || ''; };
$('#joinIp').onclick = () => { const ip = $('#ip').value.trim(); if (!ip) return; localStorage[KS.ip] = ip; join(ip); };
$('#lobbyMain').onclick = async () => {
  if (lanHost) return hostStart();
  const t = nativeTransport(); if (!t) return netState('需要在安卓 App 内创建房间');
  let r; try { r = await t.plugin.start({ port: LAN_PORT, name: nick() }); } catch (e) { return netState('创建失败：' + e.message); }
  lanHost = new HostSession(t, { name: nick() }); lanHost.onLobby = players; lanHost.lobby(); lobbyMode('host'); $('#manual').classList.add('hidden');
  netState(`房间已创建 · ${(r.ips || [])[0] || ''}`);
};
function hostStart() { loadCode();
  const guest = lanHost.guestCode(); if (guest == null) return netState('等待对手加入'); if (!guest) return netState('对手还在搭积木');
  const err = checkCode(); if (err) return netState('我的积木有误');
  liveWorker?.terminate(); liveWorker = new Worker('worker.js', { type: 'module' });
  liveWorker.onmessage = e => { const d = e.data;
    if (d.start) { lanHost.start(d.start.meta, d.start.terrain, d.start.first); liveBegin(d.start); }
    if (d.frame) { lanHost.tick(d.frame); liveFrame(d.frame); }
    if (d.end) { lanHost.end(d.end.result); liveEnd(); liveWorker.terminate(); }
    if (d.error) { netState('模拟出错'); liveWorker.terminate(); } };
  liveWorker.postMessage({ scripts: [myCode(), guest], seed: 1 + (Date.now() % 9973), mode: modeId(), live: true, dt: 150 });
}
function join(addr) { loadCode();
  lanClient?.close(); const url = `ws://${addr.includes(':') ? addr : addr + ':' + LAN_PORT}`;
  lanClient = new ClientSession(url, { pid, name: nick(), code: myCode() }); lobbyMode('client'); netState('正在连接');
  lanClient.onStatus = s => { netState(s === '已加入，你是玩家 2' ? '已加入 · 等待房主开始' : s); if (s === '连接断开' || s === '连接失败') { lanClient = null; lobbyMode('idle'); } };
  lanClient.onLobby = players; lanClient.onStart = liveBegin; lanClient.onTick = liveFrame; lanClient.onEnd = liveEnd;
}
function liveBegin(st) { live = true; go('match'); $('#busy').classList.add('hidden'); setReplay({ meta: st.meta, terrain: st.terrain, frames: [st.first] }); }
function liveFrame(f) { if (!replay) return; replay.frames.push(f); $('#scrub').max = replay.frames.length - 1; if (playing && frame >= replay.frames.length - 4) frame = replay.frames.length - 2; }
function liveEnd(res) { live = false; if (replay) { replay.meta.result = replay.frames.at(-1).result || res; replay.meta.ticks = replay.frames.length - 1; replay.meta.mode = replay.meta.mode || modeId(); saveReplay(replay); } }
async function stopLive() { liveWorker?.terminate(); liveWorker = null; lanClient?.close(); lanClient = null; if (lanHost) { try { await lanHost.t.plugin.stop(); } catch (e) {} lanHost = null; } live = false; lobbyMode('idle'); $('#players').innerHTML = ''; netState(''); }

// ---------- 回放 ----------
$('#goReplays').onclick = async () => { go('replays'); const all = ((await tx('readonly', s => s.getAll())) || []).sort((a, b) => b.id - a.id);
  const name = m => arenaName((m || '').replace(/-advanced$/, ''), /-advanced$/.test(m || '') ? 2 : 1);
  const dt = t => { const d = new Date(t), z = n => String(n).padStart(2, '0'); return `${d.getMonth() + 1}/${d.getDate()} ${z(d.getHours())}:${z(d.getMinutes())}`; };
  $('#rlist').innerHTML = all.length ? '' : '<div class="empty">还没有回放</div>';
  for (const r of all) { const b = document.createElement('button'); b.className = 'item'; const w = r.result?.winner; b.innerHTML = `<div class="it"><div class="in">${name(r.mode)}</div><div class="is"><span class="tag">${!w ? '平局' : w === 'p1' ? '胜' : '负'}</span>${esc(r.script || '')} ${dt(r.id)}</div></div>`;
    b.onclick = () => { state.vs = 'replay'; go('match'); $('#busy').classList.add('hidden'); setReplay(r.data); }; $('#rlist').append(b); } };
