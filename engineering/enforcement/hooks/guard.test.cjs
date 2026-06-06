#!/usr/bin/env node
/**
 * 两个守卫 hook 的零依赖自测。
 *
 * 怎么跑：
 *   node guard.test.cjs
 *   （或从仓库根：node engineering/enforcement/hooks/guard.test.cjs）
 *
 * 退出码：全部用例通过 → exit 0；任一失败 → exit 1（打印失败明细）。
 *
 * 做法：用 child_process 同步起子进程跑真实守卫脚本，把 payload 当 JSON
 * 喂进 stdin，断言守卫的 exit code（2 = 拦截 / 0 = 放行）。不 mock 任何内部
 * 逻辑——跑的就是线上同一份 .cjs，覆盖各类「绕过」payload。
 */
'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawnSync } = require('child_process')

const BASH_GUARD = path.join(__dirname, 'guard-dangerous-bash.cjs')
const EDIT_GUARD = path.join(__dirname, 'guard-high-risk-edit.cjs')

// 跑一个守卫：payload 序列化进 stdin，返回 { code, stderr }。
function runGuard(guardPath, payload, env) {
  const res = spawnSync(process.execPath, [guardPath], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    env: { ...process.env, ...(env || {}) },
  })
  if (res.error) throw res.error
  return { code: res.status, stderr: res.stderr || '' }
}

const bash = (command, env) =>
  runGuard(BASH_GUARD, { tool_input: { command } }, env).code
// 默认 cwd 用一个真实临时目录，便于 ack 测试写 .claude/.guard-ack.json。
// edit(rel) 接收「相对仓库根的路径」，内部 join 到 cwd 下，保证守卫算出的
// rel 与传入一致（避免 path.relative 算出 ../ 前缀污染正则匹配）。
const TMP_CWD = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-test-'))
const edit = (relPath, cwd) => {
  const root = cwd || TMP_CWD
  return runGuard(EDIT_GUARD, {
    tool_input: { file_path: path.join(root, relPath) },
    cwd: root,
  }).code
}

// 写一个 ack 文件到指定 cwd（精确匹配测试用）。
function writeAck(cwd, file) {
  const dir = path.join(cwd, '.claude')
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(
    path.join(dir, '.guard-ack.json'),
    JSON.stringify({
      file,
      reason: 'test',
      affected: 'test',
      rollback: 'test',
      ruleOrAuth: 'test',
      verification: 'test',
      ts: new Date().toISOString(),
    }),
  )
}

const BLOCK = 2
const ALLOW = 0

// 每条用例：[名称, 实际 exit code, 期望 exit code]
const cases = []
const expect = (name, actual, want) => cases.push([name, actual, want])

// ── guard-dangerous-bash：该拦的（exit 2）──────────────────────────────
expect('rm -rf 拦截', bash('rm -rf build'), BLOCK)
expect('rm -fr 顺序变体拦截', bash('rm -fr /tmp/x'), BLOCK)
expect('git reset --hard 拦截', bash('git reset --hard HEAD'), BLOCK)
expect('git clean -fd 拦截', bash('git clean -fd'), BLOCK)
expect('force push 拦截', bash('git push --force origin dev'), BLOCK)
expect('pm2 restart all 拦截(示例进程管理器)', bash('pm2 restart all'), BLOCK)
expect('prisma migrate reset --force 拦截(示例清库)', bash('npx prisma migrate reset --force'), BLOCK)
expect('migrate reset 无 --force 也拦', bash('prisma migrate reset'), BLOCK)
expect('db push --force-reset 拦截(示例清库)', bash('npx prisma db push --force-reset'), BLOCK)
expect('dd 裸写块设备拦截', bash('dd if=/dev/zero of=/dev/sda bs=1M'), BLOCK)
expect('截断写 /dev/ 拦截', bash('echo x > /dev/sda'), BLOCK)
expect('截断写 *.db 拦截', bash('cat /dev/null > prod.db'), BLOCK)
expect('截断写 *.sqlite 拦截', bash(': > app.sqlite'), BLOCK)
expect('truncate 指向 .db 拦截', bash('truncate -s 0 data.db'), BLOCK)
expect('截断写含 prod 路径拦截', bash('echo x > /var/prod/state'), BLOCK)

