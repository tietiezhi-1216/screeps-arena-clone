// 权威、确定性的对局引擎：玩家代码只登记 intent，tick 末按固定顺序结算（战斗 → 经济 → 移动 → 生产/衰减 → 模式规则）。
import * as C from '../constants.js';
import * as P from './prototypes.js';
import { makeSearchPath, CostMatrix, W, H } from './pathfinder.js';
import { mulberry32 } from './rng.js';
const { range, DIRS, direction } = P;
const isObstacle = o => C.OBSTACLE_OBJECT_TYPES.includes(P.TYPE_NAME.get(o.constructor));

export class World {
  constructor({ seed = 1, terrain, players = ['p1', 'p2'], ticksLimit = 2000, arena = {} } = {}) {
    this.seed = seed; this.rng = mulberry32(seed); this.tick = 1; this.nextId = 1; this.players = players; this.current = null;
    this.terrain = terrain || new Uint8Array(W * H); this.objects = new Map(); this.intents = new Map();
    this.ticksLimit = ticksLimit; this.arena = { name: 'Custom', level: 1, season: 'alpha', cpuTimeLimit: 50, cpuTimeLimitFirstTick: 1000, ticksLimit, ...arena };
    this.events = []; this.visuals = {}; this.logs = {}; this.result = null; this.rules = [];
    this._searchPath = makeSearchPath((x, y) => this.terrainAt(x, y));
    this.utils = this._makeUtils();
  }
  terrainAt(x, y) { return x < 0 || y < 0 || x >= W || y >= H ? C.TERRAIN_WALL : this.terrain[y * W + x]; }
  add(o) { this.objects.set(o.id, o); return o; }
  remove(o) { this.objects.delete(o.id); }
  all(cls) { const r = []; for (const o of this.objects.values()) if (!cls || o instanceof cls) r.push(o); return r; }
  at(x, y) { return this.all().filter(o => o.x === x && o.y === y); }
  intent(obj, kind, data) { let m = this.intents.get(obj.id); if (!m) this.intents.set(obj.id, m = {}); m[kind] = data; }

  obstacleMatrix(avoidCreeps, owner) {
    const cm = new CostMatrix();
    for (const o of this.objects.values()) {
      if (o instanceof P.StructureRoad && !this.terrain[o.y * W + o.x]) cm.set(o.x, o.y, 1);
      if (o instanceof P.StructureRampart && o._owner !== owner) cm.set(o.x, o.y, 255);
      if ((o instanceof P.Creep ? avoidCreeps : isObstacle(o))) cm.set(o.x, o.y, 255);
    }
    return cm;
  }
  _makeUtils() {
    const w = this;
    const pathOpts = (from, o = {}) => ({ ...o, costMatrix: o.costMatrix || w.obstacleMatrix(!!o._avoidCreeps, from._owner ?? w.current) });
    const findPath = (from, to, o = {}) => {
      const opts = pathOpts(from, o); if (o._avoidCreeps || o.costMatrix === undefined) { opts.costMatrix = opts.costMatrix.clone(); opts.costMatrix.set(to.x, to.y, 0); }
      const r = w._searchPath(from, { pos: to, range: 0 }, opts);
      let path = r.path; if (path.length && isBlockedTarget(to)) path = path.slice(0, -1); return path;
    };
    const isBlockedTarget = t => w.at(t.x, t.y).some(o => isObstacle(o) || o instanceof P.Creep) || w.terrainAt(t.x, t.y) === C.TERRAIN_WALL;
    return {
      getTicks: () => w.tick,
      getObjects: () => w.all(),
      getObjectById: id => w.objects.get(String(id)) || null,
      getObjectsByPrototype: cls => w.all(cls),
      getRange: (a, b) => range(a, b),
      getDirection: (dx, dy) => direction(dx, dy),
      getTerrainAt: p => w.terrainAt(p.x, p.y),
      getCpuTime: () => Math.round(((globalThis.performance?.now() ?? Date.now()) - (w._cpuStartMs || 0)) * 1e6),
      getHeapStatistics: () => ({ total_heap_size: 0, used_heap_size: 0, heap_size_limit: 256 * 1024 * 1024 }),
      findInRange: (from, ps, r) => ps.filter(p => range(from, p) <= r),
      findClosestByRange: (from, ps) => { let b = null, bd = Infinity; for (const p of ps) { const d = range(from, p); if (d < bd) { bd = d; b = p; } } return b; },
      findClosestByPath: (from, ps, o = {}) => {
        if (!ps.length) return null; const r = w._searchPath(from, ps.map(p => ({ pos: p, range: isBlockedTarget(p) ? 1 : 0 })), pathOpts(from, o));
        if (r.incomplete) return null; const end = r.path.length ? r.path[r.path.length - 1] : from;
        let b = null, bd = Infinity; for (const p of ps) { const d = range(end, p); if (d < bd) { bd = d; b = p; } } return b;
      },
      findPath,
      createConstructionSite: (pos, proto) => {
        if (!proto || !(proto.name in C.CONSTRUCTION_COST)) return { error: C.ERR_INVALID_ARGS };
        if (pos.x <= 0 || pos.y <= 0 || pos.x >= W - 1 || pos.y >= H - 1) return { error: C.ERR_INVALID_ARGS };
        if (w.terrainAt(pos.x, pos.y) === C.TERRAIN_WALL && proto !== P.StructureRoad) return { error: C.ERR_INVALID_TARGET };
        if (w.at(pos.x, pos.y).some(o => o instanceof P.ConstructionSite || (o instanceof P.Structure && o.constructor === proto))) return { error: C.ERR_INVALID_TARGET };
        if (w.all(P.ConstructionSite).filter(s => s._owner === w.current).length >= C.MAX_CONSTRUCTION_SITES) return { error: C.ERR_FULL };
        const s = w.add(new P.ConstructionSite(w, pos.x, pos.y, proto, w.current));
        const t = w.terrainAt(pos.x, pos.y); if (proto === P.StructureRoad) s.progressTotal *= t === C.TERRAIN_SWAMP ? C.CONSTRUCTION_COST_ROAD_SWAMP_RATIO : t === C.TERRAIN_WALL ? C.CONSTRUCTION_COST_ROAD_WALL_RATIO : 1;
        return { object: s };
      },
      searchPath: (o, g, opts) => w._searchPath(o, g, opts),
    };
  }

