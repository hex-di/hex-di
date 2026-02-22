# HexDI: The Self-Aware Application

## A Pitch for the Future of Software Infrastructure

---

## The Problem in One Sentence

> **Your application is sophisticated enough to handle millions of requests — but it cannot answer a single question about itself.**

---

## Part 1 — Software Is Blind

Every production application running today contains a wealth of structural knowledge scattered across files, configs, runtime memory, and log streams. None of it is cohesive. None of it is queryable. The application itself doesn't know what it is.

When something breaks, you reconstruct the picture from artifacts:

- Read source files to understand the architecture
- Parse logs to trace what happened
- Inspect memory dumps to find the state
- Question colleagues to understand the intent

Three sophisticated actors — **the developer**, **the deployment platform**, **the monitoring tool** — each hold a fragment of the truth. The application itself holds none of it.

```
  Developer knows:      architecture, intent, dependencies
  Ops platform knows:   CPU, memory, network, restarts
  Monitoring knows:     metrics, error rates, latency percentiles

  The application knows: nothing about itself.
```

This isn't a tooling problem. It's a **foundational** problem. The application is a passive subject being examined from the outside. It was never designed to observe itself.

---

## Part 2 — The Car Analogy That Changes Everything

### Thirty Years Ago

You bring your car to the mechanic. Something is wrong. He opens the hood, listens to the engine, wiggles wires, checks the oil. He draws on experience, pattern-matches symptoms to causes, and makes an educated guess. Three parts replaced before he finds the real issue.

The car is passive. It has no opinion about its own condition.

### Today

You bring your car to the service center. The technician plugs a diagnostic computer into the **OBD-II port**. In seconds:

```
  Cylinder 3: misfire
  O2 sensor bank 2: reading out of range
  Catalytic converter: efficiency below threshold
```

The car told them. Not the technician's intuition — **the car's own sensors, reporting through a standardized interface.**

The car doesn't guess about itself. It *knows*.

### The Software Parallel

Today's AI development tools — Claude Code, Cursor, Copilot — are the old mechanic. They read your source files, parse imports, infer your architecture, and make educated guesses. Remarkably good guesses, but guesses.

```
  AI Tool (today):
    1. Reads src/checkout/service.ts
    2. Reads src/payment/gateway.ts
    3. Reads src/config/database.ts
    4. Infers: "It might be the connection pool, or the payment timeout,
               or possibly N+1 queries..."

  ⚠ Heuristic   ⚠ May be wrong   ⚠ Incomplete
```

**HexDI is the OBD-II port for software.**

```
  AI Tool (with HexDI):
    1. Queries MCP: hexdi://tracing/slow-resolutions?threshold=100ms
    2. Gets: PaymentGatewayAdapter avg 340ms (3× baseline)
    3. Queries MCP: hexdi://saga/workflows?status=failed&last=24h
    4. Gets: 14 OrderSaga failures, all at processPayment step
    5. States: "PaymentGateway latency tripled. 14 of the last 100
               orders failed during payment. Inventory was correctly
               released in all cases. Recommend: enable connection
               keep-alive, or increase timeout from 5s to 8s."

  ✓ Exact   ✓ Complete   ✓ From the app itself
```

The AI didn't read a single source file. It queried the running application through its own diagnostic port.

---

## Part 3 — What HexDI Is

HexDI is a **TypeScript dependency injection framework** built on the ports & adapters (hexagonal architecture) pattern. But calling it a DI framework understates what it is.

The DI container is the **one component that touches everything** in your application. It wires every service, manages every lifetime, and creates every scope. HexDI makes that unique position count.

### The Core Mechanic

```typescript
// 1. Define contracts as typed ports
const LoggerPort  = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });

// 2. Implement adapters — dependencies declared explicitly
const databaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [LoggerPort],           // ← compile-time dependency graph
  lifetime: "singleton",
  factory: ({ Logger }) => ({
    query: async (sql) => {
      Logger.log(`query: ${sql}`);  // ← Logger is injected, typed
      return [];
    },
  }),
});

// 3. Build and validate the graph — missing deps are TypeScript errors
const graph = GraphBuilder.create()
  .provide(loggerAdapter)
  .provide(databaseAdapter)
  .build();                         // ← fails at compile time if incomplete

// 4. Resolve
const db = container.resolve(DatabasePort);
```

Missing a dependency? TypeScript error — before the code ships.
Circular dependency? TypeScript error — before the code ships.
Wrong lifetime (singleton depending on scoped)? TypeScript error — before the code ships.

### The Ecosystem

HexDI is not a container alone — it's a **complete ecosystem** where every library is designed to report its state back to the central system:

| Package | What It Knows |
|---|---|
| `@hex-di/graph` | Every port, adapter, dependency edge, topological order, complexity score |
| `@hex-di/runtime` | What's instantiated, active scopes, scope tree hierarchy, lifecycle phases |
| `@hex-di/tracing` | Every resolution as a structured span — timing, parent-child chains, errors |
| `@hex-di/store` | Every reactive value, state transitions, subscriber graph |
| `@hex-di/query` | Cache entries, freshness, in-flight requests, deduplication state |
| `@hex-di/saga` | Running workflows, step progress, compensation chains |
| `@hex-di/flow` | Active state machines, valid transitions, event queues |
| `@hex-di/logger` | Log entry counts, error rate, active handlers, sampling config |
| `@hex-di/guard` | Active policies, authorization decisions, audit trail |
| `@hex-di/agent` | Available AI tools, LLM provider config, conversation state |

All of this converges at the container. No single library has the full picture. The container, sitting at the center, sees everything.

---

## Part 4 — Three Layers of Self-Knowledge

A self-aware HexDI application maintains a living model of itself across three layers:

```
  ┌─────────────────────────────────────────────┐
  │  Layer 3: BEHAVIORAL  "What am I doing?"    │
  │                                              │
  │  Resolution traces · state transitions       │
  │  workflow progress · authorization log        │
  │  log pipeline stats · tool invocations        │
  ├─────────────────────────────────────────────┤
  │  Layer 2: STATE  "What condition am I in?"  │
  │                                              │
  │  Instantiated services · scope tree          │
  │  cached data · active machines               │
  │  running sagas · active policies             │
  ├─────────────────────────────────────────────┤
  │  Layer 1: STRUCTURE  "What am I made of?"   │
  │                                              │
  │  Ports & adapters · dependency edges         │
  │  lifetimes · topology · complexity score     │
  └─────────────────────────────────────────────┘
```

**Layer 1** is your application's DNA — known at compile time, validated before a line runs.

**Layer 2** is your application's current condition — continuously updated as services are resolved, scopes are created, and state changes.

**Layer 3** is your application's memory — the timeline of everything that happened, in what order, how long it took, and what failed.

These three layers together form a **complete, queryable model of the running application**.

---

## Part 5 — The Diagnostic Port

### What Can Be Queried

An AI agent, observability tool, or developer tool with access to the MCP diagnostic port can ask:

**Structural questions:**
- What services exist? What are their lifetimes?
- What does `CheckoutService` transitively depend on?
- Are there circular dependencies or captive dependency risks?
- What is the initialization order?

**State questions:**
- What singletons are currently instantiated?
- Which queries are stale or pending?
- What state machines are in which states?
- What workflows are currently running?

**Behavioral questions:**
- Why did checkout fail for this user?
- What's the P99 resolution time for PaymentPort?
- Which sagas triggered compensation in the last hour?
- What's the current logging error rate?

**Diagnostic questions synthesized from all three:**
- What's the blast radius if DatabasePort fails?
- Are there scope leaks?
- Suggest optimizations for the current graph.

No file parsing. No inference. No guessing. The application answers from its own runtime knowledge.

### The Concrete Scenario

A user reports: "Order placement sometimes fails."

```
  Step 1: Agent queries the graph for the order flow
  ────────────────────────────────────────────────────
  hexdi://graph/topology?filter=category:order

  → OrderService depends on: InventoryPort, PaymentPort, ShippingPort
  → OrderSaga steps: validate → reserve → pay → ship → confirm
  → Compensations: releaseInventory, refundPayment, cancelShipping

  Step 2: Agent queries recent failures
  ──────────────────────────────────────
  hexdi://tracing/errors?saga=OrderSaga&last=24h

  → 14 failures, all at step: processPayment
  → Error: PaymentGatewayTimeout (>5000ms)
  → Compensation executed correctly: inventory released all 14 times
  → No data corruption

  Step 3: Agent queries the payment service performance
  ──────────────────────────────────────────────────────
  hexdi://tracing/spans?port=PaymentPort&last=100

  → avg_duration_ms: 1,240
  → p99_duration_ms: 5,020
  → failure_pattern: all timeouts at exactly 5,000ms (timeout boundary)

  Agent diagnosis:
  ────────────────
  "PaymentGateway P99 latency has reached your 5,000ms timeout boundary.
   14% of orders are failing at payment. Inventory is released correctly
   each time, so no data integrity risk. Recommend: increase timeout to
   8,000ms (immediate relief) and add retry with exponential backoff."
```

The agent read **zero source files**. It queried the running application and got structured, truthful data from the system itself.

---

## Part 6 — The Roadmap: Five Phases from Plumbing to Consciousness

