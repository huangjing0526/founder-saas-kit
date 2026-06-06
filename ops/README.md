# ops/ — 运营与协作层

> 这一层装的不是"怎么建某个功能",而是**让"founder + AI"这套长期协作健康运转**的基础设施。
> 和 `lifecycle/`(做产品走到哪步)正交:ops 是**贯穿始终的节奏、协作、决策、运维**。

一个人带着 AI 做产品,翻车往往不在写代码,而在**长期运转**:AI 自主跑了一夜没人知道它干了啥、关键决策三个月后忘了当初为什么这么定、生产半夜炸了不知道第一步该干什么、该招人了却没数据支撑。ops 就是兜这些的。

## 五个子组

| 子组 | 主打 | 装了什么 |
|------|------|---------|
| [`collaboration/`](collaboration/) · **协作机制** | AI/人怎么配合 | AI/Agent 分工 · 无人值守与 Handoff · Onboarding 上手协议 · session 三件套(跨会话记忆) |
| [`cadence/`](cadence/) · **节奏** | 固定的体检节拍 | 周检 5+5 · 工时 tally→招人信号 · 日/月/季节奏总览 |
| [`decisions/`](decisions/) · **决策与知识** | 想透 + 留痕 + 共享词汇 | 多视角决策 workflow(S11)· 决策日志/ADR · 术语表 |
| [`run/`](run/) · **技术运维** | 系统别裸奔 | 事故响应 runbook · 备份恢复+季度演练 · 可用性监控 · 依赖/安全更新节奏 · 成本运营 · 发布公告 |
| [`business/`](business/) · **业务运营** | 客户别流失 | 客服/支持流程 · 用户反馈闭环 · 计费/订阅运营 · 合规与隐私(GDPR/数据请求)· SLA 与状态页 · 流失预警与客户成功 |

## 怎么用

- **每周**:翻 `cadence/weekly-check.md` 做 5+5 体检;季度填一次 `cadence/hours-tally.md` 看要不要招人。
- **每个会话**:开工走 `collaboration/` 的 Onboarding/上下文加载;收工用 session 三件套存档。
- **关键决策**:走 `decisions/` 的多视角决策,结论记进决策日志。
- **出事时 / 上线后**:翻 `run/` 的对应 runbook(事故响应 / 备份恢复 / 监控)。
- **有用户之后**:`business/` 接住客服、反馈闭环、计费、合规、状态页——`run/` 管"系统活着",`business/` 管"客户留着"。

## 和其他桶的关系

- `cadence/` 的月度报告调 [`../engineering/quality-scripts/health-audit.cjs`](../engineering/quality-scripts/health-audit.cjs);周检的死代码/红线数也从机检脚本来。
- `decisions/` 的多视角决策对应治理 skill [`../engineering/governance-skills/S11-multi-perspective-decision.md`](../engineering/governance-skills/S11-multi-perspective-decision.md)。
- 生命周期 ⑧运营([`../lifecycle/8-operations/`](../lifecycle/8-operations/))就是指到这里的 `cadence/` + `run/`。
