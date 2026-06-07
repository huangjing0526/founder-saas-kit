#!/usr/bin/env node
/**
 * 多租户隔离粗扫（脚本层）—— 机检 ORM 查询是否漏了 tenantId 过滤。
 *
 * 背景：多租户 SaaS 的头号事故是「A 公司看到 B 公司的数据」。每个落到数据层的查询都该带
 * 租户过滤（where.tenantId）。这个 check 在脚本层粗扫：找出常见的「集合型」查询调用，
 * 看它的参数里有没有出现 tenantId——没有就标出来让你核。
 *
 * ⚠️ 这是「粗扫」，启发式，必有漏报/误报（它只按文本找 tenantId 是否出现在调用参数里，
 *    不理解作用域、不跟变量、不展开 where 拼接）。真正的语义保证是只读子代理
 *    `tenant-isolation-reviewer`（理解上下文）。本脚本是它的「机检前哨」，不是替代。
 *    定位见 governance-skills/S4-tenant-isolation-guard.md 的「脚本层 / 语义层」两层。
 *
 * 扫什么（默认 SCOPED_METHODS）：findMany / findFirst / aggregate / count / groupBy /
 *   updateMany / deleteMany / $queryRaw / $executeRaw。
 *   —— 默认**不**扫 findUnique（按唯一主键查，常见「先查后校验 tenantId」，全扫会铺天误报）；
 *      要严可把它加进 SCOPED_METHODS。
 *
 * 用法：
 *   node quality-scripts/check-tenant-scope.cjs [root]            # 严格：发现疑漏 exit 1
 *   node quality-scripts/check-tenant-scope.cjs [root] --warn     # 警告：只报告不 fail
 * 路径解析：优先命令行第一个非 -- 参数，否则用 cwd（= 项目根）。无匹配源码时优雅跳过 exit 0。
 * 退出码：0 = 干净 / 警告模式 / 无 ORM 用法跳过；1 = 发现疑似漏过滤。
 *
 * 零依赖：纯 fs，无任何 npm 包。
 *
 * ⚠️ 按项目可配置（下方常量）：TENANT_FIELD（租户字段名）、SCOPED_METHODS（要扫的方法）、
 *    SCAN_EXT（扫哪些扩展名）、SKIP_DIRS（跳过目录）、GLOBAL_MODELS（确实全局、无需租户隔离的表白名单）。
 */
'use strict'
const fs = require('fs')
const path = require('path')

const args = process.argv.slice(2)
const WARN_ONLY = args.includes('--warn')
const root = path.resolve(args.find((a) => !a.startsWith('--')) || process.cwd())

// ── 按项目可配置 ──────────────────────────────────────────────────────────
const TENANT_FIELD = 'tenantId'
const SCOPED_METHODS = [
  'findMany', 'findFirst', 'aggregate', 'count', 'groupBy', 'updateMany', 'deleteMany',
  // 'findUnique',  // 默认关：按唯一键查，多为先查后校验；要严再开
]
const RAW_METHODS = ['$queryRaw', '$executeRaw'] // 原生 SQL：参数形态不同，单独处理
const SCAN_EXT = new Set(['.js', '.ts', '.mjs', '.cjs', '.mts', '.cts'])
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next', 'out'])
// 确实全局、无需租户隔离的「模型名」（调用 .findMany 前那个标识符）。按你项目补。
const GLOBAL_MODELS = new Set(['$transaction'])
// ──────────────────────────────────────────────────────────────────────────

if (!fs.existsSync(root)) { console.log(`跳过：根目录不存在 ${root}`); process.exit(0) }

function walk(dir, acc) {
  let entries
  try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return acc }
  for (const e of entries) {
    if (e.name.startsWith('.') && e.name !== '.') { if (SKIP_DIRS.has(e.name)) continue }
    if (SKIP_DIRS.has(e.name)) continue
    const full = path.join(dir, e.name)
    if (e.isDirectory()) walk(full, acc)
    else if (SCAN_EXT.has(path.extname(e.name))) acc.push(full)
  }
  return acc
}

// 从 openIdx（指向 '('）起取平衡括号子串（粗略：不剔字符串/注释里的括号，粗扫够用）。
function balancedArgs(src, openIdx) {
  let depth = 0
  for (let i = openIdx; i < src.length; i++) {
    const ch = src[i]
    if (ch === '(') depth++
    else if (ch === ')') { depth--; if (depth === 0) return src.slice(openIdx, i + 1) }
  }
  return src.slice(openIdx)
}
const lineOf = (src, idx) => src.slice(0, idx).split('\n').length

const files = walk(root, [])
const findings = []

const methodRe = new RegExp(`\\b([\\w$]+)\\.(${SCOPED_METHODS.join('|')})\\s*\\(`, 'g')
const rawRe = new RegExp(`\\.(${RAW_METHODS.map((m) => m.replace('$', '\\$')).join('|')})`, 'g')

for (const file of files) {
  let src
  try { src = fs.readFileSync(file, 'utf8') } catch { continue }
  if (!src.includes('.find') && !src.includes('.aggregate') && !src.includes('.count') &&
      !src.includes('.groupBy') && !src.includes('Many') && !src.includes('$queryRaw') && !src.includes('$executeRaw')) continue
  const rel = path.relative(root, file).split(path.sep).join('/')

  // 集合型查询：参数里没 tenantId → 标
  let m
  methodRe.lastIndex = 0
  while ((m = methodRe.exec(src))) {
    const model = m[1]
    const method = m[2]
    if (GLOBAL_MODELS.has(model)) continue
    const openIdx = src.indexOf('(', m.index + m[0].length - 1)
    const callArgs = balancedArgs(src, openIdx)
    if (!callArgs.includes(TENANT_FIELD)) {
      findings.push({ rel, line: lineOf(src, m.index), code: `${model}.${method}(…)`, why: `参数里没出现 ${TENANT_FIELD}` })
    }
  }
  // 原生 SQL：调用后 ~300 字符内没 tenantId → 标（原生最容易绕过隔离）
  let r
  rawRe.lastIndex = 0
  while ((r = rawRe.exec(src))) {
    const window = src.slice(r.index, r.index + 300)
    if (!window.includes(TENANT_FIELD)) {
      findings.push({ rel, line: lineOf(src, r.index), code: `${r[0]}…`, why: `原生 SQL 近旁没出现 ${TENANT_FIELD}（务必人工核）` })
    }
  }
}

console.log(`🛡️  多租户隔离粗扫（${root}）：扫 ${files.length} 个源文件，方法 [${SCOPED_METHODS.join(', ')}] + 原生 SQL\n`)

if (!findings.length) {
  console.log(`✅ 未发现明显漏 ${TENANT_FIELD} 的查询（粗扫；强隔离仍以 tenant-isolation-reviewer 语义审查为准）。`)
  process.exit(0)
}

console.log(`${WARN_ONLY ? '⚠️ ' : '❌'} 发现 ${findings.length} 处疑似漏租户过滤（粗扫，可能误报，逐条核）：\n`)
for (const f of findings) console.log(`   ${f.rel}:${f.line}  ${f.code}  — ${f.why}`)
console.log(`\n核对要点：确认每处 where 真的带了 ${TENANT_FIELD}（或经 withDataScope 等统一注入）。`)
console.log(`真全局无需隔离的表，把「模型名」加进脚本 GLOBAL_MODELS 白名单。语义层用 tenant-isolation-reviewer 复核。`)
if (WARN_ONLY) { console.log(`\nℹ️  warn-only 模式：仅告警不阻断（exit 0）。`); process.exit(0) }
process.exit(1)
