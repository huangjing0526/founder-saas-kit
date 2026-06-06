#!/usr/bin/env node
/**
 * MAP 索引防腐 —— 保证「全仓导航地图」永远不和实际目录脱节。
 *
 * 背景：MAP.md 是全仓单页索引（找东西从这里点）。这类手写索引最容易腐烂：
 * 加了新文档忘了登记进 MAP → 用户从 MAP 找不到它；或 MAP 指向已删/已移的文件 → 死链。
 * 索引一旦不可信，「单页导航」这个卖点就废了。
 *
 * 这个 check 双向校验：
 *   ① 完整性：每个文档（tracked .md）都必须在 MAP.md 里被链到——漏登记就失败。
 *   ② 有效性：MAP.md 里每条相对链接都必须解析到真实文件——指错就失败。
 * 于是「加文件忘登记」「MAP 指错」都会 CI 红，索引永远可信。
 *
 * 用法：node quality-scripts/check-map-index.cjs [root]
 *   路径解析：优先命令行第一个非 -- 参数，否则用 cwd（= npm 运行处 = 项目根）。
 * 退出码：0 = 索引完整且有效 / 无 MAP.md（优雅跳过）；1 = 有漏登记或死链。
 *
 * 零依赖：纯 fs。不依赖 git（直接走文件系统，跳过 .git/node_modules）。
 *
 * ⚠️ 按项目可配置：
 *   - MAP_FILE          ：索引文件名（默认 MAP.md）。
 *   - EXCLUDE_DIRS      ：不纳入「必须被索引」的目录（默认 .git/.github/node_modules）。
 *   - ALLOWLIST_NOT_IN_MAP：个别确实不进索引的 .md（按需加，给理由）。
 */
const fs = require('fs')
const path = require('path')

const root = path.resolve(process.argv.slice(2).find((a) => !a.startsWith('--')) || process.cwd())

// ── 按项目可配置 ──────────────────────────────────────────────────────────
const MAP_FILE = 'MAP.md'
const EXCLUDE_DIRS = new Set(['.git', '.github', 'node_modules'])
// 个别确实不该进 MAP 的 .md（给理由，避免「漏登记」误判）。默认空。
const ALLOWLIST_NOT_IN_MAP = new Set([
  // 'some/internal-note.md',  // 例：内部草稿，不对外导航
])
// ──────────────────────────────────────────────────────────────────────────

const mapPath = path.join(root, MAP_FILE)
if (!fs.existsSync(mapPath)) {
  console.log(`跳过：无 ${MAP_FILE}（${mapPath} 不存在）`)
  process.exit(0)
}
const mapText = fs.readFileSync(mapPath, 'utf8')

// 递归收集所有 .md（跳过排除目录）。
function walk(dir, acc) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    const rel = path.relative(root, full)
    const top = rel.split(path.sep)[0]
    if (EXCLUDE_DIRS.has(name) || EXCLUDE_DIRS.has(top)) continue
    const stat = fs.statSync(full)
    if (stat.isDirectory()) walk(full, acc)
    else if (name.endsWith('.md')) acc.push(rel.split(path.sep).join('/'))
  }
  return acc
}
const allMd = walk(root, [])

// ── ① 完整性：每个 .md 都要在 MAP 里被链到 ────────────────────────────────
// MAP 链接形如 `](lifecycle/.../x.md)`；按「](rel)」精确匹配，避免散文里的同名误判。
const mapLinkTargets = new Set(
  [...mapText.matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1].split('#')[0].trim()).filter(Boolean)
)

const missing = []
for (const rel of allMd) {
  if (rel === MAP_FILE) continue
  if (ALLOWLIST_NOT_IN_MAP.has(rel)) continue
  if (!mapLinkTargets.has(rel)) missing.push(rel)
}

// ── ② 有效性：MAP 每条相对链接都要解析到真实文件 ──────────────────────────
const dead = []
for (const target of mapLinkTargets) {
  if (/^[a-z]+:\/\//i.test(target) || target.startsWith('#')) continue // 跳过外链/纯锚点
  const abs = path.resolve(root, target)
  if (!fs.existsSync(abs)) dead.push(target)
}

console.log(`🗺️  MAP 索引防腐（${root}）：${allMd.length} 个 .md，MAP 里 ${mapLinkTargets.size} 条链接\n`)

let failed = false
if (missing.length) {
  failed = true
  console.error(`❌ 这些文档没被 ${MAP_FILE} 索引（加了文件忘登记）：`)
  missing.forEach((m) => console.error(`   • ${m}`))
  console.error(`   → 在 ${MAP_FILE} 对应分区补一行链接，或加进脚本的 ALLOWLIST_NOT_IN_MAP（给理由）。\n`)
}
if (dead.length) {
  failed = true
  console.error(`❌ ${MAP_FILE} 里这些链接指向不存在的文件（索引指错）：`)
  dead.forEach((d) => console.error(`   • ${d}`))
  console.error(`   → 修正路径或删掉这条索引。\n`)
}

if (failed) process.exit(1)
console.log(`✅ MAP 索引完整且有效：每个文档都被索引，每条链接都解析。`)
process.exit(0)
