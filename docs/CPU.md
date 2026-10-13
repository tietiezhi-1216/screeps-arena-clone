# CPU 限制与确定性

对照 [Arena 文档](https://arena.screeps.com/docs/) 的 `arenaInfo.cpuTimeLimit`（50 ms）与 `cpuTimeLimitFirstTick`（1000 ms）。

| 模式 | 用途 | 计量方式 | 可复现性 |
|---|---|---|---|
| `budget`（默认 CLI / `npm test` / `npm run match`） | 离线对局、测试 | 每个循环体/函数入口的 `__chk()` 计 1 点；配额 = `ms × 1000` | 同一种子、同一脚本 → 结果字节级一致 |
| `wall`（`www/worker.js` 实时 UI / 联机房主） | 手机上的实时对局 | `performance.now()` 墙钟 | 依赖设备性能，跨机不可复现 |

超时行为（两种模式相同）：该玩家本 tick 的**全部 intent 作废**（含 `spawnCreep`），已在 loop 里返回的占位 creep 不会入场，能量不会被扣。

官方语义：玩家代码只登记 intent，双方代码跑完后统一结算（见社区对 Arena tick/intent 的说明，以及 [Simultaneous Actions](https://docs.screeps.com/simultaneous-actions.html)）。
