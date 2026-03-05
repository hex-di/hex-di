# Zed ACP — Protocol Specification

**Source:** https://agentclientprotocol.com, https://github.com/agentclientprotocol/agent-client-protocol
**Captured:** 2026-02-28

---

## Transport

- **Primary**: stdio (required) — JSON-RPC over stdin/stdout
- **Streamable HTTP**: draft (not yet specified)
- **Custom transports**: allowed, SHOULD document their patterns

### Stdio Rules

- Messages delimited by newlines (`\n`), MUST NOT contain embedded newlines
- UTF-8 encoding mandatory
- Agent MUST NOT write anything to stdout that is not a valid ACP message
- Agent may log freely to stderr

---

## JSON-RPC 2.0

ACP uses JSON-RPC 2.0 with two message categories:

| Category         | Has `id` | Expects Response | Description            |
| ---------------- | -------- | ---------------- | ---------------------- |
| Method (Request) | Yes      | Yes              | Request-response pairs |
| Notification     | No       | No               | One-way messages       |

Reuses JSON representations from MCP where possible, adds custom types for agentic coding UX (diffs, tool calls, plans).

---

## Protocol Version

```
V0 = 0   // pre-release, fallback for unparseable version strings
V1 = 1   // current production version
LATEST = V1
```

Version is a `u16` (0–65535). During initialization, the agent responds with either the requested version or its latest supported version. If versions are incompatible, the client should disconnect.

---

## Initialization

```
Client -> Agent:  initialize (request)
Agent  -> Client: initialize (response)
```

### InitializeRequest

| Field                 | Type                 | Description                        |
| --------------------- | -------------------- | ---------------------------------- |
| `protocol_version`    | `ProtocolVersion`    | Latest version supported by client |
| `client_capabilities` | `ClientCapabilities` | What the client can do             |
| `client_info`         | `Implementation`     | `{ name, title, version, meta }`   |
| `meta`                | `Option<Meta>`       | Extensibility metadata             |

### InitializeResponse

| Field                | Type                | Description                      |
| -------------------- | ------------------- | -------------------------------- |
| `protocol_version`   | `ProtocolVersion`   | Chosen version                   |
| `agent_capabilities` | `AgentCapabilities` | What the agent can do            |
| `agent_info`         | `Implementation`    | `{ name, title, version, meta }` |
| `auth_methods`       | `Vec<AuthMethod>`   | Available authentication methods |
| `meta`               | `Option<Meta>`      | Extensibility metadata           |

---

## Authentication

Conditional — only if `InitializeResponse.auth_methods` is non-empty.

```
Client -> Agent:  authenticate (request)
Agent  -> Client: authenticate (response)
```

### AuthenticateRequest

| Field       | Type           | Description            |
| ----------- | -------------- | ---------------------- |
| `method_id` | `AuthMethodId` | Chosen auth method ID  |
| `meta`      | `Option<Meta>` | Extensibility metadata |

### AuthMethod

| Field         | Type           | Description             |
| ------------- | -------------- | ----------------------- |
| `id`          | `AuthMethodId` | Unique identifier       |
| `name`        | `String`       | Display name            |
| `description` | `String`       | User-facing description |
| `meta`        | `Option<Meta>` | Extensibility metadata  |

Authentication types include **Agent Auth** (agent manages OAuth flow independently — local HTTP server, browser redirect, token exchange) and **Terminal Auth** (interactive terminal-based setup).

---

## Session Management

### session/new

```
Client -> Agent:  session/new (request)
Agent  -> Client: session/new (response)
```

**Request:**

| Field         | Type             | Description               |
| ------------- | ---------------- | ------------------------- |
| `cwd`         | `PathBuf`        | Working directory         |
| `mcp_servers` | `Vec<McpServer>` | MCP server configurations |
| `meta`        | `Option<Meta>`   | Extensibility metadata    |

**Response:**

| Field            | Type                       | Description                  |
| ---------------- | -------------------------- | ---------------------------- |
| `session_id`     | `SessionId`                | Unique session identifier    |
| `modes`          | `SessionModeState`         | Current and available modes  |
| `models`         | `SessionModelState`        | Current and available models |
| `config_options` | `Vec<SessionConfigOption>` | Available config options     |
| `meta`           | `Option<Meta>`             | Extensibility metadata       |

### session/load (requires `loadSession` capability)

Resumes an existing session. Agent replays the entire conversation history via `session/update` notifications before responding.

