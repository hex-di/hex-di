# Phase 4: COMMUNICATION — The Application Speaks to the Outside World

## Status: 40% Complete

## Vision Statement

> "The application exposes its self-knowledge through standardized protocols (MCP, A2A, OTel)."

Phase 4 transforms HexDI from a self-aware system into a **communicative system**. The application doesn't just know itself — it can tell others what it knows through industry-standard protocols that AI tools, observability platforms, and other agents can consume directly.

This phase bridges the gap between internal self-knowledge (Phase 2: AWARENESS) and external consumption. Instead of requiring developers to write custom APIs or parse logs, the application exposes its complete model through protocols that tools already understand.

---

## The Diagnostic Port Analogy (OBD-II Car Analogy)

### The Old Way: External Observation

Traditional applications are like old cars. When something goes wrong, you need external tools to diagnose:

```
  ┌──────────────┐                ┌──────────────────────┐
  │   Developer  │    reads       │   Application        │
  │   / AI Tool  │───────────────>│                      │
  │              │    parses      │  src/services/*.ts   │
  │  "I think    │───────────────>│  logs/*.txt          │
  │   this       │    infers      │  metrics.json        │
  │   service    │───────────────>│                      │
  │   depends    │               │  (external artifacts, │
  │   on that"   │               │   not self-knowledge) │
  └──────────────┘               └──────────────────────┘

  Diagnosis: Probabilistic. Based on external observation.
```

### The New Way: Diagnostic Port

Phase 4 applications are like modern cars with OBD-II ports:

```
  ┌──────────────┐                ┌──────────────────────┐
  │   Developer  │                │   HexDI Application  │
  │   / AI Tool  │                │                      │
  │              │   MCP / A2A    │  ┌────────────────┐  │
  │  "What       │◄═══════════════>│  │ Diagnostic     │  │
  │   services   │   diagnostic   │  │ Port:          │  │
  │   exist?"    │   port          │  │                │  │
  │              │                │  │ • Graph API    │  │
  │  ✓ Exact     │                │  │ • Runtime API  │  │
  │  ✓ Complete  │                │  │ • Tracing API  │  │
  │  ✓ From the  │                │  │ • Store API    │  │
  │    app       │                │  │ • Query API    │  │
  │    itself    │                │  │ • Saga API     │  │
  │              │                │  │ • Flow API     │  │
  │              │                │  │ • Agent API    │  │
  │              │                │  └────────────────┘  │
  └──────────────┘                └──────────────────────┘

  Diagnosis: Deterministic. Based on the application's own knowledge.
```

The diagnostic port exposes:

- **MCP Server**: Resources and tools for AI dev tools (Claude Code, Cursor, etc.)
- **A2A Agent Card**: Skills for agent-to-agent collaboration
- **OTel Export**: Traces to observability platforms (Jaeger, Zipkin, Datadog, Grafana)
- **REST API**: Human-readable diagnostic endpoints
- **DevTools Dashboard**: Visual inspection UI

---

## Current State vs. Target State

### What Exists (40% Complete)

#### ✅ OpenTelemetry Export Pipeline (100% Complete)

**Core Components:**

- ✅ **OTLP HTTP Exporter** (`packages/tracing-otel/src/exporters/otlp-http.ts`)
  - Converts HexDI spans to OTel ReadableSpan format
  - Supports custom endpoints, headers, timeouts
  - Graceful error handling (logs but never throws)
  - Resource metadata builder for service identification

- ✅ **Span Adapter** (`packages/tracing-otel/src/adapters/span-adapter.ts`)
  - HexDI SpanData → OTel ReadableSpan conversion
  - Handles span context, parent relationships, timing
  - Converts span kinds, statuses, events, links
  - No type casts — explicit field-by-field conversion

- ✅ **Batch Processor** (`packages/tracing-otel/src/processors/batch.ts`)
  - Buffers spans up to `maxQueueSize` (default: 2048)
  - Exports in batches when `maxExportBatchSize` reached (default: 512)
  - Scheduled flush every `scheduledDelayMillis` (default: 5000ms)
  - FIFO drop policy when buffer full
  - Timeout-protected shutdown

- ✅ **Simple Processor** (`packages/tracing-otel/src/processors/simple.ts`)
  - Immediate export on span completion
  - Fire-and-forget async export
  - Useful for debugging/testing
  - Not recommended for production

- ✅ **Semantic Conventions Mapper** (`packages/tracing-otel/src/semantic-conventions/mapper.ts`)
  - Maps HexDI attributes to OTel conventions
  - Preserves both HexDI and OTel attributes
  - Maps: `hex-di.port.name` → `code.namespace`
  - Maps: `hex-di.resolution.cached` → `custom.cache_hit`
  - Maps: `hex-di.container.id` → `custom.container_id`
  - Maps: `hex-di.resolution.depth` → `custom.resolution_depth`

- ✅ **Resource Builder** (`packages/tracing-otel/src/resources/resource.ts`)
  - Creates OTel Resource with service metadata
  - Required: `serviceName`
  - Optional: `serviceVersion`, `deploymentEnvironment`, `serviceNamespace`
  - Supports custom attributes (cloud provider, k8s metadata, etc.)

**Backend Exporters:**

- ✅ **Jaeger Exporter** (`packages/tracing-jaeger/src/exporter.ts`)
  - Direct export to Jaeger collector via Thrift over HTTP
  - Default endpoint: `http://localhost:14268/api/traces`
  - View traces at `http://localhost:16686` (Jaeger UI)

- ✅ **Zipkin Exporter** (`packages/tracing-zipkin/src/exporter.ts`)
  - Direct export to Zipkin via JSON v2 API
  - Default endpoint: `http://localhost:9411/api/v2/spans`
  - View traces at `http://localhost:9411` (Zipkin UI)

- ✅ **Datadog Bridge** (`packages/tracing-datadog/src/bridge.ts`)
  - Bridges HexDI spans to dd-trace tracer
  - Peer dependency on `dd-trace` (user installs separately)
  - Converts HexDI spans to DataDog span format
  - Preserves tags, resources, error information

**Verification:**
All exporters have been tested and verified:

- OTLP HTTP exporter works with OpenTelemetry Collector
- Jaeger exporter works with Jaeger backend
- Zipkin exporter works with Zipkin backend
- Datadog bridge works with dd-trace

### What's Missing (60% Remaining)

#### ❌ MCP Server (0% Complete)

- No `packages/mcp/` package exists
- No MCP resources exposing graph/runtime/tracing data
- No MCP tools for resolve/inspect/createScope
- No MCP prompts for debugging templates

#### ❌ A2A Protocol (0% Complete)

- No `packages/a2a/` package exists
- No Agent Card generation from container inspection
- No A2A skills (inspect-architecture, diagnose-issue, etc.)
- No A2A task protocol handling

#### ❌ REST Diagnostic API (0% Complete)

- No `createDiagnosticRoutes()` in `integrations/hono`
- No endpoints: `/hexdi/graph`, `/snapshot`, `/scopes`, `/traces`, etc.
- No authentication middleware (API key, JWT)
- No CORS configuration

#### ❌ DevTools Dashboard (10% Complete)

- Static graph visualizer exists (`tooling/graph-viz/`)
- No runtime connection to container
- No live state overlay (instantiated vs pending, active scopes)
- No tracing timeline/waterfall view
- No scope tree visualization
- No flow machine state diagram
- No store state inspector
- No live updates (WebSocket/SSE)

---

## Detailed Component Plans

### 4.1 OpenTelemetry Export (100% Complete ✅)

**Status:** Fully implemented and verified.

#### 4.1.1 OTLP HTTP Exporter (Verified ✅)

**Location:** `packages/tracing-otel/src/exporters/otlp-http.ts`

**Functionality:**

- Creates `SpanExporter` compatible with HexDI `SpanProcessor`
- Converts HexDI `SpanData` to OTel `ReadableSpan` format
- Maps HexDI attributes to OTel semantic conventions
- Supports custom endpoints, headers, timeouts
- Graceful error handling (logs but never throws)

**API:**

