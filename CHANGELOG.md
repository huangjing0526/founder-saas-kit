# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Evolvability: safe downstream upgrades.** `install.mjs` now writes a manifest (`<cfgdir>/.fsk-manifest.json`) recording the hash of each file as installed, and gains an `--update` mode: files you haven't edited get the new kit version, files you customized are never clobbered (the new version lands beside them as `<file>.new` for manual merge), newly-shipped files are added, and removed files are flagged as orphans (not deleted). Turns the kit from install-once into a tool you can keep pulling improvements from.
- **Evolvability: self-claim verification.** New `check-self-claims.cjs` (wired into `harness`) asserts the stable, meaningful numbers printed in the READMEs/badges — guard-test count and runtime-dependency count — equal reality, so they can never silently drift. (Deliberately does not assert volatile internal counts like the harness step count; the first screen now says "all quality gates green" instead of a number that changes every time a gate is added.)
- **Evolvability: MAP index anti-rot.** New `check-map-index.cjs` (wired into `harness`) verifies every doc (`.md`) is linked from `MAP.md` and every `MAP.md` link resolves — so the single-page index can't drift from the actual file tree as the kit grows.
- English `README.md` as the primary entry, with the Chinese version moved to `README.zh-CN.md` and a language switcher linking the two.
- First-screen verification metrics + status badges (license / node / runtime deps / guard tests / PRs welcome).
- Community health files: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `ROADMAP.md`, this `CHANGELOG.md`, and `MAP.md` (single-page repository index).
- `.github/` issue templates (bug report / feature request) and a pull-request template.
- A real `.github/workflows/ci.yml` that runs the kit's own gates on every PR/push (dogfooding), alongside the existing `ci.example.yml` template.
- `.editorconfig` and `.gitattributes` for consistent cross-contributor formatting.
- `package.json`: real `repository` / `bugs` / `homepage` URLs and an `engines` (Node ≥18) field.

### Fixed
- `test:integration` placeholder script added, so `INTEGRATION_TEST=1 npm run harness` no longer errors with a missing script.
- `check-project-structure.js` whitelist now includes the kit's own buckets and standard OSS community files, so the kit passes its own structure check.
- `examples/ui-baseline.example.md` and `eval/README.md` cross-references repointed to their correct relative paths.
- README dogfooding claim de-hardcoded (was a stale "314 internal links"; now phrased as "0 redirectable broken links").

### Changed
- Clarified docstrings where docs promised more than the script delivered out of the box: `check-i18n-parity.cjs` (single-file locale layout needs a `loadLocale` edit), `install.mjs` (only `lifecycle/` SKILL.md are installed; S1-S11 are methodology docs), and `S4-tenant-isolation-guard.md` (`audit:tenant` is a placeholder script you implement).

## [0.1.0] - 2026-06-06

### Added
- First public release: the full product lifecycle (10 stages), 11 governance skills (S1-S11), 2 PreToolUse guards with a 42/42 self-test, zero-dependency quality scripts, the `harness` aggregate gate, a CI template, an `install.mjs` cross-tool installer, a `demo` script, and two living-ledger registries.

[Unreleased]: https://github.com/huangjing0526/founder-saas-kit/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/huangjing0526/founder-saas-kit/releases/tag/v0.1.0
