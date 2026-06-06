<!--
PRD template (Full) v1.0
Usage: cp this file to docs/plans/prds/PRD-<feature-name>.md and fill it in.
Every <angle-bracket placeholder> must be replaced or removed.
Full spec: PRD-SPEC.md
For medium-sized features, use prd-template-lite.md.
-->

---
title: <feature title, e.g. "Checkout Notification V1">
module: <entity-a | entity-b | notification | rbac | billing | data | platform | integration | misc>
status: draft
version: v1.0
owner: <name>
created: <YYYY-MM-DD>
updated: <YYYY-MM-DD>
shipped: null
related_prds: []
related_decisions: []
related_rules: []
---

# <feature title>

## 1. TL;DR

<≤ ~150 words, 1 paragraph. Cover ① what ② why now ③ expected impact (quantified).
No technical jargon (vendor names / webhook / idempotency). No bullet lists.>

---

## 2. Context & Problem

### 2.1 Current state

<How the business/system works today. 2-3 paragraphs.>

### 2.2 Quantified pain

<Must have a number. e.g.
- Partners currently respond in 2 hours on average
- 30% timeout rate (X of N dispatches in the last 30 days)
- Support reports 5-10 customers churned per week due to slow response

If no data exists, "baseline TBD" or a business-side observation is OK.
No empty adjectives like "bad UX" / "inefficient".>

### 2.3 Cost of doing nothing

<What happens if we keep not doing it: accelerating churn / partners leaving / compliance risk.>

---

## 3. Goals & Non-Goals

### 3.1 Goals

- **G1**: <quantified, e.g. cut dispatch response from 2 hours to 30 minutes>
- **G2**: <e.g. timeout rate from 30% to 10%>
- **G3**: <e.g. cover 80% of active partners>

### 3.2 Non-Goals

<At least 2, to force boundary thinking>

- **N1**: <out of scope this release, e.g. no partner-initiated disputes>
- **N2**: <user group not served, e.g. no unsigned temporary partners>

---

## 4. User Stories

<At least 3, covering happy path + at least one error path. Roles must be RBAC-defined roles.>

### US-1: <one-line title>

- **Role**: <sales / support / partner / admin / system>
- **Scenario**: <when it triggers>
- **Expectation**: <how the system should respond>
- **Acceptance**: <PM-verifiable, e.g. sales sees the partner status change to "accepted">

### US-2: <one-line title>

- **Role**:
- **Scenario**:
- **Expectation**:
- **Acceptance**:

### US-3: <error path example>

- **Role**:
- **Scenario**: <error case, e.g. partner doesn't respond within 24h>
- **Expectation**:
- **Acceptance**:

---

## 5. Functional Requirements

<Organized by User Story, not technical module. Each numbered F-N.
Must NOT contain: DB table names / field types, API paths, HTTP status codes, framework/library choices, queue/cache implementation.
For anything unspecified, insert [NEEDS CLARIFICATION: <question>] — do not guess.>

### F-1: <requirement name>

<Concrete description, including the happy path.>

### F-2: <requirement name>

<Concrete description.>

### F-3: <error handling>

<Boundary cases, error handling. Use business language: not "return 4xx" but "tell the user XXX and …".>

---

## 6. Business Rules

<Each business rule numbered. After launch, must be written back to business-rules-registry.md.
New rules default to [pending]; after sign-off become [confirmed].>

### BR-1: <rule name>

- **Trigger**: <when it applies>
- **Rule**: <how it decides>
- **Exception**: <when it doesn't apply>
- **Link**: <business-rules-registry.md#<rule-id> or "new">
- **Status**: [pending]

### BR-2: <rule name>

- **Trigger**:
- **Rule**:
- **Exception**:
- **Link**:
- **Status**: [pending]

---

## 7. Technical Constraints

> ⚠️ From here on, content is technical, written for engineers. Sections 1-6 must not contain the below.
> All sub-items must be present; not-applicable must be written as `N/A — <reason>`.

### 7.1 Tenant isolation  *(mandatory only for multi-tenant projects)*

<If single-tenant, write `N/A — single-tenant` and skip the rest.>

- **Query isolation**: <every data-layer query carries tenantId; list and stats share one where clause; public-pool queries scoped correctly>
- **Aggregate / AI**: <do stats endpoints, AI prompts, raw SQL aggregate across tenants? how is it prevented?>
- **Shared-data exception**: <any cross-tenant shared data, e.g. public templates? state the boundary>

### 7.2 i18n completeness  *(mandatory only for multi-language / customer-facing projects)*

<If internal-only, write `N/A — internal admin only, not customer-facing` and skip the rest.>

- **Customer-facing strings**: <all go through i18n; no hard-coded strings; labels use a `{ en, … }` multi-language structure>
- **AI output language**: <AI-generated content must bind to the user's current language; never input-in-EN → output-in-other>
- **Fallback strategy**: <what to fall back to when a language is missing? can the user tell?>
- **Languages covered**: <which languages does V1 support?>

### 7.3 Data consistency

<Idempotency needed? Idempotency-key design? Retry whitelist (which error codes trigger a retry)? e.g.
- One dispatchEvent never sends a duplicate notification; idempotency key `dispatch_{dispatchId}_{partnerId}_v1`
- Unique constraint at the data layer; a duplicate request returns the existing record instead of creating a new one
- Retry whitelist: only error codes X/Y/Z; everything else fails fast>

### 7.4 Performance

<Concrete numbers, e.g.
- Per-tenant concurrency: 50 dispatches/minute
- Delivery P95 < 5s
- List query P95 < 200ms>

