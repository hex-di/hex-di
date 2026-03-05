---
id: BEH-SF-512
kind: behavior
title: Dynamic Capabilities
status: active
id_range: 512--519
invariants: [INV-SF-41]
adrs: [ADR-022]
types: [acp, errors]
ports: [ACPServerService, MessageTranslator]
---

# 40 — Dynamic Capabilities

**ADR:** [ADR-022](../decisions/ADR-022-dynamic-capabilities.md)

**Architecture:** [c3-acp-layer.md](../architecture/c3-acp-layer.md)

---

## BEH-SF-512: Config Options Advertisement — Agents Publish via ConfigOptionsUpdate

Agents advertise their configurable options to the host via `FlowUpdate { _tag: "ConfigOptionsUpdate" }`. The host uses this information to render configuration UI and validate user-provided settings.

### Contract

REQUIREMENT (BEH-SF-512): When an agent publishes its configuration options, the system MUST emit a `FlowUpdate` with `_tag: "ConfigOptionsUpdate"` containing an array of `ConfigOption` objects. Each `ConfigOption` MUST include `name`, `type` (string, number, boolean, enum), `description`, `defaultValue`, and optional `constraints` (min, max, pattern). The system MUST emit `ConfigOptionsUpdate` during the initialization phase and whenever the available options change mid-session.

### Verification

- Unit test: agent advertises 3 config options; verify `ConfigOptionsUpdate` contains all 3 with correct types.
- Unit test: verify `ConfigOptionsUpdate` is emitted during initialization before the first `TextUpdate`.
- Unit test: agent dynamically adds a config option mid-session; verify a new `ConfigOptionsUpdate` is emitted.

---

## BEH-SF-513: Mid-Session Config Set — FlowEngine Sends ConfigSetRequest

The FlowEngine can update an agent's configuration mid-session by sending a `ConfigSetRequest`. The agent validates the new values and applies them without restarting the session.

### Contract

REQUIREMENT (BEH-SF-513): When the FlowEngine sends a `ConfigSetRequest` with a map of `optionName -> value` pairs, the agent MUST validate each value against the corresponding `ConfigOption` constraints. If all values are valid, the agent MUST apply them immediately and emit `FlowUpdate { _tag: "ConfigAckUpdate", accepted: true }`. If any value is invalid, the agent MUST reject the entire request and emit `FlowUpdate { _tag: "ConfigAckUpdate", accepted: false, errors: [...] }` with details per invalid option.

### Verification

- Unit test: send valid config values; verify `ConfigAckUpdate` with `accepted: true` is emitted.
- Unit test: send invalid value (number below min constraint); verify `ConfigAckUpdate` with `accepted: false` and error detail.
- Unit test: send mix of valid and invalid values; verify entire request is rejected (atomic semantics).

---

## BEH-SF-514: Incremental ToolCall Updates — ToolCallProgress with Delta

Tool call execution reports incremental progress via `FlowUpdate { _tag: "ToolCallProgress" }` with a delta payload describing partial results.

### Contract

REQUIREMENT (BEH-SF-514): When a tool call is in progress, the system MUST emit `FlowUpdate` events with `_tag: "ToolCallProgress"` containing `toolCallId`, `delta` (partial result payload), and `sequenceNumber` (monotonically increasing). Each `ToolCallProgress` MUST reference the same `toolCallId` as the initiating `ToolCallUpdate`. The `delta` format MUST be tool-specific and opaque to the protocol layer. The final result MUST be delivered via `ToolCallUpdate { status: "complete" }`, not via `ToolCallProgress`.

### Verification

- Unit test: tool emits 3 progress deltas; verify 3 `ToolCallProgress` events with increasing `sequenceNumber`.
- Unit test: verify all `ToolCallProgress` events reference the correct `toolCallId`.
- Unit test: verify the final result arrives as `ToolCallUpdate { status: "complete" }`, not as a `ToolCallProgress`.

---

## BEH-SF-515: Tool Progress Percentage — Optional 0-100 Field

Tool call progress events may include an optional `percentage` field (0-100) indicating estimated completion. This enables progress bar rendering in the UI.

### Contract

REQUIREMENT (BEH-SF-515): When a `ToolCallProgress` event includes a `percentage` field, the value MUST be an integer between 0 and 100 inclusive. The percentage MUST be monotonically non-decreasing across sequential `ToolCallProgress` events for the same `toolCallId`. A `percentage` of 100 MUST NOT be emitted on a `ToolCallProgress`; completion is signaled via `ToolCallUpdate { status: "complete" }`. If the tool cannot estimate progress, the `percentage` field SHOULD be omitted.

### Verification

