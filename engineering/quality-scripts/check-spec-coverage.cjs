#!/usr/bin/env node
/**
 * 规范↔代码 追溯（SDD 的「Validate 回扣到规范」那根线）—— 机检文档和代码有没有脱节。
 *
 * 背景：最难根治的漂移不是 README 数字（那有 check-self-claims），而是「规范说一套、代码做一套」：
 * 业务规则登记表里写了规则，代码却没实现 / 早改了没回写；或代码注释 `@br X` 指向一条早删了的规则。
 * 时间一长，登记表变成「看起来是真相源、其实没人对得上」的摆设。这正是 SDD（规范驱动开发）要治的。
 *
 * 这个 check 把「业务规则登记表」当规范源，双向核对它和代码的追溯链：
 *   A) 已生效的规则（[confirmed]/[confirmed-needs-doc]）必须有「代码痕迹」——要么 Location 列指的文件存在，
 *      要么代码/测试里有 `@br <ID>` 引用它。两者都没有 → 规范说有、代码查无 → 标。
 *   B) 代码/测试里的 `@br <ID>` 必须指向登记表里真实存在的 ID——指向不存在的（改名/删了没同步）→ 标。
 *   C) [pending]（没签字）的规则却已被代码引用 → 标（未授权规则不该进代码，呼应业务规则治理）。
 *
 * ⚠️ 启发式：按文本核对，不理解语义。它是「机检前哨」，配合 business-rule-reviewer 子代理用。
 *    约定（接入时告诉团队）：① 业务规则进 `business-rules-registry.md`，每条带 ID（如 ORDER-A-003）；
 *    ② 实现处在代码/测试里标注 `@br <ID>`（注释或测试名皆可），或在登记表 Location 列填 `file:line`。
 *
 * 规范源定位：basename === `business-rules-registry.md` 的文件（**.template / .example 天然排除**，它们不是活规范）。
 *   找不到活登记表 → 优雅跳过 exit 0（没用这套约定的项目不受影响）。
 *
 * 用法：node quality-scripts/check-spec-coverage.cjs [root] [--warn]
 * 退出码：0 = 追溯完整 / 警告模式 / 无活登记表跳过；1 = 有脱节。零依赖，纯 fs。
 *
 * ⚠️ 按项目可配置：REGISTRY_BASENAME、ID_RE（编号格式）、LIVE_STATUSES、REF_TAG（@br）、SCAN_EXT、SKIP_DIRS。
 */
'use strict'
const fs = require('fs')
const path = require('path')

const args = process.argv.slice(2)
const WARN_ONLY = args.includes('--warn')
const root = path.resolve(args.find((a) => !a.startsWith('--')) || process.cwd())

// ── 按项目可配置 ──────────────────────────────────────────────────────────
const REGISTRY_BASENAME = 'business-rules-registry.md'   // 活规范文件名（.template/.example 自动不算）
const ID_RE = /\b([A-Z][A-Z0-9]+-[VACFP]-\d{3})\b/g       // {MODULE}-{V|A|C|F|P}-{NNN}
const LIVE_STATUSES = ['confirmed', 'confirmed-needs-doc'] // 视为「已生效、必须有代码痕迹」的状态
const PENDING_STATUS = 'pending'
const REF_TAG = '@br'                                      // 代码/测试里引用规则的标记：@br <ID>
const SCAN_EXT = new Set(['.js', '.ts', '.mjs', '.cjs', '.mts', '.cts', '.vue', '.jsx', '.tsx'])
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next', 'out'])
// ──────────────────────────────────────────────────────────────────────────

if (!fs.existsSync(root)) { console.log(`跳过：根目录不存在 ${root}`); process.exit(0) }

function walk(dir, acc) {
  let entries
  try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return acc }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue
    const full = path.join(dir, e.name)
    if (e.isDirectory()) walk(full, acc)
    else acc.push(full)
  }
  return acc
}
const allFiles = walk(root, [])

// 找活登记表（basename 精确匹配 → 排除 .template/.example）。
const registryFile = allFiles.find((f) => path.basename(f) === REGISTRY_BASENAME)
if (!registryFile) {
  console.log(`跳过：未找到活业务规则登记表（${REGISTRY_BASENAME}）。用 SDD 追溯请先从 registries 模板建一份到 docs/。`)
  process.exit(0)
}

