---
name: prd-review
description: Review a PRD against the project's PRD-SPEC (or generic best practices when no spec exists). Use when the user asks to review, check, or audit a PRD file or product requirements document. Also use proactively when the user shares a PRD file (e.g. "take a look at this PRD" / "how's this PRD"). Auto-detects a project-level PRD-SPEC.md and uses it as the rubric when present; otherwise applies the generic 10-section + Big 8 pitfall standard. Runs three passes — (1) structural compliance, (2) content quality, (3) cross-PRD consistency — and outputs a verdict + ranked fix list.
---

# PRD Review Skill

This skill reviews a PRD in three passes and produces a verdict + a severity-ranked fix list. Don't review PRDs ad-hoc — run the three passes for consistent, comprehensive feedback.

## When this skill triggers

- The user says: "review this PRD" / "check this PRD" / "audit this PRD".
- The user shares a `docs/plans/PRD-*.md` (or similar) path and asks for feedback.
- The user asks "how's this PRD / any problems?".
- Status transition: the user mentions moving a PRD from `draft → reviewing`.

## Don't trigger on

- "Write a PRD" → use prd-author instead.
- "Update this PRD with X" → use prd-author instead.
- General questions about PRD writing → just answer directly.

---

## Step 0 — SPEC routing (always first)

```bash
test -f docs/standards/PRD-SPEC.md && echo "PROJECT_SPEC" \
  || test -f ../../PRD-SPEC.md && echo "KIT_SPEC" \
  || echo "NO_SPEC"
```

- **KIT_SPEC / PROJECT_SPEC** → Read that `PRD-SPEC.md` and use IT as the review rubric (not the generic one below). The project's mandatory items and pitfall list take precedence; treat project red lines as Critical severity.
- **NO_SPEC** → Use the generic rubric below.

---

## Core workflow: three passes

### Pass 1 — Structural compliance

```
## Pass 1: Structural Compliance

✅ / ❌ Path: docs/plans/prds/PRD-<feature>.md (or project convention)
✅ / ❌ YAML frontmatter complete (title/module/status/version/owner/created/updated/shipped)
✅ / ❌ 10 sections present (Full) or 6 sections (Lite)
✅ / ❌ Section order correct
✅ / ❌ §7 subsections present (N/A items have a reason)
✅ / ❌ Every BR/F/US/R/D has a numeric ID
✅ / ❌ TL;DR ≤ ~150 words, no tech jargon
✅ / ❌ No leftover [NEEDS CLARIFICATION] (grep -rn "NEEDS CLARIFICATION" <path>)
```

Failures here = **Critical**. Still run Pass 2/3 for a full picture.

### Pass 2 — Content quality

```
## Pass 2: Content Quality

### Big 8 Pitfall Check

⚠️ / ✅ §7.3 Idempotency key design — <finding>
⚠️ / ✅ §7.3/7.8 Retry whitelist — <finding>
⚠️ / ✅ §7.5 Monitoring thresholds — <finding>
⚠️ / ✅ §7.6 Cost ceiling (money, not counts) — <finding>
⚠️ / ✅ §7.7 PII dual-layer — <finding>
⚠️ / ✅ §7.8 Third-party fallback — <finding>
⚠️ / ✅ §7.9 Rollback strategy — <finding>
⚠️ / ✅ §6 BR → registry link (if registry exists) — <finding>
[+ project-spec conditional items, e.g. tenant isolation / i18n, if the spec defines them]

### Completeness Check

✅ / ❌ User Stories ≥ 3 incl. error path
✅ / ❌ Non-Goals ≥ 2
✅ / ❌ Risks ≥ 3 incl. 1 business risk
✅ / ❌ Decisions ≥ 3 incl. reversibility
✅ / ❌ At least 1 quantified metric

### Quality Findings

- <Does the TL;DR really let a non-technical reader understand in 30s?>
- <Do F-N items really belong to the business layer, or is technical detail smuggled in?>
- <Are goals really quantifiable / verifiable?>
- <Are Non-Goals meaningful, or filler?>
- <Do decisions' "objections & responses" reflect real potential objections?>
- <Are risk responses actually executable?>
```

