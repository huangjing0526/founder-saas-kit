# Stability & Interface Contract

This kit is meant to be **copied into your project and upgraded over time** (`install.mjs --update`). For that to be safe, some surfaces are **contracts**: things downstream projects and tools depend on, which won't change without a major version bump. Everything else is internal and may change anytime.

This is what SemVer means *for this kit*. A change that breaks anything in §1 is a **breaking change** (major bump). Adding to it is a minor bump. Changing §2 is never breaking.

The contracts in §1 are enforced by `engineering/contract.test.cjs` (`npm run test:contract`, also wired into `harness`) — so a refactor that breaks one fails CI instead of silently breaking adopters.

---

## 1. Stable (won't break without a major version bump)

### 1.1 Public npm script names
Downstream wires CI to these names. Renaming one is breaking.

| Script | Contract |
|---|---|
| `lint:secrets` · `lint:docs-links` · `lint:schema` · `lint:migration` · `lint:i18n-parity` · `audit:tenant` · `audit:spec` | each runs a `check-*` script; exit 0 = pass/skip, 1 = fail |
| `check:structure` | exit 0 = clean / warn-only, 1 = strict violation |
| `harness` | aggregate gate; exit 0 = all green, 1 = any step failed |
| `test:guards` | guard self-test; exit 0 = all pass |
| `install:claude` · `install:codex` · `install:cursor` | thin wrappers over `install.mjs` |

### 1.2 Guard stdin/exit protocol (PreToolUse hooks)
Claude Code (and any caller) feeds a JSON event on **stdin**; the guard signals via **exit code**.

- **Input**: JSON with `tool_input` — `{ "tool_input": { "command": "..." } }` for the bash guard, `{ "tool_input": { "file_path": "..." } }` for the edit guard.
- **Exit code**: `2` = block (command/edit is rejected; stderr is fed back to the agent), `0` = allow.
- **Fail-open**: any internal error or unparseable stdin → exit `0` (a guard bug must never wedge the agent).
- **Override env**: `GUARD_OFF=1` (absolute tier), `GUARD_ALLOW_DEPLOY=1` (authorized-deploy tier). Prefix `GUARD_` is stable.

### 1.3 Quality-script CLI contract
Every `check-*` script:
- takes the **target path as the first non-`--` argument**, defaulting to `cwd`;
- **skips gracefully (exit 0)** when the thing it checks doesn't exist (no locales dir, no docs, etc.) — so it's safe to wire into any project;
- uses exit `0` = pass/skip, `1` = fail (a `--strict`/`--warn` flag may modulate, documented per script).

### 1.4 Skill frontmatter
Every installable skill (`lifecycle/**/SKILL.md`) has YAML frontmatter with:
- `name`: lowercase-kebab (`^[a-z0-9][a-z0-9-]*$`) — `install.mjs` uses it for the install path;
- `description`: non-empty.

### 1.5 `install.mjs` CLI + manifest
- Flags: `--target` (required), `--tool claude|codex|cursor`, `--update`, `--dry-run`, `--force`.
- Manifest at `<target>/<cfgdir>/.fsk-manifest.json`, shape: `{ kit, kitVersion, tool, files: { "<relpath>": "<sha256>" } }`. `--update` reads it to decide update vs. preserve. Downstream **commits** this file.

---

## 2. Internal (may change anytime, not a contract)

- The **set** of checks/skills/guards (new ones added, weak ones merged) — the *names above* are stable, the *roster* grows.
- Script internals, regexes, thresholds, and the "configurable" blocks inside each script.
- Doc wording, file layout **within** a bucket, prose, examples, the exact harness step list and its count.
- Anything under `examples/`, `ops/`, `lifecycle/*/` content (these are references you fork, not an API).

> Rule of thumb: if your project **invokes it by name** (a script, a flag, a frontmatter key, the guard protocol), it's in §1. If you **read it and adapt it**, it's §2.
