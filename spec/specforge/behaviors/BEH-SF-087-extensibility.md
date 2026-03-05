---
id: BEH-SF-087
kind: behavior
title: Extensibility
status: active
id_range: 087--094
invariants: [INV-SF-5, INV-SF-9]
adrs: [ADR-007, ADR-008]
types: [extensibility, extensibility]
ports: [FlowEnginePort, OrchestratorEventPort, ToolRegistryPort]
---

# 12 — Extensibility

## BEH-SF-087: Custom Flow Definition — Declarative Data Registered with Flow Engine

> **Invariant:** [INV-SF-9](../invariants/INV-SF-9-flow-determinism.md) — Flow Determinism

Custom flows are declarative `FlowDefinition` data structures — not imperative code — that define phases, agent roles, convergence criteria, and dependencies. They are registered with the flow engine at container setup time.

### Contract

REQUIREMENT (BEH-SF-087): Custom flows MUST be expressible as `FlowDefinition` data structures containing `name`, `description`, `phases` (each with `name`, `mode`, `stages`, `convergence`, `maxIterations`), and optional `tokenBudget`. Custom flows MUST be registerable via `FlowEnginePort.registerFlow()` and MUST be invocable by name via CLI (`specforge run <name>`) and web dashboard.

### Verification

- Definition test: create a `FlowDefinition` with custom phases; register it; verify it is invocable.
- CLI test: register a custom flow; invoke via `specforge run <custom-name>`; verify it executes.
- Schema test: verify the `FlowDefinition` type enforces all required fields.

---

## BEH-SF-088: Custom Agent Registration — Role, Domain, System Prompt, Tools, Model

Custom agents are registered with a unique role identifier, domain grouping, system prompt, tool set, and model selection. They implement the same protocol as built-in agents.

### Contract

REQUIREMENT (BEH-SF-088): Custom agents MUST be registerable via `agentRegistry.register()` with `role` (unique identifier), `domain`, `systemPrompt`, `tools` (tool names from ToolRegistryPort), and `model`. Registered custom agents MUST be referenceable in custom flow definitions by their role name. Custom agents MUST follow the same `AgentPort` protocol as built-in agents.

### Verification

- Registration test: register a custom agent; verify it is available for use in flow definitions.
- Flow reference test: reference the custom agent in a flow definition; verify the flow executes with the custom agent.
- Protocol test: verify the custom agent receives tasks, reads/writes the ACP session, and produces output in the standard format.

---

## BEH-SF-089: Custom Agent Validation — Tool Names Validated against ToolRegistryPort

> **Invariant:** [INV-SF-5](../invariants/INV-SF-5-tool-isolation.md) — Tool Isolation

When a custom agent is registered, all tool names in its configuration are validated against `ToolRegistryPort`. Invalid tool names produce a `ToolRegistryError`. Custom agents do not bypass tool validation.

### Contract

REQUIREMENT (BEH-SF-089): When a custom agent is registered, the system MUST validate every tool name in the `tools` array against `ToolRegistryPort`. If any tool name is not found, the system MUST reject the registration with a `ToolRegistryError`. No custom agent MUST be registered with unresolvable tools.

### Verification

- Valid tools test: register with all valid tool names; verify success.
- Invalid tool test: include a non-existent tool name; verify `ToolRegistryError`.
- Partial invalid test: include one valid and one invalid tool; verify the entire registration fails.

---

## BEH-SF-090: Plugin Architecture — Discovery, Lifecycle, Agent Roles, Conventions, Hooks

Plugins are self-contained extensions that can provide custom agent roles, convention overrides (spec structure, requirement ID scheme, output formats), hooks, and additional flow definitions. Plugins are discovered from `~/.specforge/plugins/` and project-local `.specforge/plugins/` directories. Each plugin has a `PluginManifest` describing its capabilities.

### Contract

REQUIREMENT (BEH-SF-090): The system MUST discover plugins from `~/.specforge/plugins/` (global) and `.specforge/plugins/` (project-local). Each plugin MUST declare a `PluginManifest` with `name`, `version`, `provides` (listing agent roles, hooks, conventions, and flows), and `activationMode` (`'always'` or `'on-demand'`). `specforge plugin list` MUST show all discovered plugins. `specforge plugin enable <name>` and `specforge plugin disable <name>` MUST control on-demand plugins. Plugin-provided agent roles MUST be registerable with the agent registry and referenceable in flow definitions. Plugin-provided conventions MUST override defaults when the plugin is active.

