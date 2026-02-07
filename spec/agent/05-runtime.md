# 05 - Runtime

## 13. Agent Runner

The `AgentRunner` executes the agent's turn-based loop: send messages to the LLM, process tool calls, collect results, and repeat until the LLM stops calling tools or the turn limit is reached.

### 13.1 AgentRunnerService Interface

```typescript
interface AgentRunnerService {
  run(options: RunOptions): AgentRun;
  runStream(options: RunOptions): AgentStreamRun;
}

interface RunOptions {
  readonly prompt: string;
  readonly messages?: readonly Message[];
  readonly signal?: AbortSignal;
  readonly onEvent?: (event: AgentEvent) => void;
}
```

- `prompt`: The user's message to send to the agent
- `messages`: Optional conversation history. If provided, the prompt is appended to this history. If omitted, a new conversation starts.
- `signal`: An `AbortSignal` to cancel the run mid-execution
- `onEvent`: Callback invoked for each `AgentEvent` (alternative to consuming the async iterable)

### 13.2 AgentRun

```typescript
interface AgentRun {
  readonly result: Promise<AgentRunResult>;
  readonly abort: () => void;
}

interface AgentStreamRun extends AgentRun {
  readonly events: AsyncIterable<AgentEvent>;
}
```

`AgentRun.run()` returns a non-streaming run — the `result` promise resolves when the entire run completes. `AgentRun.runStream()` returns a streaming run with an `events` async iterable that yields events as they occur.

### 13.3 AgentRunResult

```typescript
interface AgentRunResult {
  readonly messages: readonly Message[];
  readonly lastMessage: Message;
  readonly turnCount: number;
  readonly tokenUsage: TokenUsage;
}

interface TokenUsage {
  readonly prompt: number;
  readonly completion: number;
  readonly total: number;
}
```

### 13.4 The Execution Algorithm

```
function runAgent(agent, prompt, messages, signal):
  allMessages = [...messages, { role: "user", content: prompt }]
  contextPrompt = agent.context.toSystemPrompt()
  systemMessage = { role: "system", content: agent.config.systemPrompt + contextPrompt }
  turnCount = 0

  emit("run-started", { runId, agentName: agent.config.name })

  loop:
    if signal.aborted: throw AbortError
    if turnCount >= agent.config.maxTurns: break

    turnCount++
    emit("turn-started", { turnNumber: turnCount })

    toolSchemas = agent.tools.flatMap(t => t.toJsonSchema())
    response = await agent.llm.generateText({
      messages: [systemMessage, ...allMessages],
      tools: toolSchemas,
      toolChoice: agent.config.toolChoice,
      maxTokens: agent.config.maxTokens,
      temperature: agent.config.temperature,
    })

    allMessages.push(response)

    if response.content:
      emit("text-complete", { text: response.content })

    if not response.toolCalls or response.toolCalls.length == 0:
      emit("turn-complete", { turnNumber: turnCount })
      break

    toolResults = []
    for each toolCall in response.toolCalls:
      emit("tool-call-started", { callId, toolName, arguments })

      if approvalRequired(toolCall):
        emit("approval-requested", { callId, toolName, arguments })
        approved = await approval.requestApproval(toolCall)
        emit("approval-resolved", { callId, approved })
        if not approved:
          toolResults.push({ callId, result: "Tool call rejected by user", isError: true })
          continue

      result = await executeTool(toolCall)
      emit("tool-call-result", { callId, result, isError })
      toolResults.push(result)

    allMessages.push({ role: "tool", toolResults })
    emit("turn-complete", { turnNumber: turnCount })

  emit("run-complete", { runId, result })
  return result
```

### 13.5 Streaming Execution

When using `runStream()`, the runner uses `llm.streamText()` instead of `llm.generateText()`, forwarding `text-delta` events as they arrive:

```typescript
const streamRun = runner.runStream({ prompt: "Create a task for the weekly review" });

for await (const event of streamRun.events) {
  switch (event.type) {
    case "text-delta":
      process.stdout.write(event.delta);
      break;
    case "tool-call-started":
      console.log(`Calling tool: ${event.toolName}`);
      break;
    case "tool-call-result":
      console.log(`Tool result:`, event.result);
      break;
    case "run-complete":
      console.log(`Done in ${event.result.turnCount} turns`);
      break;
  }
}
```

### 13.6 Abort Handling

Runs can be aborted via the `AbortSignal` or the `abort()` method:

```typescript
const controller = new AbortController();
const run = runner.runStream({ prompt: "...", signal: controller.signal });

// Abort after 30 seconds
setTimeout(() => controller.abort(), 30_000);

// Or use the convenience method
run.abort();
```

When aborted, the runner:

1. Cancels any in-flight LLM request
2. Emits a `run-error` event with an `AbortError`
3. Rejects the `result` promise with the same error
4. Stops yielding events from the async iterable

### 13.7 AgentRunnerPort and Adapter

```typescript
// Port
const AgentRunnerPort = createPort<AgentRunnerService>()({
  name: "AgentRunner",
});

// Adapter factory
function createAgentRunnerAdapter<TAgent extends Port<AgentService, string>>(config: {
  readonly agent: TAgent;
  readonly approval?: ApprovalPolicy;
}): Adapter<typeof AgentRunnerPort, TAgent | typeof ApprovalPort, "scoped">;
```

The runner adapter depends on an `AgentPort` and optionally an `ApprovalPort`. If no approval policy is set, the runner executes all tool calls without approval.

```typescript
const runnerAdapter = createAgentRunnerAdapter({
  agent: TaskAgentPort,
  approval: { tools: ["deleteTask", "updateUser"] },
});
```

---

## 14. Human-in-the-Loop (HITL)

HITL approval gates sensitive tool calls behind user confirmation. The approval system is a port, making it swappable between interactive UI approval, auto-approval for testing, and policy-based approval for production.

### 14.1 ApprovalPolicy

```typescript
type ApprovalPolicy =
  | "none" // Never ask — execute all tools immediately
  | "all" // Ask for every tool call
  | { readonly tools: readonly string[] } // Ask for specific tool names
  | ((toolCall: ToolCall) => boolean) // Synchronous predicate
  | ((toolCall: ToolCall) => Promise<boolean>); // Async predicate
```

Examples:

```typescript
// Approve destructive operations only
const policy: ApprovalPolicy = {
  tools: ["deleteTask", "deleteUser", "dropTable"],
};

// Approve based on argument values
const policy: ApprovalPolicy = toolCall => {
  if (toolCall.name === "transferFunds") {
    const args = toolCall.arguments as { amount: number };
    return args.amount > 1000; // Only approve large transfers
  }
  return false;
};
```

### 14.2 ApprovalService Interface

```typescript
interface ApprovalRequest {
  readonly callId: string;
  readonly toolName: string;
  readonly arguments: unknown;
  readonly description: string;
}

interface ApprovalService {
  requestApproval(request: ApprovalRequest): Promise<boolean>;
}

// Port
const ApprovalPort = createPort<ApprovalService>()({
  name: "Approval",
  direction: "inbound",
});
```

### 14.3 Callback Approval Adapter

For non-React environments, the callback adapter exposes a promise-based approval interface:

```typescript
function createCallbackApprovalAdapter(config?: {
  readonly timeout?: number; // Timeout in ms, rejects with TimeoutError
  readonly defaultDecision?: boolean; // Decision when timeout occurs
}): Adapter<typeof ApprovalPort, never, "scoped"> & {
  readonly pending: ApprovalRequest | undefined;
  readonly approve: () => void;
  readonly reject: () => void;
};
```

Usage in a terminal application:

```typescript
import readline from "readline";

const approvalAdapter = createCallbackApprovalAdapter({ timeout: 30_000 });

// Wire into graph...

// In the event loop:
runner.onEvent = event => {
  if (event.type === "approval-requested") {
    console.log(`Agent wants to call ${event.toolName} with:`, event.arguments);
    const rl = readline.createInterface({ input: process.stdin });
    rl.question("Approve? (y/n) ", answer => {
      if (answer === "y") approvalAdapter.approve();
      else approvalAdapter.reject();
      rl.close();
    });
  }
};
```

### 14.4 Auto-Approval Adapter (Testing)

```typescript
function createAutoApprovalAdapter(
  decision?: boolean
): Adapter<typeof ApprovalPort, never, "singleton">;
```

Always approves (or always rejects) without user interaction. Used in tests:

```typescript
const autoApprove = createAutoApprovalAdapter(true);
const autoReject = createAutoApprovalAdapter(false);
```

### 14.5 Approval Flow Diagram

```
Agent calls tool "deleteTask"
        |
        v
Runner checks ApprovalPolicy
        |
  +-----+-----+
  |             |
  | Not in      | In policy
  | policy      |
  v             v
Execute      Emit "approval-requested"
immediately        |
                   v
            ApprovalPort.requestApproval()
                   |
             +-----+-----+
             |             |
             | approve()   | reject()
             v             v
        Execute tool   Return error
        Emit result    to LLM
```

### 14.6 Timeout Behavior

When a timeout is configured on the callback approval adapter:

1. If the user does not respond within the timeout period, the `defaultDecision` is used
2. If no `defaultDecision` is set, the approval request rejects with a `TimeoutError`
3. The `TimeoutError` is caught by the runner and returned to the LLM as an error tool result

---

## 15. Streaming & Events

