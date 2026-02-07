# 09 - API Reference

## 20. API Reference

### 20.1 `@hex-di/agent` Exports

#### Types

```typescript
// ── Message types ──────────────────────────────────────
export type MessageRole = "system" | "user" | "assistant" | "tool";

export interface Message {
  readonly role: MessageRole;
  readonly content: string;
  readonly toolCalls?: readonly ToolCall[];
  readonly toolResults?: readonly ToolResult[];
}

export interface ToolCall {
  readonly id: string;
  readonly name: string;
  readonly arguments: unknown;
}

export interface ToolResult {
  readonly callId: string;
  readonly result: unknown;
  readonly isError?: boolean;
}

// ── Tool types ─────────────────────────────────────────
export interface ToolDefinition<
  TName extends string = string,
  TParams extends z.ZodType = z.ZodType,
  TResult = unknown,
> {
  readonly name: TName;
  readonly description: string;
  readonly parameters: TParams;
  readonly execute: (params: z.infer<TParams>) => Promise<TResult>;
}

export interface ToolPortService<
  TTools extends readonly ToolDefinition[] = readonly ToolDefinition[],
> {
  readonly tools: TTools;
  getTool<TName extends TTools[number]["name"]>(
    name: TName
  ): Extract<TTools[number], { name: TName }>;
  toJsonSchema(): readonly ToolJsonSchema[];
}

export interface ToolJsonSchema {
  readonly type: "function";
  readonly function: {
    readonly name: string;
    readonly description: string;
    readonly parameters: JsonSchema;
  };
}

export type ToolChoice = "auto" | "none" | "required" | { readonly tool: string };

// ── Streaming types ────────────────────────────────────
export interface StreamChunk {
  readonly type: "text-delta" | "tool-call-start" | "tool-call-delta" | "tool-call-end" | "finish";
  readonly textDelta?: string;
  readonly toolCall?: Partial<ToolCall>;
  readonly finishReason?: FinishReason;
}

export type FinishReason = "stop" | "tool-calls" | "length" | "error";

export interface StreamResult {
  readonly stream: AsyncIterable<StreamChunk>;
  readonly response: Promise<Message>;
}

// ── LLM types ──────────────────────────────────────────
export interface LlmService {
  generateText(options: GenerateTextOptions): Promise<Message>;
  streamText(options: StreamTextOptions): StreamResult;
}

export interface GenerateTextOptions {
  readonly messages: readonly Message[];
  readonly tools?: readonly ToolJsonSchema[];
  readonly toolChoice?: ToolChoice;
  readonly maxTokens?: number;
  readonly temperature?: number;
  readonly stopSequences?: readonly string[];
}

export interface StreamTextOptions extends GenerateTextOptions {
  readonly onChunk?: (chunk: StreamChunk) => void;
}

// ── Context types ──────────────────────────────────────
export interface ContextEntry<TName extends string = string, TValue = unknown> {
  readonly name: TName;
  readonly description: string;
  readonly value: TValue;
}

export interface ContextService {
  getAll(): readonly ContextEntry[];
  get<TName extends string>(name: TName): ContextEntry<TName> | undefined;
  toSystemPrompt(): string;
}

// ── Agent types ────────────────────────────────────────
export interface AgentConfig {
  readonly name: string;
  readonly systemPrompt?: string;
  readonly maxTurns?: number;
  readonly maxTokens?: number;
  readonly temperature?: number;
  readonly toolChoice?: ToolChoice;
}

export interface AgentService {
  readonly config: AgentConfig;
  readonly tools: readonly ToolDefinition[];
  readonly context: ContextService;
  readonly llm: LlmService;
}

// ── Runner types ───────────────────────────────────────
export interface AgentRunnerService {
  run(options: RunOptions): AgentRun;
  runStream(options: RunOptions): AgentStreamRun;
}

export interface RunOptions {
  readonly prompt: string;
  readonly messages?: readonly Message[];
  readonly signal?: AbortSignal;
  readonly onEvent?: (event: AgentEvent) => void;
}

export interface AgentRun {
  readonly result: Promise<AgentRunResult>;
  readonly abort: () => void;
}

export interface AgentStreamRun extends AgentRun {
  readonly events: AsyncIterable<AgentEvent>;
}

export interface AgentRunResult {
  readonly messages: readonly Message[];
  readonly lastMessage: Message;
  readonly turnCount: number;
  readonly tokenUsage: TokenUsage;
}

export interface TokenUsage {
  readonly prompt: number;
  readonly completion: number;
  readonly total: number;
}

// ── Event types ────────────────────────────────────────
export type AgentEvent =
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

export interface RunStartedEvent {
  readonly type: "run-started";
  readonly runId: string;
  readonly agentName: string;
}
export interface TurnStartedEvent {
  readonly type: "turn-started";
  readonly turnNumber: number;
}
export interface TextDeltaEvent {
  readonly type: "text-delta";
  readonly delta: string;
}
export interface TextCompleteEvent {
  readonly type: "text-complete";
  readonly text: string;
}
export interface ToolCallStartedEvent {
  readonly type: "tool-call-started";
  readonly callId: string;
  readonly toolName: string;
  readonly arguments: unknown;
}
export interface ToolCallResultEvent {
  readonly type: "tool-call-result";
  readonly callId: string;
  readonly result: unknown;
  readonly isError: boolean;
}
export interface ApprovalRequestedEvent {
  readonly type: "approval-requested";
  readonly callId: string;
  readonly toolName: string;
  readonly arguments: unknown;
}
export interface ApprovalResolvedEvent {
  readonly type: "approval-resolved";
  readonly callId: string;
  readonly approved: boolean;
}
export interface TurnCompleteEvent {
  readonly type: "turn-complete";
  readonly turnNumber: number;
}
export interface RunCompleteEvent {
  readonly type: "run-complete";
  readonly runId: string;
  readonly result: AgentRunResult;
}
export interface RunErrorEvent {
  readonly type: "run-error";
  readonly runId: string;
  readonly error: Error;
}

// ── Approval types ─────────────────────────────────────
export type ApprovalPolicy =
  | "none"
  | "all"
  | { readonly tools: readonly string[] }
  | ((toolCall: ToolCall) => boolean)
  | ((toolCall: ToolCall) => Promise<boolean>);

export interface ApprovalRequest {
  readonly callId: string;
  readonly toolName: string;
  readonly arguments: unknown;
  readonly description: string;
}

export interface ApprovalService {
  requestApproval(request: ApprovalRequest): Promise<boolean>;
}
```