- Unit test: tool emits progress at 25, 50, 75; verify all values are within 0-100 and non-decreasing.
- Unit test: tool emits progress at 50 then 30 (decreasing); verify the system rejects or ignores the invalid update.
- Unit test: tool cannot estimate progress; verify `percentage` field is absent from `ToolCallProgress`.

---

## BEH-SF-516: Slash Command Advertisement — Agents Publish via CommandsUpdate

Agents advertise their available slash commands to the host via `FlowUpdate { _tag: "CommandsUpdate" }`. The host uses this information to provide command auto-completion and help text.

### Contract

REQUIREMENT (BEH-SF-516): When an agent publishes its slash commands, the system MUST emit a `FlowUpdate` with `_tag: "CommandsUpdate"` containing an array of `SlashCommand` objects. Each `SlashCommand` MUST include `name` (without leading `/`), `description`, `parameters` (array of parameter definitions), and `enabled` (boolean). The system MUST emit `CommandsUpdate` during initialization and whenever the command list changes.

### Verification

- Unit test: agent advertises `/help` and `/reset` commands; verify `CommandsUpdate` contains both with correct schemas.
- Unit test: verify `CommandsUpdate` is emitted during initialization.
- Unit test: verify each `SlashCommand` includes `name`, `description`, `parameters`, and `enabled` fields.

---

## BEH-SF-517: Dynamic Command List — Commands Update Based on Session State

The set of available slash commands can change dynamically based on the current session state. Agents emit updated `CommandsUpdate` events as commands become available or unavailable.

### Contract

REQUIREMENT (BEH-SF-517): When the session state changes in a way that affects available commands, the agent MUST emit a new `FlowUpdate { _tag: "CommandsUpdate" }` with the updated command list. Commands that are temporarily unavailable MUST have `enabled: false` rather than being removed from the list. The host MUST replace its entire command list with each new `CommandsUpdate` (full replacement, not incremental). The host MUST NOT allow invocation of commands with `enabled: false`.

### Verification

- Unit test: session enters a state where `/deploy` becomes available; verify `CommandsUpdate` includes `/deploy` with `enabled: true`.
- Unit test: session exits the state; verify `CommandsUpdate` includes `/deploy` with `enabled: false`.
- Unit test: host attempts to invoke a disabled command; verify the invocation is rejected.

---

## BEH-SF-518: Content Block Capability Gating — Blocks Validated Against Surface

> **Invariant:** [INV-SF-41](../invariants/INV-SF-41-surface-capability-enforcement.md) — Surface Capability Enforcement

Content blocks emitted by agents are validated against the declared surface capabilities. Blocks that require unsupported capabilities are filtered out before delivery to the host.

### Contract

REQUIREMENT (BEH-SF-518): When the system processes a `FlowUpdate` containing content blocks, each block MUST be validated against the session's declared `SurfaceCapabilities`. If a block requires a capability not present in the surface (e.g., `image` block on a text-only surface), the block MUST be filtered out and a `CapabilityMismatchWarning` MUST be logged. The remaining valid blocks MUST be delivered to the host unchanged. If all blocks are filtered, the `FlowUpdate` MUST still be emitted with an empty blocks array.

### Verification

- Unit test: surface supports `text` and `image`; emit block with `image` type; verify it is delivered.
- Unit test: surface supports `text` only; emit block with `image` type; verify it is filtered and warning is logged.
- Unit test: all blocks filtered; verify `FlowUpdate` is emitted with empty blocks array.

---

## BEH-SF-519: Surface Capabilities Exchange — Declared at Session Creation

> **Invariant:** [INV-SF-41](../invariants/INV-SF-41-surface-capability-enforcement.md) — Surface Capability Enforcement

Surface capabilities are declared by the host at session creation time and are immutable for the session lifetime. The agent reads these capabilities to tailor its output format.

### Contract

REQUIREMENT (BEH-SF-519): When a session is created, the host MUST declare `SurfaceCapabilities` containing the set of supported content block types (`text`, `image`, `code`, `markdown`, `html`, `interactive`). The capabilities MUST be immutable for the session lifetime; any attempt to modify them mid-session MUST be rejected. The capabilities MUST be included in the `SessionInit` message and stored on the `ACPServerService` for the session. Agents MUST be able to query `SurfaceCapabilities` via the session context to adapt their output.

### Verification

- Unit test: create session with `SurfaceCapabilities: ["text", "image"]`; verify capabilities are stored on the session.
- Unit test: attempt to modify capabilities mid-session; verify the modification is rejected.
- Unit test: agent queries `SurfaceCapabilities` from session context; verify the correct capabilities are returned.

---
