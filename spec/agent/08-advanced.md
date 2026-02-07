# 08 - Advanced Patterns

## 19. Advanced Patterns

### 19.1 Multi-Agent Orchestration

Complex applications benefit from multiple specialized agents that delegate to each other. In HexDI Agent, each agent is a separate port, and an orchestrator agent can call other agents as tools.

**Pattern: Orchestrator with specialist agents**

```typescript
// Specialist ports
const TaskAgentPort = createPort<AgentService>()({ name: "TaskAgent" });
const AnalyticsAgentPort = createPort<AgentService>()({ name: "AnalyticsAgent" });
const CalendarAgentPort = createPort<AgentService>()({ name: "CalendarAgent" });

// Orchestrator port
const OrchestratorPort = createPort<AgentService>()({ name: "Orchestrator" });

// Create runner ports for each specialist
const TaskRunnerPort = createPort<AgentRunnerService>()({ name: "TaskRunner" });
const AnalyticsRunnerPort = createPort<AgentRunnerService>()({ name: "AnalyticsRunner" });
const CalendarRunnerPort = createPort<AgentRunnerService>()({ name: "CalendarRunner" });

// Expose specialists as tools for the orchestrator
const DelegationToolsPort = createPort<ToolPortService<readonly ToolDefinition[]>>()({
  name: "DelegationTools",
});

const delegationToolsAdapter = createToolAdapter({
  provides: DelegationToolsPort,
  requires: [TaskRunnerPort, AnalyticsRunnerPort, CalendarRunnerPort] as const,
  tools: deps => [
    defineTool({
      name: "delegateToTaskAgent",
      description: "Delegate a task-related request to the task management specialist",
      parameters: z.object({ request: z.string() }),
      execute: async params => {
        const result = await deps.TaskRunner.run({ prompt: params.request }).result;
        return result.lastMessage.content;
      },
    }),
    defineTool({
      name: "delegateToAnalyticsAgent",
      description: "Delegate an analytics question to the analytics specialist",
      parameters: z.object({ question: z.string() }),
      execute: async params => {
        const result = await deps.AnalyticsRunner.run({ prompt: params.question }).result;
        return result.lastMessage.content;
      },
    }),
    defineTool({
      name: "delegateToCalendarAgent",
      description: "Delegate a scheduling request to the calendar specialist",
      parameters: z.object({ request: z.string() }),
      execute: async params => {
        const result = await deps.CalendarRunner.run({ prompt: params.request }).result;
        return result.lastMessage.content;
      },
    }),
  ],
});

// Orchestrator adapter
const orchestratorAdapter = createAgentAdapter({
  provides: OrchestratorPort,
  requires: [LlmPort, ContextPort, DelegationToolsPort] as const,
  config: {
    name: "Orchestrator",
    systemPrompt: `You are a project management assistant with access to specialists.
      Route task management to the task agent, analytics questions to the analytics agent,
      and scheduling to the calendar agent. Synthesize their responses for the user.`,
    maxTurns: 15,
  },
});
```

### 19.2 Tool Composition

Tools can be composed from smaller tools or shared across agents:

```typescript
// Shared tool definitions
const crudTools = (service: CrudService, entityName: string) => [
  defineTool({
    name: `create${entityName}`,
    description: `Create a new ${entityName.toLowerCase()}`,
    parameters: service.createSchema,
    execute: async params => service.create(params),
  }),
  defineTool({
    name: `get${entityName}`,
    description: `Get a ${entityName.toLowerCase()} by ID`,
    parameters: z.object({ id: z.string().uuid() }),
    execute: async params => service.getById(params.id),
  }),
  defineTool({
    name: `update${entityName}`,
    description: `Update a ${entityName.toLowerCase()}`,
    parameters: service.updateSchema,
    execute: async params => service.update(params),
  }),
  defineTool({
    name: `delete${entityName}`,
    description: `Delete a ${entityName.toLowerCase()} by ID`,
    parameters: z.object({ id: z.string().uuid() }),
    execute: async params => service.delete(params.id),
  }),
];

// Use in tool adapters
const taskToolsAdapter = createToolAdapter({
  provides: TaskToolsPort,
  requires: [TaskServicePort] as const,
  tools: deps => crudTools(deps.TaskService, "Task"),
});

const userToolsAdapter = createToolAdapter({
  provides: UserToolsPort,
  requires: [UserServicePort] as const,
  tools: deps => crudTools(deps.UserService, "User"),
});
```

