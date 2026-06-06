---
title: PRD Specification
status: active
version: v1.0
owner: <you>
last-updated: <YYYY-MM-DD>
---

# PRD Specification (PRD-SPEC)

> **The PRD writing constitution for this project.**
> This document is the single source of truth for PRD authoring, review, and AI-assisted generation.
> When this document conflicts with a template or a skill, this document wins.

---

## 0. What problem this spec solves

Three classes of problems recur in PRD review:

1. **Inconsistent format** — every PRD has a different structure, hard to skim, key info buried in corners.
2. **Technical over-reach** — "how to build it" leaks into "what to build", turning the PRD into a low-quality technical design doc.
3. **Missing mandatory items** — idempotency, monitoring/alerting, cost ceilings, PII protection (and, for multi-tenant / multi-language projects, tenant isolation and i18n completeness) repeatedly get dropped.

This spec solves all three with three layers: **structure + boundary + a mandatory-item checklist**.

---

## 1. Scope

### PRD required

- A **new feature** or **major change** to the product.
- Anything customer-facing / externally perceivable.
- Anything cross-module, cross-tenant, or depending on a third party.

### No PRD (lightweight path)

| Type | Use instead |
|---|---|
| Bug fix | Issue tracker or a short fix note |
| Internal script / tool | A README is enough |
| Schema-only change | Migration + a decision record |
| Field / style tweak | Just do it (the "small" tier of your workflow) |

### Full PRD vs Lite PRD

| Type | Template | Trigger (any one fails → use Full) |
|---|---|---|
| **Lite** | `prd-template-lite.md` | ≤3 User Stories · no LLM/externally-billed dependency · no DB migration · no cross-module impact |
| **Full** | `prd-template.md` | Any of the above fails, or customer-facing, or AI / external API integration |

When unsure, use Full. Lite is for "medium-sized features", not for "too lazy to write".

---

## 2. Storage path & naming

**Keep a flat structure; don't create per-module subfolders.** Module classification lives in the YAML frontmatter `module:` field.

### Path convention

```
docs/plans/prds/PRD-<feature-name>.md       # active
docs/plans/done/PRD-<feature-name>.md        # archived after delivery
docs/plans/archive/PRD-<feature-name>.md     # archived when deprecated
```

### Module field (`module:` values)

Adapt this enum to your own product's module map. Generic example:

| Module | Value | Scope |
|---|---|---|
| Core entity A | `entity-a` | The full lifecycle of your primary record |
| Core entity B | `entity-b` | A second primary record |
| Notification | `notification` | Email, push, SMS, IM webhooks |
| Auth & access | `rbac` | RBAC, visibility, tenant isolation |
| Billing / quoting | `billing` | Pricing, versions, contracts |
| Data & reporting | `data` | Dashboards, reports, exports |
| Platform | `platform` | Cross-module infrastructure, gateways, config |
| Integration | `integration` | External APIs, third-party services |
| Misc | `misc` | Doesn't fit above (use sparingly) |

### File-name convention

- Prefix `PRD-`, all lowercase, kebab-case.
- No date in the name (date lives in frontmatter `created`).
- ✅ `PRD-checkout-notification.md`
- ❌ `2026-05 CheckoutNotify.md` / `PRD-CheckoutNotify.md`

### Archive loop

After a release ships and all phases are delivered:
1. `git mv docs/plans/prds/PRD-xxx.md docs/plans/done/`
2. Move the implementation plan (e.g. `xxx-plan.md`) **together**.
3. Fix inbound references: `grep -r "docs/plans/prds/PRD-xxx" docs/`
4. Commit the move on its own: `chore(docs): archive xxx PRD to done/`

Don't archive while only some phases are done — leave it in the active folder.

---

## 3. Required section structure (mandatory)

Every Full PRD is **YAML frontmatter + 10 body sections**, in this **fixed order**:

```
[YAML frontmatter]   metadata, wrapped in --- at the top

1. TL;DR (Executive Summary)
2. Context & Problem
3. Goals & Non-Goals
4. User Stories
5. Functional Requirements
6. Business Rules
7. Technical Constraints           ← business/technical boundary
8. Risks & Dependencies
9. Decision Log
10. Post-Ship Tracking             ← backfilled within 30 days of launch
```

**Key design: section 7 is the wall.** Sections 1-6 are written by the PM for the PM / leadership / support / sales. Section 7 onward is written by the PM for engineers. This boundary fights the tendency for a PRD to drift into a technical design doc.

