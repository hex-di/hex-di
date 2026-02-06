# Phase 23: Core Tracing Package Foundation - Research

**Phase:** 23
**Milestone:** v7.0 Distributed Tracing
**Research Date:** 2026-02-06
**Status:** Ready for planning

## Executive Summary

This research answers: **"What do I need to know to PLAN Phase 23 well?"**

Phase 23 establishes the foundation for distributed tracing in HexDI by creating `@hex-di/tracing` with complete port definitions (TracerPort, SpanExporterPort, SpanProcessorPort), built-in adapters (NoOp, Memory, Console), W3C Trace Context propagation, and ID generation -- all with zero external dependencies.

**Key Insight:** This phase creates the TYPE SYSTEM and CONTRACTS for distributed tracing. Container instrumentation (Phase 24), backend export (Phase 25), and migration (Phase 26) all build on these foundations.

**Architecture:** Follow HexDI's existing port/adapter pattern. All tracers implement TracerPort, all exporters implement SpanExporterPort. No global singletons, no magic -- pure dependency injection.

**Standards Alignment:** Strictly follow W3C Trace Context (32-char trace IDs, 16-char span IDs, traceparent header format) and OpenTelemetry semantic conventions (AttributeValue types, SpanKind, SpanStatus) to ensure future backend compatibility.

## Context from Prior Research

### Locked Architectural Decisions (from v7.0 research)

These are NOT negotiable -- they're strategic decisions already made:

1. **Centralized Tree-Walking Subscription** -- One tracer observes entire container tree, NOT per-container propagation
2. **No Runtime Hook Inheritance Changes** -- @hex-di/runtime stays unchanged for MVP
3. **Module-Level Span Stack** -- Context propagation via span stack, not async-local-storage
4. **Package Location: packages/** -- @hex-di/tracing is a runtime library, not tooling
5. **W3C Trace Context Manual Implementation** -- No external dependencies for header parsing
6. **OpenTelemetry is the Standard** -- All backend integrations bridge to OTel

### Deferred to Later Phases

Phase 23 does NOT include:

- Container instrumentation (Phase 24)
- Automatic resolution tracing (Phase 24)
- Backend export (Phase 25)
- Framework integrations (Phase 27)
- Migration from old tracing (Phase 26)

### Existing HexDI Patterns to Follow

From codebase analysis:

**Port Pattern:**

```typescript
// packages/core/src/ports/factory.ts
export function createPort<const TName extends string, TService>(config: {
  name: TName;
  direction?: PortDirection;
  description?: string;
}): DirectedPort<TService, TName, "outbound">;
```

**Adapter Pattern:**

```typescript
// packages/core/src/adapters/unified.ts
export function createAdapter<TProvides, TRequires, TLifetime>({
  provides: Port,
  requires: readonly Port[],
  lifetime: 'singleton' | 'scoped' | 'transient',
  factory: (deps: ResolvedDeps<TRequires>) => TService
}): Adapter<...>
```

**Context Variable Pattern:**

```typescript
// packages/core/src/context/variables.ts
export function createContextVariable<T>(name: string, defaultValue?: T): ContextVariable<T>;
```

## W3C Trace Context Specification

### Traceparent Header Format

**Specification:** https://www.w3.org/TR/trace-context/

**Format:**

```
traceparent: {version}-{trace-id}-{parent-id}-{trace-flags}
```

**Exact Requirements:**

- **version**: 2-char hex (00 for current spec)
- **trace-id**: 32-char hex (16 bytes), all zeros is invalid
- **parent-id**: 16-char hex (8 bytes), all zeros is invalid
- **trace-flags**: 2-char hex (1 byte), bit 0 = sampled flag

**Example:**

```
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
```

**Parsing Algorithm:**

```typescript
function parseTraceparent(header: string): SpanContext | undefined {
  const parts = header.split("-");
  if (parts.length !== 4) return undefined;

  const [version, traceId, spanId, flags] = parts;

  // Validate version
  if (version !== "00") return undefined;

  // Validate trace ID (32 hex chars, not all zeros)
  if (!/^[0-9a-f]{32}$/.test(traceId)) return undefined;
  if (traceId === "00000000000000000000000000000000") return undefined;

  // Validate span ID (16 hex chars, not all zeros)
  if (!/^[0-9a-f]{16}$/.test(spanId)) return undefined;
  if (spanId === "0000000000000000") return undefined;

  // Validate flags (2 hex chars)
  if (!/^[0-9a-f]{2}$/.test(flags)) return undefined;

  return {
    traceId,
    spanId,
    traceFlags: parseInt(flags, 16),
    traceState: undefined, // Handled separately
  };
}
```

### Tracestate Header

**Format:** Comma-separated list of key-value pairs

```
tracestate: vendor1=value1,vendor2=value2
```

**Rules:**

- Optional (traceparent can exist without tracestate)
- Max 512 characters total
- Max 32 list-members
- Each key: lowercase alphanumeric + underscore/hyphen/asterisk/@
- Each value: printable ASCII except comma/equals/space

**For Phase 23:** Treat tracestate as opaque passthrough string. Parse later if needed.

### ID Generation

**Trace ID:** 16 random bytes encoded as 32 lowercase hex characters

**Span ID:** 8 random bytes encoded as 16 lowercase hex characters

**Randomness Source:**

```typescript
// Browser and modern Node.js
if (typeof crypto !== "undefined" && crypto.randomUUID) {
  // Use crypto.randomUUID() and extract bytes
  const uuid = crypto.randomUUID(); // e.g., "550e8400-e29b-41d4-a716-446655440000"
  // Convert to hex bytes, strip hyphens
}

// Fallback: Math.random (less secure, acceptable for dev/test)
function generateHex(bytes: number): string {
  let result = "";
  for (let i = 0; i < bytes; i++) {
    const byte = Math.floor(Math.random() * 256);
    result += byte.toString(16).padStart(2, "0");
  }
  return result;
}
```

**Implementation Strategy:** Use crypto.getRandomValues() if available, Math.random() fallback.

## OpenTelemetry Semantic Conventions

### AttributeValue Type

From OpenTelemetry spec:

```typescript
type AttributeValue = string | number | boolean | string[] | number[] | boolean[];
```

**Type Guards Needed:**

```typescript
function isAttributeValue(value: unknown): value is AttributeValue {
  if (typeof value === "string") return true;
  if (typeof value === "number" && !isNaN(value)) return true;
  if (typeof value === "boolean") return true;
  if (Array.isArray(value)) {
    if (value.length === 0) return true;
    const first = value[0];
    if (typeof first === "string") {
      return value.every(v => typeof v === "string");
    }
    if (typeof first === "number") {
      return value.every(v => typeof v === "number" && !isNaN(v));
    }
    if (typeof first === "boolean") {
      return value.every(v => typeof v === "boolean");
    }
  }
  return false;
}
```

**NO casts allowed** -- use type guards throughout.

### SpanKind

From OpenTelemetry spec:

```typescript
type SpanKind = "internal" | "server" | "client" | "producer" | "consumer";
```

**Meaning for HexDI:**

- `'internal'` - DI resolution spans (default)
- `'server'` - Incoming request handling (framework integrations)
- `'client'` - Outgoing request spans (future)
- `'producer'` / `'consumer'` - Messaging (future)

**Phase 23 Usage:** All built-in adapters use `'internal'` kind.

### SpanStatus

From OpenTelemetry spec:

```typescript
type SpanStatus = "unset" | "ok" | "error";
```

**Behavior:**

- `'unset'` - Default, no explicit status set
- `'ok'` - Explicit success (rare, usually left unset)
- `'error'` - Exception occurred or explicit error

**Phase 23 Usage:** Memory/Console tracers support all three. NoOp ignores status.

### Standard Attributes

OTel semantic conventions for DI spans (future -- not required for Phase 23, but design compatible):

```typescript
interface HexDIAttributes {
  // DI-specific (custom namespace)
  "hex-di.port.name": string;
  "hex-di.port.lifetime": "singleton" | "scoped" | "transient";
  "hex-di.resolution.cached": boolean;
  "hex-di.resolution.scope_id": string | undefined;
  "hex-di.container.name": string;
  "hex-di.container.kind": "root" | "child" | "lazy";

  // OTel standard
  "code.function": string; // e.g., "resolve"
  "code.namespace": string; // e.g., port name
}
```

## Tracer API Design Decisions

### Claude's Discretion Areas

Per CONTEXT.md, nearly all implementation decisions are delegated to Claude. Key questions:

#### 1. startSpan() vs Callback-Only API?

**Options:**

**A) Both startSpan() and withSpan():**

```typescript
interface Tracer {
  startSpan(name: string, options?: SpanOptions): Span;
  withSpan<T>(name: string, fn: (span: Span) => T): T;
  withSpanAsync<T>(name: string, fn: (span: Span) => Promise<T>): Promise<T>;
}
```

**B) Callback-only (Effect-TS style):**

```typescript
interface Tracer {
  withSpan<T>(name: string, fn: (span: Span) => T): T;
  withSpanAsync<T>(name: string, fn: (span: Span) => Promise<T>): Promise<T>;
}
```

**Decision: Option A (Both)**

**Rationale:**

- OTel provides both (tracer.startSpan and tracer.startActiveSpan)
- startSpan() needed for manual control (e.g., long-running spans across event handlers)
- withSpan() provides ergonomic callback pattern (auto-end, auto-error)
- NoOp tracer returns singleton span for both -- zero overhead either way

**Recommendation:** Provide both. NoOp makes both fast.

#### 2. Attribute Value Types

**Decision: Follow OTel AttributeValue exactly**

```typescript
type AttributeValue = string | number | boolean | string[] | number[] | boolean[];
```

**Rationale:**

- Backend compatibility (OTel exporters expect this)
- Simple, well-understood types
- No complex objects = easier serialization

**NO casts:** Use type guards to validate user input.

#### 3. withAttributes() Child Tracer?

**Question:** Should tracer support creating child tracer with default attributes?

```typescript
const childTracer = tracer.withAttributes({ "service.version": "1.0" });
childTracer.startSpan("operation"); // Inherits service.version
```

**Decision: YES, include withAttributes()**

**Rationale:**

- Common pattern in OTel SDKs
- Useful for component-scoped defaults (e.g., library packages)
- NoOp tracer returns itself (zero cost)
- Memory/Console tracers merge attributes

**Implementation:**

```typescript
withAttributes(attributes: Attributes): Tracer {
  return {
    ...this,
    defaultAttributes: { ...this.defaultAttributes, ...attributes },
  };
}
```

#### 4. Port Granularity

**Question:** One TracerPort or separate TracerPort / SpanProcessorPort / SpanExporterPort?

**Decision: Separate ports**

**Rationale:**

- SpanProcessor and SpanExporter compose independently
- User might want MemoryTracer + ConsoleExporter
- Clear separation = easier backend packages in Phase 25
- Follows single-responsibility principle

**Ports:**

- `TracerPort` - Span creation API
- `SpanProcessorPort` - Span lifecycle hooks (onStart, onEnd)
- `SpanExporterPort` - Backend export (export, shutdown, forceFlush)

#### 5. Span Links Support?

**Question:** Include links in Phase 23?

**Decision: YES, but minimal**

```typescript
interface SpanOptions {
  readonly links?: ReadonlyArray<SpanContext>;
}

interface SpanData {
  readonly links: ReadonlyArray<SpanContext>;
}
```

**Rationale:**

- Required by W3C Trace Context spec (optional but part of standard)
- OTel backends expect links field
- Implementation is simple (just store array)
- Phase 23 doesn't USE links, but structure supports it

#### 6. Automatic Exception Capture in withSpan?

**Question:** Should withSpan/withSpanAsync auto-capture exceptions?

**Decision: YES**

```typescript
withSpan<T>(name: string, fn: (span: Span) => T): T {
  const span = this.startSpan(name);
  try {
    const result = fn(span);
    span.end();
    return result;
  } catch (error) {
    span.recordException(error);
    span.setStatus('error');
    span.end();
    throw error; // Re-throw
  }
}
```

**Rationale:**

- OTel best practice (auto-capture exceptions)
- User doesn't have to remember to call recordException
- NoOp tracer does nothing (zero cost)

#### 7. SpanStatus Model

**Question:** Two-value (ok/error) or three-value (unset/ok/error)?

**Decision: Three-value (follow OTel)**

```typescript
type SpanStatus = "unset" | "ok" | "error";
```

**Rationale:**

- OTel spec uses three values
- 'unset' = default (don't set status unless needed)
- 'ok' = explicit success (rare)
- 'error' = explicit failure

**Backend compatibility:** OTel exporters expect this.

#### 8. SpanKind Model

**Question:** OTel kinds or DI-specific kinds?

**Decision: OTel kinds**

```typescript
type SpanKind = "internal" | "server" | "client" | "producer" | "consumer";
```

**Rationale:**

- Backend compatibility
- Future-proof for framework integrations (server spans for HTTP)
- DI resolutions are 'internal' spans
- Clear semantics from OTel conventions

## Built-in Adapter Design

### NoOpTracer Adapter

**Goal:** Zero runtime overhead when tracing disabled.

**Strategy:**

- Singleton frozen span (one allocation, reused forever)
- All methods are no-ops (inline to empty function)
- No timing calls (no Date.now(), no performance.now())
- isRecording() returns false (constant)

**Implementation:**

```typescript
const NOOP_SPAN_CONTEXT: SpanContext = Object.freeze({
  traceId: "00000000000000000000000000000000",
  spanId: "0000000000000000",
  traceFlags: 0,
});

const NOOP_SPAN: Span = Object.freeze({
  context: NOOP_SPAN_CONTEXT,
  name: "",
  startTime: 0,
  setAttribute: () => {},
  setAttributes: () => {},
  addEvent: () => {},
  setStatus: () => {},
  recordException: () => {},
  end: () => {},
  isRecording: () => false,
});

const NOOP_TRACER: Tracer = Object.freeze({
  startSpan: () => NOOP_SPAN,
  withSpan: (_, fn) => fn(NOOP_SPAN),
  withSpanAsync: async (_, fn) => fn(NOOP_SPAN),
  getActiveSpan: () => undefined,
  getSpanContext: () => undefined,
  withAttributes: () => NOOP_TRACER, // Returns self
});

export const NoOpTracerAdapter = createAdapter({
  provides: TracerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => NOOP_TRACER,
});
```

**Performance Target:** < 5% overhead vs no tracing (from v7.0 requirements).

### MemoryTracer Adapter

**Goal:** Collect spans for test assertions.

**Data Structure:**

```typescript
interface MemoryTracer extends Tracer {
  getCollectedSpans(): readonly SpanData[];
  clear(): void;
}
```

**Span Storage:**

```typescript
class MemoryTracerImpl implements MemoryTracer {
  private readonly spans: SpanData[] = [];
  private readonly spanStack: Span[] = [];

  startSpan(name: string, options?: SpanOptions): Span {
    const parentSpan = this.spanStack[this.spanStack.length - 1];
    const span = new MemorySpan(name, parentSpan?.context, options);
    this.spanStack.push(span);
    return span;
  }

  // ... withSpan/withSpanAsync push/pop spanStack

  private onSpanEnd(span: MemorySpan): void {
    const spanData = span.toSpanData();
    this.spans.push(spanData);
  }

  getCollectedSpans(): readonly SpanData[] {
    return [...this.spans]; // Copy to prevent mutation
  }

  clear(): void {
    this.spans.length = 0;
    this.spanStack.length = 0;
  }
}
```

**Span Structure:** Flat array (NOT tree). Parent-child relationships via parentSpanId field.

**Max Span Limit:** 10,000 spans (prevent memory leak in tests). Oldest spans dropped when limit hit.

**Decision: Flat array is simplest for test assertions.**

### ConsoleTracer Adapter

**Goal:** Human-readable output for development debugging.

**Output Style:**

```typescript
interface ConsoleTracerOptions {
  readonly colorize?: boolean; // Use ANSI colors (default: true if TTY)
  readonly includeTimestamps?: boolean; // Show start/end times (default: true)
  readonly minDurationMs?: number; // Skip spans faster than this (default: 0)
  readonly indent?: boolean; // Indent child spans (default: true)
}
```

**Example Output:**

```
[TRACE] resolve UserService (12.3ms)
  ├─ [TRACE] resolve Database (8.1ms) ✓
  └─ [TRACE] resolve Logger (0.5ms) ✓
```

**Output on span.end():**

```typescript
private onSpanEnd(span: SpanData): void {
  if (span.duration < this.options.minDurationMs) return;

  const indent = '  '.repeat(this.depth);
  const duration = span.duration.toFixed(1);
  const status = span.status === 'error' ? '✗' : '✓';
  const timestamp = this.options.includeTimestamps
    ? new Date(span.endTime).toISOString()
    : '';

  console.log(
    `${indent}[TRACE] ${span.name} (${duration}ms) ${status} ${timestamp}`
  );

  if (span.status === 'error' && span.statusMessage) {
    console.log(`${indent}  Error: ${span.statusMessage}`);
  }
}
```

**Color Scheme (if colorize: true):**

- Span name: cyan
- Duration: yellow
- Status ✓: green
- Status ✗: red
- Attributes: gray

**Decision: Structured single-line output, optional indentation for hierarchy.**

## ID Generation Strategy

### Requirements

- **Trace ID:** 32 hex characters (16 bytes)
- **Span ID:** 16 hex characters (8 bytes)
- **Not all zeros** (W3C spec requirement)
- **Randomness:** Sufficient to avoid collisions in distributed system

### Implementation

**Option A: crypto.randomUUID() + conversion**

```typescript
function generateTraceId(): string {
  // crypto.randomUUID() returns "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
  // We need 32 hex chars (16 bytes)
  const uuid1 = crypto.randomUUID().replace(/-/g, ""); // 32 hex chars
  return uuid1;
}

function generateSpanId(): string {
  // Take first 16 chars of UUID
  const uuid = crypto.randomUUID().replace(/-/g, "");
  return uuid.substring(0, 16);
}
```

**Option B: crypto.getRandomValues() direct**

```typescript
function generateTraceId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

function generateSpanId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}
```

**Option C: Math.random() fallback**

```typescript
function generateTraceId(): string {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    return cryptoTraceId();
  }
  // Fallback: Math.random (less secure, OK for dev/test)
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += Math.floor(Math.random() * 16).toString(16);
  }
  return result;
}
```

**Decision: Option B with Option C fallback**

**Rationale:**

- crypto.getRandomValues() is standard (Node 15+, all browsers)
- Direct byte generation (no UUID overhead)
- Math.random() fallback for older environments (dev/test only)
- Zero external dependencies

## Timing Strategy

### Requirements

- High-resolution timestamps (sub-millisecond precision)
- Monotonic (doesn't go backwards)
- Compatible with Node.js and browser

### Options

**Option A: performance.now()**

```typescript
const startTime = performance.now(); // Relative to page load / process start
```

**Option B: Date.now()**

```typescript
const startTime = Date.now(); // Absolute wall-clock time (milliseconds)
```

**Option C: performance.timeOrigin + performance.now()**

```typescript
const startTime = performance.timeOrigin + performance.now(); // Absolute high-res
```

**Decision: Option C (performance.timeOrigin + performance.now())**

**Rationale:**

- High-resolution (microsecond precision)
- Absolute timestamp (needed for cross-service trace correlation)
- Monotonic (performance.now() never goes backwards)
- Standard in Node.js 8.5+ and all modern browsers

**Fallback:**

```typescript
function getHighResTimestamp(): number {
  if (typeof performance !== "undefined" && performance.timeOrigin) {
    return performance.timeOrigin + performance.now();
  }
  return Date.now(); // Fallback (millisecond precision)
}
```

## Context Propagation Strategy

### Context Variables

**Existing Infrastructure:**

```typescript
// packages/core/src/context/variables.ts
export function createContextVariable<T>(name: string, defaultValue?: T): ContextVariable<T>;
```

**Tracing Variables:**

```typescript
// In @hex-di/tracing/src/context/variables.ts
export const TraceContextVar = createContextVariable<SpanContext | undefined>(
  "hex-di/trace-context",
  undefined
);

export const ActiveSpanVar = createContextVariable<Span | undefined>(
  "hex-di/active-span",
  undefined
);

export const CorrelationIdVar = createContextVariable<string | undefined>(
  "hex-di/correlation-id",
  undefined
);
```

**Note:** HexDI's context variables are PASSIVE (no automatic propagation). They're Symbol-based keys for passing data through DI graph. **Not async-local-storage.**

**For Phase 23:** Just define the variables. Phase 24 uses them during instrumentation.

### Header Parsing/Injection

**Extract from Headers:**

```typescript
export function extractTraceContext(
  headers: Record<string, string | undefined>
): SpanContext | undefined {
  const traceparent = headers["traceparent"] || headers["Traceparent"];
  if (!traceparent) return undefined;

  const context = parseTraceparent(traceparent);
  if (!context) return undefined;

  // Tracestate is optional
  const tracestate = headers["tracestate"] || headers["Tracestate"];
  if (tracestate) {
    return { ...context, traceState: tracestate };
  }

  return context;
}
```

**Inject into Headers:**

```typescript
export function injectTraceContext(context: SpanContext, headers: Record<string, string>): void {
  headers["traceparent"] = formatTraceparent(context);

  if (context.traceState) {
    headers["tracestate"] = context.traceState;
  }
}

function formatTraceparent(context: SpanContext): string {
  const flags = context.traceFlags.toString(16).padStart(2, "0");
  return `00-${context.traceId}-${context.spanId}-${flags}`;
}
```

**Header Case Sensitivity:** W3C spec says traceparent is case-insensitive. Check both lowercase and capitalized.

## Port/Adapter API Design

### TracerPort

```typescript
// @hex-di/tracing/src/ports/tracer.ts
import { createPort } from "@hex-di/core";

export interface Tracer {
  startSpan(name: string, options?: SpanOptions): Span;
  withSpan<T>(name: string, fn: (span: Span) => T, options?: SpanOptions): T;
  withSpanAsync<T>(name: string, fn: (span: Span) => Promise<T>, options?: SpanOptions): Promise<T>;
  getActiveSpan(): Span | undefined;
  getSpanContext(): SpanContext | undefined;
  withAttributes(attributes: Attributes): Tracer;
}

export const TracerPort = createPort<Tracer>({
  name: "Tracer",
  direction: "outbound",
  description: "Distributed tracing API for span creation and management",
  category: "infrastructure",
  tags: ["tracing", "observability"],
});
```

### SpanExporterPort

```typescript
// @hex-di/tracing/src/ports/exporter.ts
import { createPort } from "@hex-di/core";

export interface SpanExporter {
  export(spans: ReadonlyArray<SpanData>): Promise<void>;
  shutdown(): Promise<void>;
  forceFlush(): Promise<void>;
}

export const SpanExporterPort = createPort<SpanExporter>({
  name: "SpanExporter",
  direction: "outbound",
  description: "Backend exporter for sending spans to observability systems",
  category: "infrastructure",
  tags: ["tracing", "export"],
});
```

### SpanProcessorPort

```typescript
// @hex-di/tracing/src/ports/processor.ts
import { createPort } from "@hex-di/core";

export interface SpanProcessor {
  onStart(span: Span): void;
  onEnd(spanData: SpanData): void;
  shutdown(): Promise<void>;
  forceFlush(): Promise<void>;
}

export const SpanProcessorPort = createPort<SpanProcessor>({
  name: "SpanProcessor",
  direction: "outbound",
  description: "Span lifecycle processor for batching and sampling",
  category: "infrastructure",
  tags: ["tracing", "processing"],
});
```

## Type System Design

### Core Types

```typescript
// @hex-di/tracing/src/types/span.ts

export type SpanKind = "internal" | "server" | "client" | "producer" | "consumer";

export type SpanStatus = "unset" | "ok" | "error";

export type AttributeValue = string | number | boolean | string[] | number[] | boolean[];

export type Attributes = Readonly<Record<string, AttributeValue>>;

export interface SpanContext {
  readonly traceId: string; // 32 hex chars
  readonly spanId: string; // 16 hex chars
  readonly traceFlags: number; // 1 byte
  readonly traceState?: string; // Optional W3C tracestate
}

export interface SpanOptions {
  readonly kind?: SpanKind;
  readonly attributes?: Attributes;
  readonly links?: ReadonlyArray<SpanContext>;
  readonly startTime?: number;
  readonly root?: boolean; // Force new trace (ignore active span)
}

export interface SpanEvent {
  readonly name: string;
  readonly time: number;
  readonly attributes?: Attributes;
}

export interface Span {
  readonly context: SpanContext;
  readonly name: string;
  readonly startTime: number;

  setAttribute(key: string, value: AttributeValue): void;
  setAttributes(attributes: Attributes): void;
  addEvent(name: string, attributes?: Attributes): void;
  setStatus(status: SpanStatus, message?: string): void;
  recordException(error: Error): void;
  end(endTime?: number): void;
  isRecording(): boolean;
}

export interface SpanData {
  readonly context: SpanContext;
  readonly parentSpanId?: string;
  readonly name: string;
  readonly kind: SpanKind;
  readonly startTime: number;
  readonly endTime: number;
  readonly duration: number;
  readonly status: SpanStatus;
  readonly statusMessage?: string;
  readonly attributes: Attributes;
  readonly events: ReadonlyArray<SpanEvent>;
  readonly links: ReadonlyArray<SpanContext>;
}
```

### Type Guards

```typescript
// @hex-di/tracing/src/utils/type-guards.ts

export function isAttributeValue(value: unknown): value is AttributeValue {
  if (typeof value === "string") return true;
  if (typeof value === "number" && !isNaN(value)) return true;
  if (typeof value === "boolean") return true;

  if (Array.isArray(value)) {
    if (value.length === 0) return true;
    const firstType = typeof value[0];
    if (firstType === "string") {
      return value.every(v => typeof v === "string");
    }
    if (firstType === "number") {
      return value.every(v => typeof v === "number" && !isNaN(v));
    }
    if (firstType === "boolean") {
      return value.every(v => typeof v === "boolean");
    }
  }

  return false;
}

export function isSpanKind(value: unknown): value is SpanKind {
  return (
    value === "internal" ||
    value === "server" ||
    value === "client" ||
    value === "producer" ||
    value === "consumer"
  );
}

export function isSpanStatus(value: unknown): value is SpanStatus {
  return value === "unset" || value === "ok" || value === "error";
}

export function isValidTraceId(traceId: string): boolean {
  return /^[0-9a-f]{32}$/.test(traceId) && traceId !== "00000000000000000000000000000000";
}

export function isValidSpanId(spanId: string): boolean {
  return /^[0-9a-f]{16}$/.test(spanId) && spanId !== "0000000000000000";
}
```

## Package Structure

```
packages/tracing/
├── src/
│   ├── index.ts                      # Main exports
│   │
│   ├── ports/
│   │   ├── tracer.ts                 # TracerPort definition + interface
│   │   ├── exporter.ts               # SpanExporterPort definition + interface
│   │   ├── processor.ts              # SpanProcessorPort definition + interface
│   │   └── index.ts                  # Port exports
│   │
│   ├── types/
│   │   ├── span.ts                   # Span, SpanContext, SpanData, SpanOptions
│   │   ├── attributes.ts             # AttributeValue, Attributes
│   │   ├── status.ts                 # SpanStatus, SpanKind
│   │   └── index.ts                  # Type exports
│   │
│   ├── adapters/
│   │   ├── noop/
│   │   │   ├── tracer.ts             # NoOp implementation
│   │   │   ├── adapter.ts            # NoOpTracerAdapter
│   │   │   └── index.ts
│   │   ├── memory/
│   │   │   ├── tracer.ts             # Memory implementation
│   │   │   ├── span.ts               # MemorySpan class
│   │   │   ├── adapter.ts            # MemoryTracerAdapter
│   │   │   └── index.ts
│   │   ├── console/
│   │   │   ├── tracer.ts             # Console implementation
│   │   │   ├── formatter.ts          # Output formatting
│   │   │   ├── adapter.ts            # ConsoleTracerAdapter
│   │   │   └── index.ts
│   │   └── index.ts                  # Adapter exports
│   │
│   ├── context/
│   │   ├── variables.ts              # TraceContextVar, ActiveSpanVar, CorrelationIdVar
│   │   ├── propagation.ts            # extractTraceContext, injectTraceContext
│   │   ├── parse.ts                  # parseTraceparent, formatTraceparent
│   │   └── index.ts                  # Context exports
│   │
│   └── utils/
│       ├── id-generation.ts          # generateTraceId, generateSpanId
│       ├── timing.ts                 # getHighResTimestamp
│       ├── type-guards.ts            # isAttributeValue, isSpanKind, etc.
│       └── index.ts                  # Util exports
│
├── tests/
│   ├── unit/
│   │   ├── noop-tracer.test.ts
│   │   ├── memory-tracer.test.ts
│   │   ├── console-tracer.test.ts
│   │   ├── id-generation.test.ts
│   │   ├── trace-context.test.ts
│   │   └── type-guards.test.ts
│   │
│   └── integration/
│       ├── adapter-composition.test.ts
│       ├── w3c-compliance.test.ts
│       └── error-handling.test.ts
│
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── vitest.config.ts
└── README.md
```

## Dependencies

### package.json

```json
{
  "name": "@hex-di/tracing",
  "version": "0.1.0",
  "description": "Distributed tracing package for HexDI with W3C Trace Context support",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      },
      "require": {
        "types": "./dist/index.d.cts",
        "default": "./dist/index.cjs"
      }
    }
  },
  "files": ["dist", "src"],
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "clean": "rm -rf dist",
    "lint": "eslint . --cache",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:types": "vitest run --typecheck",
    "typecheck": "tsc --noEmit"
  },
  "keywords": [
    "tracing",
    "distributed-tracing",
    "w3c-trace-context",
    "opentelemetry",
    "observability",
    "hex-di"
  ],
  "peerDependencies": {
    "@hex-di/core": "workspace:*",
    "typescript": ">=5.0"
  },
  "peerDependenciesMeta": {
    "typescript": {
      "optional": true
    }
  },
  "devDependencies": {
    "@hex-di/core": "workspace:*"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "sideEffects": false
}
```

**Zero external dependencies** -- requirement PERF-03.

## Testing Strategy

### Unit Tests

**NoOp Tracer:**

- Verify zero allocations (startSpan returns same span instance)
- Verify all methods are no-ops
- Verify isRecording() returns false
- Verify withAttributes() returns same tracer instance

**Memory Tracer:**

- Verify spans collected correctly
- Verify parent-child relationships (parentSpanId set correctly)
- Verify clear() empties collection
- Verify max span limit (oldest spans dropped)
- Verify span events collected
- Verify exception recording

**Console Tracer:**

- Verify output format (mock console.log)
- Verify colorization (check ANSI codes)
- Verify minDurationMs filtering
- Verify indentation for nested spans

**ID Generation:**

- Verify trace ID length (32 hex chars)
- Verify span ID length (16 hex chars)
- Verify not all zeros
- Verify uniqueness (generate 1000 IDs, check no collisions)

**W3C Trace Context:**

- Verify traceparent parsing (valid cases)
- Verify invalid format rejection (bad version, wrong length, all zeros)
- Verify traceparent formatting
- Verify header injection
- Verify case-insensitive header lookup

**Type Guards:**

- Verify isAttributeValue for all valid types
- Verify rejection of invalid types (objects, null, undefined, NaN)
- Verify array type checking (all elements same type)

### Integration Tests

**Adapter Composition:**

```typescript
test("MemoryTracer with custom processor", () => {
  const tracer = createMemoryTracer();

  tracer.withSpan("parent", parent => {
    parent.setAttribute("parent.attr", "value");
    tracer.withSpan("child", child => {
      child.setAttribute("child.attr", "value");
    });
  });

  const spans = tracer.getCollectedSpans();
  expect(spans).toHaveLength(2);
  expect(spans[1].parentSpanId).toBe(spans[0].context.spanId);
});
```

**W3C Compliance:**

```typescript
test("round-trip trace context through headers", () => {
  const tracer = createMemoryTracer();
  const span = tracer.startSpan("test");

  const headers: Record<string, string> = {};
  injectTraceContext(span.context, headers);

  const extracted = extractTraceContext(headers);
  expect(extracted).toEqual(span.context);
});
```

**Error Handling:**

```typescript
test("withSpan captures exceptions", () => {
  const tracer = createMemoryTracer();

  expect(() => {
    tracer.withSpan("test", span => {
      throw new Error("Test error");
    });
  }).toThrow("Test error");

  const spans = tracer.getCollectedSpans();
  expect(spans[0].status).toBe("error");
  expect(spans[0].events).toContainEqual(expect.objectContaining({ name: "exception" }));
});
```

## JSDoc Requirements

Per requirement PERF-04, all public API must have comprehensive JSDoc.

**Template:**

````typescript
/**
 * Creates a new span for tracing an operation.
 *
 * The span is not automatically ended -- call `span.end()` when the operation
 * completes. For automatic management, use `withSpan()` or `withSpanAsync()`.
 *
 * @param name - Human-readable span name (e.g., "fetch-user", "validate-input")
 * @param options - Optional span configuration
 * @returns A new span that must be manually ended
 *
 * @example
 * ```typescript
 * const span = tracer.startSpan('fetch-user', {
 *   attributes: { 'user.id': '123' },
 * });
 * try {
 *   const user = await fetchUser('123');
 *   span.setAttribute('user.name', user.name);
 * } catch (error) {
 *   span.recordException(error);
 *   span.setStatus('error');
 * } finally {
 *   span.end();
 * }
 * ```
 *
 * @see {@link withSpan} for automatic span management (sync)
 * @see {@link withSpanAsync} for automatic span management (async)
 */
