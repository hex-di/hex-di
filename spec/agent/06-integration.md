# 06 - Integration

## 16. HexDI Integration

Agent ports and adapters compose into the HexDI graph exactly like any other adapter. This section shows the full wiring pattern from application services through to a running agent.

### 16.1 Full Graph Example

```typescript
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import {
  LlmPort,
  ContextPort,
  ApprovalPort,
  AgentRunnerPort,
  createOpenAiAdapter,
  createToolAdapter,
  createContextAdapter,
  createAgentAdapter,
  createAgentRunnerAdapter,
  createCallbackApprovalAdapter,
  defineTool,
} from "@hex-di/agent";
import { z } from "zod";

// ──────────────────────────────────────────────
// 1. Application service ports (already exist)
// ──────────────────────────────────────────────

const TaskServicePort = createPort<TaskService>()({ name: "TaskService" });
const UserServicePort = createPort<UserService>()({ name: "UserService" });
const CurrentUserPort = createPort<CurrentUser>()({ name: "CurrentUser" });

// ──────────────────────────────────────────────
// 2. Application adapters (already exist)
// ──────────────────────────────────────────────

const taskServiceAdapter = createAdapter({
  provides: TaskServicePort,
  requires: [DatabasePort] as const,
  factory: deps => new TaskServiceImpl(deps.Database),
});

const userServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [DatabasePort] as const,
  factory: deps => new UserServiceImpl(deps.Database),
});

// ──────────────────────────────────────────────
// 3. Agent-specific ports
// ──────────────────────────────────────────────

const TaskToolsPort = createPort<ToolPortService<readonly ToolDefinition[]>>()({
  name: "TaskTools",
  direction: "inbound",
});

const TaskAgentPort = createPort<AgentService>()({ name: "TaskAgent" });

// ──────────────────────────────────────────────
// 4. Agent adapters
// ──────────────────────────────────────────────

const llmAdapter = createOpenAiAdapter({ model: "gpt-4o" });

const taskToolsAdapter = createToolAdapter({
  provides: TaskToolsPort,
  requires: [TaskServicePort, UserServicePort] as const,
  tools: deps => [
    defineTool({
      name: "createTask",
      description: "Create a new task",
      parameters: z.object({
        title: z.string(),
        assigneeId: z.string().uuid().optional(),
        priority: z.enum(["low", "medium", "high"]).default("medium"),
      }),
      execute: async params => deps.TaskService.create(params),
    }),
    defineTool({
      name: "listTasks",
      description: "List tasks with optional filters",
      parameters: z.object({
        status: z.enum(["open", "done", "all"]).default("all"),
        assigneeId: z.string().uuid().optional(),
      }),
      execute: async params => deps.TaskService.list(params),
    }),
    defineTool({
      name: "deleteTask",
      description: "Delete a task by its ID",
      parameters: z.object({ taskId: z.string().uuid() }),
      execute: async params => deps.TaskService.delete(params.taskId),
    }),
  ],
});

const contextAdapter = createContextAdapter({
  requires: [CurrentUserPort, TaskServicePort] as const,
  entries: deps => [
    {
      name: "currentUser",
      description: "The currently authenticated user",
      value: { id: deps.CurrentUser.id, name: deps.CurrentUser.name, role: deps.CurrentUser.role },
    },
    {
      name: "taskSummary",
      description: "Summary of tasks in the workspace",
      value: { total: deps.TaskService.count(), openCount: deps.TaskService.countByStatus("open") },
    },
  ],
});

const agentAdapter = createAgentAdapter({
  provides: TaskAgentPort,
  requires: [LlmPort, ContextPort, TaskToolsPort] as const,
  config: {
    name: "TaskAgent",
    systemPrompt: `You are a task management assistant. Help users manage their tasks.
      Always confirm before deleting tasks. Be concise.`,
    maxTurns: 10,
    temperature: 0.3,
  },
});

const approvalAdapter = createCallbackApprovalAdapter({ timeout: 60_000 });

const runnerAdapter = createAgentRunnerAdapter({
  agent: TaskAgentPort,
  approval: { tools: ["deleteTask"] },
});

// ──────────────────────────────────────────────
// 5. Build the graph
// ──────────────────────────────────────────────

const graph = GraphBuilder.create()
  // Application layer
  .provide(databaseAdapter)
  .provide(taskServiceAdapter)
  .provide(userServiceAdapter)
  .provide(currentUserAdapter)
  // Agent layer
  .provide(llmAdapter)
  .provide(taskToolsAdapter)
  .provide(contextAdapter)
  .provide(agentAdapter)
  .provide(approvalAdapter)
  .provide(runnerAdapter)
  .build();

// ──────────────────────────────────────────────
// 6. Create and run
// ──────────────────────────────────────────────

const container = createContainer({ graph, name: "app" });
await container.initialize();

const scope = container.createScope("user-session");
const runner = scope.resolve(AgentRunnerPort);

const result = await runner.run({ prompt: "Show me my open tasks" }).result;
console.log(result.lastMessage.content);

await scope.dispose();
```

