# ② PRD（产品需求文档）

> 需求想清楚了(①)、看清了战场(⓪),这一步把它**写清楚**——一份大家(你、AI、未来的你)都照着干的规格。
> Discovery 是「想清楚」,PRD 是「写清楚」;别把两步并成一步。

## 这一阶段解决什么

- **AI 不靠猜**:把"做什么、给谁、成功长什么样、不做什么"写成白纸黑字,AI 照着实现,不自由发挥。
- **业务/技术分界**:PRD 的 **§7 是一堵墙**——墙左边是业务(你拍板),墙右边是技术(交给架构④)。founder 只需把业务侧讲清,不用懂技术怎么实现。
- **少返工**:含糊的需求 = 做出来不是你要的。PRD 用 `[NEEDS CLARIFICATION]` 标记把含糊点逼出来,**带标记的不许进开发**。

## 模块内容

| 文件 | 作用 |
|------|------|
| [`PRD-SPEC.md`](PRD-SPEC.md) | PRD 写作宪法:Full 10 段 / Lite 6 段结构、§7 业务/技术分界墙、生命周期状态机、Big 8 高频踩坑清单 |
| [`prd-template.md`](prd-template.md) | Full 模板(新模块/复杂功能用) |
| [`prd-template-lite.md`](prd-template-lite.md) | Lite 模板(小功能/快速迭代用) |
| [`skills/prd-author/SKILL.md`](skills/prd-author/SKILL.md) | 写 PRD 的 skill:12 步编排,把"墙"和必填项变成机械步骤 |
| [`skills/prd-review/SKILL.md`](skills/prd-review/SKILL.md) | 审 PRD 的 skill:三遍审(结构合规→内容质量→跨 PRD 一致),出 verdict + 分级修复清单 |

## 怎么用（非技术 founder 视角）

1. **挑模板**:小功能用 Lite,新模块用 Full(`prd-author` skill 会帮你判)。
2. **你只管墙左边**:把"要解决谁的什么问题、成功怎么衡量、明确不做什么"讲清楚——这些来自 ⓪⑨ 的结论和 ① 的三层拆解。墙右边(技术方案)留空,交给 ④。
3. **逼出含糊点**:凡是你也说不准的,让它标 `[NEEDS CLARIFICATION]`,别让 AI 替你猜。
4. **过一遍审**:用 `prd-review` skill 自检,Critical 项不清不进开发。

## 上下游衔接

- **上游 ⓪竞品 / ①需求**:"明确不做"和差异化点 → 写进 PRD 的范围与目标;三层拆解的"真实目标" → 写进 PRD 的问题陈述。
- **下游 ④架构**([`../4-architecture/`](../4-architecture/)):PRD 定稿(无 `[NEEDS CLARIFICATION]`)才交给架构评估,把墙右边的技术方案补上。
- **业务规则**:PRD 里任何新校验/自动行为/硬编码常量,同步登记到 [`../../engineering/registries/business-rules-registry.template.md`](../../engineering/registries/business-rules-registry.template.md)。

> ⚠️ **带 `[NEEDS CLARIFICATION]` 的 PRD 不许进开发**——含糊点必须先消解,否则下游全在猜。
