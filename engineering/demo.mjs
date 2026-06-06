#!/usr/bin/env node
/**
 * founder-saas-kit 一条命令看它干活 —— `npm run demo`
 *
 * 不是空谈"有护城河"，而是当场演示：
 *   1) AI 想跑 `rm -rf /` → 守卫拦下
 *   2) 一条普通命令 → 守卫放行
 *   3) 想改 .env / 私钥 → 守卫拦下
 *   4) 一个密钥溜进代码 → 扫描器抓出来并打码
 *   5) 守卫回归自测 42/42
 *
 * 全程安全：危险命令只是「以 JSON 喂给守卫看它拦不拦」，从不真的执行。
 * 临时文件写在系统临时目录、用完即删（非递归）。零依赖，纯 Node。
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const BASH_GUARD = join(HERE, 'enforcement/hooks/guard-dangerous-bash.cjs');
const EDIT_GUARD = join(HERE, 'enforcement/hooks/guard-high-risk-edit.cjs');
const SECRETS = join(HERE, 'quality-scripts/check-secrets.cjs');
const GUARD_TEST = join(HERE, 'enforcement/hooks/guard.test.cjs');

const C = { dim: '\x1b[2m', red: '\x1b[31m', grn: '\x1b[32m', ylw: '\x1b[33m', cyn: '\x1b[36m', bold: '\x1b[1m', off: '\x1b[0m' };
const c = (k, s) => `${C[k]}${s}${C.off}`;
const line = () => console.log(c('dim', '─'.repeat(64)));
const node = process.execPath;

// 把一条命令以 PreToolUse hook 的 JSON 格式喂给守卫，返回 exit code（2=拦 / 0=放）。从不真执行。
function feedBash(command) {
  return spawnSync(node, [BASH_GUARD], { input: JSON.stringify({ tool_input: { command } }), encoding: 'utf8' });
}
function feedEdit(filePath) {
  return spawnSync(node, [EDIT_GUARD], { input: JSON.stringify({ tool_input: { file_path: filePath } }), encoding: 'utf8' });
}
function blockMsg(res) {
  return (res.stderr || res.stdout || '').split('\n').find((l) => l.trim()) || '(已拦截)';
}

console.log('');
console.log(c('bold', '  founder-saas-kit · 一条命令看护城河干活'));
console.log(c('dim', '  危险命令只喂给守卫看它拦不拦，绝不真的执行。'));
console.log('');

// ── 1) 危险命令被拦 ─────────────────────────────────────────────
line();
console.log(c('bold', ' ① AI 想跑危险命令 → 守卫拦下'));
for (const cmd of ['rm -rf /', 'git reset --hard HEAD~5', 'npx prisma migrate reset --force']) {
  const r = feedBash(cmd);
  const blocked = r.status === 2;
  console.log(`   ${blocked ? c('red', '🛑 拦下') : c('ylw', '⚠️ 放行')}  ${c('cyn', cmd)}`);
  if (blocked) console.log(c('dim', `        ${blockMsg(r).slice(0, 58)}`));
}

// ── 2) 正常命令放行 ─────────────────────────────────────────────
console.log('');
console.log(c('bold', ' ② 正常命令 → 守卫放行（不误伤）'));
for (const cmd of ['ls -la', 'npm run build', 'git status']) {
  const r = feedBash(cmd);
  console.log(`   ${r.status === 0 ? c('grn', '✅ 放行') : c('red', '🛑 拦下')}  ${c('cyn', cmd)}`);
}

// ── 3) 改敏感文件被拦 ───────────────────────────────────────────
console.log('');
console.log(c('bold', ' ③ 想改密钥/CI 文件 → 守卫拦下'));
for (const f of ['.env', 'id_rsa', '.github/workflows/ci.yml']) {
  const r = feedEdit(f);
  console.log(`   ${r.status === 2 ? c('red', '🛑 拦下') : c('ylw', '⚠️ 放行')}  ${c('cyn', f)}`);
}
const okFile = feedEdit('src/components/Button.vue');
console.log(`   ${okFile.status === 0 ? c('grn', '✅ 放行') : c('red', '🛑')}  ${c('cyn', 'src/components/Button.vue')}  ${c('dim', '(普通文件)')}`);

// ── 4) 密钥溜进代码被抓 ─────────────────────────────────────────
console.log('');
console.log(c('bold', ' ④ 一个密钥溜进代码 → 扫描器抓出来并打码'));
const tmp = join(tmpdir(), `fsk-demo-leak-${process.pid}.txt`);
// secrets-allow: 下面是 demo 故意植入的假密钥，用来演示扫描器能抓到它（这条豁免注释本身就是 kit 的行内豁免机制）
writeFileSync(tmp, 'const awsKey = "AKIAQ7Z3K9XV2MNP4TWD";\nconst dbPass = "s3cr3t-Pa55w0rd-not-a-placeholder";\n');
const scan = spawnSync(node, [SECRETS, tmp], { encoding: 'utf8' });
try { unlinkSync(tmp); } catch { /* best-effort cleanup */ }
const hit = scan.status === 1;
console.log(`   ${hit ? c('red', '🔦 抓到') : c('ylw', '未命中')}  植入了一个假 AWS key + 一个密码`);
(scan.stdout || '').split('\n').filter((l) => /:\d+|打码|AKIA|⚠️/.test(l)).slice(0, 4).forEach((l) => console.log(c('dim', `        ${l.trim().slice(0, 58)}`)));

// ── 5) 守卫回归自测 ─────────────────────────────────────────────
console.log('');
console.log(c('bold', ' ⑤ 守卫回归自测（防止下个 AI 把洞改回来）'));
const t = spawnSync(node, [GUARD_TEST], { encoding: 'utf8' });
const pass = (t.stdout || '').split('\n').find((l) => /通过/.test(l)) || '(见 npm run test:guards)';
console.log(`   ${t.status === 0 ? c('grn', '✅ ' + pass.trim()) : c('red', '❌ 有用例失败')}`);

// ── 收尾 ────────────────────────────────────────────────────────
console.log('');
line();
console.log(c('bold', ' 这就是护城河：') + ' 守卫真的拦、扫描器真的抓、回归真的兜。');
console.log(c('dim', ' 接进你项目：见 README「怎么起一个新项目」或 `node engineering/install.mjs --help`。'));
console.log('');