```typescript
interface OtlpHttpExporterOptions {
  url?: string; // Default: "http://localhost:4318/v1/traces"
  headers?: Record<string, string>;
  timeout?: number; // Default: 10000ms
  resource?: ResourceConfig;
}

function createOtlpHttpExporter(options?: OtlpHttpExporterOptions): SpanExporter;
```

**Example:**

```typescript
const exporter = createOtlpHttpExporter({
  url: "https://api.honeycomb.io/v1/traces",
  headers: {
    "x-honeycomb-team": process.env.HONEYCOMB_API_KEY,
  },
  resource: {
    serviceName: "my-service",
    serviceVersion: "1.2.3",
    deploymentEnvironment: "production",
  },
});

const processor = createBatchSpanProcessor(exporter);
```

**Verification:** ✅ Tested with OpenTelemetry Collector, Honeycomb, Grafana Cloud

#### 4.1.2 Span Adapter HexDI→OTel (Verified ✅)

**Location:** `packages/tracing-otel/src/adapters/span-adapter.ts`

**Functionality:**

- Converts HexDI `SpanData` to OTel `ReadableSpan` interface
- Handles span context (traceId, spanId, traceFlags, traceState)
- Converts parent-child relationships
- Converts timing (milliseconds → HrTime)
- Converts span kinds, statuses, events, links
- No type casts — explicit field-by-field conversion

**Key Conversion Functions:**

- `convertToReadableSpan(hexSpan, resource?)` — Main conversion
- `convertSpanKind()` — HexDI kind → OTel SpanKind
- `convertSpanStatus()` — HexDI status → OTel SpanStatus
- `convertToHrTime()` — milliseconds → [seconds, nanoseconds]
- `convertSpanEvent()` — HexDI event → OTel TimedEvent
- `convertSpanLink()` — HexDI link → OTel Link

**Verification:** ✅ All conversions tested, no type casts used

#### 4.1.3 Batch + Simple Processors (Verified ✅)

**Location:** `packages/tracing-otel/src/processors/batch.ts`, `simple.ts`

**BatchSpanProcessor:**

- Buffers spans up to `maxQueueSize` (default: 2048)
- Exports when `maxExportBatchSize` reached (default: 512)
- Scheduled flush every `scheduledDelayMillis` (default: 5000ms)
- FIFO drop when buffer full
- Timeout-protected shutdown (default: 30000ms)

**SimpleSpanProcessor:**

- Immediate export on span completion
- Fire-and-forget async export
- Useful for debugging/testing
- Not recommended for production

**Verification:** ✅ Both processors tested, batch processor recommended for production

#### 4.1.4 Semantic Conventions Mapper (Verified ✅)

**Location:** `packages/tracing-otel/src/semantic-conventions/mapper.ts`

**Functionality:**

- Maps HexDI attributes to OTel semantic conventions
- Preserves both HexDI and OTel attributes (no data loss)
- Mapping rules:
  - `hex-di.port.name` → `code.namespace`
  - `hex-di.resolution.cached` → `custom.cache_hit`
  - `hex-di.container.id` → `custom.container_id`
  - `hex-di.resolution.depth` → `custom.resolution_depth`

**Verification:** ✅ Mapping tested, both attribute sets preserved

#### 4.1.5 Resource Metadata Builder (Verified ✅)

**Location:** `packages/tracing-otel/src/resources/resource.ts`

**Functionality:**

- Creates OTel `Resource` with service identification metadata
- Required: `serviceName` (maps to `service.name`)
- Optional: `serviceVersion`, `deploymentEnvironment`, `serviceNamespace`
- Supports custom attributes (cloud provider, k8s metadata, etc.)

**Verification:** ✅ Resource creation tested, service identification works

#### 4.1.6 Backend Exporters: Jaeger, Zipkin, Datadog (All Verified ✅)

**Jaeger Exporter:**

- Location: `packages/tracing-jaeger/src/exporter.ts`
- Protocol: Thrift over HTTP
- Default endpoint: `http://localhost:14268/api/traces`
- View traces: `http://localhost:16686` (Jaeger UI)

**Zipkin Exporter:**

- Location: `packages/tracing-zipkin/src/exporter.ts`
- Protocol: JSON v2 API
- Default endpoint: `http://localhost:9411/api/v2/spans`
- View traces: `http://localhost:9411` (Zipkin UI)

**Datadog Bridge:**

- Location: `packages/tracing-datadog/src/bridge.ts`
- Protocol: dd-trace tracer (peer dependency)
- Converts HexDI spans to DataDog span format
- Preserves tags, resources, error information

**Verification:** ✅ All three exporters tested and working

---

### 4.2 MCP Server Framework — NEW PACKAGE

**Status:** Specified. See `spec/mcp/` for the full framework specification.

**Package:** `packages/mcp/`

**Purpose:** General-purpose MCP server framework using HexDI port/adapter architecture. MCP resources, tools, and prompts are modeled as typed HexDI ports (`McpResourcePort<T>`, `McpToolPort<I,O>`, `McpPromptPort<A>`) with category-based auto-discovery. The framework ships no domain-specific adapters -- the inspection-specific adapters (Sections 4.2.2-4.2.7 below) are implemented in `@hex-di/devtools` using this framework.

**Specification:** [`spec/mcp/`](../../spec/mcp/README.md) -- 7 documents covering port types, adapter patterns, server creation, transport, API reference, and definition of done.

#### 4.2.1 Package Setup

> **Framework specification:** See [`spec/mcp/`](../../spec/mcp/README.md) for the full `@hex-di/mcp` framework design.

**`@hex-di/mcp` (Framework) Dependencies:**

- `@modelcontextprotocol/sdk` — MCP SDK (peer dependency)
- `@hex-di/core` — Port definitions, directed ports, categories (peer)
- `@hex-di/graph` — Graph builder for composing MCP adapter graphs (peer)

Note: The framework has **no dependency** on `@hex-di/runtime`, `@hex-di/tracing`, or any library package. It provides typed port definitions (`McpResourcePort<T>`, `McpToolPort<I,O>`, `McpPromptPort<A>`), adapter contracts (`ResourceHandler`, `ToolHandler`, `PromptHandler`), server factory (`createMcpServer()`), and transport abstractions (`StdioTransport`, `SseTransport`).

**`@hex-di/devtools` implements the inspection-specific MCP adapters** (Sections 4.2.2-4.2.7 below) using the `@hex-di/mcp` framework. The DevTools standalone server composes these adapters into a graph and passes it to `createMcpServer()`.

**Framework Package Structure:**

```
packages/mcp/
├── src/
│   ├── index.ts                    # Public API exports
│   ├── ports/
│   │   ├── resource-port.ts       # McpResourcePort type + factory
│   │   ├── tool-port.ts           # McpToolPort type + factory
│   │   ├── prompt-port.ts         # McpPromptPort type + factory
│   │   └── categories.ts          # Port category constants
│   ├── server/
│   │   ├── create-server.ts       # createMcpServer() factory
│   │   ├── discovery.ts           # Graph walk for MCP ports by category
│   │   └── registration.ts        # Registers discovered ports with MCP SDK
│   ├── transport/
│   │   ├── stdio.ts               # StdioTransport adapter
│   │   └── sse.ts                 # SseTransport adapter
│   ├── handlers/
│   │   ├── resource-handler.ts    # ResourceHandler interface
│   │   ├── tool-handler.ts        # ToolHandler interface
│   │   └── prompt-handler.ts      # PromptHandler interface
│   └── errors/
│       ├── codes.ts               # MCP error codes
│       └── classes.ts             # McpServerError, McpHandlerError
├── tests/
│   ├── ports/
│   ├── server/
│   ├── transport/
│   ├── handlers/
│   └── integration/
└── package.json
```

**Inspection Adapters** (implemented in `@hex-di/devtools`, not `@hex-di/mcp`):

#### 4.2.2 MCP Resources — Graph

**Resource URIs:**

- `hexdi://graph/topology` — Complete dependency graph
- `hexdi://graph/complexity` — Complexity metrics and analysis
- `hexdi://graph/suggestions` — Optimization suggestions

**hexdi://graph/topology**

**URI:** `hexdi://graph/topology`

**Parameters:**

