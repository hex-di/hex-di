# Zed ACP — Architecture

**Source:** https://github.com/zed-industries/zed/tree/main/crates, https://github.com/agentclientprotocol/agent-client-protocol
**Captured:** 2026-02-28

---

## Communication Model

ACP uses a **subprocess model**: the editor (client) spawns each agent as a child process and communicates over stdin/stdout using JSON-RPC 2.0.

```
┌─────────────────────────────────────────────┐
│                  Zed Editor                  │
│                  (Client)                    │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ agent_ui │  │  agent   │  │ acp_tools│  │
│  │  (panel) │  │  (logic) │  │  (logs)  │  │
│  └────┬─────┘  └────┬─────┘  └──────────┘  │
│       │              │                       │
│       └──────┬───────┘                       │
│              │                               │
│       ┌──────┴──────┐                        │
│       │agent_servers │                        │
│       │ (AcpConn)   │                        │
│       └──────┬──────┘                        │
│              │ stdin/stdout                   │
└──────────────┼──────────────────────────────┘
               │
        ┌──────┴──────┐
        │ Agent Process│
        │ (subprocess) │
        └─────────────┘
```

### Message Flow

1. **Client -> Agent**: Requests and notifications over agent's stdin
2. **Agent -> Client**: Responses, notifications, and requests over agent's stdout
3. **Agent stderr**: Available for agent logging (not ACP protocol messages)

### Concurrency

- Each ACP connection supports **multiple concurrent sessions** (several conversations simultaneously)
- Agent processes are spawned **on-demand** when users initiate connections
- Bidirectional request-response allows both sides to make requests of the other

---

## Subprocess Lifecycle

### Spawn

The client launches the agent binary as a subprocess. The binary path comes from:

1. **ACP Registry** — downloaded and cached automatically
2. **Zed Extension** — bundled in `extension.toml` with platform-specific archives
3. **Custom server** — user-configured binary path

### Initialize

Client sends `initialize` with protocol version, capabilities, and client info. Agent responds with its capabilities and available auth methods.

### Authenticate (conditional)

If the agent's `InitializeResponse` includes `auth_methods`, the client presents auth options to the user and sends `authenticate` with the chosen method.

### Session Setup

Client sends `session/new` (or `session/load` for resume) with the working directory and MCP server configurations. Agent responds with session ID, available modes, models, and config options.

### Prompt Loop

Client sends `session/prompt` with user messages. Agent streams `session/update` notifications (message chunks, tool calls, plans) and may send `session/request_permission` requests. Loop ends with `PromptResponse` containing a `StopReason`.

### Teardown

Agent process is terminated when the connection is closed or Zed shuts down.

---

## Zed's Crate Architecture

Zed implements ACP across 6 internal crates plus the external SDK:

| Crate                          | Layer        | Purpose                                                       |
| ------------------------------ | ------------ | ------------------------------------------------------------- |
| `agent-client-protocol-schema` | External SDK | Rust types, JSON-RPC, `Agent`/`Client` traits                 |
| `agent_servers`                | Connection   | Agent server abstraction, `AcpConnection`, process management |
| `acp_thread`                   | Model        | Thread model — messages, diffs, terminals, mentions           |
| `acp_tools`                    | Tooling      | ACP log viewer, connection registry                           |
| `agent`                        | Logic        | Core agent orchestration, ThreadStore, tools, DB              |
| `agent_ui`                     | UI           | Agent panel, conversation view, diff display, config UI       |

### Dependency Flow

```
agent_ui
  └── agent
        ├── agent_servers
        │     └── agent-client-protocol-schema (external)
        ├── acp_thread
        │     └── agent-client-protocol-schema
        └── acp_tools
```

### Cross-Crate Boundaries

- **`agent-client-protocol-schema`** defines all protocol types and the `Side` trait for message routing
- **`agent_servers`** owns the connection lifecycle (spawn, initialize, authenticate, session management)
- **`acp_thread`** manages conversation state (messages, tool calls, diffs, terminals)
- **`agent`** orchestrates high-level agent behavior (thread store, tools, persistence)
- **`agent_ui`** renders everything and handles user interaction
- **`acp_tools`** provides ACP-specific tooling (log inspection, connection management)

---

## MCP Integration

ACP agents can consume MCP servers. The integration works as follows:

1. Editor passes MCP server configurations to the agent during `session/new`
2. Configurations include stdio, HTTP, and SSE server types
3. When the editor exports its own tools via MCP, it provides a **stdio proxy** that tunnels requests back to itself
4. This proxy is necessary because agents typically only support MCP over stdio

```rust
enum McpServer {
    Stdio(McpServerStdio),  // { name, command, args, env }
    Http(McpServerHttp),    // { name, url, headers } — requires mcp.http capability
    Sse(McpServerSse),      // { name, url, headers } — deprecated
}
```
