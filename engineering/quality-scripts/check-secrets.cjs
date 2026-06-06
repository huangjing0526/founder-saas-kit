#!/usr/bin/env node
/**
 * check-secrets —— 硬编码密钥扫描器（防「最高频最贵事故」：把密钥提交进仓库）
 *
 * 背景：对非技术 founder，最容易、代价最大的事故就是把 AWS key / 私钥 / API token / 数据库密码
 * 直接写进代码或 .env 然后 commit 上去——一旦进了 git 历史就等于公开，泄漏后改 commit 也救不回，
 * 只能轮换所有密钥 + 担心已被人扒走。这条防线在「提交前 / CI」就把疑似密钥拦下。
 *
 * ⚠️ 启发式必然有误报（高熵字符串 ≠ 一定是密钥；测试夹具、示例值、哈希都可能命中）。
 *    本工具只是「先拦再人工核」的第一道网，不是判定器——命中后请配合 code review 逐条确认，
 *    确属误报的用行内豁免注释放行（见下方机制 3）。它的价值在「拦住真泄漏」，可接受少量假阳。
 *
 * 命中即打码：报告只显示「文件:行号 + 命中哪条规则 + 打码片段」，绝不回显完整密钥
 *            （否则报告/CI 日志本身就成了二次泄漏面）。
 *
 * 行内豁免（呼应 MECHANISMS.md 机制 3）：本行或上一行带 `// secrets-allow: <理由>`（理由非空）即跳过。
 *   例：const FAKE_KEY = 'AKIAIOSFODNN7EXAMPLE'  // secrets-allow: AWS 官方文档示例值、非真实凭证
 *   强制理由非空，让豁免成为 code review 里看得见、可质问的显式决定，而不是偷偷关规则。
 *
 * 用法：
 *   node quality-scripts/check-secrets.cjs            # 扫当前工作目录
 *   node quality-scripts/check-secrets.cjs <dir>      # 扫指定目录
 *   node quality-scripts/check-secrets.cjs . --warn   # 只报告不阻断（给 health-audit / 趋势用）
 *
 * 退出码：0 = 未发现疑似密钥 / --warn 模式；1 = 发现疑似密钥。
 *
 * 零依赖：纯 fs + 正则，无任何 npm 包。
 */
const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────────────────────────────────────
// 可配置区（接入新项目时按需调整）
// ─────────────────────────────────────────────────────────────────────────────

// 不进扫描的目录（依赖、版本库、构建产物、上传资源等）。
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'out', 'coverage',
  '.next', '.nuxt', '.cache', '.turbo', 'vendor', '.venv', '__pycache__',
]);

// lockfile：纯哈希海洋，扫了全是误报，整体跳过。
const SKIP_FILES = new Set([
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb',
  'composer.lock', 'Cargo.lock', 'poetry.lock', 'Gemfile.lock',
]);

// 只扫这些扩展名的文本文件 + 一批无扩展名的常见配置文件（见 isTextFile）。
const TEXT_EXT = new Set([
  '.js', '.cjs', '.mjs', '.ts', '.tsx', '.jsx', '.vue', '.svelte',
  '.py', '.rb', '.go', '.rs', '.java', '.kt', '.php', '.cs', '.sh', '.bash',
  '.json', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf', '.properties',
  '.env', '.txt', '.md', '.xml', '.html', '.gradle',
]);
// 无扩展名但应当扫的文件名（.env 家族常无后缀）。
const TEXT_BASENAMES = new Set(['.env', 'Dockerfile', 'Makefile']);

const MAX_FILE_BYTES = 2 * 1024 * 1024; // 跳过 >2MB 的大文件（多为生成物 / 二进制误判）

