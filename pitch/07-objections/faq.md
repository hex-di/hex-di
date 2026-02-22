# Objections and Answers

> Every challenge we've heard, answered directly. No spin, no deflection.

---

## "It's just another DI container."

**The answer:**

A DI container manages how services are created. HexDI does that — but it is not primarily a container.

HexDI is an application platform built on three ideas that no existing DI container has combined:

1. **Compile-time validation** — not runtime, not decoration-based. The TypeScript compiler validates the entire dependency graph before a single line of code runs.

2. **A complete ecosystem** — 30+ packages covering logging, tracing, state management, data fetching, state machines, and workflow orchestration, all using the same port/adapter model. Not a container you stitch into other libraries.

3. **Architecture as an object** — the dependency graph is queryable, visualizable, and AI-readable. It is not just a way to get services. It is the live representation of your application's structure.

The difference between HexDI and "just a DI container" is the difference between a blueprint and a building that knows its own blueprint.

---

## "Our team already knows NestJS."

**The answer:**

NestJS knowledge is valuable and not wasted. It means your team understands:
- The value of dependency injection
- The port/adapter pattern (NestJS modules are a form of it)
- Testing with mock providers

HexDI takes these concepts and removes the parts that cause pain:
- No decorators, no `reflect-metadata` build tool issues
- No framework lock-in — your business logic has no NestJS imports
- Compile-time validation instead of runtime surprises

The typical migration for a developer who knows NestJS: **2–3 days** to become productive with HexDI. The concepts transfer; the mechanics are simpler.

For teams with existing NestJS projects, HexDI can be adopted incrementally — one new module at a time. There is no requirement to migrate the entire codebase before the first HexDI service is useful.

---

## "TypeScript compile errors slow us down."

**The answer:**

TypeScript compile errors slow you down if they are false positives — errors that don't reflect real problems. HexDI's compile errors are 100% real problems.

If `MissingDependencyError<typeof DatabasePort>` fires, it means you built a service that needs a database but the database is not provided. That is a real problem. The compile error told you about it in 2 seconds. Without the error, you would have found out in a production incident.

The question is not "do you want compile errors?" It is "when do you want to discover dependency problems?" Options:

1. At compile time: 2 seconds, zero cost to fix
2. At code review: 2 days, moderate cost
3. At QA: 1 week, high cost
4. In production: variable, potentially very high cost

HexDI eliminates options 2, 3, and 4 for a whole class of architectural errors. The initial learning curve — understanding how to read and fix dependency errors — pays for itself within the first sprint.

---

## "We don't need GxP compliance in this project."

**The answer:**

Three responses depending on the project context:

**If this is true:** HexDI's value doesn't depend on compliance requirements. The compile-time validation, AI collaboration story, and onboarding benefits apply to every project. Compliance features are there when needed; they add no overhead when not.

**If this might change:** Projects that start without compliance requirements sometimes acquire them — when a tool used for internal analysis gets used for a regulatory decision, when a pilot becomes a validated system, when a tool is included in an audit scope. Starting with HexDI means compliance readiness is already structural; adding it later to an unstructured project is expensive.

**If you're certain:** You still get the 7 other wins (AI validation, architecture visibility, enforced practices, fast onboarding, self-documenting code, vendor swap, documentation cost). GxP compliance is a bonus, not the primary value proposition.

---

## "AI tools can work without explicit architecture."

**The answer:**

AI tools can *produce code* without explicit architecture. The question is whether that code is correct.

The METR 2025 study found that AI tools made experienced developers 19% slower. The reason: increased review burden. AI generates fast; validating AI-generated architectural decisions is slow and error-prone.

In an unstructured codebase, AI tools:
- Match existing patterns, including bad ones
- Cannot infer implicit service boundaries
- Generate code that looks right but has wrong dependencies
- Create subtle lifecycle bugs that pass code review

In a HexDI codebase:
- Explicit ports give AI a clear model to follow
- The compiler validates AI output before it can be committed
- The MCP server gives AI live access to the architecture
- AI generates structurally correct code because the structure is explicit

The issue is not whether AI *can* work without explicit architecture. It is whether you can *trust* AI output without structural validation. In a GxP environment, the answer is no.

---

## "We can add architecture later."

**The answer:**

See [`04-competitive/vs-doing-nothing.md`](../04-competitive/vs-doing-nothing.md) for the full analysis. The summary:

Retrofitting HexDI into an unstructured 6-month-old codebase typically costs 9–22 weeks of engineering time. Starting with HexDI costs 1 week of setup and 1–2 weeks of team learning.

