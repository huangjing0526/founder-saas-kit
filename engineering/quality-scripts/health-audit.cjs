#!/usr/bin/env node
/**
 * 代码库健康度审计 —— 聚合现有 lint + 几个「粗筛」维度，输出月度趋势报告。
 *
 * 这套审计的框架（三件套，是它的精华，请保留）：
 *   1. 红线 lint（HARD）：必须 0 违规。任一挂掉 → 整个审计 exit 1。这是「不该发布」的硬门禁。
 *   2. 粗筛维度（SOFT / warn-only）：只计数、不阻断。重点不是当下数字，而是「环比上月在变好还是变坏」。
 *   3. 给非技术老板的大白话报告：把上面两部分翻成业务语言（"客户切语言会卡住" 而不是 "i18n key 缺口"），
 *      写成 markdown 落盘，按日期归档，方便每月对比趋势。
 *
 * 用途：每月 1 号跑一次（可挂 CI 定时任务）。
 * 跑法：node quality-scripts/health-audit.cjs
 * 输出：docs/audit/health-YYYY-MM-DD.md（追加到目录，便于环比）
 *
 * 退出码：仅当任一红线 lint 失败时退 1；粗筛维度只警告不阻塞。
 *
 * 零依赖：纯 fs + child_process（调 npm run <lint>），无任何 npm 包。
 *
 * ⚠️ locale 结构假设：本文件的 checkI18nParity() 假设 `locales/<lang>/*.json`（每语言一个目录）。
 *    若你的项目是「每语言一个大 json」（`locales/<lang>.json`），把该函数里读目录的逻辑改成
 *    直接读单文件 flatten 即可——和 check-i18n-parity.cjs 的 loadLocale 要改的是同一处假设，两处都要改。
 *
 * ⚠️ 接入指南：
 *   - 「一、红线 lint」的 hardLints 数组 → 换成你项目真正的红线级 npm script。
 *   - 「二、粗筛」的各维度（countXxx 函数）是占位示例，按你项目关心的劣化方向替换
 *     （比如：单文件超长、TODO/FIXME 累积、any 类型蔓延、循环依赖、测试覆盖盲区…）。
 *   - 报告分发：这里只落盘 markdown。要推到「告警通道」（IM 群机器人 / 邮件 / Slack）的话，
 *     在文件末尾把 reportLines 拼好的内容 POST 出去即可——抽象成一个 notify(report) 钩子。
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 根/目标：优先命令行传入路径，否则用当前工作目录（npm 运行处 = 项目根）。
// 不要用 __dirname 推根——模板放置层级因项目而异。
const ROOT = path.resolve(process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : process.cwd());
const TODAY = new Date().toISOString().slice(0, 10);
// ⚠️ 按项目可配置：报告落盘目录。相对 cwd（项目根），目录不存在会自动创建。
const REPORT_PATH = path.join(ROOT, 'docs/audit', `health-${TODAY}.md`);

const sections = [];
let hardFailures = 0;

function runLint(name, cmd) {
  try {
    const out = execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { name, status: 'pass', detail: tail(out, 5) };
  } catch (err) {
    hardFailures += 1;
    const out = (err.stdout || '') + (err.stderr || '');
    // 只摘一行错误摘要——不要把子脚本的原始 stack trace 整段塞进报告（噪音大、对老板没意义）。
    return { name, status: 'fail', detail: errorSummary(out, err) };
  }
}

function tail(text, lines) {
  return text.trim().split('\n').slice(-lines).join('\n');
}

// 从子脚本输出里摘一行有意义的错误摘要：优先脚本自己打印的 ❌/✗ 结论行，
// 否则退回最后一行非空输出；都没有就给个兜底（含进程退出码）。
function errorSummary(out, err) {
  const lines = out.split('\n').map((l) => l.trim()).filter(Boolean);
  const verdict = [...lines].reverse().find((l) => /[❌✗]|退出码|exit/i.test(l));
  if (verdict) return verdict;
  if (lines.length) return lines[lines.length - 1];
  return `子脚本失败（exit ${err.status ?? '?'}）`;
}

function walk(dir, exts, ignore = new Set()) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignore.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, exts, ignore));
    else if (exts.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

function countLeafKeys(obj) {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return 1;
  return Object.values(obj).reduce((sum, v) => sum + countLeafKeys(v), 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// 粗筛维度（SOFT）—— 下面是两个「通用占位示例」。
// 重点不是这两个具体维度，而是「函数返回结构化计数 → 进趋势报告 → 看环比方向」这个套路。
// 按你项目关心的劣化方向，照葫芦画瓢加/换维度即可。
// ─────────────────────────────────────────────────────────────────────────────

// 示例维度 A：源码里 TODO / FIXME 累积量（技术债欠条，越涨越要警惕）
function countTechDebtMarkers() {
  const srcDirs = ['src', 'server']; // 按你项目改
  const re = /\b(TODO|FIXME|HACK|XXX)\b/;
  let hits = 0;
  const byFile = new Map();
  for (const dir of srcDirs) {
    const files = walk(path.join(ROOT, dir), new Set(['.js', '.ts', '.vue', '.cjs', '.mjs']), new Set(['node_modules', 'dist']));
    for (const f of files) {
      const lines = fs.readFileSync(f, 'utf8').split('\n');
      let n = 0;
      for (const line of lines) if (re.test(line)) n += 1;
      if (n > 0) { hits += n; byFile.set(f, n); }
    }
  }
  const top = [...byFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  return { hits, top };
}

// 示例维度 B：i18n 多 locale key 缺口（多语言项目常见劣化方向）。
// 目录结构假设 src/i18n/locales/<locale>/*.json，按你项目改。
function checkI18nParity() {
  const baseDir = path.join(ROOT, 'src/i18n/locales');
  if (!fs.existsSync(baseDir)) return { available: false };
  const langs = fs.readdirSync(baseDir).filter(d => fs.statSync(path.join(baseDir, d)).isDirectory());
  if (langs.length < 2) return { available: false };
  const keysByLang = {};
  for (const lang of langs) {
    const files = walk(path.join(baseDir, lang), new Set(['.json']));
    let count = 0;
    for (const f of files) {
      try { count += countLeafKeys(JSON.parse(fs.readFileSync(f, 'utf8'))); } catch {}
    }
    keysByLang[lang] = count;
  }
  const max = Math.max(...Object.values(keysByLang));
  const gaps = Object.fromEntries(Object.entries(keysByLang).map(([lang, n]) => [lang, max - n]));
  return { available: true, langs: keysByLang, gaps, max };
}

// ─────────────────────────────────────────────────────────────────────────────
// 一、红线 lint（HARD，必须 0）
// ─────────────────────────────────────────────────────────────────────────────
console.log(`# 代码库健康度审计 — ${TODAY}\n`);
console.log('## 一、红线 lint（必须 0 违规）\n');

// ⚠️ 按项目可配置：换成你真正的红线级检查。--silent 让输出干净。
const hardLints = [
  ['schema 长文本字段（缺 @db.Text）', 'npm run lint:schema --silent'],
  ['docs 内部断链（可重指向必修）', 'npm run lint:docs-links --silent'],
  ['i18n key 一致性', 'npm run lint:i18n-parity --silent'],
];
for (const [name, cmd] of hardLints) {
  const r = runLint(name, cmd);
  const icon = r.status === 'pass' ? '✅' : '❌';
  sections.push({ kind: 'hard', name, status: r.status, detail: r.detail });
  console.log(`${icon} ${name}`);
  if (r.status === 'fail') console.log('```\n' + r.detail + '\n```');
}

// ─────────────────────────────────────────────────────────────────────────────
// 二、粗筛（SOFT，看趋势，不阻塞）
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n## 二、粗筛（看趋势，不阻塞）\n');

console.log('### 2.1 技术债标记（TODO/FIXME/HACK）');
const debt = countTechDebtMarkers();
console.log(`- 累积：${debt.hits} 处`);
if (debt.top.length) {
  console.log('- Top 10 集中文件：');
  debt.top.forEach(([f, n]) => console.log(`  - ${path.relative(ROOT, f)}：${n} 处`));
}
sections.push({ kind: 'soft', name: 'tech-debt', data: debt });

console.log('\n### 2.2 i18n 多语言 key 缺口');
const parity = checkI18nParity();
if (parity.available) {
  Object.entries(parity.langs).forEach(([lang, n]) => {
    console.log(`- ${lang}：${n} keys（缺 ${parity.gaps[lang]} 条）`);
  });
} else {
  console.log('- 跳过（语言目录 < 2 或不存在）');
}
sections.push({ kind: 'soft', name: 'i18n-parity', data: parity });

// ─────────────────────────────────────────────────────────────────────────────
// 三、拼装落盘报告（markdown）
// ─────────────────────────────────────────────────────────────────────────────
const reportLines = [
  `# 代码库健康度审计 — ${TODAY}`,
  '',
  '> 自动生成。红线必须 0 违规，粗筛看月度趋势。',
  '',
  '## 一、红线 lint',
  '',
  '| 检查 | 状态 |',
  '|---|---|',
];
for (const s of sections.filter(s => s.kind === 'hard')) {
  reportLines.push(`| ${s.name} | ${s.status === 'pass' ? '✅ 通过' : '❌ 失败'} |`);
}
for (const s of sections.filter(s => s.kind === 'hard' && s.status === 'fail')) {
  reportLines.push('', `### ${s.name} 失败详情`, '```', s.detail, '```');
}

reportLines.push(
  '',
  '## 二、粗筛趋势',
  '',
  '### 2.1 技术债标记（TODO/FIXME/HACK）',
  `- 累积：**${debt.hits}** 处`,
);
if (debt.top.length) {
  reportLines.push('', '<details><summary>Top 10 集中文件</summary>', '');
  debt.top.forEach(([f, n]) => reportLines.push(`- \`${path.relative(ROOT, f)}\`：${n} 处`));
  reportLines.push('</details>');
}

reportLines.push('', '### 2.2 i18n 多语言 key 缺口');
if (parity.available) {
  reportLines.push('| 语言 | key 数 | 缺口 |', '|---|---|---|');
  Object.entries(parity.langs).forEach(([lang, n]) => {
    reportLines.push(`| ${lang} | ${n} | ${parity.gaps[lang]} |`);
  });
} else {
  reportLines.push('（不可用）');
}

// 三、大白话总结：把技术指标翻成业务老板看得懂的一句话。
reportLines.push(
  '',
  '## 三、给老板的大白话总结',
  '',
  hardFailures > 0
    ? `❌ **红线挂了 ${hardFailures} 项**——必须本周修，详见上面"一"。`
    : '✅ 红线全过',
  '',
  debt.hits > 50
    ? `⚠️ 代码里有 ${debt.hits} 处 "回头再说"（TODO/FIXME）的欠条——比上月涨没涨？涨太快说明在借技术债。`
    : `ℹ️ 技术债标记 ${debt.hits} 处，量还可控。`,
  '',
  parity.available && Object.values(parity.gaps).some(g => g > 0)
    ? `⚠️ 多语言缺口：${Object.entries(parity.gaps).filter(([, g]) => g > 0).map(([l, g]) => `${l} 缺 ${g}`).join('，')}——客户切到这些语言时，缺的部分会"卡住不变 / 显示成别的语言"。`
    : '✅ 多语言 key 对齐',
);

reportLines.push('', '---', '', `_本报告由 \`quality-scripts/health-audit.cjs\` 生成。环比上月看同目录 \`health-*.md\`。_`);

fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
fs.writeFileSync(REPORT_PATH, reportLines.join('\n'));

// ── 告警通道钩子（可选）：要把报告推到 IM 群 / 邮件 / Slack，在这里 POST 即可。
// notify(reportLines.join('\n'));

console.log(`\n📋 报告已写入：${path.relative(ROOT, REPORT_PATH)}`);
if (hardFailures > 0) {
  console.log(`\n❌ 红线失败 ${hardFailures} 项，退出码 1`);
  process.exit(1);
}
console.log('\n✅ 红线全过，粗筛趋势看报告');