// 行内豁免：要求 `// secrets-allow: <非空理由>`（也兼容 # 注释风格）。
const ALLOW = /(?:\/\/|#)\s*secrets-allow\s*:\s*\S/;

// ─────────────────────────────────────────────────────────────────────────────
// 规则集：每条 = { id, desc, test(line) → 命中的子串数组 }
// ─────────────────────────────────────────────────────────────────────────────
const RULES = [
  {
    id: 'aws-access-key',
    desc: 'AWS Access Key ID',
    re: /\bAKIA[0-9A-Z]{16}\b/g,
  },
  {
    id: 'private-key-block',
    desc: '私钥块（PEM PRIVATE KEY）',
    re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/g,
  },
  {
    // api_key / apikey / secret / token / password = <长字符串>（赋值/键值对）
    id: 'assigned-secret',
    desc: '密钥类变量赋了长字符串值（api_key/secret/token/password）',
    re: /\b(?:api[_-]?key|apikey|secret|token|password|passwd|pwd|auth[_-]?token|access[_-]?token|client[_-]?secret)\b\s*[:=]\s*['"`]([^'"`\s]{16,})['"`]/gi,
    captureGroup: 1,
  },
  {
    // .env 风格 KEY=value：键名含敏感词（全大写蛇形命名）+ 右值是非占位的真值
    id: 'dotenv-secret',
    desc: '.env 风格敏感键赋了真值（KEY=...）',
    re: /^[ \t]*(?:export[ \t]+)?([A-Z][A-Z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD|PASSWD|PWD|CREDENTIAL|PRIVATE)[A-Z0-9_]*)=([^\s#]{8,})/g,
    captureGroup: 2,
  },
  {
    // 通用高熵 token：连续 32+ 个 base64/hex 字符，且包含大小写+数字混合（降低纯英文单词误报）
    id: 'high-entropy-token',
    desc: '疑似高熵 token（长随机串）',
    re: /\b[A-Za-z0-9_\-]{32,}\b/g,
    entropyGuard: true,
  },
];

// 占位 / 示例值白名单：这些不是真密钥，命中也忽略（降低 dotenv / 高熵规则的噪声）。
const PLACEHOLDER_VALUE = /^(?:your[_-]?|my[_-]?|example|sample|test|fake|dummy|placeholder|changeme|xxx+|\$\{|<|\.\.\.)|(?:example|changeme|placeholder|xxxxx)$|^(?:true|false|null|undefined|localhost|0+|1234)/i;

// 高熵判定：值里得同时有「字母 + 数字」且足够长、且字符分布不像普通单词/路径/slug。
function looksHighEntropy(s) {
  if (s.length < 32) return false;
  if (!/[a-z]/.test(s) || !/[A-Z0-9]/.test(s)) return false;       // 要求大小写或数字混合
  const hasDigit = /[0-9]/.test(s);
  const hasUpper = /[A-Z]/.test(s);
  const hasLower = /[a-z]/.test(s);
  if (!(hasDigit && (hasUpper || hasLower))) return false;
  // 看起来像 import 路径 / 句子 / 重复字符的排除掉
  if (/\//.test(s) || /\s/.test(s)) return false;
  if (/^(.)\1+$/.test(s)) return false;                            // 单字符重复
  // kebab/snake-case 标识符（文件名 / 锚点 slug / 常量名）排除：
  // 拆 - / _ 后若是「多个短词段、且段内无大小写混排的随机特征」，判为可读 slug 而非密钥。
  // 真 token 极少长成 a-b-c-72h 这种由英文短词 + 简单后缀拼出的可读串；
  // 用「段内是否出现 小写↔大写 紧邻」当随机性信号——slug 词段几乎都是纯小写。
  const segs = s.split(/[-_]/);
  if (segs.length >= 3) {
    const slugLike = segs.every(
      (seg) => seg.length <= 14 && !/[a-z][A-Z]|[A-Z][a-z]/.test(seg) && !/[A-Z].*[A-Z]/.test(seg)
    );
    if (slugLike) return false;
  }
  // 字符种类丰富度：至少 12 种不同字符，避免 "aaaa1111bbbb..." 这类
  const uniq = new Set(s).size;
  return uniq >= 12;
}

function mask(secret) {
  const s = String(secret);
  if (s.length <= 8) return s[0] + '*'.repeat(Math.max(0, s.length - 1));
  return s.slice(0, 4) + '*'.repeat(Math.min(12, s.length - 8)) + s.slice(-4);
}

function isTextFile(name) {
  if (SKIP_FILES.has(name)) return false;
  if (TEXT_BASENAMES.has(name)) return true;
  // .env / .env.local / .env.production 等
  if (name === '.env' || name.startsWith('.env.')) return true;
  return TEXT_EXT.has(path.extname(name).toLowerCase());
}

// 简单二进制嗅探：含 NUL 字节 → 当二进制跳过。
function looksBinary(buf) {
  const n = Math.min(buf.length, 8000);
  for (let i = 0; i < n; i++) if (buf[i] === 0) return true;
  return false;
}

function walk(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name.startsWith('.') && (e.name === '.git' || SKIP_DIRS.has(e.name))) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      walk(full, out);
    } else if (e.isFile()) {
      if (isTextFile(e.name)) out.push(full);
    }
  }
  return out;
}

function scanSecrets(rootDir) {
  const root = path.resolve(rootDir);
  // 支持传目录(递归扫)或单个文件路径(直接扫该文件)。
  // 传文件时不走 isTextFile 过滤——既然显式点名了就扫,二进制仍由 looksBinary 兜底跳过。
  let files;
  try {
    files = fs.statSync(root).isDirectory() ? walk(root) : [root];
  } catch {
    files = [];
  }
  const findings = [];
  let scanned = 0;

  for (const file of files) {
    let stat;
    try {
      stat = fs.statSync(file);
    } catch {
      continue;
    }
    if (stat.size > MAX_FILE_BYTES) continue;

    let buf;
    try {
      buf = fs.readFileSync(file);
    } catch {
      continue;
    }
    if (looksBinary(buf)) continue;

    scanned += 1;
    const lines = buf.toString('utf8').split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // 行内豁免：本行或上一行带 secrets-allow 注释
      if (ALLOW.test(line) || (i > 0 && ALLOW.test(lines[i - 1]))) continue;

      for (const rule of RULES) {
        rule.re.lastIndex = 0;
        let m;
        while ((m = rule.re.exec(line)) !== null) {
          const raw = rule.captureGroup != null ? m[rule.captureGroup] : m[0];
          if (raw == null) continue;
          if (rule.entropyGuard && !looksHighEntropy(raw)) continue;
          if ((rule.id === 'dotenv-secret' || rule.id === 'assigned-secret') && PLACEHOLDER_VALUE.test(raw)) continue;
          if (rule.id === 'high-entropy-token' && PLACEHOLDER_VALUE.test(raw)) continue;
          findings.push({
            file: path.relative(root, file) || path.basename(file),
            line: i + 1,
            rule: rule.id,
            desc: rule.desc,
            masked: mask(raw),
          });
          if (m.index === rule.re.lastIndex) rule.re.lastIndex++; // 防零宽匹配死循环
        }
      }
    }
  }
  return { scanned, findings };
}

module.exports = { scanSecrets };

// ---- CLI ----
if (require.main === module) {
  const args = process.argv.slice(2);
  const warnOnly = args.includes('--warn');
  const target = args.find((a) => !a.startsWith('--')) || '.';

  const { scanned, findings } = scanSecrets(target);
  console.log(`密钥扫描：${target} → 扫 ${scanned} 个文本文件`);

  if (findings.length === 0) {
    console.log('\n✅ 未发现疑似硬编码密钥（启发式，仍建议 review 关键文件）');
    process.exit(0);
  }

  console.log(`\n⚠️  发现 ${findings.length} 处疑似密钥（已打码，未回显完整值）：\n`);
  const byFile = {};
  for (const f of findings) (byFile[f.file] ??= []).push(f);
  for (const [file, arr] of Object.entries(byFile).sort()) {
    console.log(file);
    for (const x of arr) {
      console.log(`  :${x.line}  [${x.rule}] ${x.desc}  →  ${x.masked}`);
    }
  }

  console.log(
    '\n排查指引：逐条确认是否真密钥。' +
    '\n  - 真泄漏：从代码移除 + 改走环境变量/密钥管理，并轮换该密钥（进过 git 历史的视同已泄漏）。' +
    '\n  - 误报（示例值/测试夹具/哈希）：在该行或上一行加 `// secrets-allow: <理由>` 放行。'
  );

  if (warnOnly) {
    console.log('\n(--warn：仅报告，不阻断)');
    process.exit(0);
  }
  console.log(`\n❌ ${findings.length} 处疑似密钥，退出码 1。`);
  process.exit(1);
}
