---
id: BEH-SF-496
kind: behavior
title: Protocol Extensions
status: active
id_range: 496--503
invariants: [INV-SF-38, INV-SF-39]
adrs: [ADR-020]
types: [acp, errors]
ports: [ACPServerService, ConnectionManagerService, MessageTranslator]
---

# 38 — Protocol Extensions

**ADR:** [ADR-020](../decisions/ADR-020-protocol-extension-observability.md)

**Architecture:** [c3-acp-layer.md](../architecture/c3-acp-layer.md)

---

## BEH-SF-496: Extension Method Registration — Agents Register Custom Methods with `_` Prefix

> **Invariant:** [INV-SF-38](../invariants/INV-SF-38-extension-method-isolation.md) — Extension Method Namespace Isolation

When an agent registers extension methods during the protocol handshake, the system validates the `_` prefix convention and ensures namespace uniqueness across all registered extensions. Core protocol method names are reserved and cannot be overridden by extensions.

### Contract

REQUIREMENT (BEH-SF-496): When an agent registers extension methods during the protocol handshake, the system MUST validate that each method name begins with the `_` prefix. The system MUST reject registration of any method whose name collides with a core protocol method by returning `ExtensionMethodNotFoundError`. The system MUST enforce namespace uniqueness: if two agents attempt to register the same `_`-prefixed method name, the second registration MUST fail with a conflict error.

### Verification

- Unit test: register extension method `_myAgent/doStuff`; verify registration succeeds and method is discoverable.
- Unit test: attempt to register method `run` (no `_` prefix, core method); verify `ExtensionMethodNotFoundError` is returned.
- Unit test: two agents register `_shared/action`; verify the second registration fails with a conflict error.

---

## BEH-SF-497: Extension Method Dispatch — Server Routes `_`-Prefixed Methods to Handlers

> **Invariant:** [INV-SF-38](../invariants/INV-SF-38-extension-method-isolation.md) — Extension Method Namespace Isolation

When the ACP server receives a request targeting a `_`-prefixed method name, the `ExtensionMethodDispatcher` routes it to the registered handler. Unregistered extension methods are rejected with an appropriate error.

### Contract

REQUIREMENT (BEH-SF-497): When the ACP server receives a request with a `_`-prefixed method name, the `ExtensionMethodDispatcher` MUST look up the registered handler for that method and invoke it with the request payload. If no handler is registered for the method, the system MUST return `ExtensionMethodNotFoundError`. The dispatcher MUST NOT attempt to interpret the payload; it MUST pass it opaquely to the handler.

### Verification

- Unit test: send request to registered `_myAgent/doStuff`; verify the handler is invoked with the correct payload.
- Unit test: send request to unregistered `_unknown/method`; verify `ExtensionMethodNotFoundError` is returned.
- Unit test: verify the dispatcher passes the payload unchanged to the handler (opaque forwarding).

---

## BEH-SF-498: ExtFlowUpdate Emission — Extension Results Delivered as FlowUpdate Variant

> **Invariant:** [INV-SF-38](../invariants/INV-SF-38-extension-method-isolation.md) — Extension Method Namespace Isolation

When an extension method completes execution, results are emitted as `FlowUpdate { _tag: "ExtFlowUpdate" }` carrying the extension name and payload. Extensions are isolated from emitting core FlowUpdate variants.

### Contract

REQUIREMENT (BEH-SF-498): When an extension method handler completes, the system MUST emit a `FlowUpdate` with `_tag: "ExtFlowUpdate"`, `extensionName` set to the method name, and `payload` containing the handler's return value. Extension handlers MUST NOT emit core FlowUpdate variants (`TextUpdate`, `ToolCallUpdate`, `StopReasonUpdate`, etc.). If an extension handler attempts to emit a core variant, the system MUST reject the emission and log a warning.

### Verification

- Unit test: extension handler returns `{ result: 42 }`; verify `ExtFlowUpdate` is emitted with correct `extensionName` and `payload`.
- Unit test: extension handler attempts to emit `TextUpdate`; verify the emission is rejected.
- Unit test: subscribe to FlowUpdate stream; verify `ExtFlowUpdate` events are interleaved correctly with core updates.

---

## BEH-SF-499: Protocol Meta Propagation — `_meta` Fields Preserved End-to-End

> **Invariant:** [INV-SF-39](../invariants/INV-SF-39-protocol-meta-pass-through.md) — Meta Field Passthrough

When `_meta` is present on an `ACPMessage`, all protocol components preserve the `_meta` field without modification through the entire message pipeline. No component may strip, mutate, or rewrite `_meta` contents.

### Contract

REQUIREMENT (BEH-SF-499): When an `ACPMessage` contains a `_meta` field, every protocol component (`ACPServerService`, `ACPClientService`, `MessageTranslator`) MUST preserve the `_meta` field byte-for-byte through the entire message pipeline. Components MUST NOT add, remove, or modify any keys within `_meta`. The `_meta` field on the response MUST be identical to the `_meta` field on the originating request.

