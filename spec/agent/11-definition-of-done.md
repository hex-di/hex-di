# 11 - Definition of Done

_Previous: [10 - Appendices](./10-appendices.md)_

---

This document defines all tests required for `@hex-di/agent`, `@hex-di/agent-react`, and `@hex-di/agent-testing` to be considered complete. Each section maps to a spec section and specifies required unit tests, type-level tests, integration tests, end-to-end tests, and mutation testing guidance.

## Test File Convention

| Test Category           | File Pattern  | Location                              |
| ----------------------- | ------------- | ------------------------------------- |
| Unit tests              | `*.test.ts`   | `libs/agent/core/tests/`              |
| Type-level tests        | `*.test-d.ts` | `libs/agent/core/tests/`              |
| Integration tests       | `*.test.ts`   | `libs/agent/core/tests/integration/`  |
| E2E tests               | `*.test.ts`   | `libs/agent/core/tests/e2e/`          |
| Testing package tests   | `*.test.ts`   | `libs/agent/testing/tests/`           |
| React unit tests        | `*.test.tsx`  | `libs/agent/react/tests/`             |
| React type tests        | `*.test-d.ts` | `libs/agent/react/tests/`             |
| React integration tests | `*.test.tsx`  | `libs/agent/react/tests/integration/` |

---

## DoD 1: Tool Definitions (Spec Sections 4-5)

### Unit Tests — `tool-definitions.test.ts`

| #   | Test                                                                                                                              | Type |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | `defineTool({ name: "createTask", ... })` returns a frozen `ToolDefinition` with `name` equal to `"createTask"`                   | unit |
| 2   | `defineTool()` returns an object with `name`, `description`, `parameters`, and `execute` fields                                   | unit |
| 3   | `defineTool()` result is deeply frozen (`Object.isFrozen()` returns true)                                                         | unit |
| 4   | `ToolPortService.tools` returns the readonly tuple of all registered tool definitions                                             | unit |
| 5   | `ToolPortService.getTool("createTask")` returns the exact tool definition with name `"createTask"`                                | unit |
| 6   | `ToolPortService.getTool("nonExistent")` returns `undefined` or throws descriptive error                                          | unit |
| 7   | `ToolPortService.toJsonSchema()` converts each tool to `{ type: "function", function: { name, description, parameters } }` format | unit |
| 8   | `toJsonSchema()` produces valid JSON Schema from Zod `z.object({ title: z.string() })`                                            | unit |
| 9   | `toJsonSchema()` includes `description` fields from `z.string().describe("...")` annotations                                      | unit |
| 10  | `toJsonSchema()` handles optional fields from `z.string().optional()` as non-required properties                                  | unit |
| 11  | `toJsonSchema()` handles enums from `z.enum(["low", "medium", "high"])` as `{ enum: [...] }`                                      | unit |
| 12  | `toJsonSchema()` handles default values from `z.string().default("medium")`                                                       | unit |
| 13  | Tool `execute` receives validated params matching `z.infer<TParams>` after Zod parsing                                            | unit |
| 14  | Tool `parameters.safeParse()` with valid input returns `{ success: true, data }`                                                  | unit |
| 15  | Tool `parameters.safeParse()` with invalid input returns `{ success: false, error }` with Zod error message                       | unit |
| 16  | Tool with `z.object({ id: z.string().uuid() })` rejects non-UUID string via safeParse                                             | unit |
| 17  | Tool `execute` throwing an error is caught and returned as `ToolResult` with `isError: true`                                      | unit |
| 18  | Tool `execute` throwing produces `ToolResult.result` containing the error message string                                          | unit |
| 19  | Tool name stored as string literal type (not widened to `string`) verified via runtime assertion                                  | unit |
| 20  | `defineTool()` with empty parameters `z.object({})` produces valid tool with no required params                                   | unit |

### Type-Level Tests — `tool-definitions.test-d.ts`

| #   | Test                                                                                                                         | Type |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | `defineTool({ name: "foo", ... })` infers `TName` as literal `"foo"` (not widened to `string`)                               | type |
| 2   | `defineTool({ parameters: z.object({ title: z.string() }), ... })` infers `TParams` as `z.ZodObject<{ title: z.ZodString }>` | type |
| 3   | `defineTool({ execute: async (p) => ({ id: "1" }), ... })` infers `TResult` as `{ id: string }`                              | type |
| 4   | `ToolDefinition<"createTask", typeof schema, { id: string }>` constrains all three type params                               | type |
| 5   | `ToolPortService<[T1, T2]>.getTool("createTask")` return type is `Extract<T1 \| T2, { name: "createTask" }>`                 | type |
| 6   | `ToolPortService<[T1, T2]>.getTool("unknown")` return type is `never`                                                        | type |
| 7   | `ToolPortService.tools` is typed as `readonly [T1, T2]` tuple, not `readonly ToolDefinition[]`                               | type |
| 8   | `execute` parameter is typed as `z.infer<TParams>` (e.g., `{ title: string; priority?: "low" \| "high" }`)                   | type |
| 9   | `ToolJsonSchema.function.parameters` is typed as `JsonSchema`                                                                | type |
| 10  | `ToolChoice` is `"auto" \| "none" \| "required" \| { readonly tool: string }`                                                | type |

### Mutation Testing

**Target: >95% mutation score.** Tool definition freezing, Zod schema conversion, `getTool` name matching, and `safeParse` validation are critical -- mutations to name comparison, freeze calls, or schema translation must be caught.

---

## DoD 2: Port Definitions (Spec Sections 5-8)

### Unit Tests — `port-definitions.test.ts`

| #   | Test                                                                                                                               | Type |
| --- | ---------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | `LlmPort` is an outbound port with name `"Llm"`                                                                                    | unit |
| 2   | `LlmPort` has singleton lifetime                                                                                                   | unit |
| 3   | `ContextPort` is an inbound port with name `"AgentContext"`                                                                        | unit |
| 4   | `ContextPort` has scoped lifetime                                                                                                  | unit |
| 5   | `ToolPort` created via `createPort<ToolPortService<...>>()({ name: "TaskTools", direction: "inbound" })` has direction `"inbound"` | unit |
| 6   | `ToolPort` has singleton lifetime                                                                                                  | unit |
| 7   | `AgentRunnerPort` is an outbound port with name `"AgentRunner"`                                                                    | unit |
| 8   | `AgentRunnerPort` has scoped lifetime                                                                                              | unit |
| 9   | `ApprovalPort` is an inbound port with name `"Approval"`                                                                           | unit |
| 10  | `ApprovalPort` has scoped lifetime                                                                                                 | unit |
| 11  | Custom agent port created via `createPort<AgentService>()({ name: "TaskAgent" })` has direction defaulting to outbound             | unit |
| 12  | Custom agent port has scoped lifetime                                                                                              | unit |
| 13  | Multiple LLM ports can coexist: `FastLlmPort` and `ReasoningLlmPort` are distinct ports                                            | unit |
| 14  | `LlmPort` service contract includes `generateText` and `streamText` methods                                                        | unit |
| 15  | `ContextService.getAll()` returns `readonly ContextEntry[]`                                                                        | unit |
| 16  | `ContextService.get("currentUser")` returns matching `ContextEntry` or `undefined`                                                 | unit |
| 17  | `ContextService.toSystemPrompt()` serializes entries into XML-like `<context><entry>` format                                       | unit |
| 18  | `ApprovalService.requestApproval(request)` returns `Promise<boolean>`                                                              | unit |
| 19  | `AgentRunnerService.run(options)` returns an `AgentRun` with `result` and `abort`                                                  | unit |
| 20  | `AgentRunnerService.runStream(options)` returns an `AgentStreamRun` with `events` async iterable                                   | unit |

### Type-Level Tests — `port-definitions.test-d.ts`

