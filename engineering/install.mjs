#!/usr/bin/env node
/**
 * founder-saas-kit 一键接入 —— 把 kit 的「可执行件」装进你的目标项目。
 *
 *   node engineering/install.mjs --target <你的项目目录> [--tool claude|codex|cursor] [--dry-run] [--force]
 *   npm run install:claude -- --target ../my-app          # 等价快捷方式
 *
 * 装什么（以 --tool claude 为例）：
 *   - 两个 PreToolUse 守卫        → <target>/.claude/hooks/
 *   - 三个只读 reviewer subagent   → <target>/.claude/agents/
 *   - settings.example.json        → <target>/.claude/settings.json（已存在则跳过，除非 --force）
 *   - lifecycle/ 下的 SKILL.md（按 frontmatter name 落位）→ <target>/.claude/skills/<name>/SKILL.md
 *     ⚠️ 只扫 lifecycle/（competitive-analysis / requirement-discovery / prd-author / prd-review /
 *        ui-baseline-check / architecture-review / experience-capture 这 7 个）。
 *        governance-skills/ 的 S1-S11 是「方法论参考文档」（非 SKILL.md 形式），install 不落位，
 *        需手动转成 SKILL.md——见 governance-skills/README 的三端转换表。
 *   - 一个 AGENTS.md 跨工具入口     → <target>/AGENTS.md（已存在则跳过）
 *
 * 其余（质量脚本 / package.json scripts / CI 模板 / 两本 registry）因为要并进你已有的
 * 配置、按栈裁剪，install 只「打印接入清单」让你手动接，不擅自覆盖你的项目文件。
 *
 * 零依赖，纯 Node。--dry-run 只打印不写入。
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve } from 'node:path';

const KIT = dirname(dirname(fileURLToPath(import.meta.url))); // engineering/.. = kit 根
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };

if (has('--help') || has('-h') || !val('--target')) {
  console.log(`用法: node engineering/install.mjs --target <你的项目目录> [--tool claude|codex|cursor] [--dry-run] [--force]
  --target   必填，要接入的目标项目根目录
  --tool     claude(默认) | codex | cursor —— 决定配置目录与 skill 落位
  --dry-run  只打印将要做什么，不写任何文件
  --force    覆盖目标已存在的 settings/AGENTS（默认跳过不覆盖）`);
  process.exit(val('--target') ? 0 : 1);
}

const TARGET = resolve(val('--target'));
const TOOL = (val('--tool') || 'claude').toLowerCase();
const DRY = has('--dry-run');
const FORCE = has('--force');
const CFG = { claude: '.claude', codex: '.codex', cursor: '.cursor' }[TOOL];
if (!CFG) { console.error(`未知 --tool: ${TOOL}（支持 claude/codex/cursor）`); process.exit(1); }
if (!existsSync(TARGET) || !statSync(TARGET).isDirectory()) { console.error(`目标目录不存在: ${TARGET}`); process.exit(1); }

const C = { dim: '\x1b[2m', grn: '\x1b[32m', ylw: '\x1b[33m', cyn: '\x1b[36m', bold: '\x1b[1m', off: '\x1b[0m' };
const c = (k, s) => `${C[k]}${s}${C.off}`;
let written = 0, skipped = 0;

function ensureDir(d) { if (!DRY) mkdirSync(d, { recursive: true }); }
function copy(src, dest, { overwrite = true } = {}) {
  const rel = relative(TARGET, dest);
  if (existsSync(dest) && !overwrite && !FORCE) { console.log(`   ${c('ylw', '跳过')} ${rel} ${c('dim', '(已存在，--force 可覆盖)')}`); skipped++; return; }
  ensureDir(dirname(dest));
  if (!DRY) writeFileSync(dest, readFileSync(src));
  console.log(`   ${c('grn', DRY ? '将装' : '装上')} ${rel}`); written++;
}
function listFiles(dir, filter) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile() && filter(e.name)).map((e) => join(dir, e.name));
}
// 递归找所有 SKILL.md
function findSkills(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) findSkills(full, out);
    else if (e.name === 'SKILL.md') out.push(full);
  }
  return out;
}
function skillName(file) {
  const m = readFileSync(file, 'utf8').match(/^---[\s\S]*?\bname:\s*["']?([a-z0-9][a-z0-9-]*)["']?/m);
  return m ? m[1] : null;
}

console.log('');
console.log(c('bold', `founder-saas-kit → ${TOOL}`) + c('dim', `   目标: ${TARGET}${DRY ? '   (dry-run)' : ''}`));
console.log('');

// 1) skills（三端都装，落位不同）
console.log(c('bold', `① skills → ${CFG}/skills/<name>/SKILL.md`));
const skills = findSkills(join(KIT, 'lifecycle'));
let okSkills = 0;
for (const s of skills) {
  const name = skillName(s);
  if (!name) { console.log(`   ${c('ylw', '跳过')} ${relative(KIT, s)} ${c('dim', '(frontmatter 无合法 name)')}`); continue; }
  copy(s, join(TARGET, CFG, 'skills', name, 'SKILL.md'));
  okSkills++;
}
console.log(c('dim', `   共 ${okSkills} 个可触发 skill。S1-S11 治理 skill 是方法论参考文档（非 SKILL.md 形式），见 kit governance-skills/。`));

// 2) hooks + subagents + settings（Claude Code 专属机制）
if (TOOL === 'claude') {
  console.log('');
  console.log(c('bold', `② 守卫 hooks → ${CFG}/hooks/`));
  for (const f of listFiles(join(KIT, 'engineering/enforcement/hooks'), (n) => n.endsWith('.cjs') && !n.endsWith('.test.cjs'))) copy(f, join(TARGET, CFG, 'hooks', f.split('/').pop()));
  console.log('');
  console.log(c('bold', `③ 只读 reviewer subagents → ${CFG}/agents/`));
  for (const f of listFiles(join(KIT, 'engineering/enforcement/subagents'), (n) => n.endsWith('.md'))) copy(f, join(TARGET, CFG, 'agents', f.split('/').pop()));
  console.log('');
  console.log(c('bold', `④ settings → ${CFG}/settings.json`));
  copy(join(KIT, 'engineering/enforcement/settings.example.json'), join(TARGET, CFG, 'settings.json'), { overwrite: false });
} else {
  console.log('');
  console.log(c('ylw', `② 守卫 hooks / reviewer subagents 是 Claude Code 专属机制，${TOOL} 不直接支持。`));
  console.log(c('dim', `   ${TOOL} 的等价落地见 governance-skills/README 的「三端转换表」（如 Cursor 用 .cursor/rules 的 alwaysApply）。`));
}

// 3) AGENTS.md 跨工具入口
console.log('');
console.log(c('bold', `⑤ 跨工具入口 → AGENTS.md`));
const agentsSrc = join(KIT, 'AGENTS.md');
if (existsSync(agentsSrc)) copy(agentsSrc, join(TARGET, 'AGENTS.md'), { overwrite: false });
else console.log(c('dim', '   kit 根无 AGENTS.md，跳过。'));

// 4) 手动接入清单
console.log('');
console.log(c('bold', '⑥ 还需你手动接（避免覆盖你的项目文件）:'));
console.log(c('dim', `   - 质量脚本: cp engineering/quality-scripts/check-*.cjs check-*.js *.mjs 到你的 scripts/`));
console.log(c('dim', `   - npm scripts: 把 kit package.json 的 "scripts" 段并进你的 package.json`));
console.log(c('dim', `   - CI: cp .github/workflows/ci.example.yml → .github/workflows/ci.yml（按栈删减 step）`));
console.log(c('dim', `   - 两本活账本: cp engineering/registries/*.template.md → 你的 docs/`));
console.log(c('dim', `   - 项目宪法: 把 .claude/CLAUDE.md 模板填好（<PROJECT_NAME> 等占位符）`));

console.log('');
console.log(`${c('grn', '✓')} ${DRY ? '将装' : '已装'} ${written} 项${skipped ? `，跳过 ${skipped} 项（已存在）` : ''}。${DRY ? ' 去掉 --dry-run 真正写入。' : ''}`);
console.log('');