**Judgment guidance per Big 8 item:**

| Item | What "pass" looks like | Common "fail" |
|---|---|---|
| Idempotency | concrete key design + unique constraint | "ensures idempotency" with no key |
| Retry whitelist | lists specific error codes that retry | "retry on failure" with no whitelist |
| Monitoring | concrete numeric thresholds + alert channel + dashboard | "alert appropriately" or just a list of events |
| Cost ceiling | money ($/day) + threshold alert + block strategy | a call-count limit instead of money |
| PII dual-layer | storage (masked at write) + display (role masking + not in prompt) | mentions storage only |
| Fallback | every third-party has a fallback path | lists dependencies without fallback |
| Rollback | feature-flag name + disable-stops-it + DB reversibility | "can roll back" with no mechanism |
| BR registry | every BR has an anchor or "new [pending]" | BR written but not linked |

### Pass 3 — Cross-PRD consistency

```bash
grep -l "<feature keyword>" docs/plans/PRD-*.md docs/plans/done/PRD-*.md 2>/dev/null
grep -l "<feature keyword>" docs/decisions/*.md 2>/dev/null
grep -i "<rule keyword>" business-rules-registry.md 2>/dev/null
```

```
## Pass 3: Cross-PRD Consistency

### Related PRDs Found
- <path> — overlaps at §F-N; suggest cross-link

### Related ADRs Found
- <path> — this PRD's §7.N should reference it rather than redefine

### Related Business Rules
- <registry-anchor> — already exists; this PRD's §6 BR-N should link it

### Frontmatter Cross-Links
- ❌ / ✅ related_prds complete
- ❌ / ✅ related_decisions complete
```

---

## Verdict & fix list

```
## Verdict

Status recommendation: **draft → ❌ blocked / ⚠️ reviewing with concerns / ✅ ready for reviewing**

### Critical (must fix before reviewing)
<structural failures, key security/compliance, project red lines>

### Important (must fix before launch)
<content-quality issues, vague Big 8 items>

### Minor (can defer to V2)
<completeness gaps, wording>

### Praise
<good parts — review shouldn't be purely negative>

### Suggested next steps
1. Fix the Critical items, then status can move to reviewing
2. Cross-link related PRDs in frontmatter
3. ADR escalation suggestion: reversibility = low and cross-module → standalone ADR
4. Reminder: backfill post-ship tracking within 30 days
```

---

## Severity rubric

| Severity | Meaning | Action |
|---|---|---|
| **Critical** | Structural gap / key security-compliance / project red line (if the spec defines one) | Fix before reviewing |
| **Important** | Major content-quality defect / a vague Big 8 item | Fix before launch |
| **Minor** | Completeness gap / wording | Can defer to V2 |

---

## Tone

- Be specific, not vague. "§7.6 is a count not money" beats "cost is written wrong".
- Reference exact section number (and line if possible).
- Praise the good parts.

---

## Edge cases

### "PRD is in Lite format"
Pass 1 changes: 6 sections instead of 10, §5 condensed. Passes 2/3 unchanged but adapted.

### "No related PRDs / ADRs found"
Fine — write "No related artifacts found" in Pass 3. Don't fabricate.

### "PRD is already approved/shipped"
This skill is normally for draft→reviewing. For post-ship review:
- Focus on launch tracking (filled? do actuals match Goals?)
- Skip §1-9 structural review unless asked

### "Author insists a best-practice violation is fine"
Don't capitulate. State the rule and ask the user to either provide detail proving it isn't violated, or acknowledge the gap and add it as a known risk in §8.

---

## What this skill does NOT do

- Write or fix the PRD (use prd-author)
- Approve the PRD (only PM/Tech Lead can)
- Run code-level reviews
- Test the feature