Section 10 ("Post-Ship Tracking") closes the "goal → actual outcome" learning loop.

---

### 3.0 Metadata (YAML frontmatter)

**Purpose**: anyone can tell at a glance what this PRD is, its state, who owns it, where the context lives.

```yaml
---
title: Checkout Notification V1
module: notification
status: draft | reviewing | approved | shipped | monitoring | done | deprecated
version: v1.0
owner: <name>
created: 2026-05-15
updated: 2026-05-15
shipped: null            # launch date; required once status is shipped
related_prds:
  - docs/plans/done/PRD-order-system.md
related_decisions:
  - docs/decisions/idempotency-key-pattern.md   # may be []
related_rules:           # rule IDs in business-rules-registry.md
  - checkout-notification-timeout-72h
---
```

**Output standard**:
- `status` must be one of the 7 values above (see § 6).
- `version` is SemVer (v1.0 / v1.1 / v2.0); minor for revisions, major for rewrites.
- `related_prds` / `related_decisions` / `related_rules` write `[]` if none — never omit the field.
- Fill `shipped` when status enters `shipped`.

---

### 3.1 TL;DR (Executive Summary)

**Purpose**: can leadership decide in 30 seconds whether to keep reading?

**Output standard**:
- **≤ ~150 words**, no more than one paragraph.
- Must contain 3 elements: ① what ② why now ③ expected impact (quantified).
- No technical jargon (idempotency / webhook / vendor names).
- No bullet lists.

**Good example**:
> When sales hands a lead to a partner, the system automatically notifies the partner to accept the job; the partner can accept/decline in one tap. Today this relies on manual messaging, averaging 2 hours to respond with a 30% timeout rate. After launch we expect response time to drop to 30 minutes and timeout rate below 10%. V1 is one-way notification only; disputes and follow-ups stay inside the CRM.

**Bad example (too technical)**:
> Trigger a template message via the messaging vendor's API on the OrderAssigned event, using an idempotency key for exactly-once delivery, gray-released to 5% of users.

---

### 3.2 Context & Problem

**Purpose**: let the reader understand "why we must do this", not "the PM had a whim".

**Required sub-items**:
- **Current state**: how the business/system works today (2-3 paragraphs).
- **Quantified pain**: numeric problem metrics (must have a number; "baseline TBD" is acceptable).
- **Cost of doing nothing**: what happens if we keep not doing it.

**Output standard**:
- At least **1 quantified metric** (response time / conversion / failure rate / complaint count).
- With no existing data, an observation is OK: "support reports 5-10 customers churned this week due to slow response".
- No empty adjectives like "bad UX" / "inefficient".

---

### 3.3 Goals & Non-Goals

**Purpose**: prevent scope creep. "Non-Goals" matters as much as "Goals".

```markdown
### Goals
- G1: <quantified goal 1>
- G2: <quantified goal 2>
- G3: <quantified goal 3>

### Non-Goals
- N1: <explicitly out of scope 1>
- N2: <explicitly out of scope 2>
```

- 3-5 goals, each quantifiable or verifiable (SMART).
- **At least 2 Non-Goals** (mandatory — forces boundary thinking).
- Common Non-Goal types: "features not in this release", "user groups not served", "systems not replaced".

---

### 3.4 User Stories

**Purpose**: ground abstract requirements in concrete roles and scenarios.

```markdown
**US-1: <one-line title>**
- Role: sales / support / partner / admin / system
- Scenario: <when it triggers>
- Expectation: <how the system should respond>
- Acceptance: <how we know it succeeded, PM-verifiable>
```

**Output standard**:
- At least **3 User Stories**, covering the happy path + at least one error path.
- Roles must be roles your RBAC system already defines; custom roles need a separate note.
- Acceptance is "PM-verifiable" ("sales sees the partner status change to 'accepted'"), not a technical bar like "API returns 200".

---

### 3.5 Functional Requirements

**Purpose**: what the system concretely does. This is the body of the PRD.

**Output standard**:
- Organized by User Story, not by technical module.
- Each requirement gets an **F-number** (F-1, F-2, …) for review references.
- Covers happy path + error path + boundary cases.
- **Don't guess — mark instead**: for anything unspecified (default value, ceiling, prerequisite state, login method…), **do not silently assume**. Insert `[NEEDS CLARIFICATION: <question>]` inline, e.g. `F-5: timeout threshold [NEEDS CLARIFICATION: no hours given — 24h / 48h / 72h?]`. Rules: ① the marker can be found by `grep -rn "NEEDS CLARIFICATION"`; ② **a PRD with any unresolved `[NEEDS CLARIFICATION]` cannot enter development**; ③ clear all markers before review/coding, then record the answer in 3.9 Decision Log.
- **Must NOT contain** (these belong in section 7):
  - Database table names, field types
  - API paths, HTTP status codes
  - Specific framework/library choices
  - Queue / cache / lock implementations