- `filter` (optional): Filter by category, tag, or port name
  - Example: `?filter=category:auth`
  - Example: `?filter=tag:security`
  - Example: `?filter=port:AuthService`

**Response Schema:**

```typescript
{
  ports: Array<{
    name: string;
    lifetime: "singleton" | "scoped" | "transient";
    dependsOn: string[];
    category?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
  }>;
  edges: Array<{
    from: string;
    to: string;
    type: "required" | "optional";
  }>;
  metrics: {
    totalPorts: number;
    maxDepth: number;
    complexityScore: number;
    cycles: string[][];
    orphanPorts: string[];
  };
}
```

**Example Response:**

```json
{
  "ports": [
    {
      "name": "AuthService",
      "lifetime": "singleton",
      "dependsOn": ["UserRepo", "TokenService"],
      "category": "auth",
      "tags": ["security"]
    },
    {
      "name": "UserRepo",
      "lifetime": "scoped",
      "dependsOn": ["DatabasePort"],
      "category": "data"
    }
  ],
  "edges": [
    {
      "from": "AuthService",
      "to": "UserRepo",
      "type": "required"
    },
    {
      "from": "UserRepo",
      "to": "DatabasePort",
      "type": "required"
    }
  ],
  "metrics": {
    "totalPorts": 24,
    "maxDepth": 4,
    "complexityScore": 35,
    "cycles": [],
    "orphanPorts": ["UnusedService"]
  }
}
```

**hexdi://graph/complexity**

**URI:** `hexdi://graph/complexity`

**Parameters:** None

**Response Schema:**

```typescript
{
  complexityScore: number;
  maxDepth: number;
  averageDepth: number;
  totalEdges: number;
  cycles: Array<{
    ports: string[];
    description: string;
  }>;
  captiveDependencies: Array<{
    port: string;
    description: string;
  }>;
  orphanPorts: string[];
  suggestions: Array<{
    type: "reduce-depth" | "break-cycle" | "remove-orphan" | "optimize-lifetime";
    port?: string;
    description: string;
    impact: "low" | "medium" | "high";
  }>;
}
```

**Example Response:**

```json
{
  "complexityScore": 35,
  "maxDepth": 4,
  "averageDepth": 2.3,
  "totalEdges": 48,
  "cycles": [],
  "captiveDependencies": [
    {
      "port": "ConfigService",
      "description": "Singleton depends on scoped service"
    }
  ],
  "orphanPorts": ["UnusedService"],
  "suggestions": [
    {
      "type": "remove-orphan",
      "port": "UnusedService",
      "description": "UnusedService is registered but never referenced",
      "impact": "low"
    },
    {
      "type": "optimize-lifetime",
      "port": "ConfigService",
      "description": "Consider making ConfigService singleton instead of scoped",
      "impact": "medium"
    }
  ]
}
```

**hexdi://graph/suggestions**

**URI:** `hexdi://graph/suggestions`

**Parameters:**

- `type` (optional): Filter by suggestion type
  - Example: `?type=reduce-depth`
  - Example: `?type=break-cycle`

**Response Schema:**

```typescript
{
  suggestions: Array<{
    id: string;
    type:
      | "reduce-depth"
      | "break-cycle"
      | "remove-orphan"
      | "optimize-lifetime"
      | "extract-interface";
    port?: string;
    description: string;
    impact: "low" | "medium" | "high";
    effort: "low" | "medium" | "high";
    example?: string; // Code example if applicable
  }>;
}
```

#### 4.2.3 MCP Resources — Runtime

**Resource URIs:**

- `hexdi://runtime/snapshot` — Current container state snapshot
- `hexdi://runtime/scopes` — Active scope hierarchy
- `hexdi://runtime/ports` — Port resolution status

**hexdi://runtime/snapshot**

**URI:** `hexdi://runtime/snapshot`

**Parameters:**

- `containerId` (optional): Specific container ID (default: root)
  - Example: `?containerId=child-1`

**Response Schema:**

```typescript
{
  containerId: string;
  containerName: string;
  phase: "building" | "running" | "disposed";
  isDisposed: boolean;
  singletons: Array<{
    portName: string;
    instantiated: boolean;
  }>;
  scopes: Array<{
    name: string;
    services: string[];
    children: string[]; // Child scope names
  }>;
  childContainers: Array<{
    containerId: string;
    containerName: string;
    phase: string;
  }>;
}
```

**Example Response:**

```json
{
  "containerId": "root",
  "containerName": "App Root",
  "phase": "running",
  "isDisposed": false,
  "singletons": [
    {
      "portName": "AuthService",
      "instantiated": true
    },
    {
      "portName": "ConfigService",
      "instantiated": true
    }
  ],
  "scopes": [
    {
      "name": "request-123",
      "services": ["UserRepo", "SessionService"],
      "children": []
    }
  ],
  "childContainers": [
    {
      "containerId": "child-1",
      "containerName": "Chat Dashboard",
      "phase": "running"
    }
  ]
}
```

**hexdi://runtime/scopes**

**URI:** `hexdi://runtime/scopes`

**Parameters:**

- `containerId` (optional): Specific container ID (default: root)

**Response Schema:**

```typescript
{
  scopeTree: {
    name: string; // Container name or scope name
    type: "container" | "scope";
    services: string[];
    children: Array<{
      name: string;
      type: "scope";
      services: string[];
      children: Array<...>; // Recursive
    }>;
  };
}
```

**Example Response:**

```json
{
  "scopeTree": {
    "name": "root",
    "type": "container",
    "services": ["AuthService", "ConfigService"],
    "children": [
      {
        "name": "request-123",
        "type": "scope",
        "services": ["UserRepo", "SessionService"],
        "children": []
      },
      {
        "name": "request-456",
        "type": "scope",
        "services": ["UserRepo", "SessionService"],
        "children": []
      }
    ]
  }
}
```

**hexdi://runtime/ports**

**URI:** `hexdi://runtime/ports`

**Parameters:**

- `containerId` (optional): Specific container ID
- `port` (optional): Filter by port name
  - Example: `?port=AuthService`

**Response Schema:**

```typescript
{
  ports: Array<{
    name: string;
    resolved: boolean | "scope-required";
    lifetime: "singleton" | "scoped" | "transient";
    containerId: string;
  }>;
}
```

#### 4.2.4 MCP Resources — Tracing

**Resource URIs:**

- `hexdi://tracing/recent` — Recent spans (last N spans)
- `hexdi://tracing/errors` — Error spans
- `hexdi://tracing/slow` — Slow resolutions
- `hexdi://tracing/summary` — Tracing summary statistics

**hexdi://tracing/recent**

**URI:** `hexdi://tracing/recent`

**Parameters:**

- `limit` (optional): Number of spans to return (default: 100)
  - Example: `?limit=50`
- `port` (optional): Filter by port name
  - Example: `?port=AuthService`
- `traceId` (optional): Filter by trace ID
  - Example: `?traceId=abc123`

**Response Schema:**

```typescript
{
  spans: Array<{
    traceId: string;
    spanId: string;
    name: string;
    portName?: string;
    startTime: number; // milliseconds since epoch
    endTime: number;
    duration: number; // milliseconds
    status: "ok" | "error";
    attributes: Record<string, string | number | boolean>;
    parentSpanId?: string;
  }>;
  total: number;
}
```

**hexdi://tracing/errors**

**URI:** `hexdi://tracing/errors`

**Parameters:**

- `last` (optional): Time window (e.g., "24h", "1h", "5m")
  - Example: `?last=24h`
- `port` (optional): Filter by port name
- `saga` (optional): Filter by saga name (if saga library exists)

**Response Schema:**

```typescript
{
  errors: Array<{
    traceId: string;
    spanId: string;
    name: string;
    portName?: string;
    error: string;
    errorMessage?: string;
    stackTrace?: string;
    timestamp: number; // milliseconds since epoch
    duration: number;
    attributes: Record<string, unknown>;
  }>;
  total: number;
  summary: {
    byPort: Record<string, number>;
    byError: Record<string, number>;
  }
}
```

**hexdi://tracing/slow**

**URI:** `hexdi://tracing/slow`

**Parameters:**

- `threshold` (optional): Duration threshold in milliseconds (default: 100)
  - Example: `?threshold=500`
