# Zed ACP — Capabilities

**Source:** https://github.com/agentclientprotocol/agent-client-protocol/blob/main/rust/schema/src/agent.rs, https://github.com/agentclientprotocol/agent-client-protocol/blob/main/rust/schema/src/client.rs
**Captured:** 2026-02-28

---

## Capability Exchange

Capabilities are exchanged during initialization. Both sides MUST treat omitted capabilities as **unsupported**. Agents MUST NOT call methods the client has not advertised.

---

## Client Capabilities

Declared by the editor in `InitializeRequest`:

```
ClientCapabilities {
    fs: FileSystemCapability,
    terminal: bool,
    meta: Option<Meta>,
}
```

### FileSystemCapability

| Field             | Type   | Description                          |
| ----------------- | ------ | ------------------------------------ |
| `read_text_file`  | `bool` | Client supports `fs/read_text_file`  |
| `write_text_file` | `bool` | Client supports `fs/write_text_file` |

### Terminal

When `terminal: true`, the client supports all terminal methods: `terminal/create`, `terminal/output`, `terminal/wait_for_exit`, `terminal/kill`, `terminal/release`.

---

## Agent Capabilities

Declared by the agent in `InitializeResponse`:

```
AgentCapabilities {
    load_session: bool,
    prompt_capabilities: PromptCapabilities,
    mcp_capabilities: McpCapabilities,
    session_capabilities: SessionCapabilities,
    meta: Option<Meta>,
}
```

### PromptCapabilities

| Field              | Type   | Description                             |
| ------------------ | ------ | --------------------------------------- |
| `image`            | `bool` | Agent accepts image content blocks      |
| `audio`            | `bool` | Agent accepts audio content blocks      |
| `embedded_context` | `bool` | Agent accepts embedded resource content |

### McpCapabilities

| Field  | Type   | Description                                       |
| ------ | ------ | ------------------------------------------------- |
| `http` | `bool` | Agent can connect to HTTP MCP servers             |
| `sse`  | `bool` | Agent can connect to SSE MCP servers (deprecated) |

### SessionCapabilities (unstable)

| Field    | Type   | Feature Flag              |
| -------- | ------ | ------------------------- |
| `list`   | `bool` | `unstable_session_list`   |
| `fork`   | `bool` | `unstable_session_fork`   |
| `resume` | `bool` | `unstable_session_resume` |

---

## File System Methods

### fs/read_text_file

**Request:**

| Field        | Type           | Description             |
| ------------ | -------------- | ----------------------- |
| `session_id` | `SessionId`    | Active session          |
| `path`       | `PathBuf`      | Absolute file path      |
| `line`       | `Option<u32>`  | Starting line (1-based) |
| `limit`      | `Option<u32>`  | Number of lines to read |
| `meta`       | `Option<Meta>` | Extensibility metadata  |

**Response:** `{ content: String, meta }`

### fs/write_text_file

**Request:**

| Field        | Type           | Description            |
| ------------ | -------------- | ---------------------- |
| `session_id` | `SessionId`    | Active session         |
| `path`       | `PathBuf`      | Absolute file path     |
| `content`    | `String`       | File content to write  |
| `meta`       | `Option<Meta>` | Extensibility metadata |

**Response:** `{ meta }`

File paths MUST be absolute. Line numbers are 1-based.

---

## Terminal Methods

### Lifecycle

```
create -> (output | wait_for_exit | kill)* -> release
```

Agent MUST release terminals when no longer needed.

### terminal/create

**Request:**

| Field               | Type                      | Description            |
| ------------------- | ------------------------- | ---------------------- |
| `session_id`        | `SessionId`               | Active session         |
| `command`           | `String`                  | Command to execute     |
| `args`              | `Vec<String>`             | Command arguments      |
| `env`               | `HashMap<String, String>` | Environment variables  |
| `cwd`               | `Option<PathBuf>`         | Working directory      |
| `output_byte_limit` | `Option<u64>`             | Max output buffer size |
| `meta`              | `Option<Meta>`            | Extensibility metadata |

**Response:** `{ terminal_id: TerminalId, meta }`

### terminal/output

**Request:** `{ session_id, terminal_id, meta }`
**Response:** `{ output: String, truncated: bool, exit_status: Option<TerminalExitStatus>, meta }`

### terminal/wait_for_exit

**Request:** `{ session_id, terminal_id, meta }`
**Response:** `{ exit_status: TerminalExitStatus, meta }`

### terminal/kill

**Request:** `{ session_id, terminal_id, meta }`
**Response:** `{ meta }`

### terminal/release

**Request:** `{ session_id, terminal_id, meta }`
**Response:** `{ meta }`

### TerminalExitStatus

| Field       | Type             | Description                        |
| ----------- | ---------------- | ---------------------------------- |
| `exit_code` | `Option<u32>`    | Process exit code                  |
| `signal`    | `Option<String>` | Signal that terminated the process |
| `meta`      | `Option<Meta>`   | Extensibility metadata             |

---

## Session Modes

Modes allow agents to offer different operating behaviors (e.g., "plan" mode vs "code" mode).

### SessionModeState

| Field             | Type               | Description            |
| ----------------- | ------------------ | ---------------------- |
| `current_mode_id` | `SessionModeId`    | Currently active mode  |
| `available_modes` | `Vec<SessionMode>` | All available modes    |
| `meta`            | `Option<Meta>`     | Extensibility metadata |

### SessionMode

| Field         | Type            |
| ------------- | --------------- |
| `id`          | `SessionModeId` |
| `name`        | `String`        |
| `description` | `String`        |
| `meta`        | `Option<Meta>`  |

Mode switching: client-initiated via `session/set_mode`, or agent-initiated via `CurrentModeUpdate` notification.

---

## Config Options

Config options provide a generic mechanism for agent settings (replacing dedicated mode/model methods).

### SessionConfigOption

| Field         | Type                          | Description                |
| ------------- | ----------------------------- | -------------------------- |
| `id`          | `SessionConfigId`             | Unique identifier          |
| `name`        | `String`                      | Display name               |
| `description` | `String`                      | Human-readable description |
| `category`    | `SessionConfigOptionCategory` | Grouping category          |
| `kind`        | `SessionConfigKind`           | Value type and choices     |
| `meta`        | `Option<Meta>`                | Extensibility metadata     |

### SessionConfigOptionCategory

| Variant        | Description                         |
| -------------- | ----------------------------------- |
| `Mode`         | Operating mode selection            |
| `Model`        | Model selection                     |
| `ThoughtLevel` | Thinking/reasoning level            |
| `Other`        | Custom category (prefixed with `_`) |

### SessionConfigKind

Currently only `Select(SessionConfigSelect)` — a dropdown/picker with predefined options.

---

## Slash Commands

Agents advertise available commands via `AvailableCommandsUpdate`:

| Field         | Type                            | Description                       |
| ------------- | ------------------------------- | --------------------------------- |
| `name`        | `String`                        | Command name (without `/` prefix) |
| `description` | `String`                        | Human-readable description        |
| `input`       | `Option<AvailableCommandInput>` | Expected input format             |
| `meta`        | `Option<Meta>`                  | Extensibility metadata            |

Commands are sent as regular prompts with `/` prefix. Agents can update the command list dynamically during a session.