startSpan(name: string, options?: SpanOptions): Span;
````

## Performance Considerations

### NoOp Overhead Target

From requirement PERF-01 (Phase 27), but design for it now:

- **< 5% overhead vs no tracing**

**Strategy:**

- Singleton span (one allocation)
- Inline no-op methods (JIT optimizes to nothing)
- No timing calls
- No attribute storage

### Memory Overhead

**MemoryTracer:**

- Max 10,000 spans (configurable)
- Each SpanData: ~500 bytes (estimate)
- Total: ~5MB max

**Strategy:** Drop oldest spans when limit hit (FIFO).

### Timing Precision

**Target:** Sub-millisecond precision (microseconds)

**Implementation:** performance.timeOrigin + performance.now()

**Fallback:** Date.now() (millisecond precision, acceptable)

## Open Questions for Planning

### 1. Injectable Clock/ID Generator?

**Question:** Should timing and ID generation be injectable (for deterministic tests)?

**Options:**

**A) Hard-coded (simpler):**

```typescript
function getHighResTimestamp(): number {
  return performance.timeOrigin + performance.now();
}
```

**B) Injectable (more flexible):**

```typescript
interface Clock {
  now(): number;
}

interface IdGenerator {
  generateTraceId(): string;
  generateSpanId(): string;
}

// MemoryTracer can accept custom clock/generator
createMemoryTracer({ clock: mockClock, idGenerator: sequentialIds });
```