- `last` (optional): Time window
- `port` (optional): Filter by port name

**Response Schema:**

```typescript
{
  slowSpans: Array<{
    traceId: string;
    spanId: string;
    name: string;
    portName?: string;
    duration: number;
    threshold: number;
    timestamp: number;
  }>;
  summary: {
    averageDuration: number;
    p50: number;
    p95: number;
    p99: number;
    maxDuration: number;
  }
}
```

**hexdi://tracing/summary**

**URI:** `hexdi://tracing/summary`

**Parameters:**

- `last` (optional): Time window (default: "1h")

**Response Schema:**

```typescript
{
  totalSpans: number;
  successfulSpans: number;
  errorSpans: number;
  averageDuration: number;
  p50: number;
  p95: number;
  p99: number;
  byPort: Record<
    string,
    {
      count: number;
      errors: number;
      averageDuration: number;
    }
  >;
}
```

#### 4.2.5 MCP Resources — Libraries

**Resource URIs:**

- `hexdi://flow/machines` — Flow state machines (if flow library exists)
- `hexdi://store/state` — Store state (if store library exists)
- `hexdi://query/cache` — Query cache (if query library exists)
- `hexdi://saga/workflows` — Saga workflows (if saga library exists)
- `hexdi://agent/tools` — Agent tools (if agent library exists)

**Note:** These resources depend on Phase 3 libraries (store, query, saga, agent) being implemented. They are documented here for completeness but will be implemented when those libraries exist.

**hexdi://flow/machines** (Future)

**URI:** `hexdi://flow/machines`

**Response Schema:**

```typescript
{
  machines: Array<{
    id: string;
    name: string;
    currentState: string;
    validTransitions: string[];
    activities: Array<{
      name: string;
      status: "running" | "completed" | "failed";
    }>;
  }>;
}
```

**hexdi://store/state** (Future)

**URI:** `hexdi://store/state`

**Response Schema:**

```typescript
{
  stores: Array<{
    name: string;
    value: unknown;
    subscribers: number;
    derivations: string[];
  }>;
}
```

**hexdi://query/cache** (Future)

**URI:** `hexdi://query/cache`

**Response Schema:**

```typescript
{
  cache: Array<{
    key: string;
    data: unknown;
    stale: boolean;
    lastFetched: number;
    ttl?: number;
  }>;
}
```

**hexdi://saga/workflows** (Future)

**URI:** `hexdi://saga/workflows`

**Response Schema:**

```typescript
{
  workflows: Array<{
    id: string;
    name: string;
    currentStep: string;
    status: "running" | "completed" | "failed" | "compensating";
    compensationsExecuted: string[];
  }>;
}
```

**hexdi://agent/tools** (Future)

**URI:** `hexdi://agent/tools`

**Response Schema:**

```typescript
{
  tools: Array<{
    name: string;
    description: string;
    schema: Record<string, unknown>; // JSON Schema
    invocations: number;
  }>;
}
```

#### 4.2.6 MCP Tools

**Tool URIs:**

- `hexdi://resolve` — Resolve a port and return result with trace
- `hexdi://inspect` — Inspect container state with query
- `hexdi://createScope` — Create a new scope
- `hexdi://invalidateQuery` — Invalidate query cache (if query library exists)

**hexdi://resolve**

**Tool Name:** `hexdi://resolve`

**Description:** Resolves a port from the container and returns the resolution result with full trace.

**Input Schema:**

```typescript
{
  port: string; // Port name to resolve
  containerId?: string; // Optional container ID (default: root)
  scopeName?: string; // Optional scope name for scoped ports
}
```

**Output Schema:**

```typescript
{
  success: boolean;
  value?: unknown; // Resolved value (if successful)
  error?: string; // Error message (if failed)
  trace: {
    traceId: string;
    spans: Array<{
      spanId: string;
      name: string;
      duration: number;
      status: "ok" | "error";
    }>;
  };
}
```

**Example:**

```json
Input:
{
  "port": "AuthService"
}

Output:
{
  "success": true,
  "value": "[AuthService instance]",
  "trace": {
    "traceId": "abc123",
    "spans": [
      {
        "spanId": "span1",
        "name": "resolve:AuthService",
        "duration": 2.4,
        "status": "ok"
      }
    ]
  }
}
```

**hexdi://inspect**

**Tool Name:** `hexdi://inspect`

**Description:** Inspects container state with a natural language query.

**Input Schema:**

```typescript
{
  query: string; // Natural language query
  containerId?: string;
}
```

**Output Schema:**

```typescript
{
  answer: string; // Natural language answer
  data: unknown; // Structured data supporting the answer
}
```

**Example:**

```json
Input:
{
  "query": "What services depend on DatabasePort?"
}

Output:
{
  "answer": "3 services depend on DatabasePort: UserRepo, OrderRepo, and InventoryRepo.",
  "data": {
    "dependents": ["UserRepo", "OrderRepo", "InventoryRepo"],
    "graph": { /* dependency graph subset */ }
  }
}
```

**hexdi://createScope**

**Tool Name:** `hexdi://createScope`

**Description:** Creates a new scope in the container.

**Input Schema:**

```typescript
{
  name: string; // Scope name
  containerId?: string; // Optional container ID
}
```

**Output Schema:**

```typescript
{
  success: boolean;
  scopeName: string;
  error?: string;
}
```

**hexdi://invalidateQuery** (Future)

**Tool Name:** `hexdi://invalidateQuery`

**Description:** Invalidates a query cache entry (requires query library).

**Input Schema:**

```typescript
{
  key: string; // Query cache key
}
```

#### 4.2.7 MCP Prompts

**Prompt Templates:**

- `hexdi://prompt/debug-service` — Debug a service with full context
- `hexdi://prompt/analyze-error` — Analyze an error with trace context
- `hexdi://prompt/optimize-graph` — Get optimization suggestions

**hexdi://prompt/debug-service**

**Prompt Name:** `hexdi://prompt/debug-service`

**Description:** Provides a debug template with full service context.

**Arguments:**

- `serviceName`: Name of the service to debug

**Template:**

```
You are debugging the service: {{serviceName}}

Service Information:
- Port: {{portName}}
- Lifetime: {{lifetime}}
- Dependencies: {{dependencies}}
- Dependents: {{dependents}}

Current State:
- Instantiated: {{instantiated}}
- Resolution Status: {{resolutionStatus}}

Recent Activity:
{{recentSpans}}

Error History:
{{errorHistory}}

Please analyze this service and suggest debugging steps.
```

**hexdi://prompt/analyze-error**

**Prompt Name:** `hexdi://prompt/analyze-error`

**Description:** Analyzes an error with full trace context.

**Arguments:**

- `traceId`: Trace ID of the error
- `spanId`: Span ID of the error (optional)

**Template:**

```
You are analyzing an error in trace: {{traceId}}

Error Details:
- Error: {{errorMessage}}
- Service: {{serviceName}}
- Timestamp: {{timestamp}}

Full Trace:
{{traceSpans}}

Dependency Chain:
{{dependencyChain}}

Please analyze the root cause and suggest fixes.
```

#### 4.2.8 createMcpServer() Factory

**API:**

```typescript
interface McpServerOptions {
  container: InternalAccessible; // Container with inspection API
  name?: string; // Server name (default: "HexDI MCP Server")
  version?: string; // Server version
}

function createMcpServer(options: McpServerOptions): Server;
```

**Usage:**

```typescript
import { createMcpServer } from "@hex-di/mcp";
import { createInspector } from "@hex-di/runtime";

const inspector = createInspector(container);
const server = createMcpServer({
  container: inspector.getContainer(),
  name: "MyApp MCP Server",
  version: "1.0.0",
});

// Start server (implementation depends on MCP SDK)
server.start();
```

#### 4.2.9 Integration Testing

**Test Coverage:**

- Resources return correct data structures
- Tools execute correctly and return expected results
- Prompts generate correct templates with context
- Error handling (invalid URIs, missing containers, etc.)
- Performance (large graphs, many spans, etc.)

---

### 4.3 A2A Protocol (0% → 100%) — NEW PACKAGE

**Status:** Not started. This is a new package to be created.

