#!/usr/bin/env node
/**
 * 接口契约自测 —— 守护 STABILITY.md §1 里「对下游稳定」的承诺。
 *
 * 背景：这个 kit 会被抄进别人项目、并长期 `--update` 升级。下游把它的 npm script 名接进 CI、
 * 靠守卫的 stdin/exit 协议拦命令、靠 skill frontmatter 的 name 落位。这些是「契约」——一旦
 * 重构悄悄改了，下游 CI 会无声崩。本测试把契约钉成断言：破坏任一条 = 这里红，而不是下游红。
 *
 * 覆盖 STABILITY.md §1：
 *   1.1 公开 npm script 名都在
 *   1.2 守卫 stdin/exit 协议（拦=2 / 放=0 / GUARD_OFF 覆盖 / fail-open）
 *   1.3 质量脚本「项目缺某结构时优雅跳过 exit 0」
 *   1.4 skill frontmatter 有合法 name(kebab) + description
 *   1.5 install.mjs --help + 真装一次产出的 manifest schema
 *
 * 用法：node engineering/contract.test.cjs   （npm run test:contract）
 * 退出码：0 = 全部契约成立；1 = 有契约被破坏。零依赖，纯 Node。
 */
'use strict'
const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')

const KIT = path.dirname(__dirname) // engineering/.. = kit 根
const qs = path.join(KIT, 'engineering', 'quality-scripts')
const hooks = path.join(KIT, 'engineering', 'enforcement', 'hooks')

let pass = 0
const fails = []
function ok(name, cond, detail) {
  if (cond) { pass++; }
  else fails.push(detail ? `${name} —— ${detail}` : name)
}
function mkTmp(tag) {
  const d = path.join(os.tmpdir(), `fsk-contract-${tag}-${process.pid}`)
  fs.mkdirSync(d, { recursive: true })
  return d
}

// ── 1.1 公开 npm script 名 ────────────────────────────────────────────────
const PUBLIC_SCRIPTS = [
  'lint:secrets', 'lint:docs-links', 'lint:schema', 'lint:migration', 'lint:i18n-parity',
  'check:structure', 'harness', 'test:guards', 'install:claude', 'install:codex', 'install:cursor',
]
const pkg = JSON.parse(fs.readFileSync(path.join(KIT, 'package.json'), 'utf8'))
for (const s of PUBLIC_SCRIPTS) ok(`1.1 script「${s}」存在`, !!(pkg.scripts && pkg.scripts[s]))

// ── 1.2 守卫 stdin/exit 协议 ──────────────────────────────────────────────
function runGuard(file, payload, env) {
  const r = spawnSync('node', [path.join(hooks, file)], {
    input: JSON.stringify(payload), encoding: 'utf8', env: { ...process.env, ...env },
  })
  return r.status
}
const BASH = 'guard-dangerous-bash.cjs'
const EDIT = 'guard-high-risk-edit.cjs'
ok('1.2 bash 守卫拦 rm -rf /（exit 2）', runGuard(BASH, { tool_input: { command: 'rm -rf /' } }) === 2)
ok('1.2 bash 守卫放行 ls（exit 0）', runGuard(BASH, { tool_input: { command: 'ls -la' } }) === 0)
ok('1.2 bash 守卫 GUARD_OFF=1 覆盖（exit 0）', runGuard(BASH, { tool_input: { command: 'rm -rf /' } }, { GUARD_OFF: '1' }) === 0)
ok('1.2 bash 守卫 fail-open（坏 stdin → exit 0）', (() => {
  const r = spawnSync('node', [path.join(hooks, BASH)], { input: 'not json', encoding: 'utf8' })
  return r.status === 0
})())
ok('1.2 edit 守卫拦 .env（exit 2）', runGuard(EDIT, { tool_input: { file_path: '.env' } }) === 2)
ok('1.2 edit 守卫放行 src/foo.js（exit 0）', runGuard(EDIT, { tool_input: { file_path: 'src/foo.js' } }) === 0)

// ── 1.3 质量脚本：项目缺某结构 → 优雅跳过 exit 0 ──────────────────────────
// 用「空项目里 no-arg 跑」模拟「没有 i18n / 没有 prisma / 没有 docs」的下游项目。
const emptyProj = mkTmp('empty')
const CHECKS = [
  'check-secrets.cjs', 'check-docs-links.cjs', 'check-schema-text.cjs',
  'check-migration-drift.cjs', 'check-i18n-parity.cjs', 'check-project-structure.js',
]
for (const f of CHECKS) {
  const r = spawnSync('node', [path.join(qs, f)], { cwd: emptyProj, encoding: 'utf8' })
  ok(`1.3 ${f} 空项目优雅跳过（exit 0）`, r.status === 0, `实际 exit ${r.status}`)
}

// ── 1.4 skill frontmatter：name(kebab) + description ──────────────────────
function findSkills(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue
    const full = path.join(dir, e.name)
    if (e.isDirectory()) findSkills(full, out)
    else if (e.name === 'SKILL.md') out.push(full)
  }
  return out
}
const skills = findSkills(path.join(KIT, 'lifecycle'))
ok('1.4 至少有 1 个可安装 skill', skills.length > 0)
for (const s of skills) {
  const txt = fs.readFileSync(s, 'utf8')
  const rel = path.relative(KIT, s)
  const name = (txt.match(/^---[\s\S]*?\bname:\s*["']?([a-z0-9][a-z0-9-]*)["']?/m) || [])[1]
  const desc = (txt.match(/^---[\s\S]*?\bdescription:\s*\S/m) || [])[0]
  ok(`1.4 ${rel} 有合法 name(kebab)`, !!name)
  ok(`1.4 ${rel} 有 description`, !!desc)
}

// ── 1.5 install.mjs --help + manifest schema ──────────────────────────────
const help = spawnSync('node', [path.join(KIT, 'engineering', 'install.mjs'), '--help'], { encoding: 'utf8' })
ok('1.5 install --help exit 0', help.status === 0)
for (const flag of ['--target', '--tool', '--update', '--dry-run', '--force'])
  ok(`1.5 --help 列出 ${flag}`, help.stdout.includes(flag))

const instTarget = mkTmp('install')
const inst = spawnSync('node', [path.join(KIT, 'engineering', 'install.mjs'), '--target', instTarget, '--tool', 'claude'], { encoding: 'utf8' })
ok('1.5 真装一次 exit 0', inst.status === 0)
const manifestPath = path.join(instTarget, '.claude', '.fsk-manifest.json')
let manifest = null
try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) } catch { /* stays null */ }
ok('1.5 manifest 写出且可解析', !!manifest)
if (manifest) {
  ok('1.5 manifest 有 kit/kitVersion/tool/files', ['kit', 'kitVersion', 'tool', 'files'].every((k) => k in manifest))
  ok('1.5 manifest.files 是 {path: sha256}', manifest.files && typeof manifest.files === 'object' &&
    Object.values(manifest.files).every((v) => /^[a-f0-9]{64}$/.test(v)))
}

// ── 汇总 ──────────────────────────────────────────────────────────────────
const total = pass + fails.length
if (fails.length) {
  console.error(`\n❌ 契约被破坏（${fails.length}/${total}）：`)
  fails.forEach((f) => console.error(`   • ${f}`))
  console.error(`\n这些是 STABILITY.md §1 对下游的承诺。改坏了就是 breaking change——要么改回来，要么按 SemVer 升大版本并更新 STABILITY.md。\n`)
  process.exit(1)
}
console.log(`\n✅ 接口契约全部成立：${pass}/${total} 通过（STABILITY.md §1）。`)
process.exit(0)