// 解析登记表：每个表格行抓 ID + 状态 + Location 文件。
const regText = fs.readFileSync(registryFile, 'utf8')
const rules = new Map() // id -> { status, locFile, line }
for (const rawLine of regText.split('\n')) {
  if (!rawLine.includes('|')) continue // 只看表格行
  ID_RE.lastIndex = 0
  const idM = ID_RE.exec(rawLine)
  if (!idM) continue
  const id = idM[1]
  const statusM = rawLine.match(/\[(confirmed-needs-doc|confirmed|pending|to-fix)\]/)
  const locM = rawLine.match(/`?([\w./-]+\.[a-zA-Z]{1,5}):\d+/) // Location 列里的 file:line
  rules.set(id, { status: statusM ? statusM[1] : null, locFile: locM ? locM[1] : null })
}

// 扫代码：收集所有 `@br <ID>` 引用（含所在文件/行）。
const codeFiles = allFiles.filter((f) => SCAN_EXT.has(path.extname(f)))
const refs = [] // { id, rel, line }
// 故意比 ID_RE 宽：抓任何 ID 形态的 token（含错误 type / 已删编号），好让幽灵引用也现形。
const refRe = new RegExp(`${REF_TAG}\\s+([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+)`, 'g')
const codeBasenames = codeFiles.map((f) => f.split(path.sep).join('/'))
for (const f of codeFiles) {
  let src; try { src = fs.readFileSync(f, 'utf8') } catch { continue }
  if (!src.includes(REF_TAG)) continue
  const rel = path.relative(root, f).split(path.sep).join('/')
  let m; refRe.lastIndex = 0
  while ((m = refRe.exec(src))) refs.push({ id: m[1], rel, line: src.slice(0, m.index).split('\n').length })
}
const referencedIds = new Set(refs.map((r) => r.id))
const locFileExists = (lf) => !!lf && codeBasenames.some((p) => p === lf || p.endsWith('/' + lf) || p.endsWith(lf))

const problems = []
// A) 已生效的规则必须有代码痕迹（Location 文件存在 或 被 @br 引用）
for (const [id, r] of rules) {
  if (!LIVE_STATUSES.includes(r.status)) continue
  if (!locFileExists(r.locFile) && !referencedIds.has(id)) {
    problems.push(`A 规范无代码痕迹：${id} 是 [${r.status}]，但 Location 文件${r.locFile ? `（${r.locFile}）不存在` : '为空'}，代码里也无 \`${REF_TAG} ${id}\` 引用`)
  }
}
// B) 代码引用了不存在的规则
for (const ref of refs) {
  if (!rules.has(ref.id)) problems.push(`B 代码指向幽灵规则：${ref.rel}:${ref.line} 引用 \`${REF_TAG} ${ref.id}\`，但登记表里没有这条（改名/删了没同步？）`)
}
// C) pending 规则已被代码引用（未签字不该进代码）
for (const ref of refs) {
  const r = rules.get(ref.id)
  if (r && r.status === PENDING_STATUS) problems.push(`C 未授权规则进了代码：${ref.rel}:${ref.line} 引用 ${ref.id}，但它还是 [pending]（未签字，按治理不该进主干）`)
}

console.log(`🔗 规范↔代码追溯（${root}）`)
console.log(`   规范源：${path.relative(root, registryFile)} —— ${rules.size} 条规则；代码里 ${refs.length} 处 ${REF_TAG} 引用\n`)

if (!problems.length) {
  console.log(`✅ 规范与代码追溯完整：已生效规则都有代码痕迹、无幽灵引用、无未授权规则入码。`)
  process.exit(0)
}
console.log(`${WARN_ONLY ? '⚠️ ' : '❌'} 发现 ${problems.length} 处规范↔代码脱节：\n`)
for (const p of problems) console.log(`   • ${p}`)
console.log(`\n修法：A→补 \`${REF_TAG} <ID>\` 或更新 Location；B→改正引用或在登记表补回该规则；C→先签字（[confirmed]）再入码。`)
console.log(`语义层用 business-rule-reviewer 子代理复核。SDD 闭环说明见 methodology/spec-driven-development.md。`)
if (WARN_ONLY) { console.log(`\nℹ️  warn-only 模式：仅告警（exit 0）。`); process.exit(0) }
process.exit(1)
