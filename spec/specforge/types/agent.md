---
id: TYPE-SF-002
kind: types
title: Agent Core Types
status: active
domain: agent
behaviors: []
adrs: []
---

# Agent Core Types

- [architecture/c1-system-context.md](../architecture/c1-system-context.md) -- system context for agent placement
- [types/acp.md](./acp.md) -- `ACPMessage`, `ACPMessagePart` used in `AgentOutput` and `AgentInput`
- [types/flow.md](./flow.md) -- `CompositionStrategy`, `TaskGroup`, `TokenUsage`, `Finding` referenced by agent types
- [types/skill.md](./skill.md) -- `Skill`, `SkillSummary`, `ResolvedSkillSet`, `SkillRegistryPort` (canonical skill types)
- [types/errors.md](./errors.md) -- `AgentError`, `SessionError`, `LLMError`, `ConversationError`, `PromptLoaderError`, `ToolRegistryError`, `SkillResolverError`, `FileAccessError`, `CodeSearchError`, `TestRunnerError`, `DevAgentError`

---

## Agent Roles

```typescript
type BuiltinRole =
  | "discovery-agent"
  | "spec-author"
  | "reviewer"
  | "feedback-synthesizer"
  | "task-decomposer"
  | "dev-agent"
  | "codebase-analyzer"
  | "coverage-agent";

type AgentRole = BuiltinRole | (string & { readonly __brand: "AgentRole" });
```

> Custom agent roles from plugins and dynamic role factory are validated via `AgentRegistryService.validateRole()`.

---

## Agent Input / Output

```typescript
interface AgentInput {
  readonly task: string;
  readonly context?: string;
  readonly messageDelta?: ReadonlyArray<ACPMessage>;
  readonly iteration: number;
}

interface AgentOutput {
  readonly artifacts?: ReadonlyArray<ACPMessagePart>;
  readonly findings?: ReadonlyArray<ACPMessage>;
  readonly messages?: ReadonlyArray<ACPMessage>;
  readonly status: "completed" | "awaiting" | "blocked";
  readonly tokenUsage: TokenUsage;
}

interface AgentResponse {
  readonly content: string;
  readonly tokenUsage: TokenUsage;
}
```

---

## Session Types

```typescript
interface SessionConfig {
  readonly role: AgentRole;
  readonly systemPrompt: string;
  readonly tools: ReadonlyArray<ToolDefinition>;
  readonly model: "opus" | "sonnet" | "haiku";
  readonly maxTokens: number;
  readonly flowRunId: string;
  readonly composedContext?: ComposedContext;
  readonly resolvedSkills?: ResolvedSkillSet;
  readonly acpSessionId?: string;
}

interface Session {
  readonly sessionId: string;
  readonly role: AgentRole;
  readonly status: "created" | "active" | "paused" | "completed" | "cancelled";
  readonly flowRunId: string;
  readonly tokenUsage: TokenUsage;
  readonly createdAt: string;
  readonly lastActiveAt: string;
  readonly acpRunId?: string;
}

interface SessionSummary {
  readonly sessionId: string;
  readonly role: AgentRole;
  readonly status: "created" | "active" | "paused" | "completed" | "cancelled";
  readonly tokenUsage: TokenUsage;
}

interface SessionSnapshot {
  readonly sessionId: string;
  readonly conversationState: string;
  readonly lastIteration: number;
  readonly snapshotAt: string;
}

// See ComposedContext in types/flow.md (canonical definition)
// Re-exported here for SessionConfig.composedContext usage
type ComposedContext = import("./flow").ComposedContext;
```

