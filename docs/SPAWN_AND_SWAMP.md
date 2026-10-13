# Spawn and Swamp — 官方对照与未知项

对照来源：
- https://arena.screeps.com/docs（原型 / 常量 / Source / Spawn / Extension / Tower / Container / Rampart / Road）
- Steam changelog（2021-06-26、2021-08-11）：Advanced `ticksLimit=10000`、Spawn 每 tick +1 能量、Basic 中场容器「不断出现并很快消失」
- 社区讨论（布局描述，非官方规格书）

## 已确认（引擎按此实现）

| 项 | 值 / 行为 |
|---|---|
| Source | capacity 1000，每 tick +`SOURCE_ENERGY_REGEN`(10) |
| Spawn | hits 3000，capacity 1000，`CREEP_SPAWN_TIME`=3/部件 |
| Spawn 能量回复 | **1 / tick**（changelog；`SPAWN_ENERGY_REGEN`） |
| Extension | cost 200，hits 100，capacity 100；**任意距离**可供本方 Spawn（Extension 文档） |
| spawnCreep 扣能 | 先 Spawn 再 Extension（社区实测） |
| Tower | cost 1250，hits 3000，capacity 10，cooldown 10，range 20；攻 1000−50/格，疗 600−30/格 |
| Container | capacity 2000，cost 100，hits 300；同格掉落物自动进入 |
| Rampart | cost 200，hits 10000；敌方 Rampart 上的目标伤害转 Rampart |
| Road | 平原 cost 10 / hits 500；沼泽 ×5 / hits 2500 |
| Wall | cost 100，hits 10000 |
| 建造上限 | `MAX_CONSTRUCTION_SITES`=10 |
| Advanced ticksLimit | **10000** |
| 胜负 | 摧毁对方 Spawn；超时平局 |

## 近似（官方未公开）

| 项 | 本项目取值 |
|---|---|
| 地图生成 | 100×100 镜像沼泽噪音 |
| Spawn 坐标 | (8,50)/(91,50) |
| Spawn 初始能量 | 500 |
| 家门口容器 | 每侧 3×500（Advanced 家门口 300） |
| 中场容器 | 每 50 tick 镜像一对，能量 200–500，寿命 100 tick |
| Advanced Source | 每侧 2 个 |
| Advanced 出生 Rampart | Spawn 周围 8 格 |
| Basic ticksLimit | 2000 |

## API 边界（本分支）

- 同 tick 互斥：attack/harvest/build/heal/ranged* 按文档
- `attack` 可摧毁 `ConstructionSite`
- `harvest` CARRY 满时仍采，多余掉落（或进同格容器）
- `rangedMassAttack` 同样转伤 Rampart
- 疲劳：hits=0 不计重量；空 CARRY 不计
- `pull`：目标移向拉者时疲劳加到拉者
- 已移除错误的 `SPAWN_RANGE` 过滤
