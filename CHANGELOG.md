# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Distillation pipeline** — `methodology/distilling-from-real-projects.md` codifies how the kit grows from real-project experience (capture → 3-gate filter → routing table → promote via PR → release cadence), plus a `distillation-candidate` issue template (`from-dogfood` label) for fast capture. Makes "iterate by distilling from your project" a repeatable loop instead of a one-time origin story.

## [0.2.0] - 2026-06-07

### Added
- **Spec-Driven Development (SDD) spine + spec↔code traceability.** New `methodology/spec-driven-development.md` frames the kit's existing lifecycle as the SDD loop (Specify=PRD/registry, Plan=architecture, Implement=guards, Validate=S8 + the new check). New `audit:spec` (`check-spec-coverage.cjs`, wired into `harness`) closes the loop back to the spec: it fails CI when a `[confirmed]` business rule has no code trace (A), code references an `@br <ID>` not in the registry (B), or a `[pending]` rule is already in code (C). Convention: rules carry IDs in `business-rules-registry.md`; code/tests tag `@br <ID>`. Skips projects without a live registry. Directly targets doc↔code drift (the deeper drift beyond the kit's own self-claims).
- **`audit:tenant` is now a shipped script** (`check-tenant-scope.cjs`, wired into `harness`) — a heuristic scan for ORM queries (`findMany`/`aggregate`/`$queryRaw`/…) missing a `tenantId` filter. Closes the gap where S4 referenced `npm run audit:tenant` but no script shipped; the script layer now matches the semantic-layer `tenant-isolation-reviewer`. Gracefully skips projects with no ORM usage.

### Fixed
- Moved the CI **template** out of `.github/workflows/` to `.github/ci.example.yml`. GitHub runs every `.yml` under `workflows/` regardless of a `.example` name, so the template was executing on this repo and failing (its `cache: 'npm'` needs a lockfile this repo doesn't ship). Only the real `ci.yml` runs now.

## [0.1.0] - 2026-06-06

First public release.

### Core
- The full product lifecycle (10 stages), 11 governance skills (S1-S11), 2 PreToolUse guards with a 42/42 self-test, zero-dependency quality scripts, the `harness` aggregate gate, a CI template, an `install.mjs` cross-tool installer, a `demo` script, and two living-ledger registries.

### Evolvability (designed to grow without rotting)
- **Self-claim verification** — `check-self-claims.cjs` (wired into `harness`) asserts the stable numbers in the READMEs/badges (guard-test count, runtime-dependency count) equal reality, so they can never silently drift. Volatile internal counts (like the harness step count) are deliberately not advertised — the first screen says "all quality gates green".
- **MAP index anti-rot** — `check-map-index.cjs` (wired into `harness`) verifies every doc is linked from `MAP.md` and every `MAP.md` link resolves, so the single-page index can't drift from the file tree.
- **Safe downstream upgrades** — `install.mjs` writes a manifest (`<cfgdir>/.fsk-manifest.json`) of each file's hash as installed, and gains `--update`: untouched files are updated, customized files are never clobbered (new version written as `<file>.new`), new files are added, removed files are flagged as orphans.
- **Interface contract** — `STABILITY.md` declares what's stable for downstream (public npm-script names, guard stdin/exit protocol, quality-script CLI + graceful-skip, skill frontmatter, installer CLI + manifest schema) vs. internal. `contract.test.cjs` (`test:contract`, wired into `harness`) asserts all of §1, so breaking a contract fails CI here instead of in adopters' projects.

### Docs & community
- English `README.md` as the primary entry, Chinese moved to `README.zh-CN.md`, language switcher linking the two.
- First-screen verification metrics + status badges (license / node / runtime deps / guard tests / PRs welcome).
- Community health files: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `ROADMAP.md`, `CHANGELOG.md`, `MAP.md`.
- `.github/` issue templates + pull-request template; a real `.github/workflows/ci.yml` that runs the kit's own gates (dogfooding), alongside the `ci.example.yml` template.
- `.editorconfig`, `.gitattributes`; `package.json` real `repository` / `bugs` / `homepage` URLs + `engines` (Node ≥18).

### Hardened (doc/code drift fixes)
- Added a `test:integration` placeholder so `INTEGRATION_TEST=1 npm run harness` no longer errors with a missing script.
- `check-project-structure.js` whitelist includes the kit's own buckets + standard OSS community files, so the kit passes its own structure check.
- `install.mjs --help` exits 0 (was a usage-error exit when no `--target`).
- Repointed cross-references in `examples/ui-baseline.example.md` and `eval/README.md`; de-hardcoded the stale "314 internal links" dogfooding claim.
- Clarified docstrings where docs over-promised vs. the script's out-of-the-box behavior: `check-i18n-parity.cjs`, `install.mjs`, `S4-tenant-isolation-guard.md`.

[Unreleased]: https://github.com/huangjing0526/founder-saas-kit/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/huangjing0526/founder-saas-kit/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/huangjing0526/founder-saas-kit/releases/tag/v0.1.0
