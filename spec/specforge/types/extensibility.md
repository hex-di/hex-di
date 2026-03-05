---
id: TYPE-SF-009
kind: types
title: Extensibility Types
status: active
domain: extensibility
behaviors: []
adrs: [ADR-019, ADR-020, ADR-022]
---

# Extensibility Types

- [architecture/c1-system-context.md](../architecture/c1-system-context.md) -- system context for extensibility points
- [types/flow.md](./flow.md) -- `PhaseMetrics`, `FlowRunStatus`, `Finding`, `TokenUsage`, `ModelSelection`, `AgentRole`
- [types/agent.md](./agent.md) -- `AgentRole` used in `OrchestratorEvent`
- [types/errors.md](./errors.md) -- `HookError`

---

## Phase Hooks

```typescript
interface PhaseHook {
  readonly phase: string;
  readonly timing: "pre" | "post";
  readonly handler: (context: HookContext) => ResultAsync<void, HookError>;
}

interface HookContext {
  readonly flowRunId: string;
  readonly phaseName: string;
  readonly iteration: number;
  readonly metrics: PhaseMetrics;
  readonly messageExchange: MessageExchangeService;
}
```

> **Cross-reference:** `PhaseMetrics` is defined in [types/flow.md](./flow.md#phase-metrics). `MessageExchangeService` is defined in [types/ports.md](./ports.md#message-exchange-port).

> **Note (N16):** `HookContext.messageExchange` is exposed for audit and logging hooks that need to read session history or post observability messages. Phase hooks should not use it for inter-agent communication -- that is handled by the flow engine's message routing.

> **Cross-reference (C41):** `MessageExchangeService` is defined in [types/ports.md](./ports.md#message-exchange-port).

```typescript

```

---

## Orchestrator Events

Formalized event system for custom integrations, analytics, and external notifications.

> **Shared Event Type:** `OrchestratorEvent` is the canonical event type used across the system. It is consumed by [types/ports.md](./ports.md) (`EventBusService`, `OrchestratorEventService`) and emitted by flow engine, session manager, and cost optimization components.

> **Cross-module dependency note:** `OrchestratorEvent` is used by both `types/ports.md` and `types/extensibility.md`. To resolve the bidirectional dependency, `OrchestratorEvent` is canonically defined here in `types/extensibility.md` and re-exported by reference from `types/ports.md`. At implementation time, this type should live in a shared `types/events.ts` module.

> **Disambiguation (ADR-019):** `FlowUpdate` (defined in [types/acp.md](./acp.md#flowupdate)) and `OrchestratorEvent` serve different purposes with no overlap:
>
> - **`FlowUpdate`** = session-scoped streaming updates (what happened inside a session). Delivered via `MessageExchangeService.subscribe()` and `streamUpdates()`. Variants: `AgentMessageChunk`, `AgentThoughtChunk`, `AgentFinding`, `AgentDocument`, `ToolCallStarted`, `ToolCallCompleted`, `CodeDiff`, `AgentPlan`, `PermissionRequested`, `InterAgentMessage`, `BudgetZoneChanged`, `PhaseConverged`.
> - **`OrchestratorEvent`** = system-level lifecycle events (what happened to the flow/phase). Delivered via `EventBusService.subscribe()`. Variants: `flow-started`, `flow-completed`, `phase-started`, `phase-completed`, `finding-added`, `agent-spawned`, `agent-completed`, `budget-warning`, `convergence-reached`.
>
> `FlowUpdate` replaces the former `ACPMessage` callback in `MessageExchangeService.subscribe()`. `OrchestratorEvent` is unchanged.

```typescript
type OrchestratorEvent =
  | { readonly _tag: "flow-started"; readonly flowRunId: string; readonly flowName: string }
  | { readonly _tag: "flow-completed"; readonly flowRunId: string; readonly status: FlowRunStatus }
  | {
      readonly _tag: "phase-started";
      readonly flowRunId: string;
      readonly phaseName: string;
      readonly iteration: number;
    }
  | {
      readonly _tag: "phase-completed";
      readonly flowRunId: string;
      readonly phaseName: string;
      readonly metrics: PhaseMetrics;
    }
  | { readonly _tag: "finding-added"; readonly flowRunId: string; readonly finding: Finding }
  | {
      readonly _tag: "agent-spawned";
      readonly flowRunId: string;
      readonly sessionId: string;
      readonly role: AgentRole;
    }
  | {
      readonly _tag: "agent-completed";
      readonly flowRunId: string;
      readonly sessionId: string;
      readonly role: AgentRole;
    }
  | {
      readonly _tag: "budget-warning";
      readonly flowRunId: string;
      readonly usage: TokenUsage;
      readonly threshold: number;
    }
  | {
      readonly _tag: "convergence-reached";
      readonly flowRunId: string;
      readonly phaseName: string;
      readonly iteration: number;
    };
```

> **Note (N17):** The former `MetricsUpdated` ACP session event is now covered by the `budget-warning` OrchestratorEvent variant. When token accounting detects a threshold crossing, it publishes a `budget-warning` event through the EventBusPort. There is no separate "MetricsUpdated" event; phase-level metrics are available via the `phase-completed` event.

---

## Custom Agent Configuration

```typescript
interface CustomAgentConfig {
  readonly role: string;
  readonly domain: string;
  readonly systemPrompt: string;
  readonly tools: ReadonlyArray<string>;
  readonly model: ModelSelection;
}
```

> **N21: Dynamic Role Deactivation.** When a dynamic role's activation predicate returns false on a subsequent flow run (e.g., a framework was removed from the project), the role is not activated for that flow. Existing session chunks from prior flows with the role remain in the graph but are not composed into new sessions. The role template remains registered for future activation if the predicate becomes true again.

```typescript

```

---

## Convention Plugins

```typescript
interface ConventionPlugin {
  readonly name: string;
  readonly specStructure: SpecStructureDefinition;
  readonly requirementIdScheme: RequirementIdScheme;
  readonly outputFormats: ReadonlyArray<string>;
}

interface RequirementIdScheme {
  readonly prefix?: string;
  readonly separator?: string;
  readonly sectionEncoding?: string;
  readonly numberingStrategy?: string;
}
```

Built-in schemes:

- `default`: `REQ-<section>-<number>` (e.g., `REQ-AUTH-001`)
- `numeric`: `<number>` (e.g., `001`, `002`)

Custom schemes define: prefix, separator, section encoding, numbering strategy.

---

## Spec Structure Definition

Defines the expected structure of specification documents for convention plugins.

```typescript
interface SpecStructureDefinition {
  readonly sections: ReadonlyArray<SpecSection>;
  readonly requiredSections: ReadonlyArray<string>;
  readonly fileExtension: string;
}

interface SpecSection {
  readonly name: string;
  readonly description: string;
  readonly template: string | undefined;
  readonly order: number;
}
```

---

## Plugin System

```typescript
interface PluginManifest {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly specforgeVersion: string; // semver range, e.g. "^1.0.0"
  readonly provides: {
    readonly agentPacks?: ReadonlyArray<string>;
    readonly conventions?: ReadonlyArray<string>;
    readonly flows?: ReadonlyArray<string>;
    readonly mcpServers?: ReadonlyArray<string>;
    readonly hooks?: ReadonlyArray<string>;
  };
  readonly requires?: ReadonlyArray<{
    readonly name: string;
    readonly version: string; // semver range
  }>;
}

interface PluginService {
  discover(): Promise<Result<ReadonlyArray<PluginManifest>, PluginLoadError>>;
  enable(name: string): Promise<Result<void, PluginLoadError>>;
  disable(name: string): Promise<Result<void, PluginLoadError>>;
  validate(manifest: PluginManifest): Result<void, PluginManifestError>;
  list(): Promise<
    Result<
      ReadonlyArray<{
        readonly name: string;
        readonly enabled: boolean;
        readonly manifest: PluginManifest;
      }>,
      PluginLoadError
    >
  >;
}

interface PluginSandboxService {
  /** Deferred — plugin sandboxing is a future concern. Interface defined for forward compatibility. */
  createSandbox(pluginName: string): Promise<Result<PluginSandbox, PluginLoadError>>;
  destroySandbox(pluginName: string): Promise<Result<void, PluginLoadError>>;
}
```

> **Cross-reference:** `PluginLoadError` and `PluginManifestError` are defined in [types/errors.md](./errors.md#plugin-errors). `PluginSandbox` is a deferred type -- its shape will be defined when sandboxing is implemented.

---

## Type Dependency Direction

> **Bidirectional dependency (C41):** `ports.md` depends on `extensibility.md` for `OrchestratorEvent`. `extensibility.md` depends on `ports.md` for `MessageExchangeService`. This bidirectional dependency is intentional: each file is self-contained for its primary concern (extensibility types vs port service interfaces). At the implementation level, both types would be imported from a shared `types/` barrel export, avoiding circular module imports.

---

## Extension Method Conventions

Extension methods allow agents and third-party integrations to register custom protocol methods without modifying the core ACP protocol. See [ADR-020](../decisions/ADR-020-protocol-extension-observability.md), [INV-SF-38](../invariants/INV-SF-38-extension-method-isolation.md).

### Naming Convention

All extension method names MUST start with `_` (underscore) followed by a namespace and method name separated by `.`:

```
_<namespace>.<method>
```

Examples: `_acme.lint`, `_github.pr-review`, `_specforge.coverage-check`

### Namespace Isolation

The `ExtensionMethodDispatcher` validates that:

1. The method name starts with `_`
2. The namespace is unique among registered extensions
3. No extension method name collides with a core protocol method name
4. Extension handlers are invoked in isolation — errors in one extension do not affect others

### ExtFlowUpdate vs OrchestratorEvent

Extension methods produce results via `FlowUpdate { _tag: "ExtFlowUpdate" }`, NOT via `OrchestratorEvent`:

- **`ExtFlowUpdate`** — Session-scoped extension results delivered to subscribers. Contains `extensionName` and `payload`. Part of the `FlowUpdate` union.
- **`OrchestratorEvent`** — System-level lifecycle events. Extensions MUST NOT add new `OrchestratorEvent` variants; they use `ExtFlowUpdate` instead.

This separation ensures the `OrchestratorEvent` union remains stable and exhaustively matched across the codebase.

### `_meta` Documentation

The `_meta` optional field on `ACPMessage` and `FlowUpdate` instances carries observability metadata through the protocol boundary. See [INV-SF-39](../invariants/INV-SF-39-protocol-meta-pass-through.md).

Key properties:

- `traceId` — W3C Trace Context trace identifier
- `spanId` — Current span identifier
- `traceFlags` — Sampling flags
- `baggage` — Key-value pairs for cross-cutting concerns

The `_meta` field is opaque to protocol components. `ACPServer`, `ACPClient`, and `MessageTranslator` MUST preserve it without modification. Only observability adapters (e.g., OpenTelemetry exporters) should read `_meta` values.
