# 02 - Core Concepts

## 4. Core Concepts

### 4.1 The Agent Hexagon

An AI agent in HexDI is modeled as a hexagon with six port faces:

```
                    +-------------------+
                    |   System Prompt   |
                    +--------+----------+
                             |
              +--------------v--------------+
              |                             |
  +-----------+    AgentPort                +-----------+
  |  ToolPort |    (wires everything)       | LlmPort  |
  |  (actions)|                             | (model)  |
  +-----------+                             +-----------+
              |                             |
  +-----------+                             +-----------+
  | Context   |    AgentRunnerPort          | Approval  |
  | Port      |    (executes the loop)      | Port      |
  | (state)   |                             | (HITL)    |
  +-----------+-----------------------------+-----------+
```

Each face is a port with a defined contract. The agent itself is the composition of these ports through the HexDI graph.

### 4.2 Port Taxonomy

HexDI Agent introduces six port categories:

| Port              | Direction | Purpose                                      | Lifetime  |
| ----------------- | --------- | -------------------------------------------- | --------- |
| `ToolPort`        | inbound   | Exposes app capabilities as callable tools   | singleton |
| `AgentPort`       | outbound  | Configures an agent with tools, context, LLM | scoped    |
| `LlmPort`         | outbound  | Communicates with a language model           | singleton |
| `ContextPort`     | inbound   | Exposes application state to the agent       | scoped    |
| `AgentRunnerPort` | outbound  | Executes the agent loop                      | scoped    |
| `ApprovalPort`    | inbound   | Handles HITL approval requests               | scoped    |

**Inbound** ports receive data from the application into the agent system. **Outbound** ports send requests from the agent system to external services.

**Direction rationale:** In hexagonal architecture, _inbound_ ports receive data from the application (primary/driving side) into the hexagon, while _outbound_ ports send requests from the hexagon to external services (secondary/driven side). For AI agents:

- **`ToolPort` (inbound):** The application _provides_ tool capabilities to the agent. Tools are driven by application services and injected into the agent hexagon — the application drives the definition of what the agent can do.
- **`ContextPort` (inbound):** The application _pushes_ state into the agent. Context flows from application services into the agent's awareness — the application drives what the agent knows.
- **`ApprovalPort` (inbound):** The application _provides_ an approval mechanism to the agent. The approval UI or policy is driven by the application layer.
- **`LlmPort` (outbound):** The agent _requests_ text generation from an external LLM provider. This is infrastructure the agent depends on, like a database port.
- **`AgentPort` (outbound):** The agent configuration _produces_ a configured agent instance consumed by the runner. The runner drives agent execution.
- **`AgentRunnerPort` (outbound):** The application _requests_ agent execution. The runner drives the execution loop using external infrastructure (LLM, approval).

### 4.3 The Execution Loop

When an agent runs, the `AgentRunner` executes a turn-based loop:

```
User prompt
    |
    v
+---+---+
| Turn 1 |
+---+---+
    |
    v
Generate (LLM) -----> Response has tool calls?
    |                       |
    | No                    | Yes
    v                       v
  Done              Execute tools
                        |
                        v
                  Approval needed?
                    |          |
                    | No       | Yes
                    v          v
              Tool result   Request approval
                    |          |
                    |     +----+----+
                    |     | Approve | Reject
                    |     +----+----+----+
                    |          |         |
                    v          v         v
              Append results       Return rejection
                    |
                    v
               +----+----+
               | Turn N+1 |
               +----+----+
                    |
                    v
               (repeat until no tool calls or maxTurns)
```

Each step emits typed events that can be observed via `AgentStreamRun.events`.

### 4.4 Message Types

Messages flow between the user, the agent, and tools:

```typescript
type MessageRole = "system" | "user" | "assistant" | "tool";

interface Message {
  readonly role: MessageRole;
  readonly content: string;
  readonly toolCalls?: readonly ToolCall[];
  readonly toolResults?: readonly ToolResult[];
}

interface ToolCall {
  readonly id: string;
  readonly name: string;
  readonly arguments: unknown;
}

type ToolResult = ToolSuccessResult | ToolErrorResult;

interface ToolSuccessResult {
  readonly callId: string;
  readonly result: unknown;
  readonly isError: false;
}

interface ToolErrorResult {
  readonly callId: string;
  readonly result: unknown;
  readonly isError: true;
}
```

