# lifecycle/ — 产品全生命周期走查(⓪→⑨)

> 这是**时间轴**:你的产品做到哪一步,就翻到哪一格。
> 跨阶段的工程护城河(守卫 / 机检 / 验收 / 部署红线)在 [`../engineering/`](../engineering/),每一步背后都守着。

| 阶段 | 目录 | 做什么 | 工具在哪 |
|------|------|--------|---------|
| ⓪ 竞品分析 | [`0-competitive-analysis/`](0-competitive-analysis/) | 看清战场,差异化/MVP标配/明确不做 · **给自己定价**(pricing) | 本目录(独立内容) |
| ① 需求发现 | [`1-discovery/`](1-discovery/) | 三层拆解 · 澄清提问 · 范围裁剪 · **用户调研**(主动拿反馈) | 本目录(独立内容) |
| ② PRD | [`2-prd/`](2-prd/) | 写规格,业务/技术分界墙 · Full/Lite 模板 · 双 skill | 本目录(独立内容) |
| ③ UI 基线 | [`3-ui-baseline/`](3-ui-baseline/) | token · 三态 · 复用红线 · 交互约定 | 本目录(独立内容) |
| ④ 架构评估 | [`4-architecture/`](4-architecture/) | PRD→技术方案,暴露风险 · **数据迁移/导入** · founder 视角抓手 | 本目录(独立内容) |
| ⑤ 编码 | [`5-coding/`](5-coding/) | 写代码,全程有守卫 | 信号牌 → `engineering/` |
| ⑥ 测试验收 | [`6-testing/`](6-testing/) | 跑证据证明"做完了" | 信号牌 → `engineering/` |
| ⑦ 上线部署 | [`7-deploy/`](7-deploy/) | 带回滚点,报错即停 | 信号牌 → `engineering/` + 宪法 P1-P3 |
| ⑧ 运营监控 | [`8-operations/`](8-operations/) | 周检 · 健康度审计 · 定时产出 | 信号牌 → `engineering/` + [`../ops/`](../ops/) |
| ⑨ 复盘 | [`9-retrospective/`](9-retrospective/) | 把返工/事故沉淀成规则,喂回前面 | 本目录(独立内容) |

## 两种目录,别混淆

- **独立内容目录**(⓪①②③④⑨):这一阶段的方法、模板、skill 都在目录里。
- **信号牌目录**(⑤⑥⑦⑧):这几步由跨阶段的 `engineering/` + `ops/` 全程覆盖,没有重复一份内容;目录里只有一份 README,告诉你"这一步该用 kit 里的哪个工具"。

> 为什么 ⑤~⑧ 不放独立内容?因为"编码守卫 / 机检 / 验收闸 / 部署红线"是 **always-on** 的——它们在每一步都生效,塞进某一格生命周期就割裂了。所以它们住在 `engineering/`,⑤~⑧ 只立个指路牌。

## 闭环

⑨ 复盘的产出**喂回 ⓪~⑧**:一条新业务规则进 [`../engineering/registries/`](../engineering/registries/)、一次事故进 [`../engineering/methodology/`](../engineering/methodology/)、能机检的写成 [`../engineering/quality-scripts/`](../engineering/quality-scripts/) 的 `check-*`、一条行为纪律变成新 skill。这就是"同一个坑不踩第二次"。