**Recommendation: Option A (Hard-coded) for Phase 23**

**Rationale:**

- Simpler implementation
- Tests can mock Date/performance globally if needed
- Injectable clock adds complexity without clear MVP benefit
- Can add later if needed (Phase 27 test utilities)

### 2. Span Event Attributes?

**Question:** Should span events support attributes?

```typescript
span.addEvent("cache-miss", { "cache.key": "user:123" });
```

**Recommendation: YES**

**Rationale:**

- OTel spec includes event attributes
- Simple to implement
- Useful for debugging

### 3. Span Links in Phase 23?

**Question:** Include links field even though not used yet?

**Recommendation: YES (structure only)**

**Rationale:**

- OTel spec includes links
- Phase 25 backends expect links field (even if empty)
- Zero cost if not used (empty array)

### 4. Tracestate Parsing Depth?

**Question:** Parse tracestate into structured data or keep opaque?

**Recommendation: Opaque string for Phase 23**

**Rationale:**

- Tracestate is vendor-specific
- Parsing adds complexity
- Just pass through for now
- Can parse in Phase 25 if needed per backend

## Success Criteria Validation

From Phase 23 requirements:

1. ✅ **Import ports** -- TracerPort, SpanExporterPort, SpanProcessorPort defined via createPort()
2. ✅ **NoOp tracer** -- Zero overhead (singleton span, no allocations, no timing)
3. ✅ **Memory tracer** -- Collects spans, getCollectedSpans(), clear()
4. ✅ **Console tracer** -- Colorized, timestamped, minDurationMs filtering
5. ✅ **W3C Trace Context** -- Extract/inject traceparent/tracestate headers

