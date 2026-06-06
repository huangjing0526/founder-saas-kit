# Production Readiness Registry — Filled Example

> **Version**: 1.0.0
> **Created**: 2026-01-15
> **Scope**: generic multi-tenant SaaS (API + web + worker), stack-neutral.
>
> This is a **worked example** of a filled-in production-readiness registry. It shows what the four-part table looks like once populated. Copy `engineering/registries/production-readiness-registry.template.md` to start your own; use this file only as a reference for density and tone.
>
> **EVERYTHING BELOW IS ILLUSTRATIVE — replace every row with your project's real, verified status.** The kit ships *no* runtime infrastructure (no monitoring, no health endpoints, no CI). Any ✅ here is what *a* project might reach, not something the kit gives you. Re-audit each line against your own code and write back the real `file:line` / command.

## Status legend

| Status | Meaning |
|---|---|
| ✅ | Have it — verified, with evidence |
| ⚠️ | Partial / gap — exists but incomplete or unguarded |
| ❌ | Missing — not built yet, planned |

Sweep layer: **CI** = hard block at commit · **monthly** = trend audit · **quarterly** = manual review.

> Every conclusion must carry a `file:line` reference or a runnable command. No conclusion from memory.

---

## 1. Assets we have (positive baseline — stop treating these as "not done")

| Dimension | Expected state | How to check | Status | Evidence (file:line / command) | Sweep layer |
|---|---|---|---|---|---|
| Multi-tenant isolation | every query carries `tenantId` + data-scope; B-tenant cannot read A | `npm run audit:tenant` | ✅ | `middleware/tenantGuard.js:18-44`; soft-delete + tenant filter in `db/client.js:60-92` | CI + quarterly |
| Health check endpoints | liveness + readiness (DB ping → 503 on failure) | `curl -fsS localhost:3000/healthz && curl -fsS localhost:3000/readyz` | ✅ | `routes/health.js:12-39` | CI |
| DB connection pool | explicit pool size + timeout, not library default | grep DB config | ✅ | `db/client.js:14-21` (`pool_max=10`, `pool_timeout=10s`) | CI |
| API response contract | `{ code, data, message }` envelope + request schema validation | spot-check 3 routes | ✅ | `middleware/respond.js:8`; `schemas/` (zod) | quarterly |
| Auth on every route | all non-public routes behind auth middleware; deny-by-default | `npm run audit:routes-auth` | ✅ | `app.js:55` (global auth); `routes/_public.js` allowlist | CI |
| Tenant-isolation test suite | integration test proves cross-tenant read is blocked | `npm test -- tenant-isolation` | ✅ | `tests/integration/tenant-isolation.test.js:1-120` | CI |

## 2. Gaps (partially met — exists but incomplete or unguarded)

| Dimension | Expected state | How to check | Status | Evidence / gap | Sweep layer | Guardrail in place |
|---|---|---|---|---|---|---|
| Rate limiting | per-tenant + per-IP limits on write + auth endpoints | inspect middleware chain | ⚠️ | global IP limiter on `/auth/login` only (`middleware/rateLimit.js:9`); write endpoints + per-tenant quota unguarded | monthly | none yet — add limiter on `/api/*` writes |
| Structured logging | unified JSON logger with requestId on every line | grep for `console.` in src | ⚠️ | requestId middleware exists (`middleware/requestId.js`); `console.log` still scattered in services, no JSON logger | monthly | `no-console` lint on `services/` + `routes/` |
| Dependency vuln scanning | CI fails on high/critical advisories | check CI workflow | ⚠️ | `npm audit` runs locally but **not** in CI; nothing blocks a vulnerable dep from merging | CI | add `npm audit --audit-level=high` as a CI gate |
| Test coverage drift | skip-list / coverage threshold can't silently shrink | run the guard | ⚠️ | coverage ~62%, threshold pinned but a few `.skip` added without baseline | CI | `check-test-exclude` (baseline pinned) |

## 3. Missing (to plan — not built yet)

| Dimension | Expected state | Status | Gap evidence | Sweep layer |
|---|---|---|---|---|
| Error monitoring (server + client) | crash/exception reporting wired (e.g. Sentry), 4xx filtered, PII scrubbed | ❌ | **the kit does not ship monitoring** — no error tracker initialized anywhere; uncaught errors only hit stdout. You must wire Sentry (or equivalent) yourself | quarterly |
| Automated backups + restore drill | scheduled DB backup + a tested restore runbook | ❌ | no backup job; no documented restore procedure — biggest data-loss exposure | quarterly |
| Slow-query / index audit | slow-query logging + index review on hot tables | ❌ | none; no slow-query log enabled, no index audit recorded | quarterly |
| Graceful shutdown / drain | SIGTERM drains in-flight requests + closes pool before exit | ❌ | process exits immediately on SIGTERM, in-flight requests dropped on deploy | quarterly |
| Secrets management | secrets from a vault/manager, not committed `.env` | ❌ | secrets live in plaintext `.env` on the host; no rotation, no manager | quarterly |

---

## 4. Machine-checked guardrails (script what you can, wire into CI)

> Conclusions decidable by existence / value / regex are scripted into `check-*.{js,cjs}` and wired into CI (🔴 red lines block commits; 🟡 trend items only warn). **These scripts are illustrative — write the ones your project needs.**

- [ ] `check-test-exclude`: skipped-test count ≤ pinned baseline (CI, 🔴)
- [ ] `check-prod-invariants` (CI step "Production-readiness invariants guard") — combines:
  - 🔴 DB `pool_max` / `pool_timeout` present in DB config
  - 🔴 `/healthz` + `/readyz` both wired in `routes/health.js`
  - 🔴 global auth middleware present; public allowlist not bypassing it
  - 🔴 coverage threshold not lowered (baseline only goes up)
  - 🟡 `no-console` lint still enforced on `services/` + `routes/`
- [ ] `check-tenant-scope`: regex-scan `services/` for `findMany/aggregate/count` lacking a `tenantId` filter (CI, 🔴)
- [ ] `check-deps`: `npm audit --audit-level=high` exits non-zero on high/critical (CI, 🔴) — **planned, not yet wired**

> To change a threshold / add an invariant: edit `check-prod-invariants` (`COVERAGE_BASELINE` / `CHECKS`).

<!--
Notes for readers of this example:
- The four-part structure is mandatory: have / gap / missing / machine-checked.
- Per-row format: dimension | expected | how-to-check | status ✅⚠️❌ | evidence file:line/command | sweep layer.
- Three sweep layers: CI hard-block at commit / monthly trend / quarterly manual.
- Every ✅/⚠️ row carries a file:line or runnable command — your real registry must too.
- Note what the kit does NOT provide (monitoring, backups, CI) so the ledger never
  claims an asset the kit can't back. Honesty about gaps > a green-looking table.
-->
