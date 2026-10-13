// game/constants —— 数值逐项取自官方文档 https://arena.screeps.com/docs (Constants 一节)
export const OK = 0, ERR_NOT_OWNER = -1, ERR_NO_PATH = -2, ERR_NAME_EXISTS = -3, ERR_BUSY = -4,
  ERR_NOT_FOUND = -5, ERR_NOT_ENOUGH_ENERGY = -6, ERR_NOT_ENOUGH_RESOURCES = -6, ERR_NOT_ENOUGH_EXTENSIONS = -6,
  ERR_INVALID_TARGET = -7, ERR_FULL = -8, ERR_NOT_IN_RANGE = -9, ERR_INVALID_ARGS = -10, ERR_TIRED = -11, ERR_NO_BODYPART = -12;
export const MOVE = 'move', WORK = 'work', CARRY = 'carry', ATTACK = 'attack', RANGED_ATTACK = 'ranged_attack', HEAL = 'heal', TOUGH = 'tough';
export const TOP = 1, TOP_RIGHT = 2, RIGHT = 3, BOTTOM_RIGHT = 4, BOTTOM = 5, BOTTOM_LEFT = 6, LEFT = 7, TOP_LEFT = 8;
export const TERRAIN_PLAIN = 0, TERRAIN_WALL = 1, TERRAIN_SWAMP = 2;
export const RESOURCE_ENERGY = 'energy';
export const RESOURCES_ALL = [RESOURCE_ENERGY];
export const BODYPART_COST = { [WORK]: 100, [MOVE]: 50, [CARRY]: 50, [ATTACK]: 80, [RANGED_ATTACK]: 150, [HEAL]: 250, [TOUGH]: 10 };
export const BODYPART_HITS = 100;
export const ATTACK_POWER = 30, RANGED_ATTACK_POWER = 10, HEAL_POWER = 12, RANGED_HEAL_POWER = 4;
export const RANGED_ATTACK_DISTANCE_RATE = { 0: 1, 1: 1, 2: 0.4, 3: 0.1 };
export const HARVEST_POWER = 2, BUILD_POWER = 5, REPAIR_POWER = 100, REPAIR_COST = 0.01, DISMANTLE_POWER = 50, DISMANTLE_COST = 0.005;
export const CARRY_CAPACITY = 50, MAX_CREEP_SIZE = 50, CREEP_SPAWN_TIME = 3;
export const CONSTRUCTION_COST = { StructureTower: 1250, StructureExtension: 200, StructureRoad: 10, StructureContainer: 100, StructureWall: 100, StructureRampart: 200, StructureSpawn: 1000 };
export const CONSTRUCTION_COST_ROAD_SWAMP_RATIO = 5, CONSTRUCTION_COST_ROAD_WALL_RATIO = 150;
export const MAX_CONSTRUCTION_SITES = 10;
export const CONTAINER_CAPACITY = 2000, CONTAINER_HITS = 300;
export const EXTENSION_ENERGY_CAPACITY = 100, EXTENSION_HITS = 100;
export const RAMPART_HITS = 10000, RAMPART_HITS_MAX = 10000, WALL_HITS = 10000, WALL_HITS_MAX = 10000;
export const ROAD_HITS = 500, ROAD_WEAROUT = 1;
export const RESOURCE_DECAY = 1000;
export const SOURCE_ENERGY_REGEN = 10;
export const SPAWN_ENERGY_CAPACITY = 1000, SPAWN_HITS = 3000, SPAWN_RANGE = 20;
export const TOWER_CAPACITY = 10, TOWER_COOLDOWN = 10, TOWER_ENERGY_COST = 10, TOWER_FALLOFF = 1, TOWER_FALLOFF_RANGE = 21,
  TOWER_HITS = 3000, TOWER_OPTIMAL_RANGE = 1, TOWER_POWER_ATTACK = 1000, TOWER_POWER_HEAL = 600, TOWER_POWER_REPAIR = 200, TOWER_RANGE = 20;
export const OBSTACLE_OBJECT_TYPES = ['creep', 'tower', 'constructedWall', 'spawn', 'extension', 'link'];
export const EFF_ATTACK_BOOST = 'eff_attack_boost', EFF_CONSTRUCTION_BOOST = 'eff_construction_boost', EFF_HEAL_BOOST = 'eff_heal_boost',
  EFF_MOVE_BOOST = 'eff_move_boost', EFF_RANGED_ATTACK_BOOST = 'eff_ranged_attack_boost', EFF_WORK_BOOST = 'eff_work_boost';