> **Deduplication (C38):** `ComposedContext` is canonically defined in [types/flow.md](./flow.md#composition-types). The definition here in agent.md was a duplicate with divergent fields. The canonical definition (flow.md) includes `sessionId`, `chunks`, `totalTokens`, `composedAt`. Agent session types reference the canonical definition.

> **Skill types (ADR-025):** `Skill`, `SkillSummary`, `ResolvedSkillSet`, and `SkillRegistryPort` are canonically defined in [types/skill.md](./skill.md). The previous `SkillDefinition` and `SkillSummary` types have been replaced by imports from the canonical definition. See [ADR-025](../decisions/ADR-025-skill-registry-architecture.md) for the rationale.

---

## LLM and Tool Types

```typescript
interface TokenEstimate {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
}

interface TokenBudget {
  readonly allocated: number;
  readonly consumed: number;
  readonly remaining: number;
  readonly warningThreshold: number;
}

interface PhaseBudget {
  readonly phaseName: string;
  readonly allocated: number;
  readonly consumed: number;
  readonly remaining: number;
}

interface ToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly parameters: Record<string, unknown>;
  readonly returnType?: string;
  readonly origin: "builtin" | "mcp";
}

// Canonical skill types are defined in types/skill.md (ADR-025)
// Imported here for SessionConfig and agent subsystem usage
type Skill = import("./skill").Skill;
type SkillSummary = import("./skill").SkillSummary;
type ResolvedSkillSet = import("./skill").ResolvedSkillSet;
type SkillRegistryPort = import("./skill").SkillRegistryPort;
```

---

## Conversation Types

```typescript
interface ConversationConfig {
  readonly mode: "interactive";
  readonly maxTurns?: number;
  readonly briefTemplate?: string;
}

interface ConversationHandle {
  readonly sessionId: string;
  readonly sendMessage: (msg: UserMessage) => ResultAsync<AgentResponse, ConversationError>;
  readonly getHistory: () => ResultAsync<ReadonlyArray<ConversationTurn>, ConversationError>;
  readonly dispose: () => ResultAsync<void, ConversationError>;
}

interface UserMessage {
  readonly content: string;
  readonly attachments?: ReadonlyArray<string>;
}

interface ConversationTurn {
  readonly turnId: string;
  readonly role: "user" | "agent";
  readonly content: string;
  readonly timestamp: string;
}
```

---

## Infrastructure Types

```typescript
interface FileStat {
  readonly path: string;
  readonly size: number;
  readonly isDirectory: boolean;
  readonly modifiedAt: string;
}

interface SearchOptions {
  readonly caseSensitive?: boolean;
  readonly maxResults?: number;
  readonly includeGlob?: string;
  readonly excludeGlob?: string;
}

interface SearchResult {
  readonly filePath: string;
  readonly line: number;
  readonly column: number;
  readonly matchText: string;
  readonly contextBefore?: string;
  readonly contextAfter?: string;
}

type SymbolKind = "function" | "class" | "interface" | "type" | "variable" | "enum" | "module";

interface SymbolResult {
  readonly name: string;
  readonly kind: SymbolKind;
  readonly filePath: string;
  readonly line: number;
  readonly signature?: string;
}

interface TestRunConfig {
  readonly testPaths?: ReadonlyArray<string>;
  readonly pattern?: string;
  readonly timeout?: number;
  readonly bail?: boolean;
}

interface TestRunResult {
  readonly runId: string;
  readonly passed: number;
  readonly failed: number;
  readonly skipped: number;
  readonly duration: number;
  readonly failures: ReadonlyArray<TestFailure>;
}

interface TestFailure {
  readonly testName: string;
  readonly filePath: string;
  readonly message: string;
  readonly stack?: string;
}
```

---

## Development Types

```typescript
interface DevContext {
  readonly specDocuments: ReadonlyArray<string>;
  readonly taskGroup: TaskGroup;
  readonly existingCode?: ReadonlyArray<string>;
}

interface ImplementationResult {
  readonly groupId: string;
  readonly filesCreated: ReadonlyArray<string>;
  readonly filesModified: ReadonlyArray<string>;
  readonly testResults?: TestRunResult;
  readonly status: "completed" | "partial" | "failed";
}

interface DevProgress {
  readonly groupId: string;
  readonly totalTasks: number;
  readonly completedTasks: number;
  readonly currentTask?: string;
  readonly status: "pending" | "in-progress" | "completed" | "failed";
}
```
