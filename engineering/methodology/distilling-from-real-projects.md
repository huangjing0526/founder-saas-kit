# Distilling from real projects

> This kit was born by distilling one real SaaS's 4 months of PM+AI work. It stays alive the same way: keep mining real projects, and **promote** the generalizable patterns back into the kit. This page is that loop, made repeatable.

## The two halves: capture vs. promote

- **Capture** happens in the *source project* (where you actually build). You probably already do it: incident postmortems, a pitfall diary, business-rule registries, "what I tried that didn't work" session notes, the retrospective stage. Capture is rich and local.
- **Promote** is the missing half: taking a captured learning, deciding it's *kit-worthy*, generalizing it, and landing it in the kit via PR. This page is mostly about promote.

This is the kit's own [lifecycle ⑨ retrospective](../../lifecycle/9-retrospective/) loop — except the **output target is the kit repo**, not just the project.

## The 3-gate filter (promote only what passes all three)

Most learnings should *not* become kit content — bloat kills a toolkit. Promote a pattern only if:

1. **Generalizable** — another SaaS / founder would hit it, not just your project/stack.
2. **Recurring** — it's a *class* of problem (seen more than once, or clearly will recur), not a one-off.
3. **Survives redaction** — strip project names / stack / secrets, and it still says something true and useful.

Three yeses → promote. Otherwise park it (it still lives in the source project's notes). *Quality over coverage.*

## Routing table — what goes where

| What you captured | Kit destination | Form |
|---|---|---|
| A recurring bug with a **mechanical signature** (greppable) | `quality-scripts/` | a new `check-*.cjs` (like `audit:tenant`, `audit:spec`) |
| A rule for what the AI **should / shouldn't do** | `governance-skills/` or `enforcement/` | an S-skill or a guard |
| A method / template / checklist for a stage | `lifecycle/<stage>/` | doc / template / skill |
| A **cognitive trap or drift pattern** | `methodology/` | an `anti-drift` / `common-pitfalls` entry |
| A business-rule pattern | `registries/` | a registry example/convention |
| An ops / collaboration process | `ops/` | a process doc |

If it's greppable, prefer a **check** (machine-enforced beats prose). If it's judgment, prefer a **skill/reviewer**.

## The cadence

- **Continuous (capture, don't break flow):** hit something kit-worthy mid-build? File a one-line candidate — open an issue with the **`distillation-candidate`** template, label `from-dogfood`. Don't stop to fix the kit now.
- **Monthly (~1h distillation pass):** skim last month's source-project incidents / pitfall diary / new rules + the `from-dogfood` issues. Triage through the 3 gates. Promote the top **1–3** via PR. Park the rest.
- **Per promotion (one PR):** redact → land in the right bucket → `npm run harness` green → if it touches a downstream-facing surface, update [`STABILITY.md`](../../STABILITY.md) + the contract test → PR → CI → merge → note in `CHANGELOG`. Cut a minor release when a few land.
- **Quarterly (feel the gaps):** actually `install.mjs --update` the kit into a real project. The friction and false-positives you hit *are* the next backlog.

## Why this works

The kit's value is that every rule came from a real incident, not theory. This loop keeps that true as it grows — and the kit's own gates (`harness`, `check-self-claims`, `check-map-index`, `audit:spec`, the contract test) make every promotion safe by construction. You can't accidentally rot it.
