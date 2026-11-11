# Allow `mqttOptions` as a function (last will from config)

## Context and goal
- bootstrap-client `init` connects MQTT before returning `queryConfig`.
- mqtt-dobot-bridge needs a `will` topic read from config, so it needs `queryConfig` before connecting.
- Goal: `mqttOptions` may be a function, called after bootstrap data and before `MqttClient.connect`.

## Decision
- Choose A: additive, non-breaking, one option, no new public function.
- B rejected: adds a public API and two-step wiring for the same result.
- Context type: `Omit<InitData<T>, "mqttClient">`; reuses the conditional types, so `queryConfig` is defined only if `T` has `configServerUri`.

## Acceptance criteria
1. Static `mqttOptions` object still reaches `MqttClient.connect`, merged with `clientId`.
2. A function receives `{ logger, data, httpClient, queryConfig }`.
3. The function is called once, after bootstrap data and before connect.
4. Its result (sync or async) is merged after `clientId`, so it can override it as before.
5. `queryConfig` in the context is `undefined` when `configServerUri` is missing.
6. A rejection from the function rejects `init` and does not connect.
7. `npm test`, lint and build pass; README documents the option.

## Design
- `src/types.ts`: add `MqttOptionsFactory<T>`; make `Options<T = BootstrapData>`; `mqttOptions?: MqttClientOptions | MqttOptionsFactory<T>`.
- `src/main.ts`: build `httpClient` and `queryConfig` before connecting; resolve options; pass to `connectMqttClient`.
- `init` options parameter becomes `Types.Options<T>`.
- Resolve with `typeof mqttOptions === "function" ? await mqttOptions(context) : mqttOptions`.
- Test runner: `node:test` with `tsx`; zero config, no new framework.
- Tests live in `tests/`, mirroring `src/` (`tests/main.test.ts`), per user rule.
- Factory runs after the `tcpBrokerUri` check (decided).
- vitest rejected: heavier. Plain `node --experimental-strip-types` rejected: `export * from "./types.js"` fails to resolve.
- Mocks: `mock.method(MqttClient, "connect", ...)` returns a fake with `underlyingClient.on`. `mock.method(globalThis, "fetch", ...)` serves `queryConfig`.
- Tests use `debugBootstrapData`, so no bootstrap fetch is needed.

## Implementation steps
### Increment 1: test setup
1. Add `tsx` devDependency and script `"test": "tsx --test \"tests/**/*.test.ts\""` in `package.json`.
2. Lint `tests/` too (`eslint src tests --fix`); `tsc` build stays `src/` only.
3. Add `tests/main.test.ts` with tests for static options and clientId merge (criterion 1).

### Increment 2: feature (test first)
4. Add failing tests for criteria 2-6 in `tests/main.test.ts`.
5. Add types in `src/types.ts`.
6. Implement resolution in `src/main.ts`; reorder client creation.

### Increment 3: docs
7. README: document the function form with a last-will example using `queryConfig`.

## Risks and open questions
- Release: minor bump with `npm version minor` after merge (not a step).
- `Options<T>` generic inference with a factory may need an explicit `init<MyData>` call; verify in a type test.
- Open: `tsx` glob expansion on Windows; accepted, since repo uses macOS/Linux.
- The repo has no CLAUDE.md; plan follows user rules (tests in `tests/`).
