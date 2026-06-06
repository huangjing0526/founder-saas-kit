#!/usr/bin/env node
/**
 * Pre-commit 检查：改了 schema 但没新增 migration 就拦提交（示例栈：Prisma）
 *
 * 历史事故：有人把一个新字段定义带进了 schema.prisma，但没带对应 migration 文件。
 * 本地 dev 库靠 `prisma db push` 临时同步过，看起来正常；部署到生产却因为 schema ↔ DB
 * 不一致，相关接口直接 503。这个 check 在 commit 阶段就把「schema 变了、migration 没跟上」拦下。
 *
 * 旧逻辑「staged 里有任意 .sql 就放行」会被绕过：
 *   - 同一 commit 同时改了 schema 和某个已有 migration 的 typo
 *   - schema 改了，但忘了生成新 migration
 * 新逻辑要求：staged 必须有「新增」的 migration.sql（git status 中 A 状态），仅改既有 migration 不算。
 *
 * 用法（接 husky / lint-staged / pre-commit hook）：
 *   node quality-scripts/check-migration-drift.cjs
 * 退出码：0 = 通过；1 = schema 改了但没新增 migration。
 *
 * 零依赖：只用 child_process 调 git，无任何 npm 包。
 *
 * （非 Prisma 栈：把 schema 路径与 migration 目录正则换成你迁移工具的约定即可——
 *   思路通用：「schema 进了 staged，就必须同时有一个全新的 migration 文件进 staged」。）
 */
const { execSync } = require('child_process')

// ⚠️ 按项目可配置：schema 文件路径 + migration 目录命名约定。
const SCHEMA_PATH = 'prisma/schema.prisma'
const MIGRATION_RE = /^prisma\/migrations\/\d{14}_[^/]+\/migration\.sql$/

// 先判断是否在 git 工作树里：本 check 全靠 `git diff --cached`，非 git 上下文
// （刚解压的模板 / CI 浅检出 / 非 git 仓库）直接优雅跳过，不要让 git 命令崩。
try {
  execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' })
} catch {
  console.log('跳过：非 git 上下文（git diff --cached 不可用）')
  process.exit(0)
}

const nameStatus = execSync('git diff --cached --name-status', { encoding: 'utf-8' })
const entries = nameStatus.split('\n').filter(Boolean).map(line => {
  const [status, ...pathParts] = line.split('\t')
  return { status, path: pathParts.join('\t') }
})

const schemaChanged = entries.some(e => e.path === SCHEMA_PATH)
const addedMigration = entries.find(e => e.status === 'A' && MIGRATION_RE.test(e.path))

if (schemaChanged && !addedMigration) {
  console.error(`❌ ${SCHEMA_PATH} 已修改，但本次提交未新增 migration 目录！`)
  console.error('')
  console.error('   修复步骤：')
  console.error('   1) npx prisma migrate dev --name <描述>     # 本地生成 migration')
  console.error('   2) git add prisma/migrations/<新目录>/      # 把新 migration 一起 staged')
  console.error('   3) 重新 git commit')
  console.error('')
  console.error('   背景：仅修改既有 migration 文件不算「新增」。schema 字段变更必须配对')
  console.error('   全新的 migration 文件，否则生产部署后 schema ↔ DB 不一致 → 接口 503。')
  process.exit(1)
}
