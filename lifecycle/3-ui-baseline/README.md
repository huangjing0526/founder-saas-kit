---
status: template
owner: you
---

# UI 设计基线（UI Baseline）

> 产品生命周期第 ③ 阶段：**UI 设计基线** —— 在动手写界面之前，先把「界面长什么样、怎么搭、什么算违规」固化成可检查的规则。
>
> 本模块的原则部分**框架无关**（不绑任何前端框架 / 组件库），同行可直接搬到自己的栈里。另附一份具体栈（前端框架 + 组件库）的落地范例 `../../examples/ui-baseline.example.md` 作对照——告诉你「这套原则落到真实代码长什么样」。

---

## 1. 这一阶段在生命周期里的位置

```text
① Discovery（想清楚做什么）
② PRD / 架构（写清楚怎么做）
③ UI 设计基线  ← 本模块：界面层的「宪法」，先于第一行 UI 代码
④ 编码（在基线约束下写页面 / 组件）
⑤ 交付验收 / 复盘
```

UI 基线解决的不是「写一个好看的组件」，而是一个治理问题：

> **一群人（或一个人 + 多个并行 AI 会话）持续往系统里加界面，怎么保证视觉一致、交互不破规、组件不重复造、三态不漏？**

没有基线，每个新页面都在重新发明间距、重新发明空态、重新发明「新增用弹窗还是抽屉」。三个月后界面就是一锅各做各的乱炖。基线把这些一次性定死，后续只需「照基线做 + 出码前自检」。

---

## 2. 五份原则文档（框架无关内核）

| 文档 | 一句话 | 红线性质 |
|---|---|---|
| [`design-tokens.md`](design-tokens.md) | 颜色 / 间距 / 字号一律走 token 变量，禁硬编码；间距走 4px/8px 网格 | 违反 = 改一处要全局翻新、主题/暗黑/RTL 全部做不了 |
| [`three-states.md`](three-states.md) | 任何列表 / 页面 / 组件必须显式处理 loading / empty / error 三态，缺一即 bug | 违反 = 用户看到空白 / 永久转圈 / 白屏 |
| [`component-reuse-redline.md`](component-reuse-redline.md) | **你想新建的组件，90% 其实已经存在**；新建前必须先查已有库 | 违反 = 一个空态组件五个版本，改一次改五处 |
| [`interaction-conventions.md`](interaction-conventions.md) | 列表页固定结构、新增/编辑用右侧抽屉、操作列主操作 ≤2、单行省略 + tooltip、空态用统一组件 | 违反 = 交互破规、用户每页都要重新学 |
| [`examples/ui-baseline.example.md`](../../examples/ui-baseline.example.md) | 一份具体栈的落地范例（对照参考，不是规范本身） | —— |

> 这五份**原则文档不出现任何具体框架 / 组件库 / 变量名**——它们讲「约定是什么 + 为什么」。只有标注「（实现示例）」的地方和 example 文件才落到具体技术。

---

## 3. 多端规范分治法（避免多端规范互相打架）

一个 SaaS 产品常同时有多个前端形态：**PC Web / 移动 Web / 原生 App**。三者的视觉 token 可以共享思想，但**组件库、布局范式、交互习惯差异很大**——PC 用右侧抽屉，移动用底部抽屉；PC 操作列用下拉菜单，移动用长按动作表。

硬塞进一份规范会自相矛盾。正确做法是**一端一份规范，靠「适用范围 + 优先级」表互相划界**：

| 规范文档 | 适用范围 | 不适用（划给谁） |
|---|---|---|
| PC Web 规范 | PC 端页面 / 组件 | 移动 Web → 移动 Web 规范；原生 → 原生规范 |
| 移动 Web 规范 | 移动 Web 页面 / 组件 | PC → PC 规范；原生 → 原生规范 |
| 原生 App 规范 | 原生页面 / 组件 | 任何 Web 代码 → 对应 Web 规范 |

**每份规范开头必须有一张「适用范围」表 + 一行「优先级」声明**，例如：

```text
适用范围：<本端路径模式> 下任何新页面 / 新业务组件 → ✅ 强制
          现有页面 bug 修复 → ⭕ 不阻塞，但禁止引入新破规
          其他端代码 → ❌ 不适用，归 <对应规范>
优先级：本文件 > <跨端共享的色彩/术语参考规范> > 全局规则
```

这样三份规范**不重叠、不冲突**：任何一段 UI 代码都能唯一定位到一份规范，而共享的 token 思想由本目录的 `design-tokens.md` 统一兜底。本目录的五份原则文档是**三端共用的内核**；各端再写各自的落地规范（范例见 `examples/`，那是其中一端的写法）。

> 经验来源：真实多端项目里，移动规范明确写「本文件 > PC 规范（仅作色彩/术语参考）> 全局规则」，并列出「PC 端代码 ❌ 不适用，归 PC 规范」——靠这两句把三份规范的边界焊死。

---

## 4. 与治理 skill 的联动

UI 基线不是孤立文档，它是**出码前自检（S3）的界面层落地**：

- [`../../engineering/governance-skills/S3-pre-code-self-check.md`](../../engineering/governance-skills/S3-pre-code-self-check.md) 的自检清单里有三条直接对应本模块：
  - 「页面 / 组件含 loading / empty / error 三态」 → 本模块 [`three-states.md`](three-states.md)
  - 「禁硬编码间距 / 颜色 / 字号」 → 本模块 [`design-tokens.md`](design-tokens.md)
  - 「渲染 / UI 规范」 → 本模块 [`interaction-conventions.md`](interaction-conventions.md) + [`component-reuse-redline.md`](component-reuse-redline.md)
- 本模块额外提供一个**可触发 skill** [`skills/ui-baseline-check/SKILL.md`](skills/ui-baseline-check/SKILL.md)：写 / 改任何 UI 页面或组件时自动核查这四条，把 UI 破规挡在出码那一刻。
- 关系：S3 是**全栈出码前自检**（含后端字段、租户隔离等），本模块 skill 是 S3 中**界面那一段的专项放大镜**——两者不重复，S3 概览，本 skill 深查 UI。

---

## 5. 怎么用本模块（落地步骤）

1. **建 token**：照 [`design-tokens.md`](design-tokens.md) 给自己项目定一套颜色 / 间距 / 字号 token，落到一处权威来源。
2. **定三态约定**：照 [`three-states.md`](three-states.md) 选定三态的统一实现（统一空态组件、统一骨架屏、统一错误兜底）。
3. **盘点已有组件**：照 [`component-reuse-redline.md`](component-reuse-redline.md) 列出现有组件清单（建前自查表），这是复用红线的前提。
4. **定交互约定**：照 [`interaction-conventions.md`](interaction-conventions.md) 把列表页结构、抽屉、操作列等固定下来。
5. **多端就分治**：有多个前端形态，照第 3 节每端各写一份落地规范，开头各放「适用范围 + 优先级」表。
6. **挂上 skill**：把 [`skills/ui-baseline-check`](skills/ui-baseline-check) 接入，让 AI / 同行在写 UI 时自动核查。

> `../../examples/ui-baseline.example.md` 给的是**其中一个具体栈**的落地长相——你换栈时不要照抄变量名和组件名，照抄**原则**重新落地。
