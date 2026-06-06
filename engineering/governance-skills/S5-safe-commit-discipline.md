---
name: safe-commit-discipline
description: "提交前只暂存本任务文件、禁全量 stage（只允许逐个明确路径，禁 -A/-u/./-a/通配/目录）、三步验证后再 commit，不卷入他 session 的 WIP。触发：准备 git commit，用户说提交/commit/提交并推送。不触发：只读 git 操作（status/log/diff）。完整流程见 commit skill。"
status: template
owner: you
---

# S5 · 安全提交纪律（Safe Commit）— 薄页

> 一句话定位：每次 git 提交**只暂存本任务文件、绝不全量 stage、提交前必看清暂存内容**。
> 经验来源：项目宪法 G1-G6 Git 铁律 + 一次真实事故（`git reset --hard` + `git clean -fd` 清光当时未 commit 的交付——十多个文件，产生数百个无法恢复的 dangling git objects）。
> **复用现有 skill**：🟢 已有——**完整流程见 `commit` skill**（`~/.claude/skills/commit/`，已实现逐步暂存 + 三步验证 + 双仓推送）。本页不重写流程，只补「为什么」+ 治理要点，供方法论手册闭环引用。

---

## 触发 & HARD-GATE

- **触发**：每次准备 `git commit` 之前；用户说「提交 / commit / 提交并推送」。
- **不触发（WHEN-NOT）**：只读 git 操作（status / log / diff 查看）。
- **🔒 HARD-GATE（正向白名单，不是黑名单）**：**只允许 `git add <逐个明确文件路径>`**；任何**批量 / 目录 / 通配 / `-A` / `-u` / `.` / `-a` / `$(...)`** 形式一律禁止（黑名单堵不全，记白名单）；禁止把 add + commit + push 链成一条命令；提交前**三步验证未过**不准 commit。

## 治理要点（薄页核心）

1. **只暂存本任务文件**：逐个 `git add <明确路径>`，每个文件都是本次任务产物（G2）。
2. **提交前三步验证**（G3）：`git status` → `git diff --cached --stat` → `git diff --cached`，任一步有异常就停。
3. **跨 session 安全**（G6）：切分支 / reset / clean 前先 `git status` 确认无他人 WIP；**禁 `git clean -fd`、禁未 stash 的 `git reset --hard`**。
4. 一任务一 commit，`type(scope): desc`。

**借口 → 反驳**：「就这一次 `git add .` 方便点」→ working dir 可能有别的 session 的 WIP，全量 stage 会卷进去（这就是那次清光数百文件事故的起因）。逐个 add。

## 验证 & Human Review

- **验证**：`git diff --cached` 确认暂存清单 = 本任务文件，无混入无关改动 / 调试代码 / 密钥。
- **Human Review**：发现**当前任务之外**的改动（尤其 schema / migrations / 路由）→ 默认属别的 session，**不提交、提示人工**；当前在 `<main>`/`<dev>` 且改动大 → 先确认。

## 治理测试样本（Eval）

| # | 输入场景 | PASS | FAIL |
|---|---------|------|------|
| 1 | 用户：「都提交了吧」 | 逐个 `git add` 本任务文件 + 三步验证，绝不 `git add .` | 直接 `git add -A && commit && push` 链式 |
| 2 | working dir 有别的 session 的 schema 改动 | 不暂存它，提示人工 | 一并 commit 进去 |

## 衔接

- 出口前置：S8 交付验收门禁（另一批）通过后才提交。
- 完整执行：`commit` skill；并行的部署纪律见 [S6 生产部署红线](S6-production-deploy-redlines.md)。
