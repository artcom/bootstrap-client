# Update dependencies and require Node 26 (bootstrap-client)

## Context and goal
- Bump all outdated packages in bootstrap-client and set the Node engine to 26.
- Local node is v26.13.0; no CI config, no `.nvmrc`.
- Work on branch `feature/update-deps-node-26`.

## Acceptance criteria
1. `engines.node` is `>=26.0.0` in `package.json`.
2. README lines 13 and 72 say Node.js 26.
3. `npm outdated` shows only `typescript` 7 held back.
4. `npm run lint`, `npm run build`, `npm test` pass.
5. `npm audit` shows no new findings.
6. `git diff` after `npm run lint` shows no unintended `--fix` changes.

## Design
- Breaking for consumers on Node 22-25: flag a major release; do not bump the version here.
- Targets: `@artcom/mqtt-topping` 5.0.1, `@types/node` ^26.6.6, `@types/ws` 8.18.2.
- Targets: `globals` 17.14.0, `prettier` 3.10.1, `typescript-eslint` 8.72.2.
- Targets: `eslint` 10.14.0 with `@eslint/js` 10.0.1 (they must move together).
- `typescript` goes to ^6.0.3; 7.0.2 is held back because `typescript-eslint` supports only <6.1.0.
- `@artcom/logger`, `eslint-config-prettier` and `tsx` are already latest.
- Check eslint 10 migration notes against `eslint.config.mjs` (flat config, `globals.browser`).
- Check TS 6 deprecations against `tsconfig.json` and `tsconfig.test.json`.
- TS 6 items: changed defaults, `esModuleInterop`, `allowSyntheticDefaultImports`, `moduleResolution`, `types` default.
- Keep the existing `tests/` layout.

## Steps (one commit each)
1. `package.json`: set `engines.node` to `>=26.0.0`; update README lines 13 and 72.
2. Bump `@types/node` to ^26; fix type errors.
3. Bump `@artcom/mqtt-topping`, `@types/ws`, `prettier`, `globals`; run tests.
4. Bump `eslint`, `@eslint/js`, `typescript-eslint`; adapt `eslint.config.mjs`.
5. Bump `typescript` to ^6.0.3; adapt `tsconfig*.json`.
6. Run `npm run format` and commit only if prettier changes files.
7. Verify: `npm run lint`, `npm run build`, `npm test`, `npm audit`.

## Risks
- eslint 10 config or rule changes may produce new lint errors.
- TS 6 may reject deprecated options in the tsconfigs.
- `lint` uses `--fix`, which can rewrite source.

## Open questions
- Add `.nvmrc` with `26`? Default: no.
- Release as 8.0.0 (major) after merge?
- Revisit TypeScript 7 once `typescript-eslint` supports it?