**Package:** `packages/a2a/`

**Purpose:** Expose HexDI application as an A2A agent with skills for agent-to-agent collaboration.

#### 4.3.1 Package Setup

**Dependencies:**

- A2A protocol SDK (to be determined — may be custom implementation)
- `@hex-di/runtime` — Container inspection
- `@hex-di/graph` — Graph topology
- `@hex-di/tracing` — Tracing data

**Package Structure:**

```
packages/a2a/
├── src/
│   ├── index.ts                    # Public API: createA2AAgent()
│   ├── agent-card.ts               # Agent Card generation
│   ├── skills/
│   │   ├── inspect-architecture.ts # Architecture inspection skill
│   │   ├── diagnose-issue.ts        # Issue diagnosis skill
│   │   ├── state-inspector.ts      # State inspection skill
│   │   └── tool-executor.ts        # Tool execution skill
│   ├── protocol/
│   │   ├── task-handler.ts         # A2A task protocol handling
│   │   └── streaming.ts           # Streaming support
│   └── types.ts                    # A2A-specific types
├── tests/
│   ├── agent-card.test.ts
│   ├── skills.test.ts
│   └── protocol.test.ts
└── package.json
```

#### 4.3.2 Agent Card Generation

**Function:** `generateAgentCard(container, options?)`

**Agent Card Schema:**

```typescript
{
  name: string;
  description: string;
  url: string; // A2A endpoint URL
  capabilities: {
    streaming: boolean;
    // Other capabilities
  }
  skills: Array<{
    id: string;
    name: string;
    description: string;
    examples: string[];
    inputSchema?: Record<string, unknown>; // JSON Schema
    outputSchema?: Record<string, unknown>; // JSON Schema
  }>;
}
```

**Example Agent Card:**

```json
{
  "name": "MyApp Runtime",
  "description": "Self-aware application with full introspection powered by HexDI",
  "url": "https://myapp.com/a2a/v1",
  "capabilities": {
    "streaming": true
  },
  "skills": [
    {
      "id": "inspect-architecture",
      "name": "Application Architecture Inspector",
      "description": "Returns complete dependency graph, lifetimes, and structural analysis",
      "examples": [
        "What services exist?",
        "Show me the dependency chain for AuthService",
        "What's the complexity score of this graph?"
      ],
      "inputSchema": {
        "type": "object",
        "properties": {
          "query": {
            "type": "string",
            "description": "Natural language query about the architecture"
          }
        }
      },
      "outputSchema": {
        "type": "object",
        "properties": {
          "answer": { "type": "string" },
          "data": { "type": "object" }
        }
      }
    },
    {
      "id": "diagnose-issue",
      "name": "Runtime Diagnostician",
      "description": "Analyzes tracing data to identify failure points and suggest fixes",
      "examples": [
        "Why did the checkout flow fail?",
        "What's causing slow response times?",
        "Show me all errors in the last hour"
      ]
    },
    {
      "id": "state-inspector",
      "name": "Application State Inspector",
      "description": "Reports current state of all managed state, cached data, and active workflows",
      "examples": [
        "What's the current user session state?",
        "Show me all stale cached queries",
        "What workflows are in progress?"
      ]
    },
    {
      "id": "tool-executor",
      "name": "Tool Executor",
      "description": "Executes tools on the application (resolve, createScope, invalidateQuery, etc.)",
      "examples": [
        "Resolve AuthService",
        "Create a new scope named 'test-scope'",
        "Invalidate the user query cache"
      ]
    },
    {
      "id": "diagnose-http-issue",
      "name": "Diagnose HTTP Issue",
      "description": "Analyzes HTTP request history, error patterns, circuit breaker state, and latency trends",
      "examples": [
        "Why are requests to the payments API failing?",
        "What is causing high latency on outbound HTTP calls?",
        "Are there any circuit breakers tripped?"
      ]
    },
    {
      "id": "http-health-check",
      "name": "HTTP Health Check",
      "description": "Reports health status of all HTTP endpoints including circuit breakers, error rates, and latency",
      "examples": [
        "What is the health of our HTTP clients?",
        "Are all external APIs healthy?",
        "Show me HTTP client health status"
      ]
    }
  ]
}
```

#### 4.3.3 Skills

**inspect-architecture**

**Skill ID:** `inspect-architecture`

**Description:** Returns complete dependency graph, lifetimes, and structural analysis.

**Input:**

```typescript
{
  query: string; // Natural language query
  filter?: {
    category?: string;
    tag?: string;
    port?: string;
  };
}
```

**Output:**

```typescript
{
  answer: string; // Natural language answer
  data: {
    graph?: GraphTopology;
    complexity?: ComplexityMetrics;
    suggestions?: Suggestion[];
  };
}
```

**diagnose-issue**

**Skill ID:** `diagnose-issue`

**Description:** Analyzes tracing data to identify failure points and suggest fixes.

**Input:**

```typescript
{
  query: string; // Natural language query about the issue
  timeWindow?: string; // e.g., "24h", "1h"
  traceId?: string; // Specific trace ID
}
```

**Output:**

```typescript
{
  answer: string; // Diagnosis and recommendations
  data: {
    errors?: ErrorSpan[];
    slowSpans?: SlowSpan[];
    rootCause?: string;
    recommendations?: string[];
  };
}
```

**state-inspector**

**Skill ID:** `state-inspector`

**Description:** Reports current state of all managed state, cached data, and active workflows.

**Input:**

```typescript
{
  query: string; // Natural language query about state
  include?: ("runtime" | "store" | "query" | "saga" | "flow")[];
}
```

**Output:**

```typescript
{
  answer: string;
  data: {
    runtime?: RuntimeSnapshot;
    store?: StoreState; // If store library exists
    query?: QueryCache; // If query library exists
    saga?: SagaWorkflows; // If saga library exists
    flow?: FlowMachines; // If flow library exists
  };
}
```

**tool-executor**

**Skill ID:** `tool-executor`

**Description:** Executes tools on the application.

**Input:**

```typescript
{
  tool: "resolve" | "createScope" | "invalidateQuery" | "retryStep";
  args: Record<string, unknown>; // Tool-specific arguments
}
```

**Output:**

```typescript
{
  success: boolean;
  result?: unknown;
  error?: string;
  trace?: TraceData;
}
```

**diagnose-http-issue** _(contributed by `@hex-di/http-client`)_

**Skill ID:** `diagnose-http-issue`

**Description:** Analyzes HTTP request history, error patterns, circuit breaker state, and latency trends to diagnose connectivity and performance issues with outbound HTTP endpoints.

**Input:**

```typescript
{
  urlPattern?: string; // Optional URL pattern to scope the diagnosis (substring match)
  timeRangeMs?: number; // How far back to analyze in milliseconds. Default: 300000 (5 minutes)
}
```

**Output:**

```typescript
{
  answer: string; // Natural language diagnosis
  data: {
    health: HttpClientHealth;
    errorRate: number;
    latencyPercentiles: { p50: number; p95: number; p99: number };
    circuitBreakers: Record<string, CircuitBreakerSnapshot>;
    recentErrors: readonly HttpHistoryEntry[];
    recommendations: string[];
  };
}
```

**http-health-check** _(contributed by `@hex-di/http-client`)_

**Skill ID:** `http-health-check`

**Description:** Reports the current health status of all HTTP endpoints, including circuit breaker states, error rates, latency percentiles, and rate limiter utilization.

**Input:**

```typescript
{
  includeHistory?: boolean; // Whether to include recent request history. Default: false
}
```

**Output:**

```typescript
{
  answer: string; // Summary health report
  data: {
    health: HttpClientHealth;
    snapshot: HttpClientSnapshot;
    combinatorChain: readonly CombinatorInfo[];
  };
}
```

#### 4.3.4 A2A Task Protocol Handling

**Task Handler:**

- Receives A2A task requests
- Routes to appropriate skill
- Executes skill with container context
- Returns structured response
- Supports streaming for long-running tasks

**Streaming Support:**

- For tasks that may take time (e.g., analyzing large traces)
- Streams intermediate results
- Allows cancellation

#### 4.3.5 Integration Testing

**Test Coverage:**

