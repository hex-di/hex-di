# 07 - Testing

## 18. Testing Patterns

HexDI Agent's port/adapter architecture makes AI agent testing deterministic, fast, and API-free. The `@hex-di/agent-testing` package provides utilities for mocking LLMs, recording tool calls, and testing approval flows.

### 18.1 The Testing Problem

Testing AI agents is traditionally hard:

- LLM API calls are slow, expensive, and non-deterministic
- Tool execution has side effects
- Approval flows require user interaction
- Streaming behavior is timing-dependent

HexDI Agent solves each problem with adapter swapping:

| Problem      | Solution                                                   |
| ------------ | ---------------------------------------------------------- |
| LLM calls    | `createMockLlmAdapter` — returns predetermined responses   |
| Side effects | Regular HexDI adapter mocking — swap service adapters      |
| Approval     | `createAutoApprovalAdapter` — deterministic approve/reject |
| Streaming    | `createMockStreamLlmAdapter` — predetermined chunks        |

### 18.2 Mock LLM Adapter

```typescript
function createMockLlmAdapter(config: {
  readonly responses: readonly Message[] | ((messages: readonly Message[]) => Message);
}): Adapter<typeof LlmPort, never, "singleton">;
```

When `responses` is an array, the mock returns each response in sequence. When `responses` is a function, it receives the conversation and returns a dynamic response.

**Array mode — sequential responses:**

```typescript
const mockLlm = createMockLlmAdapter({
  responses: [
    // Turn 1: Agent calls a tool
    {
      role: "assistant",
      content: "",
      toolCalls: [{ id: "call_1", name: "createTask", arguments: { title: "Buy groceries" } }],
    },
    // Turn 2: Agent responds with text
    {
      role: "assistant",
      content: "I've created the task 'Buy groceries' for you!",
    },
  ],
});
```

**Function mode — dynamic responses:**

```typescript
const mockLlm = createMockLlmAdapter({
  responses: messages => {
    const lastUser = messages.findLast(m => m.role === "user");
    if (lastUser?.content.includes("delete")) {
      return {
        role: "assistant",
        content: "",
        toolCalls: [{ id: "call_1", name: "deleteTask", arguments: { taskId: "abc" } }],
      };
    }
    return { role: "assistant", content: "How can I help?" };
  },
});
```

### 18.3 Mock Stream LLM Adapter

```typescript
function createMockStreamLlmAdapter(config: {
  readonly chunks:
    | readonly StreamChunk[]
    | ((messages: readonly Message[]) => AsyncIterable<StreamChunk>);
}): Adapter<typeof LlmPort, never, "singleton">;
```

**Array mode:**

```typescript
const mockStreamLlm = createMockStreamLlmAdapter({
  chunks: [
    { type: "text-delta", textDelta: "I've " },
    { type: "text-delta", textDelta: "created " },
    { type: "text-delta", textDelta: "the task!" },
    { type: "finish", finishReason: "stop" },
  ],
});
```

### 18.4 Tool Call Recorder

```typescript
interface ToolCallRecorder {
  readonly calls: readonly RecordedToolCall[];
  getCallsForTool(name: string): readonly RecordedToolCall[];
  assertCalled(name: string, times?: number): void;
  assertCalledWith(name: string, params: unknown): void;
  assertNotCalled(name: string): void;
  clear(): void;
}

interface RecordedToolCall {
  readonly toolName: string;
  readonly arguments: unknown;
  readonly result: unknown;
  readonly isError: boolean;
  readonly timestamp: number;
}

function createToolCallRecorder(): ToolCallRecorder;
```

The recorder wraps tool definitions and records every call:

```typescript
const recorder = createToolCallRecorder();

const createTaskTool = defineTool({
  name: "createTask",
  description: "Create a task",
  parameters: z.object({ title: z.string() }),
  execute: recorder.wrap(async params => ({ id: "1", ...params })),
});

// After running the agent...
recorder.assertCalled("createTask", 1);
recorder.assertCalledWith("createTask", { title: "Buy groceries" });
```

### 18.5 createTestAgent

