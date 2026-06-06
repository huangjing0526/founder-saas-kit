---
name: prd-author
description: Author production-quality PRDs with a clear business/technical boundary. Use when the user asks to write, draft, create, or scaffold a PRD, product requirements document, product spec, or feature spec. Also use when the user describes a new feature or capability and the natural next step is documenting it formally — even without explicitly saying "PRD". Auto-detects a project-level PRD-SPEC.md and defers to it when present; otherwise applies a generic 10-section structure with a Big 8 pitfall check. Critical: enforces (1) the business/technical boundary (section 7 is the wall), (2) the Big 8 high-frequency-pitfall checks, (3) every BR linked to a business-rules registry when one exists.
---

# PRD Author Skill

This skill turns a feature idea or discussion into a structured PRD that follows the project's PRD-SPEC. The spec's "wall" (section 7) and mandatory items become mechanical steps below — don't write PRDs ad-hoc.

## When this skill triggers

- The user says: "write a PRD" / "draft a PRD" / "product requirements doc" / "feature spec" / "spec this out".
- The user describes a new feature/capability and the natural next step is formal documentation.
- The user asks to "organize the requirements" / "turn this discussion into a spec".

## Don't trigger on

- Bug fixes (use the issue tracker / a fix note).
- Style/copy tweaks (just do them).
- Schema-only changes (use a migration + decision record).
- A question about an existing PRD (use the prd-review skill instead).

---

## Step 0 — SPEC routing (always first)

Check whether the project ships its own PRD spec:

```bash
test -f docs/standards/PRD-SPEC.md && echo "PROJECT_SPEC" \
  || test -f ../../PRD-SPEC.md && echo "KIT_SPEC" \
  || echo "NO_SPEC"
```

- **KIT_SPEC / PROJECT_SPEC** → Read that `PRD-SPEC.md` and follow its rules over this skill's defaults. Project rules override generic defaults. Tell the user "this project has its own PRD spec; following it."
- **NO_SPEC** → Continue with the generic flow below.

The 12 steps below are the mechanical form of the spec. If the spec adds project-specific mandatory items (e.g. tenant isolation, i18n completeness), fold them into Step 7 and Step 9.

---

## Core workflow — 12 steps

### Step 1 — Decide Lite vs Full

Use **Lite** only if ALL hold:

- ≤ 3 User Stories
- No LLM / externally-billed dependency
- No DB migration (additive field-only is OK)
- No cross-module impact
- Not customer-facing in a strict i18n way

Default to **Full**. Tell the user your judgment and let them override.

### Step 2 — File path & name

