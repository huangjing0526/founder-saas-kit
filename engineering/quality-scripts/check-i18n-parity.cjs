#!/usr/bin/env node
/**
 * i18n 翻译 key 一致性检查 —— 多 locale 的 key 完整性比对
 *
 * 背景：多语言项目里「界面只能显示用户选定的那一种语言」，任何一种语言缺 key 都会
 * fallback 到另一种语言 → 界面混入非选定语言（典型事故）。这个 check 拿一个基准语言，
 * 比对其余 locale 是否缺 key / 多 key。
 *
 * 目录结构假设：locales/<locale>/*.json（每种语言一个目录、按模块拆 json）。
 *   ⚠️ 开箱仅支持上面这种「目录布局」。若你的项目是「每种语言一个大 json 文件」
 *   （locales/zh.json、locales/en.json —— 本 kit 的提纯来源项目用的就是这种），
 *   当前脚本会把 en.json 当成「非目录的 locale」直接报错退出，**必须先改 loadLocale()**
 *   改成读单文件再 flatten，才能跑（主逻辑/比对部分不用动）。不是加个参数就行。
 *
 * 用法：
 *   node quality-scripts/check-i18n-parity.cjs [localesDir]          # 严格模式：任何差异 exit 1
 *   node quality-scripts/check-i18n-parity.cjs [localesDir] --warn   # 警告模式：只报告不 fail
 *
 * 路径解析：优先命令行第一个非 -- 参数，否则用 `src/i18n/locales`（相对当前工作目录 = 项目根）。
 * 不要用 __dirname 推根——模板放置层级因项目而异。locales 目录不存在时优雅跳过 exit 0，不要崩。
 *
 * 退出码：0 = 一致 / 警告模式通过 / 无 locales 跳过；1 = 有缺失
 *
 * 零依赖：纯 fs，无任何 npm 包。
 */

const fs = require('fs')
const path = require('path')

const args = process.argv.slice(2)
const WARN_ONLY = args.includes('--warn')

// ⚠️ 按项目可配置：locale 根目录 + 基准语言。优先命令行传入，否则默认相对 cwd。
//    BASE_LOCALE 是「翻译最全、其余语言向它对齐」的那一种（示例用 'en'，按你团队主语言换）。
const localesRoot = path.resolve(args.find((a) => !a.startsWith('--')) || path.join(process.cwd(), 'src', 'i18n', 'locales'))
const BASE_LOCALE = 'en'

// 无 locales 目录 → 优雅跳过（非多语言项目本就没有）。
if (!fs.existsSync(localesRoot)) {
  console.log(`跳过：无 locales（${localesRoot} 不存在）`)
  process.exit(0)
}

function flattenKeys(obj, prefix = '', out = new Set()) {
  if (obj == null || typeof obj !== 'object') return out
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      flattenKeys(v, key, out)
    } else {
      out.add(key)
    }
  }
  return out
}

function loadLocale(locale) {
  const dir = path.join(localesRoot, locale)
  if (!fs.existsSync(dir)) return new Set()
  const keys = new Set()
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.json')) continue
    const moduleKey = file.replace(/\.json$/, '')
    const content = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
    flattenKeys(content, moduleKey, keys)
  }
  return keys
}

const locales = fs.readdirSync(localesRoot).filter((f) =>
  fs.statSync(path.join(localesRoot, f)).isDirectory()
)

if (!locales.includes(BASE_LOCALE)) {
  console.error(`基准语言 "${BASE_LOCALE}" 不在 ${localesRoot} 里`)
  process.exit(2)
}

const baseKeys = loadLocale(BASE_LOCALE)
console.log(`基准 (${BASE_LOCALE}): ${baseKeys.size} keys`)

let hasDiff = false
for (const locale of locales) {
  if (locale === BASE_LOCALE) continue
  const keys = loadLocale(locale)
  const missing = [...baseKeys].filter((k) => !keys.has(k))
  const extra = [...keys].filter((k) => !baseKeys.has(k))
  console.log(`\n${locale}: ${keys.size} keys (缺 ${missing.length}, 多 ${extra.length})`)
  if (missing.length > 0) {
    hasDiff = true
    console.log(`  缺失 (前 20): ${missing.slice(0, 20).join(', ')}${missing.length > 20 ? ` ... +${missing.length - 20}` : ''}`)
  }
  if (extra.length > 0) {
    hasDiff = true
    console.log(`  多出 (前 20): ${extra.slice(0, 20).join(', ')}${extra.length > 20 ? ` ... +${extra.length - 20}` : ''}`)
  }
}

if (hasDiff && !WARN_ONLY) {
  console.error('\n✗ i18n keys 不一致。补齐缺失/删掉多余的 key，或加 --warn 只报告不阻断。')
  process.exit(1)
}
console.log(hasDiff ? '\n(warn 模式) 差异已报告，不阻断' : '\n✓ 所有 locale 对齐')
