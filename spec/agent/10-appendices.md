# 10 - Appendices

## Appendix A: Comparison with CopilotKit & Vercel AI SDK

### A.1 Feature Comparison

| Feature               | CopilotKit                                  | Vercel AI SDK                               | HexDI Agent                                 |
| --------------------- | ------------------------------------------- | ------------------------------------------- | ------------------------------------------- |
| **Architecture**      | Monolithic runtime with React coupling      | Framework-agnostic core with React bindings | Hexagonal ports/adapters with DI            |
| **Tool definition**   | `useCopilotAction` with `Parameter[]` types | `tool()` with Zod schemas                   | `defineTool()` with Zod schemas             |
| **Tool type safety**  | Limited — `Parameter[]` is stringly typed   | Full Zod inference                          | Full Zod inference                          |
| **LLM providers**     | Service adapters (OpenAI, Anthropic, etc.)  | Provider packages (`@ai-sdk/openai`, etc.)  | LLM port adapters — any provider            |
| **LLM swapping**      | Change service adapter config               | Change provider import                      | Swap one adapter in the graph               |
| **State exposure**    | `useCopilotReadable`                        | Manual in system prompt                     | `ContextPort` with adapters                 |
| **Streaming**         | `RuntimeEventSubject`                       | UI Message Streams                          | `AsyncIterable<AgentEvent>`                 |
| **HITL approval**     | `renderAndWaitForResponse`                  | Not built-in                                | `ApprovalPort` with adapters                |
| **Testing**           | Mock the runtime (complex)                  | `MockLanguageModelV3`                       | `createMockLlmAdapter` + `ToolCallRecorder` |
| **DI integration**    | None — React context only                   | None                                        | Native — adapters in the graph              |
| **Multi-agent**       | `useCoAgent` with shared state              | Not built-in                                | Agents as ports, delegation as tools        |
| **Server support**    | `CopilotRuntime` (Node/Edge)                | `streamText`/`generateText`                 | `AgentRunner` (any runtime)                 |
| **React coupling**    | Core depends on React                       | Separate `ai/react` package                 | Separate `@hex-di/agent-react`              |
| **AG-UI compat**      | Native (CopilotKit authors)                 | Not built-in                                | Event mapping to AG-UI types                |
| **Existing services** | Must rewrap with `useCopilotAction`         | Must rewrap with `tool()`                   | Existing ports become tools via adapter     |

### A.2 Tool Definition Comparison

**CopilotKit:**

```typescript
useCopilotAction({
  name: "createTask",
  description: "Create a new task",
  parameters: [
    { name: "title", type: "string", description: "The task title", required: true },
    { name: "priority", type: "string", enum: ["low", "medium", "high"] },
  ],
  handler: async ({ title, priority }) => {
    // No type inference — parameters are Record<string, unknown>
    return taskService.create({ title, priority });
  },
});
```

**Vercel AI SDK:**

```typescript
const tools = {
  createTask: tool({
    description: "Create a new task",
    parameters: z.object({
      title: z.string(),
      priority: z.enum(["low", "medium", "high"]).optional(),
    }),
    execute: async ({ title, priority }) => {
      // Full type inference from Zod
      return taskService.create({ title, priority });
    },
  }),
};
```

**HexDI Agent:**

```typescript
// Tool defined once, wired through DI
const createTaskTool = defineTool({
  name: "createTask",
  description: "Create a new task",
  parameters: z.object({
    title: z.string(),
    priority: z.enum(["low", "medium", "high"]).optional(),
  }),
  // Service injected via adapter — not a global import
  execute: async params => deps.TaskService.create(params),
});
```

### A.3 Testing Comparison

**CopilotKit:**

```typescript
// Must mock the CopilotRuntime or HTTP layer
// No built-in mock LLM
// Tool calls go through React hooks — require rendering
```

**Vercel AI SDK:**

```typescript
import { MockLanguageModelV3 } from "ai/test";

const model = new MockLanguageModelV3({
  doGenerate: async () => ({
    text: "Done!",
    toolCalls: [{ id: "1", name: "createTask", args: { title: "Buy milk" } }],
  }),
});

const result = await generateText({ model, tools, prompt: "..." });
```

**HexDI Agent:**

