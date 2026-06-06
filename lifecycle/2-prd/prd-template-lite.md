<!--
PRD template (Lite) v1.0 — for medium-sized features only

Use Lite only if ALL hold (otherwise use prd-template.md):
  - User Stories ≤ 3
  - No LLM / externally-billed dependency
  - No DB migration (additive backward-compatible fields excepted)
  - No cross-module impact
  - Not customer-facing in a strict i18n way (internal admin / config can relax)

When unsure, use the full prd-template.md.
Full spec: PRD-SPEC.md § 1.
-->

---
title: <feature title>
module: <entity-a | entity-b | notification | rbac | billing | data | platform | integration | misc>
status: draft
version: v1.0
owner: <name>
created: <YYYY-MM-DD>
updated: <YYYY-MM-DD>
shipped: null
prd_type: lite
related_prds: []
related_rules: []
---

# <feature title> (PRD-Lite)

## 1. TL;DR + context

<≤ 2 paragraphs. Para 1: what + why now. Para 2: quantified pain (must have a number or a business-side observation). No technical jargon.>

---

## 2. Goals & Non-Goals

### Goals

- **G1**: <quantified goal>
- **G2**: <quantified goal>

### Non-Goals

- **N1**: <explicitly out of scope>
- **N2**: <explicitly out of scope>

---

## 3. User Stories + Functional Requirements

<Merged, no separate chapters. Each User Story is followed by concrete behavior.
No DB/API/library version/deploy command.>

### US-1: <one-line title>

- **Role · Scenario · Expectation · Acceptance**:
  <One paragraph. e.g. when sales clicks "notify partner" the system sends a notice; the partner can accept/decline within 24h. Acceptance: sales sees the partner status change to "accepted".>

**Functional points**:
- F-1.1: <happy path>
- F-1.2: <error path (at least 1 required)>

### US-2: <one-line title>

- **Role · Scenario · Expectation · Acceptance**:
- **Functional points**:

### US-3: <one-line title, optional, error path recommended>

---

## 4. Business Rules (delete if none)

### BR-1: <rule name>

- **Trigger + Rule + Exception**: <one paragraph>
- **Link**: <business-rules-registry.md#<rule-id> or "new [pending]">

---

## 5. Technical Constraints (condensed)

> Lite keeps 3 mandatory items; the rest can be omitted if not applicable.
> If your project is multi-tenant, add a tenant-isolation item. If customer-facing multi-language, add an i18n item. Both: `N/A — <reason>` is a valid answer.

### 5.1 Data consistency / performance

<Idempotency if needed; response time, concurrency. 1-2 lines.>

### 5.2 Config & rollback

- **feature flag**: <flag name / default / or write why none needed>
- **rollback**: <how to disable>

### 5.3 Key risks (1-2)

- **R-1**: <risk · probability (h/m/l) · impact (P0/P1/P2) · response>

### 5.4 Tenant isolation / i18n (only if applicable)

<Multi-tenant: does every query carry tenantId; can aggregate/AI leak? Multi-language customer-facing: do strings go through i18n? If neither applies, write `N/A — <reason>`.>

---

## 6. Post-Ship Tracking

<Backfill within 30 days of launch>

| Goal | Target | Actual | Gap |
|---|---|---|---|
| G1 | | | |
| G2 | | | |

**Test coverage**: <test file path>

**Business-rule registration**: <BR-1 → registry anchor · status>

**Revision log**:

| Version | Date | Change |
|---|---|---|
| v1.0 | <YYYY-MM-DD> | First version (Lite) |

---

<!--
Lite self-check:
[ ] 6 sections present
[ ] TL;DR + context has quantified pain
[ ] Non-Goals ≥ 2
[ ] User Stories ≥ 2 incl. error path
[ ] §5.2 rollback clear
[ ] At least 1 risk
[ ] §5.4 tenant/i18n filled if applicable (N/A with reason)

Signals to upgrade to Full:
- Halfway through you need 4+ User Stories → switch to prd-template.md
- A vendor / LLM / external API appears → switch to prd-template.md
- Customer-facing multi-language strategy gets complex → switch to prd-template.md
- You need a DB migration (beyond additive fields) → switch to prd-template.md
-->
