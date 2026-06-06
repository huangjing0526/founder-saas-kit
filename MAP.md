# Repository Map

A single-page index of the whole kit. Looking for something specific? Click from here.
For the *why* and the mental model, start at the [README](README.md). This page is the *where*.

[English] · [简体中文 README](README.zh-CN.md)

---

## Root

| File | What it is |
|---|---|
| [README.md](README.md) · [README.zh-CN.md](README.zh-CN.md) | Start here — what the kit is, the mental model, quickstart (EN / 中文) |
| [AGENTS.md](AGENTS.md) | Cross-tool contract (Claude Code / Codex / Cursor) — what the AI must obey |
| [.claude/CLAUDE.md](.claude/CLAUDE.md) | The project constitution: Git / production / business-rule ironclad rules |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute + the gates a PR must pass |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | Community behavior standards (Contributor Covenant 2.1) |
| [SECURITY.md](SECURITY.md) | How to report a vulnerability (guard bypass / scanner miss) |
| [ROADMAP.md](ROADMAP.md) | Near / mid-term direction + what we explicitly won't do |
| [CHANGELOG.md](CHANGELOG.md) | Notable changes, Keep-a-Changelog format |
| [LICENSE](LICENSE) | MIT |
| [package.json](package.json) | npm-script ↔ quality-script wiring (zero runtime deps) |

## lifecycle/ — by product stage (⓪→⑨)

