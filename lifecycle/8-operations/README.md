# ⑧ 运营 / 监控

> 上线不是终点。这一步把"系统在跑"变成"我知道它跑得好不好"。

这一阶段**没有独立内容目录**:它由 `ops/`(运营协作流程)+ `engineering/` 的健康度审计覆盖。下面是该用的——

| 你在做 | 用什么 | 在哪 |
|--------|--------|------|
| 每周体检(5 个数字 + 5 个手测路径) | 周检 5+5 | [`../../ops/cadence/weekly-check.md`](../../ops/cadence/weekly-check.md) |
| 判断"该不该招人了" | 工时 tally(修 bug 连续 2 周 >30% → 招人) | [`../../ops/cadence/hours-tally.md`](../../ops/cadence/hours-tally.md) |
| 月度趋势报告(红线 + 粗筛 → 大白话) | `health-audit.cjs` | [`../../engineering/quality-scripts/health-audit.cjs`](../../engineering/quality-scripts/health-audit.cjs) |
| 搭无人值守定时产出(日报 / 监控) | S10 运营自动化定时工作流 | [`../../engineering/governance-skills/S10-ops-automation-cron-workflow.md`](../../engineering/governance-skills/S10-ops-automation-cron-workflow.md) |
| 审计发现"无异常" | 审计先验证后报告(`audit-verify-first`):别把"零候选"当"安全" | [`../../engineering/governance-skills/S9-audit-verify-before-report.md`](../../engineering/governance-skills/S9-audit-verify-before-report.md) |

**上游**:⑦ 上线([`../7-deploy/`](../7-deploy/))。
**下游**:⑨ 复盘([`../9-retrospective/`](../9-retrospective/))——把运营暴露的问题沉淀成规则,喂回前面所有阶段。
