---
status: reference
type: runbook
owner: you
---

# 数据库备份与恢复演练 SOP

> 适用环境：云数据库（托管 RDS / 托管 Postgres / 托管 MySQL 等，生产）
>
> 核心原则：**没有定期演练过的备份不算备份。** 备份开着但从未恢复过 = 假备份。

> 本文件假设你已经在用：进程管理器（pm2 / systemd）、一个告警通道（Slack / 飞书 / 自定义 webhook，下文统一记作 `NOTIFY_WEBHOOK_URL`）。
> 链路里出现的业务表名（`users` / `tenants` / `leads` / `customers` 等）来自一个多租户 CRM 示例，**仅作示例**，换成你自己的核心表即可。

---

## 一、初次配置检查清单（一次性，开通账号后立刻完成）

按顺序在你云厂商的「数据库控制台 → 实例详情 → 备份恢复」里检查：

- [ ] **数据备份**：开启，频率 **每天 1 次**，保留周期 **≥ 30 天**
- [ ] **日志备份**：开启，保留周期 **≥ 30 天**（用于 PITR 时间点恢复）

> ⚠️ **保留期 vs 用户"彻底删除我的数据"的冲突**：备份保留 ≥30 天 + 跨地域副本，意味着用户在主库被删后，他的个人数据（PII）还会在备份里**继续躺最多 30 天**。当用户依法行使删除权（GDPR / CCPA 等类似法规）要求"彻底删除"时，怎么处理备份里这份残留，见 [`../business/compliance-and-privacy.md`](../business/compliance-and-privacy.md)「二、数据隐私请求：删除权与导出权」及其后「三、硬冲突：彻底删除 vs 备份保留」一节——别让"备份保留"和"删除权"互相打架。
- [ ] **跨地域备份**：开启，目标地域选择**与主实例不同的地域**（一主一备，机房整挂时唯一可用的那份）
- [ ] **备份压缩**：开启（节省存储费）
- [ ] **备份窗口**：避开业务高峰，建议放在你用户最少的时段

完成后在云监控里创建告警：
- 「备份失败」事件 → 推到 `NOTIFY_WEBHOOK_URL`

---

## 二、季度恢复演练 SOP（每季度执行一次）

> 频率：每季度第一个周一执行；演练结果记录到你的 sprint / 运维日志。
>
> 目的：验证三件事 ——
> 1. 备份文件本身完好（能解压、能恢复出实例）
> 2. 恢复时长在可接受范围（生产数据量级下 ≤ 60min）
> 3. 关键表数据完整（行数与备份时刻的生产一致）

### 步骤

#### Step 1 — 选定恢复目标
在数据库控制台选最近一次成功备份（「备份恢复」→「数据备份」列表，状态 = 完成）。

记录：备份 ID、备份时间、备份大小。

#### Step 2 — 克隆到临时实例
控制台 → 备份恢复 → 选中备份 → 「恢复到新实例」：

- 实例规格：选 **最低规格**（演练只验证恢复，不验证性能）
- 网络类型：**与生产同 VPC / 同私有网络**
- 实例名：`<app>-db-drill-{YYYYMMDD}` 显式标记演练
- 付费方式：**按量付费**（演练完销毁，单次成本极低）

提交后等待 20-40 分钟（取决于数据量）。

#### Step 3 — 行数验证

待新实例进入「运行中」状态后，临时白名单加入演练机器 IP，连接并执行（以下表名为多租户 CRM **示例**，替换成你的核心表）：

```sql
-- 关键表行数（与生产对比，差异应为 0 或备份后到现在的写入增量）
SELECT 'users' AS t, COUNT(*) FROM users WHERE deletedAt IS NULL
UNION ALL SELECT 'tenants', COUNT(*) FROM tenants WHERE deletedAt IS NULL
UNION ALL SELECT 'leads', COUNT(*) FROM leads WHERE deletedAt IS NULL
UNION ALL SELECT 'customers', COUNT(*) FROM customers WHERE deletedAt IS NULL
UNION ALL SELECT 'orders', COUNT(*) FROM orders WHERE deletedAt IS NULL
UNION ALL SELECT 'operation_logs', COUNT(*) FROM operation_logs;

-- 多租户隔离断言（任一租户应能看到自己的数据；非多租户产品可删）
SELECT tenantId, COUNT(*) FROM users GROUP BY tenantId LIMIT 5;
```

同时在生产连接执行同样的查询（注意只读，**禁止任何写操作**）。

对比两边：
- 生产 ≥ 演练（生产可能在备份时刻后又写入了新数据，差异应该是这部分增量）
- 演练实例某表 = 0 而生产有数据 → **备份损坏，立即升级排查**

#### Step 4 — 应用层冒烟（可选但推荐）
临时改演练机器的 `.env` 把 `DATABASE_URL` 指向克隆实例，启动一个本地 server：

```bash
DATABASE_URL='<drill-instance-connection-string>' NODE_ENV=test node server/index.js
```

跑核心冒烟（以多租户 CRM 为**示例**）：
- 登录一个账号 → 看到自己应看到的数据列表
- 列表分页能正常翻页（验证索引完好）
- 列表筛选能命中正确数据（验证字段完整）

#### Step 5 — 销毁演练实例
控制台 → 释放实例。**演练完立刻销毁，不要遗留**（按量计费会持续扣费，且白名单留着是安全风险）。

#### Step 6 — 记录结果
在你的 sprint / 运维日志追加：

