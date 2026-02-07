# 01 - Overview & Philosophy

## 1. Overview

HexDI Agent is an AI agent interaction layer that applies hexagonal architecture principles to AI tooling. It separates **what** the agent can do (ports) from **how** it does it (adapters), enabling:

- Swappable LLM providers (OpenAI, Anthropic, local models) via adapter swap
- Type-safe tool definitions with Zod schemas
- Deterministic testing with mock LLMs — no API calls needed
- Human-in-the-loop approval as a first-class port
- Multi-agent orchestration through graph composition
- Streaming events compatible with the AG-UI protocol

### 1.1 Goals

1. **Hexagonal AI architecture** — LLMs, tools, context, and agents are all ports with swappable adapters
2. **Full HexDI integration** — Agent adapters compose into the same `GraphBuilder` as any other adapter
3. **Zero-configuration testing** — Mock LLM adapter returns deterministic responses; tool calls are recorded and assertable
4. **Type safety** — Compile-time validation of tool parameters, agent wiring, and context shape
5. **Framework agnostic core** — `@hex-di/agent` has no React dependency; `@hex-di/agent-react` provides hooks
6. **Streaming first** — Every agent run produces an async iterable of typed events

### 1.2 Non-Goals

1. **Chat UI components** — No `<ChatWindow>` or `<MessageBubble>`. Use any UI library.
2. **Prompt engineering utilities** — No prompt templates, chain-of-thought wrappers, or RAG pipelines
3. **Model hosting** — No inference server, model download, or quantization
4. **Vector stores / embeddings** — Out of scope; use dedicated libraries
5. **Authentication / rate limiting** — Handled at the infrastructure level, not the DI level

### 1.3 Key Insight

Your application's services are already ports. Making them available as AI agent tools is a natural extension of hexagonal architecture. A `UserService` behind a `UserPort` can be exposed as an AI tool by wrapping its methods with Zod schemas — no rewrite required.

```
Traditional approach:
  App code  -->  AI SDK  -->  LLM
  (tightly coupled, hard to test, provider lock-in)

HexDI Agent approach:
  App ports  -->  Tool adapters  -->  Agent adapter  -->  LLM adapter  -->  Provider
  (every arrow is swappable, every layer testable)
```

---

## 2. Philosophy

### 2.1 Architecture

```
+----------------------------------------------------------------------+
|                        Application Layer                             |
|                                                                      |
|  +------------------+  +------------------+  +------------------+    |
|  |   UserPort       |  |   OrderPort      |  |   AnalyticsPort  |    |
|  |   (existing)     |  |   (existing)     |  |   (existing)     |    |
|  +--------+---------+  +--------+---------+  +--------+---------+    |
|           |                     |                     |              |
+-----------+---------------------+---------------------+--------------+
            |                     |                     |
+-----------v---------------------v---------------------v--------------+
|                        @hex-di/agent                                 |
|                                                                      |
|  +------------------+  +------------------+  +------------------+    |
|  |  ToolPort        |  |  ContextPort     |  |  AgentPort       |    |
|  |  (wraps app      |  |  (exposes app    |  |  (wires tools +  |    |
|  |   ports as tools)|  |   state to AI)   |  |   context + llm) |    |
|  +--------+---------+  +--------+---------+  +--------+---------+    |
|           |                     |                     |              |
|  +--------v---------+  +-------v----------+  +-------v----------+   |
|  |  ToolAdapter     |  |  ContextAdapter  |  |  AgentAdapter    |   |
|  +------------------+  +------------------+  +--------+---------+   |
|                                                       |              |
|                                              +--------v---------+   |
|                                              |  AgentRunner     |   |
|                                              |  (execution loop)|   |
|                                              +--------+---------+   |
|                                                       |              |
+-------------------------------------------------------+--------------+
                                                        |
+-------------------------------------------------------v--------------+
|                          LLM Layer                                   |
|                                                                      |
|  +------------------+  +------------------+  +------------------+    |
|  |  LlmPort         |  |  LlmPort         |  |  LlmPort         |   |
|  |  OpenAI Adapter  |  |  Anthropic Adapt  |  |  Mock Adapter    |   |
|  +------------------+  +------------------+  +------------------+    |
+----------------------------------------------------------------------+
```

### 2.2 Ports Define Capabilities, Adapters Provide Behavior

In traditional AI frameworks, the LLM client, tool execution, and agent loop are intertwined. Switching from OpenAI to Anthropic requires touching multiple files. Testing requires mocking HTTP requests or setting up API key fixtures.