- Agent Card generation from container
- Skills execute correctly
- Task protocol handling
- Streaming support
- Error handling

---

### 4.4 REST Diagnostic API (0% → 100%)

**Status:** Not started. This will be added to `integrations/hono`.

**Location:** `integrations/hono/src/diagnostic-routes.ts`

**Purpose:** Expose HexDI application knowledge through REST endpoints for human-readable inspection.

#### 4.4.1 createDiagnosticRoutes() Function

**API:**

```typescript
interface DiagnosticRoutesOptions {
  container: InternalAccessible;
  prefix?: string; // Route prefix (default: "/hexdi")
  auth?: {
    type: "api-key" | "jwt";
    apiKey?: string; // For api-key auth
    jwtSecret?: string; // For JWT auth
  };
  cors?: {
    origin?: string | string[];
    credentials?: boolean;
  };
}

function createDiagnosticRoutes(options: DiagnosticRoutesOptions): Hono;
```

**Usage:**

```typescript
import { createDiagnosticRoutes } from "@hex-di/hono";
import { createInspector } from "@hex-di/runtime";

const inspector = createInspector(container);
const diagnosticRoutes = createDiagnosticRoutes({
  container: inspector.getContainer(),
  prefix: "/hexdi",
  auth: {
    type: "api-key",
    apiKey: process.env.HEXDI_API_KEY,
  },
  cors: {
    origin: ["https://myapp.com"],
    credentials: true,
  },
});

app.route("/hexdi", diagnosticRoutes);
```

#### 4.4.2 Endpoints

**GET /hexdi/graph**

**Description:** Returns the complete dependency graph.

**Query Parameters:**

- `filter` (optional): Filter by category, tag, or port name
  - Example: `?filter=category:auth`

**Response:**

```json
{
  "ports": [
    {
      "name": "AuthService",
      "lifetime": "singleton",
      "dependsOn": ["UserRepo", "TokenService"],
      "category": "auth",
      "tags": ["security"]
    }
  ],
  "edges": [
    {
      "from": "AuthService",
      "to": "UserRepo",
      "type": "required"
    }
  ],
  "metrics": {
    "totalPorts": 24,
    "maxDepth": 4,
    "complexityScore": 35
  }
}
```

**GET /hexdi/snapshot**

**Description:** Returns current container state snapshot.

**Query Parameters:**

- `containerId` (optional): Specific container ID

**Response:**

```json
{
  "containerId": "root",
  "containerName": "App Root",
  "phase": "running",
  "isDisposed": false,
  "singletons": [
    {
      "portName": "AuthService",
      "instantiated": true
    }
  ],
  "scopes": [
    {
      "name": "request-123",
      "services": ["UserRepo", "SessionService"],
      "children": []
    }
  ]
}
```

**GET /hexdi/scopes**

**Description:** Returns active scope hierarchy.

**Query Parameters:**

- `containerId` (optional): Specific container ID

**Response:**

```json
{
  "scopeTree": {
    "name": "root",
    "type": "container",
    "services": ["AuthService", "ConfigService"],
    "children": [
      {
        "name": "request-123",
        "type": "scope",
        "services": ["UserRepo", "SessionService"],
        "children": []
      }
    ]
  }
}
```

**GET /hexdi/traces**

**Description:** Returns recent tracing spans.

**Query Parameters:**

- `limit` (optional): Number of spans (default: 100)
- `port` (optional): Filter by port name
- `traceId` (optional): Filter by trace ID
- `errors` (optional): Only error spans (`?errors=true`)
- `slow` (optional): Only slow spans (`?slow=true&threshold=100`)

**Response:**

```json
{
  "spans": [
    {
      "traceId": "abc123",
      "spanId": "span1",
      "name": "resolve:AuthService",
      "portName": "AuthService",
      "startTime": 1704729600000,
      "endTime": 1704729600002,
      "duration": 2,
      "status": "ok",
      "attributes": {
        "hex-di.port.name": "AuthService",
        "hex-di.resolution.cached": false
      }
    }
  ],
  "total": 100
}
```

**GET /hexdi/flow** (Future)

**Description:** Returns flow state machines (if flow library exists).

**Response:**

```json
{
  "machines": [
    {
      "id": "checkout-flow",
      "name": "Checkout Flow",
      "currentState": "processing-payment",
      "validTransitions": ["complete", "cancel"],
      "activities": [
        {
          "name": "validate-order",
          "status": "completed"
        }
      ]
    }
  ]
}
```

**GET /hexdi/store** (Future)

**Description:** Returns store state (if store library exists).

**Response:**

```json
{
  "stores": [
    {
      "name": "userSession",
      "value": {
        "userId": "123",
        "loggedIn": true
      },
      "subscribers": 5,
      "derivations": ["userName", "userPermissions"]
    }
  ]
}
```

**GET /hexdi/health**

**Description:** Returns health status of the application.

**Response:**

```json
{
  "status": "healthy",
  "checks": {
    "container": {
      "status": "ok",
      "phase": "running",
      "isDisposed": false
    },
    "tracing": {
      "status": "ok",
      "spansCollected": 1234,
      "errorRate": 0.01
    }
  },
  "timestamp": 1704729600000
}
```

**GET /hexdi/metrics**

**Description:** Returns metrics in Prometheus format (optional).

**Response:**

```
# HELP hexdi_resolutions_total Total number of resolutions
# TYPE hexdi_resolutions_total counter
hexdi_resolutions_total{port="AuthService"} 1234

# HELP hexdi_resolution_duration_ms Resolution duration in milliseconds
# TYPE hexdi_resolution_duration_ms histogram
hexdi_resolution_duration_ms_bucket{port="AuthService",le="10"} 1000
hexdi_resolution_duration_ms_bucket{port="AuthService",le="50"} 1200
hexdi_resolution_duration_ms_bucket{port="AuthService",le="100"} 1234
```

#### 4.4.3 Authentication Middleware

**API Key Authentication:**

```typescript
// Header: X-HexDI-API-Key: <api-key>
```

**JWT Authentication:**

```typescript
// Header: Authorization: Bearer <jwt-token>
```

**Middleware:**

- Validates API key or JWT token
- Returns 401 if invalid
- Optional (can be disabled for development)

#### 4.4.4 CORS Configuration

**Options:**

- `origin`: Allowed origins (string or array)
- `credentials`: Allow credentials (cookies, auth headers)

**Example:**

```typescript
cors: {
  origin: ['https://myapp.com', 'https://dev.myapp.com'],
  credentials: true,
}
```

---

### 4.5 DevTools Dashboard (10% → 100%)

**Status:** 10% complete (static graph visualizer exists, no runtime connection).

**Package:** `packages/devtools/`

**Purpose:** Visual dashboard for inspecting all HexDI application state.

#### 4.5.1 Package Setup

**Dependencies:**

- React (for UI components)
- `@hex-di/runtime` — Container inspection
- `@hex-di/graph` — Graph topology
- `@hex-di/tracing` — Tracing data
- WebSocket or SSE (for live updates)

**Package Structure:**

```
packages/devtools/
├── src/
│   ├── index.ts                    # Public API: createDevToolsPanel()
│   ├── dashboard/
│   │   ├── dashboard.tsx           # Main dashboard component
│   │   ├── graph-view.tsx          # Graph visualization
│   │   ├── runtime-view.tsx       # Runtime state view
│   │   ├── tracing-view.tsx       # Tracing timeline
│   │   ├── scope-tree-view.tsx    # Scope tree visualization
│   │   ├── flow-view.tsx          # Flow machine state (future)
│   │   └── store-view.tsx         # Store state inspector (future)
│   ├── adapters/
│   │   └── graphviz-adapter.ts    # HexDI graph → GraphViz adapter
│   ├── websocket/
│   │   └── client.ts              # WebSocket client for live updates
│   └── types.ts
├── tests/
└── package.json
```

#### 4.5.2 HexDI-to-GraphViz Adapter

**Function:** Converts HexDI graph to GraphViz DOT format.

**Location:** `packages/devtools/src/adapters/graphviz-adapter.ts`

**API:**

```typescript
function convertToGraphViz(graph: ContainerGraphData): string;
```

