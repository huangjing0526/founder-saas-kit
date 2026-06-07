# Founder SaaS Kit

**English** · [简体中文](./README.zh-CN.md)

[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A518-blue)](package.json)
[![runtime deps](https://img.shields.io/badge/runtime%20deps-0-brightgreen)](package.json)
[![guard tests](https://img.shields.io/badge/guard%20tests-42%2F42-success)](engineering/enforcement/hooks/guard.test.cjs)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-blueviolet)](CONTRIBUTING.md)

> Before you write the first line of code, configure your **engineering guardrails, AI-collaboration rules, and pre-launch checks** — once.
> Keep AI (Claude Code / Codex / Cursor) from going off-script in your project.

> 🛡️ **Guard self-tests 42/42** · **all quality gates green** · **0 broken internal doc links** · distilled from **4 months** of a real multi-tenant SaaS CRM · **zero runtime dependencies**

This is not yet another stack template. The web is full of "Next.js + Supabase starters."
This kit solves the layer above that: **how to keep what the AI builds from breaking when you ship.**

It was distilled from a real multi-tenant SaaS CRM (one PM + AI, 4 months of shipping). Every rule, every guard, every checklist grew out of a real incident, a real red line, or a real rework — not theory.

<details>
<summary><b>Table of contents</b></summary>

- [What this kit solves](#what-this-kit-solves)
- [See it work in 30 seconds](#see-it-work-in-30-seconds)
- [The three-layer mental model](#the-three-layer-mental-model-inside-out)
- [Full product lifecycle](#full-product-lifecycle-from-fuzzy-idea-to-retro-loop)
- [Directory map](#directory-map)
- [Starting a new project](#starting-a-new-project)
- [Core philosophy](#core-philosophy-one-page)
- [Who this is not for](#who-this-is-not-for)
- [Contributing & feedback](#contributing--feedback)
- [Origin & credits](#origin--credits)

</details>

> Prerequisite: Node ≥18 (`node -v` to check). Beyond that, **zero dependencies** — every quality script is plain Node.

---

## What this kit solves

When one person — especially a non-technical founder / PM — ships continuously with an AI, the things that actually break aren't "the code is wrong." They are:

1. The AI **means well but does harm** — it adds business rules, validations, or auto-behaviors you never asked for.
2. The AI **says "done" without verifying** — it treats a passing lint / typecheck as proof of completion.
3. The AI **touches unrelated files** / leaks cross-tenant data / runs a dangerous git command that wipes your work.
4. **Docs drift from code** — what you "thought was done" silently regressed; audits run on impression, not evidence.
5. **Key decisions go un-thought-through**, and the same incident keeps recurring on the 3rd fix.

This kit keeps these out with **process discipline + executable guards**, instead of relying on someone watching over the AI's shoulder.

---

## See it work in 30 seconds

Clone it and run one command to watch the guardrails block an attack live (not just claim "we have guards"):

```bash
git clone https://github.com/huangjing0526/founder-saas-kit.git
cd founder-saas-kit
npm run demo
```

The demo: AI tries to run `rm -rf /` → 🛑 guard blocks it · a normal command → ✅ allowed · AI tries to edit `.env` / a private key / a CI file → 🛑 blocked · a secret slips into the code → 🔦 the scanner catches and masks it · guard regression self-test **42/42**. All safe — dangerous commands are only **fed to the guard to see whether it blocks them, never actually executed.**

> **This kit governs itself** (dogfooding): commits obey its own Git discipline; the root [`AGENTS.md`](AGENTS.md) is its cross-tool contract; CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs the very gate scripts it ships (`npm run harness` all green, 0 redirectable broken internal links). A tool that trusts itself is one you can trust.

---

## The three-layer mental model (inside-out)

The top level has just **4 semantic buckets**, each mapping to one mental model:

```
founder-saas-kit/
├── lifecycle/      ← walk it in product order (⓪competitive → ①discovery → … → ⑨retro, 10 stages)
│   ├── 0-competitive-analysis/  competitive analysis (read the battlefield)
│   ├── 1-discovery/      requirement discovery & discussion
│   ├── 2-prd/            PRD double-skill toolkit
│   ├── 3-ui-baseline/    UI design baseline
│   ├── 4-architecture/   technical design & architecture review
│   ├── 5-coding ~ 8-operations/  ⑤coding ⑥testing ⑦launch ⑧operations (signposts → engineering/+ops/)
│   └── 9-retrospective/  retro & lessons captured (fed back into every earlier stage)
│
├── engineering/    ← cross-stage, always-on engineering moat (project-agnostic, lift as-is)
│   ├── governance-skills/  11 governance skills (8-section format + 3-tool conversion)
│   ├── enforcement/        2 PreToolUse guards + 3 read-only reviewer agents
│   ├── quality-scripts/    zero-dep lint + 2 aggregation frameworks + 5 mechanisms
│   ├── methodology/        anti-drift 5 principles · north-star framework · pitfall template
│   └── registries/         business-rules ledger + production-readiness baseline (2 living ledgers)
│
├── ops/            ← operations & collaboration, 5 sub-groups: collaboration/ (roles · handoff · onboarding · session memory)
│                       cadence/ (weekly check · hours · daily/monthly/quarterly rhythm) · decisions/ (multi-view decisions · decision log · glossary)
│                       run/ (tech ops: incidents · backup · monitoring · dependency security · cost · release) · business/ (CS · feedback loop · billing · GDPR compliance · SLA status page)
├── examples/       ← all complete real-world samples, in one place (reference only; don't touch when starting new)
└── .claude/CLAUDE.md   the project constitution: Git / production / business-rule ironclad rules
```

**How to read the two axes**: `lifecycle/` is the **time axis** (whatever product step you're on, open that stage); `engineering/` is the **always-on moat** (guarding behind every step). Lifecycle stages ⑤coding / ⑥testing / ⑦launch / ⑧operations have no standalone directory — they're covered end-to-end by `engineering/` + `ops/` (see the lifecycle diagram below).

**Why no prescribed stack?** Because the moat lives in `engineering/`. "Which stack" is your call — the kit doesn't decide it for you; it only guarantees that **whatever stack you use, the AI plays by the rules and everything is checked before launch.**

---

## Full product lifecycle (from fuzzy idea to retro loop)

The kit is organized around the complete lifecycle — every stage has a module behind it, not just the "write code" part:

`lifecycle/` is the full **⓪→⑨** in 10 stages, none missing (index: [`lifecycle/README.md`](lifecycle/README.md)):

```
⓪compete ①discover ②PRD ③UI-base ④arch    ⑤code ⑥test ⑦launch ⑧ops    ⑨retro
   │        │         │      │       │         └──────┬──────┘          │
0-comp  1-disc    2-prd  3-ui-   4-arch     ⑤~⑧ signpost dirs →     9-retro
petitive overy           baseline itecture  engineering/ + ops/      spective
   └──── standalone content dirs ──────────┘  (guards·checks·sign-off·deploy red lines)  (fed back into ⓪~⑧)
```

- **Standalone content dirs** (⓪①②③④⑨): methods / templates / skills live inside the directory.
- **Signpost dirs** (⑤⑥⑦⑧): covered end-to-end by always-on `engineering/` + `ops/`; the directory holds just a README pointing the way (coding guards + machine checks + sign-off S8 + deploy red lines S6 + operations S10 + weekly check + health-audit), no duplicated content.
- **The loop**: stage ⑨ retro's output is **fed back into ⓪~⑧** — reworks/incidents settle into rules (`engineering/registries/`), an incident ledger (`engineering/methodology/`), machine-check scripts (`engineering/quality-scripts/`), or new skills.

---

## Directory map

| Bucket / directory | What's in it | Generality |
|------|---------|--------|
| **lifecycle/** `0-competitive-analysis/` | Competitive-analysis methods (direct/indirect/substitute) · comparison matrix + positioning map templates · 3 conclusions (differentiation/MVP-baseline/won't-do) + triggerable skill | Generic |
| **lifecycle/** `1-discovery/` | 3-layer requirement breakdown · clarifying-question checklist · feedback→requirement · scope trimming + triggerable skill | Generic |
| **lifecycle/** `2-prd/` | `PRD-SPEC` + Full/Lite templates + prd-author / prd-review double skill | Generic |
| **lifecycle/** `3-ui-baseline/` | Design-token system · loading/empty/error 3-state · component-reuse red line · interaction conventions · multi-platform split + skill | Stack-neutral |
| **lifecycle/** `4-architecture/` | PRD→technical-design review checklist · backend layering baseline (Routes→Services→Repositories) + skill | Generic |
| **lifecycle/** `5~8` (signposts) | ⑤coding ⑥testing ⑦launch ⑧operations — each a README pointing to the matching tools in engineering/ + ops/ | Generic |
| **lifecycle/** `9-retrospective/` | Lessons-captured 4 questions · retro template · 4 settling points (fed back into earlier stages) + skill | Generic |
| **engineering/** `governance-skills/` | 11 governance skills (S1-S11) + 8-section template + business-skill sample + runnable eval | Generic after redaction |
| **engineering/** `enforcement/` | `guard-dangerous-bash` / `guard-high-risk-edit` two guards (+ `guard.test.cjs` self-test) + 3 read-only reviewer subagents + mounting guide | Generic |
| **engineering/** `quality-scripts/` | `check-secrets` (secret scan) / `check-docs-links` / `check-project-structure` / `check-i18n-parity` / `check-tenant-scope` (multi-tenant isolation scan) etc. + `harness` + `health-audit` + **MECHANISMS.md (5 mechanisms)** | Cross-/same-stack |
| `.github/ci.example.yml` · `package.json` | Copy-paste CI red-line gate template (lives outside `workflows/` so GitHub won't auto-run the template) + npm-script↔script wiring | Generic |
| **engineering/** `methodology/` | `anti-drift` (5 anti-drift principles, highest value) / `spec-driven-development` (SDD loop + spec↔code traceability) / `distilling-from-real-projects` (how the kit grows) / `north-star-rules` / `common-pitfalls` / incident-ledger skeleton | Generic |
| **engineering/** `registries/` | `business-rules-registry` + `production-readiness-registry`, two living-ledger templates | Generic |
| `ops/` **operations & collaboration** | 5 sub-groups: `collaboration/` (AI roles · unattended handoff · onboarding · session memory) · `cadence/` (weekly check 5+5 · hours tally · daily/monthly/quarterly rhythm) · `decisions/` (multi-view decisions · decision log ADR · glossary) · `run/` (tech ops: incidents · backup + drills · monitoring · dependency security · cost · release) · `business/` (business ops: CS · feedback loop · billing · GDPR compliance · SLA status page · churn warning) | Generic |
| `examples/` | Complete real samples (business-rules + ui-baseline, to see "what a correct fill looks like") | Reference |
| `.claude/CLAUDE.md` | The project constitution: G1-G6 Git rules + P1-P3 production rules + business-rule rules + pre-output self-check | Redacted placeholder |

---

## Starting a new project

**One-command install (recommended)** — drop the guards / reviewers / skills / AGENTS.md into your existing project:

```bash
# Run inside the kit; installs into your target project (supports claude / codex / cursor)
node engineering/install.mjs --target ../my-app --tool claude
node engineering/install.mjs --target ../my-app --dry-run   # preview what it would install first
node engineering/install.mjs --target ../my-app --update    # later: pull kit updates safely
```

> **Upgrading later** (`--update`): the installer records a manifest of what it wrote, so an update only replaces files you *haven't* edited. Files you customized are never clobbered — the new kit version is written beside them as `<file>.new` for you to diff and merge.

**Or bootstrap a new project manually:**

```bash
git clone https://github.com/huangjing0526/founder-saas-kit.git my-new-project
cd my-new-project
rm -rf .git && git init        # cut the template repo, start your own history

# 1. Fill the project constitution (10 min) — replace placeholders with your project's facts
$EDITOR .claude/CLAUDE.md       # what the project is / who it's for / red lines / branch model

# 2. Mount the enforcement layer (5 min)
cp engineering/enforcement/settings.example.json .claude/settings.json
cp engineering/enforcement/hooks/*.cjs .claude/hooks/        # adjust paths to match settings refs
cp -r engineering/enforcement/subagents/*.md .claude/agents/

# 3. Wire up the quality gates (pick by your stack)
cp engineering/quality-scripts/check-*.cjs engineering/quality-scripts/check-*.js scripts/   # note: check-project-structure is .js
cp engineering/quality-scripts/harness.mjs engineering/quality-scripts/health-audit.cjs scripts/
cp package.json ./   # or merge its scripts section into your existing package.json; cp .github/ci.example.yml .github/workflows/ci.yml to enable CI
# Read engineering/quality-scripts/MECHANISMS.md, swap harness.mjs's STEPS for your lint/test

# 4. Open the two living ledgers
cp engineering/registries/*.template.md docs/      # business-rules ledger + production-readiness baseline

# 5. Start building
# Claude Code auto-reads .claude/CLAUDE.md + skills and collaborates by the governance skills
```

---

## Core philosophy (one page)

- **Rules are guardrails**: not to make the AI do less, but to let it **go full speed within clear boundaries**.
- **Don't stall on small things, align first on big ones**: tier the task, judge scope before acting on a new requirement (S1).
- **The AI's biggest risk is "meaning well, doing harm"**: adding business rules on its own — so business logic must be authorized + registered (S2 + business-rules ledger).
- **Dangerous operations must carry a rollback point, stay in-scope, and stop on error** (P1-P3 + two guards).
- **Run verification before saying "done"; read files before reporting in an audit** — evidence over impression (S8 / S9 + anti-drift).
- **Same problem fixed for the 3rd time and still recurring → stop and fix the mechanism, don't patch the code again.**

---

## Who this is not for

If what you want is "one click to generate a runnable SaaS," this isn't it.
This kit assumes you'll use Claude Code / Cursor, and you're willing to spend 20 minutes configuring constraints before writing code. The payoff: **the quality of the AI's output in your project, and your post-launch incident rate, differ by an order of magnitude.**

---

## Contributing & feedback

- 🐛 Found a bug / have an idea → [open an issue](https://github.com/huangjing0526/founder-saas-kit/issues)
- 🔧 Want to contribute → read [`CONTRIBUTING.md`](CONTRIBUTING.md) first (this repo has strict Git discipline + gates; run `npm run harness` before a PR)
- 🗺️ Want to know what's next → [`ROADMAP.md`](ROADMAP.md)
- 🔒 Security issue → see [`SECURITY.md`](SECURITY.md) (disclose privately, don't open a public issue)
- ⭐ Found it useful → drop a Star so more founders find it

---

## Origin & credits

Distilled from 4 months of PM+AI collaboration on a real multi-tenant SaaS CRM.
The methodology layer draws on [obra/superpowers](https://github.com/obra/superpowers) (systematic-debugging / verification-before-completion / writing-plans and other generic patterns). This kit's added value is in **the gaps a generic framework doesn't cover**: business-rule registration, multi-tenant isolation, audit-before-verify, production deploy red lines, and anti-cognitive-drift.
