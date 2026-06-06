// =============================================================================
// ⚠️ 这不是能直接 `node decision-brainstorm.js` 跑的 CLI 脚本。
//
// 这是一段 **Workflow 编排模板**，写给 Claude Code 的 Workflow 工具 / 类似的
// multi-agent 编排器用。它依赖编排运行时注入的全局函数 —— args / agent() /
// pipeline() / phase() / log() —— 并且在顶层直接 `return`。本 kit 不带这个运行时，
// 所以 `node` 直接跑一定报错，这是预期行为，不是 bug。
//
// 用法：① 在支持该编排的环境里作为 workflow 模板加载运行；
//      ② 没有该环境就把它当伪代码/流程参考，照三段式（发散→验证→收敛）自己手动落地。
// 配套说明见同目录 decision-brainstorm.md。
// =============================================================================

export const meta = {
  name: 'decision-brainstorm',
  description: '关键决策多视角头脑风暴：多个真分歧视角并行发散 → 对抗验证(读真实材料、剔伪缺口) → 收敛成给决策者的拍板选项。治理方法论 S11 的可执行模板，用于需求定稿/技术架构/安全审计/复盘/规范自审/疑难 bug 根因。',
  phases: [
    { title: 'Diverge', detail: '多个真分歧视角并行发散' },
    { title: 'Verify', detail: '逐条读真实材料验证、剔除伪缺口' },
    { title: 'Converge', detail: '去重 + 排序成给决策者的拍板选项' },
  ],
}

// ---------- 参数 ----------
// args 形态：字符串(=决策问题) 或 { question, materials?, scale?, lenses? }
//   question : 一句话讲清要定什么（必填，缺了会提示）
//   materials: 现有材料/文件路径/事故时间线等，供 agent Read/Grep 核实现状
//   scale    : 'medium'(3 视角) | 'large'(默认，6 视角 + 对抗验证)
//   lenses   : 自定义视角数组，元素为 {key,focus} 或字符串；不传则按 scale 取默认
const cfg = (typeof args === 'string') ? { question: args } : (args || {})
const question = cfg.question || '（未提供决策问题 —— 请在 args.question 里写清要定什么）'
const materials = cfg.materials || '（无附加材料；你可自行 Read/Grep 仓库内相关文件确认现状）'
const scale = cfg.scale === 'medium' ? 'medium' : 'large'

const DEFAULT_LENSES = [
  { key: '架构师', focus: '技术可行性、与现有架构契合、长期可维护性、不可逆风险' },
  { key: 'PM/业务', focus: '业务价值、对用户/客户的影响、上线节奏、成本与 ROI' },
  { key: '批判者(红队)', focus: '专挑这个方向的失败模式、边界、最坏情况、被忽略的前提假设' },
  // 多租户/数据隔离项目把下一条作为专属硬视角；单租户项目可换成纯「安全/合规」
  { key: '安全/合规', focus: '权限、数据/PII、合规红线；多租户项目额外盯租户隔离不被绕过' },
  { key: '运维/可观测', focus: '可回滚性、监控告警、故障半径、降级方案' },
  { key: '简单性', focus: '有没有更简方案、是否过度设计、能不能干脆不做' },
]
const lenses = cfg.lenses
  ? cfg.lenses.map(l => (typeof l === 'string' ? { key: l, focus: '' } : l))
  : (scale === 'medium' ? DEFAULT_LENSES.slice(0, 3) : DEFAULT_LENSES)

log(`决策：${question}｜规模：${scale}｜视角数：${lenses.length}`)

// ---------- schemas ----------
const DIVERGE_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    lens: { type: 'string' },
    recommendedDirection: { type: 'string', description: '这个视角倾向的方案/取值/结论' },
    arguments: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          claim: { type: 'string' },
          evidence: { type: 'string', description: 'file:line 或原文片段；没核实到写"需核实"' },
          weight: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
        required: ['claim', 'evidence', 'weight'],
      },
    },
    risks: { type: 'array', items: { type: 'string' } },
    proposals: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          title: { type: 'string' },
          detail: { type: 'string', description: '具体到改哪/做什么，不要空话' },
          value: { type: 'string', enum: ['high', 'medium', 'low'] },
          effort: { type: 'string', enum: ['low', 'medium', 'high'] },
        },
        required: ['title', 'detail', 'value', 'effort'],
      },
    },
  },
  required: ['lens', 'recommendedDirection', 'arguments', 'risks', 'proposals'],
}

