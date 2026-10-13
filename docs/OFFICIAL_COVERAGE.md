# 官方 API 覆盖清单 / Official API Coverage (v0.11.0)

来源 / Sources: https://arena.screeps.com/docs/ 与 `screeps/arena-definitions`（common/typings/game/*.d.ts 及各 arena typings），2026-10-13 抓取。
审计方式：从每个 `.d.ts` 抽取所有导出符号与类成员名，逐一在 `src/` 中核对（脚本化），再人工复核语义。

图例：✅ 已实现 · 🆕 v0.5 新增/修正 · ⚠️ 实现但与官方有差异/近似 · ❌ 未实现

## game/constants
| 项 | 状态 |
|---|---|
| 返回码 OK, ERR_* (-1…-12) | ✅ |
| 身体部件、方向、地形、RESOURCE_ENERGY, BODYPART_COST/HITS | ✅ |
| 战斗/经济/建造/结构数值常量（TOWER_*, CONTAINER_*, SPAWN_*, ROAD_*, …） | ✅ |
| OBSTACLE_OBJECT_TYPES | ✅ |
| EFF_*_BOOST（6 个） | ✅ |
| EFF_ATTACK_MODIFIER / EFF_RANGED_ATTACK_MODIFIER / EFF_HEAL_MODIFIER / EFF_DAMAGE_TAKEN_MODIFIER / EFF_FATIGUE_MODIFIER / EFF_HITS_LOSS | 🆕 |
| STRUCTURE_PROTOTYPES（typings 只声明无值） | 🆕 ⚠️ 映射 structureType → 原型类 |
| SPAWN_ENERGY_REGEN, ROAD_HITS_SWAMP, SOURCE_ENERGY_CAPACITY | ⚠️ 项目补充命名（数值来自文档/changelog） |

## game/prototypes
| 原型 | 状态 |
|---|---|
| GameObject: id, x, y, exists, ticksToDecay, getRangeTo, findPathTo, findInRange, findClosestByRange/Path | ✅ |
| GameObject.effects (`Effect[]`：effectType / data{multiplier, offset} / endTime) | ✅ v0.6：按官方公式 base×multiplier+offset 生效；EFF_ATTACK/RANGED_ATTACK/HEAL/WORK/MOVE/CONSTRUCTION_BOOST、*_MODIFIER、DAMAGE_TAKEN、FATIGUE、HITS_LOSS 均接入结算 |
| GameObject.controlledBy (CTF) | ✅ |
| Creep（body, fatigue, hits, my, spawning, store, 全部动作方法与返回码） | ✅ |
| Structure / OwnedStructure / Spawn(spawnCreep, directions, setDirections, spawning) / Tower / Container / Extension / Rampart / Road / Wall | ✅ |
| Source, Resource, ConstructionSite(build/remove), Flag, BodyPart, Store, Spawning | ✅ |
| `SpawnCreepResult` / `CreateConstructionSiteResult` 结果对象 `{object, error}` | ✅（类型名仅 TS） |

## game/utils
| 函数 | 状态 |
|---|---|
| getTicks, getObjects, getObjectById, getObjectsByPrototype, getRange, getDirection, getTerrainAt, getCpuTime | ✅ |
| findInRange, findClosestByRange, findClosestByPath, findPath（含 ignore/costMatrix/plainCost/swampCost） | ✅ |
| createConstructionSite | ✅ |
| getHeapStatistics（HeapInfo 全部 12 个字段） | 🆕 ⚠️ 字段齐全，数值为占位（沙箱无法暴露真实 V8 堆） |

## game/path-finder
searchPath（goal / goals[] / range, plainCost, swampCost, flee, maxOps, maxCost, heuristicWeight, costMatrix）、CostMatrix(get/set/clone) ✅

## game/visual
Visual(layer, persistent)：circle/line/rect/poly/text/clear/size ✅；样式字段（radius, fill, opacity, stroke, strokeWidth, lineStyle, font, align, backgroundColor, backgroundPadding, color…）原样透传给渲染器 ⚠️ 渲染器只支持常用子集。

## game / arenaInfo
arenaInfo: name, level, season, ticksLimit, cpuTimeLimit, cpuTimeLimitFirstTick ✅

## v0.6 发布焦点
UI 模式选择器仅暴露官方三大核心模式（各基础/高级）。其余赛季原型仍在引擎中可被测试调用，但不作为本版主推玩法。