| Path | What it is |
|---|---|
| [lifecycle/README.md](lifecycle/README.md) | Index of all 10 stages + how to read the time axis |
| **0-competitive-analysis/** | [README](lifecycle/0-competitive-analysis/README.md) · [framework](lifecycle/0-competitive-analysis/competitive-analysis-framework.md) · [matrix template](lifecycle/0-competitive-analysis/competitive-matrix-template.md) · [pricing](lifecycle/0-competitive-analysis/pricing-your-saas.md) · [skill](lifecycle/0-competitive-analysis/skills/competitive-analysis/SKILL.md) |
| **1-discovery/** | [README](lifecycle/1-discovery/README.md) · [3-layer breakdown](lifecycle/1-discovery/requirement-three-layers.md) · [clarifying questions](lifecycle/1-discovery/clarifying-questions.md) · [feedback→requirement](lifecycle/1-discovery/feedback-to-requirement.md) · [user research](lifecycle/1-discovery/user-research.md) · [skill](lifecycle/1-discovery/skills/requirement-discovery/SKILL.md) |
| **2-prd/** | [README](lifecycle/2-prd/README.md) · [PRD-SPEC](lifecycle/2-prd/PRD-SPEC.md) · [full template](lifecycle/2-prd/prd-template.md) · [lite template](lifecycle/2-prd/prd-template-lite.md) · [author skill](lifecycle/2-prd/skills/prd-author/SKILL.md) · [review skill](lifecycle/2-prd/skills/prd-review/SKILL.md) |
| **3-ui-baseline/** | [README](lifecycle/3-ui-baseline/README.md) · [design tokens](lifecycle/3-ui-baseline/design-tokens.md) · [three states](lifecycle/3-ui-baseline/three-states.md) · [component-reuse red line](lifecycle/3-ui-baseline/component-reuse-redline.md) · [interaction conventions](lifecycle/3-ui-baseline/interaction-conventions.md) · [skill](lifecycle/3-ui-baseline/skills/ui-baseline-check/SKILL.md) |
| **4-architecture/** | [README](lifecycle/4-architecture/README.md) · [backend layering](lifecycle/4-architecture/backend-layering.md) · [data migration](lifecycle/4-architecture/data-migration.md) · [architect handoff](lifecycle/4-architecture/architect-handoff.md) · [skill](lifecycle/4-architecture/skills/architecture-review/SKILL.md) |
| **5-coding ~ 8-operations/** (signposts) | [⑤coding](lifecycle/5-coding/README.md) · [⑥testing](lifecycle/6-testing/README.md) · [⑦deploy](lifecycle/7-deploy/README.md) · [⑧operations](lifecycle/8-operations/README.md) — each points into engineering/ + ops/ |
| **9-retrospective/** | [README](lifecycle/9-retrospective/README.md) · [experience capture](lifecycle/9-retrospective/experience-capture.md) · [retro template](lifecycle/9-retrospective/retro-template.md) · [skill](lifecycle/9-retrospective/skills/experience-capture/SKILL.md) |

## engineering/ — always-on moat (project-agnostic)

| Path | What it is |
|---|---|
| **governance-skills/** | [README](engineering/governance-skills/README.md) · [BEHAVIOR-RULES](engineering/governance-skills/BEHAVIOR-RULES.md) · [SKILL-TEMPLATE](engineering/governance-skills/SKILL-TEMPLATE.md) — the 11 skills: [S1 triage](engineering/governance-skills/S1-task-triage-plan-first.md) · [S2 business-rule registry](engineering/governance-skills/S2-business-rule-registry.md) · [S3 pre-code self-check](engineering/governance-skills/S3-pre-code-self-check.md) · [S4 tenant isolation](engineering/governance-skills/S4-tenant-isolation-guard.md) · [S5 safe commit](engineering/governance-skills/S5-safe-commit-discipline.md) · [S6 deploy red lines](engineering/governance-skills/S6-production-deploy-redlines.md) · [S7 systematic debugging](engineering/governance-skills/S7-systematic-debugging.md) · [S8 delivery verification](engineering/governance-skills/S8-delivery-verification-gate.md) · [S9 audit-verify](engineering/governance-skills/S9-audit-verify-before-report.md) · [S10 ops automation](engineering/governance-skills/S10-ops-automation-cron-workflow.md) · [S11 multi-perspective decision](engineering/governance-skills/S11-multi-perspective-decision.md) |
| governance-skills/eval/ | [README](engineering/governance-skills/eval/README.md) · [run-code-eval](engineering/governance-skills/eval/run-code-eval.mjs) · fixtures (tenant-isolation / order-state-machine / document-amount-freeze) |
| governance-skills/_examples-business/ | [B-example: document amount freeze](engineering/governance-skills/_examples-business/B-example-document-amount-freeze.md) |
| **enforcement/** | [README](engineering/enforcement/README.md) · [settings.example.json](engineering/enforcement/settings.example.json) · hooks: [guard-dangerous-bash](engineering/enforcement/hooks/guard-dangerous-bash.cjs) · [guard-high-risk-edit](engineering/enforcement/hooks/guard-high-risk-edit.cjs) · [guard.test](engineering/enforcement/hooks/guard.test.cjs) · subagents: [pattern](engineering/enforcement/subagents/REVIEWER-PATTERN.md) · [business-rule](engineering/enforcement/subagents/business-rule-reviewer.md) · [delivery-verification](engineering/enforcement/subagents/delivery-verification-reviewer.md) · [tenant-isolation](engineering/enforcement/subagents/tenant-isolation-reviewer.md) |
| **quality-scripts/** | [MECHANISMS](engineering/quality-scripts/MECHANISMS.md) · [harness](engineering/quality-scripts/harness.mjs) · [health-audit](engineering/quality-scripts/health-audit.cjs) · checks: [secrets](engineering/quality-scripts/check-secrets.cjs) · [docs-links](engineering/quality-scripts/check-docs-links.cjs) · [project-structure](engineering/quality-scripts/check-project-structure.js) · [i18n-parity](engineering/quality-scripts/check-i18n-parity.cjs) · [schema-text](engineering/quality-scripts/check-schema-text.cjs) · [migration-drift](engineering/quality-scripts/check-migration-drift.cjs) |
| **methodology/** | [anti-drift](engineering/methodology/anti-drift.md) · [north-star-rules](engineering/methodology/north-star-rules.md) · [common-pitfalls](engineering/methodology/common-pitfalls.md) · [pitfall-index template](engineering/methodology/pitfall-index.template.md) |
| **registries/** | [business-rules](engineering/registries/business-rules-registry.template.md) · [production-readiness](engineering/registries/production-readiness-registry.template.md) |
| install / demo | [install.mjs](engineering/install.mjs) · [demo.mjs](engineering/demo.mjs) |

## ops/ — operations & collaboration

| Path | What it is |
|---|---|
| [ops/README.md](ops/README.md) | Index of the 5 sub-groups |
| **collaboration/** | [ai-agent-roles](ops/collaboration/ai-agent-roles.md) · [unattended-handoff](ops/collaboration/unattended-handoff.md) · [onboarding](ops/collaboration/onboarding.md) · session-commands: [save](ops/collaboration/session-commands/save-session.md) / [resume](ops/collaboration/session-commands/resume-session.md) / [clean](ops/collaboration/session-commands/clean-sessions.md) |
| **cadence/** | [weekly-check](ops/cadence/weekly-check.md) · [hours-tally](ops/cadence/hours-tally.md) · [review-rhythm](ops/cadence/review-rhythm.md) |
| **decisions/** | [decision-brainstorm](ops/decisions/decision-brainstorm.md) (+ [.js orchestration](ops/decisions/decision-brainstorm.js)) · [decision-log](ops/decisions/decision-log.md) · [glossary](ops/decisions/glossary.md) |
| **run/** (tech ops) | [incident-response](ops/run/incident-response.md) · [backup-recovery-sop](ops/run/backup-recovery-sop.md) · [monitoring-sop](ops/run/monitoring-sop.md) · [dependency-security-cadence](ops/run/dependency-security-cadence.md) · [cost-tracking](ops/run/cost-tracking.md) · [release-announcement](ops/run/release-announcement.md) |
| **business/** (business ops) | [support-workflow](ops/business/support-workflow.md) · [feedback-loop](ops/business/feedback-loop.md) · [billing-subscription-ops](ops/business/billing-subscription-ops.md) · [compliance-and-privacy](ops/business/compliance-and-privacy.md) · [sla-and-status-page](ops/business/sla-and-status-page.md) · [churn-and-retention](ops/business/churn-and-retention.md) |

## examples/ — complete worked samples

| Path | What it is |
|---|---|
| [business-rules-registry.example.md](examples/business-rules-registry.example.md) | A filled business-rules ledger |
| [production-readiness-registry.example.md](examples/production-readiness-registry.example.md) | A filled production-readiness baseline |
| [ui-baseline.example.md](examples/ui-baseline.example.md) | A filled UI baseline |