These types are intentionally minimal. They map directly to the common subset of OpenAI, Anthropic, and other LLM provider message formats. The `LlmAdapter` is responsible for translating between `Message` and the provider's native format.

> **Future consideration:** `Message.content` is `string` only in this version. Future versions may support multimodal content via a `ContentPart[]` union (`TextPart | ImagePart | AudioPart`) to match evolving LLM capabilities. This would be a breaking change to the `Message` interface.

### 4.5 Tool Definitions

A tool is a named, described, typed action that the agent can invoke:

```typescript
import { z } from "zod";

interface ToolDefinition<
  TName extends string = string,
  TParams extends z.ZodType = z.ZodType,
  TResult = unknown,
> {
  readonly name: TName;
  readonly description: string;
  readonly parameters: TParams;
  readonly execute: (params: z.infer<TParams>) => Promise<TResult>;
}
```

The `parameters` field uses Zod schemas, which serve double duty:

1. **Runtime validation** — Input from the LLM is parsed and validated before `execute` is called
2. **JSON Schema generation** — `zod-to-json-schema` converts the Zod schema to the JSON Schema format expected by LLM APIs

```typescript
const createTaskTool = defineTool({
  name: "createTask",
  description: "Create a new task with a title and optional priority",
  parameters: z.object({
    title: z.string().describe("The task title"),
    priority: z.enum(["low", "medium", "high"]).optional().describe("Task priority level"),
  }),
  execute: async params => {
    // params is fully typed: { title: string; priority?: "low" | "medium" | "high" }
    return taskService.create(params);
  },
});
```

### 4.6 Streaming Events

Every agent run produces a stream of typed events:

```typescript
type AgentEvent =
  | { type: "run-started"; runId: string; agentName: string }
  | { type: "turn-started"; turnNumber: number }
  | { type: "text-delta"; delta: string }
  | { type: "text-complete"; text: string }
  | { type: "tool-call-started"; callId: string; toolName: string; arguments: unknown }
  | { type: "tool-call-result"; callId: string; result: unknown; isError: boolean }
  | { type: "approval-requested"; callId: string; toolName: string; arguments: unknown }
  | { type: "approval-resolved"; callId: string; approved: boolean }
  | { type: "turn-complete"; turnNumber: number }
  | { type: "run-complete"; runId: string; result: AgentRunResult }
  | { type: "run-error"; runId: string; error: AgentError };
```

These events map to the AG-UI protocol event types, making HexDI Agent compatible with AG-UI consumers without additional transformation.

### 4.7 Error Types

All agent failures are represented as an `AgentError` tagged union -- a discriminated union of plain objects carrying full diagnostic context about the failure. Every variant shares a common base of diagnostic fields:

```typescript
interface AgentErrorBase {
  /** Unique run ID for correlation with tracing spans */
  readonly runId: string;
  /** Agent name from config */
  readonly agentName: string;
  /** Human-readable error message */
  readonly message: string;
}
```

The eight error variants cover every failure mode in agent execution:

```typescript
type AgentError =
  | ToolExecutionFailedError
  | ToolValidationFailedError
  | ToolNameCollisionError
  | LlmGenerationFailedError
  | ApprovalTimeoutError
  | RunAbortedError
  | MaxTurnsExceededError
  | AgentConfigInvalidError;

/** A tool's execute function threw during invocation */
interface ToolExecutionFailedError extends AgentErrorBase {
  readonly _tag: "ToolExecutionFailed";
  readonly toolName: string;
  readonly cause: unknown;
}

/** The LLM-provided arguments failed Zod validation for a tool */
interface ToolValidationFailedError extends AgentErrorBase {
  readonly _tag: "ToolValidationFailed";
  readonly toolName: string;
  readonly validationErrors: readonly string[];
}

/** Two or more tool ports contributed tools with the same name */
interface ToolNameCollisionError extends AgentErrorBase {
  readonly _tag: "ToolNameCollision";
  readonly duplicateName: string;
  readonly contributingPorts: readonly string[];
}

/** The LLM failed to generate a response */
interface LlmGenerationFailedError extends AgentErrorBase {
  readonly _tag: "LlmGenerationFailed";
  readonly cause: unknown;
  readonly turnNumber: number;
}

/** An approval request timed out without a user decision */
interface ApprovalTimeoutError extends AgentErrorBase {
  readonly _tag: "ApprovalTimeout";
  readonly toolName: string;
  readonly timeoutMs: number;
}

/** The run was aborted via AbortSignal or the abort() method */
interface RunAbortedError extends AgentErrorBase {
  readonly _tag: "RunAborted";
  readonly turnNumber: number;
}

/** The agent exhausted its configured maxTurns without completing */
interface MaxTurnsExceededError extends AgentErrorBase {
  readonly _tag: "MaxTurnsExceeded";
  readonly maxTurns: number;
  readonly turnCount: number;
}

/** The agent configuration is invalid (detected at resolution time) */
interface AgentConfigInvalidError extends AgentErrorBase {
  readonly _tag: "AgentConfigInvalid";
  readonly field: string;
  readonly reason: string;
}
```

The `_tag` field enables exhaustive error handling via `switch`:

```typescript
import { type Result } from "@hex-di/result";

const result = await runner.run({ prompt: "Create a task" }).result;

if (result.isErr()) {
  const error = result.error;

  switch (error._tag) {
    case "ToolExecutionFailed":
      console.error(`Tool "${error.toolName}" threw:`, error.cause);
      break;

    case "ToolValidationFailed":
      console.error(`Tool "${error.toolName}" received invalid arguments:`, error.validationErrors);
      break;

    case "ToolNameCollision":
      console.error(
        `Duplicate tool name "${error.duplicateName}" from ports:`,
        error.contributingPorts
      );
      break;

    case "LlmGenerationFailed":
      console.error(`LLM failed on turn ${error.turnNumber}:`, error.cause);
      break;

    case "ApprovalTimeout":
      console.error(`Approval for "${error.toolName}" timed out after ${error.timeoutMs}ms`);
      break;

    case "RunAborted":
      console.log(`Run aborted on turn ${error.turnNumber}`);
      break;

    case "MaxTurnsExceeded":
      console.error(`Agent hit turn limit: ${error.turnCount}/${error.maxTurns}`);
      break;

    case "AgentConfigInvalid":
      console.error(`Invalid config field "${error.field}": ${error.reason}`);
      break;
  }
}
```

Agent errors are always returned via `Result<AgentRunResult, AgentError>`, never thrown. This follows the same convention as `@hex-di/saga`, `@hex-di/flow`, and `@hex-di/query`, where all domain errors are tagged unions returned through `Result`.

### 4.8 Lifetimes and Scoping

Agent-related ports follow specific lifetime patterns:

- **`LlmPort`**: `singleton` — LLM clients are stateless and reusable across requests
- **`ToolPort`**: `singleton` — Tool definitions don't change per request
- **`ContextPort`**: `scoped` — Context varies per user session or request
- **`AgentPort`**: `scoped` — Agent instances hold per-session state (message history)
- **`AgentRunnerPort`**: `scoped` — Each run is scoped to a session
- **`ApprovalPort`**: `scoped` — Approval callbacks are per-session

This means a typical server-side setup creates one container with singleton LLM and tool adapters, then creates a scope per request for the agent, context, and approval adapters.

```typescript
// Server startup — singleton adapters
const container = createContainer({ graph: appGraph, name: "app" });
await container.initialize();

// Per request — scoped adapters
app.post("/chat", req => {
  const scope = container.createScope(`session:${req.sessionId}`);
  const runner = scope.resolve(AgentRunnerPort);
  const result = await runner.run({ prompt: req.body.message }).result;
  await scope.dispose();

  if (result.isErr()) {
    return { error: result.error._tag, message: result.error.message };
  }
  return result.value.lastMessage.content;
});
```

---

_Previous: [01 - Overview & Philosophy](./01-overview.md) | Next: [03 - Ports](./03-ports.md)_