- Path: `docs/plans/prds/PRD-<feature-name>.md` (or the project's PRD folder).
- Name: prefix `PRD-`, lowercase, kebab-case, no dates.
  - ✅ `PRD-checkout-notification.md`
  - ❌ `PRD-2026-05-Checkout.md` / `PRD-CheckoutNotify.md`

### Step 3 — YAML frontmatter

```yaml
---
title: <feature title — not the file name>
module: <project module enum value>
status: draft
version: v1.0
owner: <user-provided>
created: <today YYYY-MM-DD>
updated: <today YYYY-MM-DD>
shipped: null
related_prds: []
related_decisions: []
related_rules: []
---
```

### Step 4 — Extract context from conversation history

Before asking the user, scan the chat for:
- The business problem already discussed
- Numbers already mentioned (latency, conversion, error rate)
- Technical constraints already considered
- Decisions already made
- Existing PRDs / ADRs referenced

Pull these into the draft. Don't make the user repeat themselves.

### Step 5 — Fill the sections in order

**Full (10 sections):**

1. **TL;DR** — ≤ ~150 words, business language, no jargon
2. **Context & Problem** — problem + ≥1 quantified metric
3. **Goals & Non-Goals** — ≥2 Non-Goals (mandatory)
4. **User Stories** — ≥3 including ≥1 error path
5. **Functional Requirements** — F-1, F-2, … numbered
6. **Business Rules** — BR-1, BR-2, … each linked to a registry if one exists
7. **Technical Constraints** — the business/technical wall (see Step 6)
8. **Risks** — ≥3 including ≥1 business risk
9. **Decisions** — ≥3 each with reversibility (high/medium/low)
10. **Post-Ship Tracking** — backfilled post-ship

**Lite (6 sections):** TL;DR+context · Goals & Non-Goals · User Stories + Functional Requirements · Business Rules · Technical Constraints (condensed) · Post-Ship Tracking.

### Step 6 — Section 7 is the business/technical wall

While filling sections 1-6, if you find yourself writing any of the following, STOP and either remove it or move it to §7:

- Database table names, schemas, field types
- API endpoints, HTTP status codes
- Specific library/framework choices ("use BullMQ")
- Queue/cache/lock implementations
- Specific version numbers
- Code blocks longer than 10 lines

The TL;DR especially — rewrite anything technical in business language.

**Good (F-N stays business):**
> **F-3:** If the partner doesn't respond within 24 hours, the system re-enters the dispatch pool and notifies sales. A resend is not a new dispatch.

**Bad (technical leak):**
> F-3: On vendor error 30001/30002, trigger a queue retry, max 3, 30s backoff.

### Step 7 — §7 mandatory subsections

| Subsection | Must specify | Lite |
|---|---|---|
| 7.3 Data consistency | Idempotency strategy + key design + retry whitelist | ✅ §5.1 |
| 7.4 Performance | Concrete numbers (latency, throughput, concurrency) | ✅ §5.1 |
| 7.5 Observability | Specific events + alert thresholds + alert channel | — |
| 7.6 Cost | Per-day **monetary** ceiling (not call counts) | — |
| 7.7 Security & compliance | PII (storage + display), audit log, consent | — |
| 7.8 Third-party deps | List + fallback + timeout/retry for each | — |
| 7.9 Config & flags | Feature flag + gray release + rollback | ✅ §5.2 |
| 7.10 Data retention | Raw data + logs + PII retention periods | — |

If the project spec adds mandatory items (e.g. **7.1 tenant isolation** for multi-tenant, **7.2 i18n completeness** for customer-facing multi-language), include them here. If a subsection genuinely doesn't apply, write `N/A — <reason>`. Never silently omit.

### Step 8 — `[NEEDS CLARIFICATION]`, don't guess

For any unspecified value (default, ceiling, prerequisite state, login method…), insert `[NEEDS CLARIFICATION: <question>]` inline instead of assuming. The marker must be greppable. A PRD with any unresolved marker cannot enter development.

### Step 9 — Business rules link to a registry if one exists

```bash
test -f business-rules-registry.md && echo "HAS_REGISTRY" || echo "NO_REGISTRY"
```

- **HAS_REGISTRY** → Search for related existing rules. If reusing, link to the anchor. If new, mark `Status: [pending]` and remind the user to register it.
- **NO_REGISTRY** → Suggest creating one from the kit template at `../../../../engineering/registries/business-rules-registry.template.md` if the project has ≥3 BRs.

### Step 10 — Big 8 pitfall check

Before declaring the draft complete, verify each is addressed:

1. **Idempotency** — §7.3 has a concrete key design
2. **Retry whitelist** — §7.3 or §7.8 lists which error codes trigger retries
3. **Monitoring thresholds** — §7.5 has specific numbers + alert channel
4. **Cost ceiling** — §7.6 is a monetary amount, not a request count
5. **PII dual-layer** — §7.7 addresses both storage and display layers
6. **Third-party fallback** — §7.8 has a fallback row for every dependency
7. **Rollback strategy** — §7.9 explains how to disable the feature in production
8. **BR linkage** — every BR in §6 links to a registry entry (when one exists)

Plus any project-spec conditional items (tenant isolation, i18n). If any is missing or vague, fix before handing back.

### Step 11 — Validate

Final pass:
- TL;DR ≤ ~150 words, no tech jargon
- Every BR/F/US/R/D has a numeric ID
- All §7 subsections filled or `N/A — reason`
- Decisions have a reversibility marker
- No leftover `[NEEDS CLARIFICATION]` (or, if any remain, flag them loudly to the user)

### Step 12 — Output to the user

Present:

1. The path of the created PRD file
2. Lite vs Full decision and why
3. Big 8 check status — pass / needs review per item
4. Unfilled placeholders / `[NEEDS CLARIFICATION]` still needing input
5. "You decide" flags — places the user said "you pick" or implicit decisions
6. Next steps: registry update if new BRs; ADR if low-reversibility decisions

---

## Common pitfalls

### Pitfall: "TL;DR is too technical"
Rewrite in business language. It should make sense to a non-engineer.

### Pitfall: "Functional Requirements describe HTTP responses"
Split: F-N in §5 = business behavior; HTTP/error codes in §7.8.

### Pitfall: "Cost is in call counts not money"
Wrong: `500 API calls/day ceiling`. Right: `$X/day cost ceiling`.

### Pitfall: "Non-Goals missing"
Push back. Ask:
- "What user group are we NOT serving?"
- "What feature will V2 add that V1 doesn't?"
- "What existing system are we NOT replacing?"

### Pitfall: "Decisions have no reversibility"
Force the assessment:
- high: change next sprint via config
- medium: requires migration but data not lost
- low: requires data migration / breaks API / locks in a vendor

Reversibility = low decisions REQUIRE "objections & responses" filled and may trigger ADR escalation.

### Pitfall: "BR added without registry link"
If the project has a registry, every BR must link. New BRs marked `[pending]` cannot enter development.

---

## Updating an existing PRD

- Bump `version` (v1.0 → v1.1 for revisions, v2.0 for major rewrites)
- Update the `updated` date
- Add an entry to the revision log
- If status is `approved` or beyond, ask whether this is a revision or requires re-review

---

## Tone

- Sections 1-6: business language for stakeholders
- Sections 7+: technical language OK, but still "what must be true", not "how we'll do it"
- Numbers > adjectives. "30 minutes" not "low". "30%" not "fairly high".