```typescript
const { runner, recorder } = createTestAgent({
  tools: [createTaskTool],
  responses: [
    {
      role: "assistant",
      toolCalls: [{ id: "1", name: "createTask", arguments: { title: "Buy milk" } }],
    },
    { role: "assistant", content: "Done!" },
  ],
});

const result = await runner.run({ prompt: "..." }).result;
recorder.assertCalledWith("createTask", { title: "Buy milk" });
```

### A.4 When to Use Which

| Use Case                                        | Recommendation                                    |
| ----------------------------------------------- | ------------------------------------------------- |
| Quick prototype with React                      | CopilotKit — lowest barrier to entry              |
| Multi-provider flexibility                      | Vercel AI SDK — broadest provider ecosystem       |
| Enterprise app with DI and testing requirements | HexDI Agent — full architectural control          |
| Existing HexDI application adding AI features   | HexDI Agent — natural extension of existing ports |
| Multi-tenant SaaS with isolated agent instances | HexDI Agent — scoped containers per tenant        |
| Server-side agent without React                 | Vercel AI SDK or HexDI Agent                      |

---

## Appendix B: Glossary

| Term               | Definition                                                                                                |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| **Adapter**        | An implementation of a port contract. Adapters are registered in the graph and resolved by the container. |
| **Agent**          | A configured AI entity with tools, context, LLM, and a system prompt. Represented as a port.              |
| **AgentEvent**     | A typed event emitted during an agent run (text deltas, tool calls, approvals, etc.).                     |
| **AgentRun**       | A single execution of an agent, from user prompt to final response. May span multiple turns.              |
| **AgentRunner**    | The execution engine that implements the agent's turn-based loop.                                         |
| **ApprovalPolicy** | Configuration that determines which tool calls require user approval.                                     |
| **Context**        | Application state exposed to the agent via `ContextPort`. Serialized into the system prompt.              |
| **ContextEntry**   | A named, described piece of application state (name, description, value).                                 |
| **HITL**           | Human-in-the-Loop. A pattern where the agent pauses execution to request user approval.                   |
| **LLM**            | Large Language Model. The AI model that generates text and tool calls.                                    |
| **Message**        | A single message in a conversation (system, user, assistant, or tool role).                               |
| **Port**           | A typed contract defining a capability. Ports are branded types that serve as DI tokens.                  |
| **Scope**          | A child resolution context within a container. Scoped adapters create one instance per scope.             |
| **StreamChunk**    | A single piece of streaming output from the LLM (text delta, tool call part, or finish).                  |
| **StreamResult**   | The result of a streaming LLM call: an async iterable of chunks and a promise for the full response.      |
| **Tool**           | A named, described, typed action that the agent can invoke. Defined with Zod parameters.                  |
| **ToolCall**       | A request from the LLM to execute a tool with specific arguments.                                         |
| **ToolResult**     | The result of executing a tool call, sent back to the LLM.                                                |
| **Turn**           | One round of LLM generation within an agent run. A run may have multiple turns.                           |

---

## Appendix C: Design Decisions

### C.1 Zod for Tool Parameters (not JSON Schema)

**Decision:** Tool parameters are defined with Zod schemas, not raw JSON Schema.

**Rationale:** Zod provides both runtime validation and TypeScript type inference. JSON Schema requires a separate validation step and offers no type safety. The `zod-to-json-schema` conversion is handled internally when sending tool definitions to the LLM.

```typescript
// Zod — type-safe, validates at runtime
const params = z.object({ title: z.string(), priority: z.enum(["low", "high"]) });
type Params = z.infer<typeof params>; // { title: string; priority: "low" | "high" }

// JSON Schema — no type safety, requires separate validation
const params = {
  type: "object",
  properties: { title: { type: "string" }, priority: { type: "string", enum: ["low", "high"] } },
};
// Type is: unknown — must validate and cast manually
```

### C.2 Single LlmPort (not per-method ports)

**Decision:** One `LlmPort` with `generateText` and `streamText`, not separate `GeneratePort` and `StreamPort`.

**Rationale:** LLM providers always offer both capabilities. Splitting them adds indirection without benefit. Applications needing multiple models define additional ports (e.g., `FastLlmPort`, `ReasoningLlmPort`), which is a more meaningful distinction than generate-vs-stream.

### C.3 Events as Discriminated Union (not class hierarchy)

**Decision:** `AgentEvent` is a discriminated union on `type`, not a class hierarchy.