### Verification

- Discovery test: place a plugin in `~/.specforge/plugins/`; verify `specforge plugin list` shows it.
- Activation test: enable an on-demand plugin; verify its agent roles become available.
- Agent role test: register a plugin-provided agent role; reference it in a flow; verify it executes.
- Convention test: activate a plugin with custom spec structure; scaffold a spec; verify the structure matches.
- Disable test: disable a plugin; verify its agent roles are no longer available.

---

## BEH-SF-091: Pre-Phase Hooks — Custom Logic before Phase Execution

Pre-phase hooks execute custom logic before any phase begins. They receive a `HookContext` with flow run ID, phase name, and iteration number, and have access to the ACP session.

### Contract

REQUIREMENT (BEH-SF-091): When a pre-phase hook is registered for a phase (or `'*'` for all phases), the system MUST execute the hook's `handler` function before the phase begins each iteration. The `HookContext` MUST provide `flowRunId`, `phaseName`, `iteration`, and `acpSession`. If the hook fails, the system MUST record the `HookError` and the phase MUST NOT proceed.

### Verification

- Execution test: register a pre-phase hook; run a flow; verify the hook executes before the phase.
- Wildcard test: register a hook for `'*'`; verify it runs before every phase.
- Context test: verify the `HookContext` contains the correct flow run ID, phase name, and iteration.
- Failure test: register a hook that fails; verify the phase does not proceed and a `HookError` is recorded.

---

## BEH-SF-092: Post-Phase Hooks — Custom Logic after Phase Execution with Access to Metrics

Post-phase hooks execute custom logic after a phase completes. They receive a `HookContext` with metrics (the `PhaseMetrics` from the completed iteration), enabling integration with external systems.

### Contract

REQUIREMENT (BEH-SF-092): When a post-phase hook is registered, the system MUST execute the hook's `handler` function after the phase completes each iteration. The `HookContext` MUST include `metrics` (the `PhaseMetrics` for the completed iteration). Post-phase hooks MUST NOT block the flow from proceeding to the next phase (failures are logged, not blocking).

### Verification

- Execution test: register a post-phase hook; run a flow; verify the hook executes after the phase.
- Metrics test: verify the `HookContext.metrics` contains accurate phase metrics.
- Non-blocking test: register a post-phase hook that fails; verify the flow continues to the next phase.

---

## BEH-SF-093: Custom Convergence Override — Replace Default Convergence for Specific Phases

Custom convergence criteria can override the default convergence function for specific phases, allowing relaxed or tightened convergence conditions.

### Contract

REQUIREMENT (BEH-SF-093): `flowEngine.setConvergenceOverride(phaseName, criteria)` MUST replace the default convergence function for the specified phase with the provided `ConvergenceCriteria`. The override MUST apply to all flow runs using that phase. The override MUST be removable (restoring the default convergence).

### Verification

- Override test: set a custom convergence for a phase; run a flow; verify the custom criteria is evaluated.
- Relaxed test: override with a more lenient criteria; verify convergence is reached earlier.
- Tightened test: override with a stricter criteria; verify more iterations are required.
- Removal test: remove the override; verify the default convergence is restored.

---

## BEH-SF-094: Event Protocol — Subscribe to Specific or All Orchestrator Events

The `OrchestratorEventPort` provides a formalized event system for subscribing to orchestrator events (`flow-started`, `phase-completed`, `finding-added`, `agent-spawned`, `budget-warning`, etc.).

### Contract

REQUIREMENT (BEH-SF-094): `OrchestratorEventPort.subscribe(eventType, handler)` MUST register a handler for a specific event type and MUST return an `Unsubscribe` function. `subscribeAll(handler)` MUST register a handler for all event types. Event handlers MUST be invoked synchronously when the event occurs. Calling `Unsubscribe` MUST stop further event delivery to that handler.

### Verification

- Subscribe test: subscribe to `'phase-completed'`; run a flow; verify the handler is called when a phase completes.
- Subscribe all test: subscribe to all events; verify the handler receives every event type emitted during the flow.
- Unsubscribe test: subscribe, then unsubscribe; verify the handler is no longer called.
- Event content test: verify each event carries the expected fields (e.g., `flowRunId`, `phaseName`, `metrics`).