```markdown
### 数据库恢复演练 YYYY-Q[1-4]
- 备份 ID: bk-xxxxxxxxxx
- 备份时间: YYYY-MM-DD HH:MM UTC
- 恢复耗时: NN 分钟
- 行数对比: ✅ 全部一致 / ⚠️ users 差异 N 条（备份后增量），其他一致
- 应用层冒烟: ✅ 通过 / ❌ 失败原因
- 销毁时间: YYYY-MM-DD HH:MM
```

如果有任何 ❌，**当周内必须排查到根因并修复**，不能拖到下季度。

---

## 三、关键迁移前快照 SOP（每次部署前）

> 触发条件：本次部署包含数据库迁移（如 `prisma migrate deploy` / 等价命令），且迁移涉及 ALTER / DROP 任何业务表。
>
> 这是部署铁律的一部分：**生产部署开始前第一件事是记录回滚点**（见 `../../.claude/CLAUDE.md` 部署/生产操作准则，对应示例编号 P3）。

### 步骤

#### Step 1 — 创建手动快照
控制台 → 备份恢复 → 数据备份 → 「立即备份」，描述写：`pre-deploy-{commit-sha-short}-{YYYYMMDD-HHMM}`。

等待状态变为「完成」（通常 5-15 分钟）。

> ⚠️ 自动备份每天只跑一次，所以若刚完成自动备份且本次部署是同一天内，可以**跳过手动备份**直接用自动备份做回滚点（节省时间）；否则**必须**手动打快照。

#### Step 2 — 在部署 commit message 或 CHANGELOG 记录
```
deploy: <feature description>

Pre-deploy snapshot: bk-xxxxxxxxxx (taken YYYY-MM-DD HH:MM UTC)
Rollback procedure: see ops/run/backup-recovery-sop.md §四
```

#### Step 3 — 部署
继续正常部署流程（见 [`../../lifecycle/7-deploy/`](../../lifecycle/7-deploy/)）。

---

## 四、紧急回滚（生产已经出问题时）

> 适用场景：迁移执行后发现数据破坏 / 字段误删 / 业务跑不动 / 客户数据丢失。
>
> 优先级：先稳住，再追因。

### 决策树

```
出问题 → 业务能继续跑吗？
  ├─ 能（只是部分功能异常） → 评估能否前向修复（写补救 migration / hot fix）
  │   └─ 能在 30min 内修好 → 前向修复，不回滚
  │   └─ 不能 → 走完整回滚
  └─ 不能（数据已经写错 / 大量 500） → 立即回滚，不犹豫
```

### 完整回滚步骤

#### Step 1 — 通知
往 `NOTIFY_WEBHOOK_URL` 发：`🚨 生产数据库回滚开始 - reason: <原因> - eta: 30min`。

#### Step 2 — 切到维护模式
用进程管理器停掉应用（`pm2 stop <app>` / `systemctl stop <service>`，或反代返回 502 维护页），让客户看到维护中而不是数据异常。

#### Step 3 — 从快照恢复
数据库控制台 → 备份恢复 → 找 Step 1 中的 `pre-deploy-{sha}` 快照（或当天自动备份）。

两种恢复模式：
- **覆盖原实例**：直接恢复回主实例，**会丢失备份后所有写入**（高风险，生产数据写入 = 客户痛点）
- **恢复到新实例 + 切换连接**：恢复到新实例，确认无误后改 `DATABASE_URL` 指向新实例

**强烈推荐第二种**：
1. 备份恢复到新实例 `<app>-db-rollback-{YYYYMMDD-HHMM}`
2. 等待新实例就绪（20-60min）
3. 修改生产 `.env` 的 `DATABASE_URL` 指向新实例
4. 用进程管理器 reload 应用（`pm2 reload <app>` / `systemctl restart <service>`）
5. 验证：登录、核心列表、最近 10 条新增是否符合预期
6. 验证通过后保留旧实例 24h 再销毁（防新实例也有问题）

#### Step 4 — 复盘
- 把这次根因写进你的「常见陷阱」沉淀文档
- 同步任何新业务规则到业务规则登记表
- 评估是否需要补充 migration 前置校验
- 复盘走 [`../../lifecycle/9-retrospective/`](../../lifecycle/9-retrospective/)

---

## 五、配套自动化

### 5.1 备份新鲜度告警
一个每日 cron 脚本调用云厂商 OpenAPI：
- 列出最新备份（如 `DescribeBackups` 等价接口）
- 若最新备份 > 26 小时前 → 推 `NOTIFY_WEBHOOK_URL`
- 阻断任何部署直到备份恢复正常

### 5.2 监控大盘
数据库控制台已有的告警建议全开：
- 实例 CPU > 80% 持续 5min
- 连接数 > max_connections × 0.8
- 磁盘使用率 > 85%
- 备份失败事件

全部接入同一个告警通道（`NOTIFY_WEBHOOK_URL`）。可用性 / 健康监控的完整配置见 [`./monitoring-sop.md`](./monitoring-sop.md)。

---

## 附录：常见踩坑

| 现象 | 原因 | 处理 |
|---|---|---|
| 备份开着但跨地域备份没开 | 控制台默认不开 | 立刻开启，跨地域备份是「机房整个挂掉」时唯一可用的备份 |
| 演练时连不上克隆实例 | 白名单没加 | 克隆实例的白名单是空的，不继承生产；要单独加 |
| 行数差异大于预期 | 自动备份是夜间跑的，到演练时已写入大量新数据 | 正常现象，看的是「演练 ≤ 生产」而不是绝对相等 |
| 恢复后业务挂 | 应用版本与数据库 schema 不匹配（部署了新代码但用的是旧备份） | 把代码也回滚到备份当时对应的 commit |