## arena/* 模式
| 模式 | 状态 |
|---|---|
| Spawn and Swamp 基础 / 高级 | ✅ ⚠️ 地图与刷新为近似（见 SPAWN_AND_SWAMP.md） |
| Capture the Flag 基础 / 高级（BodyPart, Flag 控制） | ✅ ⚠️（见 CAPTURE_THE_FLAG.md） |
| Collect and Control 基础（ScoreCollector, RESOURCE_SCORE, EFFECT_FREEZE/HEAL/DAMAGE） | 🆕 ⚠️ API 与 typings 一致；地图、scoreTotal=1000、刷新与控制权规则为近似 |
| Collect and Control 高级（RESOURCE_SCORE_X/Y/Z，三个收集器） | 🆕 ⚠️ 同上 |
| Season 1/2 Construct and Control（AreaEffect, ConstructionBoost, StructureGoal, EFFECT_SLOWDOWN, EFFECT_CONSTRUCTION_BOOST） | 🆕 v0.6 ⚠️ 规则近似 |
| Season 1 Portal Exploration（Portal.destination） | 🆕 v0.6 ⚠️ 地图近似 |
| Season 2/3 Power Split 基础/高级（BonusFlag.bonusType） | 🆕 v0.6 ⚠️ 加成倍率近似 |
| Season 4 Pain and Gain（ScoreFlag, TICKS_LIMIT=2000, MAX_SCORE_PER_TICK=25, FLAG_TYPES） | 🆕 v0.6 ⚠️ FLAG_TYPES 数值近似 |
| Season 3/4 Escort Run（EscortCreep） | 🆕 v0.6 ⚠️ 终点/胜负近似 |

## 已知差异 / Remaining gaps
- C&C 的 EFFECT_FREEZE/HEAL/DAMAGE 区域：v0.6 已实现（位置/半径/数值近似；区域对象 EffectZone 为引擎内部原型，官方未导出）。
- getHeapStatistics 为占位数值。
- 各赛季模式的地图与未公开数值均为近似，详见 docs/SEASON_MODES.md。

## 积木覆盖清单（v0.11.0，测试 test/official-blocks.test.mjs 逐项核对）

每一项都必须有对应积木（积木上只显示中文，不显示函数名）。格式：`模块或原型.名称`；`prop.*` 为对象属性（「对象属性」分类的属性下拉框），`proto.*` 为可查找 / 判断的原型。

