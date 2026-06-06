# Business Rules Registry

> **Version**: 1.0.0
> **Created**: <YYYY-MM-DD>
> **Total rules**: 0 (this is an empty template — see `examples/business-rules-registry.example.md` for a filled-in one)

This registry is the single source of truth for every business rule in the system: extra validations, automatic side effects, state-transition constraints, hard-coded constants, format/numbering rules. It is the enforcement backbone for business-rule governance — **only implement what was asked, every new rule must be registered, every change summary must include a rule list.**

## Status legend

| Status | Meaning |
|---|---|
| [confirmed] | Logic is correct, keep as is |
| [confirmed-needs-doc] | Logic kept, but needs a detailed registry entry for the team |
| [pending] | Newly added, not yet signed off — cannot enter the main branch |
| [to-fix] | Has a problem, needs fixing; include a fix suggestion |

## Numbering scheme

`{MODULE-PREFIX}-{TYPE}-{NNN}`

- **MODULE-PREFIX**: a short code per module (e.g. ORDER / USER / CART / PAY / AUTH …). Define your own enum.
- **TYPE**:
  - `V` = Validation (extra checks on create/update)
  - `A` = Automatic behavior (side effects, auto-recycle/assign, cascades)
  - `C` = Constant (hard-coded business constants, thresholds, ceilings)
  - `F` = Format (data normalization / transformation)
  - `P` = Permission (data-scope rules beyond plain RBAC)
- **NNN**: a zero-padded three-digit sequence (001, 002, …).

Example: `ORDER-A-003`, `USER-C-001`, `PAY-F-002`.

## What counts as a "business rule" (needs registering)

| Type | Example | Register? |
|---|---|---|
| Extra validation on create/update | No duplicate appointment within ±2h for the same user | ✅ yes |
| Automatic side effect | Auto-update lastFollowedAt when a follow-up is created | ✅ yes |
| State-transition constraint | Only a draft quote can be edited | ✅ yes |
| Auto-recycle / auto-assign | Release to the pool after N hours without follow-up | ✅ yes |
| Hard-coded business constant | 72-hour recycle threshold, 100-record cap | ✅ yes |
| Format / transformation | Phone normalized to E.164 | ✅ yes |
| Numbering rule | `QT-20240101-001` format | ✅ yes |
| Required-field validation | name cannot be empty | ❌ no (schema layer) |
| Tenant isolation | tenantId in the where clause | ❌ no (infrastructure) |
| RBAC check | does the user have `leads:read` | ❌ no (infrastructure) |

## Unified table header

Every module section uses this exact header:

```
| 编号 / ID | 状态 / Status | 规则描述 / Rule | 触发条件 / Trigger | 可配置? / Configurable? | 代码位置 / Location (file:line) |
```

Each conclusion must carry a `file:line` reference or a runnable command — never assert from memory.

---

## Change log

| Date | Author | Change |
|---|---|---|
| <YYYY-MM-DD> | <name> | Initialized from the founder-saas-kit template |

---

## Module sections

> Add one `##` section per module. Below are 2-3 generic example rows showing the format; replace them with your own.

### 1. Order (ORDER)

| ID | Status | Rule | Trigger | Configurable? | Location (file:line) |
|---|---|---|---|---|---|
| ORDER-A-001 | [confirmed] | When status becomes `completed`, auto-write `completedAt = now()`; clear it when moving away from completed | POST/PUT `/api/orders` status=completed | No | `orders.routes.js:120` |
| ORDER-C-001 | [confirmed-needs-doc] | Bulk operations capped at 200 records per call | POST `/api/orders/batch-update` | No | `orders.routes.js:261` |

### 2. User (USER)

| ID | Status | Rule | Trigger | Configurable? | Location (file:line) |
|---|---|---|---|---|---|
| USER-F-001 | [confirmed] | Phone normalized to E.164 across `phone_raw / phone_e164 / phone_search` on write | POST/PUT `/api/users` | Country code from tenant config | `users.routes.js:72-81` |

<!--
Add more module sections as needed. Keep:
- The numbering scheme {MODULE}-{V/A/C/F/P}-{NNN}
- The four/three statuses
- The unified header
- The "what counts as a business rule" decision table
Every row must end with a file:line reference or a runnable command.
-->
