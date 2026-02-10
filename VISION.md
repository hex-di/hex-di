# HexDI Vision: The Self-Aware Application

> _"Every library in the ecosystem isn't just doing its job -- it's also reporting what it knows to a central queryable system. The DI container stops being plumbing and becomes the application's nervous system."_

---

## Table of Contents

1. [The Problem: Blind Software](#1-the-problem-blind-software)
2. [The Analogy: Old Cars vs New Cars](#2-the-analogy-old-cars-vs-new-cars)
3. [The Vision: Applications That Know Themselves](#3-the-vision-applications-that-know-themselves)
4. [The Architecture: Nervous System Design](#4-the-architecture-nervous-system-design)
5. [The Ecosystem: Every Library Reports What It Knows](#5-the-ecosystem-every-library-reports-what-it-knows)
6. [The Protocols: Speaking to the Outside World](#6-the-protocols-speaking-to-the-outside-world)
7. [The Diagnostic Port: AI Plugs In](#7-the-diagnostic-port-ai-plugs-in)
8. [The Full Loop: Self-Aware Application in Action](#8-the-full-loop-self-aware-application-in-action)
9. [Why This Hasn't Existed Before](#9-why-this-hasnt-existed-before)
10. [Theoretical Foundations](#10-theoretical-foundations)
11. [The Roadmap: From Container to Consciousness](#11-the-roadmap-from-container-to-consciousness)

---

## 1. The Problem: Blind Software

Most software today is blind to itself.

An application made of services, state, data flows, and business logic has no idea what it is. It can't tell you what services it contains, how they connect, what state they're in, or why something failed. The knowledge exists -- scattered across source files, config files, runtime memory, and log streams -- but the application itself has no unified model of its own existence.

This creates a fundamental asymmetry:

```
 The developer knows the architecture.
 The deployment knows the infrastructure.
 The monitoring knows the metrics.

 The application knows nothing about itself.
```

When something breaks, humans and tools must reconstruct the application's self-knowledge from external artifacts: reading source code, parsing logs, tracing network calls, inspecting memory dumps. The application is a passive subject being examined, never an active participant in its own understanding.

This is the status quo. And it's about to become a serious problem.

---

## 2. The Analogy: Old Cars vs New Cars

### The Old Mechanic

Think about cars thirty years ago. Something goes wrong. You take it to a mechanic. He opens the hood, listens to the engine, wiggles some wires, checks the oil. He uses his experience and intuition to diagnose the problem. Sometimes he's right. Sometimes he replaces three parts before finding the actual issue.

The car is passive. It has no opinion about what's wrong with it. The mechanic works from the outside in.

```
  ┌──────────────┐                ┌──────────────────────┐
  │   Mechanic   │    looks at    │       Old Car        │
  │              │───────────────>│                      │
  │  Experience  │    listens to  │  Engine              │
  │  Intuition   │───────────────>│  Wires               │
  │  Guesswork   │    touches     │  Fluids              │
  │              │───────────────>│  Parts               │
  │              │                │                      │
  │  "I think    │                │  (knows nothing      │
  │   it's the   │                │   about itself)      │
  │   alternator" │                │                      │
  └──────────────┘                └──────────────────────┘

  Diagnosis: probabilistic. Based on external observation.
```

### The New Car

Now think about a modern car. Same scenario -- something goes wrong. You go to the service center. They plug a diagnostic computer into the OBD-II port. In seconds, they know: cylinder 3 misfire, oxygen sensor bank 2 reading out of range, catalytic converter efficiency below threshold.

The car told them. Not the mechanic's intuition. The car itself.

```
  ┌──────────────┐                ┌──────────────────────┐
  │  Diagnostic  │    plugs into  │       New Car        │
  │  Computer    │◄══════════════>│                      │
  │              │   OBD-II port  │  ┌────────────────┐  │
  │  "Cylinder 3 │                │  │ ECU: Engine     │  │
  │   misfire,   │                │  │ knows RPM, temp,│  │
  │   O2 sensor  │                │  │ fuel mix, timing│  │
  │   bank 2     │                │  ├────────────────┤  │
  │   out of     │                │  │ TCU: Trans      │  │
  │   range"     │                │  │ knows gear,     │  │
  │              │                │  │ torque, slip     │  │
  │              │                │  ├────────────────┤  │
  │              │                │  │ BCM: Body       │  │
  │              │                │  │ knows doors,    │  │
  │              │                │  │ lights, windows │  │
  │              │                │  └────────────────┘  │
  └──────────────┘                └──────────────────────┘

  Diagnosis: deterministic. Based on the car's own knowledge.
```

The difference isn't the mechanic's skill vs the computer's speed. The difference is that **the new car has self-knowledge built in**. Every subsystem -- engine, transmission, body, brakes -- has sensors that continuously monitor state and report it through a standardized diagnostic port.

The car doesn't guess about itself. It _knows_.

### The Software Parallel

Today's AI development tools are the old mechanic.

Claude Code, Cursor, GitHub Copilot -- they read your source files, parse your imports, infer your architecture, guess at your dependency graph. They're remarkably good at it. But they're working from the outside. They see the code, not the running system. They infer the architecture, they don't receive it.

```
  ┌──────────────────┐              ┌────────────────────────┐
  │   AI Dev Tool    │   reads      │    Your Application    │
  │   (Cursor,       │─────────────>│                        │
  │    Claude Code)  │   parses     │  src/services/auth.ts  │
  │                  │─────────────>│  src/services/user.ts  │
  │  "I think this   │   infers     │  src/db/postgres.ts    │
  │   service depends│─────────────>│  src/config/index.ts   │
  │   on that one..."│              │                        │
  │                  │              │  (files on disk,       │
  │  ⚠ Heuristic    │              │   not a running        │
  │  ⚠ May be wrong │              │   system)              │
  │  ⚠ Incomplete   │              │                        │
  └──────────────────┘              └────────────────────────┘
```

HexDI's vision is the new car.

```
  ┌──────────────────┐              ┌────────────────────────┐
  │   AI Dev Tool    │              │    Your Application    │
  │   (Any agent)    │              │    powered by HexDI    │
  │                  │   MCP / A2A  │                        │
  │  "What services  │◄════════════>│  ┌──────────────────┐  │
  │   exist?"        │  diagnostic  │  │  graph: topology  │  │
  │                  │  port        │  │  runtime: state   │  │
  │  ✓ AuthService   │              │  │  tracing: history │  │
  │  ✓ UserRepo      │              │  │  store: data      │  │
  │  ✓ PostgresDB    │              │  │  query: cache     │  │
  │  ✓ ConfigService │              │  │  saga: workflows  │  │
  │                  │              │  │  agent: AI tools  │  │
  │  ✓ Exact         │              │  │  logger: pipeline │  │
  │  ✓ Complete      │              │  └──────────────────┘  │
  │  ✓ From the app  │              │                        │
  │    itself        │              │   that knows itself)   │
  └──────────────────┘              └────────────────────────┘
```

---

## 3. The Vision: Applications That Know Themselves

HexDI's vision goes beyond dependency injection. The core idea:

> **The DI container is the one component that touches everything in your application. It wires every service, manages every lifetime, creates every scope. If you make it aware -- truly aware -- of all these relationships, it becomes a complete, queryable model of the entire application.**

This transforms the container from plumbing into a **nervous system** -- a live, connected network that carries information about every part of the application to a central point where it can be queried, analyzed, and acted upon.

### What "Self-Aware" Means Concretely

A self-aware HexDI application can answer these questions about itself, at runtime, through structured APIs:

| Question                         | Source            | Answer Format                      |
| -------------------------------- | ----------------- | ---------------------------------- |
| What services exist?             | `@hex-di/graph`   | Typed port registry with metadata  |
| How do they connect?             | `@hex-di/graph`   | Dependency adjacency map           |
| What's the initialization order? | `@hex-di/graph`   | Topological sort                   |
| What's currently instantiated?   | `@hex-di/runtime` | Container snapshot                 |
| What scope hierarchy exists?     | `@hex-di/runtime` | Scope tree structure               |
| What happened during resolution? | `@hex-di/tracing` | Structured spans with timing       |
| What failed and why?             | `@hex-di/tracing` | Error spans with stack traces      |
| What's the current state?        | `@hex-di/store`   | Reactive state snapshot            |
| What data is cached?             | `@hex-di/query`   | Cache entries with freshness       |
| What workflows are running?      | `@hex-di/saga`    | Saga step + compensation state     |
| What AI tools are available?     | `@hex-di/agent`   | Tool registry with schemas         |
| What's being logged?             | `@hex-di/logger`  | Entry counts, error rate, handlers |

No file parsing. No inference. No guessing. The application tells you directly.

### The Three Layers of Self-Knowledge

```
  ┌─────────────────────────────────────────────────────┐
  │              Layer 3: BEHAVIORAL                     │
  │                                                      │
  │  "What am I doing right now?"                       │
  │                                                      │
  │  Tracing: resolution spans, call chains, timing     │
  │  Store: state transitions, action history            │
  │  Query: fetch activity, cache hits/misses            │
  │  Saga: workflow progress, step execution             │
  │  Agent: tool invocations, LLM conversations          │
  │  Logger: log entries, error rates, handler activity   │
  │                                                      │
  ├─────────────────────────────────────────────────────┤
  │              Layer 2: STATE                          │
  │                                                      │
  │  "What is my current condition?"                    │
  │                                                      │
  │  Runtime: instantiated services, scope tree          │
  │  Store: current values, computed derivations          │
  │  Query: cached data, staleness, pending fetches      │
  │  Saga: in-progress workflows, compensation state     │
  │  Agent: active conversations, tool availability      │
  │  Logger: active handlers, sampling config, redaction  │
  │                                                      │
  ├─────────────────────────────────────────────────────┤
  │              Layer 1: STRUCTURE                      │
  │                                                      │
  │  "What am I made of?"                               │
  │                                                      │
  │  Graph: ports, adapters, dependency edges            │
  │  Lifetimes: singleton, scoped, transient             │
  │  Metadata: names, categories, tags, directions       │
  │  Topology: layers, paths, cycles, complexity         │
  │                                                      │
  └─────────────────────────────────────────────────────┘
```

**Layer 1 (Structure)** is known at compile time and doesn't change at runtime. It's the application's DNA.

**Layer 2 (State)** changes as the application runs. Services get instantiated, scopes are created and destroyed, data is fetched and cached, workflows progress.

**Layer 3 (Behavior)** is the timeline. What happened, in what order, how long it took, what failed. This is the application's memory of its own activity.

Together, these three layers form a **complete model of the application** -- its structure, its current state, and its history.

---

## 4. The Architecture: Nervous System Design

### Why "Nervous System"?

The analogy is precise. A biological nervous system:

1. **Connects every part of the body** -- the DI container connects every service
2. **Carries signals** -- tracing carries resolution events, store carries state changes
3. **Has a central processing point** -- the container is where all information converges
4. **Enables reflexes** -- the system can react to its own state (scope disposal, error recovery)
5. **Provides sensory input** -- inspection APIs let external systems observe internal state
6. **Operates at multiple speeds** -- compile-time validation (slow, thorough) and runtime tracing (fast, continuous)

### The HexDI Nervous System Architecture

```
                         ┌─────────────────────────┐
                         │    Diagnostic Ports      │
                         │                          │
                         │  MCP Server    A2A Card  │
                         │  OTel Export   REST API  │
                         └────────────┬────────────┘
                                      │
                         ┌────────────▼────────────┐
                         │                          │
                         │    Central Nerve Cluster  │
                         │    (DI Container)         │
                         │                          │
                         │  ┌────────────────────┐  │
                         │  │  Dependency Graph   │  │
                         │  │  (structural map)   │  │
                         │  └─────────┬──────────┘  │
                         │            │              │
                         │  ┌─────────▼──────────┐  │
                         │  │  Resolution Engine  │  │
                         │  │  (runtime behavior) │  │
                         │  └─────────┬──────────┘  │
                         │            │              │
                         │  ┌─────────▼──────────┐  │
                         │  │  Inspection API     │  │
                         │  │  (self-observation) │  │
                         │  └────────────────────┘  │
                         │                          │
                         └─────┬──────┬──────┬─────┘
                               │      │      │
               ┌───────────────┘      │      └───────────────┐
               │                      │                      │
    ┌──────────▼────────┐  ┌─────────▼─────────┐  ┌────────▼──────────┐
    │   Sensory Nerves   │  │  Motor Nerves      │  │  Reflex Arcs       │
    │                    │  │                    │  │                    │
    │  tracing: reports  │  │  store: manages    │  │  saga: orchestrates│
    │  what happened     │  │  state changes     │  │  compensates on    │
    │                    │  │                    │  │  failure            │
    │  query: reports    │  │  agent: executes   │  │                    │
    │  data freshness    │  │  AI tool calls     │  │  flow: transitions │
    │                    │  │                    │  │  states on events   │
    │  logger: reports   │  │                    │  │                    │
    │  log pipeline      │  │                    │  │                    │
    └────────────────────┘  └────────────────────┘  └────────────────────┘
               │                      │                      │
               └──────────────────────┼──────────────────────┘
                                      │
                      ┌───────────────▼───────────────┐
                      │        Your Application        │
                      │                                │
                      │  Services, business logic,     │
                      │  data access, UI, workflows    │
                      └────────────────────────────────┘
```

### Every Signal Flows Through the Container

This is the key architectural insight. Because HexDI is the DI system, **every service creation flows through it**. Because the libraries (store, query, saga, agent) are built as HexDI adapters, **their lifecycle is managed by the container**. Because tracing hooks into the resolution engine, **every resolution is automatically observed**.

The container doesn't need to be told what's happening. It knows, because everything flows through it.

```
  Traditional DI Container:          HexDI Container:

  Service A ─── creates ──> B       Service A ─── creates ──> B
                                          │                    │
  (container doesn't know              container records:
   about the relationship              - resolution timing
   at runtime)                         - dependency chain
                                       - scope context
                                       - caller identity
                                       - cache hit/miss
```

---

## 5. The Ecosystem: Every Library Reports What It Knows

### The Unified Philosophy

Every package in the HexDI ecosystem follows the same pattern:

1. **Ports** define what a capability is (the contract)
2. **Adapters** define how it's implemented (the implementation)
3. **The container** manages the lifecycle
4. **The library reports its state** back to the central system

This means the container doesn't just wire services -- it becomes the convergence point for all application knowledge.

### Package-by-Package: What Each Library Knows

```
  ┌─────────────────────────────────────────────────────────────┐
  │                    HexDI Ecosystem                           │
  │                                                              │
  │  ┌─────────┐  "I know the complete topology"                │
  │  │  graph  │  ─ every port, adapter, and dependency edge    │
  │  │         │  ─ topological order, layers, complexity        │
  │  │         │  ─ cycles, captive deps, orphans                │
  │  │         │  ─ suggestions for improvement                  │
  │  └─────────┘                                                 │
  │                                                              │
  │  ┌─────────┐  "I know the runtime state"                    │
  │  │ runtime │  ─ what's instantiated, what's pending          │
  │  │         │  ─ scope tree hierarchy                         │
  │  │         │  ─ singleton cache contents                     │
  │  │         │  ─ lifecycle phases                             │
  │  └─────────┘                                                 │
  │                                                              │
  │  ┌─────────┐  "I know what happened"                        │
  │  │ tracing │  ─ every resolution as a structured span       │
  │  │         │  ─ timing, parent-child chains                  │
  │  │         │  ─ errors with full context                     │
  │  │         │  ─ W3C Trace Context for cross-boundary traces │
  │  └─────────┘                                                 │
  │                                                              │
  │  ┌─────────┐  "I know the application state"                │
  │  │  store  │  ─ every reactive value and its derivations    │
  │  │         │  ─ state transitions and action history         │
  │  │         │  ─ subscriber dependency graph                  │
  │  │         │  ─ optimistic updates pending                   │
  │  └─────────┘                                                 │
  │                                                              │
  │  ┌─────────┐  "I know the data layer"                       │
  │  │  query  │  ─ every data source and its configuration     │
  │  │         │  ─ cache contents and freshness                 │
  │  │         │  ─ pending and in-flight requests               │
  │  │         │  ─ deduplication and invalidation state          │
  │  └─────────┘                                                 │
  │                                                              │
  │  ┌─────────┐  "I know the workflows"                        │
  │  │  saga   │  ─ every running workflow and its step          │
  │  │         │  ─ compensation chains (what can be undone)    │
  │  │         │  ─ failure points and recovery state            │
  │  │         │  ─ transaction boundaries                       │
  │  └─────────┘                                                 │
  │                                                              │
  │  ┌─────────┐  "I know the AI capabilities"                  │
  │  │  agent  │  ─ every tool with its schema                  │
  │  │         │  ─ LLM provider configuration                   │
  │  │         │  ─ conversation history and context             │
  │  │         │  ─ human-in-the-loop approval state            │
  │  └─────────┘                                                 │
  │                                                              │
  │  ┌─────────┐  "I know the state machines"                   │
  │  │  flow   │  ─ current state of every machine              │
  │  │         │  ─ valid transitions from current state         │
  │  │         │  ─ running activities and effects               │
  │  │         │  ─ event queue contents                          │
  │  └─────────┘                                                 │
  │                                                              │
  │  ┌─────────┐  "I know the logging pipeline"                 │
  │  │ logger  │  ─ log entry counts by level                   │
  │  │         │  ─ error rate and threshold breaches            │
  │  │         │  ─ active handlers and their health             │
  │  │         │  ─ sampling and redaction statistics            │
  │  └─────────┘                                                 │
  └─────────────────────────────────────────────────────────────┘
```

### The Convergence Point

All of this knowledge converges at the container. Because every library registers its ports and adapters with the container, the container knows:

- **What exists** (from the graph)
- **What's alive** (from the runtime)
- **What happened** (from tracing)
- **What's valued** (from the store)
- **What's fetched** (from query)
- **What's in progress** (from saga and flow)
- **What's being logged** (from logger)
- **What's possible** (from agent)

No single library has the full picture. But the container, sitting at the center, sees everything.

---

## 6. The Protocols: Speaking to the Outside World

Self-knowledge is valuable. But the real power comes when the application can **communicate that knowledge to external systems** through standardized protocols.

### MCP (Model Context Protocol)

Anthropic's MCP is the primary protocol for AI-to-application communication. It defines how AI tools discover and interact with external data and capabilities.

**How HexDI maps to MCP:**

```
  MCP Concept          HexDI Equivalent
  ───────────          ────────────────
  Resources            Container snapshots, graph topology,
                       store state, query cache contents,
                       tracing spans, saga workflow state,
                       logging snapshots, entry counts

  Tools                resolve(port), createScope(),
                       inspect(), getState(), invalidateQuery(),
                       retryStep(), approveAction()

  Prompts              Contextual templates informed by
                       application state ("debug this service"
                       with full dependency context attached)
```

**Concrete MCP Server Example:**

```
  MCP Resource: "hexdi://graph/topology"
  ─────────────────────────────────────
  Returns: Full dependency graph as JSON
  {
    "ports": [
      { "name": "AuthService", "lifetime": "singleton",
        "dependsOn": ["UserRepo", "TokenService"],
        "category": "auth", "tags": ["security"] }
    ],
    "edges": [
      { "from": "AuthService", "to": "UserRepo", "type": "required" }
    ],
    "metrics": {
      "totalPorts": 24,
      "maxDepth": 4,
      "complexityScore": 35
    }
  }

  MCP Resource: "hexdi://runtime/snapshot"
  ─────────────────────────────────────────
  Returns: Current container state
  {
    "singletons": ["AuthService", "ConfigService"],
    "scopes": [
      { "name": "request-123", "services": ["UserRepo", "SessionService"],
        "children": [] }
    ],
    "phase": "running"
  }

  MCP Tool: "hexdi://resolve"
  ──────────────────────────
  Input: { "port": "AuthService" }
  Returns: Resolution result with full trace

  MCP Tool: "hexdi://inspect"
  ──────────────────────────
  Input: { "query": "services depending on DatabasePort" }
  Returns: Filtered dependency analysis
```

### A2A (Agent-to-Agent Protocol)

Google's A2A protocol enables agent-to-agent collaboration. A HexDI application can publish an **Agent Card** describing its capabilities as skills.

```
  Agent Card: "MyApp powered by HexDI"
  ─────────────────────────────────────
  {
    "name": "MyApp Runtime",
    "description": "Self-aware application with full introspection",
    "url": "https://myapp.com/a2a/v1",
    "capabilities": { "streaming": true },
    "skills": [
      {
        "id": "inspect-architecture",
        "name": "Application Architecture Inspector",
        "description": "Returns complete dependency graph, lifetimes,
                        and structural analysis",
        "examples": ["What services exist?",
                     "Show me the dependency chain for AuthService"]
      },
      {
        "id": "diagnose-issue",
        "name": "Runtime Diagnostician",
        "description": "Analyzes tracing data to identify failure points
                        and suggest fixes",
        "examples": ["Why did the checkout flow fail?",
                     "What's causing slow response times?"]
      },
      {
        "id": "state-inspector",
        "name": "Application State Inspector",
        "description": "Reports current state of all managed state,
                        cached data, and active workflows",
        "examples": ["What's the current user session state?",
                     "Show me all stale cached queries"]
      }
    ]
  }
```

### OpenTelemetry Export

HexDI's tracing system (already being implemented via `@hex-di/tracing` and `@hex-di/tracing-otel`) exports structured telemetry to any OTel-compatible backend.

```
  ┌─────────────┐     ┌──────────────┐     ┌──────────────────┐
  │  Container   │     │  @hex-di/    │     │  OTel Backend    │
  │  Resolution  │────>│  tracing-otel│────>│                  │
  │              │     │              │     │  Jaeger           │
  │  Every       │     │  Converts    │     │  Zipkin           │
  │  resolve()   │     │  HexDI spans │     │  Grafana Tempo   │
  │  is a span   │     │  to OTel     │     │  Datadog          │
  │              │     │  ReadableSpan│     │  Any OTLP backend │
  └─────────────┘     └──────────────┘     └──────────────────┘

  Span attributes follow semantic conventions:
  ─ hex-di.port.name: "AuthService"
  ─ hex-di.port.lifetime: "singleton"
  ─ hex-di.resolution.cached: true
  ─ hex-di.scope.name: "request-123"
  ─ hex-di.resolution.duration_ms: 2.4
```

### Protocol Convergence

```
                    ┌───────────────────────────┐
                    │   HexDI Application       │
                    │   (Self-Aware Runtime)     │
                    └─────┬──────┬──────┬───────┘
                          │      │      │
              ┌───────────┘      │      └───────────┐
              │                  │                   │
     ┌────────▼────────┐ ┌──────▼───────┐ ┌────────▼────────┐
     │   MCP Server    │ │  A2A Agent   │ │  OTel Exporter  │
     │                 │ │              │ │                  │
     │  AI dev tools   │ │  Other AI    │ │  Observability   │
     │  query the app  │ │  agents      │ │  platforms       │
     │  directly       │ │  collaborate │ │  visualize       │
     │                 │ │  with the    │ │  behavior        │
     │  Resources:     │ │  app as a    │ │                  │
     │  graph, state,  │ │  peer        │ │  Traces, metrics │
     │  traces, cache  │ │              │ │  dashboards      │
     │                 │ │  Skills:     │ │                  │
     │  Tools:         │ │  inspect,    │ │  Jaeger, Grafana │
     │  resolve,       │ │  diagnose,   │ │  Datadog, etc.   │
     │  inspect, query │ │  report      │ │                  │
     └────────────────┘ └──────────────┘ └──────────────────┘
```

---

## 7. The Diagnostic Port: AI Plugs In

### The Conversation Changes

Today, when you ask an AI coding assistant about your application:

```
  Developer: "Why is the checkout slow?"

  AI (today):
    1. Reads src/checkout/service.ts
    2. Reads src/payment/gateway.ts
    3. Reads src/inventory/service.ts
    4. Reads src/config/database.ts
    5. Guesses: "It might be the database connection pool size,
       or maybe the payment gateway timeout, or possibly
       N+1 queries in the inventory check..."
```

With HexDI as the diagnostic port:

```
  Developer: "Why is the checkout slow?"

  AI (with HexDI):
    1. Queries MCP: hexdi://tracing/slow-resolutions?threshold=100ms
    2. Gets: PaymentGatewayAdapter average 340ms (3x above baseline)
    3. Queries MCP: hexdi://tracing/spans?service=PaymentGateway&last=100
    4. Gets: 89/100 requests show DNS resolution spike at 15:32
    5. States: "PaymentGateway resolution time tripled at 15:32
       due to DNS resolution latency. 89 of the last 100 requests
       are affected. The checkout flow has 3 sequential calls to
       this service (at steps 2, 4, and 7 of the OrderSaga).
       Recommend: enable connection keep-alive or add DNS caching."
```

The AI didn't guess. It asked the application, and the application answered from its own telemetry.

### What an AI Agent Can Query

```
  ┌──────────────────────────────────────────────────────────────┐
  │                    Query Categories                           │
  │                                                               │
  │  STRUCTURAL QUERIES (from graph)                              │
  │  ──────────────────────────────                               │
  │  "What services exist?"                                       │
  │  "What does AuthService depend on?"                           │
  │  "What is the transitive dependency set of CheckoutService?" │
  │  "Are there circular dependencies?"                           │
  │  "What's the complexity score of this graph?"                │
  │  "What services would be affected if DatabasePort changed?"  │
  │  "Show me the topological initialization order"               │
  │  "What are the orphan ports (registered but unreferenced)?"  │
  │                                                               │
  │  STATE QUERIES (from runtime + store + logger)                │
  │  ───────────────────────────────────────────                  │
  │  "What singletons are currently instantiated?"               │
  │  "How many active scopes exist?"                              │
  │  "What's the current user session state?"                    │
  │  "What values are in the store right now?"                   │
  │  "Which queries are stale?"                                   │
  │  "What workflows are in progress?"                            │
  │  "What state machine states are active?"                      │
  │  "What's the current logging error rate?"                    │
  │  "Which log handlers are active?"                             │
  │  "Is sampling or redaction enabled?"                          │
  │                                                               │
  │  BEHAVIORAL QUERIES (from tracing)                            │
  │  ────────────────────────────────                             │
  │  "What was the resolution path for this request?"            │
  │  "What's the average resolution time for UserService?"       │
  │  "What errors occurred in the last 5 minutes?"               │
  │  "Show me the trace for request-id-xyz"                       │
  │  "What's the cache hit rate for QueryPort resolutions?"      │
  │  "Which sagas have triggered compensation in the last hour?" │
  │                                                               │
  │  DIAGNOSTIC QUERIES (synthesized)                             │
  │  ──────────────────────────────                               │
  │  "What's the blast radius if PaymentPort fails?"             │
  │  "Why did checkout fail for user-123?"                       │
  │  "What's the healthiest initialization order?"               │
  │  "Are there captive dependency risks?"                       │
  │  "What scopes might be leaking?"                              │
  │  "Suggest optimizations for the current graph"               │
  └──────────────────────────────────────────────────────────────┘
```

---

## 8. The Full Loop: Self-Aware Application in Action

### End-to-End Scenario

Let's trace a complete scenario: a user reports that "order placement sometimes fails."

**Step 1: AI Agent connects to the application's MCP server**

```
  Agent ──> MCP: List available resources
  App ──> Agent: [
    "hexdi://graph/topology",
    "hexdi://runtime/snapshot",
    "hexdi://tracing/recent",
    "hexdi://store/state",
    "hexdi://saga/workflows",
    "hexdi://query/cache"
  ]
```

**Step 2: Agent queries the graph for the order flow**

```
  Agent ──> MCP: Read "hexdi://graph/topology?filter=category:order"
  App ──> Agent: {
    "OrderService": {
      "depends_on": ["InventoryPort", "PaymentPort", "ShippingPort"],
      "lifetime": "scoped",
      "category": "order"
    },
    "OrderSaga": {
      "steps": [
        "validateOrder",
        "reserveInventory",
        "processPayment",
        "arrangeShipping",
        "sendConfirmation"
      ],
      "compensations": [
        null,
        "releaseInventory",
        "refundPayment",
        "cancelShipping",
        null
      ]
    }
  }
```

**Step 3: Agent queries recent failures**

```
  Agent ──> MCP: Read "hexdi://tracing/errors?saga=OrderSaga&last=24h"
  App ──> Agent: {
    "failures": [
      {
        "trace_id": "abc123",
        "failed_step": "processPayment",
        "error": "PaymentGatewayTimeout",
        "compensations_executed": ["releaseInventory"],
        "timestamp": "2024-01-15T14:32:00Z",
        "duration_ms": 5043
      },
      {
        "trace_id": "def456",
        "failed_step": "processPayment",
        "error": "PaymentGatewayTimeout",
        "compensations_executed": ["releaseInventory"],
        "timestamp": "2024-01-15T14:35:22Z",
        "duration_ms": 5038
      }
      // ... 12 more, all PaymentGatewayTimeout
    ]
  }
```

**Step 4: Agent queries the payment service state**

```
  Agent ──> MCP: Read "hexdi://tracing/spans?port=PaymentPort&last=100"
  App ──> Agent: {
    "summary": {
      "total": 100,
      "successful": 86,
      "failed": 14,
      "avg_duration_ms": 1240,
      "p99_duration_ms": 5020,
      "failure_pattern": "all failures have duration > 5000ms (timeout)"
    }
  }
```

**Step 5: Agent synthesizes the diagnosis**

```
  Agent ──> Developer:

  "The order placement failures are caused by PaymentPort timeouts.

   Analysis:
   - 14 of the last 100 payment requests timed out (>5000ms)
   - All failures occurred during the 'processPayment' step of OrderSaga
   - The saga correctly compensated by releasing inventory each time
   - No data corruption -- the compensation chain is working

   Root cause: PaymentGateway response time has degraded.
   P99 latency is 5020ms against a 5000ms timeout.

   Recommendations:
   1. Increase PaymentPort timeout to 8000ms (immediate relief)
   2. Add retry with exponential backoff to PaymentAdapter
   3. Consider circuit breaker pattern for PaymentPort
   4. The saga compensations are working correctly --
      no action needed there."
```

The AI didn't read a single source file. It queried the running application through the diagnostic port and got structured, truthful data directly from the system itself.

### The Loop Diagram

```
  ┌──────────┐         ┌──────────────────────────────────────┐
  │          │         │        HexDI Application              │
  │  Human   │         │                                       │
  │  or AI   │         │  ┌──────┐  ┌───────┐  ┌──────────┐  │
  │  Agent   │         │  │graph │  │runtime│  │ tracing  │  │
  │          │         │  │      │  │       │  │          │  │
  │          │   MCP   │  │struct│  │ state │  │ behavior │  │
  │  1. Ask  │════════>│  │ure  │  │       │  │          │  │
  │          │         │  └──┬───┘  └───┬───┘  └────┬─────┘  │
  │          │         │     │          │           │         │
  │          │         │     └──────────┼───────────┘         │
  │          │         │               │                      │
  │          │         │     ┌─────────▼─────────┐            │
  │          │   MCP   │     │  Unified Answer    │            │
  │  2. Get  │<════════│     │  from the app      │            │
  │  truth   │         │     │  itself             │            │
  │          │         │     └────────────────────┘            │
  │          │         │                                       │
  │  3. Act  │         └──────────────────────────────────────┘
  │  with    │
  │  certainty│
  └──────────┘
```

---

## 9. Why This Hasn't Existed Before

### The DI Framework Landscape

Every existing DI framework has pieces of this vision. None has the whole picture.

```
  ┌─────────────┬───────────┬───────────┬──────────┬──────────┐
  │ Capability  │  Spring   │  Angular  │ Effect   │  HexDI   │
  ├─────────────┼───────────┼───────────┼──────────┼──────────┤
  │ Compile-    │           │           │          │          │
  │ time graph  │     No    │     No    │   Yes    │   Yes    │
  │ validation  │           │           │  (types) │ (types)  │
  ├─────────────┼───────────┼───────────┼──────────┼──────────┤
  │ Runtime     │  Partial  │  Partial  │          │          │
  │ dependency  │  (Bean    │  (v17     │    No    │   Yes    │
  │ graph API   │  Def)     │  debug)   │          │  (full)  │
  ├─────────────┼───────────┼───────────┼──────────┼──────────┤
  │ Graph       │           │           │          │          │
  │ traversal   │    No     │    No     │    No    │   Yes    │
  │ & analysis  │           │           │          │          │
  ├─────────────┼───────────┼───────────┼──────────┼──────────┤
  │ Resolution  │           │           │          │          │
  │ tracing     │    No     │    No     │   Yes    │   Yes    │
  │ (spans)     │           │           │ (built-in│ (tracing │
  │             │           │           │  fibers) │  package)│
  ├─────────────┼───────────┼───────────┼──────────┼──────────┤
  │ Captive dep │           │           │          │          │
  │ detection   │    No     │    No     │   Yes    │   Yes    │
  │             │           │           │ (types)  │(types +  │
  │             │           │           │          │ runtime) │
  ├─────────────┼───────────┼───────────┼──────────┼──────────┤
  │ Serializable│  Partial  │           │          │          │
  │ state       │ (Actuator)│    No     │    No    │   Yes    │
  │             │           │           │          │  (JSON)  │
  ├─────────────┼───────────┼───────────┼──────────┼──────────┤
  │ Actionable  │           │           │          │          │
  │ suggestions │    No     │    No     │    No    │   Yes    │
  ├─────────────┼───────────┼───────────┼──────────┼──────────┤
  │ Complexity  │           │           │          │          │
  │ scoring     │    No     │    No     │    No    │   Yes    │
  ├─────────────┼───────────┼───────────┼──────────┼──────────┤
  │ Rich port   │  Partial  │           │          │          │
  │ metadata    │(@Qualifier│    No     │    No    │   Yes    │
  │             │)          │           │          │          │
  ├─────────────┼───────────┼───────────┼──────────┼──────────┤
  │ Container   │  Partial  │  Partial  │          │          │
  │ hierarchy   │ (parent   │ (injector │    No    │   Yes    │
  │ inspection  │  context) │  tree)    │          │  (full)  │
  ├─────────────┼───────────┼───────────┼──────────┼──────────┤
  │ Full        │           │           │          │          │
  │ ecosystem   │    No     │    No     │  Partial │   Yes    │
  │ reporting   │           │           │          │ (vision) │
  └─────────────┴───────────┴───────────┴──────────┴──────────┘
```

### What Was Missing

Three things had to converge for this vision to become possible:

**1. Type-level dependency graphs.** You need the graph to exist as a first-class data structure, not just as implicit wiring. Effect pioneered this with its Layer system. HexDI extends it with runtime inspection.

**2. AI protocols that consume structured data.** MCP (2024) and A2A (2025) didn't exist before. Without standardized ways for AI to query applications, self-knowledge had no consumer.

**3. An ecosystem-wide commitment.** A DI container that knows about services is useful. A DI container where _every library_ -- state management, data fetching, workflow orchestration, AI tools -- reports through the same system is transformative. This requires building the entire ecosystem with introspection as a first-class concern, not bolting it on after.

---

## 10. Theoretical Foundations

### Autonomic Computing (IBM, 2001)

IBM's vision of self-managing computer systems defined four "self-\*" properties. HexDI maps naturally to each:

| Self-\* Property       | Definition                                              | HexDI Implementation                                                                                                         |
| ---------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Self-Configuration** | Automatic configuration following high-level policies   | Graph builder validates and wires dependencies at compile time. Adapters declare their own requirements.                     |
| **Self-Optimization**  | Continuous performance tuning                           | Tracing identifies slow resolutions. Complexity scoring identifies graph hotspots. Suggestions recommend improvements.       |
| **Self-Healing**       | Automatic discovery and correction of faults            | Saga compensations auto-rollback on failure. Scope disposal prevents resource leaks. Circuit breaker patterns through ports. |
| **Self-Protection**    | Proactive identification and protection against threats | Compile-time cycle detection. Captive dependency prevention. Scope isolation. Immutable snapshots prevent race conditions.   |

IBM's **MAPE-K loop** (Monitor-Analyze-Plan-Execute-Knowledge) maps directly:

```
  ┌─────────────────────────────────────────────────────────┐
  │                    MAPE-K Loop                           │
  │                                                          │
  │  ┌─────────┐    ┌─────────┐    ┌──────┐    ┌─────────┐ │
  │  │ Monitor │───>│ Analyze │───>│ Plan │───>│ Execute │ │
  │  └─────────┘    └─────────┘    └──────┘    └─────────┘ │
  │       │              │             │            │        │
  │       ▼              ▼             ▼            ▼        │
  │  ┌──────────────────────────────────────────────────┐   │
  │  │                 Knowledge                         │   │
  │  └──────────────────────────────────────────────────┘   │
  │                                                          │
  │  HexDI Mapping:                                          │
  │  ─────────────                                           │
  │  Monitor  = Tracing spans, scope lifecycle events,       │
  │             inspector snapshots, store subscriptions      │
  │                                                          │
  │  Analyze  = Graph analysis (complexity, depth, orphans), │
  │             trace aggregation (slow resolutions, errors), │
  │             captive dependency detection                   │
  │                                                          │
  │  Plan     = GraphSuggestion system (actionable advice),  │
  │             auto-generated optimization recommendations   │
  │                                                          │
  │  Execute  = Today: human-targeted suggestions            │
  │             Future: auto-scaling, auto-healing            │
  │                                                          │
  │  Knowledge = The dependency graph itself --               │
  │              a complete model of the application          │
  └─────────────────────────────────────────────────────────┘
```

### Digital Twin Theory

A digital twin is a virtual representation synchronized with a real system. HexDI creates a **software digital twin**:

| Digital Twin Concept | HexDI Implementation                                                                |
| -------------------- | ----------------------------------------------------------------------------------- |
| Physical system      | The running application with its services, state, and behavior                      |
| Virtual model        | The dependency graph + runtime snapshot + trace history                             |
| Synchronization      | Continuous -- every resolution, state change, and lifecycle event updates the model |
| Queryable            | Inspection APIs, MCP resources, A2A skills                                          |
| Simulatable          | Graph analysis can answer "what if" questions about dependency changes              |
| Historical           | Trace collectors maintain temporal record of all activity                           |

### Knowledge Graph Theory

The dependency graph + runtime state + behavioral traces form a **domain-specific knowledge graph** for the application:

```
  Nodes: Ports (services), Scopes (containers), Values (state)
  Edges: depends-on, provides, contains, resolved-by, transitions-to

  Queries expressible as graph traversals:
  ─ "Shortest dependency path from A to B"
  ─ "All transitive dependents of DatabasePort"
  ─ "Services in the critical path of CheckoutSaga"
  ─ "Common dependencies between AuthService and PaymentService"
```

---

## 11. The Roadmap: From Container to Consciousness

### What Exists Today (Implemented)

```
  ✅ @hex-di/core       Type system, ports, adapters
  ✅ @hex-di/graph      Compile-time graph with full inspection
                        (traversal, complexity, suggestions, serialization)
  ✅ @hex-di/runtime    Container with snapshots, scope tree, lifecycle
  ✅ @hex-di/tracing    W3C-compatible distributed tracing
  🔄 @hex-di/tracing-otel  OpenTelemetry export bridge (in progress)
  ✅ @hex-di/react      React integration
  ✅ @hex-di/hono       Hono backend integration
  ✅ @hex-di/flow       State machine runtime
  ✅ @hex-di/logger     Structured logging with inspection
                        (LoggerPort, handlers, context propagation,
                         LoggerInspector with entry counts, error rates,
                         sampling/redaction stats, MCP resource contracts)
  ✅ @hex-di/logger-pino     Pino backend adapter
  ✅ @hex-di/logger-winston  Winston backend adapter
  ✅ @hex-di/logger-bunyan   Bunyan backend adapter
  ✅ @hex-di/testing    Test utilities
  ✅ @hex-di/visualization  Graph visualization (DOT, Mermaid)
```

### What's Next (Planned)

```
  📋 @hex-di/store      Reactive state with signals
  📋 @hex-di/query      Data fetching and caching
  📋 @hex-di/saga       Workflow orchestration with compensation
  📋 @hex-di/agent      AI agent framework with tool ports
```

### The Diagnostic Layer (Vision)

```
  🔮 @hex-di/mcp        MCP server exposing all application knowledge
  🔮 @hex-di/a2a        A2A agent card + skill publishing
  🔮 @hex-di/devtools   Visual dashboard for all application state
  🔮 @hex-di/health     Automated health assessment from graph + traces
```

### The Progression

```
  Phase 1: PLUMBING (done)
  ─────────────────────
  Container wires services. Useful but opaque.

  Phase 2: AWARENESS (done)
  ─────────────────────────
  Container knows its topology (graph inspection),
  its state (runtime snapshots), and its history
  (tracing). Self-knowledge exists but is only
  available through code APIs.

  Phase 3: REPORTING (current)
  ────────────────────────────
  Every library in the ecosystem reports what it
  knows back to the central system. Store reports
  state, query reports cache, saga reports workflows,
  agent reports capabilities. The container becomes
  the convergence point for all application knowledge.

  Phase 4: COMMUNICATION (next)
  ─────────────────────────────
  The application exposes its self-knowledge through
  standardized protocols (MCP, A2A, OTel). AI tools
  and other agents can query the application directly
  instead of parsing source code.

  Phase 5: AUTONOMY (future)
  ──────────────────────────
  The application acts on its own self-knowledge.
  Auto-healing (saga compensations already do this).
  Auto-optimization (pre-warming based on trace data).
  Auto-scaling (scope pools based on load patterns).
  The MAPE-K loop closes completely.
```

### The End State

```
  ┌──────────────────────────────────────────────────────────┐
  │                                                           │
  │   An application that:                                    │
  │                                                           │
  │   1. Knows what it's made of        (graph)              │
  │   2. Knows what it's doing          (tracing)            │
  │   3. Knows what state it's in       (runtime + store)    │
  │   4. Knows what data it has         (query)              │
  │   5. Knows what processes are running (saga + flow)      │
  │   6. Knows what it can do           (agent)              │
  │   7. Knows what it's logging        (logger)             │
  │   8. Can tell you all of the above  (MCP + A2A)          │
  │   9. Can act on that knowledge      (autonomic)          │
  │                                                           │
  │   Not because someone instrumented it from the outside.  │
  │   Because self-knowledge is built into its foundation.   │
  │                                                           │
  │   The DI container -- the one component that touches     │
  │   everything -- becomes the nervous system that makes    │
  │   the application aware of itself.                       │
  │                                                           │
  └──────────────────────────────────────────────────────────┘
```

---

## Summary

HexDI is not just a dependency injection library. It is the foundation for **self-aware applications** -- software systems that maintain a complete, structured, queryable model of their own existence.

The DI container is uniquely positioned for this role because it's the only component that touches every service in the application. By extending the container's awareness beyond wiring -- to include state management, data caching, workflow orchestration, and AI capabilities -- and by exposing that awareness through standardized protocols like MCP and A2A, the container transforms from invisible plumbing into the application's nervous system.

The car analogy captures it perfectly: old cars required mechanics who worked from the outside in, inferring problems from symptoms. New cars have diagnostic ports that report their own state, because self-awareness is built into the architecture.

HexDI builds applications like new cars. Not instrumented from the outside. Self-aware from the foundation.

---

_"The best diagnostic tool is one that lets the system diagnose itself."_
