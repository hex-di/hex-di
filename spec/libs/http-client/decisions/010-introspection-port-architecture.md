# ADR-HC-010: Introspection Port Architecture

## Status

Accepted

## Context

Observability of HTTP client behavior is required for several scenarios:

1. **Development debugging** — developers need to see what requests were made, what responses were received, and what latencies were observed.
2. **Testing assertions** — test suites need to verify that specific requests were made with specific headers, bodies, and URLs.
3. **Operational health** — production systems need aggregated health metrics (success rate, p50/p95 latency) for dashboards and alerting.
4. **MCP integration** — the HexDI library inspector protocol exposes per-port snapshots as resources.

The design choices are:

1. **Embed inspection in the `HttpClient` interface** — add `history()`, `snapshot()` methods to `HttpClient` itself.
2. **Side-channel via global singleton** — a separate `HttpClientInspector` global that all clients write to.
3. **Separate port interfaces** — `HttpClientInspectorPort` for per-client inspection, `HttpClientRegistryPort` for multi-client aggregation. Transport adapters opt into inspection by accepting an optional inspector argument.
4. **Interceptor-based** — callers compose the client with an `inspect(inspector)` combinator that taps requests/responses.

## Decision

Use **option 3: separate port interfaces** — `HttpClientInspectorPort` for per-client inspection and `HttpClientRegistryPort` for cross-client aggregation.

```typescript
interface HttpClientInspector {
  record(entry: HttpRequestHistoryEntry): void;
  snapshot(): HttpClientSnapshot;
}

interface HttpClientInspectorPort extends Port<"HttpClientInspector", HttpClientInspector> { ... }

interface HttpClientRegistry {
  register(name: string, inspector: HttpClientInspector): void;
  allSnapshots(): Record<string, HttpClientSnapshot>;
}

interface HttpClientRegistryPort extends Port<"HttpClientRegistry", HttpClientRegistry> { ... }
```

Transport adapters (or a wrapping combinator) accept an optional `HttpClientInspector` and call `record()` after each request settles. The inspector is injected via the DI graph, not hardcoded.

The separation of concerns is:
- **`HttpClientInspectorPort`** — per-client request history and snapshot. Injected into transport adapters or recording combinators.
- **`HttpClientRegistryPort`** — aggregates multiple named inspector instances for cross-client reporting and MCP resources.

Options 1 (embed in `HttpClient`) and 2 (global singleton) are rejected:
- Embedding inspection in the `HttpClient` interface forces all transport adapters to implement inspection logic, even those where it is not needed.
- A global singleton creates shared mutable state, violating HexDI's no-global-state principle and making isolation testing impossible.

Option 4 (interceptor-based) is a valid alternative but requires callers to opt in per-client. The port-based approach enables graph-level wiring: the inspector is injected once and all registered clients use it.

## Consequences

**Positive**:
- Clean separation: `HttpClient` remains minimal (ADR-HC-003); inspection is a separate opt-in port.
- Testable in isolation — inspectors can be mock implementations for assertion in tests.
- Graph-level injection: `HttpClientInspectorPort` and `HttpClientRegistryPort` are wired in the DI graph, not created in application code.
- MCP integration follows naturally: the registry provides the `allSnapshots()` method that the MCP resource handler queries.

**Negative**:
- Requires two additional port definitions (`InspectorPort`, `RegistryPort`) for applications that need inspection.
- Applications that only want basic request logging may find the port-based approach heavier than a simple `tap` combinator.

**Trade-off accepted**: The port-based architecture is consistent with HexDI's hexagonal architecture principles. Inspection is a cross-cutting concern that belongs at the infrastructure layer, not in application code. The DI graph wiring ensures inspection is available wherever needed without prop-threading.

**Affected invariants**: None directly.

**Affected spec sections**: [§11](../11-introspection.md), [§54–§57](../11-introspection.md)
