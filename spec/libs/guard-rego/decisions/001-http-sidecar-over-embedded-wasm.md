# ADR-RG-001: HTTP Sidecar over Embedded WASM

## Status

Accepted

## Context

OPA can be deployed in two modes:

1. **HTTP sidecar** — OPA runs as a separate daemon process, and the adapter queries it via its REST API (`POST /v1/data/{path}`). This is OPA's primary deployment model.
2. **Embedded WASM** — OPA compiles Rego policies to WASM modules that can be evaluated in-process. The `@open-policy-agent/opa-wasm` npm package provides a JavaScript SDK.

The choice affects latency, feature coverage, deployment model, and the adapter's dependency footprint.

## Decision

The `@hex-di/guard-rego` adapter uses the **HTTP sidecar** approach as its primary evaluation mode.

```ts
// The adapter communicates with OPA via HTTP
const response = await fetch(`${baseUrl}/v1/data/${path}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ input }),
});
```

## Consequences

**Positive**:

- **Full OPA feature set** — The HTTP API provides access to all OPA features: bundle management, decision logging, status API, discovery, partial evaluation. Embedded WASM supports only policy evaluation — no bundles, no logging, no management API.
- **GitOps-native** — OPA's bundle system enables Git-driven policy deployment: push policies to a bundle server, OPA polls and updates automatically. This is OPA's defining workflow and is only available in sidecar mode.
- **Language-agnostic** — The adapter doesn't depend on WASM tooling or Rego compilation. Any HTTP client works. Testing is straightforward with mocked `fetch`.
- **OPA manages its own lifecycle** — Bundle updates, health checks, decision logging, and plugin management are OPA's responsibility. The adapter is a thin HTTP client.
- **Consistent with OPA ecosystem** — Envoy, Kubernetes admission controllers, and other OPA integrations use the HTTP API. The adapter follows the same pattern.

**Negative**:

- **Network latency** — Each authorization check requires an HTTP round-trip to the OPA sidecar. On localhost, this adds ~1-5ms per evaluation. For high-throughput paths, this may be significant.
- **Requires async evaluation** — HTTP calls are inherently asynchronous, so the adapter requires Guard's `evaluateAsync()` rather than the synchronous `evaluate()`. This changes the integration pattern compared to the Cedar adapter.
- **OPA must be running** — The application depends on the OPA sidecar being available. If OPA is down, all authorization checks fail-closed (deny). This is a runtime dependency that doesn't exist with embedded evaluation.
- **Deployment complexity** — The OPA sidecar must be deployed, configured, and monitored alongside the application. This adds operational overhead.

**Trade-off accepted**: OPA's HTTP sidecar is its intended deployment model. The bundle system, decision logging, and management API are essential features that embedded WASM cannot provide. The ~1-5ms localhost latency is acceptable for most authorization scenarios. Applications needing sub-millisecond synchronous evaluation should use the Cedar adapter instead.
