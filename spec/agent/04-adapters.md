# 04 - Adapters

## 9. Tool Adapters

Tool adapters bridge existing application ports to the agent's tool system. They depend on application service ports and expose them as `ToolPortService` instances.

### 9.1 createToolAdapter

```typescript
function createToolAdapter<
  TProvides extends Port<ToolPortService<TTools>, string>,
  TTools extends readonly ToolDefinition[],
  TRequires extends readonly Port<unknown, string>[],
>(config: {
  readonly provides: TProvides;
  readonly requires: TRequires;
  readonly tools: (deps: ResolvedDeps<TupleToUnion<TRequires>>) => TTools;
}): Adapter<TProvides, TupleToUnion<TRequires>, "singleton">;
```

The `tools` factory receives resolved dependencies and returns tool definitions that call into those services.

### 9.2 Basic Usage

```typescript
import { z } from "zod";

// Existing application ports
const TaskServicePort = createPort<TaskService>()({ name: "TaskService" });
const UserServicePort = createPort<UserService>()({ name: "UserService" });

// Define the tool port
const TaskToolsPort = createPort<ToolPortService<readonly ToolDefinition[]>>()({
  name: "TaskTools",
  direction: "inbound",
});

// Create the adapter — wires existing services as AI tools
const taskToolsAdapter = createToolAdapter({
  provides: TaskToolsPort,
  requires: [TaskServicePort, UserServicePort] as const,
  tools: deps => [
    defineTool({
      name: "createTask",
      description: "Create a new task for a user",
      parameters: z.object({
        title: z.string(),
        assigneeId: z.string().uuid(),
        priority: z.enum(["low", "medium", "high"]).default("medium"),
      }),
      execute: async params => {
        const user = await deps.UserService.getById(params.assigneeId);
        if (!user) throw new Error(`User ${params.assigneeId} not found`);
        return deps.TaskService.create({
          ...params,
          assigneeName: user.name,
        });
      },
    }),
    defineTool({
      name: "listTasks",
      description: "List all tasks, optionally filtered by assignee",
      parameters: z.object({
        assigneeId: z.string().uuid().optional(),
        status: z.enum(["open", "done", "all"]).default("all"),
      }),
      execute: async params => deps.TaskService.list(params),
    }),
  ],
});
```

### 9.3 Tools from Multiple Ports

An agent typically needs tools from several domains. Each domain has its own tool port and adapter:

```typescript
const taskToolsAdapter = createToolAdapter({
  provides: TaskToolsPort,
  requires: [TaskServicePort] as const,
  tools: deps => [
    /* task tools */
  ],
});

const userToolsAdapter = createToolAdapter({
  provides: UserToolsPort,
  requires: [UserServicePort] as const,
  tools: deps => [
    /* user tools */
  ],
});

const analyticsToolsAdapter = createToolAdapter({
  provides: AnalyticsToolsPort,
  requires: [AnalyticsServicePort] as const,
  tools: deps => [
    /* analytics tools */
  ],
});
```

The `AgentAdapter` then depends on all three tool ports and merges their tools.

### 9.4 Tool Error Handling

If a tool's `execute` function throws, the runner catches the error and returns it as a `ToolResult` with `isError: true`. The error message is sent back to the LLM so it can recover:

```typescript
// Inside the runner (conceptual):
try {
  const result = await tool.execute(validatedParams);
  return { callId, result, isError: false };
} catch (error) {
  return { callId, result: String(error), isError: true };
}
```

Tool authors should throw descriptive errors. The LLM uses the error message to decide its next action (retry with different parameters, inform the user, or try a different approach).

---

## 10. Agent Adapters

Agent adapters wire tools, context, and LLM together into a configured `AgentService`.

### 10.1 createAgentAdapter

```typescript
function createAgentAdapter<
  TProvides extends Port<AgentService, string>,
>(config: {
  readonly provides: TProvides;
  readonly requires: readonly Port<unknown, string>[];
  readonly config: AgentConfig;
}): Adapter<TProvides, /* inferred from requires */, "scoped">;
```

The `requires` array must include:

- Exactly one port assignable to `LlmService` (the `LlmPort` or a custom LLM port)
- Exactly one port assignable to `ContextService` (the `ContextPort` or custom)
- Zero or more ports assignable to `ToolPortService` (tool ports)

### 10.2 Basic Usage

```typescript
const taskAgentAdapter = createAgentAdapter({
  provides: TaskAgentPort,
  requires: [LlmPort, ContextPort, TaskToolsPort, UserToolsPort] as const,
  config: {
    name: "TaskAgent",
    systemPrompt: `You are a task management assistant. Help users create,
      update, and organize their tasks. Always confirm destructive actions
      before executing them.`,
    maxTurns: 10,
    temperature: 0.3,
    toolChoice: "auto",
  },
});
```

### 10.3 Agent Config Resolution

The agent adapter resolves its dependencies and constructs an `AgentService`:

1. Collects all `ToolPortService` dependencies and flattens their tools into a single list
2. Validates tool name uniqueness across all tool ports
3. Resolves the `ContextService` dependency
4. Resolves the `LlmService` dependency
5. Returns an `AgentService` that holds references to all three plus the config

### 10.4 Multiple Agents

Different agents can use different LLM ports, different tool sets, and different system prompts:

```typescript
// Fast agent for simple queries — uses cheap model, few tools
const quickAgentAdapter = createAgentAdapter({
  provides: QuickAgentPort,
  requires: [FastLlmPort, ContextPort, TaskToolsPort] as const,
  config: {
    name: "QuickAgent",
    systemPrompt: "Answer task queries briefly.",
    maxTurns: 3,
  },
});

// Powerful agent for complex reasoning — uses strong model, many tools
const powerAgentAdapter = createAgentAdapter({
  provides: PowerAgentPort,
  requires: [
    ReasoningLlmPort,
    ContextPort,
    TaskToolsPort,
    UserToolsPort,
    AnalyticsToolsPort,
  ] as const,
  config: {
    name: "PowerAgent",
    systemPrompt: "You are an expert project manager...",
    maxTurns: 20,
  },
});
```

---

## 11. LLM Adapters

LLM adapters implement the `LlmService` interface for specific providers.

### 11.1 OpenAI Adapter

```typescript
function createOpenAiAdapter(config: {
  readonly apiKey?: string; // Defaults to OPENAI_API_KEY env var
  readonly model?: string; // Defaults to "gpt-4o"
  readonly baseUrl?: string; // For Azure OpenAI or proxies
  readonly organization?: string;
  readonly defaultMaxTokens?: number;
}): Adapter<typeof LlmPort, never, "singleton">;
```

Usage:

```typescript
const openAiAdapter = createOpenAiAdapter({
  model: "gpt-4o",
});
```

The adapter uses the `openai` npm package internally. It translates `Message` to `ChatCompletionMessageParam` and `StreamChunk` to/from `ChatCompletionChunk`.

### 11.2 Anthropic Adapter

```typescript
function createAnthropicAdapter(config: {
  readonly apiKey?: string; // Defaults to ANTHROPIC_API_KEY env var
  readonly model?: string; // Defaults to "claude-sonnet-4-20250514"
  readonly maxTokens?: number; // Anthropic requires explicit max_tokens
  readonly defaultMaxTokens?: number;
}): Adapter<typeof LlmPort, never, "singleton">;
```

Usage:

```typescript
const anthropicAdapter = createAnthropicAdapter({
  model: "claude-sonnet-4-20250514",
  defaultMaxTokens: 4096,
});
```

The adapter uses the `@anthropic-ai/sdk` package. It handles Anthropic's distinct tool use format (tool use blocks vs function calls).

### 11.3 Vercel AI SDK Adapter

```typescript
import { type LanguageModel } from "ai";

function createVercelAiAdapter(config: {
  readonly model: LanguageModel;
}): Adapter<typeof LlmPort, never, "singleton">;
```

Usage:

```typescript
import { openai } from "@ai-sdk/openai";

const vercelAdapter = createVercelAiAdapter({
  model: openai("gpt-4o"),
});
```