  // ---------------- 结算 ----------------
  _damage(t, amt, src) { (this._dmg.get(t) || this._dmg.set(t, []).get(t)).push(amt); if (src) this.events.push({ t: 'atk', f: [src.x, src.y], to: [t.x, t.y], k: src._k }); }
  _redirect(t, owner) { const r = this.at(t.x, t.y).find(o => o instanceof P.StructureRampart && o._owner !== owner); return r || t; }
  _applyCreepDamage(c, amt) { // 按身体部件从前往后扣血
    for (const p of c.body) { if (amt <= 0) break; const d = Math.min(p.hits, amt); p.hits -= d; amt -= d; }
    c.hits = c.body.reduce((a, p) => a + p.hits, 0);
  }
  _healCreep(c, amt) { for (let i = c.body.length - 1; i >= 0 && amt > 0; i--) { const p = c.body[i]; const d = Math.min(C.BODYPART_HITS - p.hits, amt); p.hits += d; amt -= d; } c.hits = c.body.reduce((a, p) => a + p.hits, 0); }

  step() {
    if (this.result) return; this.events = []; this._dmg = new Map(); const heal = new Map(), get = id => this.objects.get(id);
    const I = [...this.intents.entries()].map(([id, m]) => [get(id), m]).filter(([o]) => o);
    // 1 战斗
    for (const [o, m] of I) {
      if (m.attack) { const t = get(m.attack.target); if (t && range(o, t) <= 1) { o._k = 'melee'; this._damage(this._redirect(t, o._owner), o._parts(C.ATTACK) * C.ATTACK_POWER, o); } }
      if (m.ranged) {
        o._k = 'ranged'; const pw = o._parts(C.RANGED_ATTACK) * C.RANGED_ATTACK_POWER;
        if (m.ranged.kind === 'single') { const t = get(m.ranged.target); if (t && range(o, t) <= 3) this._damage(this._redirect(t, o._owner), pw, o); }
        else for (const t of this.all()) { if (t._owner == null || t._owner === o._owner || t.hits === undefined || t instanceof P.ConstructionSite) continue; const r = range(o, t); if (r <= 3) this._damage(t, Math.round(pw * C.RANGED_ATTACK_DISTANCE_RATE[r]), r ? null : o); }
      }
      if (m.heal) { const t = get(m.heal.target); if (t) { heal.set(t, (heal.get(t) || 0) + o._parts(C.HEAL) * m.heal.power); this.events.push({ t: 'heal', f: [o.x, o.y], to: [t.x, t.y] }); } }
      if (m.tower && o.store.energy >= C.TOWER_ENERGY_COST && !o.cooldown) {
        const t = get(m.tower.target); if (t) { const r = Math.max(range(o, t), C.TOWER_OPTIMAL_RANGE); o.store.energy -= C.TOWER_ENERGY_COST; o.cooldown = C.TOWER_COOLDOWN;
          if (m.tower.kind === 'attack') { o._k = 'tower'; this._damage(this._redirect(t, o._owner), Math.max(0, C.TOWER_POWER_ATTACK - 50 * (r - 1)), o); }
          else { heal.set(t, (heal.get(t) || 0) + Math.max(0, C.TOWER_POWER_HEAL - 30 * (r - 1))); this.events.push({ t: 'heal', f: [o.x, o.y], to: [t.x, t.y] }); } }
      }
    }
    for (const [t, ds] of this._dmg) { const d = ds.reduce((a, b) => a + b, 0); if (t instanceof P.Creep) this._applyCreepDamage(t, d); else t.hits -= d; }
    for (const [t, h] of heal) if (t.exists && t instanceof P.Creep) this._healCreep(t, h);
    // 2 经济
    for (const [o, m] of I) {
      if (!o.exists) continue;
      if (m.harvest) { const s = get(m.harvest.target); if (s) { const n = Math.min(s.energy, o._parts(C.WORK) * C.HARVEST_POWER, Math.max(0, o.store.getFreeCapacity())); s.energy -= n; o.store.energy = (o.store.energy || 0) + n; if (o.store.getFreeCapacity() < 0) this._drop(o, -o.store.getFreeCapacity()); } }
      if (m.build) { const s = get(m.build.target); if (s && s.exists) { const n = Math.min(o.store.energy || 0, o._parts(C.WORK) * C.BUILD_POWER, s.progressTotal - s.progress); s.progress += n; o.store.energy -= n;
        if (s.progress >= s.progressTotal) { this.remove(s); const blocked = isObstacle({ constructor: s._proto }) && this.at(s.x, s.y).some(c => c instanceof P.Creep); if (!blocked) { const st = new s._proto(this, s.x, s.y, s._owner); this.add(st); } } } }
      if (m.withdraw) { const t = get(m.withdraw.target); if (t) { const n = Math.min(m.withdraw.amt, t.store[m.withdraw.r] || 0, o.store.getFreeCapacity()); t.store[m.withdraw.r] -= n; o.store[m.withdraw.r] = (o.store[m.withdraw.r] || 0) + n; } }
      if (m.transfer) { const t = get(m.transfer.target); if (t) { const r = m.transfer.r, n = Math.min(m.transfer.amt, o.store[r] || 0, Math.max(0, t.store.getFreeCapacity(r))); o.store[r] -= n; t.store[r] = (t.store[r] || 0) + n; } }
      if (m.pickup) { const t = get(m.pickup.target); if (t && t.exists) { const n = Math.min(t.amount, o.store.getFreeCapacity()); t.amount -= n; o.store[t.resourceType] = (o.store[t.resourceType] || 0) + n; if (t.amount <= 0) this.remove(t); } }
      if (m.drop) { const n = Math.min(m.drop.amt, o.store.energy || 0); o.store.energy -= n; this._drop(o, n); }
    }
    // 3 移动（含 pull）
    this._moves(I);
    // 4 死亡、生产、衰减
    for (const o of this.all()) {
      if (o.hits !== undefined && o.hits <= 0) { this.events.push({ t: 'die', at: [o.x, o.y] }); if (o.store && o.store.energy && !(o instanceof P.StructureSpawn)) this._drop(o, o.store.energy); this.remove(o); continue; }
      if (o instanceof P.StructureTower && o.cooldown > 0) o.cooldown--;
      if (o instanceof P.Creep) o.fatigue = Math.max(0, o.fatigue - 2 * o._parts(C.MOVE));
      if (o instanceof P.Source && o.energy < o.energyCapacity) o.energy = Math.min(o.energyCapacity, o.energy + C.SOURCE_ENERGY_REGEN);
      if (o instanceof P.Resource) { o.amount -= Math.ceil(o.amount / C.RESOURCE_DECAY); if (o.amount <= 0) this.remove(o); }
      if (o instanceof P.StructureSpawn && o.spawning) this._spawnProgress(o);
    }
    this.intents.clear();
    for (const r of this.rules) r(this);
    if (!this.result && this.tick >= this.ticksLimit) this.result = { winner: null, reason: 'timeout' };
    this.tick++;
  }
  _drop(o, n) { if (n <= 0) return; const ex = this.at(o.x, o.y).find(r => r instanceof P.Resource); if (ex) ex.amount += n; else this.add(new P.Resource(this, o.x, o.y, n)); }
  _spawnProgress(s) {
    const sp = s.spawning; if (!sp.creep.exists) { s.spawning = undefined; return; } if (--sp.remainingTime > 0) return;
    const dirs = s.directions || [1, 2, 3, 4, 5, 6, 7, 8];
    for (const d of dirs) { const x = s.x + DIRS[d][0], y = s.y + DIRS[d][1]; if (this.walkable(x, y, s._owner)) { sp.creep.x = x; sp.creep.y = y; sp.creep.spawning = false; s.spawning = undefined; return; } }
    sp.remainingTime = 0; // 出口被堵，等待
  }
  walkable(x, y, owner) {
    if (this.terrainAt(x, y) === C.TERRAIN_WALL && !this.at(x, y).some(o => o instanceof P.StructureRoad)) return false;
    return !this.at(x, y).some(o => (o instanceof P.Creep ? !o.spawning : isObstacle(o)) || (o instanceof P.StructureRampart && o._owner !== owner));
  }
  _moveCost(c, x, y) {
    const road = this.at(x, y).some(o => o instanceof P.StructureRoad), t = this.terrainAt(x, y);
    const k = road ? 1 : t === C.TERRAIN_SWAMP ? 10 : 2;
    let heavy = 0; let carry = c.store.energy || 0; for (const p of c.body) { if (p.type === C.MOVE) continue; if (p.type === C.CARRY) { if (carry <= 0) continue; carry -= C.CARRY_CAPACITY; } heavy++; }
    return heavy * k;
  }
  _moves(I) {
    const want = new Map(), pulls = new Map();
    for (const [o, m] of I) {
      if (!o.exists || !(o instanceof P.Creep) || o.spawning) continue;
      if (m.pull) pulls.set(this.objects.get(m.pull.target), o);
      if (m.move) want.set(o, { x: o.x + DIRS[m.move.dir][0], y: o.y + DIRS[m.move.dir][1] });
    }
    // 被拉的 creep 无需 MOVE/疲劳：只要它朝拉它的 creep 移动
    for (const [c, d] of want) {
      const puller = pulls.get(c); const pulled = puller && want.has(puller) && d.x === puller.x && d.y === puller.y;
      if (c.fatigue > 0 && !pulled) want.delete(c); else d.pulledBy = pulled ? puller : null;
    }
    let changed = true;
    while (changed) {
      changed = false; const dest = new Map();
      for (const [c, d] of want) {
        const k = d.x + ',' + d.y;
        let ok = this.terrainAt(d.x, d.y) !== C.TERRAIN_WALL || this.at(d.x, d.y).some(o => o instanceof P.StructureRoad);
        if (ok) for (const o of this.at(d.x, d.y)) {
          if (o instanceof P.Creep) { if (o.spawning) continue; if (!want.has(o)) { ok = false; break; } }
          else if (isObstacle(o) || (o instanceof P.StructureRampart && o._owner !== c._owner)) { ok = false; break; }
        }
        if (ok && dest.has(k)) ok = false; // 同格冲突：先到先得（按 intent 顺序，确定性）
        if (!ok) { want.delete(c); changed = true; break; } dest.set(k, c);
      }
    }
    for (const [c, d] of want) {
      const cost = this._moveCost(c, d.x, d.y); c.x = d.x; c.y = d.y;
      if (d.pulledBy) d.pulledBy.fatigue += cost; else c.fatigue += cost;
      const road = this.at(c.x, c.y).find(o => o instanceof P.StructureRoad); if (road) { road.hits -= C.ROAD_WEAROUT * c.body.length; }
    }
  }

