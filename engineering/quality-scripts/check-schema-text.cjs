#!/usr/bin/env node
/**
 * Schema Lint：检查可能超长的 String 字段是否缺少 @db.Text（示例栈：Prisma + MySQL）
 *
 * 背景（MySQL 191 截断陷阱）：MySQL 下 Prisma 的 String 默认映射 VARCHAR(191)。
 * 像 url / description / content 这类字段实际经常超过 191 字符，写入会被静默截断，
 * 上线后才发现「链接/正文存进去缺了一截」。这个 check 在 schema 层提前拦下，
 * 强制给疑似长文本字段加 @db.Text。
 *
 * 规则：以下命名模式的字段名如果类型是 String 且没有 @db.Text，就报错：
 *   - 包含 url/link/path/image（URL 类）
 *   - 包含 description/reason/content/remark/note/comment（文本类）
 *   - 包含 sql/query/script（代码/查询类）
 *   - 包含 deviceInfo/userAgent/agent（UA 类）
 *   - 包含 specification/spec（规格类）
 *
 * 自动跳过：@db.Text/LongText/MediumText/TinyText、@db.VarChar(n)、@unique（已显式限长或不能用 TEXT）
 *
 * 用法: node quality-scripts/check-schema-text.cjs [schemaPath]
 * 退出码：0 = 全部正确标注 / 无 schema 跳过；1 = 有疑似漏标字段。
 *
 * 路径解析：优先命令行第一个参数，否则用 `prisma/schema.prisma`（相对当前工作目录 = 项目根）。
 * 不要用 __dirname 推根——模板放置层级因项目而异。schema 不存在时优雅跳过 exit 0，不要 ENOENT 崩。
 *
 * 零依赖：纯 fs + 正则，无任何 npm 包。
 *
 * （非 Prisma/MySQL 栈：思路通用——「按字段命名猜长文本 + 检查是否显式放宽了列长度」，
 *   把 SCHEMA_PATH 与 @db.Text 的检测正则换成你 ORM/迁移文件的对应语法即可。）
 */

const fs = require('fs')
const path = require('path')

// ⚠️ 按项目可配置：schema 文件路径。优先命令行传入，否则默认相对 cwd。
const arg = process.argv[2]
const SCHEMA_PATH = path.resolve(arg || path.join(process.cwd(), 'prisma', 'schema.prisma'))

// 无 schema → 优雅跳过（示例栈是 Prisma；非 Prisma/无 DB 项目本就没有这文件）。
if (!fs.existsSync(SCHEMA_PATH)) {
  console.log(`跳过：无 schema（${SCHEMA_PATH} 不存在，示例栈：Prisma）`)
  process.exit(0)
}

// 字段名匹配模式（不区分大小写）——按你的业务命名习惯增删
const LONG_FIELD_PATTERNS = [
  /url$/i, /link$/i, /path$/i,                       // URL 类
  /image(url|path|src)$/i,                            // 图片 URL 类（排除 imageId/imageType）
  /description$/i, /reason$/i, /content$/i,           // 文本类（末尾匹配，排除 reasonCode 等）
  /remark/i, /note$/i, /comment/i,
  /^sql$/i, /query/i, /script/i,                      // 代码/查询类
  /deviceinfo/i, /useragent/i, /user_agent/i,         // UA 类
  /specification/i, /^spec$/i,                         // 规格类
]

// 白名单：这些字段虽然匹配模式但确实不需要 TEXT（短枚举值 / 短路由 / 短 ID 等）。
// 这是「行内豁免」的集中版——见 MECHANISMS.md。按你项目实际情况填。
const WHITELIST = new Set([
  // 'link',          // 示例：某个短内部路由字段
  // 'externalSource',// 示例：枚举值如 "sap"
])

const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8')
const lines = schema.split('\n')

let currentModel = null
let errors = []

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim()

  if (line.startsWith('//')) continue

  const modelMatch = line.match(/^model\s+(\w+)/)
  if (modelMatch) { currentModel = modelMatch[1]; continue }
  if (line.startsWith('}')) { currentModel = null; continue }
  if (!currentModel) continue

  // 解析字段行：fieldName Type? @annotations
  const fieldMatch = line.match(/^(\w+)\s+String(\??)\s*(.*)$/)
  if (!fieldMatch) continue

  const [, fieldName, , rest] = fieldMatch

  if (WHITELIST.has(fieldName)) continue
  // 已有 @db.Text/LongText/MediumText/TinyText（容量都 ≥ Text，满足「超过 191 字符」诉求）
  if (/@db\.(Text|LongText|MediumText|TinyText)\b/.test(rest)) continue
  // 显式 @db.VarChar(n)（开发者已主动定长）
  if (/@db\.VarChar\s*\(/.test(rest)) continue
  // @unique（TEXT 不能做唯一索引）
  if (rest.includes('@unique')) continue

  if (LONG_FIELD_PATTERNS.some(p => p.test(fieldName))) {
    errors.push({ line: i + 1, model: currentModel, field: fieldName })
  }
}

if (errors.length > 0) {
  console.error('\n❌ Schema lint：以下 String 字段可能超过 191 字符，需要添加 @db.Text:\n')
  errors.forEach(e => console.error(`  ${e.model}.${e.field} (line ${e.line})`))
  console.error('\n如果确认不需要，请在本脚本的 WHITELIST 中添加字段名。\n')
  process.exit(1)
} else {
  console.log('✅ Schema lint：所有可能超长的 String 字段已正确标注 @db.Text')
}
