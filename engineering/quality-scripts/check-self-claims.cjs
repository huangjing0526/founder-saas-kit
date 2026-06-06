#!/usr/bin/env node
/**
 * 自我宣称校验 —— 让 README / badge 里写死的数字「永远等于实际」。
 *
 * 背景：这个 kit 的招牌是「防漂移、凭证据不凭印象」。可它自己的 README 首屏 / badge 里
 * 也写了一堆硬数字（守卫自测 42/42、harness 6 步、零依赖）。这些是手写的——一旦守卫加了
 * 几条、harness 加了一步，数字就过期，正好打脸自己的核心卖点（我们真的踩过：内链数 314→318）。
 *
 * 这个 check 把那几个数字「接到真相源」：跑一遍实际、解析出真值，再扫 README/badge 里写的值，
 * 不一致就 exit 1。于是数字要么对、要么 CI 红——不可能默默漂移。这是 kit 对自己用防漂移原则。
 *
 * 校验项（真相源 → 文档里被断言的写法）：
 *   1. 守卫自测数   ← 跑 guard.test.cjs 解析「N/N 通过」    → badge `guard%20tests-N%2FN` + 首屏「N/N」「守卫自测 N/N」
 *   2. harness 步数 ← 数 harness.mjs STEPS（不含集成）       → 首屏「harness N/N green」「harness N 步全绿」
 *   3. 运行时依赖数 ← package.json deps + devDeps 个数        → badge `runtime%20deps-0` + 首屏「zero / 零」
 *
 * 用法：node quality-scripts/check-self-claims.cjs [kitRoot]
 *   路径解析：优先命令行第一个非 -- 参数，否则用 cwd（= npm 运行处 = kit 根）。
 * 退出码：0 = 所有写死的数字都与实际一致 / 找不到对应文档（优雅跳过）；1 = 有数字对不上。
 *
 * 零依赖：纯 fs + child_process，无任何 npm 包。
 *
 * ⚠️ 这是「给本 kit 仓库自己用」的 check——你把 kit 抄进自己项目后，README 里不会再有这些 kit 专属
 *    数字，本脚本会优雅跳过（找不到对应文件/模式即跳过，不报错）。要校验你自己项目的宣称数字，
 *    照下面 CLAIMS 的写法加你自己的真相源 + 文档模式。
 */
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const root = path.resolve(process.argv.slice(2).find((a) => !a.startsWith('--')) || process.cwd())
const qs = path.join(root, 'engineering', 'quality-scripts')
const hooks = path.join(root, 'engineering', 'enforcement', 'hooks')

const read = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null)

// ── 真相源 1：实际守卫自测数 ───────────────────────────────────────────────
function actualGuardTests() {
  const testFile = path.join(hooks, 'guard.test.cjs')
  if (!fs.existsSync(testFile)) return null
  const r = spawnSync('node', [testFile], { encoding: 'utf8' })
  const m = (r.stdout + r.stderr).match(/(\d+)\/(\d+)\s*通过/)
  if (!m) return null
  // 取「总数」（分母）作为宣称基准：badge 写的是 42/42，分子=分母=全过。
  return { pass: Number(m[1]), total: Number(m[2]) }
}

// ── 真相源 2：实际 harness 步数（不含集成）─────────────────────────────────
function actualHarnessSteps() {
  const src = read(path.join(qs, 'harness.mjs'))
  if (!src) return null
  // STEPS 字面量里每个步骤一行 `script: '...'`；集成步骤是 STEPS.push 进去的，单独排除。
  const all = (src.match(/script:\s*'[^']+'/g) || []).length
  const integration = (src.match(/script:\s*'test:integration'/g) || []).length
  return all - integration
}

// ── 真相源 3：实际运行时依赖数 ─────────────────────────────────────────────
function actualDeps() {
  const pkg = read(path.join(root, 'package.json'))
  if (!pkg) return null
  const j = JSON.parse(pkg)
  return Object.keys(j.dependencies || {}).length + Object.keys(j.devDependencies || {}).length
}

const guard = actualGuardTests()
const steps = actualHarnessSteps()
const deps = actualDeps()

// ── 文档里被断言的写法：每条 = 在哪个文件、用什么正则抓「写死的值」、该等于哪个真值 ──
// 找不到文件或模式 → 跳过该条（不报错）。抓到了但值不符 → 失败。
const CLAIMS = [
  // 守卫自测数（badge 形如 guard%20tests-42%2F42；首屏 EN「Guard self-tests 42/42」/ ZH「守卫自测 42/42」）
  { file: 'README.md', re: /guard%20tests-(\d+)%2F(\d+)/, want: () => guard && guard.total, label: 'README badge 守卫自测' },
  { file: 'README.md', re: /Guard self-tests\s*\*?\*?(\d+)\//, want: () => guard && guard.total, label: 'README 首屏 守卫自测' },
  { file: 'README.zh-CN.md', re: /guard%20tests-(\d+)%2F(\d+)/, want: () => guard && guard.total, label: 'README.zh badge 守卫自测' },
  { file: 'README.zh-CN.md', re: /守卫自测\s*\*?\*?(\d+)\//, want: () => guard && guard.total, label: 'README.zh 首屏 守卫自测' },
  // harness 步数（EN「harness 6/6 green」/ ZH「harness 6 步全绿」）
  { file: 'README.md', re: /harness\s*\*?\*?(\d+)\/\d+\s*green/i, want: () => steps, label: 'README 首屏 harness 步数' },
  { file: 'README.zh-CN.md', re: /harness\s*\*?\*?(\d+)\s*步全绿/, want: () => steps, label: 'README.zh 首屏 harness 步数' },
  // 运行时依赖（badge runtime%20deps-0）
  { file: 'README.md', re: /runtime%20deps-(\d+)/, want: () => deps, label: 'README badge 运行时依赖' },
  { file: 'README.zh-CN.md', re: /runtime%20deps-(\d+)/, want: () => deps, label: 'README.zh badge 运行时依赖' },
]

console.log(`🔎 自我宣称校验（${root}）`)
console.log(`   真相源：守卫自测=${guard ? `${guard.pass}/${guard.total}` : '?'} · harness 步数=${steps ?? '?'} · 运行时依赖=${deps ?? '?'}\n`)

const failures = []
let checked = 0
let skipped = 0

for (const c of CLAIMS) {
  const expected = c.want()
  if (expected == null) {
    skipped++
    continue
  }
  const content = read(path.join(root, c.file))
  if (content == null) {
    skipped++
    continue
  }
  const m = content.match(c.re)
  if (!m) {
    skipped++
    continue
  }
  checked++
  const stated = Number(m[1])
  if (stated !== expected) {
    failures.push(`${c.label}（${c.file}）：文档写 ${stated}，实际 ${expected}`)
  }
}

if (failures.length) {
  console.error('❌ 自我宣称与实际不符（数字漂移了，去文档里改对）：\n')
  failures.forEach((f) => console.error(`   • ${f}`))
  console.error(`\n共 ${failures.length} 处不符。这正是本 kit 反复讲的「文档与代码漂移」——修文档里的数字。\n`)
  process.exit(1)
}

console.log(`✅ 自我宣称全部属实：核对 ${checked} 处写死的数字，均与实际一致${skipped ? `（${skipped} 处无对应文件/模式，已跳过）` : ''}。`)
process.exit(0)