| #   | Test                                                                                                                      | Type |
| --- | ------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | `LlmPort` is typed as `DirectedPort<LlmService, "Llm", "outbound">`                                                       | type |
| 2   | `ContextPort` is typed as `DirectedPort<ContextService, "AgentContext", "inbound">`                                       | type |
| 3   | `ApprovalPort` is typed as `DirectedPort<ApprovalService, "Approval", "inbound">`                                         | type |
| 4   | `AgentRunnerPort` is typed as `DirectedPort<AgentRunnerService, "AgentRunner", "outbound">`                               | type |
| 5   | `AgentService.config` is typed as `AgentConfig`                                                                           | type |
| 6   | `AgentService.tools` is typed as `readonly ToolDefinition[]`                                                              | type |
| 7   | `AgentService.context` is typed as `ContextService`                                                                       | type |
| 8   | `AgentService.llm` is typed as `LlmService`                                                                               | type |
| 9   | `LlmService.generateText` returns `Promise<Message>`                                                                      | type |
| 10  | `LlmService.streamText` returns `StreamResult` with `stream: AsyncIterable<StreamChunk>` and `response: Promise<Message>` | type |
| 11  | `ContextEntry<"currentUser", User>` constrains `name` to `"currentUser"` and `value` to `User`                            | type |
| 12  | `MessageRole` is `"system" \| "user" \| "assistant" \| "tool"`                                                            | type |

### Mutation Testing

**Target: >95% mutation score.** Port name strings, direction assignments, and lifetime values are critical -- mutations to port configuration constants must be caught.

---

## DoD 3: Tool Adapters (Spec Section 9)

### Unit Tests — `tool-adapters.test.ts`

| #   | Test                                                                                                             | Type |
| --- | ---------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | `createToolAdapter({ provides, requires, tools })` returns an adapter with correct `provides` port               | unit |
| 2   | Adapter `requires` includes all ports passed in the `requires` array                                             | unit |
| 3   | Adapter lifetime is `"singleton"`                                                                                | unit |
| 4   | `tools` factory function receives resolved dependencies keyed by port name                                       | unit |
| 5   | `tools` factory returning `[tool1, tool2]` produces a `ToolPortService` with 2 tools                             | unit |
| 6   | Tool `execute` within adapter calls through to the resolved dependency service                                   | unit |
| 7   | Tool with `requires: [TaskServicePort, UserServicePort]` receives both `deps.TaskService` and `deps.UserService` | unit |
| 8   | Tool name uniqueness validated at `ToolPortService` construction: duplicate names throw descriptive error        | unit |
| 9   | Error message for duplicate tool name includes both the duplicate name and the port name                         | unit |
| 10  | Tool `execute` throwing an error wraps it as `ToolResult` with `isError: true` and error message as `result`     | unit |
| 11  | Tool `execute` returning a value wraps it as `ToolResult` with `isError: false`                                  | unit |
| 12  | Multiple tool adapters for different ports can coexist in the same graph                                         | unit |
| 13  | Tool adapter with empty `requires: []` creates tools without dependencies                                        | unit |
| 14  | Tool adapter with empty `tools: () => []` produces a `ToolPortService` with 0 tools                              | unit |
| 15  | `ToolPortService.toJsonSchema()` output matches the number of tools in the adapter                               | unit |

### Type-Level Tests — `tool-adapters.test-d.ts`

| #   | Test                                                                                       | Type |
| --- | ------------------------------------------------------------------------------------------ | ---- |
| 1   | `createToolAdapter` infers `TProvides` from the `provides` port argument                   | type |
| 2   | `createToolAdapter` infers `TRequires` from the `requires` tuple argument                  | type |
| 3   | `tools` factory parameter `deps` is typed as `ResolvedDeps<TupleToUnion<TRequires>>`       | type |
| 4   | Adapter return type carries `TProvides` as the provides type                               | type |
| 5   | Adapter return type has lifetime `"singleton"`                                             | type |
| 6   | Port-adapter type mismatch (providing wrong port service type) produces compile-time error | type |
| 7   | `tools` factory return type must satisfy `readonly ToolDefinition[]`                       | type |

### Mutation Testing

**Target: >90% mutation score.** Dependency resolution, tool name uniqueness validation, and error wrapping are critical -- mutations to name collision checks or error handling must be caught.

---

## DoD 4: Agent Adapters (Spec Section 10)

### Unit Tests — `agent-adapters.test.ts`

| #   | Test                                                                                                                 | Type |
| --- | -------------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | `createAgentAdapter({ provides, requires, config })` returns an adapter providing the specified `AgentPort`          | unit |
| 2   | Adapter requires includes the `LlmPort`, `ContextPort`, and all tool ports passed                                    | unit |
| 3   | Adapter lifetime is `"scoped"`                                                                                       | unit |
| 4   | Resolved `AgentService.config` matches the `AgentConfig` passed to the adapter factory                               | unit |
| 5   | Resolved `AgentService.llm` is the `LlmService` resolved from the `LlmPort` dependency                               | unit |
| 6   | Resolved `AgentService.context` is the `ContextService` resolved from the `ContextPort` dependency                   | unit |
| 7   | Resolved `AgentService.tools` is the flattened list of all tools from all `ToolPort` dependencies                    | unit |
| 8   | Agent adapter with two tool ports `[TaskToolsPort, UserToolsPort]` merges tools from both into `AgentService.tools`  | unit |
| 9   | Tool name collision across two tool ports (both defining `"createItem"`) throws descriptive error at construction    | unit |
| 10  | Error message for tool name collision includes both port names and the duplicate tool name                           | unit |
| 11  | Agent adapter with zero tool ports produces `AgentService.tools` as empty array                                      | unit |
| 12  | `AgentConfig.name` is stored on the resolved `AgentService.config.name`                                              | unit |
| 13  | `AgentConfig.systemPrompt` is stored on the resolved `AgentService.config.systemPrompt`                              | unit |
| 14  | `AgentConfig.maxTurns` defaults when not provided (e.g., Infinity or a sensible default)                             | unit |
| 15  | `AgentConfig.temperature` is stored on the resolved `AgentService.config.temperature`                                | unit |
| 16  | `AgentConfig.toolChoice` defaults to `"auto"` when not provided                                                      | unit |
| 17  | Agent adapter requires exactly one `LlmService` port; missing `LlmPort` in requires causes graph build error         | unit |
| 18  | Agent adapter requires exactly one `ContextService` port; missing `ContextPort` in requires causes graph build error | unit |

### Type-Level Tests — `agent-adapters.test-d.ts`

| #   | Test                                                                                                      | Type |
| --- | --------------------------------------------------------------------------------------------------------- | ---- |
| 1   | `createAgentAdapter` infers `TProvides` from the `provides` port argument                                 | type |
| 2   | Adapter `requires` type includes `LlmPort`, `ContextPort`, and tool ports                                 | type |
| 3   | Adapter lifetime is `"scoped"`                                                                            | type |
| 4   | `AgentConfig` type includes optional `systemPrompt`, `maxTurns`, `maxTokens`, `temperature`, `toolChoice` | type |
| 5   | `AgentConfig.toolChoice` is typed as `ToolChoice` (`"auto" \| "none" \| "required" \| { tool: string }`)  | type |
| 6   | Port providing non-`AgentService` type produces compile-time error                                        | type |

### Integration Tests — `integration/agent-adapters.test.ts`

| #   | Test                                                                                                           | Type        |
| --- | -------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | GraphBuilder validates all required ports present when agent adapter registered                                | integration |
| 2   | GraphBuilder rejects graph with missing LlmPort dependency for agent adapter                                   | integration |
| 3   | Captive dependency detection: singleton tool port with scoped context port raises no error (correct lifetimes) | integration |
| 4   | Agent adapter resolution produces functional `AgentService` with tools, context, and llm                       | integration |

