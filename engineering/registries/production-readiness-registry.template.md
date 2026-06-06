# Production Readiness Registry

> This table is the **data backbone** and **single source of truth** for anti-drift auditing.
>
> **Usage**: any audit / sweep **reads this table first**, never re-judges from scratch.
> **Maintenance**: when you find a new gap or confirm an asset is "done well", write it back here on the spot — including the **positive** assets you already have, not just the gaps.
> When you change a "production invariant" (Sentry / connection pool / index / health check / rate limit / fallback / CI gate / test exclude / coverage threshold), sync the corresponding row.
>
> Every conclusion must carry a `file:line` reference or a runnable command.
> Status legend: ✅ have it | ⚠️ partial / gap | ❌ missing | ☐ not assessed / to wire (fill in for your project).
> **The kit ships no runtime infrastructure** (no monitoring, no health endpoints, no CI gates). Don't pre-mark anything ✅ — assess each row against *your* code first.
> Sweep layer: **CI** = hard block at commit | **monthly** = trend audit | **quarterly** = manual review.

---

## 1. Assets we have (positive baseline — stop treating these as "not done")

| Dimension | Expected state | How to check | Status | Evidence (file:line / command) | Sweep layer |
|---|---|---|---|---|---|
| Multi-tenant isolation | tenantId + data-scope on every query | `npm run audit:tenant` | ✅ | `utils/tenantGuard.js`; soft-delete middleware in `config/prisma.js` | CI + quarterly |
| RBAC | role matrix + data-scope levels | `npm run test:rbac` | ✅ | `tests/rbac/` | CI |
| API standardization | `{ code, data, message }` + schema validation | spot-check routes | ✅ | — | quarterly |
| DB connection pool | explicit connection_limit | grep prisma config | ✅ | `config/prisma.js` (limit + pool_timeout) | CI |
| Health check | liveness + readiness | curl both endpoints | ☐ | fill in once you add `/health` + `/health/deep` (DB ping + 503) — the kit ships no endpoints | CI |

## 2. Gaps (partially met)

| Dimension | Expected state | How to check | Status | Evidence / gap | Sweep layer | Guardrail in place |
|---|---|---|---|---|---|---|
| Structured logging | unified JSON logger | grep console | ☐ | fill in: requestId middleware? unified logger? `console.log` scattered? | monthly | no-console lint on services/routes |
| Test coverage | exclude list doesn't grow | run the guard | ☐ | fill in: exclude baseline + any `.skip` | CI | `check-test-exclude` (baseline pinned) |

## 3. Missing (to plan)

| Dimension | Expected state | Status | Gap evidence | Sweep layer |
|---|---|---|---|---|
| Error monitoring (server + client) | crash/exception reporting wired + 4xx filter + PII scrub | ☐ | **the kit ships no monitoring** — wire Sentry (or equivalent) yourself, then flip to ✅ with init `file:line` | monthly |
| Performance tracing | non-zero sampling in prod | ☐ | depends on your monitoring vendor (kit provides none); off until you wire it | monthly |
| Billing / subscription | can charge customers | ❌ | no billing module — biggest "ready to sell" gap | quarterly |
| Mobile crash monitoring | client crash reporting | ❌ | error monitor only covers server + web | quarterly |
| Slow-query / index audit | slow-query monitoring + key-table index review | ❌ | none | quarterly |
| Data export / deletion compliance | data portability / right-to-erasure | ❌ | none | quarterly |

---

## 4. Machine-checked guardrails (script what you can, wire into CI)

> Conclusions decidable by existence / value / regex can be scripted into `check-*.{js,cjs}` and wired into CI (red lines block commits; trend items only warn). **The kit ships none of these scripts or CI** — the list below is a suggested shape; write the ones your project needs.

- [ ] `check-test-exclude`: skipped tests ≤ baseline (CI)
- [ ] `check-prod-invariants` (suggested CI step "Production-readiness invariants guard") — combine the invariants you actually have, e.g.:
  - 🔴 DB connection-pool limit present (your DB config) — once you add it
  - 🔴 `/health` + `/health/deep` both present (entry file) — once you add the endpoints
  - 🔴 coverage thresholds not lowered (vitest/jest config, baseline only goes up)
  - 🟡 fallback paths still present (storage local fallback / email retry job / API retry) — if you have them
- To change a threshold / add an invariant: edit `check-prod-invariants` (`COVERAGE_BASELINE` / `CHECKS`).

<!--
This is an empty template. See examples/production-readiness-registry.example.md for how a filled-in registry looks.
Keep the four-part structure (have / gap / missing / machine-checked),
the per-row format (dimension | expected | how-to-check | status ✅⚠️❌ | evidence file:line/command | sweep layer),
and the three sweep layers (CI hard-block at commit / monthly trend / quarterly manual).
Replace example rows with your own; every row needs a file:line or runnable command as evidence.
-->