### 19.3 Conditional Tool Availability

Tools can be conditionally available based on user permissions or feature flags:

```typescript
const adminToolsAdapter = createToolAdapter({
  provides: AdminToolsPort,
  requires: [CurrentUserPort, AdminServicePort] as const,
  tools: deps => {
    const tools: ToolDefinition[] = [];

    if (deps.CurrentUser.role === "admin") {
      tools.push(
        defineTool({
          name: "deleteUser",
          description: "Delete a user account (admin only)",
          parameters: z.object({ userId: z.string().uuid() }),
          execute: async params => deps.AdminService.deleteUser(params.userId),
        })
      );
      tools.push(
        defineTool({
          name: "resetPassword",
          description: "Force-reset a user's password (admin only)",
          parameters: z.object({ userId: z.string().uuid() }),
          execute: async params => deps.AdminService.resetPassword(params.userId),
        })
      );
    }

    return tools;
  },
});
```

### 19.4 Form-Filling Agent

An agent that gathers information through conversation and executes a mutation when complete:

```typescript
const onboardingTools = [
  defineTool({
    name: "submitOnboarding",
    description:
      "Submit the completed onboarding form. Only call this when all required fields are collected.",
    parameters: z.object({
      name: z.string(),
      email: z.string().email(),
      role: z.enum(["developer", "designer", "manager", "other"]),
      team: z.string(),
      startDate: z.string().describe("ISO 8601 date string"),
    }),
    execute: async params => onboardingService.submit(params),
  }),
  defineTool({
    name: "getTeams",
    description: "List available teams to help the user choose",
    parameters: z.object({}),
    execute: async () => teamService.listAll(),
  }),
];

const onboardingAgentAdapter = createAgentAdapter({
  provides: OnboardingAgentPort,
  requires: [LlmPort, ContextPort, OnboardingToolsPort] as const,
  config: {
    name: "OnboardingAgent",
    systemPrompt: `You are an onboarding assistant. Your job is to collect the following
      information from the new employee through natural conversation:
      - Full name
      - Email address
      - Role (developer, designer, manager, or other)
      - Team assignment
      - Start date

      Ask for each piece of information naturally. Validate as you go.
      When you have everything, call submitOnboarding.
      If the user is unsure about their team, use getTeams to show options.`,
    maxTurns: 20,
    temperature: 0.5,
  },
});
```

### 19.5 Dashboard Copilot

An agent that reads from query ports and suggests actions:

```typescript
const dashboardContextAdapter = createContextAdapter({
  requires: [ProjectQueryPort, TaskQueryPort, UserQueryPort, CurrentUserPort] as const,
  entries: deps => [
    {
      name: "projectOverview",
      description: "Current project with statistics",
      value: {
        name: deps.ProjectQuery.current().name,
        totalTasks: deps.TaskQuery.count(),
        overdueTasks: deps.TaskQuery.countOverdue(),
        teamSize: deps.UserQuery.countActive(),
      },
    },
    {
      name: "currentUser",
      description: "The logged-in user with their assigned tasks",
      value: {
        ...deps.CurrentUser,
        assignedTasks: deps.TaskQuery.getByAssignee(deps.CurrentUser.id),
      },
    },
    {
      name: "recentActivity",
      description: "Recent activity feed",
      value: deps.TaskQuery.getRecentActivity(10),
    },
  ],
});

const dashboardAgentAdapter = createAgentAdapter({
  provides: DashboardAgentPort,
  requires: [LlmPort, ContextPort, TaskToolsPort, AnalyticsToolsPort] as const,
  config: {
    name: "DashboardCopilot",
    systemPrompt: `You are a project dashboard copilot. You can see the current project state
      in your context. Help the user understand their project status, suggest actions,
      and execute task operations when asked. Be proactive about flagging overdue tasks
      and bottlenecks.`,
    maxTurns: 10,
    temperature: 0.4,
  },
});
```

### 19.6 Agent with Memory (Store Integration)

Using `@hex-di/store` to maintain conversation memory across sessions:

```typescript
// Define memory state
interface AgentMemory {
  readonly conversations: ReadonlyMap<string, readonly Message[]>;
  readonly preferences: Record<string, unknown>;
}

const AgentMemoryPort = createStatePort<AgentMemory>()({
  name: "AgentMemory",
});

// Context adapter reads from memory
const memoryContextAdapter = createContextAdapter({
  requires: [AgentMemoryPort, CurrentUserPort] as const,
  entries: deps => {
    const userId = deps.CurrentUser.id;
    const history = deps.AgentMemory.conversations.get(userId) ?? [];
    const recentMessages = history.slice(-10); // Last 10 messages as context

    return [
      {
        name: "conversationHistory",
        description: "Recent conversation history with this user",
        value: recentMessages.map(m => ({ role: m.role, content: m.content })),
      },
      {
        name: "userPreferences",
        description: "Known user preferences from past interactions",
        value: deps.AgentMemory.preferences,
      },
    ];
  },
});
```

### 19.7 Parallel Tool Execution

When the LLM returns multiple tool calls in a single response, the runner can execute them in parallel:

```typescript
// In the runner configuration
const runnerAdapter = createAgentRunnerAdapter({
  agent: TaskAgentPort,
  approval: "none",
  parallelToolCalls: true, // Default: true
});
```

When `parallelToolCalls` is `true` (the default), all tool calls in a single LLM response are executed concurrently with `Promise.all`. When `false`, they are executed sequentially in order.

Parallel execution is safe when tools are independent. For tools with ordering dependencies, either:

- Set `parallelToolCalls: false` on the runner
- Design the agent prompt to call dependent tools in separate turns

### 19.8 Rate-Limited Agent

Using the runner's event system to implement rate limiting:

```typescript
function createRateLimitedRunner(
  inner: AgentRunnerService,
  maxTurnsPerMinute: number
): AgentRunnerService {
  const turnTimestamps: number[] = [];

  return {
    run(options) {
      return inner.run({
        ...options,
        onEvent: async event => {
          if (event.type === "turn-started") {
            const now = Date.now();
            turnTimestamps.push(now);

            // Remove timestamps older than 1 minute
            const cutoff = now - 60_000;
            while (turnTimestamps.length > 0 && turnTimestamps[0] < cutoff) {
              turnTimestamps.shift();
            }

            if (turnTimestamps.length > maxTurnsPerMinute) {
              throw new Error("Rate limit exceeded");
            }
          }
          options.onEvent?.(event);
        },
      });
    },
    runStream(options) {
      return inner.runStream(options);
    },
  };
}
```

### 19.9 Agent Chaining

Sequential agent execution where one agent's output feeds into another:

```typescript
async function analyzeAndAct(prompt: string, scope: Scope<AppPorts>) {
  // Step 1: Analysis agent determines what to do
  const analyzer = scope.resolve(AnalysisRunnerPort);
  const analysis = await analyzer.run({ prompt }).result;

  // Step 2: Parse the analysis to determine which specialist to use
  const plan = JSON.parse(analysis.lastMessage.content);

  // Step 3: Execute with the specialist
  const specialist = scope.resolve(
    plan.type === "task"
      ? TaskRunnerPort
      : plan.type === "analytics"
        ? AnalyticsRunnerPort
        : GeneralRunnerPort
  );

  return specialist.run({
    prompt: plan.instruction,
    messages: analysis.messages, // Carry context forward
  }).result;
}
```

### 19.10 Error Recovery Patterns

**Retry on transient LLM errors:**

```typescript
function withRetry(llmService: LlmService, maxRetries: number = 3): LlmService {
  return {
    async generateText(options) {
      let lastError: Error | undefined;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          return await llmService.generateText(options);
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          if (!isTransientError(lastError)) throw lastError;
          await sleep(Math.pow(2, attempt) * 1000); // Exponential backoff
        }
      }
      throw lastError;
    },
    streamText(options) {
      return llmService.streamText(options); // Streaming retries are more complex
    },
  };
}

function isTransientError(error: Error): boolean {
  return (
    error.message.includes("rate_limit") ||
    error.message.includes("503") ||
    error.message.includes("timeout")
  );
}
```

**Fallback to a different model:**

```typescript
const fallbackLlmAdapter = createAdapter({
  provides: LlmPort,
  requires: [PrimaryLlmPort, FallbackLlmPort] as const,
  factory: deps => ({
    async generateText(options) {
      try {
        return await deps.PrimaryLlm.generateText(options);
      } catch {
        return deps.FallbackLlm.generateText(options);
      }
    },
    streamText(options) {
      // For streaming, fall back if the primary stream errors
      try {
        return deps.PrimaryLlm.streamText(options);
      } catch {
        return deps.FallbackLlm.streamText(options);
      }
    },
  }),
});
```

---

_Previous: [07 - Testing](./07-testing.md) | Next: [09 - API Reference](./09-api-reference.md)_
