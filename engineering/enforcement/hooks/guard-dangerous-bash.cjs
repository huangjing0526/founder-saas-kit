#!/usr/bin/env node
/**
 * PreToolUse(Bash) 危险命令硬门禁 —— 运行时治理增强层
 *
 * 背景：Git 铁律 / 生产铁律此前只靠 agent「自觉读了照做」。本 guard 把
 * 「绝对禁止 / 需授权」两档前推到工具调用前，把误删 / 历史污染 / 误重启从
 * 「事后兜底」变成「动手前拦截」。这是一个 PreToolUse hook：Claude Code
 * 在执行任何 Bash 命令前，会把命令以 JSON 喂给本脚本的 stdin；脚本
 * exit 2 = 拦截（命令不执行，stderr 内容回喂给 agent），exit 0 = 放行。
 *
 * 分档：
 *   A 绝对禁止 —— 几乎从不正确、多数不可恢复；仅 GUARD_OFF=1 紧急覆盖。
 *   B 需授权   —— 合法但高危（生产发布）；需显式 GUARD_ALLOW_DEPLOY=1。
 *
 * 失效安全：任何内部异常一律 fail-open（exit 0），绝不因 guard 自身 bug 卡死 agent。
 * 覆盖口子（一个「有意识、可见」的动作，不会被误触；review 时在 transcript 里能看见）：
 *   - 在命令前显式加 `GUARD_OFF=1`（A 档）或 `GUARD_ALLOW_DEPLOY=1`（B 档）
 *   - 也支持外部 env：`export GUARD_OFF=1`
 *
 * ── 改成你自己项目的几个点 ─────────────────────────────────────────────
 *   1. 进程管理器规则：下方 ABSOLUTE 里那条「进程管理器 * all」是按
 *      pm2 写的（示例）。如果你用 systemd / docker / k8s，把那条 re 换成你自己
 *      「会连带重启无关服务」的命令模式，或直接删掉。
 *   2. 清库命令：下方 ABSOLUTE 里 `migrate reset` / `db push --force-reset` 是
 *      ORM 中立的清库拦截（示例：Prisma migrate reset / 你的 ORM 的 reset 命令）。
 *      若你的 ORM 用别的命令名清库（如 sequelize db:drop、knex migrate:rollback --all），
 *      照葫芦补一条 re。
 *   3. 生产分支名：下方 DEPLOY 假设生产分支叫 main。改成你的（如 master / prod）。
 *   4. 环境变量前缀：统一用 GUARD_ 前缀，按需改名。
 *
 * 已内置的绝对禁止：rm -rf / git reset --hard / git clean -f / force push /
 *   进程管理器 * all（示例）/ ORM migrate reset / db push --force-reset（示例）/
 *   dd 裸写块设备（of=/dev/...）/ 截断写入危险目标（>、:>、truncate 指向 /dev/、*.db、*.sqlite、含 prod 的路径）。
 */
'use strict'

const fs = require('fs')

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8')
  } catch {
    return ''
  }
}

let payload
try {
  payload = JSON.parse(readStdin() || '{}')
} catch {
  process.exit(0) // 解析失败 → 放行（fail-open）
}

const cmd = (payload && payload.tool_input && payload.tool_input.command) || ''
if (!cmd) process.exit(0)

// 紧急覆盖（人工授权 / 修复期）。既支持命令前缀，也支持外部 env。
const guardOff = /(^|\s)GUARD_OFF=1(\s|$)/.test(cmd) || process.env.GUARD_OFF === '1'
const deployOk =
  /(^|\s)GUARD_ALLOW_DEPLOY=1(\s|$)/.test(cmd) || process.env.GUARD_ALLOW_DEPLOY === '1'

// rm 递归 + 强制：按「语句」拆分逐句检测，只看 rm 自己的参数，
// 避免跨语句误伤（如 `rm -f x` 紧邻 `git log --format`，--format 含 r 被错凑成 -r）。
function rmRecursiveForce(command) {
  for (const stmt of command.split(/[\n;|&]+/)) {
    const m = stmt.match(/\brm\b(.*)/i)
    if (!m) continue
    const args = m[1]
    const hasR = /(^|\s)-[a-z]*r/i.test(args) || /(^|\s)--recursive\b/.test(args)
    const hasF = /(^|\s)-[a-z]*f/i.test(args) || /(^|\s)--force\b/.test(args)
    if (hasR && hasF) return true
  }
  return false
}