### 7.5 Observability

<Key events to instrument + alert thresholds + alert channel. e.g.
- Instrument: dispatch.sent, dispatch.delivered, dispatch.failed, dispatch.opted_out
- Alert: failure rate > 30% over 5 min with volume > 20 → P1 to <alert channel>
- Dashboard: daily delivery/open/failure rate by tenant>

### 7.6 Cost

<Monetary ceiling, not call counts. e.g.
- Per-tenant per-day messaging cost ceiling $X
- At 80% threshold notify ops; at 100% auto-pause sending
- Global monthly budget $Y, overspend → P0>

### 7.7 Security & compliance

- **PII storage layer**: <e.g. mask phone numbers before write; purge 30 days after opt-out>
- **PII display layer**: <e.g. roles below supervisor see masked phone 138****1234; never enters AI prompts>
- **Audit log**: <e.g. each send records actor/timestamp/template_version, retained 1 year>
- **User consent**: <e.g. partner must opt in within the app before first receiving>

### 7.8 Third-party dependencies

<List all external dependencies + fallback + timeout/retry.>

| Dependency | Purpose | Fallback | Timeout/retry |
|---|---|---|---|
| <e.g. messaging vendor> | <send template messages> | <degrade to in-app notice + email when down> | <10s timeout, 3 retries, exp backoff> |

### 7.9 Config & flags

- **feature flag**: <flag name, default, granularity (global/tenant/user)>
- **gray release**: <start 5% of users/tenants, expand to 20% → 50% → 100% after 3 days clean>
- **rollback**: <disabling the flag stops new sends immediately; sent ones not recalled; migration reversibility>

### 7.10 Data retention

| Type | Retention | Archive / purge policy |
|---|---|---|
| <raw messages> | <90 days> | <cold storage 1 year then delete> |
| <send logs> | <1 year> | <archive> |
| <PII fields (phone)> | <30 days after opt-out> | <purge> |

---

## 8. Risks & Dependencies

<At least 3 risks, at least 1 business risk.
Impact tiers P0 (incident/compliance) / P1 (degraded) / P2 (workaround) align with alerting terminology.>

### R-1: <risk description>

- **Probability**: high / medium / low
- **Impact**: P0 / P1 / P2
- **Mitigation**: <reduce probability>
- **Response**: <handling after it happens>

### R-2: <business risk example>

- **Probability**:
- **Impact**:
- **Mitigation**:
- **Response**:

### R-3: <risk description>

- **Probability**:
- **Impact**:
- **Mitigation**:
- **Response**:

---

## 9. Decision Log

<At least 3 core decisions. Reversibility = low AND cross 2+ modules / vendor choice / core schema change / new tech stack → escalate to an ADR in docs/decisions/>

### D-1: <decision point>

- **Options**: A. <option A>; B. <option B>; C. <option C>
- **Choice**: <B>
- **Rationale**: <why>
- **Objections & responses**: <if someone objects, what they'd say and your reply>
- **Reversibility**: high / medium / low

### D-2: <decision point>

- **Options**:
- **Choice**:
- **Rationale**:
- **Objections & responses**:
- **Reversibility**:

### D-3: <decision point>

- **Options**:
- **Choice**:
- **Rationale**:
- **Objections & responses**:
- **Reversibility**:

---

## 10. Post-Ship Tracking

<Can be empty before launch; backfill within 30 days. Prerequisite for status → done.>

### 10.1 Actuals vs Goals

| Goal | Target | Actual (after 30d) | Gap analysis |
|---|---|---|---|
| G1 | <target> | <actual> | <met/not + reason> |
| G2 | | | |
| G3 | | | |

### 10.2 Test coverage

- US-1 acceptance: `<tests/e2e/xxx.spec.js>`
- US-2 acceptance:
- US-3 acceptance:
- BR-1 unit test: `<tests/unit/xxx.test.js>`

### 10.3 Business-rule registration status

- BR-1 → `business-rules-registry.md#<rule-id>` [confirmed / pending]
- BR-2 →

### 10.4 V2 candidates

<Features or issues found post-launch worth a V2. Promoted Non-Goals count too.>

### 10.5 Revision log

| Version | Date | Change | Author |
|---|---|---|---|
| v1.0 | <YYYY-MM-DD> | First version | <owner> |

---

<!--
Pre-submit self-check (mirrors PRD-SPEC § 5):

Structural completeness:
[ ] 10 sections present
[ ] Metadata fields complete
[ ] File path docs/plans/prds/PRD-<feature>.md

Boundary clarity:
[ ] TL;DR no jargon, ≤ ~150 words
[ ] Sections 1-6 no DB/API/library version/deploy command
[ ] Section 7 sub-items complete (N/A items have a reason)

Big 8 pitfalls (+2 conditional):
[ ] idempotency (§7.3)
[ ] retry whitelist (§7.3 or §7.8)
[ ] monitoring with concrete thresholds (§7.5)
[ ] cost ceiling as money (§7.6)
[ ] PII dual-layer (§7.7)
[ ] fallback (§7.8)
[ ] rollback (§7.9)
[ ] business-rule registration (§6 each BR links to registry)
[ ] (multi-tenant only) tenant isolation (§7.1)
[ ] (multi-language only) i18n completeness (§7.2)

Completeness:
[ ] User Stories ≥ 3 incl. error path
[ ] Non-Goals ≥ 2
[ ] Risks ≥ 3 incl. business risk
[ ] Decisions ≥ 3 incl. reversibility
[ ] Quantified metrics ≥ 1
-->