  snapshot() {
    const objs = [];
    for (const o of this.objects.values()) {
      const s = { id: o.id, t: o.constructor.name, x: o.x, y: o.y };
      if (o._owner != null) s.o = o._owner; if (o.hits !== undefined) { s.h = o.hits; s.hm = o.hitsMax; }
      if (o.store) { s.e = o.store.energy || 0; s.c = o.store._cap; }
      if (o instanceof P.Creep) { s.b = o.body.map(p => p.type[0] + (p.hits > 0 ? '' : '!')).join(','); if (o.spawning) s.sp = 1; s.f = o.fatigue; }
      if (o instanceof P.Source) { s.e = o.energy; s.c = o.energyCapacity; }
      if (o instanceof P.Resource) s.e = o.amount;
      if (o instanceof P.BodyPart) s.bt = o.type;
      if (o instanceof P.ConstructionSite) { s.st = o._proto.name; s.p = o.progress; s.pt = o.progressTotal; }
      if (o instanceof P.StructureSpawn && o.spawning) s.spn = [o.spawning.needTime - o.spawning.remainingTime, o.spawning.needTime];
      objs.push(s);
    }
    return { tick: this.tick, objs, ev: this.events, vis: this.visuals, log: this.logs, cpu: this.cpu, result: this.result };
  }
}
