# Zed ACP — Rust SDK

**Source:** https://github.com/agentclientprotocol/agent-client-protocol/tree/main/rust/schema, https://crates.io/crates/agent-client-protocol-schema
**Captured:** 2026-02-28

---

## Overview

The official Rust SDK for ACP is the `agent-client-protocol-schema` crate. It provides all protocol types, JSON-RPC message routing, and the `Side` trait pattern for type-safe bidirectional communication.

| Property         | Value                                                                    |
| ---------------- | ------------------------------------------------------------------------ |
| Crate name       | `agent-client-protocol-schema`                                           |
| Latest version   | 0.10.8 (February 2026)                                                   |
| License          | Apache-2.0                                                               |
| Key dependencies | `serde`, `serde_json`, `schemars` (v1), `strum`, `anyhow`, `derive_more` |

---

## Source Structure

| File                     | Purpose                                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------------------- |
| `src/lib.rs`             | Module declarations, re-exports, `SessionId`, `IntoOption` trait                                  |
| `src/agent.rs`           | Agent-side types: requests, responses, capabilities, session management                           |
| `src/client.rs`          | Client-side types: requests, responses, notifications, fs/terminal ops                            |
| `src/content.rs`         | `ContentBlock`, `TextContent`, `ImageContent`, `AudioContent`, `ResourceLink`, `EmbeddedResource` |
| `src/tool_call.rs`       | `ToolCall`, `ToolCallUpdate`, `ToolKind`, `ToolCallStatus`, `ToolCallContent`                     |
| `src/error.rs`           | `Error`, `ErrorCode`                                                                              |
| `src/rpc.rs`             | JSON-RPC message types, `Side` trait, `ClientSide`/`AgentSide`, method routing                    |
| `src/plan.rs`            | `Plan`, `PlanEntry`, `PlanEntryPriority`, `PlanEntryStatus`                                       |
| `src/protocol_level.rs`  | `CancelRequestNotification` (unstable)                                                            |
| `src/version.rs`         | `ProtocolVersion` (V0, V1, LATEST)                                                                |
| `src/ext.rs`             | `ExtRequest`, `ExtResponse`, `ExtNotification`                                                    |
| `src/maybe_undefined.rs` | `MaybeUndefined<T>` utility type                                                                  |
| `src/bin/generate.rs`    | Schema generation binary                                                                          |

---

## Side Trait Pattern

The core architectural pattern for type-safe bidirectional JSON-RPC:

```rust
trait Side {
    type InRequest;
    type InNotification;
    type OutResponse;

    fn decode_request(method: &str, params: RawValue) -> Result<Self::InRequest>;
    fn decode_notification(method: &str, params: RawValue) -> Result<Self::InNotification>;
}
```

### ClientSide

Used by the editor (client):

| Associated Type  | Concrete Type       |
| ---------------- | ------------------- |
| `InRequest`      | `AgentRequest`      |
| `InNotification` | `AgentNotification` |
| `OutResponse`    | `ClientResponse`    |

### AgentSide

Used by the agent:

| Associated Type  | Concrete Type        |
| ---------------- | -------------------- |
| `InRequest`      | `ClientRequest`      |
| `InNotification` | `ClientNotification` |
| `OutResponse`    | `AgentResponse`      |

---

## Request/Response Enums

### AgentRequest (Agent -> Client)

Requests the agent makes to the editor:

| Variant                      | Description                           |
| ---------------------------- | ------------------------------------- |
| `WriteTextFileRequest`       | Write content to a file               |
| `ReadTextFileRequest`        | Read file contents                    |
| `RequestPermissionRequest`   | Ask user for tool authorization       |
| `CreateTerminalRequest`      | Create a new terminal and run command |
| `TerminalOutputRequest`      | Get terminal output                   |
| `ReleaseTerminalRequest`     | Release terminal resources            |
| `WaitForTerminalExitRequest` | Wait for terminal command to finish   |
| `KillTerminalCommandRequest` | Kill a running terminal command       |
| `ExtMethodRequest`           | Custom extension request              |

