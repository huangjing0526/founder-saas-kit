#!/usr/bin/env node
/**
 * check-docs-links — docs/ 内部 .md 链接断链检查（防文档腐烂）
 *
 * 背景：一次文档治理（清理/审计/归档/整合）后常会发现大量内部链接腐烂，
 * 多由文档移动/改名造成（移走了文件但引用没跟着改）。把检查固化成脚本，让新断链当场暴露。
 *
 * 两类断链（HARD / SOFT 双严重度，见 MECHANISMS.md）：
 *   - 可重指向（fixable）：目标文件在 docs 里确实存在、只是路径写错 → 100% 真 bug，必修 → 失败退出 1
 *   - 悬空（dangling）：目标文件全 docs 都找不到（多为从未创建的计划占位 / 已废弃文档引用）→ 只告警
 *
 * 用法：
 *   node quality-scripts/check-docs-links.cjs [root]          # 有 fixable 断链则退出 1
 *   node quality-scripts/check-docs-links.cjs [root] --warn   # 永远退出 0（只报告，给 health-audit 用）
 *
 * 根目录解析：优先命令行第一个非 -- 参数（package.json 里传 `.`），否则用当前工作目录
 * （= npm 运行处 = 项目根）。不要用 __dirname 推根——本脚本是给你抄进自己项目用的模板，
 * 放置层级因项目而异，__dirname 一旦深一层就会锚错根。
 *
 * 扫描范围：root 下递归所有 .md（不再硬编码 docs/ 子目录），校验内部 .md 链接。
 * 跳过 node_modules/.git 等噪音目录、外链、代码/运行期路径、模板占位（<>、XXX、YYYY-MM-DD 等）。
 *
 * 零依赖：纯 fs + 正则，无任何 npm 包。
 */
const fs = require('fs');
const path = require('path');

// 根/目标：优先命令行传入路径，否则用当前工作目录（npm 运行处 = 项目根）。
const ROOT = path.resolve(process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : process.cwd());

// 递归扫描时跳过的噪音目录（不影响文档互链判断）。
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'out', 'coverage', '.next', '.nuxt']);

// ─────────────────────────────────────────────────────────────────────────────
// 下面三条正则是「按项目可调」的过滤规则，原样照搬到新项目大概率要改：
//
// SKIP_SRC —— 这些目录下的文档是「冻结/已废弃」，其内部断链不计入失败
//            （仍可在 --warn 报告里看到趋势）。换成你项目里的归档/废弃目录名。
const SKIP_SRC = /\/archive\/|\/history\/|\/deprecated\/|business-rules-registry\.md$/;
//
// SKIP_TGT —— 指向代码/运行期目录的引用，不属于「文档互链」，跳过。
//            把这里的目录名换成你仓库顶层的代码目录（src/server/tests/...）。
const SKIP_TGT = /^(server|src|apps|prisma|scripts|tests|shared|\.github)\/|\bmemory\//;
//
// PLACEHOLDER —— 示意路径，非真实链接（模板占位符 / 通配符 / 日期占位）。
const PLACEHOLDER = /[<>{}*]|\.\.\.|\bXXX\b|YYYY|MM-DD|\bxxx\b/i;
// ─────────────────────────────────────────────────────────────────────────────

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory() && SKIP_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full));
    else if (e.name.endsWith('.md')) out.push(full);
  }
  return out;
}

