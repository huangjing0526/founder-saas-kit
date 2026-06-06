---
title: Anti-Drift Development & Inspection Methodology
status: active
version: v1.0
---

# Anti-Drift Development & Inspection Methodology

> This document defines a **durable** methodology: keep "what we think the system is" and "what the system actually is" continuously aligned,
> eliminating at the source the class of problems where "work that's already done gets treated as not done / configuration silently degrades / the same problem keeps recurring."
>
> Audience: everyone — and every AI session — working in this repo.
> Companion artifacts (replace the bracketed examples with your own carriers):
> - A **baseline registry file** (the single source of truth for "production invariants" — e.g. `production-readiness-registry.md`)
> - **Machine-check scripts** (e.g. a `scripts/check-*.cjs` family)
> - A **CI task** that runs them on every commit/PR
> - A **periodic health-audit task** that produces a monthly trend report

---

## 0. The Root Cause: Cognition-Code Drift

> Origin case (real, replaceable with your own): a maturity-gap audit produced **8 technical assertions that did not match the code** — features that were *already done* (e.g. AI-call retry, a deep health-check endpoint, a configured DB connection-pool limit) were written up as "to-do." The root cause was not any single piece of mis-written code, but **the absence of a mechanism to continuously calibrate "the assumed" against "the actual."**

The unified name for this class of problem is **drift**: over time, the docs, audit conclusions, memory, and word-of-mouth "current state" diverge from the code's real behavior. Drift can never be eliminated by "trying harder to remember" — only by a mechanism that continuously calibrates.

The entire purpose of this methodology is to use 5 principles + 2 fixed actions to make calibration the **unavoidable, lowest-effort** step in the development flow.

---

## 1. The Five Principles

Each principle is annotated with "where it's welded in" — the mandatory location that makes it unavoidable. **A principle that's only written into a doc but not welded into the flow will rot, and is equivalent to nothing.**

### Principle 1 — Evidence over memory

Any conclusion about what the system "has / does / lacks" **must come with a `file:line` reference or a runnable check command**, otherwise it doesn't count.

