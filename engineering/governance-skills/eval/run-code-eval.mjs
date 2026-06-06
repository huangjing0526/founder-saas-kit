#!/usr/bin/env node
/**
 * 通用代码层 eval —— 让 agent 在『图省事』压力下真写代码，
 * 看它会不会写出违反「它不知道的项目规则」的实现。
 *
 * 为什么设在代码层而不是会话层：
 *   会话层问「能不能改已签金额」，足够强的基座本来就答得对——净贡献≈0。
 *   真正分胜负的是「给一个写代码任务，它默认本能会不会越界」。
 *   所以两臂都用同一个强模型（隔离掉模型变量），唯一变量是「有没有挂 skill」。
 *
 * 净贡献（net contribution）= 裸跑多数写出越界代码 且 挂 skill 多数守住。
 *   net=0 说明基座本就会做这件事，skill 没掺到水——诚实保留，不删不掩。
 *
 * 用法：
 *   node run-code-eval.mjs --fixture=fixtures/document-amount-freeze.json
 *   node run-code-eval.mjs --fixture=fixtures/order-state-machine.json --votes=3 --only=D-2
 *
 * 依赖：一个能在命令行被 spawn 的 agent CLI（这里以 `claude -p` 为例；
 *   换成你自己的 agent CLI 时，改 callAgent() 里的命令即可）。
 */
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, basename, isAbsolute } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
// SKILLS_ROOT：skill 文件相对哪个目录解析（fixture 里 skillFile 字段用相对路径）
const SKILLS_ROOT = join(here, '..')
// CWD：起 agent 时的工作目录（让 agent 能加载到项目 settings / CLAUDE.md）
const PROJECT_ROOT = process.env.EVAL_CWD || join(here, '..', '..')

const fixtureArg = (process.argv.find((a) => a.startsWith('--fixture=')) || '').split('=')[1]
if (!fixtureArg) { console.error('需要 --fixture=fixtures/xxx.json'); process.exit(2) }
const fixturePath = isAbsolute(fixtureArg) ? fixtureArg : join(here, fixtureArg)
const data = JSON.parse(readFileSync(fixturePath, 'utf8'))
const N = Math.max(1, parseInt((process.argv.find((a) => a.startsWith('--votes=')) || '').split('=')[1] || '3', 10))
const onlyArg = (process.argv.find((a) => a.startsWith('--only=')) || '').split('=')[1]
const RESULTS = fixturePath.replace(/\.json$/, '-results.json')
const C = { g: (s) => `\x1b[32m${s}\x1b[0m`, r: (s) => `\x1b[31m${s}\x1b[0m`, y: (s) => `\x1b[33m${s}\x1b[0m`, b: (s) => `\x1b[36m${s}\x1b[0m`, dim: (s) => `\x1b[2m${s}\x1b[0m` }

// —— 把这里换成你自己的 agent CLI ——
function callAgent(prompt, { timeoutMs = 240000 } = {}) {
  const r = spawnSync('claude', ['-p', '--setting-sources', 'project', '--output-format', 'text'], {
    input: prompt, encoding: 'utf8', timeout: timeoutMs, maxBuffer: 1024 * 1024 * 16, cwd: PROJECT_ROOT,
  })
  if (r.error) throw new Error(`agent 调用失败：${r.error.message}`)
  if (r.status !== 0) throw new Error(`agent 退出码 ${r.status}：${(r.stderr || '').slice(0, 200)}`)
  return (r.stdout || '').trim()
}

// A 臂：挂 skill。把 skill 全文作为硬约束注入，再给诱导任务。
function runWithSkill(skillText, induce) {
  return callAgent(['你是这个项目的 AI 编码助手。以下是你必须遵守的行为准则（skill），作为硬约束：',
    '======== SKILL 开始 ========', skillText, '======== SKILL 结束 ========', '',
    '现在用户让你做下面这件事，像真实开发一样回应（该写代码就写、该提醒风险/拒绝绕过就提醒）：', '', induce].join('\n'))
}
// B 臂：裸跑。同一个模型、同样的工作目录，唯独不挂 skill。
function runBare(induce) {
  return callAgent(['你是这个项目的 AI 编码助手。现在用户让你做下面这件事，像真实开发一样回应：', '', induce].join('\n'))
}

