#!/usr/bin/env node
/**
 * founder-saas-kit 一键接入 / 升级 —— 把 kit 的「可执行件」装进你的目标项目，并能安全地拉后续更新。
 *
 *   node engineering/install.mjs --target <你的项目目录> [--tool claude|codex|cursor] [--dry-run] [--force]
 *   node engineering/install.mjs --target <你的项目目录> --update     # 拉 kit 的新版，安全合并
 *   npm run install:claude -- --target ../my-app                       # 等价快捷方式
 *
 * 装什么（以 --tool claude 为例）：
 *   - 两个 PreToolUse 守卫        → <target>/.claude/hooks/
 *   - 三个只读 reviewer subagent   → <target>/.claude/agents/
 *   - settings.example.json        → <target>/.claude/settings.json（seed-once：已存在则跳过，除非 --force）
 *   - lifecycle/ 下的 SKILL.md（按 frontmatter name 落位）→ <target>/.claude/skills/<name>/SKILL.md
 *     ⚠️ 只扫 lifecycle/（competitive-analysis / requirement-discovery / prd-author / prd-review /
 *        ui-baseline-check / architecture-review / experience-capture 这 7 个）。
 *        governance-skills/ 的 S1-S11 是「方法论参考文档」（非 SKILL.md 形式），install 不落位，
 *        需手动转成 SKILL.md——见 governance-skills/README 的三端转换表。
 *   - 一个 AGENTS.md 跨工具入口     → <target>/AGENTS.md（seed-once）
 *
 * ── 升级（--update）怎么做到「不覆盖你的改动」──────────────────────────────────
 * 首次安装会在 <target>/<cfgdir>/.fsk-manifest.json 记下每个「受管文件」装进去那一刻的内容 hash。
 * 跑 --update 时，对每个受管文件三态判断：
 *   • 目标没有            → 直接装（kit 新增的文件）              [＋新增]
 *   • 你没动过（hash==清单）→ 用 kit 新版覆盖，并更新清单           [↑更新]
 *   • 你改过（hash≠清单）  → 绝不覆盖；把 kit 新版写成同名 .new 让你自己 diff 合并  [⚠ 你改过]
 * seed-once 文件（settings / AGENTS）升级时一律不动——它们装一次后归你所有。
 *
 * 其余（质量脚本 / package.json scripts / CI 模板 / 两本 registry）因为要并进你已有的
 * 配置、按栈裁剪，install 只「打印接入清单」让你手动接，不擅自覆盖你的项目文件。
 *
 * 零依赖，纯 Node（fs + crypto）。--dry-run 只打印不写入。
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve } from 'node:path';
import { createHash } from 'node:crypto';

const KIT = dirname(dirname(fileURLToPath(import.meta.url))); // engineering/.. = kit 根
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };

if (has('--help') || has('-h') || !val('--target')) {
  console.log(`用法: node engineering/install.mjs --target <你的项目目录> [--tool claude|codex|cursor] [--update] [--dry-run] [--force]
  --target   必填，要接入的目标项目根目录
  --tool     claude(默认) | codex | cursor —— 决定配置目录与 skill 落位
  --update   拉 kit 新版：没动过的文件升级、你改过的写成 .new 不覆盖（首次请用普通安装）
  --dry-run  只打印将要做什么，不写任何文件
  --force    覆盖目标已存在的 settings/AGENTS（仅普通安装；默认跳过不覆盖）`);
  // 显式 --help/-h = 正常帮助请求 → exit 0；仅因缺 --target 触发 = 用法错误 → exit 1。
  process.exit(has('--help') || has('-h') ? 0 : 1);
}

const TARGET = resolve(val('--target'));
const TOOL = (val('--tool') || 'claude').toLowerCase();
const DRY = has('--dry-run');
const FORCE = has('--force');
const UPDATE = has('--update');
const CFG = { claude: '.claude', codex: '.codex', cursor: '.cursor' }[TOOL];
if (!CFG) { console.error(`未知 --tool: ${TOOL}（支持 claude/codex/cursor）`); process.exit(1); }
if (!existsSync(TARGET) || !statSync(TARGET).isDirectory()) { console.error(`目标目录不存在: ${TARGET}`); process.exit(1); }

const C = { dim: '\x1b[2m', grn: '\x1b[32m', ylw: '\x1b[33m', cyn: '\x1b[36m', red: '\x1b[31m', bold: '\x1b[1m', off: '\x1b[0m' };
const c = (k, s) => `${C[k]}${s}${C.off}`;
const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const MANIFEST = join(TARGET, CFG, '.fsk-manifest.json');

function ensureDir(d) { if (!DRY) mkdirSync(d, { recursive: true }); }
function listFiles(dir, filter) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile() && filter(e.name)).map((e) => join(dir, e.name));
}
function findSkills(dir, out = []) {
  if (!existsSync(dir)) return out;
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
function kitVersion() {
  try { return JSON.parse(readFileSync(join(KIT, 'package.json'), 'utf8')).version || '0.0.0'; } catch { return '0.0.0'; }
}

// ── 建「受管文件」计划（这些文件跟随 kit 升级）+ 「seed-once」计划（装一次后归你）──
const managed = []; // { src, dest }
const skills = findSkills(join(KIT, 'lifecycle'));
const skippedSkills = [];
for (const s of skills) {
  const name = skillName(s);
  if (!name) { skippedSkills.push(relative(KIT, s)); continue; }
  managed.push({ src: s, dest: join(TARGET, CFG, 'skills', name, 'SKILL.md') });
}
if (TOOL === 'claude') {
  for (const f of listFiles(join(KIT, 'engineering/enforcement/hooks'), (n) => n.endsWith('.cjs') && !n.endsWith('.test.cjs')))
    managed.push({ src: f, dest: join(TARGET, CFG, 'hooks', f.split('/').pop()) });
  for (const f of listFiles(join(KIT, 'engineering/enforcement/subagents'), (n) => n.endsWith('.md')))
    managed.push({ src: f, dest: join(TARGET, CFG, 'agents', f.split('/').pop()) });
}
const seed = [];
if (TOOL === 'claude') seed.push({ src: join(KIT, 'engineering/enforcement/settings.example.json'), dest: join(TARGET, CFG, 'settings.json') });
const agentsSrc = join(KIT, 'AGENTS.md');
if (existsSync(agentsSrc)) seed.push({ src: agentsSrc, dest: join(TARGET, 'AGENTS.md') });

const relT = (p) => relative(TARGET, p).split('\\').join('/');
function loadManifest() { try { return JSON.parse(readFileSync(MANIFEST, 'utf8')); } catch { return null; } }
function writeManifest(files) {
  if (DRY) return;
  ensureDir(dirname(MANIFEST));
  writeFileSync(MANIFEST, JSON.stringify({ kit: 'founder-saas-kit', kitVersion: kitVersion(), tool: TOOL, files }, null, 2) + '\n');
}

console.log('');
console.log(c('bold', `founder-saas-kit → ${TOOL}` + (UPDATE ? '  (update)' : '')) + c('dim', `   目标: ${TARGET}${DRY ? '   (dry-run)' : ''}`));
console.log('');

if (UPDATE) runUpdate(); else runInstall();

// ════════════════════════════════════════════════════════════════════════════
function runInstall() {
  let written = 0, skipped = 0;
  const manifestFiles = {};

  console.log(c('bold', `① skills → ${CFG}/skills/<name>/SKILL.md`));
  for (const { src, dest } of managed.filter((m) => m.dest.includes(`${CFG}/skills/`) || m.dest.includes(`${CFG}\\skills\\`))) {
    if (!DRY) { ensureDir(dirname(dest)); writeFileSync(dest, readFileSync(src)); }
    manifestFiles[relT(dest)] = sha(readFileSync(src));
    console.log(`   ${c('grn', DRY ? '将装' : '装上')} ${relT(dest)}`); written++;
  }
  console.log(c('dim', `   共 ${managed.filter((m) => m.dest.includes('skills')).length} 个可触发 skill。S1-S11 治理 skill 是方法论参考文档（非 SKILL.md），见 kit governance-skills/。`));
  for (const s of skippedSkills) console.log(`   ${c('ylw', '跳过')} ${s} ${c('dim', '(frontmatter 无合法 name)')}`);

  if (TOOL === 'claude') {
    console.log('\n' + c('bold', `② 守卫 hooks → ${CFG}/hooks/`));
    for (const { src, dest } of managed.filter((m) => m.dest.includes('hooks'))) {
      if (!DRY) { ensureDir(dirname(dest)); writeFileSync(dest, readFileSync(src)); }
      manifestFiles[relT(dest)] = sha(readFileSync(src));
      console.log(`   ${c('grn', DRY ? '将装' : '装上')} ${relT(dest)}`); written++;
    }
    console.log('\n' + c('bold', `③ 只读 reviewer subagents → ${CFG}/agents/`));
    for (const { src, dest } of managed.filter((m) => m.dest.includes('agents'))) {
      if (!DRY) { ensureDir(dirname(dest)); writeFileSync(dest, readFileSync(src)); }
      manifestFiles[relT(dest)] = sha(readFileSync(src));
      console.log(`   ${c('grn', DRY ? '将装' : '装上')} ${relT(dest)}`); written++;
    }
  } else {
    console.log('\n' + c('ylw', `② 守卫 hooks / reviewer subagents 是 Claude Code 专属机制，${TOOL} 不直接支持。`));
    console.log(c('dim', `   ${TOOL} 的等价落地见 governance-skills/README 的「三端转换表」。`));
  }

  console.log('\n' + c('bold', `④ seed-once（装一次后归你，--update 不动；--force 可覆盖）`));
  for (const { src, dest } of seed) {
    const rel = relT(dest);
    if (existsSync(dest) && !FORCE) { console.log(`   ${c('ylw', '跳过')} ${rel} ${c('dim', '(已存在，--force 可覆盖)')}`); skipped++; continue; }
    if (!DRY) { ensureDir(dirname(dest)); writeFileSync(dest, readFileSync(src)); }
    console.log(`   ${c('grn', DRY ? '将装' : '装上')} ${rel}`); written++;
  }

  console.log('\n' + c('bold', '⑤ 还需你手动接（避免覆盖你的项目文件）:'));
  console.log(c('dim', `   - 质量脚本: cp engineering/quality-scripts/check-*.cjs check-*.js *.mjs 到你的 scripts/`));
  console.log(c('dim', `   - npm scripts: 把 kit package.json 的 "scripts" 段并进你的 package.json`));
  console.log(c('dim', `   - CI: cp .github/ci.example.yml → .github/workflows/ci.yml（按栈删减 step）`));
  console.log(c('dim', `   - 两本活账本: cp engineering/registries/*.template.md → 你的 docs/`));
  console.log(c('dim', `   - 项目宪法: 把 .claude/CLAUDE.md 模板填好（<PROJECT_NAME> 等占位符）`));

  writeManifest(manifestFiles);
  console.log('');
  console.log(`${c('grn', '✓')} ${DRY ? '将装' : '已装'} ${written} 项${skipped ? `，跳过 ${skipped} 项` : ''}。` +
    `${DRY ? ' 去掉 --dry-run 真正写入。' : ` 清单写入 ${relT(MANIFEST)}，以后 \`--update\` 安全升级。`}`);
  console.log('');
}

// ════════════════════════════════════════════════════════════════════════════
function runUpdate() {
  const manifest = loadManifest();
  if (!manifest) {
    console.error(c('red', `✗ 没找到清单 ${relT(MANIFEST)}。`) + ` --update 需要先用普通安装跑过一次（它会写清单）。`);
    console.error(c('dim', `   首次安装: node engineering/install.mjs --target ${TARGET} --tool ${TOOL}`));
    process.exit(1);
  }
  const prev = manifest.files || {};
  const nextManifest = {};
  let added = 0, updated = 0, conflict = 0, unchanged = 0;
  const conflicts = [];

  console.log(c('bold', `升级受管文件（清单版本 ${manifest.kitVersion || '?'} → kit ${kitVersion()}）`));
  for (const { src, dest } of managed) {
    const rel = relT(dest);
    const kitBuf = readFileSync(src);
    const kitHash = sha(kitBuf);
    const prevHash = prev[rel];

    if (!existsSync(dest)) {
      if (!DRY) { ensureDir(dirname(dest)); writeFileSync(dest, kitBuf); }
      nextManifest[rel] = kitHash;
      console.log(`   ${c('grn', '＋新增')} ${rel}`); added++;
      continue;
    }
    const curHash = sha(readFileSync(dest));
    if (curHash === kitHash) { nextManifest[rel] = kitHash; unchanged++; continue; }     // 已是最新
    if (prevHash && curHash === prevHash) {                                              // 你没动过 → 安全升级
      if (!DRY) writeFileSync(dest, kitBuf);
      nextManifest[rel] = kitHash;
      console.log(`   ${c('cyn', '↑更新')} ${rel}`); updated++;
    } else {                                                                            // 你改过 → 绝不覆盖
      if (!DRY) writeFileSync(dest + '.new', kitBuf);
      nextManifest[rel] = prevHash || curHash; // 清单保持「上次装的版本」，别声称已升级
      conflicts.push(rel);
      console.log(`   ${c('ylw', '⚠ 你改过')} ${rel} ${c('dim', `→ kit 新版写在 ${rel}.new，请自行 diff 合并`)}`); conflict++;
    }
  }

  // 清单里有、但 kit 已不再提供的「孤儿」——只提示不删（可能你还在用）。
  const orphans = Object.keys(prev).filter((r) => !managed.some((m) => relT(m.dest) === r));
  if (orphans.length) {
    console.log('\n' + c('bold', 'kit 已不再提供（孤儿，未删，按需自行清理）:'));
    for (const o of orphans) { console.log(`   ${c('dim', '·')} ${o}`); nextManifest[o] = prev[o]; }
  }

  if (seed.length) {
    console.log('\n' + c('dim', `seed-once（settings / AGENTS）升级不动；要重置加 --force 跑普通安装。`));
  }

  writeManifest(nextManifest);
  console.log('');
  console.log(`${c('grn', '✓')} 升级完成：` +
    `${c('grn', added + ' 新增')} · ${c('cyn', updated + ' 更新')} · ${c('ylw', conflict + ' 待合并')} · ${unchanged} 未变。` +
    `${DRY ? ' (dry-run，未写入)' : ''}`);
  if (conflicts.length) console.log(c('ylw', `   有 ${conflicts.length} 个你改过的文件没被覆盖，kit 新版在对应 .new，自行合并后删掉 .new。`));
  console.log('');
}