- **Why**: every one of the 8 audit errors came from asserting on impression. Impressions expire; code does not lie.
- **Where it's welded in**: a line in your pre-output self-check (e.g. the project's `CLAUDE.md` / contributor checklist); audit and inspection tasks route through a dry-run-review gate.
- **Counter-example**: "the health check probably only checks process liveness" ("probably" = didn't read the code).
  Correct: "the deep health endpoint (`server/index.js:445`) already does a DB ping + 503 on failure."

### Principle 2 — Record assets, not just gaps

Inspection records not only problems but **where the already-done things live**. Maintain a "production-readiness baseline registry" as the single source of truth, and always read it *before* an audit.

- **Why**: if positive assets aren't recorded, every new session re-judges from scratch and treats done work as not-done.
- **Where it's welded in**: the baseline registry file (a living document, in the same style as a business-rules registry).
- **Iron rule**: the moment you discover "oh, this was already done," add it to the baseline registry on the spot — otherwise the same misjudgment repeats next time.

### Principle 3 — Machine-check over human-memory

Any conclusion that can be expressed as a script becomes a check script wired into CI / the health-audit task; humans only handle what machines can't judge.

- **Why**: people forget, switch sessions, and drift; scripts run on every commit and never tire.
- **Where it's welded in**: the check-script family + the CI workflow + the health-audit script.
- **Decision rule**: a conclusion that can be expressed as "exists / numeric value / regex" → must be scripted. Examples:
  Is the connection pool configured? Is the error-tracking sample rate non-zero? Has the count of skipped tests grown? Has the coverage threshold been lowered?

### Principle 4 — Tiered inspection by cadence

Each check belongs to **exactly one tier**, never mixed. The three tiers each have their own job:

| Tier | Cadence | Mechanism | Failure consequence | What goes here |
|------|---------|-----------|---------------------|----------------|
| Commit-time | every commit / PR | CI red lines + pre-commit | **Blocked, doesn't enter** | Zero-tolerance hard facts (tenant isolation, secrets, config existence) |
| Monthly | 1st of month | run the health-audit → monthly report | Warning + trend trail | Trend-class (hardcode counts, coverage trajectory, presence of degradation paths) |
| Quarterly | each quarter | Manual: line-by-line registry review + backup-restore drill + product review | Human decision | Only what humans can judge (architectural soundness, data recoverability, business readiness) |

- **Why**: making *every* check a commit-time hard block causes false positives and slowdowns; making everything a quarterly manual review leaks. Tiering is what makes it sustainable.
- **Where it's welded in**: CI (commit) + health-audit script (monthly) + backup-recovery SOP + the periodic review checklist (quarterly).

### Principle 5 — Fixing the same problem a 3rd time = wrong mechanism

If the same problem keeps recurring, the **mechanism is wrong**. Stop and fix the mechanism, instead of patching the code one more time.

- **Why**: recurrence = the current guardrail isn't catching it = the drift source is still there.
- **Where it's welded in**: a standing red line; folded into quarterly review. Recurring items must be upgraded into a new check script or baseline entry.

---

## 2. The Two Fixed Actions (the executable part of the methodology)

Principles are the "why"; actions are the "how." Follow these two flows and you won't create or tolerate drift.

### Action A — When doing an audit / inspection

> Prevents "re-judging everything on impression again."

```
1. Read the baseline registry first — don't start from scratch
2. Cross-check each line against code; attach file:line or a runnable command per conclusion (Principle 1)
3. Update the registry both ways: newly found problems + newly confirmed "already done" assets (Principle 2)
4. Any conclusion that can be automated → write it into a check script and wire to CI / the monthly report on the spot (Principle 3)
5. Land conclusions in the monthly report for a trail; trends become comparable period over period
```

> The origin audit erred precisely because it lacked step 1 — the baseline registry didn't exist yet, so it had to judge from scratch on impression, and judged done work as not-done.

### Action B — When developing

> Prevents "manufacturing new drift." Reuse the existing "doc-sync trigger" pattern and add an "inspection-sync trigger."

When changing the following "production invariant" code, sync the baseline registry + add/modify the corresponding check **on the spot** — don't defer it to the next audit:

| What you changed | Do immediately |
|---|---|
| Error-tracking / observability config | Update the registry row + confirm a check guards the sample rate / DSN |
| DB connection pool / indexes / slow-query | Update the registry + add a check (pool existence, key-index existence) |
| Health check / liveness endpoint | Update the registry + check the route exists |
| Rate limit / degradation / circuit-breaker / retry | Update the registry's degradation section + cross-check the degradation guide |
| CI gates / test exclude lists / coverage threshold | Update the registry + confirm the guard scripts haven't been bypassed |

> The core idea: **drift is synced away the moment it's created**, instead of accumulating for half a year and then being chased down by an audit.

---

## 3. Landing Architecture: Where Each Thing Lives (rot prevention)

The methodology itself will rot — unless each part is placed in its own "unavoidable" location:

```
Principle essence (4 lines)  → always-loaded context file (e.g. CLAUDE.md)   loaded every session, unavoidable  ← the key to "durable"
Full method                  → this document (a reference manual + entry point)
Data (invariants)            → the baseline registry   living doc, continuously updated by Actions A/B
Execution (machine-check)    → check scripts + CI workflow + health-audit script
Timing (auto-invoke)         → dry-run-review gate / audit-task triggers
```

**Division-of-labor iron rules**:
- Don't stuff the full principle text into the always-loaded context file (it'll blow up every context) — only the 4-line essence + a pointer to this document.
- Don't write invariant data into this document (it'll drift from the registry) — this document only covers method; data always lives in the registry.
- Don't let a check script's conclusion live only inside one monthly report — conclusions must be written back to the baseline registry; that's what "recording" means.

---

## 4. Entry / Exit Criteria

- **An inspection conclusion is acceptable** ⇔ it carries a `file:line` or a runnable command (Principle 1). Pure-impression descriptions are rejected.
- **A check may be "trend-only, no red line"** ⇔ it would false-positive on normal cases, or can't be judged by a deterministic script. Otherwise it should be a commit-time red line.
- **This methodology is judged "in effect"** ⇔ all of:
  1. The always-loaded context file holds the principle essence and points to this document;
  2. The registry exists and has been updated since the last audit;
  3. The health-audit monthly report has a "production invariants" section;
  4. The last dev change to a "production invariant" synced the baseline registry (provable via git log).

---

## 5. How This Methodology Prevents Its Own Rot

- During the quarterly review, the **first item** is checking the four "in effect" conditions in §4 above — the methodology inspects itself.
- If any principle goes two consecutive quarters with nobody following it → it's either welded too loosely or not useful: **change how it's welded, or delete it.** No zombie rules.
- Aligned with the lesson of accumulating dozens of dead planning docs: **living docs are continuously updated; dead docs are archived/deleted promptly.** Don't accumulate.
