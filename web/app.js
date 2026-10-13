import { TS, N, terrainCanvas, drawFrame } from './render.js';
const $ = s => document.querySelector(s);
const BOTS = { 'rush（近战冲锋）': '../bots/rush.mjs', 'kite（远程风筝）': '../bots/kite.mjs' };
const cv = $('#cv'); cv.width = cv.height = N * TS; const g = cv.getContext('2d');
let replay = null, terr = null, frame = 0, playing = false, speed = 1, acc = 0, last = 0, sel = null, conP = 'p1';
document.querySelectorAll('nav button').forEach(b => b.onclick = () => { document.querySelectorAll('nav button,.tab').forEach(e => e.classList.remove('on')); b.classList.add('on'); $('#tab-' + b.dataset.tab).classList.add('on'); });
document.querySelectorAll('.ctabs button').forEach(b => b.onclick = () => { document.querySelectorAll('.ctabs button').forEach(e => e.classList.remove('on')); b.classList.add('on'); conP = b.dataset.p; show(); });
async function loadBot(i, name) { const t = await (await fetch(BOTS[name])).text(); $('#code' + i).value = t; localStorage['code' + i] = t; }
document.querySelectorAll('select').forEach((s, i) => { for (const k in BOTS) s.add(new Option(k, k)); s.selectedIndex = i; s.onchange = () => loadBot(i, s.value); });
for (const i of [0, 1]) { const ta = $('#code' + i); if (localStorage['code' + i]) ta.value = localStorage['code' + i]; else loadBot(i, Object.keys(BOTS)[i]); ta.oninput = () => localStorage['code' + i] = ta.value;
  ta.onkeydown = e => { if (e.key === 'Tab') { e.preventDefault(); ta.setRangeText('  ', ta.selectionStart, ta.selectionEnd, 'end'); } }; }
let worker;
$('#run').onclick = () => {
  worker?.terminate(); worker = new Worker('worker.js', { type: 'module' }); $('#status').textContent = '模拟中…'; $('#result').textContent = '';
  const timer = setTimeout(() => { worker.terminate(); $('#status').textContent = '超时：脚本可能死循环'; }, 120000);
  worker.onmessage = e => { const d = e.data; if (d.progress) $('#status').textContent = `模拟中… tick ${d.progress}`;
    if (d.error) { clearTimeout(timer); $('#status').textContent = '错误: ' + d.error; }
    if (d.replay) { clearTimeout(timer); setReplay(d.replay); playing = true; } };
  worker.postMessage({ scripts: [$('#code0').value, $('#code1').value], seed: +$('#seed').value, mode: 'spawn-and-swamp' });
};
function setReplay(r) { replay = r; terr = terrainCanvas(r.terrain); frame = 0; $('#scrub').max = r.frames.length - 1; $('#tmax').textContent = r.meta.arena.ticksLimit; $('#status').textContent = `完成：${r.meta.ticks} tick`; show(); }
$('#play').onclick = () => playing = !playing;
const speeds = [0.25, 0.5, 1, 2, 4, 8, 16, 32]; let si = 2; const setSp = d => { si = Math.max(0, Math.min(speeds.length - 1, si + d)); speed = speeds[si]; $('#speed').textContent = speed + '×'; };
$('#faster').onclick = () => setSp(1); $('#slower').onclick = () => setSp(-1);
$('#scrub').oninput = e => { frame = +e.target.value; acc = 0; show(); };
$('#save').onclick = () => { if (!replay) return; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(replay)])); a.download = `replay-${replay.meta.seed}.json`; a.click(); };
$('#load').onclick = () => $('#file').click(); $('#file').onchange = async e => setReplay(JSON.parse(await e.target.files[0].text()));
cv.onclick = e => { if (!replay) return; const r = cv.getBoundingClientRect(), x = Math.floor((e.clientX - r.left) / r.width * N), y = Math.floor((e.clientY - r.top) / r.height * N);
  const o = replay.frames[frame].objs.filter(o => o.x === x && o.y === y).sort((a, b) => (b.t === 'Creep') - (a.t === 'Creep'))[0]; sel = o ? o.id : null; show(); };
const BODY = { m: 'MOVE', w: 'WORK', c: 'CARRY', a: 'ATTACK', r: 'RANGED_ATTACK', h: 'HEAL', t: 'TOUGH' };
function show(k = 1) {
  if (!replay) return; const f = replay.frames[frame]; drawFrame(g, terr, f, replay.frames[frame - 1], k, sel);
  $('#tick').textContent = f.tick - 1; $('#scrub').value = frame;
  for (const p of ['p1', 'p2']) { const cs = f.objs.filter(o => o.t === 'Creep' && o.o === p).length, sp = f.objs.find(o => o.t === 'StructureSpawn' && o.o === p); $('#' + p + 'info').textContent = `creep ${cs} · spawn ${sp ? sp.h : 0} hp · ⚡${sp ? sp.e : 0}`; }
  $('#result').textContent = f.result ? (f.result.winner ? (f.result.winner === 'p1' ? '玩家 1 胜利' : '玩家 2 胜利') : '平局') : '';
  $('#result').style.color = f.result?.winner === 'p1' ? 'var(--p1)' : f.result?.winner === 'p2' ? 'var(--p2)' : '#fff';
  const o = sel && f.objs.find(o => o.id === sel);
  $('#inspect').textContent = o ? [`${o.t}  #${o.id}`, `pos  (${o.x}, ${o.y})`, o.o && `owner  ${o.o}`, o.h != null && `hits  ${o.h} / ${o.hm}`, o.e != null && `energy  ${o.e} / ${o.c}`, o.f != null && `fatigue  ${o.f}`, o.b && 'body\n  ' + o.b.split(',').map(b => BODY[b[0]] + (b.endsWith('!') ? ' (0hp)' : '')).join('\n  '), o.st && `${o.st} ${o.p}/${o.pt}`].filter(Boolean).join('\n') : (sel ? '（对象已不存在）' : '点击地图上的对象查看详情');
  $('#console').textContent = replay.frames.slice(Math.max(0, frame - 30), frame + 1).flatMap(fr => (fr.log?.[conP] || []).map(l => `[${fr.tick - 1}] ${l}`)).join('\n');
}
function raf(t) { const dt = Math.min(100, t - last); last = t;
  if (replay && playing && frame < replay.frames.length - 1) { acc += dt * speed / 200; while (acc >= 1 && frame < replay.frames.length - 1) { acc--; frame++; } show(Math.min(1, acc)); }
  requestAnimationFrame(raf); }
requestAnimationFrame(raf);
