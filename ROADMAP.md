# Roadmap

Where this kit is headed. This is a direction, not a promise — priorities shift with real usage. Have an idea? [Open an issue](https://github.com/huangjing0526/founder-saas-kit/issues).

[English] · *(中文见每节末)*

## Near-term

- **Polish onboarding for non-technical founders** — a guided "fill the constitution" walkthrough, less jargon in the signpost READMEs.
- **Keep MAP.md honest** — wire a check so the single-page index never drifts from the actual file tree.
- **A recorded demo** — an asciinema / GIF of `npm run demo` blocking an attack, embedded in the README.

*(中文)* 近期：非技术 founder 上手向导、MAP 防漂移校验、demo 录屏。

## Mid-term

- **More quality scripts, more stacks** — the current `check-*` scripts lean Node/Prisma/MySQL. Add adapters or examples for Postgres, Drizzle, Python/Django, etc.
- **Fuller cross-tool install** — Codex/Cursor currently get skills + AGENTS.md; bring hooks/subagents adapters closer to parity with Claude.
- **More eval fixtures** — expand `engineering/governance-skills/eval/fixtures/` toward the G-01~G-12 governance cases that are currently prose samples.

*(中文)* 中期：覆盖更多技术栈的质量脚本、真 `audit:tenant`、跨工具安装对齐、更多 eval 样本。

## Explicitly not doing

- **Prescribing a stack.** The moat lives in `engineering/`; "which stack" stays your call.
- **Becoming a runtime library.** This is a template kit with zero runtime dependencies — it stays that way.
- **One-click SaaS generation.** Not the problem this kit solves (see the README's "Who this is not for").

*(中文)* 明确不做：钦定技术栈、变成运行时库、一键生成 SaaS。