### Verification

- Unit test: send message with `_meta: { custom: "data", nested: { key: "value" } }`; verify `_meta` is identical on the output.
- Unit test: verify `MessageTranslator` does not strip `_meta` during format conversion.
- Unit test: round-trip through `ACPServer` -> `MessageTranslator` -> `ACPClient`; verify `_meta` is preserved at each stage.

---

## BEH-SF-500: OpenTelemetry Context Injection — Trace Context via `_meta.traceId`

> **Invariant:** [INV-SF-39](../invariants/INV-SF-39-protocol-meta-pass-through.md) — Meta Field Passthrough

When `_meta.traceId` is present, the system propagates it as W3C Trace Context. Outbound messages from the server include the same `traceId` to enable distributed tracing across agent boundaries.

### Contract

REQUIREMENT (BEH-SF-500): When an inbound `ACPMessage` contains `_meta.traceId`, the system MUST propagate the `traceId` as W3C Trace Context on all outbound messages generated in response. The `traceId` MUST be a valid W3C trace ID (32-character hex string). If `_meta.traceId` is malformed, the system MUST ignore it and generate a new trace context. Outbound `FlowUpdate` messages MUST include the propagated `traceId` in their `_meta` field.

### Verification

- Unit test: send message with valid `_meta.traceId`; verify all outbound messages carry the same `traceId`.
- Unit test: send message with malformed `traceId` (non-hex); verify a new trace context is generated.
- Unit test: verify `FlowUpdate` stream events include `_meta.traceId` matching the request's trace context.

---

## BEH-SF-501: StopReason Closed Enum — Completion Reports Structured StopReason

When an agent run completes, the system emits `FlowUpdate { _tag: "StopReasonUpdate" }` with one of the 7 `StopReason` variants. The reason accurately reflects why the run terminated.

### Contract

REQUIREMENT (BEH-SF-501): When an agent run completes, the system MUST emit exactly one `FlowUpdate` with `_tag: "StopReasonUpdate"` containing a `StopReason` value. The `StopReason` MUST be one of the 7 defined variants: `end_turn`, `tool_use`, `max_tokens`, `stop_sequence`, `timeout`, `cancelled`, `error`. The emitted variant MUST accurately reflect the termination cause. No other `StopReasonUpdate` MUST be emitted for the same run.

### Verification

- Unit test: agent completes normally; verify `StopReasonUpdate` with `end_turn` is emitted.
- Unit test: agent exceeds token limit; verify `StopReasonUpdate` with `max_tokens` is emitted.
- Unit test: agent is cancelled mid-run; verify `StopReasonUpdate` with `cancelled` is emitted and no duplicate is sent.

---

## BEH-SF-502: StopReason Exhaustive Matching — All Consumers Handle All 7 Variants

When a subscriber receives `StopReasonUpdate`, the consumer code handles all 7 `StopReason` variants. TypeScript exhaustive matching ensures compile-time safety so that adding a new variant forces all consumers to update.

### Contract

REQUIREMENT (BEH-SF-502): When a consumer processes a `StopReasonUpdate`, the system MUST provide a `StopReason` discriminated union type that enables exhaustive `switch` matching in TypeScript. All 7 variants (`end_turn`, `tool_use`, `max_tokens`, `stop_sequence`, `timeout`, `cancelled`, `error`) MUST be present in the union. Adding a new variant to the union MUST cause a compile-time error in any consumer that does not handle it (via `never` exhaustiveness check).

### Verification

- Unit test: switch over all 7 variants with exhaustiveness guard; verify no compile-time errors.
- Type test: add a hypothetical 8th variant; verify compile-time error in consumers missing the new case.
- Unit test: verify each variant carries its expected payload shape (e.g., `error` includes `message`).

---

## BEH-SF-503: Version Negotiation Handshake — Backend `initialize()` Returns ProtocolHandshake

When `ConnectionManagerService.negotiate()` is called, the backend responds with a `ProtocolHandshake` containing protocol version, backend information, negotiated capabilities, and registered extension methods. Version incompatibility is detected and surfaced as an error.

### Contract

REQUIREMENT (BEH-SF-503): When `ConnectionManagerService.negotiate()` is called, the system MUST send an `initialize` request to the backend and await a `ProtocolHandshake` response containing `protocolVersion`, `backendInfo`, `negotiatedCapabilities`, and `extensionMethods`. If the backend's `protocolVersion` is incompatible with the client's supported range, the system MUST raise `VersionNegotiationError` with both the client and server versions. The negotiated capabilities MUST be stored on the `ConnectionManagerService` for subsequent capability checks.

### Verification

- Unit test: backend returns compatible version; verify `ProtocolHandshake` is returned with all fields populated.
- Unit test: backend returns incompatible version; verify `VersionNegotiationError` is raised with both versions.
- Unit test: verify negotiated capabilities are stored and queryable via `ConnectionManagerService.hasCapability()`.

---