### ClientResponse

Mirrors `AgentRequest` with corresponding response types for each variant.

### AgentNotification (Agent -> Client)

| Variant               | Description                                        |
| --------------------- | -------------------------------------------------- |
| `SessionNotification` | Session update (messages, tool calls, plans, etc.) |
| `ExtNotification`     | Custom extension notification                      |

---

## Content Types

### ContentBlock

```rust
enum ContentBlock {
    Text(TextContent),          // always supported
    Image(ImageContent),        // requires image capability
    Audio(AudioContent),        // requires audio capability
    ResourceLink(ResourceLink), // always supported
    Resource(EmbeddedResource), // requires embeddedContext capability
}
```

### TextContent

| Field         | Type                  |
| ------------- | --------------------- |
| `text`        | `String`              |
| `annotations` | `Option<Annotations>` |
| `meta`        | `Option<Meta>`        |

### ImageContent

| Field         | Type                  |
| ------------- | --------------------- |
| `data`        | `String` (base64)     |
| `mime_type`   | `String`              |
| `uri`         | `Option<String>`      |
| `annotations` | `Option<Annotations>` |
| `meta`        | `Option<Meta>`        |

### AudioContent

| Field         | Type                  |
| ------------- | --------------------- |
| `data`        | `String` (base64)     |
| `mime_type`   | `String`              |
| `annotations` | `Option<Annotations>` |
| `meta`        | `Option<Meta>`        |

### Annotations

| Field       | Type                | Description            |
| ----------- | ------------------- | ---------------------- |
| `audience`  | `Option<Vec<Role>>` | `Assistant` or `User`  |
| `timestamp` | `Option<String>`    | ISO timestamp          |
| `priority`  | `Option<f64>`       | Priority weight        |
| `meta`      | `Option<Meta>`      | Extensibility metadata |

---

## Extension Types

For custom (non-standard) methods:

```rust
struct ExtRequest {
    method: Arc<str>,
    params: Arc<RawValue>,
}

struct ExtResponse(Arc<RawValue>);

struct ExtNotification {
    method: Arc<str>,
    params: Arc<RawValue>,
}
```

Custom methods MUST begin with `_` (e.g., `_zed.dev/workspace/buffers`).

---

## Unstable Feature Flags

| Flag                           | Gated Feature               |
| ------------------------------ | --------------------------- |
| `unstable_cancel_request`      | `$/cancel_request` method   |
| `unstable_session_fork`        | `session/fork` method       |
| `unstable_session_info_update` | `SessionInfoUpdate` variant |
| `unstable_session_list`        | `session/list` method       |
| `unstable_session_model`       | `session/set_model` method  |
| `unstable_session_resume`      | `session/resume` method     |
| `unstable_session_usage`       | `UsageUpdate` variant       |

---

## Plan Types

```rust
struct Plan {
    entries: Vec<PlanEntry>,
    meta: Option<Meta>,
}

struct PlanEntry {
    content: String,
    priority: PlanEntryPriority,  // High, Medium, Low
    status: PlanEntryStatus,      // Pending, InProgress, Completed
    meta: Option<Meta>,
}
```

Plans are sent as **complete replacements** — the agent MUST send all entries in each update, and the client MUST replace the current plan entirely.

---

## Usage Pattern

```rust
// Agent implementation
struct MyAgent;

// Decode incoming messages using AgentSide
let request = AgentSide::decode_request(&method, params)?;
match request {
    ClientRequest::InitializeRequest(req) => { /* handle */ },
    ClientRequest::PromptRequest(req) => { /* handle */ },
    // ...
}

// Client implementation
let request = ClientSide::decode_request(&method, params)?;
match request {
    AgentRequest::ReadTextFileRequest(req) => { /* handle */ },
    AgentRequest::WriteTextFileRequest(req) => { /* handle */ },
    // ...
}
```