### Mutation Testing

**Target: >90% mutation score.** Tool flattening from multiple ports, name collision detection, config propagation, and required port validation are critical -- mutations to merge logic or validation checks must be caught.

---

## DoD 5: LLM Adapters (Spec Section 11)

### Unit Tests — `llm-adapters.test.ts`

| #   | Test                                                                                                           | Type |
| --- | -------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | `createOpenAiAdapter({ model: "gpt-4o" })` returns an adapter providing `LlmPort`                              | unit |
| 2   | `createOpenAiAdapter()` defaults model to `"gpt-4o"` when not specified                                        | unit |
| 3   | `createOpenAiAdapter()` defaults apiKey from `OPENAI_API_KEY` environment variable                             | unit |
| 4   | OpenAI adapter `generateText()` translates `Message[]` to `ChatCompletionMessageParam[]` and returns `Message` | unit |
| 5   | OpenAI adapter `streamText()` returns `StreamResult` with `stream` and `response`                              | unit |
| 6   | `createAnthropicAdapter({ model: "claude-sonnet-4-20250514" })` returns an adapter providing `LlmPort`         | unit |
| 7   | `createAnthropicAdapter()` defaults model to `"claude-sonnet-4-20250514"` when not specified                   | unit |
| 8   | `createAnthropicAdapter()` defaults apiKey from `ANTHROPIC_API_KEY` environment variable                       | unit |
| 9   | Anthropic adapter handles tool use block format (Anthropic's distinct tool calling format)                     | unit |
| 10  | `createVercelAiAdapter({ model })` returns an adapter providing `LlmPort`                                      | unit |
| 11  | Vercel AI adapter `generateText()` delegates to Vercel AI SDK `generateText` function                          | unit |
| 12  | Vercel AI adapter `streamText()` delegates to Vercel AI SDK `streamText` function                              | unit |
| 13  | All three adapters have `"singleton"` lifetime                                                                 | unit |
| 14  | All three adapters have `never` as requires (no dependencies)                                                  | unit |
| 15  | OpenAI adapter translates `ToolCall` to OpenAI function call format                                            | unit |
| 16  | Anthropic adapter translates `ToolCall` to Anthropic tool use format                                           | unit |
| 17  | OpenAI adapter translates `StreamChunk` from OpenAI `ChatCompletionChunk` format                               | unit |
| 18  | All adapters forward `maxTokens`, `temperature`, and `stopSequences` options                                   | unit |
| 19  | All adapters forward `tools` as JSON Schema array and `toolChoice` option                                      | unit |
| 20  | OpenAI adapter accepts `baseUrl` for Azure OpenAI or proxy endpoints                                           | unit |

### Type-Level Tests — `llm-adapters.test-d.ts`

| #   | Test                                                                                                          | Type |
| --- | ------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | `createOpenAiAdapter` return type is `Adapter<typeof LlmPort, never, "singleton">`                            | type |
| 2   | `createAnthropicAdapter` return type is `Adapter<typeof LlmPort, never, "singleton">`                         | type |
| 3   | `createVercelAiAdapter` return type is `Adapter<typeof LlmPort, never, "singleton">`                          | type |
| 4   | `createVercelAiAdapter` config `model` is typed as `LanguageModel` from `ai` package                          | type |
| 5   | `GenerateTextOptions.messages` is `readonly Message[]`                                                        | type |
| 6   | `StreamTextOptions` extends `GenerateTextOptions` with additional `onChunk` callback                          | type |
| 7   | `StreamResult.stream` is `AsyncIterable<StreamChunk>`                                                         | type |
| 8   | `StreamResult.response` is `Promise<Message>`                                                                 | type |
| 9   | `StreamChunk.type` is `"text-delta" \| "tool-call-start" \| "tool-call-delta" \| "tool-call-end" \| "finish"` | type |
| 10  | `FinishReason` is `"stop" \| "tool-calls" \| "length" \| "error"`                                             | type |

### Mutation Testing

**Target: >90% mutation score.** Message format translation between providers, option forwarding, and stream chunk mapping are critical -- mutations to translation logic or option propagation must be caught.

---

## DoD 6: Context Adapters (Spec Section 12)

### Unit Tests — `context-adapters.test.ts`

| #   | Test                                                                                                                           | Type |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | ---- |
| 1   | `createContextAdapter({ requires, entries })` returns an adapter providing `ContextPort`                                       | unit |
| 2   | Adapter `requires` includes all ports passed in the `requires` array                                                           | unit |
| 3   | Adapter lifetime is `"scoped"`                                                                                                 | unit |
| 4   | `entries` factory receives resolved dependencies keyed by port name                                                            | unit |
| 5   | `entries` factory returning 3 entries produces a `ContextService` with 3 entries from `getAll()`                               | unit |
| 6   | `ContextService.get("currentUser")` returns the entry with name `"currentUser"`                                                | unit |
| 7   | `ContextService.get("nonExistent")` returns `undefined`                                                                        | unit |
| 8   | `ContextService.toSystemPrompt()` serializes entries as `<context><entry name="..." description="...">value</entry></context>` | unit |
| 9   | `toSystemPrompt()` serializes object values via `JSON.stringify`                                                               | unit |
| 10  | `toSystemPrompt()` serializes string values directly (not double-quoted)                                                       | unit |
| 11  | `toSystemPrompt()` serializes number values as their string representation                                                     | unit |
| 12  | `toSystemPrompt()` with zero entries returns empty `<context></context>` or empty string                                       | unit |
| 13  | Context adapter with `requires: [CurrentUserPort, ProjectPort]` receives both `deps.CurrentUser` and `deps.Project`            | unit |
| 14  | Context adapter is scoped: each scope gets fresh context from the `entries` factory                                            | unit |
| 15  | Context adapter with computed values (e.g., `new Date().toISOString()`) produces fresh timestamp per scope                     | unit |
| 16  | Context adapter with `requires: []` creates entries without dependencies                                                       | unit |
| 17  | `entries` factory returning empty array produces a `ContextService` with 0 entries                                             | unit |

### Type-Level Tests — `context-adapters.test-d.ts`

| #   | Test                                                                                   | Type |
| --- | -------------------------------------------------------------------------------------- | ---- |
| 1   | `createContextAdapter` infers `TRequires` from the `requires` tuple argument           | type |
| 2   | `entries` factory parameter `deps` is typed as `ResolvedDeps<TupleToUnion<TRequires>>` | type |
| 3   | Adapter return type provides `typeof ContextPort`                                      | type |
| 4   | Adapter lifetime is `"scoped"`                                                         | type |
| 5   | `entries` factory return type must satisfy `readonly ContextEntry[]`                   | type |
| 6   | `ContextEntry` generic params `TName` and `TValue` constrain `name` and `value` fields | type |

### Mutation Testing

**Target: >90% mutation score.** Entry serialization to XML format, `get()` name matching, and dependency resolution are critical -- mutations to serialization templates, name comparison, or entry lookup must be caught.

---

## DoD 7: Agent Runner (Spec Section 13)

### Unit Tests — `agent-runner.test.ts`

| #   | Test                                                                                                            | Type |
| --- | --------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | `run({ prompt: "hello" })` returns an `AgentRun` with `result: Promise<AgentRunResult>` and `abort: () => void` | unit |
| 2   | `runStream({ prompt: "hello" })` returns an `AgentStreamRun` with `events: AsyncIterable<AgentEvent>`           | unit |
| 3   | `run()` result resolves to `AgentRunResult` with `messages`, `lastMessage`, `turnCount`, and `tokenUsage`       | unit |
| 4   | Single-turn run (LLM returns text with no tool calls) completes in 1 turn                                       | unit |
| 5   | Two-turn run (LLM calls tool, then responds with text) completes in 2 turns                                     | unit |
| 6   | Three-turn run (LLM calls tool, calls another tool, then responds) completes in 3 turns                         | unit |
| 7   | `result.lastMessage` is the final assistant message with text content                                           | unit |
| 8   | `result.messages` includes all messages: user prompt, assistant responses, and tool results                     | unit |
| 9   | `result.turnCount` matches the number of LLM generate calls made                                                | unit |
| 10  | `result.tokenUsage` aggregates `prompt`, `completion`, and `total` across all turns                             | unit |
| 11  | `maxTurns: 3` stops execution after 3 turns even if LLM keeps calling tools                                     | unit |
| 12  | `maxTurns: 1` limits to a single LLM call                                                                       | unit |
| 13  | Abort via `run.abort()` cancels in-flight LLM request                                                           | unit |
| 14  | Abort via `AbortSignal` passed in `RunOptions.signal` cancels execution                                         | unit |
| 15  | Aborted run emits `run-error` event with `AbortError`                                                           | unit |
| 16  | Aborted run rejects the `result` promise with `AbortError`                                                      | unit |
| 17  | System prompt includes `agent.config.systemPrompt` prepended with `agent.context.toSystemPrompt()` output       | unit |
| 18  | User prompt is appended to `messages` array as `{ role: "user", content: prompt }`                              | unit |
| 19  | Conversation history from `RunOptions.messages` is preserved, with new prompt appended                          | unit |
| 20  | Tool call with invalid JSON arguments (Zod parse failure) returns `ToolResult` with `isError: true`             | unit |
| 21  | Tool call with valid arguments calls `execute` and returns `ToolResult` with `isError: false`                   | unit |
| 22  | Multiple tool calls in single LLM response are all executed (parallel by default)                               | unit |
| 23  | Multiple tool calls with `parallelToolCalls: false` are executed sequentially in order                          | unit |
| 24  | Tool results are appended to messages and sent in next LLM turn                                                 | unit |
| 25  | Runner passes `toolChoice`, `maxTokens`, `temperature` from `AgentConfig` to `LlmService.generateText()`        | unit |

### Type-Level Tests — `agent-runner.test-d.ts`

| #   | Test                                                                                                                 | Type |
| --- | -------------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | `AgentRun.result` is typed as `Promise<AgentRunResult>`                                                              | type |
| 2   | `AgentRun.abort` is typed as `() => void`                                                                            | type |
| 3   | `AgentStreamRun` extends `AgentRun` with `events: AsyncIterable<AgentEvent>`                                         | type |
| 4   | `AgentRunResult.messages` is `readonly Message[]`                                                                    | type |
| 5   | `AgentRunResult.lastMessage` is `Message`                                                                            | type |
| 6   | `AgentRunResult.tokenUsage` is `TokenUsage` with `prompt`, `completion`, `total` as `number`                         | type |
| 7   | `RunOptions.prompt` is `string` (required)                                                                           | type |
| 8   | `RunOptions.messages` is `readonly Message[]` (optional)                                                             | type |
| 9   | `RunOptions.signal` is `AbortSignal` (optional)                                                                      | type |
| 10  | `RunOptions.onEvent` is `(event: AgentEvent) => void` (optional)                                                     | type |
| 11  | `createAgentRunnerAdapter` return type is `Adapter<typeof AgentRunnerPort, TAgent \| typeof ApprovalPort, "scoped">` | type |

### Integration Tests — `integration/agent-runner.test.ts`

| #   | Test                                                                                    | Type        |
| --- | --------------------------------------------------------------------------------------- | ----------- |
| 1   | Runner resolves from container and executes single-turn agent run                       | integration |
| 2   | Runner resolves from scoped container and executes multi-turn agent run with tool calls | integration |
| 3   | Scope disposal while agent running triggers abort and rejects result                    | integration |
| 4   | Runner with real container, mock LLM, and real tool adapters executes full loop         | integration |

### E2E Tests — `e2e/agent-runner.test.ts`

| #   | Test                                                                                      | Type |
| --- | ----------------------------------------------------------------------------------------- | ---- |
| 1   | Full agent run: prompt -> tool call -> tool result -> text response                       | e2e  |
| 2   | Multi-turn agent: prompt -> 2 tool calls -> final text response                           | e2e  |
| 3   | Agent with maxTurns: execution stops at turn limit                                        | e2e  |
| 4   | Agent with abort: mid-execution abort cancels and returns error                           | e2e  |
| 5   | Agent with approval: approved tool call executes, rejected tool call returns error to LLM | e2e  |

### Mutation Testing

**Target: >90% mutation score.** Turn-based loop control, maxTurns enforcement, abort propagation, tool execution and result accumulation, and message array construction are critical -- mutations to loop conditions, abort checks, or message ordering must be caught.

---

## DoD 8: Error Handling (AgentError)

### Unit Tests — `error-handling.test.ts`

| #   | Test                                                                                               | Type |
| --- | -------------------------------------------------------------------------------------------------- | ---- |
| 1   | `ToolValidationError` has `_tag: "ToolValidationError"` and carries Zod parse error                | unit |
| 2   | `ToolExecutionError` has `_tag: "ToolExecutionError"` and carries original thrown error as `cause` | unit |
| 3   | `LlmError` has `_tag: "LlmError"` and carries provider-specific error as `cause`                   | unit |
| 4   | `ApprovalTimeoutError` has `_tag: "ApprovalTimeoutError"` and carries `timeoutMs` field            | unit |
| 5   | `ApprovalRejectedError` has `_tag: "ApprovalRejectedError"` and carries `callId` and `toolName`    | unit |
| 6   | `MaxTurnsExceededError` has `_tag: "MaxTurnsExceededError"` and carries `maxTurns` and `turnCount` | unit |
| 7   | `AbortError` has `_tag: "AbortError"`                                                              | unit |
| 8   | `AgentConfigError` has `_tag: "AgentConfigError"` and carries descriptive `message`                | unit |
| 9   | All 8 error variants include `agentName` field                                                     | unit |
| 10  | All error variants include `runId` field (where applicable)                                        | unit |
| 11  | `ToolValidationError` includes `toolName` and `arguments` fields                                   | unit |
| 12  | `ToolExecutionError` includes `toolName` and `callId` fields                                       | unit |
| 13  | `AgentError` `_tag` discriminant enables `switch`/`case` exhaustive handling                       | unit |
| 14  | `run()` returns `Promise<AgentRunResult>` and never throws -- errors are caught and wrapped        | unit |
| 15  | LLM API failure during `generateText` produces `LlmError`                                          | unit |
| 16  | LLM API failure during `streamText` produces `LlmError`                                            | unit |
| 17  | Tool Zod validation failure produces `ToolValidationError` with Zod issue details                  | unit |
| 18  | Tool `execute` throwing produces `ToolExecutionError` wrapping the original error                  | unit |
| 19  | Approval timeout produces `ApprovalTimeoutError` with configured timeout duration                  | unit |
| 20  | Exceeding `maxTurns` produces `MaxTurnsExceededError` with final partial result                    | unit |

### Type-Level Tests — `error-handling.test-d.ts`

| #   | Test                                                                                       | Type |
| --- | ------------------------------------------------------------------------------------------ | ---- |
| 1   | `AgentError` is a tagged union of 8 variants                                               | type |
| 2   | Each variant narrows correctly via `_tag` discriminant in `switch` statement               | type |
| 3   | `ToolValidationError` has `toolName: string` and `cause: ZodError` fields                  | type |
| 4   | `ToolExecutionError` has `toolName: string`, `callId: string`, and `cause: unknown` fields | type |
| 5   | `LlmError` has `cause: unknown` field                                                      | type |
| 6   | `ApprovalTimeoutError` has `timeoutMs: number` field                                       | type |
| 7   | `MaxTurnsExceededError` has `maxTurns: number` and `turnCount: number` fields              | type |
| 8   | `AbortError` has no additional fields beyond `AgentErrorBase`                              | type |
| 9   | `AgentErrorBase` includes `_tag: string`, `agentName: string`, `message: string`           | type |
| 10  | `AgentConfigError` has `message: string` describing the config issue                       | type |

### Mutation Testing

**Target: >95% mutation score.** Error variant discriminants, cause chain population, timeout value propagation, and error field assignments are critical -- mutations to `_tag` values, conditional branches, or error construction must be caught.

---

## DoD 9: HITL Approval (Spec Section 14)

### Unit Tests — `approval.test.ts`

| #   | Test                                                                                                       | Type |
| --- | ---------------------------------------------------------------------------------------------------------- | ---- |
| 1   | `ApprovalPolicy "none"` never triggers approval for any tool call                                          | unit |
| 2   | `ApprovalPolicy "all"` triggers approval for every tool call                                               | unit |
| 3   | `ApprovalPolicy { tools: ["deleteTask"] }` triggers approval only for `"deleteTask"` calls                 | unit |
| 4   | `ApprovalPolicy { tools: ["deleteTask"] }` does not trigger approval for `"createTask"` calls              | unit |
| 5   | `ApprovalPolicy` as sync predicate `(tc) => tc.name.startsWith("delete")` triggers for matching calls      | unit |
| 6   | `ApprovalPolicy` as async predicate `async (tc) => checkPermission(tc)` triggers based on resolved boolean | unit |
| 7   | `ApprovalService.requestApproval(request)` returns `true` when approved                                    | unit |
| 8   | `ApprovalService.requestApproval(request)` returns `false` when rejected                                   | unit |
| 9   | Rejected tool call returns `ToolResult` with `isError: true` and `"Tool call rejected by user"` message    | unit |
| 10  | `createCallbackApprovalAdapter()` returns adapter providing `ApprovalPort`                                 | unit |
| 11  | Callback adapter `pending` property holds the current `ApprovalRequest` while waiting                      | unit |
| 12  | Callback adapter `approve()` resolves the pending request with `true`                                      | unit |
| 13  | Callback adapter `reject()` resolves the pending request with `false`                                      | unit |
| 14  | Callback adapter with `timeout: 5000` rejects with timeout error after 5000ms                              | unit |
| 15  | Callback adapter with `timeout: 5000, defaultDecision: true` approves after timeout                        | unit |
| 16  | Callback adapter with `timeout: 5000, defaultDecision: false` rejects after timeout                        | unit |
| 17  | `createAutoApprovalAdapter(true)` always approves without user interaction                                 | unit |
| 18  | `createAutoApprovalAdapter(false)` always rejects without user interaction                                 | unit |
| 19  | `createAutoApprovalAdapter()` defaults to `true` (auto-approve)                                            | unit |
| 20  | Auto-approval adapter has `"singleton"` lifetime                                                           | unit |
| 21  | Callback approval adapter has `"scoped"` lifetime                                                          | unit |
| 22  | Approval events emitted: `"approval-requested"` before waiting, `"approval-resolved"` after decision       | unit |

### Type-Level Tests — `approval.test-d.ts`

| #   | Test                                                                                                                                         | Type |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | `ApprovalPolicy` is `"none" \| "all" \| { tools: readonly string[] } \| ((tc: ToolCall) => boolean) \| ((tc: ToolCall) => Promise<boolean>)` | type |
| 2   | `ApprovalRequest` has `callId: string`, `toolName: string`, `arguments: unknown`, `description: string`                                      | type |
| 3   | `ApprovalService.requestApproval` returns `Promise<boolean>`                                                                                 | type |
| 4   | `createCallbackApprovalAdapter` return type includes `pending`, `approve`, `reject` members                                                  | type |
| 5   | `createAutoApprovalAdapter` return type is `Adapter<typeof ApprovalPort, never, "singleton">`                                                | type |

### Mutation Testing

**Target: >95% mutation score.** Policy evaluation logic (none/all/tools/predicate), timeout behavior, default decision fallback, and event emission are critical -- mutations to policy matching, timeout conditions, or event ordering must be caught.

---

## DoD 10: Streaming & Events (Spec Section 15)

### Unit Tests — `streaming-events.test.ts`

| #   | Test                                                                                               | Type |
| --- | -------------------------------------------------------------------------------------------------- | ---- |
| 1   | `run-started` event emitted first with `runId` and `agentName`                                     | unit |
| 2   | `turn-started` event emitted before each LLM call with `turnNumber` starting at 1                  | unit |
| 3   | `text-delta` events emitted during streaming with `delta` string fragments                         | unit |
| 4   | `text-complete` event emitted after streaming finishes with full assembled `text`                  | unit |
| 5   | `tool-call-started` event emitted before tool execution with `callId`, `toolName`, and `arguments` | unit |
| 6   | `tool-call-result` event emitted after tool execution with `callId`, `result`, and `isError`       | unit |
| 7   | `approval-requested` event emitted when approval required with `callId`, `toolName`, `arguments`   | unit |
| 8   | `approval-resolved` event emitted after approval decision with `callId` and `approved` boolean     | unit |
| 9   | `turn-complete` event emitted after each turn with `turnNumber`                                    | unit |
| 10  | `run-complete` event emitted last (on success) with `runId` and `result: AgentRunResult`           | unit |
| 11  | `run-error` event emitted last (on failure) with `runId` and `error: Error`                        | unit |
| 12  | Event ordering: `run-started` is always the first event                                            | unit |
| 13  | Event ordering: `run-complete` or `run-error` is always the last event                             | unit |
| 14  | Event ordering: `turn-started` always precedes corresponding `turn-complete`                       | unit |
| 15  | Event ordering: `tool-call-started` always precedes corresponding `tool-call-result`               | unit |
| 16  | Event ordering: `approval-requested` always precedes corresponding `approval-resolved`             | unit |
| 17  | AG-UI mapping: `run-started` maps to `RUN_STARTED`                                                 | unit |
| 18  | AG-UI mapping: `text-delta` maps to `TEXT_MESSAGE_CONTENT`                                         | unit |
| 19  | AG-UI mapping: `text-complete` maps to `TEXT_MESSAGE_END`                                          | unit |
| 20  | AG-UI mapping: `tool-call-started` maps to `TOOL_CALL_START`                                       | unit |
| 21  | AG-UI mapping: `tool-call-result` maps to `TOOL_CALL_END`                                          | unit |
| 22  | AG-UI mapping: `run-complete` maps to `RUN_FINISHED`                                               | unit |
| 23  | AG-UI mapping: `run-error` maps to `RUN_ERROR`                                                     | unit |
| 24  | `agentEventsToSse()` serializes each event as `event: <type>\ndata: <json>\n\n`                    | unit |
| 25  | `agentEventsToSse()` produces a `ReadableStream<Uint8Array>`                                       | unit |
| 26  | `filterEvents(events, "text-delta")` yields only `TextDeltaEvent` objects                          | unit |
| 27  | `filterEvents(events, "text-delta", "text-complete")` yields both text event types                 | unit |
| 28  | `filterEvents` return type narrows to `AsyncIterable<Extract<AgentEvent, { type: T }>>`            | unit |
| 29  | `collectEvents(events)` returns `Promise<readonly AgentEvent[]>` with all events in order          | unit |
| 30  | `collectEvents` on an empty stream returns empty array                                             | unit |

### Type-Level Tests — `streaming-events.test-d.ts`

| #   | Test                                                                                                                | Type |
| --- | ------------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | `AgentEvent` is a discriminated union of 11 variants on `type` field                                                | type |
| 2   | `RunStartedEvent.type` is `"run-started"` (literal)                                                                 | type |
| 3   | `TextDeltaEvent.type` is `"text-delta"` and has `delta: string`                                                     | type |
| 4   | `ToolCallStartedEvent.type` is `"tool-call-started"` and has `callId`, `toolName`, `arguments`                      | type |
| 5   | `RunCompleteEvent.result` is typed as `AgentRunResult`                                                              | type |
| 6   | `RunErrorEvent.error` is typed as `Error`                                                                           | type |
| 7   | `filterEvents<"text-delta">` return type is `AsyncIterable<TextDeltaEvent>`                                         | type |
| 8   | `filterEvents<"text-delta" \| "text-complete">` return type is `AsyncIterable<TextDeltaEvent \| TextCompleteEvent>` | type |
| 9   | `agentEventsToSse` return type is `ReadableStream<Uint8Array>`                                                      | type |
| 10  | `collectEvents` return type is `Promise<readonly AgentEvent[]>`                                                     | type |

### Mutation Testing

**Target: >95% mutation score.** Event emission ordering, AG-UI mapping correctness, SSE serialization format, and `filterEvents` type narrowing are critical -- mutations to event sequencing, mapping tables, serialization templates, or filter predicates must be caught.

---

## DoD 11: Testing Utilities (`@hex-di/agent-testing`)

### Unit Tests — `libs/agent/testing/tests/testing-utilities.test.ts`

| #   | Test                                                                                           | Type |
| --- | ---------------------------------------------------------------------------------------------- | ---- |
| 1   | `createMockLlmAdapter({ responses: [msg1, msg2] })` returns adapter providing `LlmPort`        | unit |
| 2   | Mock LLM in array mode returns `msg1` on first `generateText()` call, `msg2` on second         | unit |
| 3   | Mock LLM in array mode exhausting all responses throws descriptive error on next call          | unit |
| 4   | Mock LLM in function mode calls the function with current `messages` array and returns result  | unit |
| 5   | Mock LLM in function mode called multiple times receives updated messages each time            | unit |
| 6   | `createMockStreamLlmAdapter({ chunks: [c1, c2, c3] })` returns adapter providing `LlmPort`     | unit |
| 7   | Mock stream LLM in array mode yields chunks in order via `streamText().stream`                 | unit |
| 8   | Mock stream LLM `response` promise resolves to assembled `Message` from chunks                 | unit |
| 9   | Mock stream LLM in function mode calls the function and returns the async iterable             | unit |
| 10  | `createToolCallRecorder()` returns a `ToolCallRecorder` with empty `calls` array               | unit |
| 11  | Recorder `wrap(execute)` returns a function that records calls and delegates to `execute`      | unit |
| 12  | Recorder `calls` includes `toolName`, `arguments`, `result`, `isError`, and `timestamp`        | unit |
| 13  | Recorder `getCallsForTool("createTask")` returns only calls for `"createTask"`                 | unit |
| 14  | Recorder `assertCalled("createTask", 1)` passes when called exactly once                       | unit |
| 15  | Recorder `assertCalled("createTask", 2)` fails when called only once                           | unit |
| 16  | Recorder `assertCalledWith("createTask", { title: "Buy milk" })` passes on deep equality match | unit |
| 17  | Recorder `assertCalledWith("createTask", { title: "wrong" })` fails with descriptive message   | unit |
| 18  | Recorder `assertNotCalled("deleteTask")` passes when never called                              | unit |
| 19  | Recorder `assertNotCalled("createTask")` fails when called at least once                       | unit |
| 20  | Recorder `clear()` resets `calls` to empty array                                               | unit |
| 21  | `createTestAgent({ tools, responses })` returns `{ container, runner, recorder }`              | unit |
| 22  | `createTestAgent` runner executes full agent loop with mock LLM and recorded tools             | unit |
| 23  | `createTestAgent` with `context` entries makes them available via `ContextPort`                | unit |
| 24  | `createTestAgent` with `approval: "all"` enables auto-approval by default                      | unit |
| 25  | `createAutoApprovalAdapter(true)` always returns `true` from `requestApproval()`               | unit |
| 26  | `createAutoApprovalAdapter(false)` always returns `false` from `requestApproval()`             | unit |

### Integration Tests — `libs/agent/testing/tests/integration/testing-utilities.test.ts`

| #   | Test                                                                                                             | Type        |
| --- | ---------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | `createTestAgent` with tool calls: mock LLM calls tool, tool executes, recorder records, final response returned | integration |
| 2   | `createTestAgent` with multi-turn conversation: recorder captures all tool calls across turns                    | integration |
| 3   | `createTestAgent` with approval rejection: tool not executed, recorder shows no calls                            | integration |

### Mutation Testing

**Target: >90% mutation score.** Mock response sequencing, recorder assertion logic (count matching, deep equality), wrapper delegation, and auto-approval behavior are critical -- mutations to sequence indexing, assertion comparisons, or delegation calls must be caught.

---

## DoD 12: React Integration (`@hex-di/agent-react`)

### Unit Tests — `libs/agent/react/tests/use-agent-chat.test.tsx`

| #   | Test                                                                                                     | Type |
| --- | -------------------------------------------------------------------------------------------------------- | ---- |
| 1   | `useAgentChat(runnerPort)` returns initial state: `messages` empty, `isRunning` false, `error` undefined | unit |
| 2   | `send("hello")` transitions `isRunning` to `true`                                                        | unit |
| 3   | After successful run, `isRunning` transitions back to `false`                                            | unit |
| 4   | After successful run, `messages` includes user message and assistant response                            | unit |
| 5   | After failed run, `error` is set to the error object                                                     | unit |
| 6   | `abort()` cancels current run and sets `isRunning` to `false`                                            | unit |
| 7   | `reset()` clears `messages`, `error`, and sets `isRunning` to `false`                                    | unit |
| 8   | `send()` while `isRunning` is `true` throws or is ignored                                                | unit |
| 9   | Component unmount during active run triggers cleanup (abort)                                             | unit |
| 10  | `messages` updates reactively as the agent streams responses                                             | unit |

### Unit Tests — `libs/agent/react/tests/use-agent-stream.test.tsx`

| #   | Test                                                                                                           | Type |
| --- | -------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | `useAgentStream(runnerPort)` returns initial state: `events` empty, `isStreaming` false, `lastEvent` undefined | unit |
| 2   | `run({ prompt: "hello" })` transitions `isStreaming` to `true`                                                 | unit |
| 3   | `events` accumulates all `AgentEvent` objects as they are emitted                                              | unit |
| 4   | `lastEvent` is the most recently emitted event                                                                 | unit |
| 5   | `abort()` stops streaming and sets `isStreaming` to `false`                                                    | unit |
| 6   | `clear()` resets `events` to empty and `lastEvent` to `undefined`                                              | unit |
| 7   | After run completes, `isStreaming` transitions to `false`                                                      | unit |

### Unit Tests — `libs/agent/react/tests/use-approval.test.tsx`

| #   | Test                                                                                | Type |
| --- | ----------------------------------------------------------------------------------- | ---- |
| 1   | `useApproval(approvalPort)` returns `pending` as `undefined` when no request active | unit |
| 2   | When approval requested, `pending` holds the `ApprovalRequest` object               | unit |
| 3   | `approve()` resolves the pending request and clears `pending`                       | unit |
| 4   | `reject()` resolves the pending request (with rejection) and clears `pending`       | unit |

### Unit Tests — `libs/agent/react/tests/use-agent-tool.test.tsx`

| #   | Test                                                                                  | Type |
| --- | ------------------------------------------------------------------------------------- | ---- |
| 1   | `useAgentTool(toolPort, toolDef)` registers the tool in the current scope's tool port | unit |
| 2   | Registered tool is callable by the agent during execution                             | unit |
| 3   | Component unmount unregisters the tool                                                | unit |

### Unit Tests — `libs/agent/react/tests/use-agent-context.test.tsx`

| #   | Test                                                               | Type |
| --- | ------------------------------------------------------------------ | ---- |
| 1   | `useAgentContext(contextPort, entry)` registers the context entry  | unit |
| 2   | Context entry value updates trigger re-registration with new value | unit |
| 3   | Component unmount unregisters the context entry                    | unit |

### Unit Tests — `libs/agent/react/tests/agent-provider.test.tsx`

| #   | Test                                                                    | Type |
| --- | ----------------------------------------------------------------------- | ---- |
| 1   | `<AgentProvider container={container}>` renders children                | unit |
| 2   | Hooks inside `<AgentProvider>` can resolve ports from the container     | unit |
| 3   | Missing `<AgentProvider>` in tree produces descriptive error from hooks | unit |

### Type-Level Tests — `libs/agent/react/tests/use-agent-chat.test-d.ts`

| #   | Test                                                                                                                                                                                             | Type |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- |
| 1   | `useAgentChat` returns `{ messages: readonly Message[]; isRunning: boolean; error: Error \| undefined; send: (prompt: string) => void; abort: () => void; reset: () => void }`                   | type |
| 2   | `useAgentStream` returns `{ events: readonly AgentEvent[]; lastEvent: AgentEvent \| undefined; isStreaming: boolean; run: (options: RunOptions) => void; abort: () => void; clear: () => void }` | type |
| 3   | `useApproval` returns `{ pending: ApprovalRequest \| undefined; approve: () => void; reject: () => void }`                                                                                       | type |
| 4   | `useAgentTool` accepts `Port<ToolPortService<...>, string>` and `ToolDefinition`                                                                                                                 | type |
| 5   | `useAgentContext` accepts `Port<ContextService, string>` and `ContextEntry`                                                                                                                      | type |
| 6   | `AgentProvider` props include `container` and `children`                                                                                                                                         | type |

### Integration Tests — `libs/agent/react/tests/integration/react-integration.test.tsx`

| #   | Test                                                                                  | Type        |
| --- | ------------------------------------------------------------------------------------- | ----------- |
| 1   | `useAgentChat` resolves `AgentRunnerPort` from `<AgentProvider>` and executes a run   | integration |
| 2   | `useAgentStream` receives all events during a streamed agent run                      | integration |
| 3   | `useApproval` receives approval request and resolves it via `approve()`               | integration |
| 4   | Full flow: render chat -> send message -> tool call -> approval -> response displayed | integration |

### Mutation Testing

**Target: >90% mutation score.** Hook state transitions (isRunning, isStreaming), cleanup on unmount, event accumulation, and approval pending/resolve cycle are critical -- mutations to state assignments, cleanup logic, or event push ordering must be caught.

---

## DoD 13: AgentInspector (Vision Phase 3)

### Unit Tests — `agent-inspector.test.ts`

| #   | Test                                                                                            | Type |
| --- | ----------------------------------------------------------------------------------------------- | ---- |
| 1   | `AgentInspector.getAgentDefinitions()` returns all registered agent configurations              | unit |
| 2   | Agent definition info includes `name`, `systemPrompt`, `tools`, `maxTurns`, `toolChoice`        | unit |
| 3   | `AgentInspector.getActiveRuns()` returns only currently executing runs                          | unit |
| 4   | `AgentInspector.getActiveRuns()` excludes completed and errored runs                            | unit |
| 5   | `AgentInspector.getRunHistory(filters)` returns past run results                                | unit |
| 6   | `getRunHistory({ agentName: "TaskAgent" })` filters by agent name                               | unit |
| 7   | `AgentInspector.getRunTrace(runId)` returns full event trace for a specific run                 | unit |
| 8   | `getRunTrace(nonExistentId)` returns `null`                                                     | unit |
| 9   | `AgentInspector.getToolDefinitions()` returns all registered tool definitions with JSON schemas | unit |
| 10  | `AgentInspector.getPortDependencies(agentName)` returns dependency graph for the agent          | unit |
| 11  | Container `instrumentContainer(container, { tracer })` produces tracing spans per agent run     | unit |
| 12  | Parent span wraps the entire agent run with `agentName` and `runId` attributes                  | unit |
| 13  | Child span produced per tool call with `toolName`, `callId`, and `isError` attributes           | unit |
| 14  | Child span produced per LLM call with `turnNumber` and `model` attributes                       | unit |
| 15  | Error spans include `error.type` and `error.message` attributes                                 | unit |
| 16  | AgentInspector created lazily from container                                                    | unit |

### Integration Tests — `integration/agent-inspector.test.ts`

| #   | Test                                                                         | Type        |
| --- | ---------------------------------------------------------------------------- | ----------- |
| 1   | Inspector resolves from instrumented container and returns agent definitions | integration |
| 2   | Inspector captures run trace after execution completes                       | integration |
| 3   | Tracing spans emitted through distributed tracing bridge during agent run    | integration |

### Mutation Testing

**Target: >85% mutation score.** Query filtering, span attribute assignment, and active run tracking are critical -- mutations to filter predicates, attribute keys, or run state tracking must be caught.

---

## DoD 14: Multi-Agent Orchestration (Spec Section 19)

### Unit Tests — `multi-agent.test.ts`

| #   | Test                                                                                               | Type |
| --- | -------------------------------------------------------------------------------------------------- | ---- |
| 1   | Agent exposed as tool via `delegateToTaskAgent` calls `TaskRunner.run()` with the provided prompt  | unit |
| 2   | Delegation tool returns the specialist agent's `lastMessage.content` as tool result                | unit |
| 3   | Orchestrator with 3 delegation tools can invoke any specialist based on LLM response               | unit |
| 4   | Delegation tool failure (specialist agent error) wraps as `ToolResult` with `isError: true`        | unit |
| 5   | Parallel tool calls to multiple specialist agents execute concurrently                             | unit |
| 6   | Agent chaining: first agent's output feeds as input to second agent's prompt                       | unit |
| 7   | Agent chaining: conversation history from first agent can be carried forward via `messages` option | unit |
| 8   | Orchestrator respects `maxTurns` across the orchestration (not per-specialist)                     | unit |
| 9   | Abort signal propagates from orchestrator to specialist agent runs                                 | unit |
| 10  | Specialist agent error does not crash orchestrator -- error returned to LLM as tool error          | unit |

### E2E Tests — `e2e/multi-agent.test.ts`

| #   | Test                                                                                                                     | Type |
| --- | ------------------------------------------------------------------------------------------------------------------------ | ---- |
| 1   | Orchestrator delegates to task agent: prompt -> delegate tool call -> specialist runs -> result returned to orchestrator | e2e  |
| 2   | Orchestrator delegates to 2 specialists in sequence: first result informs second delegation                              | e2e  |
| 3   | Orchestrator delegates to 2 specialists in parallel: both run concurrently, results merged                               | e2e  |
| 4   | Agent chain: analysis agent -> specialist agent -> final response                                                        | e2e  |

### Mutation Testing

**Target: >85% mutation score.** Delegation tool wiring, abort signal propagation, and error wrapping across agent boundaries are critical -- mutations to delegation calls, signal forwarding, or cross-agent error handling must be caught.

---

## Test Count Summary

| Category          | @hex-di/agent | @hex-di/agent-react | @hex-di/agent-testing | Total    |
| ----------------- | ------------- | ------------------- | --------------------- | -------- |
| Unit tests        | ~213          | ~30                 | ~26                   | ~269     |
| Type-level tests  | ~87           | ~6                  | --                    | ~93      |
| Integration tests | ~14           | ~4                  | ~3                    | ~21      |
| E2E tests         | ~9            | --                  | --                    | ~9       |
| **Total**         | **~323**      | **~40**             | **~29**               | **~392** |

## Verification Checklist

Before marking the spec as "implemented," the following must all pass:

| Check                               | Command                                                                   | Expected   |
| ----------------------------------- | ------------------------------------------------------------------------- | ---------- |
| All unit tests pass                 | `pnpm --filter @hex-di/agent test`                                        | 0 failures |
| All type tests pass                 | `pnpm --filter @hex-di/agent test:types`                                  | 0 failures |
| All integration tests pass          | `pnpm --filter @hex-di/agent test -- --dir integration`                   | 0 failures |
| All e2e tests pass                  | `pnpm --filter @hex-di/agent test -- --dir e2e`                           | 0 failures |
| React unit tests pass               | `pnpm --filter @hex-di/agent-react test`                                  | 0 failures |
| React type tests pass               | `pnpm --filter @hex-di/agent-react test:types`                            | 0 failures |
| React integration tests pass        | `pnpm --filter @hex-di/agent-react test -- --dir integration`             | 0 failures |
| Testing package tests pass          | `pnpm --filter @hex-di/agent-testing test`                                | 0 failures |
| Typecheck passes (core)             | `pnpm --filter @hex-di/agent typecheck`                                   | 0 errors   |
| Typecheck passes (react)            | `pnpm --filter @hex-di/agent-react typecheck`                             | 0 errors   |
| Typecheck passes (testing)          | `pnpm --filter @hex-di/agent-testing typecheck`                           | 0 errors   |
| Lint passes (core)                  | `pnpm --filter @hex-di/agent lint`                                        | 0 errors   |
| Lint passes (react)                 | `pnpm --filter @hex-di/agent-react lint`                                  | 0 errors   |
| Lint passes (testing)               | `pnpm --filter @hex-di/agent-testing lint`                                | 0 errors   |
| No `any` types in core source       | `grep -r "any" libs/agent/core/src/`                                      | 0 matches  |
| No type casts in core source        | `grep -r " as " libs/agent/core/src/`                                     | 0 matches  |
| No eslint-disable in core source    | `grep -r "eslint-disable" libs/agent/core/src/`                           | 0 matches  |
| No `any` types in react source      | `grep -r "any" libs/agent/react/src/`                                     | 0 matches  |
| No type casts in react source       | `grep -r " as " libs/agent/react/src/`                                    | 0 matches  |
| No eslint-disable in react source   | `grep -r "eslint-disable" libs/agent/react/src/`                          | 0 matches  |
| No `any` types in testing source    | `grep -r "any" libs/agent/testing/src/`                                   | 0 matches  |
| No type casts in testing source     | `grep -r " as " libs/agent/testing/src/`                                  | 0 matches  |
| No eslint-disable in testing source | `grep -r "eslint-disable" libs/agent/testing/src/`                        | 0 matches  |
| Mutation score (tool definitions)   | `pnpm --filter @hex-di/agent stryker -- --mutate src/tools/**`            | >95%       |
| Mutation score (ports)              | `pnpm --filter @hex-di/agent stryker -- --mutate src/ports/**`            | >95%       |
| Mutation score (tool adapters)      | `pnpm --filter @hex-di/agent stryker -- --mutate src/adapters/tool/**`    | >90%       |
| Mutation score (agent adapters)     | `pnpm --filter @hex-di/agent stryker -- --mutate src/adapters/agent/**`   | >90%       |
| Mutation score (LLM adapters)       | `pnpm --filter @hex-di/agent stryker -- --mutate src/adapters/llm/**`     | >90%       |
| Mutation score (context adapters)   | `pnpm --filter @hex-di/agent stryker -- --mutate src/adapters/context/**` | >90%       |
| Mutation score (runner)             | `pnpm --filter @hex-di/agent stryker -- --mutate src/runner/**`           | >90%       |
| Mutation score (errors)             | `pnpm --filter @hex-di/agent stryker -- --mutate src/errors/**`           | >95%       |
| Mutation score (approval)           | `pnpm --filter @hex-di/agent stryker -- --mutate src/approval/**`         | >95%       |
| Mutation score (events)             | `pnpm --filter @hex-di/agent stryker -- --mutate src/events/**`           | >95%       |
| Mutation score (inspector)          | `pnpm --filter @hex-di/agent stryker -- --mutate src/inspector/**`        | >85%       |
| Mutation score (react hooks)        | `pnpm --filter @hex-di/agent-react stryker -- --mutate src/**`            | >90%       |

## Mutation Testing Strategy

### Why Mutation Testing Matters for @hex-di/agent

Agent systems have critical invariants around tool execution flow, approval gating, event ordering, and error propagation. A test suite that merely checks "agent runs" or "events emitted" would miss mutations like:

- Tool calls executed without approval when policy requires it
- Events emitted in wrong order (e.g., `tool-call-result` before `tool-call-started`)
- `maxTurns` check using `>` instead of `>=` allowing one extra turn
- Abort signal not propagating to in-flight LLM requests
- Tool name collision check using `===` on wrong field
- Context serialization omitting entry descriptions
- AG-UI event mapping using wrong target event type
- Mock LLM returning same response instead of advancing sequence index

Mutation testing catches these subtle behavioral inversions.

### Mutation Targets by Priority

| Priority | Module                                         | Target Score | Rationale                                                                                 |
| -------- | ---------------------------------------------- | ------------ | ----------------------------------------------------------------------------------------- |
| Critical | Tool definitions (defineTool, ToolPortService) | >95%         | Foundation of tool system. Wrong schema conversion = LLM receives wrong tool definitions. |
| Critical | Port definitions (LlmPort, ContextPort, etc.)  | >95%         | Port contracts are the boundary between domain and infrastructure.                        |
| Critical | Error handling (AgentError variants, \_tag)    | >95%         | Error discriminants and cause chains must be precise for exhaustive handling.             |
| Critical | Approval (policy evaluation, timeout)          | >95%         | Approval gating is a security boundary. Wrong evaluation = unauthorized tool execution.   |
| Critical | Events (ordering, AG-UI mapping, SSE)          | >95%         | Event ordering is the observable contract for consumers.                                  |
| High     | Agent runner (turn loop, abort, maxTurns)      | >90%         | Complex control flow with many subtle behavioral distinctions.                            |
| High     | LLM adapters (message translation)             | >90%         | Provider-specific translation must be accurate for correct tool calling.                  |
| High     | Context adapters (serialization, scoping)      | >90%         | Context accuracy affects agent reasoning quality.                                         |
| High     | Tool adapters (dep resolution, name check)     | >90%         | Integration boundary. Correct wiring is essential.                                        |
| High     | React hooks (state machine, cleanup)           | >90%         | UI state must accurately reflect agent execution state.                                   |
| Medium   | Inspector (queries, tracing)                   | >85%         | Observability layer. Important but not on critical path.                                  |
| Medium   | Multi-agent (delegation, chaining)             | >85%         | Pattern-level correctness. Validated through e2e scenarios.                               |

### Mutation Operators to Prioritize

- **Conditional boundary mutations**: `===` -> `!==`, `>` -> `>=` (catches policy evaluation and maxTurns logic)
- **Return value mutations**: `return true` -> `return false` (catches approval gating inversion)
- **Block removal**: Removing `if (policy === "all") ...` (catches approval policy skip)
- **Method call mutations**: `emit("run-started")` -> `emit("run-complete")` (catches event type swaps)
- **Array index mutations**: `responses[index++]` -> `responses[0]` (catches mock LLM sequence)
- **String literal mutations**: `"text-delta"` -> `"text-complete"` (catches event type discrimination)
- **Boolean mutations**: `isError: true` -> `isError: false` (catches tool error flag inversion)

---

_Previous: [10 - Appendices](./10-appendices.md)_

_End of Definition of Done_
