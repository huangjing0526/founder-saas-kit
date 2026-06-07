# Spec-Driven Development (SDD) in this kit

> The fix for "vibe coding" (氛围编程): the **spec is the source of truth**, code is generated/validated against it, and a closed loop keeps the two from drifting apart.

SDD names a loop you've probably seen drawn as four boxes:

```
Specify → Plan → Implement → Validate ──┐
   ▲                                     │
   └──────────── feedback ◄──────────────┘
```

The honest news: **this kit already does 3½ of the 4 boxes** — it just didn't call it SDD, and it was missing the one piece that actually fights doc↔code drift (the line from Validate *back to the spec*). This page names the loop, maps it to what's already here, and points at the new teeth.

## The 4 phases ↔ what's already in the kit

| SDD phase | What it means | Where it lives here |
|---|---|---|
| **1. Specify** | Write the spec before code; it's the durable artifact | [`lifecycle/2-prd`](../../lifecycle/2-prd/) (PRD-SPEC + prd-author / prd-review) · [`registries/business-rules-registry`](../registries/business-rules-registry.template.md) (the machine-checkable spec for business rules) |
| **2. Plan** | Turn the spec into a technical plan + task list | [`lifecycle/4-architecture`](../../lifecycle/4-architecture/) (PRD→design review, architect-handoff) · [`S1 task-triage-plan-first`](../governance-skills/S1-task-triage-plan-first.md) |
| **3. Implement** | Execute the plan; generate code under guardrails | [`lifecycle/5-coding`](../../lifecycle/5-coding/) + the guards/reviewers + [`S2`](../governance-skills/S2-business-rule-registry.md)–[`S7`](../governance-skills/S7-systematic-debugging.md) |
| **4. Validate** | Verify code matches the spec; close the loop | [`S8 delivery-verification`](../governance-skills/S8-delivery-verification-gate.md) + [`S9 audit-verify`](../governance-skills/S9-audit-verify-before-report.md) + tests + **`check-spec-coverage`** ← the new piece |
| **↩ Feedback** | Lessons feed back into the spec | [`lifecycle/9-retrospective`](../../lifecycle/9-retrospective/) → new rules in the registries |

## The piece that was missing: traceability

S8/S9 verify *"does the code work / is it correct?"* — but not *"does the code still match its spec?"*, and nothing mechanically tied a rule in the registry to the code that implements it. So the registry could quietly become a museum piece. That's the drift.

The kit closes it with a **convention + a check**, in the same machine-enforced style as the rest (`check-self-claims`, `check-map-index`):

**Convention**
1. Every business rule lives in `business-rules-registry.md` with an ID (`ORDER-A-003`) and a status (`[confirmed]` / `[pending]` / …). This is the **spec**.
2. The code/test that implements a rule carries a tag `@br <ID>` (a comment, or in a test name), **or** the registry row's `Location (file:line)` column points at it.

**Check** — `npm run audit:spec` (`check-spec-coverage.cjs`, wired into `harness`) fails CI when:
- **A** — a `[confirmed]` rule has *no* code trace (Location file missing **and** no `@br` reference) → spec says it exists, code can't show it.
- **B** — code references `@br <ID>` for an ID not in the registry → a renamed/deleted rule the code still claims.
- **C** — a `[pending]` (un-signed-off) rule is already referenced in code → unauthorized rule entered the codebase.

It skips projects that don't keep a live `business-rules-registry.md`, so adopting it is opt-in.

## What this kit deliberately does *not* do

- **No SDD tool lock-in.** It doesn't adopt spec-kit / Kiro / Qoder's file formats or generators — that would violate the kit's "don't prescribe tooling" rule. It adopts SDD's *spine* (spec as source of truth + validate-back-to-spec) using artifacts the kit already has.
- **No "spec → code generation."** The kit governs and verifies; it doesn't claim to auto-generate implementations from a spec.

## Honesty about the teeth

`check-spec-coverage` is **heuristic** (text-level: it matches IDs and `@br` tags, it doesn't understand semantics). It's a *front-line machine check*, not a guarantee. The semantic guarantee is the [`business-rule-reviewer`](../enforcement/subagents/business-rule-reviewer.md) subagent reading the actual code. Use both — the check catches the cheap, mechanical drift on every push; the reviewer catches the rest.
