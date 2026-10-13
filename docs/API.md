# 已实现 API（对照 https://arena.screeps.com/docs）

| 模块 | 内容 |
|---|---|
| `game/utils` | `getTicks getObjects getObjectById getObjectsByPrototype getRange getDirection getTerrainAt getCpuTime getHeapStatistics findInRange findClosestByRange findClosestByPath findPath createConstructionSite` |
| `game/prototypes` | `GameObject`、`Creep`、`Structure`/`OwnedStructure`、`StructureSpawn`/`Spawning`、`StructureTower`、`StructureContainer`/`Extension`/`Rampart`/`Road`/`Wall`、`Source`/`Resource`/`ConstructionSite`/`Flag`/`Store` |
| `game/constants` | 文档常量；另补 `SPAWN_ENERGY_REGEN=1`、`SOURCE_ENERGY_CAPACITY`、`ROAD_HITS_SWAMP` |
| `game/path-finder` | `searchPath`、`CostMatrix` |
| `game/visual` | `Visual` |
| `game` | `arenaInfo` |

## 结算规则要点
- 伤害按身体部件从前往后扣；敌方 Rampart 上目标（含 mass attack）转伤 Rampart。
- `rangedMassAttack` 用 `RANGED_ATTACK_DISTANCE_RATE`；塔攻 1000−50/格，疗 600−30/格。
- 疲劳：hits>0 非 MOVE（空 CARRY 不计）× 路1/平原2/沼10；每 MOVE 每 tick −2。
- 建造：1 能量 = 1 进度，每 WORK × `BUILD_POWER`；需 WORK+CARRY；上限 10。
- 掉落衰减 `ceil(amount/RESOURCE_DECAY)`；同格 Container 自动吸收。
- Source +`SOURCE_ENERGY_REGEN`；Spawn +`SPAWN_ENERGY_REGEN`(1)。
- 同 tick 互斥按官方文档。
- Extension 任意距离；扣能先 Spawn 后 Extension。

模式未知项见 [SPAWN_AND_SWAMP.md](./SPAWN_AND_SWAMP.md)。
