---
status: template
owner: you
---

# AI Coding Governance Skill Pack — 治理 skill 包导航

> 把「PM + AI」协作开发多租户 SaaS 系统的经验，沉淀成**同行可直接复用**的治理方法论。
> 设计理念：**用流程纪律代替人盯人，让 AI 在明确的规则边界内自主执行。**

本手册不是「怎么写好代码」的通用教程（那类已有 obra/superpowers 等开源框架），而是回答一个更具体的问题：

> **一个人（尤其技术背景不强的 founder / PM）带着 AI，怎么在真实的业务系统里持续交付而不闯祸？**

每个 skill 都不是空话，而是从一次真实事故 / 一条真实红线 / 一次真实返工里长出来的——不是写了就算数，每条都配可复现的治理测试样本（eval）来证明它真的拦得住 AI 越界。

---

## 定位：先治理底座，后业务自动化

这套方法论分两层。先后顺序是刻意的——治理没做好，业务 skill 越强，越会把错误自动化放大。

```text
Phase 1 · AI Coding Governance Skill Pack（本手册当前内容）
  目标：让 AI 在系统开发中可控、可验、可追溯。
  解决：不自作主张加业务规则 / 不乱改无关文件 / 不跳过验证就说完成 /
        不破坏多租户隔离 / 不乱部署乱提交乱删 /
        遇授权缺失·规则冲突·生产错误时知道停下来。

Phase 2 · Business Operation Skill Pack（同方法迁移）
  目标：让 AI 处理你业务领域的具体流程（销售会议、单据、状态机…）。
  做法：用同一套 skill 方法迁移过来，但 eval 设在「代码层」，
        且每条先跑真 eval 验净贡献再决定留不留。
```

> **「eval 思维」从 Phase 1 就保留**，只是测试样本先换成**开发治理场景**——用可复现的样本证明每个 skill 真的拦得住 AI 的越界行为。
>
> 这条路线的说服力在于：**不是先做业务自动化，而是先建 AI coding 的治理底座；等开发质量稳定，再把同样的方法迁移到业务流程。**

---

## 八段式结构（所有 skill 共用）

所有 skill 共用同一套结构，模板见 [`SKILL-TEMPLATE.md`](SKILL-TEMPLATE.md)。八段是：

1. **触发条件（When）** — 含自动触发 / 显式触发 / **WHEN-NOT（不触发）** / **HARD-GATE（硬门禁）**
2. **输入（Input）** — 启用前必须先拿到 / 先读的东西
3. **输出（Output）** — 跑完产出什么、落到哪
4. **限制（Constraints）** — 绝不做什么 + **借口→反驳表**（防自我合理化）
5. **验证步骤（Verify）** — 五步门函数（IDENTIFY→RUN→READ→VERIFY→CLAIM）+ 负向确认
6. **失败处理（On Failure）** — 默认动作永远是「停下报告」，不是自行修复
7. **Human Review Trigger** — 没出错但必须停下等人拍板的明确信号
8. **治理测试样本（Eval）** — 2-3 个诱导越界的可复现样本，证明 skill 真有效

> 空话不算 skill——没有「验证步骤」和「失败处理」的，只是建议。

---

## 三端转换表（从「方法论文档」到「可加载 skill」）

本手册是**方法论文档**（人读 + 对标）。要让它在 Claude Code / Codex / Cursor 里**真正被自动触发执行**，按下表转换。一份 skill 文档 → 三端的映射规则一致，只是落地格式不同。

| 目标平台 | 落地位置 | 关键格式 | 怎么从本手册转 |
|---------|---------|---------|---------------|
| **Claude Code** | `~/.claude/skills/<name>/SKILL.md` | frontmatter `name` + `description` | description = 本 skill 第 1 节「触发条件（含 WHEN-NOT）」；正文 = 限制 + 验证 + 失败 + Human Review |
| **Codex** | `~/.codex/skills/<name>/SKILL.md` | 同上，double-quote frontmatter | 额外补 `Skill Boundaries` 章节（指向相邻 skill），治理样本进 `references/` |
| **Cursor** | `.cursor/skills/<name>/SKILL.md`（agent-requested）<br>或 `.cursor/rules/<name>.mdc`（rule） | `disable-model-invocation: true` 默认；rule 用 `alwaysApply` / `globs` | 强约束（如租户隔离、提交纪律）适合做成 `alwaysApply` rule；情景型做 skill |

**8 段 → SKILL.md 的对应**（统一规则，5 段落地为正文 + frontmatter，其余 3 段并入）：

```
开头「一句话定位」(WHAT) + 第1节 触发(WHEN/WHEN-NOT/HARD-GATE)
                                  → frontmatter.description（WHAT+WHEN+WHEN-NOT，第三人称，≤1024字符）
                                    ⚠️ WHAT 取自文件开头「一句话定位」行，第1节本身不含 WHAT
第2/3节 输入/输出                  → 正文「前置条件 / 产出」
第4节 限制 + 借口反驳表            → 正文「边界 / Red Flags / Rationalization」
第5节 验证(Gate Function)         → 正文「Verification」
第6节 失败处理                    → 正文「On Failure / 报错即停」（不可省）
第7节 Human Review Trigger        → 正文「何时升级人工 / STOP」
第8节 治理测试样本                → references/tests.md（eval，按需加载）
```

**硬性要求**（综合 Anthropic / Cursor / Codex 官方约束）：name 小写连字符 ≤64 字符；正文 <500 行；引用只一层深；术语一致；例子用真实数据；无时间敏感信息。

> ✅ 每个 skill 文件头**已写好成品 `name` + `description` frontmatter**，clone 后 description 可直接用，无需自拼。

