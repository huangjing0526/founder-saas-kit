#!/usr/bin/env node
/**
 * npm run harness —— 统一质量门禁入口（本地 push 前自检 / CI 自检 / AI agent 自检）
 *
 * 背景：质量 lint + 测试散落在一堆 npm script 里，没人记得 push 前要跑哪几条。
 * 这个 harness 把它们聚合成一条命令：spawn 跑每一步，任一步失败整体 exit 1，
 * 最后打印一张「✅/❌ 逐项」汇总表。一条命令就是本地的「最小可发布门禁」。
 *
 * 用法：
 *   npm run harness                      # 跑 STEPS 里的全部步骤
 *   INTEGRATION_TEST=1 npm run harness   # 额外跑较慢的集成测试（需本地 test DB）
 *
 * 退出码：0 = 全部通过；1 = 任一步失败。
 *
 * 零依赖：只用 node:child_process，无任何 npm 包。
 *
 * ⚠️ locale 结构假设：i18n 一致性那步（lint:i18n-parity）默认假设 `locales/<lang>/*.json`（每语言一个目录）。
 *    若你的项目是「每语言一个大 json」（`locales/<lang>.json`），到 check-i18n-parity.cjs 改 loadLocale()
 *    （health-audit.cjs 的 checkI18nParity() 同一处假设也要一起改）。本文件只是 spawn npm script，不直接读 locale。
 */
import { spawnSync } from 'node:child_process'

const RUN_INTEGRATION = process.env.INTEGRATION_TEST === '1'

// ═════════════════════════════════════════════════════════════════════════════
// ⚠️⚠️⚠️ 这里就是你接入时唯一要改的地方 ⚠️⚠️⚠️
//
// STEPS = 你想在每次 push / CI 前强制跑的「门禁步骤」清单。
//   - label  ：打印用的人话名字
//   - script ：package.json 里的 npm script 名（spawn `npm run <script>`）
//
// 下面是占位示例。把它们换成你项目真实的 lint / 测试 script。
// 原则：放「快 + 红线级」的检查（违反 = 不该发布），慢的（e2e / 覆盖率）留给 CI 兜底。
// ═════════════════════════════════════════════════════════════════════════════
const STEPS = [
  { label: '密钥扫描', script: 'lint:secrets' },          // 示例：本目录 check-secrets.cjs —— 最高频最贵的事故防线，放最前
  { label: '文档断链检查', script: 'lint:docs-links' },   // 示例：本目录 check-docs-links.cjs
  { label: 'i18n key 一致性', script: 'lint:i18n-parity' }, // 示例：本目录 check-i18n-parity.cjs
  { label: '多租户隔离粗扫', script: 'audit:tenant' },     // 示例：本目录 check-tenant-scope.cjs（无 ORM 用法的项目会优雅跳过）
  { label: '规范↔代码追溯', script: 'audit:spec' },        // 示例：本目录 check-spec-coverage.cjs（SDD；无活业务规则登记表会优雅跳过）
  { label: 'schema 长文本字段', script: 'lint:schema' },  // 示例：本目录 check-schema-text.cjs
  { label: '项目结构检查', script: 'check:structure' },   // 示例：本目录 check-project-structure.js
  { label: '自我宣称校验', script: 'lint:self-claims' },  // 本仓专属：README/badge 写死的数字必须 == 实际（防漂移；抄进你项目会优雅跳过）
  { label: 'MAP 索引防腐', script: 'lint:map-index' },    // 本仓专属：每个 .md 都在 MAP 里、MAP 每条链接都活（抄进你项目把 MAP.md 换成你的索引）
  { label: '接口契约自测', script: 'test:contract' },     // 本仓专属：STABILITY.md §1 对下游稳定的契约没被改坏（抄进你项目可删）
  { label: '单元 + 接口测试', script: 'test' },            // 示例：你的测试命令
  // …按需增删。建议把上面替换成你自己的 npm script 后删掉这条注释。
]

// 较慢、需要 DB/浏览器的步骤，默认不跑，靠环境变量显式开启。
if (RUN_INTEGRATION) {
  STEPS.push({ label: '集成测试（INTEGRATION_TEST=1）', script: 'test:integration' })
}
// ═════════════════════════════════════════════════════════════════════════════

console.log(`\n🧪 harness　共 ${STEPS.length} 步${RUN_INTEGRATION ? '（含集成）' : ''}\n`)

const results = []
for (const step of STEPS) {
  console.log(`\n──────── ▶ ${step.label}（npm run ${step.script}）────────`)
  const r = spawnSync('npm', ['run', step.script], { stdio: 'inherit' })
  const ok = r.status === 0
  results.push({ ...step, ok })
  console.log(ok ? `✅ ${step.label} 通过` : `❌ ${step.label} 失败（exit ${r.status}）`)
}

console.log('\n════════ harness 汇总 ════════')
for (const r of results) console.log(`${r.ok ? '✅' : '❌'} ${r.label}`)

if (!RUN_INTEGRATION) {
  console.log('\nℹ️  集成测试未跑：需 test DB，由 CI 兜底；本地全量自检用 INTEGRATION_TEST=1 npm run harness。')
}

const failed = results.filter((r) => !r.ok)
if (failed.length) {
  console.error(`\n❌ harness 失败：${failed.length}/${results.length} 步未通过，按上方 ❌ 逐项排查。`)
  process.exit(1)
}
console.log(`\n✅ harness 全过：${results.length}/${results.length} 步。`)
process.exit(0)
