# 工程质量 lint 的 5 个可复用机制

> 这套 lint 体系的精华不在于具体某条规则，而在于**承载规则的 5 个机制**。
> 规则会随项目变（你不会想检查别人的字段命名），但机制是通用的——它们解决的是
> 「怎么把一条规则平滑塞进一个有存量、有团队、有 CI 的真实项目而不被绕过、不被骂、不一刀切」。
>
> 这 5 个机制可以单独用，也可以组合。下面每个都配最小代码示例 + 适用场景，最后讲怎么组合、怎么加到你自己的 check 脚本里。

机制一览：

| 机制 | 一句话 | 解决的问题 | 退出码影响 |
|---|---|---|---|
| 1. baseline 增量拦截 | 存量不卡、只拦新增 | 老项目一开 lint 上千违规，没法落地 | 新增>0 才 exit 1 |
| 2. staged 模式 | 只看本次 git diff 的变更 | 不想全量扫、只想守住「这次提交别变坏」 | 本次新增违规才 exit 1 |
| 3. 行内豁免注释 | `// xxx-allow: 理由` 单行跳过 | 总有合理例外，又不想关掉整条规则 | 带豁免的行不计入违规 |
| 4. HARD / SOFT 双严重度 | HARD 阻断、SOFT 只告警 | 「必须修」和「最好修」要区别对待 | HARD→exit 1，SOFT→exit 0 |
| 5. warn-only 进趋势报告 | 不阻断但计数、看环比 | 想盯住劣化方向，又不想每次卡 CI | 永远 exit 0，数字落月报 |

---

## 机制 1：baseline 增量拦截

**做什么**：把「当前存量违规」快照成一个 baseline 文件，日常 lint 只 fail **比 baseline 新增**的违规。
配 `--update-baseline` 在你清理完一批存量后把基线降下来——存量是单调下降的，新增是 0 容忍的。

**适用场景**：给一个**已经有大量违规的老项目**新上一条规则。如果一上来就全量 fail，几千条违规没人有时间一次清完，规则就会被直接关掉。baseline 让你「先封顶、再慢慢还债」。

**最小示例**（核心就三步：扫当前 → 和 baseline 求差 → 只报新增）：

```js
const fs = require('fs');
const BASELINE = __dirname + '/.my-lint-baseline.json';
const UPDATE = process.argv.includes('--update-baseline');

const current = scan();            // → { 'src/a.js': { ruleX: 3 }, ... } 每文件每规则计数

if (UPDATE) {                      // 清完一批债后，把基线降下来
  fs.writeFileSync(BASELINE, JSON.stringify(current, null, 2));
  console.log('✓ baseline 已更新'); process.exit(0);
}

const base = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
const added = {};
for (const [file, counts] of Object.entries(current))
  for (const [rule, n] of Object.entries(counts)) {
    const delta = n - ((base[file] || {})[rule] || 0);
    if (delta > 0) (added[file] ??= {})[rule] = delta;   // 只留「比基线多出来」的
  }

if (Object.keys(added).length) {
  console.error('✗ 新增违规：', added);
  console.error('如确为合理新增：node 本脚本 --update-baseline');
  process.exit(1);
}
console.log('✓ 无新增违规'); process.exit(0);
```

**接入要点**：baseline 文件要提交进仓库（它是「当前债务基线」的事实记录）；计数粒度建议「文件 × 规则」而非全局总数，否则 A 文件修好、B 文件变坏会互相抵消看不出来。

---

## 机制 2：staged 模式

**做什么**：不扫全仓库，只看**本次 `git diff --cached` 涉及的文件 / 新增的行**。
和 baseline 的区别：baseline 比的是「历史快照」，staged 比的是「这一次提交动了什么」——更轻、天然适合挂 pre-commit hook。

**适用场景**：
- pre-commit / lint-staged：只想守住「这次提交别引入新违规」，不想每次 commit 全量扫几千文件。
- 「改 X 必须同时改 Y」类强制配对（本目录 `check-migration-drift.cjs` 就是典型：schema 进了 staged，就必须有新 migration 也进 staged）。

**最小示例 A**（按 git status 判断配对，零扫描，最便宜）：

```js
const { execSync } = require('child_process');
// A=新增 M=修改 D=删除；只看本次 staged 的变更
const entries = execSync('git diff --cached --name-status', { encoding: 'utf8' })
  .split('\n').filter(Boolean)
  .map(l => { const [status, ...p] = l.split('\t'); return { status, path: p.join('\t') }; });

const schemaChanged = entries.some(e => e.path === 'prisma/schema.prisma');
const addedMigration = entries.some(e => e.status === 'A' && /migrations\/.+\.sql$/.test(e.path));

if (schemaChanged && !addedMigration) {
  console.error('✗ 改了 schema 但没新增 migration'); process.exit(1);
}
```

