# Fix Dependabot alerts (bootstrap-client)

## Context
- bootstrap-client (artcom/bootstrap-client, master at v7.1.0): 18 open Dependabot alerts, all transitive.
- No repo rules: no CLAUDE.md, no `.claude/rules/`; README has no release process.
- Read-only investigation (no shell available); paths read from `package-lock.json`, ranges checked by hand.
- Goal: lockfile-only refresh; no `package.json` edits, no `overrides`.

## Resolution per alert (all in range)
- `ws` 8.19.0 (<8.21.0), runtime: via `@artcom/mqtt-topping` -> `mqtt@5.14.1` (`ws ^8.18.3`, lock:2100).
- `ip-address` 10.1.0 (<=10.7.3), runtime: via `mqtt` -> `socks@2.8.7` (`ip-address ^10.0.1`, lock:2403).
- `brace-expansion` 1.1.12, dev: via `minimatch@3.1.5` (eslint); patched 1.1.x exists in range.
- `js-yaml` 4.1.1, dev: via eslint; patched 4.3.0+ in `^4`.
- `@humanfs/node` 0.16.6, dev: via eslint; fix 0.16.8 in `^0.16.x`.
- `picomatch` 4.0.3 and `flatted` 3.3.2, dev: eslint/tsx chain; both fixed within caret ranges.
- `@typescript-eslint/*` 8.53.1, dev: audit range 6.16.0-8.72.2; `typescript-eslint ^8.53.1` allows newer 8.x.
- npm reports `fixAvailable` true without `--force`, confirming no major bump.

## Implementation steps
- Branch off master per user convention (repo sets none): `fix/` prefix, e.g. `fix/dependabot-alerts`.
- Run `npm audit fix` (or `npm update` if it leaves residue); commit `package-lock.json` only.
- If something remains: `npm update <pkg>` for it; add `overrides` only if no in-range version exists (not expected).
- Review lockfile diff: only version/resolved/integrity changes, no `package.json` change.

## Tests
- No new unit tests: lockfile-only, no source change; existing suite covers regressions.

## Verification
- `npm audit` reports only the accepted minimatch residual (see acceptance criterion 1).
- `npm run lint` (note: it uses `--fix`; check `git status` for stray edits).
- `npm test`, then `npm run build`.
- After merge to master, Dependabot alerts auto-close (rescan can take minutes).

## Acceptance criteria
- 1. `npm audit` shows only the accepted residual: minimatch 10.x under `@typescript-eslint/typescript-estree` (GHSA-g3hv-75wg-m249, dev-only, no in-range fix; latest typescript-eslint 8.72.2 pins `^10`).
- 2. `ws` >=8.21.0 and `ip-address` >10.7.3 in lockfile.
- 3. Diff touches only `package-lock.json`.
- 4. Lint, test, build pass.
- 5. All 18 Dependabot alerts closed on GitHub.

## Risks and open questions
- Runtime deps (`ws`, `ip-address`) are bundled via lockfile only; consumers of the published lib resolve their own versions, so the lockfile fix does not reach them.
- Open: publish a patch release (`npm version patch`)? Not warranted by default; consumers get fixes on reinstall within ranges. Raising `mqtt-topping` minimum is not possible without a package.json change.
- Open: if `ws >=8.21.0` is not allowed by `mqtt` ranges after refresh, fall back to `overrides`.
- Caveat: could not run `npm ls`/`npm view`/`npm audit` here; the audit-fix claim comes from the caller's dry-run.
