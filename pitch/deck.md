# HexDI — Master Pitch Deck

> The complete presentation. 14 slides. Every argument, every win, every ask.

---

## Slide 0 — The Application That Knows Itself

**A question for your team:**

Right now, can you answer these questions in under five minutes — without reading code?

- What does Service A depend on?
- Which services are shared across all requests vs isolated per session?
- If you replace your logging tool, what exactly breaks?
- Can you prove to an auditor that System X only talks to System Y through approved channels?

Most teams cannot. Not because they haven't documented it — but because the code and the documentation are two different things, and they diverge the moment they're both written.

**HexDI makes the architecture the code. And the code the truth.**

---

## Slide 1 — The Context We Are In

**Generative AI is changing how code is written. It is not changing how fast humans can review it.**

- AI tools generate code **10–100x faster** than a developer can understand it
- **66% of developers** spend extra time fixing AI-generated code that is "almost right"
- In practice, AI tools make experienced developers **19% slower** — because the review burden explodes
- **71% of developers** do not merge AI code without manual review

> The bottleneck is no longer writing code. It is knowing whether the code is going in the right direction.

*Sources: [METR study 2025](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/), [Greptile State of AI Coding 2025](https://www.greptile.com/state-of-ai-coding-2025)*

---

## Slide 2 — The Core Problem

**In a fast-moving codebase, three things break silently:**

1. **Architecture diverges from intention** — nobody notices until it is too late
2. **Bad patterns spread** — one shortcut becomes the team convention
3. **New people get lost** — the real architecture lives in senior developers' heads, not in the code

**The result:**

- Projects slow down over time instead of speeding up
- AI tools make the problem worse — they generate code that matches patterns they see, including bad ones
- Compliance and audit readiness require weeks of manual documentation work

---

## Slide 3 — What HexDI Is (Without the Technical Words)

HexDI is a framework that turns your **architecture into a real, living object inside your system** — not a diagram in Confluence that nobody reads.

Three things it does:

1. **Makes the architecture visible** — you can see the whole system as a graph, always up to date, always correct
2. **Makes bad practices impossible** — the compiler blocks incorrect wiring before the code is ever committed
3. **Makes the code self-documenting** — everything a developer needs to understand the system is in the code itself

---

## Slide 4 — Win 1: AI Code Is Validated Automatically

**Problem:** Your team uses AI to write code faster. But who validates that the AI-generated architecture is correct?

**With HexDI:** The compiler does. If the AI generates a badly-wired dependency, the code does not compile. The structural rules are enforced at the machine level — not by code review, not by culture, not by a senior developer catching it on a Friday afternoon.

**What your manager gains:**
- AI collaboration actually accelerates delivery instead of creating hidden technical debt
- Code review focuses on business logic, not structural mistakes
- No AI-generated architecture disaster reaches production

---

## Slide 5 — Win 2: Architecture as a Living Object

**Problem:** Your architecture is in Confluence. Your code is doing something else. Nobody knows exactly when they diverged — or by how much.

**With HexDI:** The dependency graph is a real, queryable object in the running system. Every service, every dependency, every boundary — declared in code, enforced by the compiler, visualizable on demand.

**What your manager gains:**
- One command shows the full system architecture — always correct, never stale
- No architecture meetings to figure out what the system actually does
- Architecture drift is structurally impossible — if the graph is wrong, the code does not compile

---

## Slide 6 — Win 3: Best Practices Are Enforced, Not Suggested

**Problem:** A junior developer, a contractor, or an AI agent introduces a badly-wired service. You find out in production.

**With HexDI:** The compiler blocks invalid architecture. Circular dependencies: blocked. Missing dependency: blocked. Wrong wiring: blocked. The rules are not a convention — they are a constraint.

**What your manager gains:**
- The quality floor of your codebase is structurally guaranteed
- Contractors and new hires cannot silently introduce architectural problems
- AI-generated code follows the same rules as human-written code — or it does not compile

---

## Slide 7 — Win 4: Onboarding in Days, Not Months

**The cost of onboarding today:**
- Standard onboarding costs **$35,000 per hire** in salary and lost productivity
- Sprint velocity drops **25–40%** when integrating new team members
- Senior developers lose **30% of their productivity** mentoring new hires on architecture basics

*Source: DevOps Institute 2024*

**With HexDI:** A new developer opens the graph visualizer and sees the entire system in one view — every service, every dependency, every boundary. No reading 200 pages of wiki. No asking senior developers.

---

## Slide 8 — The Full Ecosystem

**HexDI is not just a DI container. It is a platform.**

One mental model. Every layer of your application.

| Layer | HexDI Package |
|---|---|
| Dependency wiring | `@hex-di/core`, `@hex-di/graph`, `@hex-di/runtime` |
| Error handling | `@hex-di/result` — Rust-style typed errors |
| Logging | `@hex-di/logger` + Pino, Winston, Bunyan adapters |
| Distributed tracing | `@hex-di/tracing` + OpenTelemetry, Datadog, Jaeger, Zipkin |
| Data fetching | `@hex-di/query` — port-keyed, type-safe, cached |
| Reactive state | `@hex-di/store` — state as a first-class DI port |
| State machines | `@hex-di/flow` — typed statecharts, effects as port invocations |
| Workflow orchestration | `@hex-di/saga` — long-running processes with automatic rollback |
| React integration | `@hex-di/react`, `@hex-di/query-react`, `@hex-di/store-react` |
| Visualization | `@hex-di/visualization`, `@hex-di/graph-viz` |
| AI/MCP tooling | `@hex-di/agent`, `@hex-di/mcp` |

**Your team learns one model. It applies everywhere.**

No more stitching together 7 different libraries with incompatible patterns. No more "how do we test this one?" for every new tool.

---

## Slide 9 — The AI Collaboration Story

**The promise of AI in software development requires explicit contracts.**

AI tools (GitHub Copilot, Claude, GPT-4) are pattern-matchers. They generate code that looks like what they've seen. In an unstructured codebase, they generate inconsistent, ambiguous code that diverges from the architecture.

**In a HexDI codebase:**

1. Every service has an explicit typed contract (a port)
2. Every dependency is declared, not inferred
3. The graph structure is machine-readable at all times

**This means:**
- AI can read the graph and generate structurally correct code
- The compiler validates AI output before it merges
- The MCP server lets AI tools query the live architecture to understand context
- AI-generated sagas, stores, and state machines follow the same validated pattern as hand-written ones

> HexDI is the difference between "AI writes code that looks right" and "AI writes code that is right."

---

## Slide 10 — The Sanofi Angle: Compliance Is Structural

**The regulatory context:**

21 CFR Part 11, EU GMP Annex 11, and GAMP 5 all require:
- Attributability — every system action traceable to its source
- Data integrity — records that cannot be silently altered
- Audit trails — complete, accurate, time-stamped records of changes
- Access control — only authorized code paths can access regulated data

**The current approach:** Manual documentation. Developers write what the system does. Auditors trust it (or don't).

**With HexDI:** The dependency graph is the compliance evidence.
- Every service boundary is declared in typed code
- Every access path is explicit and compiler-enforced
- Every change to the wiring is a code change — versioned, reviewed, traceable
- An auditor can read the graph and see exactly what talks to what

> Compliance stops being a documentation problem. It becomes a structural guarantee.

---

## Slide 11 — Competitive Position

| | HexDI | NestJS | InversifyJS | Ad-hoc |
|---|---|---|---|---|
| Compile-time validation | ✅ Full | ❌ Runtime only | ❌ Runtime only | ❌ None |
| No decorators / reflect-metadata | ✅ | ❌ Required | ❌ Required | ✅ |
| Full ecosystem (one model) | ✅ 20+ packages | ⚠️ Framework-specific | ❌ DI only | ❌ None |
| AI-readable architecture | ✅ Explicit graph | ⚠️ Partial | ❌ | ❌ |
| GxP compliance pathway | ✅ Built-in | ❌ Manual | ❌ Manual | ❌ Manual |
| Framework lock-in | ❌ None | ✅ Strong | ❌ None | — |
| Vendor swap cost | Low (1 adapter) | High | Moderate | High |

---

## Slide 12 — The Cost of Doing Nothing

**Every sprint without HexDI, the following accumulates:**

- **Technical debt compounds** — each shortcut makes the next shortcut more likely
- **Architecture diverges** — from intent, from docs, from compliance requirements
- **AI tools generate** code that matches the patterns they see — including the bad ones
- **New hires** spend weeks learning undocumented architecture from senior developers
- **Compliance work** grows — each new service is a manually-documented boundary

**The compounding problem:**

After 6 months of unstructured development, retrofitting HexDI means:
- Identifying and documenting every existing service boundary
- Refactoring for explicit contracts
- Rebuilding test infrastructure

It is not impossible. But it takes 3–6x longer than starting correctly.

> Every project that ships without HexDI is a project that paid more than it needed to.

---

## Slide 13 — The Ask

HexDI is not a tool you evaluate later. It is a structural decision you make at the beginning of a project.

**The cost of adopting it:**
- One week of setup
- One learning curve for the team (days, not months)
- A codebase that gets easier to work with over time — not harder

**What we are asking for:**
1. Adopt HexDI as the structural foundation for the next Sanofi Accelerator project
2. Run it for one sprint — measure the onboarding, compliance, and AI review experience
3. Share the results across the Accelerator portfolio

> The longer you wait, the more the architecture is already decided by accident.

---

*Sources: [METR AI study 2025](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/) · [Greptile State of AI Coding 2025](https://www.greptile.com/state-of-ai-coding-2025) · [DevOps Institute onboarding 2024](https://fullscale.io/blog/developer-retention-costs-onboarding/) · [Stack Overflow Developer Survey 2024](https://survey.stackoverflow.co/2024/technology)*