**Request:** `{ session_id, cwd, mcp_servers, meta }`
**Response:** `{ modes, models, config_options, meta }`

---

## Prompting

### session/prompt

```
Client -> Agent:  session/prompt (request)
Agent  -> Client: session/update (notification, streaming, repeated)
Agent  -> Client: session/request_permission (request, as needed)
Client -> Agent:  session/cancel (notification, optional)
Agent  -> Client: session/prompt (response)
```

**PromptRequest:** `{ session_id, prompt: Vec<ContentBlock>, meta }`
**PromptResponse:** `{ stop_reason: StopReason, usage: Option<Usage>, meta }`

### StopReason

| Variant           | Description                      |
| ----------------- | -------------------------------- |
| `EndTurn`         | Model finished normally          |
| `MaxTokens`       | Token limit reached              |
| `MaxTurnRequests` | Model request threshold exceeded |
| `Refusal`         | Agent declines the request       |
| `Cancelled`       | Client-initiated cancellation    |

### session/cancel (notification)

Client sends to interrupt agent processing: `{ session_id, meta }`

---

## Session Updates

The `session/update` notification streams session state changes from agent to client:

| Variant                   | Description                       |
| ------------------------- | --------------------------------- |
| `UserMessageChunk`        | Chunk of user message content     |
| `AgentMessageChunk`       | Chunk of agent response           |
| `AgentThoughtChunk`       | Chunk of agent reasoning/thinking |
| `ToolCall`                | New tool call initiated           |
| `ToolCallUpdate`          | Update to existing tool call      |
| `Plan`                    | Agent's structured task plan      |
| `AvailableCommandsUpdate` | Updated slash commands            |
| `CurrentModeUpdate`       | Mode change                       |
| `ConfigOptionUpdate`      | Config option change              |

Unstable variants (feature-gated): `SessionInfoUpdate`, `UsageUpdate`

---

## Complete Method Reference

### Agent Methods (Client -> Agent)

| Method                      | Type         | Required    |
| --------------------------- | ------------ | ----------- |
| `initialize`                | Request      | Yes         |
| `authenticate`              | Request      | Conditional |
| `session/new`               | Request      | Yes         |
| `session/load`              | Request      | Optional    |
| `session/prompt`            | Request      | Yes         |
| `session/set_mode`          | Request      | Optional    |
| `session/set_config_option` | Request      | Optional    |
| `session/cancel`            | Notification | Optional    |

### Client Methods (Agent -> Client)

| Method                       | Type         | Required |
| ---------------------------- | ------------ | -------- |
| `session/update`             | Notification | Yes      |
| `session/request_permission` | Request      | Yes      |
| `fs/read_text_file`          | Request      | Optional |
| `fs/write_text_file`         | Request      | Optional |
| `terminal/create`            | Request      | Optional |
| `terminal/output`            | Request      | Optional |
| `terminal/wait_for_exit`     | Request      | Optional |
| `terminal/kill`              | Request      | Optional |
| `terminal/release`           | Request      | Optional |

### Unstable Methods

| Method              | Feature Flag              |
| ------------------- | ------------------------- |
| `session/fork`      | `unstable_session_fork`   |
| `session/resume`    | `unstable_session_resume` |
| `session/list`      | `unstable_session_list`   |
| `session/set_model` | `unstable_session_model`  |
| `$/cancel_request`  | `unstable_cancel_request` |

---

## Error Handling

### ErrorCode

| Code             | Name                         | Value  |
| ---------------- | ---------------------------- | ------ |
| ParseError       | Parse error                  | -32700 |
| InvalidRequest   | Invalid request              | -32600 |
| MethodNotFound   | Method not found             | -32601 |
| InvalidParams    | Invalid parameters           | -32602 |
| InternalError    | Internal error               | -32603 |
| AuthRequired     | Auth required                | -32000 |
| ResourceNotFound | Resource not found           | -32002 |
| RequestCancelled | Request cancelled (unstable) | -32800 |

### Error Structure

```
{ code: ErrorCode, message: String, data: Option<Value> }
```

---

## Extensibility

### Meta Fields

All objects carry an optional `_meta` field. Reserved keys: `traceparent`, `tracestate`, `baggage` (W3C trace context).

### Custom Methods

Methods beginning with `_` (e.g., `_zed.dev/workspace/buffers`). Custom requests expect responses; custom notifications should be silently ignored if unrecognized.

### Custom Capabilities

Advertised through `_meta` fields within capability objects during initialization.