```api
utils.getTicks utils.getCpuTime utils.getHeapStatistics utils.getObjectsByPrototype utils.findClosestByRange utils.findClosestByPath utils.findInRange utils.getRange utils.getObjectById utils.getObjects utils.createConstructionSite utils.getTerrainAt utils.getDirection utils.findPath
game.arenaInfo
arenaInfo.name arenaInfo.level arenaInfo.season arenaInfo.ticksLimit arenaInfo.cpuTimeLimit arenaInfo.cpuTimeLimitFirstTick
proto.Creep proto.StructureSpawn proto.StructureTower proto.StructureContainer proto.StructureExtension proto.StructureRampart proto.StructureRoad proto.StructureWall proto.Source proto.Resource proto.ConstructionSite proto.Flag proto.Structure proto.OwnedStructure proto.GameObject proto.BodyPart proto.ScoreCollector proto.AreaEffect proto.ConstructionBoost proto.StructureGoal proto.Portal proto.BonusFlag proto.ScoreFlag proto.EscortCreep proto.Store proto.Spawning
GameObject.getRangeTo GameObject.findClosestByRange GameObject.findClosestByPath GameObject.findInRange GameObject.findPathTo
prop.id prop.x prop.y prop.exists prop.ticksToDecay prop.effects prop.controlledBy prop.hits prop.hitsMax prop.my prop.fatigue prop.spawning prop.body prop.store prop.directions prop.cooldown prop.energy prop.energyCapacity prop.amount prop.resourceType prop.progress prop.progressTotal prop.structure prop.type prop.needTime prop.remainingTime prop.creep prop.score prop.scoreTotal prop.effect prop.destination prop.bonusType prop.effectType prop.scorePerTick prop.data prop.endTime prop.multiplier prop.offset prop.object prop.error prop.path prop.ops prop.cost prop.incomplete
Store.getCapacity Store.getUsedCapacity Store.getFreeCapacity
Creep.move Creep.moveTo Creep.attack Creep.rangedAttack Creep.rangedMassAttack Creep.heal Creep.rangedHeal Creep.harvest Creep.build Creep.pickup Creep.pull Creep.transfer Creep.withdraw Creep.drop
StructureSpawn.spawnCreep StructureSpawn.setDirections
SpawnCreepResult
Spawning.cancel
StructureTower.attack StructureTower.heal
CreateConstructionSiteResult
ConstructionSite.remove
pathFinder.searchPath pathFinder.goal pathFinder.opts.plainCost pathFinder.opts.swampCost pathFinder.opts.flee pathFinder.opts.maxOps pathFinder.opts.maxCost pathFinder.opts.heuristicWeight pathFinder.opts.costMatrix pathFinder.opts.ignore pathFinder.CostMatrix
CostMatrix.set CostMatrix.get CostMatrix.clone
visual.Visual
Visual.layer Visual.persistent Visual.circle Visual.line Visual.rect Visual.poly Visual.text Visual.clear Visual.size
VisualStyle.radius VisualStyle.fill VisualStyle.opacity VisualStyle.stroke VisualStyle.strokeWidth VisualStyle.lineStyle VisualStyle.color VisualStyle.font VisualStyle.align VisualStyle.backgroundColor VisualStyle.backgroundPadding
const.OK const.ERR_NOT_OWNER const.ERR_NO_PATH const.ERR_NAME_EXISTS const.ERR_BUSY const.ERR_NOT_FOUND const.ERR_NOT_ENOUGH_ENERGY const.ERR_NOT_ENOUGH_RESOURCES const.ERR_NOT_ENOUGH_EXTENSIONS const.ERR_INVALID_TARGET const.ERR_FULL const.ERR_NOT_IN_RANGE const.ERR_INVALID_ARGS const.ERR_TIRED const.ERR_NO_BODYPART const.MOVE const.WORK const.CARRY const.ATTACK const.RANGED_ATTACK const.HEAL const.TOUGH const.TOP const.TOP_RIGHT const.RIGHT const.BOTTOM_RIGHT const.BOTTOM const.BOTTOM_LEFT const.LEFT const.TOP_LEFT const.TERRAIN_PLAIN const.TERRAIN_WALL const.TERRAIN_SWAMP const.RESOURCE_ENERGY const.ATTACK_POWER const.RANGED_ATTACK_POWER const.HEAL_POWER const.RANGED_HEAL_POWER const.HARVEST_POWER const.BUILD_POWER const.REPAIR_POWER const.REPAIR_COST const.DISMANTLE_POWER const.DISMANTLE_COST const.BODYPART_HITS const.CARRY_CAPACITY const.MAX_CREEP_SIZE const.CREEP_SPAWN_TIME const.MAX_CONSTRUCTION_SITES const.CONSTRUCTION_COST_ROAD_SWAMP_RATIO const.CONSTRUCTION_COST_ROAD_WALL_RATIO const.CONTAINER_CAPACITY const.CONTAINER_HITS const.EXTENSION_ENERGY_CAPACITY const.EXTENSION_HITS const.RAMPART_HITS const.RAMPART_HITS_MAX const.WALL_HITS const.WALL_HITS_MAX const.ROAD_HITS const.ROAD_HITS_SWAMP const.ROAD_WEAROUT const.RESOURCE_DECAY const.SOURCE_ENERGY_REGEN const.SOURCE_ENERGY_CAPACITY const.SPAWN_ENERGY_CAPACITY const.SPAWN_HITS const.SPAWN_ENERGY_REGEN const.TOWER_CAPACITY const.TOWER_COOLDOWN const.TOWER_ENERGY_COST const.TOWER_FALLOFF const.TOWER_FALLOFF_RANGE const.TOWER_HITS const.TOWER_OPTIMAL_RANGE const.TOWER_POWER_ATTACK const.TOWER_POWER_HEAL const.TOWER_POWER_REPAIR const.TOWER_RANGE const.EFF_ATTACK_BOOST const.EFF_CONSTRUCTION_BOOST const.EFF_HEAL_BOOST const.EFF_MOVE_BOOST const.EFF_RANGED_ATTACK_BOOST const.EFF_WORK_BOOST const.EFF_ATTACK_MODIFIER const.EFF_RANGED_ATTACK_MODIFIER const.EFF_HEAL_MODIFIER const.EFF_DAMAGE_TAKEN_MODIFIER const.EFF_FATIGUE_MODIFIER const.EFF_HITS_LOSS const.BODYPART_COST const.CONSTRUCTION_COST const.RANGED_ATTACK_DISTANCE_RATE const.OBSTACLE_OBJECT_TYPES const.RESOURCES_ALL const.STRUCTURE_PROTOTYPES
arena.RESOURCE_SCORE arena.RESOURCE_SCORE_X arena.RESOURCE_SCORE_Y arena.RESOURCE_SCORE_Z arena.EFFECT_FREEZE arena.EFFECT_HEAL arena.EFFECT_DAMAGE arena.EFFECT_SLOWDOWN arena.EFFECT_CONSTRUCTION_BOOST arena.TICKS_LIMIT arena.MAX_SCORE_PER_TICK arena.FLAG_TYPES
```

### 未单独做积木的项
- `game` 模块的聚合导出（`game.utils` / `game.prototypes` / `game.constants` / `game.pathFinder` / `game.visual`）：只是同一批函数的另一种导入写法，功能已由上面的积木全部覆盖；`arenaInfo` 有单独积木。
- `EffectZone`：引擎内部原型，官方未导出。
- `getHeapStatistics` 有积木，但沙箱里数值为占位。