#### Ports

```typescript
export const LlmPort: DirectedPort<LlmService, "Llm", "outbound">;
export const ContextPort: DirectedPort<ContextService, "AgentContext", "inbound">;
export const ApprovalPort: DirectedPort<ApprovalService, "Approval", "inbound">;
export const AgentRunnerPort: DirectedPort<AgentRunnerService, "AgentRunner", "outbound">;
```

#### Functions

```typescript
// Tool definition
export function defineTool<TName extends string, TParams extends z.ZodType, TResult>(
  config: ToolDefinition<TName, TParams, TResult>,
): ToolDefinition<TName, TParams, TResult>;

// Adapter factories
export function createToolAdapter<
  TProvides extends Port<ToolPortService<TTools>, string>,
  TTools extends readonly ToolDefinition[],
  TRequires extends readonly Port<unknown, string>[],
>(config: {
  readonly provides: TProvides;
  readonly requires: TRequires;
  readonly tools: (deps: ResolvedDeps<TupleToUnion<TRequires>>) => TTools;
}): Adapter<TProvides, TupleToUnion<TRequires>, "singleton">;

export function createAgentAdapter<
  TProvides extends Port<AgentService, string>,
>(config: {
  readonly provides: TProvides;
  readonly requires: readonly Port<unknown, string>[];
  readonly config: AgentConfig;
}): Adapter<TProvides, /* inferred */, "scoped">;

export function createContextAdapter<
  TRequires extends readonly Port<unknown, string>[],
>(config: {
  readonly requires: TRequires;
  readonly entries: (deps: ResolvedDeps<TupleToUnion<TRequires>>) => readonly ContextEntry[];
}): Adapter<typeof ContextPort, TupleToUnion<TRequires>, "scoped">;

export function createAgentRunnerAdapter<
  TAgent extends Port<AgentService, string>,
>(config: {
  readonly agent: TAgent;
  readonly approval?: ApprovalPolicy;
  readonly parallelToolCalls?: boolean;
}): Adapter<typeof AgentRunnerPort, TAgent | typeof ApprovalPort, "scoped">;

// LLM adapters
export function createOpenAiAdapter(config: {
  readonly apiKey?: string;
  readonly model?: string;
  readonly baseUrl?: string;
  readonly organization?: string;
  readonly defaultMaxTokens?: number;
}): Adapter<typeof LlmPort, never, "singleton">;

export function createAnthropicAdapter(config: {
  readonly apiKey?: string;
  readonly model?: string;
  readonly maxTokens?: number;
  readonly defaultMaxTokens?: number;
}): Adapter<typeof LlmPort, never, "singleton">;

export function createVercelAiAdapter(config: {
  readonly model: LanguageModel;
}): Adapter<typeof LlmPort, never, "singleton">;

// Approval adapters
export function createCallbackApprovalAdapter(config?: {
  readonly timeout?: number;
  readonly defaultDecision?: boolean;
}): Adapter<typeof ApprovalPort, never, "scoped">;

// Utilities
export function agentEventsToSse(
  events: AsyncIterable<AgentEvent>,
): ReadableStream<Uint8Array>;

export function filterEvents<T extends AgentEvent["type"]>(
  events: AsyncIterable<AgentEvent>,
  ...types: readonly T[]
): AsyncIterable<Extract<AgentEvent, { type: T }>>;

export function collectEvents(
  events: AsyncIterable<AgentEvent>,
): Promise<readonly AgentEvent[]>;
```