**Rationale:** Discriminated unions work naturally with `switch` statements and TypeScript's control flow narrowing. They serialize cleanly to JSON for SSE transport. Class hierarchies require `instanceof` checks that break across module boundaries.

```typescript
// Discriminated union — narrowing works naturally
switch (event.type) {
  case "text-delta":
    event.delta; // TypeScript knows this is TextDeltaEvent
    break;
  case "tool-call-started":
    event.toolName; // TypeScript knows this is ToolCallStartedEvent
    break;
}
```

### C.4 ContextPort as System Prompt (not RAG)

**Decision:** Context entries are serialized into the system prompt, not injected via RAG retrieval.

**Rationale:** System prompt injection is simple, predictable, and works with every LLM provider. RAG requires vector stores, embeddings, and retrieval infrastructure that belong in a separate library. Applications needing RAG can expose a `searchDocuments` tool instead.

### C.5 Approval as a Port (not a callback)

**Decision:** The approval mechanism is a port (`ApprovalPort`) with adapters, not a simple callback parameter.

**Rationale:** Making approval a port means:

- It can be swapped (interactive UI in production, auto-approve in tests)
- It participates in the DI graph (can depend on other ports like `CurrentUserPort`)
- It has a clear lifetime (scoped per session)
- It can be tested independently

A callback parameter would be simpler but would not integrate with the DI system.

### C.6 Scoped Agent and Runner (not singleton)

**Decision:** `AgentPort` and `AgentRunnerPort` adapters are `scoped`, not `singleton`.

**Rationale:** Agent instances hold per-session state (message history, context values). Making them scoped means each user session gets its own agent instance with its own conversation history. Singleton agents would require external session management and introduce shared mutable state.

### C.8 "Agent" Naming (disambiguated from MAPE-K)

**Decision:** The package uses `@hex-di/agent` and the term "Agent" for AI agents, which differs from Phase 5's MAPE-K autonomic "Agent" components (MonitorAgent, AnalyzeAgent, etc.).

**Rationale:** The `@hex-di/agent` package name provides namespace disambiguation. At the code level, AI agent types use the `Agent` prefix (e.g., `AgentService`, `AgentRunnerPort`), while MAPE-K components will use the `Autonomic` prefix (e.g., `AutonomicMonitor`, `AutonomicAnalyzer`) when Phase 5 is implemented. The package-level separation (`@hex-di/agent` vs `@hex-di/autonomic`) ensures no import collisions.

### C.7 AgentRunner Separate from Agent (not merged)

**Decision:** `AgentPort` and `AgentRunnerPort` are separate ports, not combined into one.

**Rationale:** The agent (configuration + wiring) and the runner (execution loop) are separate concerns:

- The agent defines what tools and context are available
- The runner defines how the execution loop works (approval, abort, event emission)

Separating them allows:

- Different runners for the same agent (testing runner, production runner, rate-limited runner)
- Runner middleware (rate limiting, logging) without touching agent configuration
- Multiple runners for the same agent in different contexts

### C.9 Result<T, E> for Error Handling (not throw/catch)

**Decision:** Agent errors use `Result<AgentRunResult, AgentError>` from `@hex-di/result`, not `throw`/`try-catch`.

**Rationale:** Every HexDI package uses `Result<T, E>` for error handling: sagas return `Result<SagaSuccess, SagaError>`, flows return `Result<FlowOutput, FlowError>`, and queries return `Result<QueryResult, QueryError>`. The agent package follows the same convention for consistency.

`AgentError` is a tagged union (discriminated on `_tag`) with eight variants covering every agent failure mode. This enables exhaustive `switch` handling, structured error diagnostics, and composability with other HexDI `Result` types.

The alternative -- throwing exceptions -- would break the composition model. A thrown error cannot carry typed diagnostic context, cannot be narrowed via `switch`, and forces `try-catch` wrappers that obscure control flow. With `Result`, the caller always knows an operation can fail and must explicitly handle the error path:

```typescript
const result = await runner.run({ prompt: "..." }).result;

// Forced to handle both paths
result.match(
  success => console.log(success.lastMessage.content),
  error => {
    switch (error._tag) {
      case "MaxTurnsExceeded":
        console.log(`Hit limit: ${error.turnCount}/${error.maxTurns}`);
        break;
      // ... other variants
    }
  }
);
```

---

_Previous: [09 - API Reference](./09-api-reference.md) | Next: [11 - Definition of Done](./11-definition-of-done.md)_
