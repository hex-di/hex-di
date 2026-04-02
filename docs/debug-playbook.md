# Debug Playbook

Incident response patterns and debugging guides for the hex-di monorepo.
Complements the [Operational Runbook](./runbook.md) which covers day-to-day procedures.

## CI Flake Triage

### Test passes locally, fails in CI

- **Timing-dependent tests**: Look for `setTimeout`, `Date.now()`, `performance.now()`. Use `@hex-di/clock` virtual clock in tests instead of real time.
- **Port conflicts**: CI runs tests in parallel. Ensure no tests bind to fixed network ports.
- **Memory pressure**: CI runners have limited memory. Check for tests creating large graphs without disposal (`scope.tryDispose()`).
- **Turborepo cache staleness**: Run `turbo run build --force` to rule out stale cache artifacts.

### Typecheck passes locally, fails in CI

- **TypeScript version mismatch**: Verify `pnpm-lock.yaml` is committed. CI uses `pnpm install --frozen-lockfile` so any local-only version drift will cause failures.
- **Stale build artifacts**: Ensure `"dependsOn": ["^build"]` is correct in `turbo.json` for the failing package. A package may typecheck locally against stale `.d.ts` files that CI rebuilds fresh.
- **Platform-specific types**: Node.js type definitions differ across OS. Check that `@types/node` version is pinned in the lockfile.

## Release Rollback

### Rolling back an npm publish

1. Identify the bad version: `npm view @hex-di/<pkg> versions --json`
2. Deprecate (soft rollback): `npm deprecate @hex-di/<pkg>@<version> "reason"`
3. Unpublish (within 72h of publish): `npm unpublish @hex-di/<pkg>@<version>`
4. Tag a new patch version with the fix and re-publish.

### Rolling back a git tag

1. Delete remote tag: `git push origin :refs/tags/v<version>`
2. Delete local tag: `git tag -d v<version>`
3. The publish workflow will not re-trigger without a tag push.

### Partial publish failure

If some packages published but others failed mid-workflow:

1. Check the Actions log to identify which packages succeeded.
2. For packages that failed, fix the issue and re-run the workflow via manual dispatch.
3. Already-published packages are skipped automatically (version check against npm registry).

## Production Container Debugging

### Diagnosing resolution failures

Use `tryResolve()` which returns `Result<T, ContainerError>` instead of throwing:

```typescript
const result = container.tryResolve(SomePort);
result.match(
  service => {
    /* success */
  },
  error => {
    // error._tag is one of:
    // - "FactoryError"        → adapter factory threw
    // - "CircularDependency"  → cycle in the graph
    // - "DisposedScope"       → scope already disposed
    // - "ScopeRequired"       → scoped service resolved at root
    console.error(`Resolution failed: ${error._tag}`, error);
  }
);
```

### Diagnosing scope leaks

- **ScopeRequiredError**: A scoped service was resolved from the root container. Wrap the resolution in `container.createScope()`.
- **DisposedScopeError**: Code is resolving from a scope that was already disposed. Check that `scope.tryDispose()` isn't called before all async work completes.
- **Pattern**: Always wrap scope creation in try/finally:

```typescript
const scope = container.createScope();
try {
  const service = scope.resolve(ScopedPort);
  await service.doWork();
} finally {
  await scope.tryDispose();
}
```

### Diagnosing factory errors

If a `FactoryError` occurs, the cause is in the adapter's `factory` function. Enable tracing to see which factories are invoked and in what order:

```typescript
import { createConsoleTracer } from "@hex-di/tracing";
// Attach tracer to see resolution order in stdout
```

## Type-Level Debugging

### "Type instantiation is excessively deep"

Usually caused by deeply nested graph composition (>30 adapters in one `.provide()` chain).

**Fix**: Split into sub-graphs and merge:

```typescript
const infraGraph = GraphBuilder.create().provide(loggerAdapter).provide(configAdapter).build();

const appGraph = GraphBuilder.create().merge(infraGraph).provide(userServiceAdapter).build();
```

### HEX error codes in type messages

These are compile-time errors embedded in TypeScript error messages:

| Code   | Meaning             | Action                                        |
| ------ | ------------------- | --------------------------------------------- |
| HEX001 | Duplicate adapter   | Two `.provide()` calls for the same port      |
| HEX002 | Circular dependency | Trace the cycle from the error message        |
| HEX003 | Captive dependency  | Long-lived service depends on short-lived one |
| HEX006 | Self dependency     | An adapter requires its own port              |
| HEX008 | Missing adapter     | A required port has no provider in the graph  |

