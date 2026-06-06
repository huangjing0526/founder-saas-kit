#!/usr/bin/env node
/**
 * PreToolUse(Edit|Write|MultiEdit) 高风险编辑门禁 —— 运行时治理增强层
 *
 * 把「单点冲突 / 不可逆 / 跨会话」高危文件的编辑，从 commit-time 兜底前推到
 * 「动手前」：不是一刀切永久阻断，而是「阻断 → 要求列授权清单 → 凭清单放行」，
 * 强制先完成前置动作（想清楚影响面、回滚点、授权来源、验证方式）。
 *
 * 这是一个 PreToolUse hook：Claude Code 在执行 Edit/Write/MultiEdit 前，会把
 * 工具入参以 JSON 喂给本脚本 stdin。exit 2 = 拦截，exit 0 = 放行（C 档还会通过
 * stdout 注入一段提醒上下文给 agent，但不阻断）。
 *
 * 分档：
 *   绝对禁止 —— 写 .env / 密钥文件（密钥永不由 agent 改写）。覆盖 .env*、
 *              *.pem / *.key / *.p12 / *.pfx / *.keystore / *.jks、
 *              无扩展名私钥 id_rsa|id_dsa|id_ecdsa|id_ed25519、
 *              secrets.yaml|yml、credentials.json / credentials*。
 *   B 需授权 —— 受保护文件清单（见下方 B_TIER，含 CI 配置：GitHub Actions /
 *              GitLab CI / CircleCI —— 质量门禁总开关）；凭 .claude/.guard-ack.json
 *              （本文件精确 rel 路径、60 分钟内、5 字段填全）放行。
 *   C 仅提醒 —— 易出错但不致命的文件（如 i18n / locale），注入提醒不阻断。
 *
 * 失效安全：任何内部异常一律 fail-open（exit 0）。
 *
 * ── 改成你自己项目的核心点 ─────────────────────────────────────────────
 *   把下面的 B_TIER 数组改成「你自己改一下就可能搞出大事」的文件：
 *   数据库 schema / 迁移目录 / 业务规则登记表 / 进程配置 / CI 配置 / 计费逻辑……
 *   每条是 { re: <匹配相对路径的正则>, why: <为什么危险> }。
 *   密钥文件（.env / *.pem / *.key / id_rsa / secrets.yaml / credentials* …）
 *   已在「绝对禁止」段硬编码，无需在 B_TIER 重复。
 */
'use strict'

const fs = require('fs')
const path = require('path')

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
  process.exit(0)
}

const ti = payload.tool_input || {}
const filePath = ti.file_path || ''
if (!filePath) process.exit(0)

const cwd = payload.cwd || process.cwd()
const rel = path.relative(cwd, filePath).split(path.sep).join('/')
const base = path.basename(filePath)

// ── 绝对禁止：写 .env / 密钥（密钥只走外部安全存储，不提交、不由 agent 改写）──
// 覆盖：.env*、私钥 / 证书（*.pem / *.key / *.p12 / *.pfx / *.keystore / *.jks）、
//       无扩展名私钥（id_rsa / id_dsa / id_ecdsa / id_ed25519）、
//       常见密钥清单文件（secrets.yaml|yml、credentials.json / credentials*）。
const SECRET_DENY = [
  /(^|\/)\.env(\.|$)/, // .env / .env.local / .env.production ...
  /\.(pem|key|p12|pfx|keystore|jks)$/i, // 私钥 / 证书 / keystore
  /(^|\/)id_(rsa|dsa|ecdsa|ed25519)$/, // 无扩展名 SSH 私钥
  /(^|\/)secrets\.ya?ml$/i, // secrets.yaml / secrets.yml
  /(^|\/)credentials(\.|$)/i, // credentials.json / credentials*
]
if (SECRET_DENY.some((re) => re.test(rel) || re.test(base))) {
  process.stderr.write(
    `🛑 禁止写入密钥 / 环境文件：${rel}\n` +
      `密钥只走受控的密钥存储（本地 600 权限文件 / 部署平台 secret），不提交、不由 agent 改写。`,
  )
  process.exit(2)
}