With HexDI Agent, each concern is a port:

| Concern             | Port              | What it defines                                   |
| ------------------- | ----------------- | ------------------------------------------------- |
| LLM communication   | `LlmPort`         | `generateText()`, `streamText()`                  |
| Tools for the agent | `ToolPort`        | Tool definitions with Zod schemas                 |
| Application context | `ContextPort`     | State exposed to the AI                           |
| Agent configuration | `AgentPort`       | System prompt, tools, context, LLM wired together |
| Execution           | `AgentRunnerPort` | Run loop, event streaming, abort                  |
| Approval            | `ApprovalPort`    | HITL approval for sensitive tools                 |

Each port has multiple possible adapters:

```typescript
// Production: Use OpenAI
const llmAdapter = createOpenAiAdapter({ model: "gpt-4o" });

// Development: Use a cheaper model
const llmAdapter = createAnthropicAdapter({ model: "claude-3-5-haiku-20241022" });

// Testing: Use deterministic mock
const llmAdapter = createMockLlmAdapter({
  responses: [{ role: "assistant", content: "Done!" }],
});
```

### 2.3 Composition Over Configuration

Agents are composed from ports, not configured through large option objects. This means:

- Tools come from `ToolPort` adapters that depend on your existing service ports
- Context comes from `ContextPort` adapters that read from your existing state ports
- The LLM comes from `LlmPort` adapters that wrap provider SDKs
- The agent ties them together through `AgentPort`
- The runner executes the agent loop through `AgentRunnerPort`

Each piece is independently testable, replaceable, and composable through the HexDI graph.

### 2.4 Before & After

**Before (traditional approach):**

```typescript
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function runAgent(userMessage: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are a task manager." },
      { role: "user", content: userMessage },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "createTask",
          description: "Create a new task",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string" },
              priority: { type: "string", enum: ["low", "medium", "high"] },
            },
            required: ["title"],
          },
        },
      },
    ],
  });
  // Handle tool calls manually...
  // No type safety on parameters
  // Cannot test without API calls or HTTP mocking
  // Locked to OpenAI
}
```

**After (HexDI Agent approach):**

```typescript
// Tool definition with Zod — type-safe parameters
const createTaskTool = defineTool({
  name: "createTask",
  description: "Create a new task",
  parameters: z.object({
    title: z.string(),
    priority: z.enum(["low", "medium", "high"]).optional(),
  }),
  execute: async params => taskService.create(params),
});

// Test with mock LLM — no API calls
const { runner } = createTestAgent({
  tools: [createTaskTool],
  responses: [
    {
      role: "assistant",
      content: "",
      toolCalls: [{ id: "1", name: "createTask", arguments: { title: "Buy milk" } }],
    },
    { role: "assistant", content: "Task created!" },
  ],
});

const result = await runner.run({ prompt: "Add a task to buy milk" }).result;
// Deterministic, fast, no API key needed
```

---

## 3. Package Structure

```
@hex-di/agent            Core library (framework-agnostic)
  - Tool, Agent, LLM, Context port types
  - Tool, Agent, LLM, Context adapter factories
  - AgentRunner execution loop
  - HITL approval types and adapters
  - Streaming event types
  - LLM provider adapters (OpenAI, Anthropic, Vercel AI)

@hex-di/agent-react      React integration
  - useAgentChat, useAgentStream hooks
  - useAgentTool, useAgentContext hooks
  - useApproval hook
  - AgentProvider component

@hex-di/agent-testing    Testing utilities
  - createMockLlmAdapter, createMockStreamLlmAdapter
  - createTestAgent convenience factory
  - ToolCallRecorder for assertions
  - createAutoApprovalAdapter
```

### 3.1 Dependency Graph

```
@hex-di/agent-react -----> @hex-di/agent -----> @hex-di/core
       |                        |                    |
       v                        v                    v
  @hex-di/react            @hex-di/graph        (zod)
                           @hex-di/runtime

@hex-di/agent-testing ---> @hex-di/agent
```

### 3.2 Peer Dependencies

| Package                 | Peer Dependencies                                         |
| ----------------------- | --------------------------------------------------------- |
| `@hex-di/agent`         | `@hex-di/core`, `@hex-di/graph`, `@hex-di/runtime`, `zod` |
| `@hex-di/agent-react`   | `@hex-di/agent`, `@hex-di/react`, `react`                 |
| `@hex-di/agent-testing` | `@hex-di/agent`                                           |

---

_Next: [02 - Core Concepts](./02-core-concepts.md)_