### 16.2 Graph Visualization

The resulting dependency graph:

```
DatabasePort
  |
  +---> TaskServicePort --+--> TaskToolsPort --+--> TaskAgentPort --> AgentRunnerPort
  |                       |                    |
  +---> UserServicePort --+    ContextPort ----+
                               |
CurrentUserPort ---------------+

LlmPort (singleton, OpenAI) ------> TaskAgentPort

ApprovalPort (scoped) ------> AgentRunnerPort
```

### 16.3 Child Containers for Multi-Tenant

For multi-tenant applications, use child containers to isolate agent instances per tenant:

```typescript
// Shared graph — LLM and tool definitions
const sharedGraph = GraphBuilder.create().provide(llmAdapter).provide(taskToolsAdapter).build();

const sharedContainer = createContainer({ graph: sharedGraph, name: "shared" });
await sharedContainer.initialize();

// Per-tenant child — context and runner scoped to tenant
function createTenantAgent(tenantId: string) {
  const tenantGraph = GraphBuilder.create()
    .provide(createTenantContextAdapter(tenantId))
    .provide(agentAdapter)
    .provide(approvalAdapter)
    .provide(runnerAdapter)
    .build();

  return sharedContainer.createChild(tenantGraph, {
    name: `tenant:${tenantId}`,
  });
}
```

### 16.4 Scope Per Request

In a server environment, create a scope per request:

```typescript
// Hono middleware
app.use("*", async (c, next) => {
  const scope = container.createScope(`req:${c.req.header("x-request-id")}`);
  c.set("scope", scope);
  await next();
  await scope.dispose();
});

app.post("/chat", async c => {
  const scope = c.get("scope");
  const runner = scope.resolve(AgentRunnerPort);
  const { prompt } = await c.req.json();
  const result = await runner.run({ prompt }).result;
  return c.json({ response: result.lastMessage.content });
});
```

### 16.5 Integration with Store

When using `@hex-di/store`, state ports can be both context sources and tool targets:

```typescript
const contextAdapter = createContextAdapter({
  requires: [TaskStatePort, FilterStatePort] as const,
  entries: deps => [
    { name: "tasks", description: "Current task list", value: deps.TaskState.getAll() },
    { name: "filters", description: "Active filters", value: deps.FilterState.get() },
  ],
});

const storeToolsAdapter = createToolAdapter({
  provides: StoreToolsPort,
  requires: [TaskStatePort, FilterStatePort] as const,
  tools: deps => [
    defineTool({
      name: "setFilter",
      description: "Set the task list filter",
      parameters: z.object({ status: z.enum(["all", "open", "done"]) }),
      execute: async params => deps.FilterState.dispatch(setFilter(params.status)),
    }),
  ],
});
```

### 16.6 Integration with Query

When using `@hex-di/query`, query ports provide read access as tools:

```typescript
const queryToolsAdapter = createToolAdapter({
  provides: QueryToolsPort,
  requires: [TaskQueryPort, UserQueryPort] as const,
  tools: deps => [
    defineTool({
      name: "searchTasks",
      description: "Search tasks by keyword",
      parameters: z.object({ query: z.string(), limit: z.number().default(10) }),
      execute: async params => deps.TaskQuery.search(params),
    }),
    defineTool({
      name: "getUserProfile",
      description: "Get a user profile by ID",
      parameters: z.object({ userId: z.string().uuid() }),
      execute: async params => deps.UserQuery.getById(params.userId),
    }),
  ],
});
```

### 16.7 Integration with Saga

When using `@hex-di/saga`, saga ports can be exposed as tools for multi-step operations:

```typescript
const sagaToolsAdapter = createToolAdapter({
  provides: SagaToolsPort,
  requires: [OnboardingPort] as const,
  tools: deps => [
    defineTool({
      name: "onboardUser",
      description:
        "Run the full user onboarding process (create account, send welcome email, provision workspace)",
      parameters: z.object({
        email: z.string().email(),
        name: z.string(),
        plan: z.enum(["free", "pro", "enterprise"]),
      }),
      execute: async params => {
        const result = await deps.Onboarding.execute(params);
        if (result.status === "compensated") {
          throw new Error(`Onboarding failed at step: ${result.failedStep}`);
        }
        return result;
      },
    }),
  ],
});
```

---

## 17. React Integration

`@hex-di/agent-react` provides React hooks for building agent-powered UIs. All hooks resolve ports from the nearest HexDI container provider.

### 17.1 useAgentChat

The primary hook for building chat interfaces:

```typescript
function useAgentChat(runnerPort: Port<AgentRunnerService, string>): {
  readonly messages: readonly Message[];
  readonly isRunning: boolean;
  readonly error: Error | undefined;
  send: (prompt: string) => void;
  abort: () => void;
  reset: () => void;
};
```

- `messages`: The full conversation history, updated reactively as the agent responds
- `isRunning`: `true` while the agent is processing
- `error`: Set if the run fails
- `send(prompt)`: Send a user message and start the agent run
- `abort()`: Cancel the current run
- `reset()`: Clear the conversation history

### 17.2 Chat Component Example

```typescript
import { useAgentChat } from "@hex-di/agent-react";
import { AgentRunnerPort } from "./ports";

function ChatPanel() {
  const { messages, isRunning, send, abort, reset, error } = useAgentChat(AgentRunnerPort);
  const [input, setInput] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      send(input);
      setInput("");
    }
  };

  return (
    <div>
      <div className="messages">
        {messages
          .filter((m) => m.role !== "system" && m.role !== "tool")
          .map((m, i) => (
            <div key={i} className={`message ${m.role}`}>
              {m.content}
            </div>
          ))}
      </div>

      {error && <div className="error">{error.message}</div>}

      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the agent..."
          disabled={isRunning}
        />
        {isRunning ? (
          <button type="button" onClick={abort}>Stop</button>
        ) : (
          <button type="submit">Send</button>
        )}
        <button type="button" onClick={reset}>Clear</button>
      </form>
    </div>
  );
}
```

### 17.3 useAgentStream

For lower-level event access:

```typescript
function useAgentStream(runnerPort: Port<AgentRunnerService, string>): {
  readonly events: readonly AgentEvent[];
  readonly lastEvent: AgentEvent | undefined;
  readonly isStreaming: boolean;
  run: (options: RunOptions) => void;
  abort: () => void;
  clear: () => void;
};
```

### 17.4 Streaming Text Component

```typescript
function StreamingResponse() {
  const { events, isStreaming, run } = useAgentStream(AgentRunnerPort);
  const [text, setText] = useState("");

  useEffect(() => {
    const deltas = events.filter((e) => e.type === "text-delta");
    setText(deltas.map((e) => (e as TextDeltaEvent).delta).join(""));
  }, [events]);

  return (
    <div>
      <div className="response">{text}{isStreaming && <span className="cursor" />}</div>
      <button onClick={() => run({ prompt: "Summarize my tasks" })}>
        Summarize
      </button>
    </div>
  );
}
```

