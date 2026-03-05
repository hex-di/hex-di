# ADR-CD-001: Embedded WASM over HTTP Sidecar

## Status

Accepted

## Context

Cedar can be deployed in two modes:

1. **Embedded** — The Cedar evaluation engine runs in-process as a WASM module (compiled from Rust). The `@cedar-policy/cedar-wasm` npm package provides this.
2. **HTTP sidecar** — A Cedar evaluation service runs as a separate process, and the adapter calls it via HTTP (similar to OPA's deployment model).

The choice affects latency, reliability, deployment complexity, and the adapter's dependency footprint.

## Decision

The `@hex-di/guard-cedar` adapter uses the **embedded WASM** approach as its primary (and initially only) evaluation mode.

```ts
// The adapter imports and initializes the WASM module directly
import { createCedarEngine } from "@cedar-policy/cedar-wasm";

// Evaluation is synchronous — no network call
const response = engine.isAuthorized(request);
```

## Consequences

**Positive**:

- **Zero network latency** — Policy evaluation is a function call, not an HTTP round-trip. This matches Guard's synchronous `evaluate()` model.
- **No external service dependency** — The application does not need to deploy, monitor, or scale a Cedar sidecar. Fewer moving parts in production.
- **Deterministic** — WASM execution is deterministic. The same inputs always produce the same output, with no network jitter or timeout variance.
- **Offline capable** — The adapter works without network access. Policies and entities are loaded at startup.
- **Consistent with Guard's model** — Guard's `evaluate()` is synchronous. A synchronous WASM call is the natural fit. An HTTP call would require `evaluateAsync()` and change the integration pattern.

**Negative**:

- **WASM module size** — The Cedar WASM module adds ~2-3MB to the application bundle. This is acceptable for server-side applications but may be significant for edge/lambda deployments.
- **No policy hot-reload from external service** — Policies must be loaded at adapter creation time. Changing policies requires restarting the adapter (or implementing a reload mechanism in v0.2.0).
- **Single language** — The Cedar WASM module is compiled from Rust. Debugging Cedar engine internals from JavaScript is difficult. Errors from WASM are opaque strings.

**Trade-off accepted**: The latency and reliability benefits of embedded evaluation outweigh the bundle size cost for HexDI's primary target (Node.js server applications). HTTP sidecar support can be added as an alternative adapter in a future version without changing the port interface.