## Risk Assessment

| Risk                                  | Probability | Impact | Mitigation                                   |
| ------------------------------------- | ----------- | ------ | -------------------------------------------- |
| W3C spec interpretation errors        | Low         | High   | Reference implementation tests, OTel compat  |
| Type guards too permissive            | Medium      | Medium | Comprehensive test coverage                  |
| NoOp tracer not zero-cost             | Low         | High   | Benchmark in Phase 27, inline optimizations  |
| Memory tracer memory leak             | Medium      | Medium | Max span limit (10k), drop oldest            |
| Console output unreadable             | Low         | Low    | Configurable formatting, test output samples |
| ID collisions in distributed system   | Very Low    | High   | Use crypto.getRandomValues (secure random)   |
| Cross-platform timing inconsistencies | Low         | Low    | Fallback to Date.now(), test on Node/browser |

## References

**Authoritative Sources:**

- W3C Trace Context: https://www.w3.org/TR/trace-context/
- OpenTelemetry Spec: https://opentelemetry.io/docs/specs/otel/
- OTel Semantic Conventions: https://opentelemetry.io/docs/specs/semconv/
- OTel Trace API: https://opentelemetry.io/docs/specs/otel/trace/api/

**HexDI Codebase:**

- Port pattern: `packages/core/src/ports/factory.ts`
- Adapter pattern: `packages/core/src/adapters/unified.ts`
- Context variables: `packages/core/src/context/variables.ts`
- Architecture doc: `.planning/codebase/ARCHITECTURE.md`
- Conventions: `.planning/codebase/CONVENTIONS.md`

