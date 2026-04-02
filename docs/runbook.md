# Operational Runbook

Day-to-day operations, release procedures, and troubleshooting for the hex-di monorepo.

> For incident response and debugging patterns, see the [Debug Playbook](./debug-playbook.md).

## Local Development

### First-run setup

```bash
git clone https://github.com/<owner>/hex-di.git
cd hex-di
pnpm install        # install all workspace dependencies
pnpm build          # build every package in dependency order
pnpm typecheck      # verify compilation
pnpm test           # run the full test suite
```

No environment variables are needed locally. See `.env.example` and `.npmrc.example` for CI-only variables.

### Common commands

| Command               | What it does                                  |
| --------------------- | --------------------------------------------- |
| `pnpm build`          | Build all packages via Turborepo              |
| `pnpm test`           | Run all tests across the workspace (Vitest)   |
| `pnpm test:watch`     | Watch mode for tests                          |
| `pnpm test:types`     | Run type-level tests (`vitest typecheck`)     |
| `pnpm typecheck`      | Type-check publishable packages               |
| `pnpm lint`           | Lint publishable packages                     |
| `pnpm lint:fix`       | Auto-fix lint violations                      |
| `pnpm format`         | Format all files with Prettier                |
| `pnpm format:check`   | Verify formatting without writing             |
| `pnpm clean`          | Remove all `dist/` and `coverage/` outputs    |
| `pnpm knip`           | Find unused exports, dependencies, and files  |
| `pnpm madge:circular` | Check for circular import dependencies        |
| `pnpm check:readmes`  | Verify every publishable package has a README |

### Working on a single package

```bash
pnpm --filter @hex-di/result test          # tests for one package
pnpm --filter @hex-di/result test:watch    # watch mode
pnpm --filter @hex-di/core typecheck       # type-check one package
pnpm --filter @hex-di/graph lint           # lint one package
```

## Release Process

### Overview

Releases are driven by semver git tags. The workflow:

1. Bump versions in `package.json` files for packages you want to release.
2. Ensure the package is listed in `publish.config.yaml`.
3. Commit and push to `main`.
4. Tag the commit: `git tag v0.4.0 && git push --tags`.
5. The `publish.yml` workflow triggers, runs the full CI, then publishes.

### publish.config.yaml

Only packages listed in `publish.config.yaml` are eligible for npm publishing. To approve a new package:

1. Verify it passes all checks locally (`pnpm typecheck && pnpm lint && pnpm test`).
2. Set its initial version in its `package.json`.
3. Add its npm name to `publish.config.yaml`.
4. Open a PR and let CI validate.

### Publish workflow behavior

- Triggered by pushing a semver tag (`v*.*.*`) or manually via GitHub Actions dispatch.
- Gates on the full CI workflow (lint, format, typecheck, audit, build, test, coverage).
- Skips packages whose current version is already on npm.
- Supports dry-run via manual dispatch to preview what would be published.
- Uses npm provenance attestations (`id-token: write`).

### Manual dry-run

Go to **Actions > Publish to npm > Run workflow** and check the "Dry run" box. This builds and checks versions without actually publishing.

## CI Pipeline

The CI workflow (`.github/workflows/ci.yml`) runs on every push and PR to `main`:

| Job       | What it checks                                                  |
| --------- | --------------------------------------------------------------- |
| lint      | ESLint across all publishable packages + README checks          |
| format    | Prettier formatting verification                                |
| typecheck | TypeScript compilation for publishable packages                 |
| audit     | `pnpm audit --audit-level=high`                                 |
| build     | Full monorepo build via Turborepo (after lint/format/typecheck) |
| test      | `pnpm test` — runs all tests across the entire workspace        |
| coverage  | `pnpm test -- --coverage` — enforces coverage thresholds        |

The `test` and `build` jobs depend on `lint`, `format`, and `typecheck`. Coverage depends on `test`.

### Coverage thresholds

- **Core packages** (core, graph, runtime): statements 80%, branches 70%, functions 90%, lines 80%
- **Result package**: lines 95%, branches 90%, functions 100%
- **All libs** (37 configs): statements 70%, branches 60%, functions 75%, lines 70%

Thresholds are defined per-package in `vitest.config.ts`.

## Observability

Recommended observability stack for HexDI applications:

| Concern               | Port / Package                              | Recommended Adapter                         |
| --------------------- | ------------------------------------------- | ------------------------------------------- |
| Structured logging    | `LoggerPort` (`@hex-di/logger`)             | Pino (`@hex-di/logger-pino`)                |
| Distributed traces    | Tracing ports (`@hex-di/tracing`)           | OTLP (`@hex-di/tracing-otel`)               |
| Error tracking        | `ErrorTrackerPort` (`@hex-di/core`)         | Sentry (`@hex-di/error-tracking-sentry`)    |
| Container diagnostics | `inspect()` (`@hex-di/runtime`)             | Built-in (no adapter needed)                |
| HTTP diagnostics      | `createDiagnosticRoutes()` (`@hex-di/hono`) | Built-in `/debug/health` and `/debug/ports` |

### Wiring example

```typescript
import { createDiagnosticRoutes } from "@hex-di/hono";
import { inspect } from "@hex-di/runtime";

// Mount diagnostic routes (dev/staging only)
app.route("/", createDiagnosticRoutes());

// Programmatic inspection
const snapshot = inspect(container);
console.log(snapshot.phase, snapshot.portCount);
```

### Reference implementations

- **Pino logging + Sentry:** `examples/pokenerve/api/src/graph/api-graph.ts`
- **Diagnostic routes:** `examples/hono-todo/src/adapters/inbound/hono/app.ts`
- **Console logging:** `examples/hono-todo/src/infrastructure/logger.ts`

## Dependency Management

### Dependabot

Dependabot is configured (`.github/dependabot.yml`) to open weekly PRs for:

- npm dependencies (grouped by: typescript, vitest, eslint, turbo)
- GitHub Actions versions

PRs are labeled `dependencies` and limited to 10 open at a time.

### Adding a new dependency

```bash
pnpm --filter @hex-di/<package> add <dependency>
```

For dev dependencies:

```bash
pnpm --filter @hex-di/<package> add -D <dependency>
```

For root workspace tools:

```bash
pnpm add -Dw <dependency>
```

### Lockfile

The lockfile (`pnpm-lock.yaml`) must always be committed. CI uses `pnpm install --frozen-lockfile` to ensure reproducible installs.

## Adding a New Package

1. Create the package directory under the appropriate workspace path:
   - `packages/` — core DI stack
   - `integrations/` — framework bindings (React, Hono)
   - `libs/<family>/<variant>/` — domain libraries (e.g. `libs/store/core/`)
   - `tooling/` — developer tools
2. Add a `package.json` with the `@hex-di/` scope and appropriate scripts.
3. Add a `tsconfig.json` extending the root config.
4. Add an `eslint.config.js` extending the shared config.
5. Add a `vitest.config.ts` with coverage thresholds.
6. Run `pnpm install` to register the workspace link.
7. Run `pnpm build` to verify the build order.

If the package should be published, add it to `publish.config.yaml` and ensure it has a README (`pnpm check:readmes` will flag missing ones).

## Troubleshooting

### pnpm lockfile mismatch

**Symptom:** `pnpm install` fails with frozen lockfile error.

**Fix:** Run `pnpm install` (without `--frozen-lockfile`) locally, commit the updated `pnpm-lock.yaml`.

### Build order issues

**Symptom:** Package fails to build because a dependency isn't built yet.

**Fix:** Ensure `turbo.json` has `"dependsOn": ["^build"]` for the task. Turborepo resolves the order from each package's `dependencies`/`devDependencies`.

### Circular dependencies

**Symptom:** `pnpm madge:circular` reports a cycle.

**Fix:**

- If the cycle is import-type-only (no runtime imports), add it to the `KNOWN_TYPE_ONLY` allowlist in `scripts/check-circular.sh`.
- If the cycle involves runtime imports, refactor to break the cycle (extract shared types to a separate file, use dependency inversion, etc.).

### Coverage threshold failures

**Symptom:** CI coverage job fails because a threshold is not met.

**Fix:**

- Add tests to improve coverage for the affected package.
- If the threshold is too aggressive for a new/experimental package, adjust it in the package's `vitest.config.ts`.

### ESLint max-lines violation

**Symptom:** `max-lines` error for a source file.

**Fix:** Split the file into smaller modules. The limit is 400 lines (excluding blank lines and comments). If a file cannot be split due to language constraints (e.g. TypeScript overload adjacency), add a documented override in the package's `eslint.config.js`.

### NODE_AUTH_TOKEN warnings

**Symptom:** `npm warn` about missing `NODE_AUTH_TOKEN` when running `pnpm install`.

**Fix:** This was resolved by removing the `${NODE_AUTH_TOKEN}` reference from `.npmrc`. The CI publish workflow injects auth tokens directly. If the warning reappears, check that `.npmrc` does not contain an `_authToken` line.