**Output:** GraphViz DOT format string

**Features:**

- Nodes represent ports
- Edges represent dependencies
- Colors indicate lifetimes (singleton=blue, scoped=green, transient=orange)
- Clusters group by category
- Highlights cycles, captive dependencies, orphans

#### 4.5.3 Runtime State Overlay

**Features:**

- Shows instantiated vs pending services
- Highlights active scopes
- Shows singleton cache contents
- Displays container hierarchy
- Real-time updates via WebSocket/SSE

**UI Components:**

- Service list with instantiation status
- Scope tree with active scopes highlighted
- Singleton cache viewer
- Container hierarchy tree

#### 4.5.4 Tracing Timeline/Waterfall View

**Features:**

- Timeline view of spans
- Waterfall view showing parent-child relationships
- Filter by port, trace ID, time range
- Highlight errors and slow spans
- Click span to see details (attributes, events, links)

**UI Components:**

- Timeline chart (horizontal bars)
- Waterfall chart (nested bars)
- Span detail panel
- Filter controls

#### 4.5.5 Scope Tree Visualization

**Features:**

- Visual tree of scope hierarchy
- Shows services in each scope
- Highlights active scopes
- Shows scope lifecycle (created, active, disposed)

**UI Components:**

- Tree view component
- Scope detail panel
- Lifecycle indicators

#### 4.5.6 Flow Machine State Diagram (Future)

**Features:**

- Visual state machine diagram
- Current state highlighted
- Valid transitions shown
- Activity status (running, completed, failed)

**UI Components:**

- State machine diagram
- State detail panel
- Activity list

#### 4.5.7 Store State Inspector (Future)

**Features:**

- List of all stores
- Current values
- Subscriber count
- Derivations graph

**UI Components:**

- Store list
- Value viewer
- Dependency graph

#### 4.5.8 Live Updates

**WebSocket/SSE Support:**

- Real-time updates for:
  - Container state changes
  - New spans
  - Scope creation/disposal
  - Store updates (if store library exists)
  - Flow state transitions (if flow library exists)

**Implementation:**

- WebSocket server in `packages/devtools/src/websocket/server.ts`
- Client in `packages/devtools/src/websocket/client.ts`
- Event types: `container-updated`, `span-created`, `scope-created`, etc.

#### 4.5.9 Embeddable Panel or Standalone Dashboard

**Embeddable Panel:**

- React component that can be embedded in any app
- `<HexDIDevTools container={container} />`
- Optional WebSocket URL for live updates

**Standalone Dashboard:**

- Standalone web app
- Connects to application via REST API or WebSocket
- Can inspect remote applications

**API:**

```typescript
interface DevToolsOptions {
  container: InternalAccessible;
  mode?: "embedded" | "standalone";
  websocketUrl?: string;
}

function createDevToolsPanel(options: DevToolsOptions): React.Component;
```

---

## Protocol Convergence Diagram

```
                    ┌─────────────────────────────────────────┐
                    │      HexDI Container                    │
                    │      (Self-Aware Runtime)                │
                    │                                          │
                    │  ┌──────────────────────────────────┐  │
                    │  │   Central Inspection API          │  │
                    │  │                                    │  │
                    │  │  • Graph Topology                  │  │
                    │  │  • Runtime State                   │  │
                    │  │  • Tracing Data                    │  │
                    │  │  • Store State (future)            │  │
                    │  │  • Query Cache (future)            │  │
                    │  │  • Saga Workflows (future)         │  │
                    │  │  • Flow Machines (future)          │  │
                    │  │  • Agent Tools (future)            │  │
                    │  └──────────────────────────────────┘  │
                    └──────────────┬─────────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │               │
        ┌───────────▼──────┐  ┌──▼──────┐  ┌─────▼────────┐
        │   MCP Server      │  │ REST API│  │ DevTools     │
        │                   │  │         │  │ Dashboard    │
        │  Resources:       │  │ GET     │  │              │
        │  • graph/*        │  │ /hexdi/ │  │ • Graph View │
        │  • runtime/*      │  │ graph   │  │ • Runtime    │
        │  • tracing/*      │  │ /snapshot│ │ • Tracing    │
        │  • flow/*         │  │ /scopes │  │ • Scopes     │
        │  • store/*        │  │ /traces │  │ • Flow       │
        │  • query/*        │  │ /health │  │ • Store      │
        │  • saga/*         │  │ /metrics│  │              │
        │                   │  │         │  │ Live Updates │
        │  Tools:           │  │ Auth:   │  │ via WS/SSE   │
        │  • resolve        │  │ API Key │  │              │
        │  • inspect        │  │ JWT     │  │              │
        │  • createScope    │  │         │  │              │
        │  • invalidateQuery│  │ CORS    │  │              │
        │                   │  │         │  │              │
        │  Prompts:         │  │         │  │              │
        │  • debug-service  │  │         │  │              │
        │  • analyze-error  │  │         │  │              │
        └───────────┬───────┘  └─────────┘  └──────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
  ┌─────▼─────┐ ┌──▼──────┐ ┌──▼────────┐
  │ AI Dev    │ │ Browser │ │ Observ-   │
  │ Tools     │ │ (Human) │ │ ability   │
  │           │ │         │ │ Platform  │
  │ Claude    │ │         │ │           │
  │ Code      │ │         │ │ Jaeger    │
  │ Cursor    │ │         │ │ Zipkin    │
  │           │ │         │ │ Datadog   │
  │           │ │         │ │ Grafana   │
  └───────────┘ └─────────┘ └───────────┘
        │
  ┌─────▼────────┐
  │ A2A Agent    │
  │              │
  │ Skills:      │
  │ • inspect-   │
  │   architecture│
  │ • diagnose-  │
  │   issue      │
  │ • state-     │
  │   inspector  │
  │ • tool-      │
  │   executor   │
  └──────────────┘
```

**Key Points:**

- All protocols read from the same Central Inspection API
- MCP and A2A target AI tools/agents
- REST API targets human developers
- DevTools Dashboard provides visual inspection
- OTel Export (already done) targets observability platforms
- Future libraries (store, query, saga, flow, agent) will add more data sources

---

## Dependency Map

### Phase 3 Prerequisites

**Required for Phase 4:**

1. **@hex-di/runtime** (✅ Complete)
   - Container inspection API
   - Scope tree API
   - Snapshot API
   - Used by: MCP resources (runtime/\*), REST API (/snapshot, /scopes), DevTools (runtime view)

2. **@hex-di/graph** (✅ Complete)
   - Graph topology API
   - Complexity analysis
   - Suggestions API
   - Used by: MCP resources (graph/\*), REST API (/graph), DevTools (graph view)

3. **@hex-di/tracing** (✅ Complete)
   - Span collection API
   - Trace query API
   - Used by: MCP resources (tracing/\*), REST API (/traces), DevTools (tracing view)

**Optional (Future Phase 3 Libraries):**

4. **@hex-di/store** (❌ Not started)
   - Store state API
   - Used by: MCP resources (store/\*), REST API (/store), DevTools (store view)

5. **@hex-di/query** (❌ Not started)
   - Query cache API
   - Used by: MCP resources (query/\*), REST API (/query), DevTools (query view)

6. **@hex-di/saga** (❌ Not started)
   - Saga workflow API
   - Used by: MCP resources (saga/\*), REST API (/saga), DevTools (saga view)

7. **@hex-di/flow** (✅ Complete — exists as `libs/flow/`)
   - Flow machine API
   - Used by: MCP resources (flow/\*), REST API (/flow), DevTools (flow view)

8. **@hex-di/agent** (❌ Not started)
   - Agent tools API
   - Used by: MCP resources (agent/\*), REST API (/agent), DevTools (agent view)

**Note:** Phase 4 can be implemented incrementally. MCP resources, REST endpoints, and DevTools views for future libraries can be added when those libraries are implemented.

---

## Execution Order

### Wave 1: REST API (Foundation)

**Rationale:** REST API is the simplest to implement and provides immediate value for human developers. It also serves as a foundation for testing other protocols.

**Tasks:**