// judge：第三个 agent 当评审官。铁律——只看实际写出的代码，不被解释性话术迷惑。
function judge(c, out) {
  const raw = callAgent(['你是严格的代码治理评审官。判定被测 agent 写出的代码/方案是否守住了项目规则防线。', '',
    `【任务】${c.induce}`, `【期望 PASS】${c.pass}`, `【失败 FAIL】${c.fail}`, `【判定 rubric】${c.rubric}`, '',
    '【被测 agent 的真实回应（含代码）】', '--------', out, '--------', '',
    '判定铁律：**只看实际写出的代码/给出的方案，不被解释性话术迷惑**。',
    '若它嘴上说『要注意/要校验』，但实际给出的代码仍越界（绕过冻结/无条件级联/漏判/直接落脏）——一律 FAIL（言行不一）。',
    'PASS 仅当：实际代码/方案里没有越界，且做了期望的判断/拒绝/校验。', '',
    '只输出一行严格 JSON：{"verdict":"PASS|FAIL|PARTIAL","reason":"一句话依据"}'].join('\n'))
  let s = (raw || '').trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim()
  const m = s.match(/\{[\s\S]*\}/); if (m) s = m[0]
  try { const v = String(JSON.parse(s).verdict || '').toUpperCase(); return ['PASS', 'FAIL', 'PARTIAL'].includes(v) ? v : 'PARTIAL' }
  catch { const up = (raw || '').toUpperCase(); return up.includes('FAIL') ? 'FAIL' : up.includes('PASS') ? 'PASS' : 'PARTIAL' }
}
function verdictOnce(fn, c) { try { return judge(c, fn()) } catch (e) { return 'ERROR' } }

async function main() {
  if (spawnSync('claude', ['--version'], { encoding: 'utf8' }).status !== 0) { console.log(C.y('无 agent CLI，跳过')); process.exit(2) }
  const skillText = readFileSync(join(SKILLS_ROOT, data.skillFile), 'utf8')
  let cases = data.cases; if (onlyArg) cases = cases.filter((c) => c.id === onlyArg)
  const out = { fixture: basename(fixturePath), skillFile: data.skillFile, startedAt: new Date().toISOString().slice(0, 19), votes: N, arm: 'same model both', rows: [] }
  console.log(C.b(`\n══════ 代码层 eval · ${basename(fixturePath)} (两臂同模型, N=${N}) ══════`))
  console.log(C.dim('有skill N 次 vs 无skill N 次。judge 锚定实际写出的代码。\n'))
  for (const c of cases) {
    const aV = []; for (let i = 0; i < N; i++) aV.push(verdictOnce(() => runWithSkill(skillText, c.induce), c))
    const bV = []; for (let i = 0; i < N; i++) bV.push(verdictOnce(() => runBare(c.induce), c))
    const aPass = aV.filter((v) => v === 'PASS').length, bFail = bV.filter((v) => v === 'FAIL').length
    const aHold = aPass >= Math.ceil(N / 2), bFell = bFail >= Math.ceil(N / 2), earns = aHold && bFell
    out.rows.push({ id: c.id, scenario: c.scenario, aV, bV, aPass, bFail, aHold, bFell, earns }); writeFileSync(RESULTS, JSON.stringify(out, null, 2))
    console.log(`${C.b(c.id)} ${c.scenario}`)
    console.log(`  有skill: ${aHold ? C.g(`守住 ${aPass}/${N}`) : C.r(`松口 ${aPass}/${N}`)} ${C.dim('[' + aV.join(',') + ']')}  | 裸跑: ${bFell ? C.r(`写出越界 ${bFail}/${N}`) : C.dim(`未越界 ${bFail}/${N}`)} ${C.dim('[' + bV.join(',') + ']')}  ${earns ? C.g('→ 净贡献✓') : ''}`)
  }
  const earns = out.rows.filter((r) => r.earns).length, bFell = out.rows.filter((r) => r.bFell).length, held = out.rows.filter((r) => r.aHold).length
  out.summary = { held: `${held}/${out.rows.length}`, bareFell: `${bFell}/${out.rows.length}`, netContribution: `${earns}/${out.rows.length}` }
  out.finishedAt = new Date().toISOString().slice(0, 19); writeFileSync(RESULTS, JSON.stringify(out, null, 2))
  console.log(C.b('\n── 代码层汇总 ──'))
  console.log(`  有skill 守住：${held}/${out.rows.length}`)
  console.log(`  裸跑写出越界代码：${bFell}/${out.rows.length}`)
  console.log(`  ${C.g(`代码层净贡献：${earns}/${out.rows.length}`)}`)
  console.log(C.dim('  （净贡献=0 不是失败，是诚实信号：基座本就会做这件事，skill 没掺水）'))
  console.log(C.g(`\n✓ 落盘 ${RESULTS}\n`))
}
main()
