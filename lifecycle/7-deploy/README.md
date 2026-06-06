# ⑦ 上线 / 部署

> 部署最怕"出错了还自己乱救"。这一步的红线:带回滚点、报错即停。

这一阶段**没有独立内容目录**:它由 `engineering/` 的部署红线 skill + 项目宪法的生产铁律覆盖。下面是该用的——

| 你在做 | 用什么 | 在哪 |
|--------|--------|------|
| 部署 / 运维生产 | S6 生产部署红线(方案确认→连续执行→报错即停) | [`../../engineering/governance-skills/S6-production-deploy-redlines.md`](../../engineering/governance-skills/S6-production-deploy-redlines.md) |
| 定生产操作纪律 | 项目宪法 P1-P3 生产铁律 | [`../../.claude/CLAUDE.md`](../../.claude/CLAUDE.md) |
| 部署前 | 守卫拦 force-push / `pm 重启 all` 等危险操作 | [`../../engineering/enforcement/hooks/guard-dangerous-bash.cjs`](../../engineering/enforcement/hooks/guard-dangerous-bash.cjs) |

**三条红线**(违反 = 生产事故直接责任):① 方案确认后连续执行不逐步确认;② 任何一步报错**立即停下汇报**,不自行重试 / 修复 / 回滚;③ 执行前先记录回滚点(commit sha + 进程状态 + 备份)。

**上游**:⑥ 测试([`../6-testing/`](../6-testing/))。
**下游**:⑧ 运营([`../8-operations/`](../8-operations/))。
