import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import { HostSession, ClientSession, memoryTransport } from '../src/net/lan.js';
import { createLiveMatch } from '../src/engine/match.js';
const wait = (ms = 5) => new Promise(r => setTimeout(r, ms));
test('LAN: client joins with code, host runs authoritative match and streams ticks', async () => {
  const { transport, WS } = memoryTransport();
  const host = new HostSession(transport, { name: 'host' });
  const kite = fs.readFileSync('bots/kite.mjs', 'utf8'), rush = fs.readFileSync('bots/rush.mjs', 'utf8');
  const cl = new ClientSession('mem://', { pid: 'c1', name: 'guest', code: 'export function loop(){}', WS });
  const spec = new ClientSession('mem://', { pid: 'c2', name: 'viewer', WS });
  let lobby, ticks = 0, started, ended; cl.onLobby = p => lobby = p; cl.onStart = m => started = m; cl.onTick = () => ticks++; cl.onEnd = r => ended = r;
  await wait(); assert.equal(cl.slot, 'p2'); assert.equal(spec.slot, 'spectator'); assert.equal(lobby.length, 3);
  cl.sendCode(kite); await wait(); assert.equal(host.guestCode(), kite);
  const m = createLiveMatch({ seed: 1, scripts: [rush, host.guestCode()] }); host.start(m.meta(), m.terrain, m.first);
  while (!m.done) host.tick(m.step()); host.end(m.world.result); await wait(20);
  assert.ok(started && started.terrain.length === 10000); assert.equal(ticks, m.world.tick - 1); assert.deepEqual(ended, m.world.result);
});