**Good example**:
> **F-3: Handling a failed dispatch notification**
> If the partner does not respond within 24 hours, the system treats it as a timeout, automatically re-enters the dispatch pool, and sends an in-app notice to sales. A resend is not a new dispatch and does not increase the customer's "times disturbed".

**Bad example**:
> F-3: On vendor error code 30001/30002, trigger a queue retry, max 3 times, 30s backoff.

---

### 3.6 Business Rules

**Purpose**: capture reusable decision logic that the project's `business-rules-registry.md` can reference.

```markdown
**BR-1: <rule name>**
- Trigger: <when it applies>
- Rule: <how it decides>
- Exception: <when it doesn't apply>
- Link: <registry rule ID, or "new [pending]">
- Status: [pending] | [confirmed]
```

**Output standard**:
- Each business rule is numbered.
- The Link field names the corresponding entry (anchor ID) in `business-rules-registry.md`.
- **New rules** default to `[pending]`; after sign-off they become `[confirmed]` and get registered. `[pending]` rules cannot enter development.
- **Cross-module rules** must state their blast radius.
- **Conflicts with existing rules** are explained in the Link field (override / coexist / deprecate).

> This section is the enforcement entry point for business-rule governance: **only implement what was asked, every new rule must be registered, every change summary must include a rule list.**

---

### 3.7 Technical Constraints ⚠️ business/technical boundary

**Purpose**: the PM tells engineers "hard requirements you must respect" — but not "how to implement".

> ⚠️ **Important**: from here on, content is written for engineers. If anything in sections 1-6 reads like this section, move it here.

**Required sub-items (each one not-applicable must be written as `N/A — reason`)**:

| Sub-item | Must specify | Why mandatory |
|---|---|---|
| **7.1 Tenant isolation** *(if multi-tenant)* | Whether data can be shared across tenants, whether every query carries tenantId, whether aggregate / AI SQL can leak across tenants | Multi-tenant red line — company A must never see company B's data. **Mandatory only if you are a multi-tenant project; otherwise write `N/A — single-tenant`.** |
| **7.2 i18n completeness** *(if multi-language)* | Customer-facing strings go through i18n, labels use a `{ en, … }` multi-language structure, AI output language binds to the user's language, fallback strategy | Customer-facing language consistency — a user who picks EN sees 100% EN, no other language mixed in. **Mandatory only if you are a multi-language / customer-facing project; otherwise write `N/A — internal admin only`.** |
| **7.3 Data consistency** | Idempotency needed? Idempotency-key design, retry whitelist (which error codes trigger a retry) | A perennial pitfall |
| **7.4 Performance** | Concurrency, response time, throughput | Drives architecture |
| **7.5 Observability** | Key events to instrument, alert thresholds, alert channel | Without monitoring, a launch is a black box |
| **7.6 Cost** | Per-tenant / per-day **monetary** ceiling (not call counts), alert threshold | Prevents runaway LLM / third-party spend |
| **7.7 Security & compliance** | PII dual-layer protection (storage + display), audit log, user consent | Legal red line |
| **7.8 Third-party dependencies** | Which services, fallback plan, timeout/retry strategy | Single-point-of-failure identification |
| **7.9 Config & flags** | Feature flag, gray-release percentage, rollback method | Rollback strategy |
| **7.10 Data retention** | Raw data / log retention periods, archive policy, PII opt-out cleanup | Compliance + cost |

**Output standard**:
- All sub-items present; not-applicable must state the reason (e.g. `7.2 N/A — internal admin only, not customer-facing`).
- 1-3 lines each; long technical designs go to a separate `docs/plans/<feature>-tech-design.md`.
- For money / time / quota, **give concrete numbers** — not "low latency" or "moderate concurrency".

> **Why 7.1 / 7.2 are their own sub-items**: in many specs these get folded into "security & compliance" as an afterthought. For multi-tenant / multi-language products they are incident-grade. If your product is one of those, treat them as first-class and fill them independently. If not, an explicit `N/A — <reason>` is the correct answer.

---

### 3.8 Risks & Dependencies

**Purpose**: surface "things that could go wrong" up front.