A convenience factory that sets up a complete test agent with mocked dependencies:

```typescript
function createTestAgent(config: {
  readonly tools?: readonly ToolDefinition[];
  readonly responses: readonly Message[] | ((messages: readonly Message[]) => Message);
  readonly context?: readonly ContextEntry[];
  readonly approval?: ApprovalPolicy;
}): {
  readonly container: Container<unknown, unknown, unknown, "initialized">;
  readonly runner: AgentRunnerService;
  readonly recorder: ToolCallRecorder;
};
```

### 18.6 Complete Test Examples

**Test: Agent calls the correct tool with correct parameters**

```typescript
import { describe, it, expect } from "vitest";
import { createTestAgent, defineTool } from "@hex-di/agent-testing";
import { z } from "zod";

describe("TaskAgent", () => {
  it("creates a task when asked", async () => {
    const { runner, recorder } = createTestAgent({
      tools: [
        defineTool({
          name: "createTask",
          description: "Create a task",
          parameters: z.object({
            title: z.string(),
            priority: z.enum(["low", "medium", "high"]).optional(),
          }),
          execute: async params => ({ id: "task-1", ...params }),
        }),
      ],
      responses: [
        {
          role: "assistant",
          content: "",
          toolCalls: [
            {
              id: "call_1",
              name: "createTask",
              arguments: { title: "Buy milk", priority: "high" },
            },
          ],
        },
        {
          role: "assistant",
          content: "Done! I created a high-priority task: Buy milk.",
        },
      ],
    });

    const result = await runner.run({ prompt: "Add a high priority task to buy milk" }).result;

    // Verify the agent called the right tool
    recorder.assertCalled("createTask", 1);
    recorder.assertCalledWith("createTask", { title: "Buy milk", priority: "high" });

    // Verify the final response
    expect(result.lastMessage.content).toContain("Buy milk");
    expect(result.turnCount).toBe(2);
  });
});
```

**Test: Agent handles tool errors gracefully**

```typescript
it("recovers when a tool throws", async () => {
  const { runner } = createTestAgent({
    tools: [
      defineTool({
        name: "getUser",
        description: "Get user by ID",
        parameters: z.object({ userId: z.string() }),
        execute: async () => {
          throw new Error("User not found");
        },
      }),
    ],
    responses: [
      {
        role: "assistant",
        content: "",
        toolCalls: [{ id: "call_1", name: "getUser", arguments: { userId: "nonexistent" } }],
      },
      {
        role: "assistant",
        content: "I couldn't find that user. Could you check the ID?",
      },
    ],
  });

  const result = await runner.run({ prompt: "Find user nonexistent" }).result;

  expect(result.lastMessage.content).toContain("couldn't find");
});
```

**Test: Approval flow — approved**

```typescript
it("executes tool after approval", async () => {
  const { runner, recorder } = createTestAgent({
    tools: [
      defineTool({
        name: "deleteTask",
        description: "Delete a task",
        parameters: z.object({ taskId: z.string() }),
        execute: async params => ({ deleted: params.taskId }),
      }),
    ],
    responses: [
      {
        role: "assistant",
        content: "",
        toolCalls: [{ id: "call_1", name: "deleteTask", arguments: { taskId: "task-1" } }],
      },
      {
        role: "assistant",
        content: "The task has been deleted.",
      },
    ],
    approval: "all",
  });

  // Auto-approve is the default in createTestAgent
  const result = await runner.run({ prompt: "Delete task-1" }).result;

  recorder.assertCalled("deleteTask", 1);
  expect(result.lastMessage.content).toContain("deleted");
});
```

**Test: Approval flow — rejected**

