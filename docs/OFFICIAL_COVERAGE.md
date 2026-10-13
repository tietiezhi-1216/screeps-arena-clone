# 官方 API 覆盖清单 / Official API Coverage (v0.6.0)

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
