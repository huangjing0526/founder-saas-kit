---
title: North-Star Landing Rules
status: active
version: v1.0
---

# North-Star Landing Rules

> Turn your North-Star metrics into executable checks. When deciding, both humans and AI satisfy these rules first.
>
> **The framework**: North-Star metric → landing rule → executable check → priority adjudication.
> Pick a small number of North-Star metrics that matter for *your* product, then drive each one down into concrete, checkable rules.

---

## How to use this template

For each North-Star metric you choose:

1. **Name the metric** (the outcome you refuse to regress).
2. **Write the landing rules** — the concrete behaviors that, if followed, keep the metric healthy.
3. **Attach an executable check** to each rule — ideally something a script or CI can verify, otherwise a clear review/acceptance step.

The three sections below are **example metrics** to show the shape. Replace them with your project's North Stars.

---

## Example metric 1 — Doc sync *(example — swap for your North Star)*

| Landing rule | Executable check |
|--------------|------------------|
| After adding/changing API routes/services or schema, prompt to update the matching spec sections | Doc-sync trigger covers it; prompt immediately on detecting the change |
| After a requirement / interaction change, sync the PRD, the matching spec, and the UI standards | Complete doc updates before development is "done" |
| When a feature completes, mark it done in the PRD | Check at acceptance |

---

## Example metric 2 — Code minimalism *(example — swap for your North Star)*

| Landing rule | Executable check |
|--------------|------------------|
| State the reason before adding a new dependency | On any package-manifest change, ask for / state the necessity |
| Reuse existing components and API wrappers first | Search the project for a similar implementation before adding a new one |
| Avoid over-abstraction | Don't hoist single-module logic into a global util unless it's reused in **≥2 places** |

---

## Example metric 3 — Full test coverage *(example — swap for your North Star)*

| Landing rule | Executable check |
|--------------|------------------|
| Every new API must have a corresponding integration test | After backend dev completes, add or verify the test case |
| New pages / core components should have a component test | Add under the component-tests directory |
| Acceptance check-offs must attach evidence | Follow an evidence-chain rule; **no blind check-offs** |

---

## A few generically-useful rules

These hold regardless of project; keep them even when you swap the metrics above:

- **State the reason before adding a new dependency** — every dependency is a long-term maintenance and supply-chain cost.
- **Reuse first** — search for an existing component / wrapper / util before writing a new one.
- **Avoid over-abstraction** — only extract a shared abstraction once it's reused in **≥2 places**; premature abstraction is harder to undo than duplication.
- **New API must have a test** — and any change to a query's `where`/filter must have a test.
- **Acceptance check-offs must attach evidence** — no blindly ticking boxes; attach a `file:line`, a screenshot, or a runnable command.

---

## Priority

When rules conflict: **North-Star landing rules > other project rules > global rules.**
