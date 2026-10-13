// game/prototypes —— 官方原型类及方法（返回码与规则见官方文档）。动作只登记 intent，tick 末统一结算。
import * as C from '../constants.js';
const { OK, ERR_NOT_OWNER, ERR_INVALID_TARGET, ERR_NOT_IN_RANGE, ERR_NO_BODYPART, ERR_TIRED, ERR_INVALID_ARGS, ERR_FULL, ERR_NOT_ENOUGH_RESOURCES, ERR_BUSY, ERR_NO_PATH } = C;
export const range = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
export const DIRS = { 1: [0, -1], 2: [1, -1], 3: [1, 0], 4: [1, 1], 5: [0, 1], 6: [-1, 1], 7: [-1, 0], 8: [-1, -1] };
export function direction(dx, dy) { const sx = Math.sign(dx), sy = Math.sign(dy); for (const d in DIRS) if (DIRS[d][0] === sx && DIRS[d][1] === sy) return +d; return undefined; }

// 官方文档同 tick 互斥：登记新动作时清掉冲突 intent。
const CONFLICTS = {
  attack: ['harvest', 'build', 'heal'],
  harvest: ['attack', 'build', 'heal'],
  build: ['harvest', 'attack', 'heal', 'ranged'],
  heal: ['harvest', 'build', 'attack'],
  ranged: ['build'],
};

export class Store {
  constructor(cap, limited) { Object.defineProperty(this, '_cap', { value: cap, writable: true }); Object.defineProperty(this, '_lim', { value: !!limited }); }
  getCapacity(r) { if (this._lim && r !== undefined && r !== C.RESOURCE_ENERGY) return null; return this._cap; }
  getUsedCapacity(r) { if (r === undefined) { if (this._lim) return null; let s = 0; for (const k in this) s += this[k] || 0; return s; } return this[r] || 0; }
  getFreeCapacity(r) { return this._cap - (this._lim ? (this[r ?? C.RESOURCE_ENERGY] || 0) : this.getUsedCapacity()); }
}