```typescript
it("handles rejected tool calls", async () => {
  const { runner, recorder } = createTestAgent({
    tools: [
      defineTool({
        name: "deleteTask",
        description: "Delete a task",
        parameters: z.object({ taskId: z.string() }),
        execute: async params => ({ deleted: params.taskId }),
      }),
    ],
    responses: [
      {
        role: "assistant",
        content: "",
        toolCalls: [{ id: "call_1", name: "deleteTask", arguments: { taskId: "task-1" } }],
      },
      {
        role: "assistant",
        content: "The deletion was cancelled.",
      },
    ],
    // Override auto-approval with auto-reject
    approval: "all",
  });

  // Use createAutoApprovalAdapter(false) for rejection
  // ... (custom wiring shown in section 18.8)
  recorder.assertNotCalled("deleteTask");
});
```

**Test: Multi-turn conversation**

```typescript
it("handles multi-turn tool calling", async () => {
  const { runner, recorder } = createTestAgent({
    tools: [
      defineTool({
        name: "searchTasks",
        description: "Search tasks",
        parameters: z.object({ query: z.string() }),
        execute: async () => [{ id: "1", title: "Weekly review" }],
      }),
      defineTool({
        name: "updateTask",
        description: "Update a task",
        parameters: z.object({ taskId: z.string(), status: z.string() }),
        execute: async params => ({ ...params, updated: true }),
      }),
    ],
    responses: [
      // Turn 1: Search
      {
        role: "assistant",
        content: "",
        toolCalls: [{ id: "c1", name: "searchTasks", arguments: { query: "review" } }],
      },
      // Turn 2: Update
      {
        role: "assistant",
        content: "",
        toolCalls: [{ id: "c2", name: "updateTask", arguments: { taskId: "1", status: "done" } }],
      },
      // Turn 3: Respond
      {
        role: "assistant",
        content: "Done! I found 'Weekly review' and marked it as complete.",
      },
    ],
  });

  const result = await runner.run({ prompt: "Mark the review task as done" }).result;

  recorder.assertCalled("searchTasks", 1);
  recorder.assertCalled("updateTask", 1);
  expect(result.turnCount).toBe(3);
});
```

### 18.7 Testing Streaming

```typescript
it("streams text deltas", async () => {
  const { runner } = createTestAgent({
    tools: [],
    responses: [{ role: "assistant", content: "Hello world" }],
  });

  const events: AgentEvent[] = [];
  const run = runner.runStream({
    prompt: "Say hello",
    onEvent: e => events.push(e),
  });

  await run.result;

  const textEvents = events.filter(e => e.type === "text-delta");
  expect(textEvents.length).toBeGreaterThan(0);

  const fullText = textEvents.map(e => (e as TextDeltaEvent).delta).join("");
  expect(fullText).toBe("Hello world");
});
```

### 18.8 Custom Test Wiring

For tests that need more control than `createTestAgent` provides, wire the graph manually:

```typescript
const testGraph = GraphBuilder.create()
  .provide(createMockLlmAdapter({ responses: [...] }))
  .provide(createToolAdapter({
    provides: TaskToolsPort,
    requires: [MockTaskServicePort] as const,
    tools: (deps) => [/* ... */],
  }))
  .provide(createContextAdapter({
    requires: [] as const,
    entries: () => [{ name: "user", description: "Test user", value: { id: "u1" } }],
  }))
  .provide(agentAdapter)
  .provide(createAutoApprovalAdapter(false)) // Auto-reject
  .provide(createAgentRunnerAdapter({
    agent: TaskAgentPort,
    approval: "all",
  }))
  .build();

const container = createContainer({ graph: testGraph, name: "test" });
await container.initialize();

const runner = container.resolve(AgentRunnerPort);
```

### 18.9 Testing Best Practices

1. **Use array responses for deterministic tests** — Function responses add complexity; reserve them for tests that need dynamic behavior
2. **One test, one scenario** — Each test should verify one agent behavior (one tool call sequence, one error case, one approval flow)
3. **Assert tool calls, not LLM output** — The mock LLM output is predetermined; assert on what the agent did (tool calls) not what it said
4. **Use the recorder** — `ToolCallRecorder` gives better error messages than manual assertion on event arrays
5. **Test the graph, not the adapter** — Integration tests should create a full container to verify wiring, not test individual adapter factories

---

_Previous: [06 - Integration](./06-integration.md) | Next: [08 - Advanced Patterns](./08-advanced.md)_