**最小示例 B**（只检查 diff 里**新增的行**，存量行不碰）：

```js
const { execSync } = require('child_process');
const diff = execSync('git diff --cached --unified=0', { encoding: 'utf8' });
// 只看 + 开头（新增）、跳过 +++ 文件头
const addedLines = diff.split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++'));
const bad = addedLines.filter(l => /console\.log/.test(l));   // 换成你的规则
if (bad.length) { console.error('✗ 本次新增了禁用代码：\n' + bad.join('\n')); process.exit(1); }
```

**接入要点**：staged 模式天生只在「有 git + 有暂存内容」时有意义，CI 全量场景下要么跳过、要么改成 diff against base branch（`git diff origin/main...`）。

---

## 机制 3：行内豁免注释

**做什么**：允许在违规那一行（或上一行）写一句约定格式的注释，让 lint **跳过这一行**。
格式带「理由」是关键——它把豁免变成 code review 时看得见、可质问的显式决定，而不是偷偷关规则。

**适用场景**：任何「99% 该拦、但确实存在合理例外」的规则。比如某个 raw SQL 查询确实安全、某个长字段确实短。
比起把整条规则的白名单堆在脚本顶部（集中豁免，见机制示例里 `check-schema-text.cjs` 的 `WHITELIST`），
行内豁免**把豁免放在事发现场**，谁加的、为什么，diff 里一目了然。

**最小示例**：

```js
const ALLOW = /\/\/\s*mylint-allow\s*:\s*\S/;   // 要求 // mylint-allow: <理由>，理由不能空
lines.forEach((line, i) => {
  if (!isViolation(line)) return;
  // 本行或上一行带豁免注释 → 跳过
  if (ALLOW.test(line) || (i > 0 && ALLOW.test(lines[i - 1]))) return;
  report(i + 1, line);
});
```

用起来像这样：

```js
const rows = await prisma.$queryRaw`SELECT ...`; // mylint-allow: 只读统计、无租户数据、已人工核
```

**接入要点**：强制理由非空（`:\s*\S`），否则会退化成「随手 `// allow` 关掉一切」。配合 code review：豁免注释出现在 diff 里就该被 reviewer 看到并质疑。

---

## 机制 4：HARD / SOFT 双严重度

**做什么**：把规则分两档。**HARD = 违反就该挡下发布**，命中则 `exit 1`；**SOFT = 最好修但不该卡发布**，命中只打印告警、`exit 0`。

**适用场景**：一个 check 脚本里同时存在「真 bug」和「代码异味」两类发现。强行都 exit 1 会让人麻木（狼来了，最后整条 check 被加 `|| true`）；都 exit 0 又拦不住真事故。分档是让门禁「该硬的地方硬、该软的地方软」。

本目录 `check-docs-links.cjs` 就是活例：
- **可重指向断链**（目标文档确实存在、只是路径写错）= HARD，100% 真 bug，`exit 1`；
- **悬空断链**（目标根本不存在，多是占位/废弃引用）= SOFT，只告警。

**最小示例**：

```js
const hard = [];   // 阻断级
const soft = [];   // 告警级
classify(findings, hard, soft);   // 按你的判据分流

soft.forEach(x => console.warn('⚠️  ' + x));    // SOFT：永远只告警
hard.forEach(x => console.error('❌ ' + x));

process.exit(hard.length > 0 ? 1 : 0);          // 只有 HARD 才决定退出码
```

**接入要点**：分档判据要客观可解释（"目标文件存在与否" 是好判据，"我觉得这个重要" 不是）。SOFT 项别无限堆——SOFT 太多没人看，考虑把它们导进机制 5 的趋势报告。

---

## 机制 5：warn-only 进趋势报告

**做什么**：某些维度不值得每次阻断（会太吵），但又想盯住它「在变好还是变坏」。做法：**永远 exit 0**，但把数字**计数落进一份按日期归档的报告**，靠环比看劣化方向。

**适用场景**：粗筛类指标——硬编码字符串残留量、TODO 累积、覆盖率盲区、i18n 缺口…… 单看绝对值没意义（老项目天然一堆），看**月度斜率**才有意义。这是 `health-audit.cjs` 的整个「二、粗筛」部分干的事。

**最小示例**（计数 → 拼 markdown → 按日期落盘，永不 exit 1）：