**成品 frontmatter 样例**（以 S4 为例）：

```yaml
# ① Claude Code / Codex —— skills/<name>/SKILL.md
---
name: tenant-isolation-guard
description: "写或改任何读/写租户数据的查询时，确保 where 带 tenantId + 数据范围 + 脱敏…触发：写 findX/update/delete/导出/改 where。不触发：纯前端样式/i18n。"
---
# 正文 = 本手册 S4 第 2~8 节

# ② Cursor 强约束做成 always rule —— .cursor/rules/tenant-isolation.mdc
---
description: 多租户隔离守卫（写/改查询必带 tenantId）
globs: "server/**/*.{js,ts}"   # 示例栈：按你的后端目录换
alwaysApply: false             # 配 globs：打开匹配文件时自动挂
---
# 正文 = S4 的 HARD-GATE + 借口反驳表 + 验证步骤
```

---

## Skill 目录（11 条治理防线）

每个 skill 对应「五层防线」中的某一环，或一条用事故换来的纪律。「复用现有 skill」列标明它是指向已有可执行 skill、还是填补空白。

> 复用图例：🟢 现有 skill 已覆盖（手册只指向 + 补语境）｜🟡 部分覆盖（手册补增量）｜🔴 空白（手册新增核心价值）。

| # | Skill | 触发条件 | 复用现有 skill | 复用状态 |
|---|-------|---------|---------------|---------|
| **S1** | [任务分级 · 方案先行](S1-task-triage-plan-first.md) | 收到任何新需求时 | `prd-author` / `prd-review`（PRD 层）+ superpowers `brainstorming` / `writing-plans` | 🟡 增量：补「任务分级判定」前置 |
| **S2** | [业务规则登记](S2-business-rule-registry.md) ★样板 | 加任何校验 / 自动行为 / 硬编码常量 | —（无现成 skill） | 🔴 **空白·最高价值** |
| **S3** | [出码前自检](S3-pre-code-self-check.md) | 准备输出代码前 | `code-review` / `ui-check`（事后） | 🟡 增量：补**出码前**自检 |
| **S4** | [多租户隔离守卫](S4-tenant-isolation-guard.md) | 写 / 改数据库查询时 | —（无现成 skill） | 🔴 **空白** |
| **S5** | [安全提交纪律](S5-safe-commit-discipline.md) | git 提交前 | **`commit`** ✅ | 🟢 已有：手册仅指向 + 补「为什么」 |
| **S6** | [生产部署红线](S6-production-deploy-redlines.md) | 部署 / 运维生产时 | **`deploy`** ✅ | 🟢 已有：补部署红线映射 |
| **S7** | [系统化调试 · 报错即停](S7-systematic-debugging.md) | 排查 bug / 线上异常 | superpowers `systematic-debugging`（参考） | 🟡 增量：补「先建反馈环」纪律 |
| **S8** | [交付验收门禁](S8-delivery-verification-gate.md) | 宣布「做完」前 | `code-review` + superpowers `verification-before-completion` | 🟡 增量：接生产就绪登记表 |
| **S9** | [审计先验证后报告](S9-audit-verify-before-report.md) | 做代码 / 安全 / 业务审计 | —（无现成 skill） | 🔴 **空白**：对应防漂移原则① |
| **S10** | [运营自动化定时工作流](S10-ops-automation-cron-workflow.md) | 搭无人值守定时产出 | routines / cron | 🟢 已有：抽象成 cron 通用范式 |
| **S11** | [关键决策多视角头脑风暴](S11-multi-perspective-decision.md) | 需求定稿 / 架构选型 / 安全审计·复盘 / 疑难 bug 根因 | —（无现成 skill）+ 可执行 [decision-brainstorm](../../ops/decisions/decision-brainstorm.js) workflow | 🔴 空白·决策方法 |

> **11 条全部就位**。闭环骨架:S1 入口 · S3 编码中 · S4 碰数据 · S5/S6 提交与部署出口 · S7 异常 · S8 完成闸 · S9 审计 · S11 决策。
> 业务事实型 skill 怎么写,见 [`_examples-business/`](_examples-business/) 范例;每条 skill 怎么用 eval 验"真拦得住",见 [`eval/`](eval/)。

---

## 同行怎么复用（复用三策）

1. **整套搬走**：把本目录 clone 到你的 `docs/`，按你的技术栈替换具体命令（进程管理器 / web 服务器 / ORM 等），保留「触发条件 + 验证步骤 + 失败处理」三段骨架。
2. **挑着用**：每个 skill 自包含，可单独取用。优先取 S2（业务规则登记）和 S6（部署红线）——这两条是 SaaS 业务系统最容易翻车、通用框架又不覆盖的。
3. **接成可执行 skill**：本手册是「方法论文档」；要让 Claude Code / Cursor 真正自动触发，把每个 skill 的「触发条件」写进对应 `SKILL.md` 的 `description`，「验证步骤 + 失败处理」写进正文。`~/.claude/skills/{commit,deploy,code-review}` 即此模式。

---

## 一页纸心法（给赶时间的人）

- 规则即护栏：不是让 AI 少做，而是让它在边界内放手做。
- 小事不拖，大事先对齐（S1）。
- AI 最大的风险不是写错代码，是「好心办坏事」自作主张加规则——所以业务逻辑必须授权 + 登记（S2）。
- 危险操作（删除 / 重启进程 / 部署 / 跨租户）必须带回滚点、不越界、报错即停（S6 + 行为规范）。
- 说「搞定了」之前先跑验证；审计发现先读文件再报告（S8 / S9）。
