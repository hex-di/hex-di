# ADR-R002: Subpath Exports

## Status

Accepted

## Context

The core library uses `package.json` `"exports"` to provide granular import paths (`@hex-di/result/fn`, `@hex-di/result/unsafe`, etc.). See [ADR-011](../../decisions/011-subpath-exports.md).

The React package needs to decide how to structure its exports. Options considered:

1. **Single entry point** — Everything in `@hex-di/result-react`. Simple but prevents tree-shaking of adapters, server utilities, and testing utilities.
2. **Per-file exports** — Individual exports like `@hex-di/result-react/hooks/use-result`. Maximum granularity but excessive for a smaller package.
3. **Category-based subpaths** — Group by purpose: core, adapters, server, testing. Matches the core library's approach without over-splitting.

## Decision

Use category-based subpath exports:

```json
{
  "exports": {
    ".": {
      "import": { "types": "./dist/index.d.ts", "default": "./dist/index.js" }
    },
    "./adapters": {
      "import": { "types": "./dist/adapters/index.d.ts", "default": "./dist/adapters/index.js" }
    },
    "./server": {
      "import": { "types": "./dist/server/index.d.ts", "default": "./dist/server/index.js" }
    },
    "./testing": {
      "import": { "types": "./dist/testing/index.d.ts", "default": "./dist/testing/index.js" }
    },
    "./internal/*": null
  }
}
```

### Rationale

- **Adapters are optional** — Not every consumer uses TanStack Query or SWR. Gating behind `./adapters` prevents their code from entering the bundle.
- **Server utilities are RSC-safe** — The `./server` subpath contains only pure functions with no React runtime dependency. Separating them from the main entry point ensures they never pull in `"use client"` code when imported in React Server Components.
- **Testing is dev-only** — Test matchers and render helpers should never appear in production bundles. Separate subpath makes this explicit.
- **Core hooks are few** — With only ~10 exports in the main entry point, per-file splitting provides no meaningful benefit.
- **Internal blocking** — Consistent with the core library's `./internal/*: null` pattern.

## Consequences

**Positive**:
- Adapters and testing utilities are tree-shaken from production bundles
- Clear boundary between runtime code and dev/test utilities
- Consistent with core library's export philosophy

**Negative**:
- Four entry points to maintain instead of one
- Consumers must know which subpath to import from

**Trade-off accepted**: The four-subpath structure is a reasonable middle ground between granularity and simplicity. It mirrors the core library's approach at a scale appropriate for the React package.
