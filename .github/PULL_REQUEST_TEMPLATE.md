<!-- Thanks for contributing! Keep PRs focused — one task per PR (mirrors the kit's G5 discipline). -->

## What & why

<!-- What does this change, and what problem does it solve? Link the issue if there is one (e.g. Closes #12). -->

## Gates — run these locally before requesting review

- [ ] `npm run test:guards` — guard self-tests pass (42/42)
- [ ] `npm run harness` — aggregate gate green (6/6)
- [ ] `npm run demo` — the 30-second demo still runs
- [ ] `npm run lint:docs-links` — 0 redirectable broken links (if you touched docs/links)

## Discipline check

- [ ] Staged only the files for this task (no `git add .`)
- [ ] Commit message is `type(scope): desc`
- [ ] New files are indexed in the relevant `README.md` / `MAP.md`
- [ ] Updated `CHANGELOG.md` under `[Unreleased]` if user-facing

## Notes for the reviewer

<!-- Anything non-obvious: a decision you made, a trade-off, something to double-check. -->
