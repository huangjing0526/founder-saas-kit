# AGENTS.md

> 跨工具的 AI 协作入口。Claude Code / Codex / Cursor / OpenCode 等在本仓库工作时都先读这一份。
> 本项目遵循 **founder-saas-kit** 工程约定:用流程纪律 + 可执行守卫,让 AI 在边界内放手做、不闯祸。
> Claude Code 用户:完整项目宪法见 [`.claude/CLAUDE.md`](.claude/CLAUDE.md);本文件是它的跨工具浓缩版。

## 硬规则(违反 = 事故,完整版见 .claude/CLAUDE.md)

- **不擅自加业务逻辑**:任何校验/自动行为/硬编码常量先经授权,确认后登记进 `business-rules-registry`。
- **危险操作带回滚、报错即停**:删除/重置/部署前留回滚点;任一步报错立刻停下汇报,不自行重试或绕过。
- **Git 纪律**:只 `git add <明确路径>`,绝不 `git add .`;提交前 `git status` + `git diff --cached` 三步验证;不对主干 force push。
- **多租户隔离**:每个查询带租户过滤 + 权限校验,返回/日志不泄漏他租户数据。
- **说"做完"前先验证**:拿"能证明功能正确的新鲜证据"(测试输出/可跑命令/`文件:行号`),不拿 lint 通过充数。
- **审计凭证据不凭印象**:任何"系统已有/缺什么"的结论必须附 `文件:行号` 或可跑命令。

## 已激活的护城河(本仓库装了就生效)

- **PreToolUse 守卫**(Claude Code):`rm -rf` / `git reset --hard` / 清库 / force push / 写 `.env`·私钥·CI 文件 → 自动拦截。看它干活:`npm run demo`。
- **只读 reviewer subagents**:业务规则越界 / 租户隔离 / 交付验收,三个独立审查器。
- **质量门禁**:`npm run harness`(本地)/ CI 模板(云端)跑密钥扫描·断链·结构·守卫自测等红线检查。

## 可用 skills

- **治理 S1-S11**:任务分级 · 业务规则登记 · 出码前自检 · 租户隔离 · 安全提交 · 部署红线 · 系统化调试 · 交付验收 · 审计先验证 · 运营自动化 · 多视角决策。
- **生命周期 skills**:竞品分析 · 需求发现 · PRD 写作/评审 · UI 基线自检 · 架构评估 · 经验沉淀(以 `SKILL.md` 形式,可装进 `.claude/skills/`)。

## 三端落地

| 工具 | 读什么 | skills 落位 | 守卫 |
|------|--------|------------|------|
| **Claude Code** | `.claude/CLAUDE.md` + 本文件 | `.claude/skills/<name>/SKILL.md` | `.claude/hooks/` PreToolUse |
| **Codex** | 本 `AGENTS.md` | `.codex/skills/<name>/SKILL.md` | hooks 为 Claude 专属,改用 skill 内纪律 |
| **Cursor** | 本 `AGENTS.md` | `.cursor/skills/` 或 `.cursor/rules/*.mdc`(强约束用 `alwaysApply`) | 同上 |

一键接入:`node engineering/install.mjs --target <你的项目> --tool claude|codex|cursor`。

---

> 关于本仓库自身:founder-saas-kit **用自己治理自己**——提交守上面的 Git 纪律、本 AGENTS.md 即它对外的约定、CI 跑的就是它自带的门禁脚本。这是 dogfooding:工具相信自己,才值得你相信。
