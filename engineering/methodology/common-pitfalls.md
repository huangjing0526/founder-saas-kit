---
title: Common Pitfalls & Avoidance
status: active
version: v1.0
---

# Common Pitfalls & Avoidance

> Records error classes that recur or easily cause serious problems, plus how to avoid them — reference for development and code review.
>
> **The pitfall-recording template** (use this uniform structure for every new entry):
> **Error symptom + typical cause + case + avoidance checklist (checkboxes).**
> Prefer **executable check items** (the checkboxes) so they're directly usable in code review and self-test.

---

## 1. Empty-data and empty-state rendering

### Error symptom

- When an API returns `[]` or `null`, the table/list area still shows stale data or throws
- A dynamic metadata field that's `null`/`undefined` isn't rendered as `-`

### Typical cause

- The list doesn't normalize the response shape (e.g. reads `res.data.records` without a fallback), or the table has no empty-state branch
- Field rendering doesn't have a unified empty-value display

### Avoidance checklist

- [ ] List data: normalize with a fallback (e.g. `tableData = res?.data?.records ?? []`); distinguish "has rows" vs. an empty-state component
- [ ] Dynamic fields: render `null`/`undefined` uniformly as `-`, using a dedicated empty-value style
- [ ] Pages/components carry the loading / empty / error three states explicitly

---

## 2. API errors and loading state

### Error symptom

- On 4xx/5xx, the page shows no message or stays loading forever
- Repeated submit clicks cause duplicate requests

### Typical cause

- No catch handler surfacing the error to the user; loading flag never reset
- No guard against double submission

### Avoidance checklist

- [ ] All async requests: surface the error in `catch` (via an interceptor or a local toast), and **close loading in `finally`**
- [ ] Submit-type buttons: disable the button in the `loading` state to **prevent duplicate submission**
- [ ] Never silently swallow errors — log error context (user, tenant, action) before re-throwing on the backend

---

## 3. Deploy: dependency/migration drift causing a 502

### Error symptom

- The reverse proxy returns `502 Bad Gateway`
- The process manager shows the app's restart count spiking into the dozens/hundreds while `status=online` (actually a restart loop)
- The error log shows any of:
  - `ERR_MODULE_NOT_FOUND: Cannot find package 'xxx'`
  - A DB-client error like `The column 'xxx' does not exist in the current database`
  - `[startup failed] database table not ready`
- No process is listening on the app's port (the master never even listens, let alone the upstream)

### Typical cause

Deploy ran only `git pull` + build + reload, and **skipped** one or both of these:

| Step | Consequence of skipping |
|---|---|
| Install production dependencies (e.g. `npm install --omit=dev`) | Newly added runtime dependencies don't get installed |
| Run pending DB migrations (e.g. `migrate deploy`) | Schema drift — the client expects a column the DB doesn't have |

**Derived pitfall**: a dependency mis-placed in `devDependencies` — a server file imports it but it's in devDeps, so a production install with `--omit=dev` never installs it. (Real case: a runtime util's import lived in devDeps and triggered a 502.)

### Avoidance checklist

- [ ] **Deploy always goes through one consolidated build command** (install + client generate + migrate deploy + data-migrate + build), not hand-assembled separate commands
- [ ] Before adding an npm package, self-check: is it imported by any server-side file? Yes → `dependencies`; only test/build tooling → `devDependencies`
- [ ] After adding a migration, locally pass `migrate dev`, and before deploy confirm production `migrate status` shows "schema is up to date"
- [ ] 502 triage order: (1) read the error log for module-not-found / DB-client error code → (2) run the app as a single foreground instance to get the full stack (cluster logs truncate) → (3) check `migrate status` for pending migrations

---

## 4. Declaration-order / TDZ traps *(Vue `<script setup>` example — applies to any top-to-bottom-evaluated module)*

### Error symptom

- A whole area renders blank (list, detail, etc.)
- Console shows `ReferenceError: xxx is not defined` during setup
- No API error, no component 404 — just a blank frontend

### Typical cause

While **initializing a ref**, you call a function that **depends on a variable/computed declared later**. `<script setup>` executes in **written order**: `const x = ref(fn())` evaluates `fn()` immediately, and if `fn()` accesses a `computed`/`const` written **below**, it hits the Temporal Dead Zone (TDZ) / ReferenceError.

### Case (blank order list)

```javascript
// WRONG: getDefaultCreateForm() runs while orderCreateFormFields is not yet defined
function getDefaultCreateForm() {
  const form = { customerId: '', orderNo: '', status: 'pending', totalAmount: 0, items: [] }
  orderCreateFormFields.value.forEach(f => { /* ... */ })  // ReferenceError
  return form
}
const createForm = ref(getDefaultCreateForm())  // executes before orderCreateFormFields is declared
const orderCreateFormFields = computed(() => { /* ... */ })  // written below
```

### Correct approach

- **Initialize refs with literals or only already-declared variables.** For an initial value that depends on another computed/ref, assign it later on user action (opening a drawer, resetting a form).

```javascript
// CORRECT: initial value doesn't depend on anything declared below
const createForm = ref({ customerId: '', orderNo: '', status: 'pending', totalAmount: 0, items: [] })

function openCreate() {
  createForm.value = getDefaultCreateForm()  // generate from config when the user acts
}
```

### Avoidance checklist

- [ ] Every `ref( someFunction() )`: confirm `someFunction` only uses variables/computed **declared above**
- [ ] A "form default value" function that depends on field config: use `ref(static literal)`, then assign `getDefaultXxx()` inside `openCreate` / `resetForm`

---

## 5. Modal/drawer two-way binding *(Vue example — applies to any parent-controlled visibility)*

### Error symptom

- A drawer/dialog won't close, or its open state doesn't match expectation
- Console reports an undefined variable like `visible is not defined`

### Typical cause

- Visibility is controlled by a local variable that's never synced with the parent's two-way binding (`modelValue` + `update:modelValue`)
- A leftover undefined variable name (e.g. an old `visible`) is referenced directly inside the child

### Avoidance checklist

- [ ] Popup components: align with the parent via `props.modelValue` + `emit('update:modelValue', value)`
- [ ] "Load on open" logic: use `watch(() => props.modelValue, v => { if (v) loadXxx() })`, not an undefined variable

---

## Doc maintenance

- After fixing a new class of problem and confirming the root cause, add a section here using the uniform structure: **error symptom + typical cause + case + avoidance checklist**.
- Prefer **executable check items** (checkboxes) for easy use in code review and self-test.