const decode = (t) => { try { return decodeURIComponent(t); } catch { return t; } };
const isExternal = (t) => /^(https?:|mailto:|tel:|#|data:|\/\/)/.test(t);

function scanDocsLinks() {
  if (!fs.existsSync(ROOT)) return { scanned: 0, checked: 0, fixable: [], dangling: [], missing: true };
  const allMd = walk(ROOT);
  const byBase = {};
  for (const f of allMd) (byBase[path.basename(f)] ??= []).push(f);

  const fixable = [];
  const dangling = [];
  let checked = 0;

  for (const file of allMd) {
    if (SKIP_SRC.test(file)) continue;
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      // 两类来源，区别对待：
      //   link  = markdown 真链接 [label](target) —— 用户点得到，写错路径=真 bug，可进 fixable(HARD)。
      //   code  = 反引号代码引用 `path.md` —— 多是正文里「提到某文件」的散文式引用，
      //           不是可点链接；它只在「相对自己所在文件能解析到」时才算有效，否则当悬空(SOFT)，
      //           绝不靠「别处有同名文件」猜成 fixable，否则正文引用会刷一堆假阳性。
      const targets = [];
      for (const m of line.matchAll(/\]\(([^)]+)\)/g)) targets.push({ raw: m[1], kind: 'link' });
      // 先把完整 markdown 链接构造整体抠掉，避免把链接 label 里的反引号 display text
      // 当成独立引用误判——真正的目标已经在上面那条 `](target)` 正则里抓到了。
      const stripped = line.replace(/\[[^\]]*\]\([^)]+\)/g, '');
      for (const m of stripped.matchAll(/`([^`]+)`/g)) {
        const t = m[1];
        if (/\.md/i.test(t) && t.includes('/')) targets.push({ raw: t, kind: 'code' });
      }
      for (const { raw, kind } of targets) {
        const rawPath = raw.split('#')[0].trim();        // 路径部分（去锚点）
        const t = decode(rawPath);
        if (!t || isExternal(t) || !/\.md$/i.test(t) || PLACEHOLDER.test(t) || SKIP_TGT.test(t)) continue;
        let abs;
        if (t.startsWith('docs/')) abs = path.join(ROOT, t);
        else if (t.startsWith('/')) abs = path.join(ROOT, t.slice(1));
        else abs = path.resolve(path.dirname(file), t);
        checked += 1;
        if (fs.existsSync(abs)) continue;
        const rel = file.replace(ROOT + '/', '');
        // fixable（可重指向）判据只对真链接生效；反引号正文引用最多算悬空告警。
        const cands = kind === 'link' ? (byBase[path.basename(t)] || []).map((p) => p.replace(ROOT + '/', '')) : [];
        const rec = { file: rel, line: i + 1, target: t, cands };
        if (cands.length > 0) fixable.push(rec);
        else dangling.push(rec);
      }
    });
  }
  return { scanned: allMd.length, checked, fixable, dangling };
}

module.exports = { scanDocsLinks };

// ---- CLI ----
if (require.main === module) {
  const warnOnly = process.argv.includes('--warn');
  const r = scanDocsLinks();
  if (r.missing) {
    console.log(`跳过：根目录不存在 ${ROOT}`);
    process.exit(0);
  }
  if (r.scanned === 0) {
    console.log(`跳过：${ROOT} 下没有 .md 文件`);
    process.exit(0);
  }
  console.log(`docs 链接检查（根 ${ROOT}）：扫 ${r.scanned} 个 .md，校验 ${r.checked} 条内部 .md 链接`);
  console.log(`  ❌ 可重指向（目标存在、路径写错，必修）：${r.fixable.length} 条`);
  console.log(`  ⚠️  悬空（目标不存在，多为占位/废弃引用）：${r.dangling.length} 条`);
  if (r.fixable.length) {
    console.log('\n=== 可重指向（应改成目标真实路径）===');
    const byFile = {};
    for (const x of r.fixable) (byFile[x.file] ??= []).push(x);
    for (const [f, arr] of Object.entries(byFile).sort()) {
      console.log(f);
      for (const x of arr) console.log(`  :${x.line}  ${x.target}\n       → ${x.cands.join(' | ')}`);
    }
  }
  if (!warnOnly && r.fixable.length > 0) {
    console.log(`\n❌ ${r.fixable.length} 条可重指向断链，退出码 1（修复：把链接改成上面 → 后的真实路径）`);
    process.exit(1);
  }
  console.log(warnOnly ? '\n(--warn：仅报告，不阻断)' : '\n✅ 无可重指向断链');
}
