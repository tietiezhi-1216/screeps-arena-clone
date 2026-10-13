# 已实现 API（对照 https://arena.screeps.com/docs）

| 模块 | 内容 |
|---|---|
| `game/utils` | `getTicks getObjects getObjectById getObjectsByPrototype getRange getDirection getTerrainAt getCpuTime getHeapStatistics findInRange findClosestByRange findClosestByPath findPath createConstructionSite` |
| `game/prototypes` | `GameObject(id x y exists ticksToDecay getRangeTo findClosestByRange findClosestByPath findInRange findPathTo)`、`Creep(body fatigue hits hitsMax my spawning store; move moveTo pull attack rangedAttack rangedMassAttack heal rangedHeal harvest build transfer withdraw pickup drop)`、`Structure / OwnedStructure`、`StructureSpawn(spawnCreep→{object\|error} setDirections spawning directions store)`、`Spawning(creep needTime remainingTime cancel)`、`StructureTower(attack heal cooldown store)`、`StructureContainer StructureExtension StructureRampart StructureRoad StructureWall`、`Source Resource ConstructionSite(remove) Flag Store(getCapacity getUsedCapacity getFreeCapacity)` |
| `game/constants` | 文档中全部常量 |
| `game/path-finder` | `searchPath(origin, goal(s), {costMatrix plainCost swampCost flee maxOps maxCost heuristicWeight})`、`CostMatrix(get set clone)` |
| `game/visual` | `Visual(layer persistent; circle line poly rect text clear size)` |
| `game` | `arenaInfo(name level season ticksLimit cpuTimeLimit cpuTimeLimitFirstTick)` |

## 结算规则要点
- 伤害按身体部件从前往后扣；目标位于敌方 Rampart 上时攻击转向 Rampart。
- `rangedMassAttack` 距离衰减 `RANGED_ATTACK_DISTANCE_RATE`；塔攻击 1000 起每格 −50，治疗 600 起每格 −30。
- 疲劳：每个非 MOVE 部件（空 CARRY 不计）道路 1 / 平原 2 / 沼泽 10；每个 MOVE 每 tick −2。
- 建造 1 能量 = 1 进度，每 WORK 每 tick `BUILD_POWER`；工地上限 `MAX_CONSTRUCTION_SITES`。
- 掉落资源每 tick 衰减 `ceil(amount / RESOURCE_DECAY)`；Source 每 tick 回复 `SOURCE_ENERGY_REGEN`。
