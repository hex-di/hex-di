# Architecture as a Living Object

> Instead of a diagram in Confluence, the architecture is a live, queryable object inside the running system.

---

## The Core Idea

Every software system has an architecture. The question is: where does it live?

In most teams, the architecture lives in three places simultaneously:
1. A diagram, drawn at project kickoff, living in Confluence or Miro
2. A set of conventions, living in senior developers' heads
3. The actual code, doing whatever it does regardless of the diagram

These three versions diverge immediately and continue diverging until a crisis (an audit, a major bug, a new hire who does something "wrong") forces a reconciliation.

HexDI takes a different approach: **the architecture lives in one place — the code — and it is a real, queryable, inspectable object.**

---

## What the Architecture-as-Object Means

In HexDI, every service in your application is declared with three pieces of information:

1. **What it provides** — the contract it fulfills (a typed port)
2. **What it requires** — the services it depends on (also typed ports)
3. **Its lifetime** — singleton (one instance forever), scoped (one per session), or transient (fresh each time)

These declarations compose into a **GraphBuilder** — an immutable, validated dependency graph. When you call `.build()` on the graph, the TypeScript compiler validates the entire graph. Every dependency is resolved. Every contract is satisfied. If anything is wrong, you get a compile error.

The result is a **graph object** — an in-memory representation of the entire system architecture that:
- Is always current (it is the code)
- Is always correct (the compiler validated it)
- Can be queried, visualized, and exported at any time

---

## What Questions You Can Answer

With the architecture as an object, questions that currently require days of manual investigation take seconds:

### Structure Questions
- "What does `UserService` depend on?" → `graph.query(UserServicePort).requires`
- "What services does `UserService` transitively depend on?" → full subgraph traversal
- "What is the complete set of singleton services?" → `graph.filter({ lifetime: 'singleton' })`

### Boundary Questions
- "Can `UserService` access the database directly, or only through the repository?" → check the declared requires, it is the structural truth
- "Which services are shared across all requests vs isolated per request?" → lifetime scope query

### Compliance Questions
- "What services can access Patient Data?" → trace all paths to `PatientDataPort` in the graph
- "What changed in the dependency graph between release 1.2 and 1.3?" → diff the GraphBuilder declarations in version control
- "Does any service bypass the audit logging port?" → verify all services that touch regulated ports go through `AuditLogPort`

### Impact Analysis Questions
- "If I change the `DatabasePort` interface, what is affected?" → find all adapters that provide or require `DatabasePort`
- "If I swap the payment provider, what needs to change?" → find all services that depend on `PaymentPort`

---

## The Visualization Layer

HexDI includes `@hex-di/visualization` and `@hex-di/graph-viz` — tools that render the dependency graph as:

- A **DOT file** (Graphviz input, compatible with any graph rendering tool)
- A **Mermaid diagram** (renders in GitHub, Notion, and most documentation tools)
- An **interactive web view** with zoom, pan, and filtering

This is not a diagram you draw once and maintain. It is a diagram generated from the live graph. Every time you generate it, it reflects the current state of the code.

---

## Why This Matters for AI-Assisted Development

AI coding tools (GitHub Copilot, Claude, GPT-4) are most helpful when they have accurate context about the system they are working with. Today, providing that context requires manually copying documentation, class definitions, and configuration files into the AI's context window.

With HexDI's architecture object:
1. The MCP server exposes the graph to AI tools directly
2. An AI agent can query "what services exist?" and get a structurally accurate answer
3. An AI agent generating a new service knows exactly what ports are available to depend on
4. The compiler then validates that the AI's generated code correctly uses those ports

The architecture object becomes the AI's accurate, always-current understanding of the system.

---

## The Compliance Value

In a regulated environment, the architecture object has direct compliance value.

**21 CFR Part 11** requires that electronic records are accurate and trustworthy. The dependency graph is generated from the code — it is as accurate as the code itself. It cannot be hand-crafted to tell a false story.

**EU GMP Annex 11** requires documented evidence of system design. The GraphBuilder declarations are the design documentation — versioned in source control, reviewed via pull requests, traceable to specific changes.

**ALCOA+ attributability** requires knowing who did what, when. Changes to the architecture are code changes in version control. Every change has an author, a timestamp, and a review trail.

None of this requires any additional documentation work. It is a property of the architecture-as-object approach.

---

## The Contrast With Today

| Today | With HexDI |
|---|---|
| Architecture diagram: drawn once, never updated | Architecture: generated from code on demand |
| "What does this service connect to?" requires reading code | One query to the graph object |
| Compliance evidence: manually written documentation | Graph export + version control history |
| New hire: weeks to map the system mentally | New hire: minutes to read the generated visualization |
| Architecture review: periodic, expensive, incomplete | Architecture validity: structurally guaranteed, continuous |