**Prior Research:**

- Feature landscape: `.planning/research/TRACING-FEATURES.md`
- Architecture decisions: `.planning/research/ARCHITECTURE.md`
- v7.0 roadmap: `.planning/milestones/v7.0-ROADMAP.md`

## Summary for Planning

**What you know now:**

1. **Exact W3C spec** -- 32-char trace IDs, 16-char span IDs, traceparent format, validation rules
2. **OTel conventions** -- AttributeValue types, SpanKind, SpanStatus, semantic attributes
3. **API decisions** -- startSpan + withSpan (both), withAttributes (yes), separate ports (yes), links (structure only)
4. **Adapter behavior** -- NoOp (singleton span), Memory (flat array, 10k limit), Console (structured output)
5. **ID generation** -- crypto.getRandomValues() with Math.random() fallback
6. **Timing** -- performance.timeOrigin + performance.now(), Date.now() fallback
7. **Package structure** -- Clear separation (ports/, types/, adapters/, context/, utils/)
8. **Zero dependencies** -- No external packages, only @hex-di/core peer

**Ready to plan:**

- File structure (module organization)
- Type definitions (interfaces, type aliases)
- Implementation order (what builds on what)
- Test coverage (unit + integration)
- API exports (public surface)

**Deferred to later phases:**

- Container instrumentation (Phase 24)
- Backend export (Phase 25)
- Framework integrations (Phase 27)

---

**Research Complete:** 2026-02-06
**Confidence:** HIGH
**Ready for Planning:** YES
