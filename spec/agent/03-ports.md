# 03 - Ports

## 5. Tool Ports

A `ToolPort` exposes application capabilities as AI-callable tools. Each tool port bundles one or more `ToolDefinition` objects and provides JSON Schema conversion for LLM consumption.

### 5.1 ToolPortService Interface

```typescript
interface ToolPortService<TTools extends readonly ToolDefinition[] = readonly ToolDefinition[]> {
  readonly tools: TTools;
  getTool<TName extends TTools[number]["name"]>(
    name: TName
  ): Extract<TTools[number], { name: TName }>;
  toJsonSchema(): readonly ToolJsonSchema[];
}

interface ToolJsonSchema {
  readonly type: "function";
  readonly function: {
    readonly name: string;
    readonly description: string;
    readonly parameters: JsonSchema;
  };
}
```

### 5.2 Defining Tool Ports

Tool ports are regular HexDI ports typed with `ToolPortService`:

```typescript
import { z } from "zod";

// Define individual tools
const createTaskTool = defineTool({
  name: "createTask",
  description: "Create a new task",
  parameters: z.object({
    title: z.string().describe("The task title"),
    priority: z.enum(["low", "medium", "high"]).optional(),
  }),
  execute: async params => taskService.create(params),
});

const deleteTaskTool = defineTool({
  name: "deleteTask",
  description: "Delete a task by ID",
  parameters: z.object({
    taskId: z.string().uuid(),
  }),
  execute: async params => taskService.delete(params.taskId),
});

// Define the tool port
const TaskToolsPort = createPort<ToolPortService<[typeof createTaskTool, typeof deleteTaskTool]>>()(
  {
    name: "TaskTools",
    direction: "inbound",
  }
);
```

The tool port's type parameter captures the exact tuple of tool definitions, giving compile-time knowledge of which tools are available and their parameter types.

### 5.3 Tool Name Uniqueness

Tool names must be unique within a single agent's tool set. The `AgentAdapter` enforces this at construction time by collecting tools from all `ToolPort` dependencies and checking for name collisions. Duplicate names produce a runtime error with a descriptive message indicating which ports contributed the conflicting name.

### 5.4 Parameter Validation

When the LLM returns a tool call, the runner:

1. Looks up the tool by name
2. Parses the arguments through the Zod schema (`parameters.safeParse()`)
3. If parsing fails, returns a `ToolResult` with `isError: true` and the Zod error message
4. If parsing succeeds, calls `execute` with the validated, typed parameters

This means tool `execute` functions always receive correctly typed input — validation errors are handled before execution.

---

## 6. Agent Ports

An `AgentPort` represents a fully configured AI agent: its system prompt, tools, context, and LLM reference wired together.

### 6.1 AgentService Interface

```typescript
interface AgentConfig {
  readonly name: string;
  readonly systemPrompt?: string;
  readonly maxTurns?: number;
  readonly maxTokens?: number;
  readonly temperature?: number;
  readonly toolChoice?: ToolChoice;
}

type ToolChoice =
  | "auto" // LLM decides whether to call tools
  | "none" // LLM must not call tools
  | "required" // LLM must call at least one tool
  | { readonly tool: string }; // LLM must call this specific tool

interface AgentService {
  readonly config: AgentConfig;
  readonly tools: readonly ToolDefinition[];
  readonly context: ContextService;
  readonly llm: LlmService;
}
```

### 6.2 Defining Agent Ports

Each agent in the system is a separate port, allowing multiple agents to coexist in the same container:

```typescript
const TaskAgentPort = createPort<AgentService>()({
  name: "TaskAgent",
  description: "Agent that manages tasks — create, update, delete, query",
});

const AnalyticsAgentPort = createPort<AgentService>()({
  name: "AnalyticsAgent",
  description: "Agent that answers analytics questions about task data",
});
```

Distinct ports mean distinct adapters, distinct configurations, and distinct scoped instances. An orchestrator pattern can resolve multiple agent ports and delegate between them.

### 6.3 Agent Identity

The `AgentConfig.name` field serves as the agent's identity in events and logs. It appears in `run-started` events and can be used to correlate events across multi-agent systems. The name should be unique within a container but this is not enforced — duplicate names will produce confusing logs but not runtime errors.

---

## 7. LLM Ports

The `LlmPort` abstracts communication with a language model. Its contract covers both synchronous generation and streaming.

### 7.1 LlmService Interface

```typescript
interface LlmService {
  generateText(options: GenerateTextOptions): Promise<Message>;
  streamText(options: StreamTextOptions): StreamResult;
}

interface GenerateTextOptions {
  readonly messages: readonly Message[];
  readonly tools?: readonly ToolJsonSchema[];
  readonly toolChoice?: ToolChoice;
  readonly maxTokens?: number;
  readonly temperature?: number;
  readonly stopSequences?: readonly string[];
}

interface StreamTextOptions extends GenerateTextOptions {
  readonly onChunk?: (chunk: StreamChunk) => void;
}
```

