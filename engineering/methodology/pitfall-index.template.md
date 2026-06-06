---
title: Pitfall Index (Ledger Template)
status: template
version: v1.0
---

# Pitfall Index — Ledger Template

> A running ledger of incidents you've hit, so the same root cause never bites twice.
> **Search by:** ID (`BE-003`) | keyword (`soft delete`) | category browse index.
>
> This is a **blank template**. The example entries below carry generically-useful engineering lessons —
> keep, adapt, or delete them, then fill the empty tables with your own incidents.

---

## Numbering & risk system

**ID scheme** — `<CATEGORY>-<NNN>`, zero-padded sequential within each category:

| Category | Prefix |
|----------|--------|
| Backend | `BE-` |
| Frontend | `FE-` |
| Database | `DB-` |
| Other (ops/deploy/etc.) | `OT-` |

**Risk levels:**

| Level | Meaning |
|-------|---------|
| P0 | Data loss / security breach / outage. Highest priority. |
| P1 | Serious functional defect or broad-impact bug. |
| P2 | Localized defect, workaround exists. |

**Systemic flag:** mark each entry "Yes" (the root cause applies to a *whole class* of code, so it deserves a guard/lint/check) or "No" (one-off, specific to this case).

**Entry fields (keep uniform):** Found (date/source) · Description · Root cause · Fix · Prevention · Risk · Systemic.

---

## Quick index

| Category | Count | ID range |
|----------|-------|----------|
| Backend (BE) | _fill_ | BE-001 ~ |
| Frontend (FE) | _fill_ | FE-001 ~ |
| Database (DB) | _fill_ | DB-001 ~ |
| Other (OT) | _fill_ | OT-001 ~ |
| **Total** | **_fill_** | — |

---

## Backend

> Example entries below — generically-useful root causes. Keep/adapt or delete, then add your own.

### BE-001 (example): Soft-delete didn't clear unique-constraint fields

- **Found:** _date / source_
- **Description:** Soft-deleted records still occupied a unique index (e.g. a code/number or normalized-phone field), so a record with the same value couldn't be re-created or re-imported.
- **Root cause:** Soft-delete logic didn't clear the unique-constraint fields alongside setting the deleted flag.
- **Fix:** On soft-delete, null out (or suffix with `_deleted_{id}`) every `@unique` field; return a friendly message on a unique-violation error.
- **Prevention:** The soft-delete middleware auto-clears all unique fields on delete.
- **Risk:** P1
- **Systemic:** Yes — all soft-deletable entities with a unique constraint.

### BE-002 (example): Auto-increment / sequence number collision with no retry

- **Found:** _date / source_
- **Description:** Under high concurrency, sequence-number generation collided on the unique key, and record creation failed outright.
- **Root cause:** Number generation had no optimistic-lock / retry mechanism.
- **Fix:** Add exponential-backoff retry (e.g. up to 3 attempts) to generation and import writes; on a unique-violation, regenerate the number.
- **Prevention:** All auto-increment/sequence generation must design concurrency retry; add a "concurrency safety" item to the review checklist.
- **Risk:** P1
- **Systemic:** Yes — every module with auto-increment numbering.

### BE-003 (example): Cross-timezone date range filter off by a day

- **Found:** _date / source_
- **Description:** Users in a different timezone saw date boundaries shift, getting an extra or missing day of data.
- **Root cause:** The frontend didn't normalize params to UTC and the backend did no timezone standardization.
- **Fix:** Normalize all date-range params to UTC so boundaries are consistent.
- **Prevention:** Route date-range filtering through a single `toUTCDateRange()` util; review must confirm timezone handling on any date query.
- **Risk:** P1
- **Systemic:** Yes — all date-range query endpoints.

### BE-004 (example): Data-migration script not sample-verified after completion

- **Found:** _date / source_
- **Description:** Migrated records (e.g. attachments) couldn't be displayed/downloaded because the migration wrote metadata in a format the target system didn't expect.
- **Root cause:** Format mismatch between the migration output and the consuming module's expectations.
- **Fix:** Add a fix-up script to normalize the format; align migration logic and the consuming route.
- **Prevention:** After any cross-system data migration, **sample-verify against the target system's data format** (at least 5 records, manually check field formats).
- **Risk:** P0
- **Systemic:** Yes — all cross-system data migrations.

---

## Frontend

> _Add your own FE entries here using the uniform field structure._

| ID | Description | Risk | Systemic | Status |
|----|-------------|------|----------|--------|
| FE-001 | | | | |

---

## Database

> _Add your own DB entries here using the uniform field structure._

| ID | Description | Risk | Systemic | Status |
|----|-------------|------|----------|--------|
| DB-001 | | | | |

---

## Other (ops / deploy)

> Example entry below — generically-useful root cause. Keep/adapt or delete.

### OT-001 (example): Process-manager cluster mode env-validation crash loop

- **Found:** _date / source_
- **Description:** In a process-manager cluster mode, the env-validation script ran in **every** worker; a validation failure caused all processes to restart-loop.
- **Root cause:** One-time init logic lived in the application entry point instead of a pre-start hook.
- **Fix:** Extract it into a standalone check script and run it in the process manager's **pre-start** stage.
- **Prevention:** Put one-time init logic (env validation, migration checks) in the process manager's pre-start stage, **not** in the application entry point.
- **Risk:** P0
- **Systemic:** Yes — all cluster-mode Node.js deployments.

> _Add your own OT entries here using the uniform field structure._

---

## TOP board

> Rank your worst/most-systemic incidents for at-a-glance review. _Fill with your own._

| # | ID | Problem | Risk | Systemic | Status |
|---|----|---------|------|----------|--------|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |

---

## Changelog

| Date | IDs | Note |
|------|-----|------|
| | | |