---

### 20.2 `@hex-di/agent-react` Exports

```typescript
// Hooks
export function useAgentChat(runnerPort: Port<AgentRunnerService, string>): {
  readonly messages: readonly Message[];
  readonly isRunning: boolean;
  readonly error: Error | undefined;
  send: (prompt: string) => void;
  abort: () => void;
  reset: () => void;
};

export function useAgentStream(runnerPort: Port<AgentRunnerService, string>): {
  readonly events: readonly AgentEvent[];
  readonly lastEvent: AgentEvent | undefined;
  readonly isStreaming: boolean;
  run: (options: RunOptions) => void;
  abort: () => void;
  clear: () => void;
};

export function useApproval(approvalPort: Port<ApprovalService, string>): {
  readonly pending: ApprovalRequest | undefined;
  approve: () => void;
  reject: () => void;
};

export function useAgentTool<TParams extends z.ZodType, TResult>(
  toolPort: Port<ToolPortService<readonly ToolDefinition[]>, string>,
  tool: ToolDefinition<string, TParams, TResult>
): void;

export function useAgentContext(
  contextPort: Port<ContextService, string>,
  entry: ContextEntry
): void;

// Components
export function AgentProvider(props: {
  readonly container: Container<unknown, unknown, unknown, "initialized">;
  readonly children: ReactNode;
}): ReactElement;
```

---

### 20.3 `@hex-di/agent-testing` Exports

```typescript
// Mock LLM adapters
export function createMockLlmAdapter(config: {
  readonly responses: readonly Message[] | ((messages: readonly Message[]) => Message);
}): Adapter<typeof LlmPort, never, "singleton">;

export function createMockStreamLlmAdapter(config: {
  readonly chunks:
    | readonly StreamChunk[]
    | ((messages: readonly Message[]) => AsyncIterable<StreamChunk>);
}): Adapter<typeof LlmPort, never, "singleton">;

// Tool call recording
export interface ToolCallRecorder {
  readonly calls: readonly RecordedToolCall[];
  getCallsForTool(name: string): readonly RecordedToolCall[];
  assertCalled(name: string, times?: number): void;
  assertCalledWith(name: string, params: unknown): void;
  assertNotCalled(name: string): void;
  clear(): void;
  wrap<TParams, TResult>(
    execute: (params: TParams) => Promise<TResult>
  ): (params: TParams) => Promise<TResult>;
}

export interface RecordedToolCall {
  readonly toolName: string;
  readonly arguments: unknown;
  readonly result: unknown;
  readonly isError: boolean;
  readonly timestamp: number;
}

export function createToolCallRecorder(): ToolCallRecorder;

// Test agent factory
export function createTestAgent(config: {
  readonly tools?: readonly ToolDefinition[];
  readonly responses: readonly Message[] | ((messages: readonly Message[]) => Message);
  readonly context?: readonly ContextEntry[];
  readonly approval?: ApprovalPolicy;
}): {
  readonly container: Container<unknown, unknown, unknown, "initialized">;
  readonly runner: AgentRunnerService;
  readonly recorder: ToolCallRecorder;
};

// Auto-approval
export function createAutoApprovalAdapter(
  decision?: boolean
): Adapter<typeof ApprovalPort, never, "singleton">;
```

---

_Previous: [08 - Advanced Patterns](./08-advanced.md) | Next: [10 - Appendices](./10-appendices.md)_
