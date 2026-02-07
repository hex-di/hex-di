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

interface ToolResult {
  readonly callId: string;
  readonly result: unknown;
  readonly isError?: boolean;
}
```

These types are intentionally minimal. They map directly to the common subset of OpenAI, Anthropic, and other LLM provider message formats. The `LlmAdapter` is responsible for translating between `Message` and the provider's native format.

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
  | { type: "run-error"; runId: string; error: Error };
```

These events map to the AG-UI protocol event types, making HexDI Agent compatible with AG-UI consumers without additional transformation.

### 4.7 Lifetimes and Scoping

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
  return result.lastMessage.content;
});
```

---

_Previous: [01 - Overview & Philosophy](./01-overview.md) | Next: [03 - Ports](./03-ports.md)_
