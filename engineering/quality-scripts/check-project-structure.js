#!/usr/bin/env node
/**
 * 项目结构检测脚本 —— 检测根目录是否有违规文件（.log / .zip / .bak / 裸脚本 / 临时文件等）
 *
 * 背景：长跑的项目根目录容易堆垃圾：调试日志、导出的 csv、临时备份、随手放的脚本。
 * 这个 check 把「根目录该有什么」固化成白名单，凡是没在白名单又匹配垃圾模式的就拦下。
 *
 * 用法：
 *   node quality-scripts/check-project-structure.js [root]            # 默认 warn-only：未知项只告警，exit 0
 *   node quality-scripts/check-project-structure.js [root] --strict   # 严格：有违规项 exit 1（呼应 MECHANISMS 的 HARD）
 * 退出码：0 = 整洁 / 非 strict 下；1 = strict 且有违规项。
 *
 * 根目录解析：优先命令行第一个非 -- 参数，否则用当前工作目录（= npm 运行处 = 项目根）。
 * 不要用 __dirname 推根——模板放置层级因项目而异，__dirname 一旦深一层就会锚错根。
 *
 * 默认 warn-only：白名单是「这个项目长什么样」的强约定，因项目而异（lifecycle/engineering/ops…
 * 都是合法顶层）。默认只告警不阻断，避免新项目一接入就满屏假红；确认白名单贴合本项目后，
 * 在 CI 里加 --strict 才把未知项升级成硬失败。
 *
 * 零依赖：纯 fs，无任何 npm 包。
 *
 * ⚠️ 下面三组数组是「按项目可配置」的核心，新项目接入时先改这三组（白名单按你项目实际顶层配）：
 *   ALLOWED_ROOT_FILES  —— 允许直接放根目录的文件
 *   ALLOWED_ROOT_DIRS   —— 允许直接放根目录的目录
 *   VIOLATION_PATTERNS  —— 判定为垃圾/误放的文件名正则
 */

import fs from 'fs'
import path from 'path'

const args = process.argv.slice(2)
const STRICT = args.includes('--strict')
// 根/目标：优先命令行传入路径，否则用当前工作目录（npm 运行处 = 项目根）。
const projectRoot = path.resolve(args.find((a) => !a.startsWith('--')) || process.cwd())

// ── 可配置 1：允许在根目录存在的文件 ──────────────────────────────────────────
// 这是一份通用起步白名单，按你项目实际用的工具链增删（比如换了 webpack/turbo/biome）。
const ALLOWED_ROOT_FILES = [
  // 配置文件
  'package.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'tsconfig.json',
  'vite.config.js',
  'vite.config.ts',
  'vitest.config.js',
  'playwright.config.js',
  '.env.example',
  '.gitignore',
  '.eslintrc.cjs',
  '.prettierrc',
  '.editorconfig',
  // 部署
  'Dockerfile',
  'docker-compose.yml',
  'deploy.sh',
  // 文档
  'README.md',
  'LICENSE',
  'CLAUDE.md',
  'index.html',
]

// ── 可配置 2：允许在根目录存在的目录 ──────────────────────────────────────────
const ALLOWED_ROOT_DIRS = [
  'src',
  'server',
  'tests',
  'scripts',
  'docs',
  'prisma',
  'public',
  'shared',
  'dist',
  'node_modules',
  'logs',
  'coverage',
  '.git',
  '.github',
  '.claude',
  '.vscode',
]

// ── 可配置 3：违规文件模式（正则）——匹配到即判违规 ──────────────────────────
const VIOLATION_PATTERNS = [
  /\.log$/,           // 日志文件
  /\.zip$/,           // 压缩包
  /\.tar\.gz$/,       // 压缩包
  /\.bak$/,           // 备份文件
  /\.old$/,           // 旧文件
  /\.tmp$/,           // 临时文件
  /^temp/i,           // temp 开头的文件
  /^test[^s]/i,       // test 开头但不是 tests 目录
  /\.DS_Store$/,      // macOS 临时文件
  /^Thumbs\.db$/,     // Windows 临时文件
  /\.csv$/,           // 导出数据文件
  /\.xlsx?$/,         // Excel 文件
  /^screenshot/i,     // 截图
  /^debug.*\.log$/,   // debug 日志
]

// 裸脚本文件应放在 scripts/ 而非根目录（白名单里的 deploy.sh 等已豁免）
const SCRIPT_PATTERNS = [
  /\.sh$/,
  /\.cjs$/,
  /\.mjs$/,
]

function checkRootDirectory() {
  if (!fs.existsSync(projectRoot)) {
    console.log(`跳过：根目录不存在 ${projectRoot}`)
    return true
  }
  console.log(`🔍 检查项目根目录结构（${projectRoot}）...\n`)

  const items = fs.readdirSync(projectRoot)
  const violations = []

  for (const item of items) {
    const itemPath = path.join(projectRoot, item)
    const stat = fs.statSync(itemPath)

    if (stat.isDirectory()) {
      if (!ALLOWED_ROOT_DIRS.includes(item)) {
        violations.push({ type: 'directory', name: item, reason: '未在允许列表中的目录' })
      }
    } else {
      let isViolation = false
      let reason = ''

      if (!ALLOWED_ROOT_FILES.includes(item)) {
        for (const pattern of VIOLATION_PATTERNS) {
          if (pattern.test(item)) { isViolation = true; reason = '匹配违规文件模式'; break }
        }
        if (!isViolation) {
          for (const pattern of SCRIPT_PATTERNS) {
            if (pattern.test(item)) { isViolation = true; reason = '脚本文件应放在 scripts/ 目录'; break }
          }
        }
        if (!isViolation) { isViolation = true; reason = '未在允许列表中的文件' }
      }

      if (isViolation) violations.push({ type: 'file', name: item, reason })
    }
  }

  if (violations.length === 0) {
    console.log('✅ 项目结构检查通过！根目录整洁。\n')
    return true
  }

  console.log('❌ 发现以下违规项：\n')
  violations.forEach((v, index) => {
    const icon = v.type === 'file' ? '📄' : '📁'
    console.log(`${index + 1}. ${icon} ${v.name}`)
    console.log(`   原因: ${v.reason}`)
    console.log(`   建议: ${getSuggestion(v)}\n`)
  })
  console.log(`\n共发现 ${violations.length} 个违规项`)
  console.log('请删除/移动这些文件到正确目录，或把确实该留在根目录的项加进上方白名单。\n')
  if (!STRICT) {
    console.log('ℹ️  warn-only 模式：仅告警不阻断（exit 0）。确认白名单贴合本项目后，加 --strict 才硬失败。\n')
  }
  return STRICT ? false : true
}

function getSuggestion(violation) {
  const { name, type, reason } = violation
  if (reason.includes('脚本文件')) return '移动到 scripts/ 对应的子目录'
  if (/\.log$/.test(name)) return '移动到 logs/ 目录或删除'
  if (/\.(zip|tar\.gz)$/.test(name)) return '删除或移动到项目外'
  if (/\.(csv|xlsx?)$/.test(name)) return '移动到数据/上传目录或删除'
  if (/^(temp|test|debug)/i.test(name)) return '删除临时文件'
  if (type === 'directory') return '移动到 docs/ 或其他合适的目录，或删除'
  return '若确实该留在根目录，请加进 ALLOWED_ROOT_FILES 白名单'
}

const passed = checkRootDirectory()
process.exit(passed ? 0 : 1)