### 17.5 useApproval

Renders an approval UI when the agent requests confirmation:

```typescript
function useApproval(approvalPort: Port<ApprovalService, string>): {
  readonly pending: ApprovalRequest | undefined;
  approve: () => void;
  reject: () => void;
};
```

### 17.6 Approval Dialog Component

```typescript
function ApprovalDialog() {
  const { pending, approve, reject } = useApproval(ApprovalPort);

  if (!pending) return null;

  return (
    <div className="approval-dialog" role="dialog">
      <h3>Approval Required</h3>
      <p>
        The agent wants to call <strong>{pending.toolName}</strong>
      </p>
      <pre>{JSON.stringify(pending.arguments, null, 2)}</pre>
      <div className="actions">
        <button onClick={reject}>Deny</button>
        <button onClick={approve}>Allow</button>
      </div>
    </div>
  );
}
```

### 17.7 useAgentTool

Register a client-side tool (rendered in the browser) that the agent can call:

```typescript
function useAgentTool<TParams extends z.ZodType, TResult>(
  toolPort: Port<ToolPortService<readonly ToolDefinition[]>, string>,
  tool: ToolDefinition<string, TParams, TResult>
): void;
```

This hook adds the tool to the tool port's tool set for the current scope. Client-side tools can perform UI actions:

```typescript
function NavigationTools() {
  useAgentTool(
    NavigationToolsPort,
    defineTool({
      name: "navigateTo",
      description: "Navigate the user to a specific page",
      parameters: z.object({ path: z.string() }),
      execute: async params => {
        window.location.href = params.path;
        return { navigated: true };
      },
    })
  );

  return null; // No visual output — just registers the tool
}
```

### 17.8 useAgentContext

Expose reactive state as agent context:

```typescript
function useAgentContext(contextPort: Port<ContextService, string>, entry: ContextEntry): void;
```

Example — expose the current page URL and selection:

```typescript
function ContextProvider() {
  const location = useLocation();
  const selection = useSelection();

  useAgentContext(ContextPort, {
    name: "currentPage",
    description: "The page the user is currently viewing",
    value: location.pathname,
  });

  useAgentContext(ContextPort, {
    name: "selectedItems",
    description: "Items currently selected by the user",
    value: selection.items,
  });

  return null;
}
```

### 17.9 AgentProvider

Convenience component that wraps the container provider:

```typescript
function AgentProvider(props: {
  readonly container: Container<unknown, unknown, unknown, "initialized">;
  readonly children: ReactNode;
}): ReactElement;
```

Usage:

```typescript
function App() {
  return (
    <AgentProvider container={container}>
      <ContextProvider />
      <ChatPanel />
      <ApprovalDialog />
      <NavigationTools />
    </AgentProvider>
  );
}
```

### 17.10 Full React Application Example

```typescript
// ports.ts
export const TaskToolsPort = createPort<ToolPortService<readonly ToolDefinition[]>>()({ name: "TaskTools" });
export const TaskAgentPort = createPort<AgentService>()({ name: "TaskAgent" });

// container.ts
const graph = GraphBuilder.create()
  .provide(taskServiceAdapter)
  .provide(createOpenAiAdapter({ model: "gpt-4o" }))
  .provide(taskToolsAdapter)
  .provide(contextAdapter)
  .provide(agentAdapter)
  .provide(createCallbackApprovalAdapter())
  .provide(runnerAdapter)
  .build();

export const container = createContainer({ graph, name: "app" });

// App.tsx
function App() {
  return (
    <AgentProvider container={container}>
      <Sidebar />
      <main>
        <TaskList />
        <ChatPanel />
      </main>
      <ApprovalDialog />
    </AgentProvider>
  );
}
```

---

_Previous: [05 - Runtime](./05-runtime.md) | Next: [07 - Testing](./07-testing.md)_