export class GameObject {
  constructor(w, x, y) { Object.defineProperty(this, '_w', { value: w }); this.id = String(w.nextId++); this.x = x; this.y = y; }
  get exists() { return this._w.objects.get(this.id) === this; }
  /** 控制本对象的 Flag（Capture the Flag）；无则 undefined。官方：GameObject.controlledBy */
  get controlledBy() { return this._controlledBy || undefined; }
  get ticksToDecay() { return undefined; }
  /** 官方 GameObject.effects：Effect[]（{effect, ticksRemaining}）；无效果时为 undefined */
  get effects() { return this._effects && this._effects.length ? this._effects.map(e => ({ ...e })) : undefined; }
  getRangeTo(p) { return range(this, p); }
  findClosestByRange(ps) { return this._w.utils.findClosestByRange(this, ps); }
  findClosestByPath(ps, o) { return this._w.utils.findClosestByPath(this, ps, o); }
  findInRange(ps, r) { return this._w.utils.findInRange(this, ps, r); }
  findPathTo(p, o) { return this._w.utils.findPath(this, p, o); }
}
export class Source extends GameObject { constructor(w, x, y, energy = C.SOURCE_ENERGY_CAPACITY, cap = C.SOURCE_ENERGY_CAPACITY) { super(w, x, y); this.energy = energy; this.energyCapacity = cap; } }
export class Resource extends GameObject {
  constructor(w, x, y, amount, type = C.RESOURCE_ENERGY) { super(w, x, y); this.amount = amount; this.resourceType = type; }
  get ticksToDecay() { const d = Math.ceil(Math.max(1, this.amount) / C.RESOURCE_DECAY); return Math.ceil(this.amount / d); }
}
export class Flag extends GameObject { constructor(w, x, y, owner) { super(w, x, y); Object.defineProperty(this, '_owner', { value: owner, writable: true }); } get my() { return this._owner == null ? undefined : this._owner === this._w.current; } }
export class BodyPart extends GameObject {
  constructor(w, x, y, type, decay) { super(w, x, y); this.type = type; Object.defineProperty(this, '_decayAt', { value: w.tick + decay }); }
  get ticksToDecay() { return this._decayAt - this._w.tick; }
}
export class ConstructionSite extends GameObject {
  constructor(w, x, y, proto, owner) { super(w, x, y); Object.defineProperty(this, '_owner', { value: owner }); this._proto = proto; this.progress = 0; this.progressTotal = C.CONSTRUCTION_COST[proto.name]; this.structure = undefined; }
  get my() { return this._owner === this._w.current; }
  remove() { if (!this.my) return ERR_NOT_OWNER; this._w.remove(this); return OK; }
}
export class Structure extends GameObject { constructor(w, x, y, hits) { super(w, x, y); this.hits = hits; this.hitsMax = hits; } }
export class OwnedStructure extends Structure {
  constructor(w, x, y, hits, owner) { super(w, x, y, hits); Object.defineProperty(this, '_owner', { value: owner, writable: true }); }
  get my() { return this._owner == null ? undefined : this._owner === this._w.current; }
}
export class StructureRoad extends Structure {
  constructor(w, x, y) {
    const swamp = w.terrainAt(x, y) === C.TERRAIN_SWAMP;
    super(w, x, y, swamp ? C.ROAD_HITS_SWAMP : C.ROAD_HITS);
  }
}
export class StructureWall extends Structure { constructor(w, x, y) { super(w, x, y, C.WALL_HITS); } }
export class StructureContainer extends OwnedStructure {
  constructor(w, x, y, owner = null, { decayIn } = {}) {
    super(w, x, y, C.CONTAINER_HITS, owner); this.store = new Store(C.CONTAINER_CAPACITY);
    if (decayIn != null) Object.defineProperty(this, '_decayAt', { value: w.tick + decayIn, writable: true });
  }
  get ticksToDecay() { return this._decayAt == null ? undefined : this._decayAt - this._w.tick; }
}
export class StructureRampart extends OwnedStructure { constructor(w, x, y, owner) { super(w, x, y, C.RAMPART_HITS, owner); this.hitsMax = C.RAMPART_HITS_MAX; } }
export class StructureExtension extends OwnedStructure { constructor(w, x, y, owner) { super(w, x, y, C.EXTENSION_HITS, owner); this.store = new Store(C.EXTENSION_ENERGY_CAPACITY, true); } }
export class StructureTower extends OwnedStructure {
  constructor(w, x, y, owner) { super(w, x, y, C.TOWER_HITS, owner); this.store = new Store(C.TOWER_CAPACITY, true); this.cooldown = 0; }
  _act(kind, t) {
    if (!this.my) return ERR_NOT_OWNER; if (!t || !t.exists || t.hits === undefined) return ERR_INVALID_TARGET;
    if (kind === 'heal' && !(t instanceof Creep)) return ERR_INVALID_TARGET;
    if ((this.store.energy || 0) < C.TOWER_ENERGY_COST) return C.ERR_NOT_ENOUGH_ENERGY;
    if (this.cooldown > 0) return ERR_TIRED; if (range(this, t) > C.TOWER_RANGE) return ERR_NOT_IN_RANGE;
    this._w.intent(this, 'tower', { kind, target: t.id }); return OK;
  }
  attack(t) { return this._act('attack', t); }
  heal(t) { return this._act('heal', t); }
}
export class Spawning {
  constructor(spawn, creep, need) { Object.defineProperty(this, '_spawn', { value: spawn }); this.creep = creep; this.needTime = need; this.remainingTime = need; }
  cancel() { if (!this._spawn.my) return ERR_NOT_OWNER; this._spawn._w.remove(this.creep); this._spawn.spawning = undefined; return OK; }
}
export class StructureSpawn extends OwnedStructure {
  constructor(w, x, y, owner) { super(w, x, y, C.SPAWN_HITS, owner); this.store = new Store(C.SPAWN_ENERGY_CAPACITY, true); this.spawning = undefined; this.directions = undefined; }
  setDirections(d) { if (!this.my) return ERR_NOT_OWNER; if (!Array.isArray(d) || !d.length || d.some(x => !DIRS[x])) return ERR_INVALID_ARGS; this.directions = d.slice(); return OK; }
  // 官方：loop 只登记 intent，tick 末统一结算。返回占位 creep，成功才入场。
  // 同 tick 再次调用覆盖上一次 intent。CPU 超时丢弃全部 intent → 不留已扣能量/已出兵。
  spawnCreep(body) {
    if (!this.my) return { error: ERR_NOT_OWNER };
    if (this.spawning) return { error: ERR_BUSY };
    if (!Array.isArray(body) || !body.length || body.length > C.MAX_CREEP_SIZE || body.some(b => !(b in C.BODYPART_COST))) return { error: ERR_INVALID_ARGS };
    const cost = body.reduce((a, b) => a + C.BODYPART_COST[b], 0);
    // Extension 文档：任意距离；扣能顺序先 Spawn 再 Extension（社区实测）
    const w = this._w, pool = [this, ...w.all(StructureExtension).filter(e => e._owner === this._owner)];
    if (pool.reduce((a, s) => a + (s.store.energy || 0), 0) < cost) return { error: C.ERR_NOT_ENOUGH_ENERGY };
    const creep = new Creep(w, this.x, this.y, this._owner, body); creep.spawning = true;
    w.intent(this, 'spawn', { body: body.slice(), cost, creep });
    return { object: creep };
  }
}
export class Creep extends GameObject {
  constructor(w, x, y, owner, body) {
    super(w, x, y); Object.defineProperty(this, '_owner', { value: owner });
    this.body = body.map(type => ({ type, hits: C.BODYPART_HITS })); this.hits = this.hitsMax = body.length * C.BODYPART_HITS;
    this.fatigue = 0; this.spawning = false; this.store = new Store(body.filter(b => b === C.CARRY).length * C.CARRY_CAPACITY);
  }
  get my() { return this._owner === this._w.current; }
  _parts(t) { return this.body.filter(p => p.type === t && p.hits > 0).length; }
  _pre(part) { if (!this.my) return ERR_NOT_OWNER; if (this.spawning) return ERR_BUSY; if (part && !this._parts(part)) return ERR_NO_BODYPART; return OK; }
  _clearConflicts(kind, data) {
    const m = this._w.intents.get(this.id); if (!m) return;
    for (const k of (CONFLICTS[kind] || [])) delete m[k];
    if (kind === 'ranged') { if (data.kind !== undefined && m.heal && m.heal.ranged) delete m.heal; }
    if (kind === 'heal' && data.ranged) delete m.ranged;
  }
  _intent(kind, data) { this._clearConflicts(kind, data); this._w.intent(this, kind, data); }
  move(dir) {
    let e = this._pre(C.MOVE); if (e) return e; if (this.fatigue > 0) return ERR_TIRED;
    if (dir instanceof Creep) { if (range(this, dir) !== 1) return ERR_NOT_IN_RANGE; dir = direction(dir.x - this.x, dir.y - this.y); }
    if (!DIRS[dir]) return ERR_INVALID_ARGS; this._w.intent(this, 'move', { dir }); return OK;
  }
  moveTo(target, opts) {
    let e = this._pre(C.MOVE); if (e) return e; if (this.fatigue > 0) return ERR_TIRED; if (!target) return ERR_INVALID_ARGS;
    if (range(this, target) === 0) return OK;
    const r = this._w.utils.findPath(this, target, { ...opts, _avoidCreeps: true });
    if (!r.length) return ERR_NO_PATH; return this.move(direction(r[0].x - this.x, r[0].y - this.y));
  }
  pull(t) { let e = this._pre(C.MOVE); if (e) return e; if (!(t instanceof Creep) || !t.exists || t === this) return ERR_INVALID_TARGET; if (range(this, t) > 1) return ERR_NOT_IN_RANGE; this._w.intent(this, 'pull', { target: t.id }); return OK; }
  _target(t, part, r, kinds) {
    let e = this._pre(part); if (e) return e; if (!t || !t.exists || (kinds && !kinds.some(k => t instanceof k))) return ERR_INVALID_TARGET;
    if (range(this, t) > r) return ERR_NOT_IN_RANGE; return OK;
  }
  attack(t) {
    const e = this._target(t, C.ATTACK, 1, [Creep, Structure, ConstructionSite]); if (e) return e;
    if (!(t instanceof ConstructionSite) && t.hits === undefined) return ERR_INVALID_TARGET;
    this._intent('attack', { target: t.id }); return OK;
  }
  rangedAttack(t) { const e = this._target(t, C.RANGED_ATTACK, 3, [Creep, Structure]); if (e) return e; if (t.hits === undefined) return ERR_INVALID_TARGET; this._intent('ranged', { kind: 'single', target: t.id }); return OK; }
  rangedMassAttack() { const e = this._pre(C.RANGED_ATTACK); if (e) return e; this._intent('ranged', { kind: 'mass' }); return OK; }
  heal(t) { const e = this._target(t, C.HEAL, 1, [Creep]); if (e) return e; this._intent('heal', { target: t.id, power: C.HEAL_POWER }); return OK; }
  rangedHeal(t) { const e = this._target(t, C.HEAL, 3, [Creep]); if (e) return e; this._intent('heal', { target: t.id, power: C.RANGED_HEAL_POWER, ranged: true }); return OK; }
  harvest(t) { const e = this._target(t, C.WORK, 1, [Source]); if (e) return e; if (!t.energy) return ERR_NOT_ENOUGH_RESOURCES; this._intent('harvest', { target: t.id }); return OK; }
  build(t) {
    const e = this._target(t, C.WORK, 3, [ConstructionSite]); if (e) return e;
    if (!this._parts(C.CARRY)) return ERR_NO_BODYPART;
    if (!(this.store.energy > 0)) return ERR_NOT_ENOUGH_RESOURCES;
    this._intent('build', { target: t.id }); return OK;
  }
  _res(r, amt) { return !(r === C.RESOURCE_ENERGY || (this._w.extraResources || []).includes(r)) || (amt !== undefined && !(amt > 0)); }
  transfer(t, r, amt) {
    let e = this._pre(); if (e) return e; if (this._res(r, amt)) return ERR_INVALID_ARGS; if (t && t.exists && t._acceptsTransfer) { if (range(this, t) > 1) return ERR_NOT_IN_RANGE; const h = this.store[r] || 0; amt ??= h; if (!h || h < amt) return ERR_NOT_ENOUGH_RESOURCES; if (r !== t.resourceType) return ERR_INVALID_ARGS; this._w.intent(this, 'transfer', { target: t.id, r, amt }); return OK; }
    if (!t || !t.exists || !t.store) return ERR_INVALID_TARGET;
    if (range(this, t) > 1) return ERR_NOT_IN_RANGE; const have = this.store[r] || 0; amt ??= Math.min(have, t.store.getFreeCapacity(r));
    if (have < amt || !have) return ERR_NOT_ENOUGH_RESOURCES; if (t.store.getFreeCapacity(r) <= 0) return ERR_FULL;
    this._w.intent(this, 'transfer', { target: t.id, r, amt }); return OK;
  }
  withdraw(t, r, amt) {
    let e = this._pre(); if (e) return e; if (this._res(r, amt)) return ERR_INVALID_ARGS; if (!t || !t.exists || !(t instanceof Structure) || !t.store) return ERR_INVALID_TARGET;
    if (this._w.at(t.x, t.y).some(o => o instanceof StructureRampart && o._owner !== this._owner)) return ERR_INVALID_TARGET;
    if (range(this, t) > 1) return ERR_NOT_IN_RANGE; const has = t.store[r] || 0; amt ??= Math.min(has, this.store.getFreeCapacity());
    if (!has || has < amt) return ERR_NOT_ENOUGH_RESOURCES; if (this.store.getFreeCapacity() <= 0) return ERR_FULL;
    this._w.intent(this, 'withdraw', { target: t.id, r, amt }); return OK;
  }
  pickup(t) { let e = this._pre(); if (e) return e; if (!(t instanceof Resource) || !t.exists) return ERR_INVALID_TARGET; if (range(this, t) > 1) return ERR_NOT_IN_RANGE; if (this.store.getFreeCapacity() <= 0) return ERR_FULL; this._w.intent(this, 'pickup', { target: t.id }); return OK; }
  drop(r, amt) { let e = this._pre(); if (e) return e; if (this._res(r, amt)) return ERR_INVALID_ARGS; const have = this.store[r] || 0; amt ??= have; if (!have || have < amt) return ERR_NOT_ENOUGH_RESOURCES; this._w.intent(this, 'drop', { r, amt }); return OK; }
}
// arena/season_{alpha,beta}/collect_and_control：ScoreCollector（官方 typings 字段：my, resourceType, score, scoreTotal）
export class ScoreCollector extends GameObject {
  constructor(w, x, y, resourceType, scoreTotal, owner = null) { super(w, x, y); this.resourceType = resourceType; this.scoreTotal = scoreTotal; Object.defineProperty(this, '_owner', { value: owner, writable: true }); Object.defineProperty(this, '_scores', { value: {} }); Object.defineProperty(this, '_acceptsTransfer', { value: true }); }
  get my() { return this._owner == null ? undefined : this._owner === this._w.current; }
  get score() { return this._owner == null ? 0 : (this._scores[this._owner] || 0); }
}
export const TYPE_NAME = new Map([[Creep, 'creep'], [StructureTower, 'tower'], [StructureWall, 'constructedWall'], [StructureSpawn, 'spawn'], [StructureExtension, 'extension'], [StructureRampart, 'rampart'], [StructureRoad, 'road'], [StructureContainer, 'container']]);
export const PROTOTYPES = { GameObject, Creep, Structure, OwnedStructure, StructureSpawn, StructureTower, StructureContainer, StructureExtension, StructureRampart, StructureRoad, StructureWall, Source, Resource, ConstructionSite, Flag, Store, Spawning };
