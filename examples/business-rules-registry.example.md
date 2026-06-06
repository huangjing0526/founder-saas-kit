# Business Rules Registry — Filled Example

> **Version**: 1.0.0
> **Created**: 2026-01-15
> **Total rules**: 22 (confirmed 9 / confirmed-needs-doc 9 / pending 3 / to-fix 1)
>
> This is a **worked example** for a generic multi-tenant CRM + storefront. It shows what a registry looks like once it's filled in. Copy `registries/business-rules-registry.template.md` to start your own; use this file only as a reference for density and tone. All names here are illustrative.

## Status legend

| Status | Meaning |
|---|---|
| [confirmed] | Logic is correct, keep as is |
| [confirmed-needs-doc] | Logic kept, documented here for the team |
| [pending] | Newly added, not yet signed off — cannot enter the main branch |
| [to-fix] | Has a problem, needs fixing |

## Numbering scheme

`{MODULE-PREFIX}-{TYPE}-{NNN}` — TYPE: `V`=validation `A`=auto-behavior `C`=constant `F`=format `P`=permission.
Module prefixes used here: CUST / ORDER / CART / PAY / APPT / FU / USER / SYS.

## What counts as a business rule (needs registering)

Extra validation · automatic side effect · state-transition constraint · auto-recycle/assign · hard-coded constant · format/transformation · numbering rule → **register**.
Required-field validation · tenantId isolation · RBAC check → **don't register** (infrastructure).

---

## Change log

| Date | Author | Change |
|---|---|---|
| 2026-01-15 | Founder | Bulk-imported from a hidden-rules audit |
| 2026-02-03 | Founder | Added cart abandonment + payment idempotency rules |
| 2026-02-20 | Founder | Customer auto-recycle confirmed; CUST-A-004 marked to-fix |

---

## 1. Customer (CUST)

