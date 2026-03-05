---
id: ADR-020
kind: decision
title: Protocol Extension & Observability Framework
status: Accepted
date: 2026-02-28
supersedes: []
invariants: [INV-SF-38, INV-SF-39]
---

# ADR-020: Protocol Extension & Observability Framework

**Extends:** [ADR-018](./ADR-018-acp-agent-protocol.md), [ADR-019](./ADR-019-zed-inspired-architecture.md)

## Context

The ACP protocol (ADR-018) and FlowUpdate discriminated union (ADR-019) provide a solid foundation for agent communication and session streaming. However, two gaps remain:

1. **No extension mechanism** — Third-party agent backends (e.g., custom lint tools, PR review agents) cannot introduce new protocol methods or FlowUpdate variants without modifying the core protocol definition. Every new capability requires a protocol version bump and union expansion.
2. **Lost observability context** — OpenTelemetry trace IDs and W3C Trace Context baggage are not preserved across protocol boundaries. When SpecForge orchestrates multi-agent flows, distributed traces break at the ACP message exchange layer, making it impossible to correlate agent executions within a single user request.
3. **Ambiguous stop reasons** — Agents terminate for different reasons (token limit, user cancellation, content filter), but the protocol has no structured representation. Consumers parse freetext error messages to determine the cause.
4. **No version negotiation** — Clients assume all backends support the same protocol version and capabilities. Adding new FlowUpdate variants or extension methods without negotiation risks silent message drops.

## Decision

### 1. Extension Methods Convention

Extension methods use a `_` (underscore) prefix to avoid collisions with current and future core protocol methods. Each extension method is scoped to a namespace derived from the extension provider.

- Extension method names follow the pattern `_<namespace>.<method>` (e.g., `_acme.lint`, `_github.pr-review`).
- The `ExtensionMethodDescriptor` type (defined in [types/acp.md](../types/acp.md)) declares the input/output JSON schemas for each extension method.
- Extension-contributed streaming updates use the `ExtFlowUpdate` variant with an `extensionName` field matching the namespace.
- Core protocol methods MUST NOT start with `_`. This invariant is enforced at the `ACPServerService.registerAgent()` boundary (INV-SF-38).

### 2. `_meta` Observability Pass-Through

All `ACPMessage` and `FlowUpdate` instances carry an optional `_meta` field of type `ProtocolMeta`. This field preserves distributed tracing context across protocol boundaries:

- `traceId` and `spanId` map to OpenTelemetry's trace context propagation fields.
- `traceFlags` carries the W3C Trace Context `traceparent` flags byte (sampled, random).
- `baggage` carries W3C Trace Context baggage key-value pairs for cross-cutting concerns (e.g., tenant ID, environment).

All protocol intermediaries (ACPServer, ACPClient, MessageTranslator, ConnectionManager) MUST preserve `_meta` end-to-end without modification unless explicitly extracting tracing context for local span creation (INV-SF-39).

### 3. StopReason Closed Enum

Agent run termination is modeled as a closed `StopReason` discriminated union with 7 variants:

| Variant         | Meaning                                                      |
| --------------- | ------------------------------------------------------------ |
| `EndTurn`       | Agent completed its response naturally                       |
| `MaxTokens`     | Output token budget exhausted                                |
| `StopSequence`  | A configured stop sequence was matched                       |
| `ToolUse`       | Agent yielded control for tool execution                     |
| `ContentFilter` | Content safety filter triggered                              |
| `Cancelled`     | Explicit cancellation by user, system, or budget enforcement |
| `Error`         | Unrecoverable backend error                                  |

All consumers MUST exhaustively match on `StopReason._tag`. The `StopReasonUpdate` FlowUpdate variant delivers stop reasons within the streaming pipeline so subscribers can react immediately without polling the run state.

### 4. Version Negotiation Handshake

The `ConnectionManagerService.negotiate()` method performs a version negotiation handshake when establishing a new `AgentConnection`. The handshake returns a `ProtocolHandshake` value containing:

- `protocolVersion` — The agreed-upon ACP protocol version (semver).
- `backendInfo` — The backend's name, version, and vendor string.
- `negotiatedCapabilities` — A `BackendNegotiatedCapabilities` record indicating which optional features (streaming, persistent sessions, extension methods, tool call progress, config options, slash commands) the backend supports.
- `extensionMethods` — The list of `ExtensionMethodDescriptor` values the backend advertises.

Clients MUST NOT send FlowUpdate variants or invoke extension methods that were not negotiated. Unsupported variants received by a client SHOULD be logged and dropped, not propagated.

## Concept Mapping

| Zed Pattern                            | SpecForge Adoption                                                          |
| -------------------------------------- | --------------------------------------------------------------------------- |
| `_`-prefixed experimental methods      | `ExtensionMethodDescriptor` with `_` prefix convention, namespace isolation |
| `ExtensionResult` for custom responses | `ExtFlowUpdate` variant in the `FlowUpdate` union                           |
| `StopReason` enum in streaming         | `StopReason` closed union with 7 variants, `StopReasonUpdate` FlowUpdate    |
| `ProtocolInfo` from init handshake     | `ProtocolHandshake` returned by `ConnectionManagerService.negotiate()`      |
| Trace context passthrough in headers   | `ProtocolMeta` on `_meta` field, W3C Trace Context compatible               |

## Trade-Offs

**Benefits:**

- Extension methods enable third-party protocol capabilities without core protocol changes
- Namespace isolation prevents extension collisions across independent providers
- `_meta` pass-through enables end-to-end distributed tracing across multi-agent flows
- `StopReason` closed enum eliminates freetext parsing and enables exhaustive compile-time matching
- Version negotiation prevents silent message drops when client and backend capabilities diverge
- `ProtocolHandshake` provides a single point for capability discovery at connection time

**Costs:**

- Extension authors must register `ExtensionMethodDescriptor` entries, adding setup overhead
- `_meta` preservation must be verified across all protocol intermediaries; a single missing pass-through breaks the trace
- StopReason additions require protocol version bumps and consumer updates
- Version negotiation adds a round-trip at connection establishment time

## Consequences

- [types/acp.md](../types/acp.md) — `ProtocolMeta`, `ExtensionMethodDescriptor`, `StopReason`, `ProtocolHandshake`, `BackendInfo`, `BackendNegotiatedCapabilities`; `_meta` field on `ACPMessage`; `ExtFlowUpdate` and `StopReasonUpdate` FlowUpdate variants
- [types/ports.md](../types/ports.md) — `ConnectionManagerService.negotiate()` method signature
- [types/extensibility.md](../types/extensibility.md) — Extension method naming convention, `ExtFlowUpdate` vs core FlowUpdate disambiguation
- [invariants/INV-SF-38-extension-method-isolation.md](../invariants/INV-SF-38-extension-method-isolation.md) — Extension methods MUST use `_` prefix; core methods MUST NOT
- [invariants/INV-SF-39-protocol-meta-pass-through.md](../invariants/INV-SF-39-protocol-meta-pass-through.md) — `_meta` MUST be preserved end-to-end by all intermediaries
- [behaviors/BEH-SF-496-protocol-extensions.md](../behaviors/BEH-SF-496-protocol-extensions.md) — BEH-SF-496 through BEH-SF-503

## References

- [ADR-018](./ADR-018-acp-agent-protocol.md) — ACP as Primary Agent Protocol (extended, not superseded)
- [ADR-019](./ADR-019-zed-inspired-architecture.md) — Zed-Inspired Architectural Improvements (extended, not superseded)
- [types/acp.md](../types/acp.md) — Full ACP type definitions
- [W3C Trace Context](https://www.w3.org/TR/trace-context/) — Trace context propagation standard
- [OpenTelemetry Context Propagation](https://opentelemetry.io/docs/specs/otel/context/api-propagators/) — OTel propagator specification