```
  Phase 1: PLUMBING      ████████████████████ 100%  DONE
  ──────────────────────────────────────────────────────────
  Container wires services. Type-safe. Compile-time validated.
  Ports, adapters, lifetimes, scopes, error handling.

  Phase 2: AWARENESS     ████████████████████ 100%  DONE
  ──────────────────────────────────────────────────────────
  Container knows itself. Graph inspection, runtime snapshots,
  resolution tracing, Inspector API. The self-knowledge exists.

  Phase 3: REPORTING      ██████████████████░░  ~90%  IN PROGRESS
  ──────────────────────────────────────────────────────────
  Every library reports what it knows. Store, query, saga, flow,
  logger, tracing — all feeding back to the central system.
  THE CRITICAL CONVERGENCE POINT.

  Phase 4: COMMUNICATION  ████████░░░░░░░░░░░░  40%  IN PROGRESS
  ──────────────────────────────────────────────────────────
  The application speaks to the outside world. MCP server, A2A
  agent card, OTel export, REST diagnostics, DevTools dashboard.
  AI tools query the app directly. OTel export: ✅ done.

  Phase 5: AUTONOMY       ░░░░░░░░░░░░░░░░░░░░   0%  PLANNED
  ──────────────────────────────────────────────────────────
  The application acts on its own knowledge. Auto-healing via
  saga compensations. Auto-optimization from trace data.
  MAPE-K loop closes completely.
```

### Where We Are Today

Phases 1 and 2 are **fully complete and production-ready** — the foundation and self-awareness layers exist. Phase 3 is 90% complete, meaning the reporting infrastructure is largely in place. Phase 4 has OTel export working, with MCP and A2A coming next.

---

## Part 7 — Why This Matters Now

### The Timing Is Right

Three things had to converge for this vision to be achievable. They just did.

**1. Type-level dependency graphs.** You need the graph as a first-class, introspectable data structure — not just implicit wiring. HexDI's compile-time graph validation, built on TypeScript's type system, makes this possible.

**2. AI protocols that consume structured data.** MCP (Anthropic, 2024) and A2A (Google, 2025) define how AI agents discover and interact with external systems. Without standardized protocols, self-knowledge had no consumer. Now it does.

**3. Ecosystem-wide commitment.** A DI container that knows about services is useful. A DI container where *every library* — state management, data fetching, workflow orchestration, AI capabilities — reports through the same system is **transformative**. This requires building the entire ecosystem with introspection as a first-class concern. That is what HexDI is doing.

### What Existing Frameworks Don't Provide

| Capability | Spring | Angular | Effect | HexDI |
|---|---|---|---|---|
| Compile-time graph validation | No | No | Yes (types) | **Yes** |
| Runtime dependency graph API | Partial | Partial | No | **Yes (full)** |
| Graph traversal & analysis | No | No | No | **Yes** |
| Resolution tracing (spans) | No | No | Yes (fibers) | **Yes** |
| Captive dependency detection | No | No | Yes (types) | **Yes (types + runtime)** |
| Serializable state | Partial | No | No | **Yes (JSON)** |
| Actionable graph suggestions | No | No | No | **Yes** |
| Full ecosystem reporting | No | No | Partial | **Yes (vision)** |
| MCP / A2A diagnostic port | No | No | No | **Yes (building)** |

---

## Part 8 — The End State

```
  An application that:

  1. Knows what it's made of        → graph
  2. Knows what it's doing          → tracing
  3. Knows what state it's in       → runtime + store
  4. Knows what data it has         → query
  5. Knows what processes are live  → saga + flow
  6. Knows what it can do           → agent
  7. Knows who's authorized         → guard
  8. Knows what it's logging        → logger
  9. Can tell you all of the above  → MCP + A2A
 10. Can act on that knowledge      → autonomic

  Not because someone instrumented it from the outside.
  Because self-knowledge is built into its foundation.
```

The DI container — the one component that touches everything — becomes the nervous system that makes the application aware of itself.

---

## Summary

HexDI is a TypeScript dependency injection framework that does something no framework has done before: it transforms the container from invisible plumbing into the application's nervous system.

By positioning every library in the ecosystem to report its state, behavior, and capabilities through the container, and by exposing that knowledge through standardized protocols like MCP and A2A, HexDI enables a new class of application — one that doesn't need to be examined from the outside because it can describe itself from within.

Old cars required mechanics who worked from the outside in, reading symptoms and guessing at causes. New cars have OBD-II ports that report their own state in real time, because self-awareness is built into the architecture.

**HexDI builds applications like new cars.**

Not instrumented from the outside. Self-aware from the foundation.

---

*"Every library in the ecosystem isn't just doing its job — it's also reporting what it knows to a central queryable system. The DI container stops being plumbing and becomes the application's nervous system."*