const VERIFY_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    lens: { type: 'string' },
    checked: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          claim: { type: 'string' },
          verdict: { type: 'string', enum: ['verified', 'partly', 'refuted', 'unverifiable'] },
          evidence: { type: 'string', description: '读文件后的真实证据：file:line 或原文片段' },
          note: { type: 'string' },
        },
        required: ['claim', 'verdict', 'evidence', 'note'],
      },
    },
    netAssessment: { type: 'string', description: '验证后这个视角的方向是否还站得住，需不需要调整' },
  },
  required: ['lens', 'checked', 'netAssessment'],
}

// ---------- Phase 1+2: Diverge → Verify（pipeline，发散完一个就验一个）----------
const results = await pipeline(
  lenses,
  // Stage 1: 发散（默认 opus，创造性）
  (lens) => agent(
    `你是「${lens.key}」视角的资深专家，参与一场关键决策的头脑风暴。\n\n**要定的决策**：${question}\n\n**现有材料/可核实来源**：${materials}\n\n**你这个视角要盯的**：${lens.focus || '从你的专业立场出发，给出独立判断'}\n\n要求：\n1. 只从「${lens.key}」立场出发，给出**这个视角真实的、可能与别人分歧的**判断 —— 不要写四平八稳的中庸答案，制造有价值的分歧。\n2. recommendedDirection：你这个视角倾向哪个方案/取值。\n3. arguments：支撑论点，凡涉及"现状/项目已有什么"的，**先 Read/Grep 仓库确认**，evidence 写 file:line；没核实的标"需核实"。\n4. risks：这个方向你最担心的失败点。\n5. proposals：具体可落地的建议（改哪/做什么 + value/effort），不要"应加强 X"这种空话。`,
    { label: `发散:${lens.key}`, phase: 'Diverge', schema: DIVERGE_SCHEMA }
  ),
  // Stage 2: 对抗验证（sonnet，可核查）—— S11 的命门：发散容易飘，必须配验证
  (brain, lens) => agent(
    `验证「${lens.key}」视角发散出的论点，逐条读真实材料判定真伪，**防止把项目其实已做的东西误报成缺口、把拍脑袋当结论**。\n\n决策：${question}\n材料：${materials}\n\n待验证论点(JSON)：\n${JSON.stringify(brain?.arguments ?? [], null, 2)}\n推荐方向：${brain?.recommendedDirection ?? ''}\n\n对每条 claim：\n1. 实际 Read/Grep 相关文件核对现状。\n2. verdict：verified(属实) / partly(部分属实) / refuted(被推翻，常见为"项目其实已有"的伪缺口) / unverifiable(材料不足无法判定)。\n3. evidence 必须是读文件后的真实证据(file:line 或原文)。\n4. note：纠正或补充。\n5. netAssessment：剔掉被 refuted 的之后，这个视角的方向还站不站得住、要不要调整。`,
    { label: `验证:${lens.key}`, phase: 'Verify', schema: VERIFY_SCHEMA, model: 'sonnet' }
  )
)

// pipeline 返回每项「最后一阶段」结果，即各视角的验证对象(VERIFY_SCHEMA)
const verified = results.filter(Boolean)
const refutedCount = verified.reduce(
  (n, v) => n + (v.checked ?? []).filter(c => c.verdict === 'refuted').length, 0
)
log(`验证完成：${verified.length} 个视角，剔除疑似伪缺口 ${refutedCount} 条`)

// ---------- Phase 3: Converge（默认 opus）----------
phase('Converge')

const report = await agent(
  `把多视角发散 + 验证的结果，收敛成一份**给决策者(可能技术较弱)的决策简报**。\n\n要定的决策：${question}\n\n各视角验证后结论(JSON)：\n${JSON.stringify(verified, null, 2)}\n\n要求：\n1. **只采信验证站得住的**（verified/partly），被 refuted 的伪缺口在简报里单列"已排除(其实项目已有/不成立)"一两条点出即可。\n2. 跨视角**去重合并**，把分歧点显式摆出来(谁主张什么、为什么不同)。\n3. 收敛成 **2-4 个候选方案**，每个给：一句话描述 / 支持它的视角 / 主要风险 / 价值·成本。\n4. 给出**带理由的推荐**(哪个方案 + 为什么)，并保留**少数异见**(哪个视角不同意、担心什么)。\n5. 结尾是**给决策者的拍板区**：列 1-3 个还需拍板的开放问题(若决策点未明确，用 [NEEDS CLARIFICATION] 标出)，并给 approve / revise / restart 三个动作。\n6. 中文、大白话，绕不开的术语写"术语(白话解释)"。\n7. 提醒落地位置：需求类→填 PRD 决策清单段落；架构类→落 ADR(架构决策记录目录)。\n输出 Markdown。`,
  { label: '收敛排序', phase: 'Converge' }
)

return report
