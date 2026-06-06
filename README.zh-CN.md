# Founder SaaS Kit

[English](./README.md) · **简体中文**

[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A518-blue)](package.json)
[![runtime deps](https://img.shields.io/badge/runtime%20deps-0-brightgreen)](package.json)
[![guard tests](https://img.shields.io/badge/guard%20tests-42%2F42-success)](engineering/enforcement/hooks/guard.test.cjs)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-blueviolet)](CONTRIBUTING.md)

> 写第一行代码前,把**工程约束、AI 协作方式、上线检查**一次配好。
> 让 AI(Claude Code / Codex / Cursor)在你的项目里"不乱写代码"。

> 🛡️ **守卫自测 42/42** · **harness 7 步全绿** · **内部文档链 0 断** · 提纯自 **4 个月** 真实多租户 SaaS CRM · **零运行时依赖**

这不是又一个技术栈模板。满网都有"Next.js + Supabase 启动器"。
这套 kit 解决的是上一层问题:**怎么让 AI 写出的系统不在上线时翻车。**

它从一个真实的多租户 SaaS CRM(一个 PM + AI 协作 4 个月)里提纯而来。
每一条规则、每一个守卫、每一份 checklist,都是从一次真实事故 / 一条真实红线 / 一次真实返工里长出来的——不是空话。

<details>
<summary><b>目录</b></summary>

- [这套 kit 解决什么](#这套-kit-解决什么)
- [30 秒看它干活](#30-秒看它干活)
- [三层心智模型](#三层心智模型从内到外)
- [产品全生命周期](#产品全生命周期从模糊想法到复盘闭环)
- [目录速览](#目录速览)
- [怎么起一个新项目](#怎么起一个新项目)
- [核心理念](#核心理念一页纸心法)
- [不适合谁](#不适合谁)
- [参与 / 反馈](#参与--反馈)
- [出处与致谢](#出处与致谢)

</details>

> 前置:装好 Node ≥18(`node -v` 验证)。除此之外**零依赖**——质量脚本全是纯 Node。

---

## 这套 kit 解决什么

一个人(尤其技术背景不强的 founder / PM)带着 AI 持续交付,最容易翻的车不是"代码写错",而是:

1. AI **好心办坏事**——自作主张加了你没要的业务规则、校验、自动行为
2. AI **说"做完了"但没验证**——拿 lint 通过 / typecheck 过当完成证据
3. AI **改了无关文件** / 跨租户数据泄漏 / 危险 git 操作把工作清光
4. **文档与代码漂移**——"以为做好了的"其实退化了,审计凭印象不凭证据
5. 关键决策**没想透就开干**,事故反复修第 3 次还在出

这套 kit 用**流程纪律 + 可执行守卫**把这些挡在门外,而不是靠人盯人。

---

## 30 秒看它干活

clone 下来,一条命令当场看护城河拦截(不是空谈"有守卫"):

```bash
git clone https://github.com/huangjing0526/founder-saas-kit.git
cd founder-saas-kit
npm run demo
```

演示:AI 想跑 `rm -rf /` → 🛑 守卫拦下 · 普通命令 → ✅ 放行 · 想改 `.env`/私钥/CI 文件 → 🛑 拦下 · 一个密钥溜进代码 → 🔦 扫描器抓出并打码 · 守卫回归自测 **42/42**。全程安全——危险命令只**喂给守卫看它拦不拦,从不真的执行**。

> **本 kit 用自己治理自己**(dogfooding):提交守自己的 Git 纪律、根目录 [`AGENTS.md`](AGENTS.md) 即它对外的跨工具约定、CI([`.github/workflows/ci.yml`](.github/workflows/ci.yml))跑的就是它自带的门禁脚本(`npm run harness` 7 步全绿、内部文档链 0 可重指向断链)。工具信自己,才值得你信。

---

## 三层心智模型(从内到外)

顶层只有 **4 个语义桶**,各对应一种心智:

```
founder-saas-kit/
├── lifecycle/      ← 按产品阶段顺序走查(⓪竞品→①需求→…→⑨复盘,共 10 格)
│   ├── 0-competitive-analysis/  竞品分析(看清战场)
│   ├── 1-discovery/      需求发现与讨论
│   ├── 2-prd/            PRD 双 skill 四件套
│   ├── 3-ui-baseline/    UI 设计基线
│   ├── 4-architecture/   技术方案与架构评估
│   ├── 5-coding ~ 8-operations/  ⑤编码⑥测试⑦上线⑧运营(信号牌 → engineering/+ops/)
│   └── 9-retrospective/  复盘与经验沉淀(喂回前面所有阶段)
│
├── engineering/    ← 跨阶段 always-on 的工程护城河(项目无关,直接搬)
│   ├── governance-skills/  11 条治理 skill(八段式 + 三端转换)
│   ├── enforcement/        2 个 PreToolUse 守卫 + 3 个只读审查 agent
│   ├── quality-scripts/    零依赖 lint + 两个聚合框架 + 5 个机制
│   ├── methodology/        防漂移五原则 · 北极星框架 · 坑沉淀模板
│   └── registries/         业务规则总账 + 生产就绪基线(两本活账本)
│
├── ops/            ← 运营与协作层,5 子组:collaboration/(分工·Handoff·上手·会话记忆)
│                       cadence/(周检·工时·日月季节奏)· decisions/(多视角决策·决策日志·术语表)
│                       run/(技术运维:事故·备份·监控·依赖安全·成本·发布)· business/(业务运营:客服·反馈闭环·计费·合规GDPR·SLA状态页)
├── examples/       ← 所有完整真实范本集中(对照参考,起新项目时不动)
└── .claude/CLAUDE.md   项目宪法:Git/生产/业务规则三套铁律
```

**两个轴怎么读**:`lifecycle/` 是**时间轴**(你做产品走到哪一步,就翻那一格);`engineering/` 是**always-on 护城河**(每一步都在背后守着)。生命周期阶段⑤编码 / ⑥测试 / ⑦上线 / ⑧运营没有单独目录——它们由 `engineering/` + `ops/` 全程覆盖(见下方生命周期图)。

**为什么不钦定技术栈?** 因为护城河在 `engineering/`。"用什么栈"是你的选择,kit 不替你定;它只保证**不管你用什么栈,AI 都守规矩、上线前都查到位**。

---

## 产品全生命周期(从模糊想法到复盘闭环)

kit 按完整生命周期组织——每个阶段都有对应模块兜底,不是只管"写代码"那一段:

`lifecycle/` 是完整的 **⓪→⑨** 十格,一格不缺(索引见 [`lifecycle/README.md`](lifecycle/README.md)):

```
⓪竞品  ①需求  ②PRD  ③UI基线  ④架构   ⑤编码 ⑥测试 ⑦上线 ⑧运营    ⑨复盘
  │      │      │      │       │         └──────┬──────┘          │
0-comp 1-disc 2-prd 3-ui-   4-arch     ⑤~⑧ 信号牌目录 →       9-retro
petitive overy        baseline itecture  engineering/ + ops/      spective
  └──── 独立内容目录 ────────────┘       (守卫·机检·验收·部署红线)  (喂回 ⓪~⑧)
```

- **独立内容目录**(⓪①②③④⑨):方法 / 模板 / skill 都在目录里。
- **信号牌目录**(⑤⑥⑦⑧):由 always-on 的 `engineering/` + `ops/` 全程覆盖,目录里只放一份 README 指路(编码守卫 + 机检 + 验收 S8 + 部署红线 S6 + 运营 S10 + 周检 + health-audit),不重复内容。
- **闭环**:⑨ 复盘的产出**喂回 ⓪~⑧**——返工/事故沉淀成规则(`engineering/registries/`)、事故台账(`engineering/methodology/`)、机检脚本(`engineering/quality-scripts/`)或新 skill。

---

## 目录速览

| 桶 / 目录 | 装了什么 | 通用度 |
|------|---------|--------|
| **lifecycle/** `0-competitive-analysis/` | 竞品分析方法(直接/间接/替代三类)· 对比矩阵+定位图模板 · 三条结论(差异化/MVP标配/不做)+ 可触发 skill | 通用 |
| **lifecycle/** `1-discovery/` | 需求三层拆解 · 澄清提问清单 · 反馈→需求 · 范围裁剪 + 可触发 skill | 通用 |
| **lifecycle/** `2-prd/` | `PRD-SPEC` + Full/Lite 模板 + prd-author / prd-review 双 skill | 通用 |
| **lifecycle/** `3-ui-baseline/` | 设计 token 体系 · loading/empty/error 三态 · 组件复用红线 · 交互约定 · 多端分治 + skill | 栈中立 |
| **lifecycle/** `4-architecture/` | PRD→技术方案评估清单 · 后端分层基线(Routes→Services→Repositories)+ skill | 通用 |
| **lifecycle/** `5~8`(信号牌) | ⑤编码⑥测试⑦上线⑧运营,各一份 README 指向 engineering/ + ops/ 的对应工具 | 通用 |
| **lifecycle/** `9-retrospective/` | 经验沉淀四问 · 复盘模板 · 四个沉淀落点(喂回前面阶段)+ skill | 通用 |
| **engineering/** `governance-skills/` | 11 条治理 skill(S1-S11)+ 八段式模板 + 业务 skill 范例 + 可跑 eval | 脱敏后通用 |
| **engineering/** `enforcement/` | `guard-dangerous-bash` / `guard-high-risk-edit` 两个守卫(+ `guard.test.cjs` 自测)+ 3 个只读 reviewer subagent + 挂载说明 | 通用 |
| **engineering/** `quality-scripts/` | `check-secrets`(密钥扫描)/ `check-docs-links` / `check-project-structure` / `check-i18n-parity` 等 + `harness` + `health-audit` + **MECHANISMS.md(5 个机制)** | 跨栈/同栈 |
| `.github/workflows/ci.example.yml` · `package.json` | 可抄的 CI 红线门禁模板 + npm script↔脚本映射(把"挂 CI"落地) | 通用 |
| **engineering/** `methodology/` | `anti-drift`(防漂移五原则,最高价值)/ `north-star-rules` / `common-pitfalls` / 事故台账骨架 | 通用 |
| **engineering/** `registries/` | `business-rules-registry` + `production-readiness-registry` 两本活账本模板 | 通用 |
| `ops/` **运营协作层** | 5 子组:`collaboration/`(AI分工·无人值守Handoff·Onboarding·会话记忆)· `cadence/`(周检5+5·工时tally·日月季节奏)· `decisions/`(多视角决策·决策日志ADR·术语表)· `run/`(技术运维:事故·备份+演练·监控·依赖安全·成本·发布)· `business/`(业务运营:客服·反馈闭环·计费·合规GDPR·SLA状态页·流失预警)| 通用 |
| `examples/` | 完整真实范本(business-rules + ui-baseline,对照看"填成什么样算对") | 参考 |
| `.claude/CLAUDE.md` | 项目宪法:G1-G6 Git 铁律 + P1-P3 生产铁律 + 业务规则三铁律 + 输出前自检 | 脱敏占位 |

---

## 怎么起一个新项目

**一键接入(推荐)**——把守卫 / reviewer / skills / AGENTS.md 装进你已有的项目:

```bash
# 在 kit 目录里跑,装进你的目标项目(支持 claude / codex / cursor)
node engineering/install.mjs --target ../my-app --tool claude
node engineering/install.mjs --target ../my-app --dry-run   # 先看它会装什么
```

**或手动起一个新项目**:

```bash
git clone <this-repo> my-new-project
cd my-new-project
rm -rf .git && git init        # 断开模板仓,开始你自己的历史

# 1. 填项目宪法(10 分钟)——把占位符换成你的项目事实
$EDITOR .claude/CLAUDE.md       # 项目是什么 / 给谁用 / 红线 / 分支模型

# 2. 挂上强制层(5 分钟)
cp engineering/enforcement/settings.example.json .claude/settings.json
cp engineering/enforcement/hooks/*.cjs .claude/hooks/        # 路径按 settings 里引用调整
cp -r engineering/enforcement/subagents/*.md .claude/agents/

# 3. 接上质量门禁(按你的技术栈挑)
cp engineering/quality-scripts/check-*.cjs engineering/quality-scripts/check-*.js scripts/   # 注意 check-project-structure 是 .js
cp engineering/quality-scripts/harness.mjs engineering/quality-scripts/health-audit.cjs scripts/
cp package.json ./   # 或把其 scripts 段并进你已有的 package.json;cp .github/workflows/ci.example.yml 启用 CI
# 读 engineering/quality-scripts/MECHANISMS.md,把 harness.mjs 的 STEPS 换成你的 lint/test

# 4. 开两本活账本
cp engineering/registries/*.template.md docs/      # 业务规则总账 + 生产就绪基线

# 5. 开始开发
# Claude Code 会自动读 .claude/CLAUDE.md + skills,按治理 skill 协作
```

---

## 核心理念(一页纸心法)

- **规则即护栏**:不是让 AI 少做,而是让它在明确边界内**放手做**。
- **小事不拖,大事先对齐**:任务分级,新需求先判规模再动手(S1)。
- **AI 最大的风险是"好心办坏事"**:自作主张加业务规则——所以业务逻辑必须授权 + 登记(S2 + 业务规则总账)。
- **危险操作必须带回滚点、不越界、报错即停**(P1-P3 + 两个守卫)。
- **说"搞定了"之前先跑验证;审计先读文件再报告**——凭证据不凭印象(S8 / S9 + 防漂移)。
- **同一问题修第 3 次还在出 → 停下改机制,不要再修一遍代码**。

---

## 不适合谁

如果你要的是"一键生成能跑的 SaaS",这不是你要的东西。
这套 kit 假设你会用 Claude Code / Cursor,且愿意在写码前花 20 分钟配置约束。
回报是:**AI 在你项目里的产出质量,和上线后的事故率,差一个数量级。**

---

## 参与 / 反馈

- 🐛 发现 bug / 有想法 → [提 issue](https://github.com/huangjing0526/founder-saas-kit/issues)
- 🔧 想贡献 → 先读 [`CONTRIBUTING.md`](CONTRIBUTING.md)(本仓有强 Git 纪律 + 门禁,PR 前请跑 `npm run harness`)
- 🗺️ 想知道接下来做什么 → [`ROADMAP.md`](ROADMAP.md)
- 🔒 安全问题 → 看 [`SECURITY.md`](SECURITY.md)(私下披露,别开公开 issue)
- ⭐ 觉得有用 → 给个 Star,让更多 founder 看到

---

## 出处与致谢

提纯自一个真实多租户 SaaS CRM 的 4 个月 PM+AI 协作经验。
方法论层借鉴了 [obra/superpowers](https://github.com/obra/superpowers)(systematic-debugging / verification-before-completion / writing-plans 等通用范式),
本 kit 的增量价值在**通用框架不覆盖的空白**:业务规则登记、多租户隔离、审计先验证、生产部署红线、防认知漂移。