```js
const fs = require('fs');
const TODAY = new Date().toISOString().slice(0, 10);
const dims = {
  techDebt: countTechDebtMarkers(),   // → 数字
  i18nGap:  countI18nGap(),
};
const md = [
  `# 健康度趋势 — ${TODAY}`,
  `- 技术债标记：**${dims.techDebt}** 处`,
  `- i18n 缺口：**${dims.i18nGap}** 条`,
  '',
  '> 环比上月同目录的报告看斜率，涨太快就该专项还债。',
].join('\n');
fs.mkdirSync('docs/audit', { recursive: true });
fs.writeFileSync(`docs/audit/health-${TODAY}.md`, md);   // 落盘归档，便于环比
// 注意：这里不 process.exit(1)——warn-only 永远不阻断
```

**接入要点**：报告按**日期命名归档**（不是覆盖同一个文件），趋势才看得出来。给老板/非技术读者的版本要配「大白话翻译」（把 "i18n 缺口" 译成 "客户切语言会卡住"）。要主动盯的话，把这份 markdown 推到**告警通道**（IM 群机器人 / 邮件 / Slack）——在落盘后加个 `notify(md)` 钩子即可。

---

## 怎么组合这 5 个机制

它们不是互斥的，真实的 check 脚本往往叠几个：

- **老项目新上规则**：机制 1（baseline）封住存量 + 机制 3（行内豁免）处理个别合理例外。
  → 效果：存量不动、新增 0 容忍、例外有据可查。

- **pre-commit 守门**：机制 2（staged）只看本次 diff + 机制 4（HARD/SOFT）决定哪些挡提交。
  → 效果：commit 飞快、只拦这次引入的真问题。

- **月度体检**：机制 4（HARD lint 必须 0）+ 机制 5（SOFT 维度进趋势报告）。
  → 这正是 `health-audit.cjs` 的骨架：红线挂了 exit 1，粗筛只计数看环比。

- **一条规则的生命周期**（推荐演进路径）：
  1. 刚上线、违规很多 → 先做成机制 5 **warn-only 进报告**，观察基线和波动；
  2. 团队认可这条规则 → 升级到机制 1 **baseline 增量拦截**，新增开始 exit 1；
  3. 存量逐步清零 → 去掉 baseline，变成纯 HARD（机制 4），任何违规都挡下；
  4. 全程用机制 3 **行内豁免**兜合理例外。

## 怎么加到你自己的 check 脚本

一个最小 check 脚本的骨架，把上面机制按需插进去：

```js
#!/usr/bin/env node
const fs = require('fs');

// 0. 解析模式开关
const STAGED = process.argv.includes('--staged');          // 机制 2
const UPDATE_BASELINE = process.argv.includes('--update-baseline'); // 机制 1
const WARN_ONLY = process.argv.includes('--warn');         // 机制 5

// 1. 收集违规（扫全仓 or 只扫 staged diff）
let findings = STAGED ? scanStagedDiff() : scanAll();

// 2. 机制 3：剔除带行内豁免注释的
findings = findings.filter(f => !hasInlineAllow(f));

// 3. 机制 1：和 baseline 求差，只留新增
if (hasBaselineMode) findings = diffAgainstBaseline(findings, UPDATE_BASELINE);

// 4. 机制 4：分 HARD / SOFT
const { hard, soft } = classifyBySeverity(findings);
soft.forEach(x => console.warn('⚠️ ', x));
hard.forEach(x => console.error('❌', x));

// 5. 机制 5：warn-only 落趋势报告（可选）
if (WARN_ONLY) { writeTrendReport(findings); process.exit(0); }

// 6. 退出码：只有 HARD 决定阻断
process.exit(hard.length > 0 ? 1 : 0);
```

把 `scanAll` / `classifyBySeverity` / 豁免注释格式换成你的规则，机制部分照搬即可。

---

> 注：本 kit **没有**搬运那些和具体 UI 框架/业务约定绑死的 check（例如绑 Vue 模板渲染安全、绑特定 i18n helper 二元假设、绑特定 ORM 的多租户 raw 查询拦截）——它们换个项目就得重写。但它们用的**机制**全在上面 5 条里：
> - 「Vue 渲染安全 lint」用的是机制 4（HARD，崩页面级）；
> - 「i18n 二元假设 lint」用的是机制 1（baseline 增量，存量慢慢清）；
> - 「多租户 raw 查询 lint」用的是机制 3（`// xxx-allow: 理由` 行内豁免）。
>
> 也就是说：**规则不可移植，机制可移植。** 拿这 5 个机制去包你自己项目的规则就行。