The break-even point is approximately 2–3 months of project development. After that, starting without HexDI has already cost more than starting with it would have.

The specific reason this applies to "we can add architecture later":
- Every sprint without explicit architecture adds implicit dependencies
- Implicit dependencies must be identified before they can be wrapped in ports
- Identification requires architectural archaeology — reading and understanding code that was never meant to be read architecturally
- The more complex the codebase, the more archaeology, the higher the cost

"Later" always costs more. The question is how much more.

---

## "What's the learning curve?"

**The answer:**

The core concepts of HexDI — ports, adapters, GraphBuilder — can be learned in a half-day workshop. The learning curve is:

**Day 1:** Understand ports (service contracts) and adapters (implementations). Build a simple three-service graph. Understand the three lifetimes.

**Days 2–3:** Add observability (logging, tracing). Understand scope management. Write tests using TestGraphBuilder.

**Week 2:** Advanced patterns: sagas, state machines, React integration. For most projects, this is optional at the start.

**The hidden accelerator:** The mental model compounds. A developer who understands how `@hex-di/core` works understands how `@hex-di/logger`, `@hex-di/store`, `@hex-di/saga`, and every other library in the ecosystem works. Learning one thing gives you 30 things.

The frequently-heard developer experience: "The first hour is confusing. The second hour it clicks. By the third hour I'm annoyed that I didn't know about this before."

---

## "What's the runtime overhead?"

**The answer:**

Near zero. HexDI uses phantom types — types that exist only at compile time and are erased in the output JavaScript. The runtime cost of creating a port token is one object creation. The runtime cost of the GraphBuilder is array manipulation during initialization. The runtime cost of service resolution is a Map lookup.

For comparison:
- InversifyJS uses `reflect-metadata` which adds runtime overhead to every constructor call
- NestJS module initialization creates significant startup overhead
- HexDI's container is initialized once; resolution is O(1)

The tracing instrumentation (`@hex-di/tracing`) adds overhead proportional to the number of spans created — which is the same overhead as any distributed tracing system. It is opt-in.

---

## "How does it handle large teams?"

**The answer:**

HexDI scales to large teams specifically because of its explicit boundary model.

In a large team, the primary problems are:
- Multiple developers adding services in conflicting ways
- Unclear ownership of shared services
- Integration bugs between subsystems developed by different teams

HexDI addresses each:

**Conflicting additions:** The GraphBuilder validates the whole graph. If two teams add conflicting providers (duplicate ports), the compile error surfaces immediately — before the conflict reaches main.

**Ownership clarity:** Ports are named, typed contracts. Team A owns `PatientDataPort`; Team B owns `ClinicalTrialPort`. Both are explicit. Neither team can accidentally depend on the other's implementation directly.

**Integration bugs:** The compile-time validation means integration bugs (wrong service, missing dependency) are caught before integration tests run. Cross-team integration testing focuses on behavior, not wiring.

The companies that HexDI is most valuable for are precisely the large teams where conventions fail silently and architectural complexity grows faster than any individual can track.

---

## "Our tech lead says it's over-engineered for our scale."

**The answer:**

This objection deserves a direct answer: HexDI's core is three packages — `@hex-di/core`, `@hex-di/graph`, `@hex-di/runtime`. For a small project, that is all you need. It is not NestJS's opinionated module system. It is not a complex IoC container. It is: "declare what your service provides, declare what it needs, let TypeScript validate the graph."

The question for the tech lead is: what is the cost of the first architectural mistake that reaches production? If the answer is "low" (a small internal tool with no compliance requirements), perhaps the overhead is not justified. If the answer is "high" (a system with regulated data, external API integrations, and a growing team), the question is whether the cost of the mistake is higher than the cost of the structure.

For most projects at the Sanofi Accelerator, the cost of an architectural mistake in a regulated environment exceeds the cost of HexDI's setup by a factor of 10–100.

---

## "What about the open-source maturity / is it production-ready?"

**The answer:**

HexDI is production-ready by design. Every package has:
- Comprehensive test suites with type-level tests (`*.test-d.ts`)
- Mutation testing (Stryker) for result correctness
- Benchmarks for performance characteristics
- GxP compliance test suites in critical packages

The architecture is stable: the port/adapter model is a 20-year-old pattern from Alistair Cockburn's Hexagonal Architecture. HexDI implements this model with modern TypeScript. The core concepts do not change.

For regulated environment adoption, the available compliance documentation (see [`06-sanofi/gxp-compliance.md`](../06-sanofi/gxp-compliance.md)) provides the foundation for validation protocols required by GAMP 5 Category 4 software.