This adapter wraps any Vercel AI SDK `LanguageModel`, giving access to their full provider ecosystem (OpenAI, Anthropic, Google, Mistral, Groq, local models via Ollama) through a single adapter factory.

### 11.4 Custom LLM Adapters

For providers without a built-in adapter, use `createAdapter` directly:

```typescript
const customLlmAdapter = createAdapter({
  provides: LlmPort,
  factory: () => ({
    generateText: async options => {
      // Call your custom LLM API
      const response = await fetch("https://my-llm.example.com/generate", {
        method: "POST",
        body: JSON.stringify(translateToMyFormat(options)),
      });
      return translateFromMyFormat(await response.json());
    },
    streamText: options => {
      // Return StreamResult with async iterable
      const stream = createMyStreamingConnection(options);
      return {
        stream: translateStream(stream),
        response: collectStream(stream),
      };
    },
  }),
});
```

### 11.5 LLM Middleware

For cross-cutting concerns like logging, rate limiting, or caching, wrap an LLM adapter using a higher-order adapter pattern:

```typescript
function withLogging<TPort extends Port<LlmService, string>>(
  innerPort: TPort,
  loggerPort: Port<LoggerService, string>,
): Adapter<TPort, TPort | typeof loggerPort, "singleton"> {
  return createAdapter({
    provides: innerPort,
    requires: [innerPort, loggerPort] as const,
    factory: (deps) => {
      const llm = deps[/* inner */];
      const logger = deps[/* logger */];
      return {
        generateText: async (options) => {
          logger.info("LLM generateText", { messageCount: options.messages.length });
          const start = performance.now();
          const result = await llm.generateText(options);
          logger.info("LLM response", { duration: performance.now() - start });
          return result;
        },
        streamText: (options) => {
          logger.info("LLM streamText", { messageCount: options.messages.length });
          return llm.streamText(options);
        },
      };
    },
  });
}
```

---

## 12. Context Adapters

Context adapters read from application ports to build context entries that the agent sees in its system prompt.

### 12.1 createContextAdapter

```typescript
function createContextAdapter<TRequires extends readonly Port<unknown, string>[]>(config: {
  readonly requires: TRequires;
  readonly entries: (deps: ResolvedDeps<TupleToUnion<TRequires>>) => readonly ContextEntry[];
}): Adapter<typeof ContextPort, TupleToUnion<TRequires>, "scoped">;
```

### 12.2 Basic Usage

```typescript
const contextAdapter = createContextAdapter({
  requires: [CurrentUserPort, ProjectPort] as const,
  entries: deps => [
    {
      name: "currentUser",
      description: "The currently authenticated user",
      value: deps.CurrentUser,
    },
    {
      name: "currentProject",
      description: "The active project with task count and settings",
      value: {
        id: deps.Project.id,
        name: deps.Project.name,
        taskCount: deps.Project.tasks.length,
        settings: deps.Project.settings,
      },
    },
  ],
});
```

### 12.3 Dynamic Context

Context entries can include computed values. Since the adapter is `scoped`, each session gets fresh context:

```typescript
const contextAdapter = createContextAdapter({
  requires: [TaskQueryPort, CurrentUserPort] as const,
  entries: deps => {
    const recentTasks = deps.TaskQuery.getRecent(5);
    return [
      {
        name: "currentUser",
        description: "The authenticated user",
        value: deps.CurrentUser,
      },
      {
        name: "recentTasks",
        description: "The 5 most recently modified tasks",
        value: recentTasks.map(t => ({ id: t.id, title: t.title, status: t.status })),
      },
      {
        name: "timestamp",
        description: "Current server timestamp",
        value: new Date().toISOString(),
      },
    ];
  },
});
```

### 12.4 Context Merging

If an application needs context from multiple sources, use multiple context adapters with a composite pattern, or provide a single context adapter that depends on multiple ports (as shown above). The canonical `ContextPort` is a single port — the adapter composes all sources.

---

_Previous: [03 - Ports](./03-ports.md) | Next: [05 - Runtime](./05-runtime.md)_
