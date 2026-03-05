# Zed ACP — Overview

**Source:** https://agentclientprotocol.com, https://zed.dev/blog/acp, https://github.com/agentclientprotocol/agent-client-protocol
**Captured:** 2026-02-28

---

## What ACP Is

The **Agent Client Protocol (ACP)** standardizes communication between **code editors** (clients) and **coding agents** (AI programs that autonomously modify code). Created by Zed Industries, ACP is now governed as an open standard under Apache 2.0.

ACP is **not** the same as the Linux Foundation's Agent Communication Protocol (also abbreviated ACP). Zed's ACP is specifically for **editor-to-agent communication** — the interface between an IDE and an autonomous coding assistant.

### Design Philosophy

ACP assumes the user is primarily in their editor and reaches out to agents for task assistance. The editor (client) spawns agent processes and mediates all access to the workspace — files, terminals, and MCP servers flow through the editor. The user retains control over tool call authorization via a permission system.

### Key Properties

| Property         | Value                                            |
| ---------------- | ------------------------------------------------ |
| Transport        | JSON-RPC 2.0 over stdio (agents as subprocesses) |
| Protocol version | V1 (current), V0 (fallback)                      |
| Text format      | Markdown (default)                               |
| License          | Apache 2.0                                       |
| Governance       | Open standard, multi-vendor                      |

---

## Ecosystem

### Supported Editors (Clients)

| Editor         | Status                |
| -------------- | --------------------- |
| Zed            | Production (built-in) |
| JetBrains IDEs | Plugin available      |
| Neovim         | Plugin available      |
| Emacs          | Plugin available      |

### Registered Agents

20+ agents in the official registry, including:

| Agent          | Distribution | Author                     |
| -------------- | ------------ | -------------------------- |
| Claude Agent   | npx          | Anthropic / Zed Industries |
| Gemini CLI     | npx          | Google                     |
| GitHub Copilot | binary       | GitHub                     |
| Goose          | binary       | Block                      |
| Codex          | npx          | OpenAI                     |
| Auggie         | binary       | Augment Code               |
| OpenCode       | binary       | OpenCode                   |

### SDKs

| Language   | Package                                    |
| ---------- | ------------------------------------------ |
| Rust       | `agent-client-protocol-schema` (crates.io) |
| TypeScript | Available                                  |
| Python     | Available                                  |
| Kotlin     | Available                                  |

---

## ACP vs MCP

ACP and MCP (Model Context Protocol) are complementary:

- **MCP** connects AI models to **tools and data sources** (servers provide tools to models)
- **ACP** connects **editors to autonomous agents** (agents are full programs that use the editor as their workspace)

ACP agents can consume MCP servers — the editor passes MCP server configurations to the agent during session setup, and can also expose its own tools via a stdio MCP proxy.

---

## Core Concepts

### Client

The editor application. Spawns agent subprocesses, mediates workspace access (file read/write, terminal creation), manages permission prompts, and renders the agent's streaming output.

### Agent

An autonomous coding program. Receives user prompts, streams back messages/thoughts/tool calls/plans, and requests workspace access through the client. Runs as a subprocess communicating over stdin/stdout.

### Session

A conversation between client and agent. Contains messages, tool calls, and state. Sessions can be created, loaded (resumed), forked, and listed (unstable features).

### Tool Calls

Structured representations of agent actions (file reads, edits, searches, terminal commands). Each has a kind, status, content, and optional locations. The client renders these in the UI and manages permissions.

### Plans

Structured task lists the agent generates to organize its work. Each plan entry has content, priority (High/Medium/Low), and status (Pending/InProgress/Completed). Plans are sent as complete replacements.
