# 赛季模式（v0.6）/ Season modes

API 严格按 `screeps/arena-definitions` 导出（`import { ... } from 'arena'`）。标注 APPROX 的为官方未公开、本项目自行设定的规则。
共同基础（APPROX）：沿用 Spawn and Swamp 的镜像随机地图、双方 Spawn 与家门口容器。

| 模式 | 导出 | 规则 |
|---|---|---|
| Construct and Control S1/S2 | AreaEffect, ConstructionBoost, StructureGoal, EFFECT_SLOWDOWN, EFFECT_CONSTRUCTION_BOOST | 先建成 StructureGoal（`createConstructionSite(pos, StructureGoal)`，进度 3000 APPROX）者胜。中线 AreaEffect(slowdown) 使移动疲劳 ×2（APPROX）。每 100 tick 镜像刷 ConstructionBoost（存活 100 tick APPROX），踩上获得 EFF_CONSTRUCTION_BOOST ×2 持续 200 tick（官方：200 tick）。 |
| Portal Exploration S1 | Portal（destination） | 中央两列墙（APPROX），三对传送门穿越；creep 站上传送门后于 tick 末传送到 destination（目标格被占则不传）。胜负同 S&S。 |
| Power Split S2/S3 基础·高级 | BonusFlag（bonusType） | 中线 BonusFlag（基础 3 个：attack/ranged_attack/heal；高级再加 work/move，APPROX）。唯一一方 creep 站上即占领；占领方所有 creep 对应 EFF_*_BOOST ×1.5（APPROX）。胜负同 S&S。 |
| Pain and Gain S4 | ScoreFlag（effectType, scorePerTick）, TICKS_LIMIT=2000, MAX_SCORE_PER_TICK=25, FLAG_TYPES | 8 面旗（镜像）踩上即占领；每 tick 得分 = min(25, Σ scorePerTick)；占领方全体 creep 承受对应 debuff（*_MODIFIER ×0.75 或 DAMAGE_TAKEN ×1.25，APPROX）。FLAG_TYPES 数值 APPROX。2000 tick 后高分者胜。 |
| Escort Run S3/S4 | EscortCreep extends Creep | 每方开局一个 EscortCreep（2 MOVE + 4 TOUGH，APPROX），需走到敌方半场的中立 Flag（APPROX）。先到者胜；护送者死亡判负；超时比距离。 |
| Collect and Control 基础/高级 | ScoreCollector, RESOURCE_SCORE(_X/Y/Z), EFFECT_FREEZE/HEAL/DAMAGE | 见 OFFICIAL_COVERAGE.md；v0.6 新增 FREEZE（无法移动）/HEAL（+30/tick）/DAMAGE（EFF_HITS_LOSS 30/tick）区域（APPROX）。 |

## 建造规划 / Build plan
底部「建造」可在地图上点选最多 10 个工地（墙/城墙/道路/容器/扩展/塔），以己方 Spawn 为原点保存；开局时等价于在 tick 1 调用 `createConstructionSite`，对手方向自动镜像。联机时随代码一起提交。


> v0.6 发布：UI 仅开放 Spawn and Swamp / Capture the Flag / Collect and Control。本文件中的赛季模式为引擎预留，默认不出现在模式选择器。
