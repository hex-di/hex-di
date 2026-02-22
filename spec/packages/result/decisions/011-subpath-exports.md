# ADR-011: Subpath Exports

## Status

Accepted

## Context

The library currently has a single entry point (`@hex-di/result`) that re-exports everything. Consumers who need only a subset of the API still receive the entire bundle in environments that cannot tree-shake (e.g., CommonJS consumers, some test runners).

Node.js 12+ supports `"exports"` in `package.json` for subpath exports, allowing granular import paths that bundlers and runtimes resolve independently.

## Decision

Define a full subpath export map in `package.json`:

```jsonc
{
  "exports": {
    ".": {
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.cjs",
      "types": "./dist/types/index.d.ts"
    },
    "./fn": {
      "import": "./dist/esm/fn/index.js",
      "require": "./dist/cjs/fn/index.cjs",
      "types": "./dist/types/fn/index.d.ts"
    },
    "./fn/*": {
      "import": "./dist/esm/fn/*.js",
      "require": "./dist/cjs/fn/*.cjs",
      "types": "./dist/types/fn/*.d.ts"
    },
    "./async": {
      "import": "./dist/esm/async/index.js",
      "require": "./dist/cjs/async/index.cjs",
      "types": "./dist/types/async/index.d.ts"
    },
    "./combinators": {
      "import": "./dist/esm/combinators/index.js",
      "require": "./dist/cjs/combinators/index.cjs",
      "types": "./dist/types/combinators/index.d.ts"
    },
    "./errors": {
      "import": "./dist/esm/errors/index.js",
      "require": "./dist/cjs/errors/index.cjs",
      "types": "./dist/types/errors/index.d.ts"
    },
    "./option": {
      "import": "./dist/esm/option/index.js",
      "require": "./dist/cjs/option/index.cjs",
      "types": "./dist/types/option/index.d.ts"
    },
    "./unsafe": {
      "import": "./dist/esm/unsafe/index.js",
      "require": "./dist/cjs/unsafe/index.cjs",
      "types": "./dist/types/unsafe/index.d.ts"
    },
    "./internal/*": null
  }
}
```

### Subpath descriptions

| Subpath | Contents | Notes |
|---------|----------|-------|
| `.` | Full public API | Default entry point, re-exports everything |
| `./fn` | All standalone functions + `pipe()` | Barrel import for pipe-style usage |
| `./fn/*` | Individual standalone functions | Per-function imports for maximum tree-shaking |
| `./async` | `ResultAsync` class + async constructors | For consumers who only need async |
| `./combinators` | `all`, `allSettled`, `any`, `collect`, `partition`, `forEach`, `zipOrAccumulate` | Standalone combinator access |
| `./errors` | `createError`, `createErrorGroup`, `assertNever` | Error utilities |
| `./option` | `Option`, `some`, `none`, `isOption` | Full Option type |
| `./unsafe` | `unwrap`, `unwrapErr`, `UnwrapError` | Throwing extractors (gated) |
| `./internal/*` | **Blocked** (`null`) | Prevents importing internal modules |

### Internal blocking

Setting `"./internal/*": null` causes any import of `@hex-di/result/internal/...` to fail at module resolution time with a "module not found" error. This prevents consumers from depending on internal implementation details.

See [INV-13](../invariants.md#inv-13-subpath-blocking).

## Consequences

**Positive**:
- Fine-grained imports enable maximum tree-shaking
- `./unsafe` gating makes throwing extractors an explicit opt-in
- `./internal/*` blocking prevents accidental coupling to internals
- CJS consumers benefit from subpath imports (no tree-shaking needed)
- Raises Bundle Efficiency from 6→10

**Negative**:
- More complex `package.json` configuration
- Must test all subpaths in CI (resolution, types, runtime)
- Dual CJS/ESM output doubles the dist directory
- `./fn/*` wildcard pattern requires careful directory structure

**Trade-off accepted**: The configuration complexity is justified by the major improvement in bundle efficiency and the safety benefits of unsafe gating and internal blocking.