```markdown
**R-1: <risk description>**
- Probability: high / medium / low
- Impact: P0 (incident/compliance) / P1 (degraded) / P2 (workaround exists)
- Mitigation: <reduce probability>
- Response: <handling after it happens>
```

**Output standard**:
- At least **3 risks**, at least 1 of them a business (non-technical) risk.
- Impact tiers P0/P1/P2 align with your alerting terminology (P0 = paging/urgent alert + immediate response; P1 = an alert-channel message).
- **Default alert channel**: pick one channel for the project (Slack / IM webhook / pager). Write it once and reuse it across PRDs rather than mixing channels.
- List all external dependencies (vendors, cloud services, maps) and their fallback plans.

---

### 3.9 Decision Log

**Purpose**: capture "why this and not that", so the same debate doesn't reopen in six months.

```markdown
**D-1: <decision point>**
- Options: A / B / C
- Choice: B
- Rationale: <why>
- Objections & responses: <if someone objects, what they'd say and your reply>
- Reversibility: high / medium / low
```

**Output standard**:
- At least **3 core decisions**.
- **Irreversible decisions** (reversibility = low) must have "objections & responses" filled.
- **Key / irreversible decisions deserve a multi-perspective pass**: for reversibility = low or anything meeting the ADR escalation bar below, don't decide on a single line of reasoning — diverge across perspectives, adversarially verify, converge on candidates, then fill "objections & responses" for real.
- **ADR escalation bar**: any of the following requires a standalone ADR in `docs/decisions/`:
  - Reversibility = low AND blast radius spans 2+ modules
  - A vendor/platform choice (LLM provider, messaging service, maps, …)
  - A change to a core data model
  - Introducing a new tech stack / framework

Once escalated, the PRD § 9 entry becomes "see `docs/decisions/<adr-name>.md`" — don't duplicate content.

---

### 3.10 Post-Ship Tracking

**Purpose**: close the "goal → actual outcome" loop. **Can be empty before launch; must be backfilled within 30 days after.**

```markdown
### 10.1 Actuals vs Goals

| Goal | Target | Actual (after 30d) | Gap analysis |
|---|---|---|---|
| G1 response time | 30 min | 42 min | slow on weekends, need V2 resend |
| G2 timeout rate | <10% | 8% | ✅ met |

### 10.2 Test coverage

- US-1 acceptance: `tests/e2e/checkout-notification.spec.js`
- US-2 acceptance: ...
- BR-1 unit test: `tests/unit/checkout-rules.test.js`

### 10.3 Business-rule registration status

- BR-1 → `business-rules-registry.md#checkout-notification-timeout-72h` [confirmed]
- BR-2 → to register

### 10.4 V2 candidates

- Add resend (based on the G1 gap)
- Partner-initiated disputes (was Non-Goal N1)

### 10.5 Revision log

| Version | Date | Change | Author |
|---|---|---|---|
| v1.0 | 2026-05-15 | First version | <name> |
| v1.1 | 2026-06-20 | Add G1 gap analysis | <name> |
```

**Output standard**:
- Backfill 10.1 actuals within 30 days of launch.
- 10.2 test cases must have file paths (for traceability).
- 10.3 rule statuses must all be `[confirmed]` before status → `done`.

---

## 4. Writing style

### 4.1 Language

- Business sections (1-6): business language, assume a non-technical reader.
- Technical sections (7-10): technical language OK, but still avoid implementation detail (that's tech-design's job).

### 4.2 Format

- Headings to H4 max (`####`); deeper means a structure problem.
- Tables for multi-dimensional comparison, lists for parallel items, paragraphs for argument.
- Code blocks only for: data-structure examples, config examples, rule-number references.

### 4.3 References & numbering

- Every requirement/rule/risk/decision has an ID (F-1, BR-1, R-1, D-1, US-1).
- Cross-section references use IDs: "see F-3 and BR-2".
- Cross-PRD references use relative paths: `docs/plans/done/PRD-order-system.md#F-5`.
- Registry references use anchors: `business-rules-registry.md#<rule-id>`.

### 4.4 Forbidden content

A PRD must never contain:
- ❌ Concrete SQL / schema
- ❌ Concrete API endpoint paths (`/api/v2/orders/:id/notify`)
- ❌ Concrete library versions (`somelib@5.0.1`)
- ❌ Concrete deploy commands
- ❌ Long code blocks (over 10 lines)

All of the above belong in `docs/plans/<feature>-tech-design.md`.

---