Full list: [spec/ERROR_CODES.md](https://github.com/leaderiop/hex-di/blob/main/spec/ERROR_CODES.md)

### Opaque type errors from generic adapters

If TypeScript shows a massive type expansion instead of a readable error, check:

1. That `strict: true` is enabled in `tsconfig.json`.
2. That you're using TypeScript 5.0+.
3. That the adapter's `requires` array uses `as const` if needed.

## Dependency Issues

### Phantom "module not found" after adding a new package

1. Verify `pnpm install` ran after adding the workspace dependency.
2. Verify the dependency package has `"main"` or `"exports"` in its `package.json`.
3. Verify the dependency was built: `pnpm --filter @hex-di/<dep> build`.
4. Check for typos in the workspace protocol: `"@hex-di/core": "workspace:*"`.

### pnpm peer dependency warnings flooding the console

The monorepo uses `pnpm.overrides` in root `package.json` to pin shared deps. If a new library introduces a peer dep conflict, add it to `pnpm.overrides`.

### Knip reports false positives for new exports

Knip may flag exports that are consumed by other workspace packages but not yet built. Run `pnpm build` first, then `pnpm knip`.

## Observability Debugging

### Tracing spans not appearing

- Verify the tracer is registered in the graph and resolved before the operation.
- Console tracer has `minDurationMs` — spans shorter than the threshold are silently dropped.
- For distributed tracing, verify W3C `traceparent` header is propagated through HTTP calls.

#### Tracing sanity-check checklist

When tracing spans are missing or incomplete, walk through these checks in order:

1. **Adapter registered?** Confirm the graph registers a real tracer adapter (Jaeger, Zipkin, DataDog), not the `NoOp` default. Inspect the graph with `container.inspect()` and look for `TracerPort`.
2. **Exporter endpoint reachable?** Verify the exporter URL (e.g., `http://localhost:14268/api/traces` for Jaeger) is accessible from the application. Use `curl` or `fetch` to confirm connectivity.
3. **Batch processor flushing?** The OTel batch processor buffers spans and flushes on interval. If the process exits before the flush interval, spans are lost. Call `tracerProvider.forceFlush()` or `tracerProvider.shutdown()` before exit.
4. **Debug logging enabled?** Set `OTEL_LOG_LEVEL=debug` (for OTel SDK) or enable verbose mode on the exporter to see span export attempts and errors.
5. **Span context propagating?** For cross-service traces, verify the `traceparent` header is set on outgoing requests and extracted on incoming requests. Log headers at service boundaries to confirm.
6. **Scope correct?** A tracer resolved from one scope won't automatically instrument operations in another scope. Ensure the tracer is resolved from the appropriate container scope.

See [Observability Map](./observability.md) for the full package landscape.

### Logger output missing

- Check log level configuration. Production defaults may suppress debug/info levels.
- Verify the logger adapter backend matches expectations (pino vs winston vs bunyan each have different default behaviors).
- Ensure the logger port is resolved from the correct scope — a scoped logger in one scope won't appear in another scope's output.

### DevTools not connecting

- `@hex-di/devtools-ui` requires the container to expose inspection metadata. Verify the graph was built with inspection enabled.
- Check that the browser extension or panel is targeting the correct container name.

## CI Job Flake Budget

The CI workflow (`ci.yml`) fans out into ~18 parallel/serial jobs that all feed into the `ci-success` aggregation. Understanding flake risk per job helps prioritize investigation:

| Job                           | Flake Risk | Typical Cause                                     | Mitigation                                                    |
| ----------------------------- | ---------- | ------------------------------------------------- | ------------------------------------------------------------- |
| `audit`                       | Medium     | npm registry downtime or transient 5xx            | Retry; `pnpm audit` is network-dependent                      |
| `e2e`                         | Medium     | Playwright browser launch timing, port conflicts  | Increase timeouts; use `--retries 1`                          |
| `mutation`                    | Low-Medium | Stryker timeouts on complex packages (30 min cap) | Increase timeout per package if needed; runs on schedule only |
| `secret-scan`                 | Low        | Gitleaks version mismatch                         | Pin action version                                            |
| `lint`, `format`, `typecheck` | Very Low   | Deterministic; rarely flakes                      | No action needed                                              |
| `test`                        | Low        | Occasional timeout on heavy test suites           | 15-min timeout is generous; check for slow test isolation     |
| `link-check`                  | Low        | Only checks internal links; no network            | No action needed                                              |
| `docs-api`, `openapi-check`   | Very Low   | Deterministic                                     | No action needed                                              |

**Flake budget target:** Fewer than 1 flake per 50 CI runs. If a job flakes more than 2% of runs, investigate and fix.

**Non-blocking track consideration:** Mutation testing already runs separately (scheduled + PR path-filtered). If `audit` flakes consistently, consider moving it to a non-blocking informational job and relying on the weekly `dev-audit.yml` scheduled workflow for comprehensive scanning.

## Related

- [Flake Triage](./guides/flake-triage.md) — identifying, quarantining, and resolving flaky tests
- [Test Pyramid](./guides/test-pyramid.md) — which test tier each test belongs to