// ── B 档：单点冲突 / 不可逆 / 跨会话高危文件 ─────────────────────────────────
// 👇 这是「受保护文件清单」—— 按你自己项目里「改它就可能搞出大事」的文件来配。
//    re 匹配的是相对仓库根的路径（用 / 分隔）。
const B_TIER = [
  {
    // 数据库 schema（举例用的是 Prisma；改成你的 ORM / SQL schema 路径）
    re: /^prisma\/schema\.prisma$/,
    why: '数据库结构（改字段 / 类型 / 表，需授权 + 对应 migration）',
  },
  {
    // 迁移目录（误改致不可重放）
    re: /^prisma\/migrations\//,
    why: '迁移文件（误改致不可重放，可能酿生产故障）',
  },
  {
    // 业务规则登记表 —— 改它 = 动业务规则
    re: /(^|\/)business-rules-registry\.md$/,
    why: '业务规则登记表（改它 = 动业务规则，需授权 + 规则编号）',
  },
  {
    // 进程管理器配置（举例 pm2；改成你的 systemd unit / docker-compose / k8s manifest）
    re: /(^|\/)ecosystem\.config\.(c?js|json)$/,
    why: '进程管理器配置（动它影响生产进程拓扑）',
  },
  {
    // CI 流水线 —— 质量门禁总开关，agent 改它能一键关掉全部 enforcement。
    re: /(^|\/)\.github\/workflows\//,
    why: 'CI 流水线（GitHub Actions —— 质量门禁总开关，改它能一键关掉全部 enforcement）',
  },
  {
    // GitLab CI 配置（同理：门禁总开关）。
    re: /(^|\/)\.gitlab-ci\.ya?ml$/,
    why: 'CI 流水线（GitLab CI —— 质量门禁总开关，改它能一键关掉全部 enforcement）',
  },
  {
    // CircleCI 配置（同理：门禁总开关）。
    re: /(^|\/)\.circleci\//,
    why: 'CI 流水线（CircleCI —— 质量门禁总开关，改它能一键关掉全部 enforcement）',
  },
  // ── 按需追加你自己的敏感文件，例如： ──
  // { re: /(^|\/)billing\//,            why: '计费逻辑（算错钱直接是钱的事故）' },
]

const hit = B_TIER.find((r) => r.re.test(rel))
if (hit) {
  const ackPath = path.join(cwd, '.claude', '.guard-ack.json')
  let acked = false
  try {
    const ack = JSON.parse(fs.readFileSync(ackPath, 'utf8'))
    const fresh = ack.ts && Date.now() - new Date(ack.ts).getTime() < 60 * 60 * 1000
    // 精确 rel 路径匹配：ack 必须正是当前编辑文件的相对路径，避免
    // `packages/x/prisma/schema.prisma` 被为 `prisma/schema.prisma` 生成的 ack 误放行。
    const sameFile = ack.file === rel
    const required = ['reason', 'affected', 'rollback', 'ruleOrAuth', 'verification']
    const filled = required.every((k) => typeof ack[k] === 'string' && ack[k].trim().length > 0)
    acked = Boolean(fresh && sameFile && filled)
  } catch {
    acked = false
  }
  if (acked) process.exit(0)

  process.stderr.write(
    `🛑 已拦截高风险编辑：${rel}\n` +
      `原因：${hit.why}\n\n` +
      `这是单点冲突 / 不可逆文件，动手前必须先想清前置。\n` +
      `请先用 Write 生成 .claude/.guard-ack.json（仅针对本文件、60 分钟内有效）：\n` +
      `{\n` +
      `  "file": "${rel}",\n` +
      `  "reason": "<授权的理由 / 原话引用>",\n` +
      `  "affected": "<影响面：grep 出的依赖 / 消费方>",\n` +
      `  "rollback": "<回滚点：commit sha / 备份 / 反向迁移>",\n` +
      `  "ruleOrAuth": "<对应规则编号 或 授权出处>",\n` +
      `  "verification": "<能证明改对的命令>",\n` +
      `  "ts": "<当前 ISO 时间，如 2026-01-01T10:00:00Z>"\n` +
      `}\n` +
      `写完再重试本次编辑。未完成清单不要绕过。`,
  )
  process.exit(2)
}

// ── C 档：低风险提醒（不阻断，通过 additionalContext 注入给 agent）─────────────
const C_TIER = [
  {
    // 举例：i18n / locale 文件。改成你项目里「改了容易漏配套动作」的文件类型。
    re: /(^|\/)(locales?|i18n|lang)\/[^/]*\.(json|js|ts)$/i,
    msg: 'i18n 改动提醒：保持各语言文案 parity（跑你的 i18n parity 检查），禁硬编码某种语言文案 / 禁混入其他语言。',
  },
]
const c = C_TIER.find((r) => r.re.test(rel))
if (c) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        additionalContext: c.msg,
      },
    }),
  )
  process.exit(0)
}

process.exit(0)