## 5. Review checklist

When a PRD moves from `draft` to `reviewing`, self-check the following.

### 5.1 Structural completeness

- [ ] YAML frontmatter + 10 body sections all present
- [ ] Section order correct
- [ ] Metadata fields complete (title/module/status/version/owner/created/updated/shipped)
- [ ] File path matches `docs/plans/prds/PRD-<feature-name>.md`

### 5.2 Boundary clarity

- [ ] TL;DR has no jargon, ≤ ~150 words
- [ ] Sections 1-6 have no DB / API / library version / deploy command
- [ ] Section 7 sub-items complete (N/A items have a reason)
- [ ] **No leftover `[NEEDS CLARIFICATION]`**: `grep -rn "NEEDS CLARIFICATION" <PRD path>` is empty; unresolved → cannot enter development

### 5.3 Big 8 high-frequency-pitfall check

Plus 2 conditional items for multi-tenant / multi-language projects.

- [ ] **Idempotency**: 7.3 has a concrete idempotency strategy + key design
- [ ] **Retry whitelist**: 7.3 or 7.8 lists which error codes trigger retries
- [ ] **Monitoring**: 7.5 has concrete thresholds + alert channel
- [ ] **Cost ceiling**: 7.6 is a monetary amount (not a call count)
- [ ] **PII dual-layer**: 7.7 covers both storage and display layers
- [ ] **Fallback**: 7.8 has a fallback for every third-party dependency
- [ ] **Rollback**: 7.9 explains how to disable the feature
- [ ] **BR registration**: every BR links to the registry (new ones marked `[pending]`)
- [ ] *(multi-tenant only)* **Tenant isolation**: 7.1 states the isolation strategy
- [ ] *(multi-language only)* **i18n completeness**: 7.2 states the customer-facing language strategy

### 5.4 Completeness

- [ ] ≥3 User Stories, including 1 error path
- [ ] ≥2 Non-Goals
- [ ] ≥3 risks, including 1 business risk
- [ ] ≥3 decisions, each with reversibility
- [ ] ≥1 quantified metric (in Context & Problem)

### 5.5 Executability

- [ ] Every Functional Requirement is independently understandable by an engineer
- [ ] Every Business Rule can be covered by a regression test
- [ ] Every acceptance criterion is directly PM-verifiable

---

## 6. Versioning & lifecycle

```
draft → reviewing → approved → shipped → monitoring → done
                                                    ↘ deprecated
```

| Status | Meaning | Who can change | Entry condition |
|---|---|---|---|
| **draft** | Drafting, free to rewrite | Author | New |
| **reviewing** | Under review, detail-only edits | Author | Passes § 5 self-check |
| **approved** | Passed, enters development | Re-review via ADR | PM/Tech Lead double sign-off |
| **shipped** | Live, 30-day observation | — | Launch day |
| **monitoring** | Under observation | Author edits § 10 only | 24h after launch |
| **done** | Complete, goals met | Read-only | § 10 backfilled and all BRs `[confirmed]` |
| **deprecated** | Retired | Read-only, top note `> ⚠️ deprecated, see XXX` | Replaced or sunset |

**Archive timing**:
- `done` → `git mv` to `docs/plans/done/`
- `deprecated` → `git mv` to `docs/plans/archive/`

---

## 7. Relationship to other docs

```
PRD (this spec)
  ├── upstream: business needs, customer feedback, data insights
  ├── peer: docs/decisions/ (ADRs — detailed reasoning for major decisions)
  └── downstream:
       ├── docs/plans/<feature>-tech-design.md  (technical design, implementation detail)
       ├── business-rules-registry.md            (BR-* land here)
       └── tests/                                (generated from User Stories + acceptance)
```

**Key principle**:
- PRD answers **What** and **Why**.
- tech-design answers **How**.
- ADR answers **Why-not-the-alternative**.

**Avoid duplication**: one fact lives in one place. BR-1 detail lives in the registry, the PRD only references it; vendor choice reasoning lives in an ADR; schema lives in a migration.

---

## Appendix A: Templates

- Full: copy the skeleton from `prd-template.md`
- Lite: copy the skeleton from `prd-template-lite.md`

Lite vs Full decision: see § 1.

## Appendix B: AI assistance

- Writing a PRD: the `prd-author` skill applies this spec.
- Reviewing a PRD: the `prd-review` skill applies this spec.

## Appendix C: Revision log

| Version | Date | Change |
|---|---|---|
| v1.0 | <YYYY-MM-DD> | First version |