// 重定向截断 / truncate 指向危险目标：按「语句」拆分逐句检测。
// 只拦明显危险目标（裸块设备 /dev/、*.db、*.sqlite、含 prod 的路径），
// 避免误伤正常的 `> build/output.txt` 这类重定向到普通文件。
// 危险目标判定（用于 redirect 和 truncate 两处）。
function isDangerousTarget(target) {
  const t = target.trim().replace(/^['"]|['"]$/g, '') // 去掉外层引号
  if (!t) return false
  return (
    /^\/dev\//.test(t) || // 裸写块设备 / 设备文件
    /\.(db|sqlite|sqlite3)\b/i.test(t) || // 数据库文件
    /\bprod(uction)?\b/i.test(t) // 路径里含 prod / production
  )
}

function dangerousRedirectOrTruncate(command) {
  for (const stmt of command.split(/[\n;|&]+/)) {
    // `> file` / `>| file` / `: > file`（截断写）—— 排除 `>>`（追加，不截断）
    // 匹配重定向算子后面紧跟的目标 token。
    const redirectRe = /(?<!>)>\|?\s*([^\s;|&<>]+)/g
    let m
    while ((m = redirectRe.exec(stmt)) !== null) {
      if (isDangerousTarget(m[1])) return true
    }
    // truncate -s 0 <file> / truncate --size 0 <file>
    const truncMatch = stmt.match(/\btruncate\b(.*)/i)
    if (truncMatch) {
      const tokens = truncMatch[1].split(/\s+/).filter(Boolean)
      for (const tok of tokens) {
        if (tok.startsWith('-')) continue
        if (isDangerousTarget(tok)) return true
      }
    }
  }
  return false
}

// A 档：绝对禁止
const ABSOLUTE = [
  {
    re: /\bgit\s+reset\s+--hard\b/i,
    why: 'git reset --hard 丢弃工作区改动（不先 stash/commit 禁用）',
  },
  {
    re: /\bgit\s+clean\s+-\S*f/i,
    why: 'git clean -f 删除未跟踪文件（连带删新文件，最危险 —— 删了找不回）',
  },
  {
    // ⚠️ 按你的进程管理器调整：这条针对 `pm2 restart/reload/delete/stop all`，
    // 因为「* all」会连带重启同机上无关的其他服务。
    // 用 systemd 的话改成你的危险模式，或删掉本条。
    re: /\bpm2\s+(restart|reload|delete|stop)\s+all\b/i,
    why: '进程管理器 * all 会连带重启同机上的无关服务',
  },
  {
    re: /\bgit\s+push\b[^|&;#]*(--force\b|--force-with-lease\b|\s-f\b)/i,
    why: 'force push（永远不对受保护分支 force push —— 历史污染无法回滚）',
  },
  {
    // 清库命令（ORM 中立）：示例 —— Prisma 的 migrate reset / 你的 ORM 的 reset 命令。
    // `migrate reset` 会 drop 整库重建，对多租户 SaaS = 一键删光全租户数据。
    re: /\bmigrate\s+reset\b/i,
    why: 'ORM migrate reset 会 drop 整库重建（示例：Prisma migrate reset / 你的 ORM 的 reset 命令）—— 多租户 SaaS 下 = 删光全租户数据',
  },
  {
    // 清库命令（ORM 中立）：示例 —— Prisma 的 db push --force-reset / 你的 ORM 的强制重置。
    // `--force-reset` / `--force` 会无确认地丢弃并重建库。
    re: /\bdb\s+push\b[^|&;#]*--force(-reset)?\b/i,
    why: 'ORM db push --force-reset 无确认丢弃并重建库（示例：Prisma db push --force-reset / 你的 ORM 的强制重置）—— 多租户 SaaS 下 = 删光全租户数据',
  },
  {
    // 裸写块设备：dd if=... of=/dev/...（可瞬间抹掉磁盘 / 分区）。
    re: /\bdd\b[^|&;#]*\bof=\/dev\//i,
    why: 'dd 裸写块设备（of=/dev/...）会直接覆写磁盘/分区，不可恢复',
  },
]

// B 档：合法但需显式授权（生产发布）
// ⚠️ 按你的生产分支名调整（默认 main）。
const DEPLOY = [
  { re: /\bgit\s+push\b[^|&;#]*\bmain\b/i, why: 'push 到 main = 生产发布' },
  { re: /\bgit\s+merge\b[^|&;#]*\bmain\b/i, why: 'merge 进 main = 生产发布' },
]

function blockAbsolute(why) {
  process.stderr.write(
    `🛑 已拦截高危命令（绝对禁止档）：${why}\n\n` +
      `命令：${cmd}\n\n` +
      `这类操作几乎从不是当前任务的正确做法，且多数不可恢复。\n` +
      `若确属人工授权的必要操作，请在命令前显式加 GUARD_OFF=1 重试，并先说明：\n` +
      `  1. 为什么必须这么做（授权来源 / 原话）\n` +
      `  2. 影响范围（会删 / 会动什么）\n` +
      `  3. 回滚点（commit sha / 备份位置）\n` +
      `未获授权不要绕过。`,
  )
  process.exit(2)
}

function blockDeploy(why) {
  process.stderr.write(
    `⚠️ 已拦截生产发布动作：${why}\n\n` +
      `命令：${cmd}\n\n` +
      `按生产铁律，发布前先：\n` +
      `  ① 记录当前 commit sha + 进程状态（回滚点）\n` +
      `  ② 确认已同意本次发布方案\n` +
      `确认后在命令前加 GUARD_ALLOW_DEPLOY=1 重试。`,
  )
  process.exit(2)
}

if (!guardOff) {
  if (rmRecursiveForce(cmd)) {
    blockAbsolute('rm 递归强删（典型事故：曾连带清掉一批未提交文件，无法恢复）')
  }
  if (dangerousRedirectOrTruncate(cmd)) {
    blockAbsolute('截断写入危险目标（/dev/ 块设备 / *.db / *.sqlite / 含 prod 的路径）')
  }
  for (const r of ABSOLUTE) if (r.re.test(cmd)) blockAbsolute(r.why)
  if (!deployOk) for (const r of DEPLOY) if (r.re.test(cmd)) blockDeploy(r.why)
}

process.exit(0)