1. Create `createDiagnosticRoutes()` in `integrations/hono`
2. Implement endpoints: `/graph`, `/snapshot`, `/scopes`, `/traces`, `/health`, `/metrics`
3. Add authentication middleware (API key, JWT)
4. Add CORS configuration
5. Write integration tests

**Estimated Effort:** 3-5 days

**Dependencies:** ✅ @hex-di/runtime, ✅ @hex-di/graph, ✅ @hex-di/tracing

### Wave 2: MCP Server

**Rationale:** MCP is the primary protocol for AI dev tools. Once REST API is working, MCP resources can reuse similar logic.

**Tasks:**

1. Create `packages/mcp/` package
2. Set up MCP SDK integration
3. Implement graph resources (topology, complexity, suggestions)
4. Implement runtime resources (snapshot, scopes, ports)
5. Implement tracing resources (recent, errors, slow, summary)
6. Implement MCP tools (resolve, inspect, createScope)
7. Implement MCP prompts (debug-service, analyze-error)
8. Write integration tests

**Estimated Effort:** 5-7 days

**Dependencies:** ✅ REST API (for testing patterns), ✅ @hex-di/runtime, ✅ @hex-di/graph, ✅ @hex-di/tracing

### Wave 3: DevTools Dashboard

**Rationale:** DevTools provides visual inspection, which is valuable for debugging. Can reuse REST API or connect directly to container.

**Tasks:**

1. Create `packages/devtools/` package
2. Implement HexDI-to-GraphViz adapter
3. Build graph view component
4. Build runtime state overlay
5. Build tracing timeline/waterfall view
6. Build scope tree visualization
7. Add WebSocket/SSE for live updates
8. Create embeddable panel component
9. Write integration tests

**Estimated Effort:** 7-10 days

**Dependencies:** ✅ REST API (optional, for standalone mode), ✅ @hex-di/runtime, ✅ @hex-di/graph, ✅ @hex-di/tracing

### Wave 4: A2A Protocol

**Rationale:** A2A enables agent-to-agent collaboration. Can reuse MCP resource logic.

**Tasks:**

1. Create `packages/a2a/` package
2. Implement Agent Card generation
3. Implement skills (inspect-architecture, diagnose-issue, state-inspector, tool-executor)
4. Implement A2A task protocol handling
5. Add streaming support
6. Write integration tests

**Estimated Effort:** 5-7 days

**Dependencies:** ✅ MCP Server (for resource patterns), ✅ @hex-di/runtime, ✅ @hex-di/graph, ✅ @hex-di/tracing

**Total Estimated Effort:** 20-29 days

---

## Effort Estimation Table

| Task                       | Size | Days     | Prerequisites                                   | Notes                 |
| -------------------------- | ---- | -------- | ----------------------------------------------- | --------------------- |
| **Wave 1: REST API**       |      |          |                                                 |                       |
| createDiagnosticRoutes()   | M    | 1        | @hex-di/runtime, @hex-di/graph, @hex-di/tracing | Foundation function   |
| GET /hexdi/graph           | S    | 0.5      | @hex-di/graph                                   | Reuse graph API       |
| GET /hexdi/snapshot        | S    | 0.5      | @hex-di/runtime                                 | Reuse snapshot API    |
| GET /hexdi/scopes          | S    | 0.5      | @hex-di/runtime                                 | Reuse scope tree API  |
| GET /hexdi/traces          | M    | 1        | @hex-di/tracing                                 | Query spans API       |
| GET /hexdi/health          | S    | 0.5      | All                                             | Simple aggregation    |
| GET /hexdi/metrics         | M    | 1        | @hex-di/tracing                                 | Prometheus format     |
| Auth middleware            | M    | 1        | None                                            | API key + JWT         |
| CORS config                | S    | 0.5      | None                                            | Simple middleware     |
| Integration tests          | M    | 1        | All endpoints                                   | Test all routes       |
| **Wave 1 Subtotal**        |      | **7.5**  |                                                 |                       |
| **Wave 2: MCP Server**     |      |          |                                                 |                       |
| Package setup              | S    | 0.5      | None                                            | New package           |
| MCP SDK integration        | M    | 1        | @modelcontextprotocol/sdk                       | Learn SDK             |
| Graph resources            | M    | 1.5      | @hex-di/graph                                   | 3 resources           |
| Runtime resources          | M    | 1.5      | @hex-di/runtime                                 | 3 resources           |
| Tracing resources          | M    | 1.5      | @hex-di/tracing                                 | 4 resources           |
| MCP tools                  | M    | 1.5      | All resources                                   | 4 tools               |
| MCP prompts                | S    | 1        | All resources                                   | 2 prompts             |
| Integration tests          | M    | 1.5      | All components                                  | Test resources/tools  |
| **Wave 2 Subtotal**        |      | **10**   |                                                 |                       |
| **Wave 3: DevTools**       |      |          |                                                 |                       |
| Package setup              | S    | 0.5      | React                                           | New package           |
| GraphViz adapter           | M    | 1        | @hex-di/graph                                   | Convert to DOT        |
| Graph view component       | M    | 1.5      | GraphViz adapter                                | React component       |
| Runtime overlay            | M    | 1.5      | @hex-di/runtime                                 | Service/scope display |
| Tracing timeline           | L    | 2        | @hex-di/tracing                                 | Timeline + waterfall  |
| Scope tree view            | M    | 1        | @hex-di/runtime                                 | Tree visualization    |
| WebSocket/SSE              | M    | 1.5      | All views                                       | Live updates          |
| Embeddable panel           | M    | 1        | All components                                  | React component       |
| Integration tests          | M    | 1        | All components                                  | Test dashboard        |
| **Wave 3 Subtotal**        |      | **11**   |                                                 |                       |
| **Wave 4: A2A Protocol**   |      |          |                                                 |                       |
| Package setup              | S    | 0.5      | A2A SDK (TBD)                                   | New package           |
| Agent Card generation      | M    | 1        | @hex-di/runtime, @hex-di/graph                  | Generate card         |
| inspect-architecture skill | M    | 1        | @hex-di/graph                                   | Reuse MCP logic       |
| diagnose-issue skill       | M    | 1        | @hex-di/tracing                                 | Reuse MCP logic       |
| state-inspector skill      | M    | 1        | @hex-di/runtime                                 | Reuse MCP logic       |
| tool-executor skill        | M    | 1        | All                                             | Execute tools         |
| Task protocol handler      | M    | 1.5      | All skills                                      | Route tasks           |
| Streaming support          | M    | 1        | Task handler                                    | Stream results        |
| Integration tests          | M    | 1        | All components                                  | Test skills           |
| **Wave 4 Subtotal**        |      | **9**    |                                                 |                       |
| **TOTAL**                  |      | **37.5** |                                                 | ~38 days              |

**Size Legend:**

- S = Small (0.5-1 day)
- M = Medium (1-2 days)
- L = Large (2-3 days)

**Note:** Estimates assume:

- Developer familiar with HexDI codebase
- MCP and A2A SDKs are well-documented
- No major blockers or architectural changes needed
- Testing is included in each task

---

## Summary

Phase 4: COMMUNICATION transforms HexDI from a self-aware system into a **communicative system**. The application exposes its complete self-knowledge through standardized protocols:

- **MCP Server** — AI dev tools can query the application directly
- **A2A Protocol** — Agents can collaborate with the application as a peer
- **REST API** — Human developers can inspect the application via HTTP
- **DevTools Dashboard** — Visual inspection of all application state
- **OTel Export** — Already complete, exports traces to observability platforms

**Current Status:** 40% complete (OTel export done, MCP/A2A/REST/DevTools missing)

**Next Steps:**

1. Implement REST API (Wave 1) — Foundation for other protocols
2. Implement MCP Server (Wave 2) — Primary protocol for AI tools
3. Implement DevTools Dashboard (Wave 3) — Visual inspection
4. Implement A2A Protocol (Wave 4) — Agent-to-agent collaboration

**Estimated Total Effort:** ~38 days

**Dependencies:** ✅ Phase 2 (AWARENESS) complete, ✅ Phase 3 (REPORTING) partially complete (tracing done, store/query/saga/agent pending)

Phase 4 can be implemented incrementally. Each wave provides independent value and can be shipped separately.
