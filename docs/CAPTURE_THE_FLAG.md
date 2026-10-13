# Capture the Flag — 官方对照与未知项

对照来源：
- https://arena.screeps.com/docs （Flag / Tower / arenaInfo / getTerrainAt 100×100 示例；`docs.screeps.com/arena/` 现 404）
- Steam changelog（[讨论帖](https://steamcommunity.com/app/1137320/discussions/0/3078754800913642994/?ctp=3)）：2021-06-26 Advanced `ticksLimit=10000`；2021-08-11 Advanced 布局改版；2022-04-02 Basic 每方 2 塔
- 官方类型：`screeps/arena-definitions`、`screeps-arena-community/types` → `arena/season_2/capture_the_flag/{basic,advanced}` 导出 `BodyPart`
- 实机 tick-1 快照：`EagleBaby/python_screeps_arena` `maps/s2-blue.json`
- 社区：[jonwinsley CTF](https://jonwinsley.com/notes/screeps-arena)（基础规则；早期「4+4」身体已被实机快照取代）

## 已确认

| 项 | 值 / 行为 | 来源 |
|---|---|---|
| 地图尺寸 | **100×100** | docs；实机快照 |
| 模式名 | `arenaInfo.name === "Capture the Flag"` | starter |
| Basic / Advanced level | `1` / `2` | starter / types |
| Advanced ticksLimit | **10000** | Steam 2021-06-26 |
| Basic 编制 | 每方 **1 旗 + 2 塔 + 14 creep**，无 Spawn | Steam 2022-04-02 + 社区 |
| 胜负 | **占领全部旗帜** | Flag 文档 |
| BodyPart | `type`、`ticksToDecay`；踩上加装；`import { BodyPart } from 'arena/season_2/capture_the_flag/basic'` | types / definitions |
| Tower | capacity **10**，cooldown 10，range 20，能量/次 10；攻击 1000−50/格，治疗 600−30/格 | docs |
| `GameObject.controlledBy` | 控制该对象的 Flag | docs |
| Flag.my | 己 true / 敌 false / 中立 undefined | docs |
| 实机 creep 配方 | 每方 **2×M6C3 + 4×M6H6 + 4×M6R6 + 4×M6A3T3**（治疗 72 / 远程 60 / 近战 90） | s2-blue.json |
| 实机高级布局 | 4 旗（两角己方+两中立）、每旗 1 塔（初始 **0/10**）、旁 1 容器 **1000** 能量；creep `(99-x,99-y)` 对称 | s2-blue.json |

## 近似

| 项 | 本项目取值 | 说明 |
|---|---|---|
| Basic ticksLimit | 2000 | 常量表未公布 |
| Basic 精确坐标/地形 | 对角基地 + 程序化沼泽河 | 无官方 basic 图；高级用实机地形 |
| 部件排列顺序 | 职能/TOUGH 前、MOVE 后 | 快照只有字母计数 |
| BodyPart 刷新/衰减/权重 | 每 25 tick、衰减 300、中场镜像 | 仅知「河中掉落」 |
| 塔自动回充 | **0** | 文档未写；靠 CARRY 灌塔 |
| 「全灭 creep 获胜」 | 附加终局 | 官方只写占旗 |
| Steam 2021-08「角旗 4 塔+中心旗」 | **未采用** | 与当前实机 s2-blue 不符 |

## Import

```js
import { BodyPart } from 'arena/season_2/capture_the_flag/basic';
import { BodyPart } from 'arena/season_2/capture_the_flag/advanced';
```
