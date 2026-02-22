# The Nervous System: An Application That Knows Itself

> Most applications are blind — they do things without knowing what they are doing. HexDI gives an application three layers of self-knowledge: structure, state, and behavior.

---

## The Concept

A human nervous system does two things simultaneously: it executes actions (moves muscles, regulates heartbeat), and it monitors the state of the body (pain signals, temperature, balance). The body acts and the nervous system observes.

Most software applications only act. They process requests, write to databases, send notifications. But they have no equivalent of a nervous system: no consistent, queryable representation of what they are doing, how they are structured, or whether they are functioning correctly.

HexDI is the nervous system for your application. It gives the application three layers of self-knowledge, each building on the last.

---

## Layer 1: Structure

**What the application is.**

The dependency graph is a complete, accurate, queryable map of every service in the application and how they connect. This is not documentation — it is the running code representing itself.

**Questions Layer 1 can answer:**
- "What does UserService depend on?" → immediate, structurally accurate answer
- "Which services are singletons vs scoped?" → lifetime graph query
- "What ports are available in this application?" → enumerate the graph nodes
- "If I change DatabasePort, what is the blast radius?" → graph traversal

This layer exists the moment you write your first `GraphBuilder.create().provide(...)`. It is always accurate because it is always the code.

---

## Layer 2: State

**What the application knows about itself at runtime.**

`@hex-di/devtools-ui` and the inspection APIs let you query the runtime state of the container:
- Which services have been instantiated?
- Which scopes are currently active?
- What is the resolution history for the current request?
- Are any disposed scopes still being held?

This is the equivalent of the nervous system's real-time awareness of body state. The application is not just executing — it is observing its own execution.

**What this enables:**
- Debugging without adding `console.log` everywhere
- Detecting scope leaks before they cause production issues
- Understanding what a long-running request is actually touching
- Generating audit evidence from live runtime state

---

## Layer 3: Behavior

**What the application is doing across time.**

`@hex-di/tracing` instruments the container so that every service resolution produces a trace span. When combined with state machines (`@hex-di/flow`), sagas (`@hex-di/saga`), and queries (`@hex-di/query`), the trace tells a complete story of what happened during a request:

1. HTTP request received (Hono middleware span)
2. User session resolved from scope
3. OrderFlow state machine transitioned from `idle` to `validating`
4. InventoryPort invoked → external API call (adapter span)
5. State machine transitioned to `paying`
6. PaymentPort invoked → external payment provider (adapter span)
7. Saga OrderProcessing step 2 completed
8. Logger.audit invoked with the outcome

This trace is:
- Exported to OpenTelemetry, Datadog, Jaeger, or Zipkin via adapter swap
- Structurally correct — it reflects the actual execution, not a manual log
- Filterable by port, by lifetime, by scope

**What this enables:**
- Performance bottleneck identification without instrumentation code
- Complete audit trails for GxP compliance without manual logging
- AI diagnostic queries against live traces ("what went wrong in the last failed order?")

---

## The MCP Integration: AI as a Diagnostician

HexDI's `@hex-di/mcp` package exposes the application's self-knowledge to AI tools via the Model Context Protocol (MCP).

An AI assistant (Claude, GPT-4, Copilot) connected to a HexDI MCP server can:

1. **Read the graph**: "Show me all services that depend on PatientDataPort"
2. **Read the traces**: "What happened in the last 5 failed requests?"
3. **Inspect the state**: "Which scopes are currently active in the payment subsystem?"
4. **Generate code**: "Create a new service that implements AuditLogPort, following the existing pattern in the graph"

The AI does not have to guess at the architecture. The architecture is the answer to every structural question — and the application can give that answer directly.

This is the full nervous system vision: an application that knows its structure, its state, and its behavior, and can communicate all three to AI tools that help build, debug, and extend it.

---

## Why This Matters for Sanofi

In a GxP environment, the nervous system concept has direct regulatory value:

**Layer 1 (Structure) → 21 CFR Part 11 §11.10(a)**: "Validation of systems to ensure accuracy, reliability, consistent intended performance." The dependency graph is structural proof that the system is wired as intended.

**Layer 2 (State) → EU GMP Annex 11 §4.8**: "Data audit trails." The runtime state inspection APIs provide real-time evidence of what the system is doing and who is doing it.

**Layer 3 (Behavior) → ALCOA+ Attributability + Completeness**: The trace records every service invocation with its inputs, outputs, and timing. Every action is attributed to a specific code path that is declared in the graph.

The nervous system is not a compliance add-on. It is the natural result of an application that knows itself — and it satisfies the audit requirements that currently require weeks of manual documentation work.

---

## The Contrast

| Application Without Nervous System | Application With HexDI Nervous System |
|---|---|
| Architecture: lives in a diagram that is probably stale | Architecture: lives in the graph, always current |
| Runtime state: debug by adding logs, grep, hope | Runtime state: queryable via inspection API |
| Behavior: reconstruct from log files after the fact | Behavior: traced automatically, exported to any backend |
| AI assistance: "can you look at these 5 files?" | AI assistance: "query the live graph and trace, here is what happened" |
| Compliance evidence: manual documentation | Compliance evidence: structural output of the running system |