// ── guard-dangerous-bash：该放的（exit 0）─────────────────────────────
expect('git status 放行', bash('git status'), ALLOW)
expect('正常重定向到普通文件放行', bash('echo hi > build/output.txt'), ALLOW)
expect('追加重定向到普通文件放行', bash('echo hi >> notes.log'), ALLOW)
expect('rm 非递归放行', bash('rm tmp.txt'), ALLOW)
expect('GUARD_OFF=1 命令前缀覆盖放行', bash('GUARD_OFF=1 rm -rf build'), ALLOW)
expect('GUARD_OFF=1 env 覆盖放行', bash('rm -rf build', { GUARD_OFF: '1' }), ALLOW)
expect(
  'GUARD_ALLOW_DEPLOY=1 放行生产发布',
  bash('git push origin main', { GUARD_ALLOW_DEPLOY: '1' }),
  ALLOW,
)

// ── guard-dangerous-bash：B 档生产发布（exit 2，未授权时）─────────────
expect('push main 未授权拦截', bash('git push origin main'), BLOCK)

// ── guard-high-risk-edit：该拦的（exit 2）──────────────────────────────
expect('写 .env 拦截', edit('.env'), BLOCK)
expect('写 .env.production 拦截', edit('.env.production'), BLOCK)
expect('写 *.pem 拦截', edit('certs/server.pem'), BLOCK)
expect('写 *.key 拦截', edit('certs/server.key'), BLOCK)
expect('写 secrets.yaml 拦截', edit('config/secrets.yaml'), BLOCK)
expect('写 secrets.yml 拦截', edit('secrets.yml'), BLOCK)
expect('写 credentials.json 拦截', edit('credentials.json'), BLOCK)
expect('写无扩展名私钥 id_rsa 拦截', edit('.ssh/id_rsa'), BLOCK)
expect('写 id_ed25519 拦截', edit('keys/id_ed25519'), BLOCK)
expect('写 *.p12 拦截', edit('store.p12'), BLOCK)
expect('写 *.keystore 拦截', edit('app.keystore'), BLOCK)
expect('写 .github/workflows/ci.yml 拦截(CI 门禁)', edit('.github/workflows/ci.yml'), BLOCK)
expect('写 .gitlab-ci.yml 拦截(CI 门禁)', edit('.gitlab-ci.yml'), BLOCK)
expect('写 prisma/schema.prisma 拦截(无 ack)', edit('prisma/schema.prisma'), BLOCK)

// ── guard-high-risk-edit：ack 精确路径匹配防护 ─────────────────────────
// 旧逻辑 filePath.endsWith(ack.file) 的碰撞：为 `business-rules-registry.md` 生成的
// ack 会误放行 `docs/business-rules-registry.md`。改精确 rel 匹配后必须仍拦。
{
  const ackCwd = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-ack-'))
  // 同时验证「正例」：ack 与编辑文件 rel 精确一致 → 放行。
  writeAck(ackCwd, 'docs/business-rules-registry.md')
  expect('ack 精确匹配 → 放行', edit('docs/business-rules-registry.md', ackCwd), ALLOW)
  // 「反例」：ack 是另一个 rel（尾部相同），endsWith 会误放行，精确匹配必须拦。
  const ackCwd2 = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-ack-'))
  writeAck(ackCwd2, 'business-rules-registry.md')
  expect(
    'ack 尾部碰撞 → 仍拦截(精确匹配，无误放行)',
    edit('docs/business-rules-registry.md', ackCwd2),
    BLOCK,
  )
}

// ── guard-high-risk-edit：该放的（exit 0）─────────────────────────────
expect('写普通源码文件放行', edit('src/index.js'), ALLOW)
expect('写普通 .md 放行', edit('README.md'), ALLOW)
// C 档（i18n）注入提醒但不阻断 → exit 0
expect('写 i18n locale 放行(仅提醒)', edit('src/locales/en.json'), ALLOW)

// ── 汇总 ───────────────────────────────────────────────────────────────
let failed = 0
for (const [name, actual, want] of cases) {
  const ok = actual === want
  if (!ok) failed++
  const tag = ok ? 'PASS' : 'FAIL'
  const detail = ok ? '' : `  (期望 exit=${want}, 实际 exit=${actual})`
  process.stdout.write(`[${tag}] ${name}${detail}\n`)
}

process.stdout.write(`\n${cases.length - failed}/${cases.length} 通过\n`)
process.exit(failed === 0 ? 0 : 1)