| ID | Status | Rule | Trigger | Configurable? | Location (file:line) |
|---|---|---|---|---|---|
| CUST-F-001 | [confirmed] | Customer phone normalized into `phone_raw / phone_e164 / phone_search` on write; country code taken from the tenant's default country | POST/PUT `/api/customers` | Country code from tenant config | `customers.routes.js:72-81` |
| CUST-V-001 | [confirmed] | Duplicate check on create; a duplicate returns 409 | POST `/api/customers` | Dedup field configurable (tenant config) | `customers.routes.js:1450-1498` |
| CUST-P-001 | [confirmed-needs-doc] | A user holding ≥ `maxCustomersPerUser` (default 100) cannot claim/create/transfer-in more | POST `/api/customers`, claim, transfer | Yes (tenant config), default 100 | `customers.routes.js:422-427` |
| CUST-A-001 | [confirmed-needs-doc] | Releasing a customer to the public pool also nulls the ownerId of its linked opportunities and tasks | POST `/api/customers/:id/release` | No | `customers.routes.js:1778-1794` |
| CUST-A-002 | [confirmed] | "Delete" is a soft delete: only sets `deletedAt = now()`, does **not** change status (so a restored record isn't hidden by a `status != churned` filter) | DELETE `/api/customers/:id` | No | `customers.routes.js:2069` |
| CUST-A-003 | [confirmed-needs-doc] | On create, auto-set `lastFollowedAt = now()` (this is the recycle-timer start point) | POST `/api/customers` | No | `CustomerService.js:118-119` |
| CUST-A-004 | [to-fix] | Recycle re-assignment queries `status = 'inactive'` customers, but recycling doesn't change status, so it can match non-target records → decision: set an explicit recycled-status marker to distinguish targets | cron, `enableAutoReassignAfterRecycle=true` | Yes | `autoRecycle.job.js:164-189` |
| CUST-P-002 | [confirmed] | Public-pool customer phone/email are **force-masked** for everyone except the current owner; admin and the original creator also see masked | all customer read endpoints + export | No (compliance hard rule) | `maskSensitive.js`; `customers.routes.js` |

## 2. Order (ORDER)

| ID | Status | Rule | Trigger | Configurable? | Location (file:line) |
|---|---|---|---|---|---|
| ORDER-F-001 | [confirmed] | Order number format `ORD-YYYYMMDD-NNN`, sequence resets daily per tenant | POST `/api/orders` | No | `orderNumber.service.js:14-32` |
| ORDER-A-001 | [confirmed] | When status becomes `completed`, auto-write `completedAt = now()`; clear it when moving away from completed | POST/PUT `/api/orders` | No | `orders.routes.js:396-397` |
| ORDER-V-001 | [confirmed] | An order can only be cancelled from `pending` or `confirmed`; cancelling a `shipped`/`completed` order returns 422 | PUT `/api/orders/:id/cancel` | No | `orders.routes.js:441-455` |
| ORDER-C-001 | [confirmed-needs-doc] | Bulk operations capped at 200 records per call | POST `/api/orders/batch-update` / `/batch-delete` | No | `orders.routes.js:261, 299` |
| ORDER-A-002 | [confirmed-needs-doc] | Creating a paid order auto-bumps the linked customer to the `won` status; if all paid orders later leave the paid state, the customer auto-reverts to `active` | order status change | No | `customerStatusRecompute.js` |

## 3. Cart (CART)

| ID | Status | Rule | Trigger | Configurable? | Location (file:line) |
|---|---|---|---|---|---|
| CART-C-001 | [confirmed-needs-doc] | A cart with no activity for 30 days is auto-archived (items preserved, hidden from the active list) | cron `0 4 * * *` | Yes (tenant config), default 30d | `cartCleanup.job.js:21-40` |
| CART-A-001 | [confirmed-needs-doc] | Reducing a line item to quantity 0 removes the line; an empty cart is not deleted, just shown empty | PUT `/api/cart/items/:id` | No | `cart.routes.js:88-96` |
| CART-V-001 | [pending] | Adding an out-of-stock product to the cart is blocked with a friendly message; a product that goes out of stock after being added stays but is flagged at checkout | POST `/api/cart/items` | No | `cart.routes.js:54` |

## 4. Payment (PAY)

| ID | Status | Rule | Trigger | Configurable? | Location (file:line) |
|---|---|---|---|---|---|
| PAY-A-001 | [confirmed] | Payment is idempotent on `idempotency_key = pay_{orderId}_{attempt}`; a duplicate request returns the existing transaction instead of charging again. Unique constraint at the DB layer | POST `/api/payments` | No | `payments.routes.js:60-88`; migration `add_payment_idem_unique` |
| PAY-C-001 | [confirmed] | Provider retry whitelist: only gateway error codes `5xx`, `rate_limited`, `timeout` trigger a retry (max 3, exp backoff); decline/insufficient-funds fail fast | payment webhook + retry job | No | `paymentRetry.job.js:18-34` |
| PAY-C-002 | [pending] | Per-tenant per-day refund ceiling $5,000; above it refunds require manual ops approval | POST `/api/payments/:id/refund` | Yes (tenant config), default $5,000 | `payments.routes.js:210` |

## 5. Appointment / Follow-up (APPT / FU)

| ID | Status | Rule | Trigger | Configurable? | Location (file:line) |
|---|---|---|---|---|---|
| APPT-C-001 | [confirmed-needs-doc] | Appointment conflict-check window hard-coded to 2 hours (no two meetings for the same user within ±2h) | POST/PUT `/api/appointments` (type=meeting) | No | `appointments.routes.js:27` |
| APPT-A-001 | [confirmed] | When status becomes `completed`, auto-write `completedAt = now()`; reset it when moving away | POST/PUT `/api/appointments` | No | `appointments.routes.js:396-397` |
| FU-V-001 | [pending] | An in-person follow-up requires both a photo and GPS coordinates; missing either is rejected with 400. Reverse-geocode failure falls back to coordinates and does not block | POST `/api/followups` (method ∈ visit/in_person) | No | `checkin.service.js`; `followup.routes.js` |
| FU-A-001 | [confirmed-needs-doc] | Creating any follow-up auto-updates the parent customer's `lastFollowedAt = now()` (resets the recycle timer) | POST `/api/followups` | No | `followup.routes.js:142` |

## 6. System (SYS)

| ID | Status | Rule | Trigger | Configurable? | Location (file:line) |
|---|---|---|---|---|---|
| SYS-F-001 | [confirmed] | List views mask phone numbers: keep country code + first 2 / last 4 digits, middle fixed `****` (e.g. `+1 50****1485`). Display-only; the real number is kept for dialing/copy/dedup | all list pages (web + mobile) | No | `maskPhone.js`; entity card components |

<!--
Notes for readers of this example:
- 22 rows span all five TYPE codes (V/A/C/F/P) across 6 modules.
- Statuses are mixed on purpose: confirmed / confirmed-needs-doc / pending / to-fix
  so you can see how each renders.
- Every row carries a file:line (illustrative) — your real registry must too.
- This stays small on purpose. A real mature product can grow to hundreds of rules
  across dozens of module sections plus a long change log; keep the same header,
  numbering, and "what counts as a business rule" discipline throughout.
-->
