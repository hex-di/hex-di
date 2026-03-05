# Zed ACP — Zed Crates

**Source:** https://github.com/zed-industries/zed/tree/main/crates
**Captured:** 2026-02-28

---

## Overview

Zed implements ACP support across 6 internal crates, each handling a distinct layer of the integration. These crates depend on the external `agent-client-protocol-schema` SDK for protocol types.

---

## agent_servers

**Path:** `crates/agent_servers/src/`
**Layer:** Connection management

Owns the agent subprocess lifecycle — spawning, initialization, authentication, and session management.

### Key Files

| File               | Size | Purpose                            |
| ------------------ | ---- | ---------------------------------- |
| `acp.rs`           | 52KB | ACP protocol client implementation |
| `agent_servers.rs` | 4KB  | Main module, `AgentServer` trait   |
| `custom.rs`        | 17KB | Custom agent server handling       |
| `e2e_tests.rs`     | 15KB | End-to-end protocol tests          |

### Core Abstractions

- **`AgentServer` trait** — abstraction over different agent server types
- **`AcpConnection`** — manages a live connection to an ACP agent subprocess, handling JSON-RPC message routing over stdio

### Dependencies

`agent-client-protocol` (external SDK), `acp_tools`, `acp_thread`, `language_model`, `project`, `terminal`, `settings`

---

## acp_thread

**Path:** `crates/acp_thread/src/`
**Layer:** Conversation model

Manages the thread/conversation state — messages, diffs, tool calls, terminals, and @-mentions.

### Key Files

| File            | Size  | Purpose                                |
| --------------- | ----- | -------------------------------------- |
| `acp_thread.rs` | 160KB | Core thread model and state management |
| `connection.rs` | 25KB  | ACP connection state tracking          |
| `diff.rs`       | 16KB  | Diff handling for tool call content    |
| `mention.rs`    | 27KB  | @-mention parsing and resolution       |
| `terminal.rs`   | 8KB   | Terminal output integration            |

### Responsibilities

- Translating ACP `SessionUpdate` variants into Zed's internal thread model
- Managing message chunks (user, agent, thought) and assembling them into complete messages
- Tracking tool call state transitions (Pending -> InProgress -> Completed/Failed)
- Rendering diffs from `ToolCallContent::Diff` for the UI layer
- Resolving @-mentions to workspace files, symbols, and other resources

---

## acp_tools

**Path:** `crates/acp_tools/src/`
**Layer:** Tooling and diagnostics

Provides ACP-specific tooling for debugging and managing agent connections.

### Key Files

| File           | Size | Purpose                                               |
| -------------- | ---- | ----------------------------------------------------- |
| `acp_tools.rs` | 22KB | ACP log viewer, connection registry, tool definitions |

### Responsibilities

- ACP message log inspection (viewing JSON-RPC traffic)
- Agent connection registry (tracking active connections)
- Tool-level definitions for ACP-specific operations

---

## agent

**Path:** `crates/agent/src/`
**Layer:** Core logic

The main orchestration crate — coordinates agent behavior, thread persistence, tool execution, and database operations.

### Key Files

| File                     | Size  | Purpose                                       |
| ------------------------ | ----- | --------------------------------------------- |
| `agent.rs`               | 94KB  | Main agent orchestration                      |
| `thread.rs`              | 142KB | Thread/conversation management                |
| `tool_permissions.rs`    | 77KB  | Tool permission management and policy         |
| `edit_agent.rs`          | 53KB  | Inline edit agent (code generation in buffer) |
| `db.rs`                  | 29KB  | Database/persistence layer                    |
| `thread_store.rs`        | 12KB  | Thread persistence and listing                |
| `native_agent_server.rs` | 5KB   | Native (built-in) server integration          |
| `tools.rs` + `tools/`    | —     | Tool implementations                          |
| `outline.rs`             | —     | Code outline generation                       |
| `pattern_extraction.rs`  | —     | Code pattern analysis                         |
| `templates.rs`           | —     | Prompt templates                              |

### Core Abstractions

- **NativeAgent** — Zed's built-in agent that uses language model APIs directly (bypasses ACP)
- **Thread** — high-level conversation state combining acp_thread model with Zed-specific state
- **ThreadStore** — persistence layer for saving/loading/listing threads
- **Tool permissions** — policy engine for which tools an agent can execute, integrating with the ACP permission flow

---

## agent_ui

**Path:** `crates/agent_ui/src/`
**Layer:** User interface

Renders the agent panel, conversation views, diffs, configuration, and all interactive elements.

### Key Files

| File                      | Size  | Purpose                                |
| ------------------------- | ----- | -------------------------------------- |
| `connection_view.rs`      | 223KB | Main conversation view                 |
| `agent_panel.rs`          | 145KB | Agent side panel                       |
| `text_thread_editor.rs`   | 133KB | Text-based thread editor               |
| `message_editor.rs`       | 128KB | Message composition UI                 |
| `inline_assistant.rs`     | 92KB  | Inline code assistant                  |
| `completion_provider.rs`  | 87KB  | Completion suggestions                 |
| `agent_diff.rs`           | 81KB  | Diff display and review                |
| `buffer_codegen.rs`       | 76KB  | Buffer-level code generation           |
| `agent_configuration.rs`  | 61KB  | Agent settings UI                      |
| `thread_history.rs`       | 59KB  | Conversation history browser           |
| `model_selector.rs`       | 30KB  | Model picker widget                    |
| `config_options.rs`       | 30KB  | Config option rendering                |
| `agent_registry_ui.rs`    | 28KB  | Registry browser for installing agents |
| `mode_selector.rs`        | 8KB   | Mode selector widget                   |
| `slash_command.rs`        | —     | Slash command UI                       |
| `slash_command_picker.rs` | —     | Command picker/autocomplete            |

### Key UI Components

- **Agent Panel** — the main sidebar panel for agent interaction
- **Connection View** — renders a full conversation with messages, tool calls, diffs, and plans
- **Agent Diff** — specialized diff viewer for agent-generated file changes
- **Config Options** — renders `SessionConfigOption` as UI controls (dropdowns, toggles)
- **Mode Selector** — UI for switching between agent modes
- **Model Selector** — UI for choosing the agent's model
- **Registry UI** — browse and install agents from the ACP registry

---

## Dependency Graph

```
agent_ui
  └── agent
        ├── agent_servers
        │     ├── agent-client-protocol-schema (external)
        │     ├── acp_tools
        │     └── acp_thread
        │           └── agent-client-protocol-schema
        ├── acp_thread
        └── acp_tools
```

### Layer Boundaries

| From            | To                                         | Allowed                           |
| --------------- | ------------------------------------------ | --------------------------------- |
| `agent_ui`      | `agent`, `acp_thread`, `agent_servers`     | Yes                               |
| `agent`         | `agent_servers`, `acp_thread`, `acp_tools` | Yes                               |
| `agent_servers` | `acp_thread`, `acp_tools`, external SDK    | Yes                               |
| `acp_thread`    | External SDK                               | Yes                               |
| `acp_tools`     | External SDK                               | Yes                               |
| Any lower crate | `agent_ui` or `agent`                      | No (upward dependency prohibited) |