### 7.2 StreamResult

```typescript
interface StreamResult {
  readonly stream: AsyncIterable<StreamChunk>;
  readonly response: Promise<Message>;
}
```

The `stream` property yields chunks as they arrive. The `response` promise resolves to the complete assembled message once streaming finishes. Consumers can use either or both:

```typescript
// Streaming — process chunks as they arrive
const { stream } = llm.streamText({ messages });
for await (const chunk of stream) {
  if (chunk.type === "text-delta") {
    process.stdout.write(chunk.textDelta ?? "");
  }
}

// Non-streaming — wait for the complete response
const message = await llm.generateText({ messages });
console.log(message.content);
```

### 7.3 StreamChunk

```typescript
interface StreamChunk {
  readonly type: "text-delta" | "tool-call-start" | "tool-call-delta" | "tool-call-end" | "finish";
  readonly textDelta?: string;
  readonly toolCall?: Partial<ToolCall>;
  readonly finishReason?: FinishReason;
}

type FinishReason = "stop" | "tool-calls" | "length" | "error";
```

### 7.4 The LLM Port Singleton

Unlike tool and agent ports that are defined per use case, there is one canonical `LlmPort` exported from `@hex-di/agent`:

```typescript
// Exported from @hex-di/agent
const LlmPort: DirectedPort<LlmService, "Llm", "outbound">;
```

Applications that need multiple LLM providers (e.g., a fast model for simple tasks and a powerful model for complex reasoning) define additional ports:

```typescript
const FastLlmPort = createPort<LlmService>()({
  name: "FastLlm",
  description: "Fast, cheap model for simple operations",
});

const ReasoningLlmPort = createPort<LlmService>()({
  name: "ReasoningLlm",
  description: "Powerful model for complex reasoning",
});
```

### 7.5 Provider Neutrality

The `LlmService` interface uses the `Message` type from section 4.4, which is provider-neutral. Each LLM adapter translates between `Message` and the provider's native format:

- **OpenAI**: Maps to/from `ChatCompletionMessageParam` and `ChatCompletion`
- **Anthropic**: Maps to/from `MessageParam` and `Message` (Anthropic SDK types)
- **Vercel AI SDK**: Maps to/from `CoreMessage` and uses `generateText`/`streamText` from `ai`

The translation is encapsulated inside each adapter. Application code never touches provider-specific types.

---

## 8. Context Ports

A `ContextPort` exposes application state to the AI agent as structured, described data. The agent receives this context as part of its system prompt or as tool-accessible state.

### 8.1 ContextService Interface

```typescript
interface ContextEntry<TName extends string = string, TValue = unknown> {
  readonly name: TName;
  readonly description: string;
  readonly value: TValue;
}

interface ContextService {
  getAll(): readonly ContextEntry[];
  get<TName extends string>(name: TName): ContextEntry<TName> | undefined;
  toSystemPrompt(): string;
}
```

### 8.2 The Context Port Singleton

Like `LlmPort`, there is one canonical `ContextPort`:

```typescript
// Exported from @hex-di/agent
const ContextPort: DirectedPort<ContextService, "AgentContext", "inbound">;
```

### 8.3 Context as System Prompt

The `toSystemPrompt()` method serializes all context entries into a structured text block that is prepended to the agent's system prompt:

```typescript
// Example output of toSystemPrompt():
`
<context>
<entry name="currentUser" description="The currently logged-in user">
{"id": "u1", "name": "Alice", "role": "admin"}
</entry>
<entry name="taskCount" description="Number of tasks in the current project">
42
</entry>
</context>
`;
```

The XML-like format is chosen because LLMs reliably parse structured XML tags. The format is not configurable — consistency across projects aids LLM comprehension.

### 8.4 Reactive Context

Context adapters are `scoped`, meaning they are created per session. In a React application, context entries can be updated reactively using the `useAgentContext` hook (see section 17). On the server side, context adapters read from request-scoped services.

### 8.5 Context vs Tools

Context and tools serve different purposes:

| Aspect        | Context                               | Tools                             |
| ------------- | ------------------------------------- | --------------------------------- |
| Direction     | App -> Agent (read-only)              | Agent -> App (actions)            |
| When used     | Before generation (in system prompt)  | During generation (tool calls)    |
| Mutates state | No                                    | Yes                               |
| Example       | Current user, page URL, cart contents | Create task, send email, query DB |

Some information benefits from being both context (so the agent knows about it) and a tool (so the agent can query it dynamically). For example, a task list might be context (showing current tasks) and also have a `searchTasks` tool for more specific queries.

---

_Previous: [02 - Core Concepts](./02-core-concepts.md) | Next: [04 - Adapters](./04-adapters.md)_
