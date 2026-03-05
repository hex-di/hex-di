# References

External tool documentation used as implementation reference for SpecForge adapters.

**Captured:** 2026-02-28
**Spec Version:** 4.0

---

## External Tools

| Tool                          | Directory                 | Description                                                                                 |
| ----------------------------- | ------------------------- | ------------------------------------------------------------------------------------------- |
| [Claude Code](./claude-code/) | `references/claude-code/` | Agent SDK, CLI, hooks, settings, permissions, model configuration                           |
| [Huly](./huly/)               | `references/huly/`        | Plugin system, metadata-driven data model, transaction-based real-time, workspace lifecycle |
| [Zed ACP](./zed/)             | `references/zed/`         | Agent Client Protocol, Zed's crate architecture, registry, agent extensions, Rust SDK       |

---

## Claude Code Reference Files

| File                                                 | Scope              | Key Topics                                                      |
| ---------------------------------------------------- | ------------------ | --------------------------------------------------------------- |
| [overview.md](./claude-code/overview.md)             | Architecture       | Agentic loop, built-in tools, session model, context management |
| [agent-sdk.md](./claude-code/agent-sdk.md)           | Programmatic API   | Agent SDK `query()`, hooks, subagents, MCP integration          |
| [cli-reference.md](./claude-code/cli-reference.md)   | CLI                | Commands, flags, output formats                                 |
| [headless-usage.md](./claude-code/headless-usage.md) | Non-interactive    | Print mode, structured output, session continuation, CI/CD      |
| [subagents.md](./claude-code/subagents.md)           | Subagent system    | Built-in subagents, custom definitions, scopes, configuration   |
| [hooks.md](./claude-code/hooks.md)                   | Lifecycle hooks    | Hook types, matchers, input/output format, permission decisions |
| [settings.md](./claude-code/settings.md)             | Configuration      | Settings hierarchy, file locations, all settings keys, env vars |
| [permissions.md](./claude-code/permissions.md)       | Access control     | Permission modes, rule syntax, tool-specific rules              |
| [model-config.md](./claude-code/model-config.md)     | Models             | Aliases, effort levels, extended thinking, 1M context           |
| [agent-teams.md](./claude-code/agent-teams.md)       | Multi-agent        | Team lead + teammates, shared tasks, messaging, experimental    |
| [memory.md](./claude-code/memory.md)                 | Persistent context | CLAUDE.md, auto-memory, rules directory, imports                |
| [costs.md](./claude-code/costs.md)                   | Token economics    | Usage tracking, budget controls, cost optimization              |

---

## Huly Reference Files

| File                                                    | Scope               | Key Topics                                                                       |
| ------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------- |
| [overview.md](./huly/overview.md)                       | Overview            | Product positioning, feature areas, technology stack, repo structure, EPL-2.0    |
| [architecture.md](./huly/architecture.md)               | Architecture        | 30+ service topology, Transactor hub, event-driven patterns, server pipeline     |
| [data-model.md](./huly/data-model.md)                   | Data model          | `Obj → Doc → AttachedDoc`, `Class<T>`/`Mixin<T>`, branded types, transactions    |
| [plugin-system.md](./huly/plugin-system.md)             | Plugin system       | PRI identifiers, `plugin()` factory, lazy loading, 3-part pattern, 192 plugins   |
| [collaboration.md](./huly/collaboration.md)             | Collaboration       | Y.js CRDT, Transactor real-time, HulyPulse notifications, optimistic concurrency |
| [workspace-lifecycle.md](./huly/workspace-lifecycle.md) | Workspace lifecycle | State machine (20+ states), identity model, AccountRole hierarchy, Space RBAC    |
| [api-client.md](./huly/api-client.md)                   | API client          | TypeScript client, authentication, TxFactory CRUD, WebSocket transport           |
| [deployment.md](./huly/deployment.md)                   | Deployment          | Docker Compose, system requirements, infrastructure deps, service ports, volumes |

---

## Zed ACP Reference Files

| File                                             | Scope                  | Key Topics                                                                            |
| ------------------------------------------------ | ---------------------- | ------------------------------------------------------------------------------------- |
| [overview.md](./zed/overview.md)                 | Protocol overview      | What ACP is, ecosystem, ACP vs MCP, core concepts                                     |
| [architecture.md](./zed/architecture.md)         | Architecture           | Subprocess model, crate architecture, MCP integration                                 |
| [protocol-spec.md](./zed/protocol-spec.md)       | Protocol specification | JSON-RPC transport, initialization, sessions, prompting, all methods                  |
| [tool-calls.md](./zed/tool-calls.md)             | Tool calls             | ToolCall, ToolCallUpdate, ToolKind, ToolCallStatus, ToolCallContent, permissions      |
| [capabilities.md](./zed/capabilities.md)         | Capabilities           | Client/agent capabilities, fs methods, terminal methods, modes, config options        |
| [registry.md](./zed/registry.md)                 | Registry               | Registry format, agent.json schema, distribution types, registered agents             |
| [agent-extensions.md](./zed/agent-extensions.md) | Extensions             | extension.toml format, platform targets, icon requirements, extensions vs registry    |
| [rust-sdk.md](./zed/rust-sdk.md)                 | Rust SDK               | agent-client-protocol-schema crate, Side trait, request/response enums, content types |
| [zed-crates.md](./zed/zed-crates.md)             | Zed internals          | agent_servers, acp_thread, acp_tools, agent, agent_ui crate deep dives                |
| [ecosystem.md](./zed/ecosystem.md)               | Ecosystem              | Supported agents, editors, SDKs, distribution channels, governance                    |

---

## Usage

These reference files capture the **essential API surface** relevant to SpecForge's adapters — not a full copy of upstream docs, but the information needed to implement and maintain adapters (e.g., `ClaudeCodeAdapter`, ACP-based agent integrations).

When upstream documentation changes, update these files and bump the "Captured" date above.

## Cross-References

- [ADR-004](../decisions/ADR-004-claude-code-sdk.md) — Claude Code CLI as opaque agent subprocess
- [behaviors/BEH-SF-151-claude-code-adapter.md](../behaviors/BEH-SF-151-claude-code-adapter.md) — ClaudeCodeAdapter behavioral contracts
- [types/ports.md](../types/ports.md) — LLMProviderService, AgentSpawnConfig, AgentHandle
- [architecture/ports-and-adapters.md](../architecture/ports-and-adapters.md) — LLMProviderPort in universal ports
