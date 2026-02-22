# ADR-HC-007: Transport Adapters as Separate Packages

## Status

Accepted

## Context

HTTP client libraries can bundle transport implementations in two ways:

1. **Monolithic** — all supported transports (fetch, axios, got, undici, etc.) are included in the core package. Users import the transport they need.
2. **Split packages** — each transport adapter is a separate npm package with the transport library as a peer dependency. The core package has no transport dependencies.

Bundling all transports in the core creates problems:
- Browsers get Node.js-only transports; Node.js gets browser-only transports. Tree-shaking mitigates this but is not always reliable.
- Consumers who only use `fetch` must install axios, got, and undici transitively.
- Adding a new transport requires a major version bump of the core package.
- Transport libraries have vastly different maintenance status and bundle sizes.

## Decision

Each transport adapter is published as a **separate npm package** with the transport library as a peer dependency:

```
@hex-di/http-client          # Core: types, combinators, port definition
@hex-di/http-client-fetch    # Fetch adapter (universal, no peer deps)
@hex-di/http-client-axios    # Axios adapter (peer: axios)
@hex-di/http-client-got      # Got adapter (peer: got)
@hex-di/http-client-ky       # Ky adapter (peer: ky)
@hex-di/http-client-ofetch   # Ofetch adapter (peer: ofetch)
@hex-di/http-client-node     # Node http/https adapter (peer: node built-ins)
@hex-di/http-client-undici   # Undici adapter (peer: undici)
@hex-di/http-client-bun      # Bun.fetch adapter (no peer deps, Bun runtime only)
@hex-di/http-client-testing  # Mock adapter for testing
```

The core package (`@hex-di/http-client`) exports the `HttpClient` interface, `HttpClientPort`, all request/response types, error types, combinators, and the `createHttpClientAdapter` factory. It has zero transport dependencies.

Application code depends only on `@hex-di/http-client` via the port. The adapter selection happens in the composition root:

```typescript
// composition-root.ts
import { createFetchHttpClient } from "@hex-di/http-client-fetch";
import { FetchHttpClientAdapter } from "@hex-di/http-client-fetch";

const graph = GraphBuilder.create()
  .provide(FetchHttpClientAdapter)
  .build();
```

## Consequences

**Positive**:
- Zero bundle bloat for consumers who only use fetch — they install only `@hex-di/http-client` and `@hex-di/http-client-fetch`.
- Transport adapters can be versioned and released independently.
- New adapters (e.g., for a new runtime) can be added without touching the core package.
- The core package has no runtime dependencies, making it trivially auditable for security.

**Negative**:
- Users must install two packages instead of one. The install command is slightly more verbose.
- Keeping adapter packages in sync with the core package version requires coordination.
- The testing adapter (`@hex-di/http-client-testing`) is a separate install, though it is always a dev dependency.

**Trade-off accepted**: The install overhead is a one-time, minor inconvenience. The benefits — zero bloat, independent versioning, platform correctness — are permanent and significant for a widely-used library.

**Affected spec sections**: [§39](../08-transport-adapters.md#39-transport-adapter-architecture)
