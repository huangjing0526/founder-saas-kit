# Contributing to Founder SaaS Kit

Thanks for considering a contribution! This kit governs itself with the same discipline it teaches, so the bar for contributions is "pass the gates the kit ships." Here's how.

[English] · 中文说明见每节末尾的 *(中文)* 行。

---

## Before you start — this repo governs itself

Read these two first; they're the contract:

- [`AGENTS.md`](AGENTS.md) — the cross-tool agreement (works for Claude Code / Codex / Cursor).
- [`.claude/CLAUDE.md`](.claude/CLAUDE.md) — the project constitution (Git / production / business-rule ironclad rules).

*(中文)* 先读 `AGENTS.md`（跨工具约定）和 `.claude/CLAUDE.md`（项目宪法）——它们就是规矩。

---

## What's welcome

- 🐛 **Bug fixes** — a guard that mis-fires, a script that breaks on a layout, a broken link.
- 📝 **Doc clarity** — a lifecycle/ops/methodology doc that's confusing or has a stale reference.
- 🧰 **New quality scripts** — zero-runtime-dependency, plain Node, for stacks the kit doesn't yet cover.
- 🌐 **Translations** — the README has English + 简体中文; other languages welcome.
- 🧪 **Eval fixtures** — more governance test cases under `engineering/governance-skills/eval/fixtures/`.

If you're proposing something large (a new lifecycle stage, a new governance skill), **open an issue first** to align before writing — same as the kit's own S1 "plan-first" discipline.

*(中文)* 大改动（新生命周期阶段 / 新治理 skill）请先开 issue 对齐，再动手。

---

## Before you open a PR — pass the gates

This repo's own CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs these. Run them locally first:

```bash
npm run test:guards     # guard self-tests — must be 42/42
npm run harness         # aggregate gate — must be 6/6 green
npm run demo            # the "30-second" demo must still run
```

If you touched a quality script's behavior, also confirm `npm run lint:docs-links` reports **0 redirectable broken links**.

*(中文)* 提 PR 前先在本地跑 `test:guards`（42/42）、`harness`（6/6）、`demo`。改了脚本行为再确认断链 0。

---

## Git discipline (hard requirements — mirrors G1-G6)

- **Stage explicitly.** Only `git add <explicit path>`. Never `git add .` / `git add -A` / `git commit -am`.
- **One task, one commit.** Message format `type(scope): desc` (e.g. `fix(guard): dedupe rm detection`).
- **Never force-push `main`.** History on `main` is never rewritten.
- **Verify before commit**: `git status` → `git diff --cached --stat` → skim `git diff --cached`.

*(中文)* 只 `git add 明确路径`；一任务一 commit；不对 main force push；提交前三步验证。

---

## Where new content goes

| You're adding… | Put it in… | Use the template… |
|---|---|---|
| A governance rule/skill | `engineering/governance-skills/` | [`SKILL-TEMPLATE.md`](engineering/governance-skills/SKILL-TEMPLATE.md) |
| A quality script | `engineering/quality-scripts/` (zero runtime deps, plain Node) | mirror an existing `check-*.cjs` header |
| A lifecycle method/template | `lifecycle/<stage>/` | the stage's existing files |
| An operations doc | `ops/<sub-group>/` | the sub-group's existing files |
| A complete worked sample | `examples/` | existing `*.example.md` |

After adding files, make sure they're indexed in the relevant `README.md` and (if top-level) in [`MAP.md`](MAP.md).

*(中文)* 加完文件，记得在对应 README 和 `MAP.md` 里登记。

---

## Code of Conduct

By participating, you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

## Security issues

Don't open a public issue for security problems — see [`SECURITY.md`](SECURITY.md).

## License

By contributing, you agree your contributions are licensed under the project's [MIT License](LICENSE).