### 15.1 Event Types

All events emitted during an agent run:

```typescript
type AgentEvent =
  | RunStartedEvent
  | TurnStartedEvent
  | TextDeltaEvent
  | TextCompleteEvent
  | ToolCallStartedEvent
  | ToolCallResultEvent
  | ApprovalRequestedEvent
  | ApprovalResolvedEvent
  | TurnCompleteEvent
  | RunCompleteEvent
  | RunErrorEvent;

interface RunStartedEvent {
  readonly type: "run-started";
  readonly runId: string;
  readonly agentName: string;
}

interface TurnStartedEvent {
  readonly type: "turn-started";
  readonly turnNumber: number;
}

interface TextDeltaEvent {
  readonly type: "text-delta";
  readonly delta: string;
}

interface TextCompleteEvent {
  readonly type: "text-complete";
  readonly text: string;
}

interface ToolCallStartedEvent {
  readonly type: "tool-call-started";
  readonly callId: string;
  readonly toolName: string;
  readonly arguments: unknown;
}

interface ToolCallResultEvent {
  readonly type: "tool-call-result";
  readonly callId: string;
  readonly result: unknown;
  readonly isError: boolean;
}

interface ApprovalRequestedEvent {
  readonly type: "approval-requested";
  readonly callId: string;
  readonly toolName: string;
  readonly arguments: unknown;
}

interface ApprovalResolvedEvent {
  readonly type: "approval-resolved";
  readonly callId: string;
  readonly approved: boolean;
}

interface TurnCompleteEvent {
  readonly type: "turn-complete";
  readonly turnNumber: number;
}

interface RunCompleteEvent {
  readonly type: "run-complete";
  readonly runId: string;
  readonly result: AgentRunResult;
}

interface RunErrorEvent {
  readonly type: "run-error";
  readonly runId: string;
  readonly error: Error;
}
```

### 15.2 AG-UI Protocol Compatibility

HexDI Agent events map to the AG-UI protocol event types:

| HexDI Event         | AG-UI EventType        |
| ------------------- | ---------------------- |
| `run-started`       | `RUN_STARTED`          |
| `text-delta`        | `TEXT_MESSAGE_CONTENT` |
| `text-complete`     | `TEXT_MESSAGE_END`     |
| `tool-call-started` | `TOOL_CALL_START`      |
| `tool-call-result`  | `TOOL_CALL_END`        |
| `run-complete`      | `RUN_FINISHED`         |
| `run-error`         | `RUN_ERROR`            |

An AG-UI transport adapter can translate HexDI events to AG-UI events for consumption by AG-UI compatible frontends:

```typescript
function toAgUiEvents(events: AsyncIterable<AgentEvent>): AsyncIterable<AgUiEvent> {
  // Translates between the two event formats
}
```

### 15.3 Server-Sent Events (SSE) Transport

For server-to-client streaming, the events can be serialized as SSE:

```typescript
function agentEventsToSse(events: AsyncIterable<AgentEvent>): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      for await (const event of events) {
        const data = JSON.stringify(event);
        controller.enqueue(encoder.encode(`event: ${event.type}\ndata: ${data}\n\n`));
      }
      controller.close();
    },
  });
}
```

Usage with a web framework:

```typescript
// Hono example
app.post("/chat/stream", async c => {
  const scope = container.createScope(`session:${c.req.header("x-session-id")}`);
  const runner = scope.resolve(AgentRunnerPort);
  const { events } = runner.runStream({ prompt: c.req.json().prompt });
  return new Response(agentEventsToSse(events), {
    headers: { "Content-Type": "text/event-stream" },
  });
});
```

### 15.4 Event Filtering

Consumers can filter events by type:

```typescript
function filterEvents<T extends AgentEvent["type"]>(
  events: AsyncIterable<AgentEvent>,
  ...types: readonly T[]
): AsyncIterable<Extract<AgentEvent, { type: T }>> {
  return {
    async *[Symbol.asyncIterator]() {
      for await (const event of events) {
        if ((types as readonly string[]).includes(event.type)) {
          yield event as Extract<AgentEvent, { type: T }>;
        }
      }
    },
  };
}

// Usage — only text deltas
for await (const event of filterEvents(run.events, "text-delta")) {
  process.stdout.write(event.delta); // event is typed as TextDeltaEvent
}
```

### 15.5 Event Collection

For testing or logging, collect all events into an array:

```typescript
async function collectEvents(events: AsyncIterable<AgentEvent>): Promise<readonly AgentEvent[]> {
  const collected: AgentEvent[] = [];
  for await (const event of events) {
    collected.push(event);
  }
  return collected;
}
```

---

_Previous: [04 - Adapters](./04-adapters.md) | Next: [06 - Integration](./06-integration.md)_
