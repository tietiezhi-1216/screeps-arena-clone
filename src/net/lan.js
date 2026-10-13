// 局域网联机（协议沿用 screeps-blockly-mobile：房主权威 + JSON over WebSocket + UDP 广播发现）。
// 传输层可替换：安卓原生 LanServer 插件 / Node 测试里的内存传输。
// 客户端 → 房主：join{pid,name,code} · code{code} · ready{}
// 房主 → 客户端：welcome{pid,slot} · lobby{players} · start{meta,terrain,first} · tick{f} · end{result} · log{s}
export const LAN_PORT = 8797;
export class HostSession {
  constructor(transport, { name = '房主' } = {}) {
    this.t = transport; this.name = name; this.clients = new Map(); this.guest = null; this.onLobby = null; this.started = false;
    transport.onConnect = id => this.clients.set(id, { pid: null });
    transport.onClose = id => { const c = this.clients.get(id); this.clients.delete(id); if (this.guest === id) this.guest = null; this.lobby(); };
    transport.onMessage = (id, raw) => { let m; try { m = JSON.parse(raw); } catch (e) { return; } this.handle(id, m); };
  }
  handle(id, m) {
    const c = this.clients.get(id); if (!c) return;
    if (m.t === 'join') {
      c.pid = String(m.pid || 'guest' + id).slice(0, 40); c.name = String(m.name || '玩家').slice(0, 16); c.code = typeof m.code === 'string' ? m.code.slice(0, 200000) : '';
      const slot = this.guest == null && !this.started ? (this.guest = id, 'p2') : 'spectator';
      this.send(id, { t: 'welcome', pid: c.pid, slot }); this.lobby();
      if (this.started && this.startMsg) this.send(id, this.startMsg);
    } else if (m.t === 'code' && c.pid) { c.code = String(m.code || '').slice(0, 200000); this.lobby(); }
  }
  guestCode() { return this.guest != null ? this.clients.get(this.guest)?.code || '' : null; }
  players() { return [{ name: this.name, slot: 'p1' }, ...[...this.clients.entries()].filter(([, c]) => c.pid).map(([id, c]) => ({ name: c.name, slot: id === this.guest ? 'p2' : 'spectator', hasCode: !!c.code }))]; }
  lobby() { const players = this.players(); this.t.broadcast(JSON.stringify({ t: 'lobby', players })); this.onLobby?.(players); }
  send(id, o) { this.t.send(id, JSON.stringify(o)); }
  start(meta, terrain, first) { this.started = true; this.startMsg = { t: 'start', meta, terrain, first }; this.t.broadcast(JSON.stringify(this.startMsg)); }
  tick(f) { this.t.broadcast(JSON.stringify({ t: 'tick', f })); }
  end(result) { this.started = false; this.t.broadcast(JSON.stringify({ t: 'end', result })); }
}
export class ClientSession {
  constructor(url, { pid, name, code, WS = globalThis.WebSocket } = {}) {
    this.code = code || ''; this.onStart = this.onTick = this.onEnd = this.onLobby = this.onStatus = null;
    const ws = this.ws = new WS(url);
    ws.onopen = () => { ws.send(JSON.stringify({ t: 'join', pid, name, code: this.code })); this.onStatus?.('已连接'); };
    ws.onclose = () => this.onStatus?.('连接断开'); ws.onerror = () => this.onStatus?.('连接失败');
    ws.onmessage = ev => { let m; try { m = JSON.parse(typeof ev.data === 'string' ? ev.data : ev.data.toString()); } catch (e) { return; } this.handle(m); };
  }
  handle(m) {
    if (m.t === 'welcome') { this.slot = m.slot; this.onStatus?.(m.slot === 'p2' ? '已加入，你是玩家 2' : '已加入（观战）'); }
    else if (m.t === 'lobby') this.onLobby?.(m.players);
    else if (m.t === 'start') this.onStart?.(m);
    else if (m.t === 'tick') this.onTick?.(m.f);
    else if (m.t === 'end') this.onEnd?.(m.result);
  }
  sendCode(code) { this.code = code; if (this.ws.readyState === 1) this.ws.send(JSON.stringify({ t: 'code', code })); }
  close() { try { this.ws.close(); } catch (e) {} }
}
// 内存传输（测试/单机调试）：返回 { host transport, connect() → 客户端 WebSocket 替身 }
export function memoryTransport() {
  let next = 1; const socks = new Map();
  const t = { send: (id, d) => socks.get(id)?._recv(d), broadcast: d => { for (const s of socks.values()) s._recv(d); }, kick: id => socks.get(id)?.close() };
  class FakeWS { constructor() { this.id = next++; this.readyState = 0; socks.set(this.id, this); queueMicrotask(() => { this.readyState = 1; t.onConnect?.(this.id); this.onopen?.(); }); }
    send(d) { queueMicrotask(() => t.onMessage?.(this.id, d)); } _recv(d) { queueMicrotask(() => this.onmessage?.({ data: d })); }
    close() { socks.delete(this.id); this.readyState = 3; t.onClose?.(this.id); this.onclose?.(); } }
  return { transport: t, WS: FakeWS };
}
// 安卓原生插件适配
export function nativeTransport() {
  const C = globalThis.Capacitor; if (!C?.isNativePlatform?.() || !C.registerPlugin) return null;
  const P = C.registerPlugin('LanServer');
  const t = { plugin: P, send: (id, data) => P.send({ id, data }), broadcast: data => P.broadcast({ data }), kick: id => P.kick({ id }) };
  P.addListener('connect', e => t.onConnect?.(e.id)); P.addListener('message', e => t.onMessage?.(e.id, e.data)); P.addListener('close', e => t.onClose?.(e.id));
  return t;
}
