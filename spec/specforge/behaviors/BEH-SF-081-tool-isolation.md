---
id: BEH-SF-081
kind: behavior
title: Tool Isolation
status: active
id_range: 081--086
invariants: [INV-SF-5]
adrs: [ADR-004]
types: [agent, agent]
ports: [ToolRegistryPort]
---

# 11 — Tool Isolation

## BEH-SF-081: Role-Based Tool Filtering — Each Role Has Declared Tool Set

Each agent role has a declared set of tools it can access. The tool set is defined per role and determines what operations the agent can perform. For example, `discovery-agent` gets web search while `feedback-synthesizer` does not; `dev-agent` gets test runner while `reviewer` does not.

### Contract

REQUIREMENT (BEH-SF-081): Each agent role MUST have a declared tool set. `ToolRegistryPort.getToolsForRole(role)` MUST return only the tools declared for that role. Tools not in the role's declared set MUST NOT be available to the agent. The tool set MUST include both built-in tools and MCP-provided tools (subject to the same role filter).

### Verification

- Per-role test: call `getToolsForRole()` for each built-in role; verify the returned tools match the declared set (e.g., `discovery-agent` gets web search, `feedback-synthesizer` does not).
- Exclusion test: verify tools not in the role's set are not returned (e.g., `reviewer` does not get test runner).
- MCP inclusion test: configure an MCP server; verify its tools are included in the role's tool set if allowed by the role filter.

---

## BEH-SF-082: Tool Resolution at Spawn Time — Tools Resolved from ToolRegistryPort at Session Creation

The tool set for an agent is resolved at session creation time from `ToolRegistryPort`. MCP-provided tools are discovered at spawn time and included alongside built-in tools. The resolved tool set is fixed for the lifetime of the session.

### Contract

REQUIREMENT (BEH-SF-082): When an agent session is created, the system MUST resolve the tool set by calling `ToolRegistryPort.getToolsForRole(role)`. MCP-provided tools MUST be discovered at this time via Claude Code's MCP server configuration. The resolved tool set MUST be passed to the spawned subprocess and MUST remain fixed for the session's lifetime.

### Verification

- Resolution timing test: verify `getToolsForRole()` is called during session creation, not later.
- MCP discovery test: configure an MCP server; create a session; verify MCP tools appear in the resolved set.
- Fixed set test: add a new MCP tool after session creation; verify the running session does not see the new tool.

---

## BEH-SF-083: No Runtime Tool Escalation — Agent Cannot Acquire New Tools after Creation

> **Invariant:** [INV-SF-5](../invariants/INV-SF-5-tool-isolation.md) — Tool Isolation

An agent cannot acquire new tools at runtime. The tool set is fixed at session creation time and enforced by the Claude Code subprocess configuration. No mechanism exists for agents to request or receive additional tools during execution.

### Contract

REQUIREMENT (BEH-SF-083): The system MUST NOT provide any mechanism for an agent to acquire additional tools after its session is created. The agent subprocess MUST be configured with a fixed tool set at spawn time. Any attempt by an agent to invoke a tool not in its declared set MUST fail.

### Verification

- No escalation test: attempt to add a tool to a running session; verify it has no effect.
- Subprocess config test: inspect the spawned subprocess configuration; verify it contains exactly the tools from `getToolsForRole()`.
- Invocation test: attempt to invoke an undeclared tool from within an agent; verify it is rejected by the subprocess.

---

## BEH-SF-084: MCP Tool Discovery — MCP-Provided Tools Included in Tool Set (Subject to Role Filter)

Claude Code natively supports MCP servers for external service access. SpecForge agents inherit MCP servers from their Claude Code subprocess configuration. MCP-provided tools are discovered at agent spawn time and included in the tool set, subject to the same role-based scoping rules as built-in tools.

### Contract

REQUIREMENT (BEH-SF-084): When MCP servers are configured in `.claude/settings.json`, the system MUST discover MCP-provided tools at agent spawn time. MCP tools MUST be included in the agent's tool set via `ToolRegistryPort.getToolsForRole()`, subject to the same role-based filtering as built-in tools. The `ToolDefinition.origin` for MCP tools MUST be `'mcp'`.

### Verification

- Discovery test: configure an MCP server; verify its tools appear in `getToolsForRole()` results.
- Filtering test: configure an MCP tool; verify it is filtered by the role-based rules (not available to roles that don't declare it).
- Origin test: verify MCP tools have `origin: 'mcp'` in their `ToolDefinition`.

---

## BEH-SF-085: Tool Registry Validation — Referencing Unknown Tool Name Produces ToolRegistryError

When an agent role or custom agent references a tool name that is not registered in `ToolRegistryPort`, the system produces a `ToolRegistryError` at registration or spawn time.

### Contract

REQUIREMENT (BEH-SF-085): When a custom agent definition or flow references a tool name that does not exist in `ToolRegistryPort`, the system MUST return a `ToolRegistryError` with the invalid tool name and role. Validation MUST occur at agent registration time (for custom agents) and at session creation time (for all agents). The agent MUST NOT be spawned with unresolvable tools.

### Verification

- Invalid tool test: register a custom agent with a non-existent tool name; verify `ToolRegistryError` is returned.
- Spawn validation test: attempt to create a session referencing an invalid tool; verify the session is not created.
- Error content test: verify the `ToolRegistryError` includes the invalid tool name and the agent role.

---

## BEH-SF-086: Custom Agent Tools — Custom Agents Declare Tools, Validated Same as Built-In

Custom agents declare their tool set as an array of tool names in the `CustomAgentConfig.tools` field. These tools are validated against `ToolRegistryPort` at registration time, following the same validation rules as built-in agents.

### Contract

REQUIREMENT (BEH-SF-086): When a custom agent is registered via `agentRegistry.register()`, the system MUST validate that all tool names in the `tools` array exist in `ToolRegistryPort`. If any tool name is invalid, the registration MUST fail with a `ToolRegistryError`. Custom agents MUST NOT bypass tool validation — they follow the same rules as built-in agents per [INV-SF-5](../invariants/INV-SF-5-tool-isolation.md).

### Verification

- Valid registration test: register a custom agent with valid tool names; verify registration succeeds.
- Invalid registration test: register with an invalid tool name; verify `ToolRegistryError` is returned.
- Parity test: verify custom agents and built-in agents go through the same tool validation code path.

---
