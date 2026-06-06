# ⑤ 编码

> 把方案变成代码。这一步最容易"好心办坏事"——所以全程有守卫盯着。

这一阶段**没有独立内容目录**:它由跨阶段的 `engineering/`(always-on 护城河)全程守着。下面是编码时该用的工具——

| 你在做 | 用什么 | 在哪 |
|--------|--------|------|
| 加任何校验 / 自动行为 / 硬编码常量 | S2 业务规则登记(先授权再登记,别擅自加) | [`../../engineering/governance-skills/S2-business-rule-registry.md`](../../engineering/governance-skills/S2-business-rule-registry.md) |
| 准备输出代码前 | S3 出码前自检(字段/三态/分层/安全) | [`../../engineering/governance-skills/S3-pre-code-self-check.md`](../../engineering/governance-skills/S3-pre-code-self-check.md) |
| 写 / 改数据库查询 | S4 多租户隔离守卫 | [`../../engineering/governance-skills/S4-tenant-isolation-guard.md`](../../engineering/governance-skills/S4-tenant-isolation-guard.md) |
| 写 UI 页面 / 组件 | 回 ③UI 基线:token / 三态 / 复用红线 | [`../3-ui-baseline/`](../3-ui-baseline/) |
| 危险命令 / 改敏感文件 | 两个 PreToolUse 守卫自动拦 | [`../../engineering/enforcement/`](../../engineering/enforcement/) |
| 改完一类代码,想自查 | 3 个只读 reviewer subagent | [`../../engineering/enforcement/subagents/`](../../engineering/enforcement/subagents/) |
| 提交前 | S5 安全提交纪律(只 stage 本任务文件) | [`../../engineering/governance-skills/S5-safe-commit-discipline.md`](../../engineering/governance-skills/S5-safe-commit-discipline.md) |
| 随时 | 零依赖 lint(断链 / 结构 / i18n / schema) | [`../../engineering/quality-scripts/`](../../engineering/quality-scripts/) |

**上游**:④ 架构评估([`../4-architecture/`](../4-architecture/))出了方案才动手。
**下游**:⑥ 测试([`../6-testing/`](../6-testing/))——宣布"做完"前先过验收闸。
