# HexDI — Pitch for Sanofi Accelerator

> Why adopting HexDI will make your projects faster to build, safer to evolve, and easier to maintain — especially in the era of AI-assisted development.

---

## Slide 1 — The Context We Are In

**Generative AI is changing how code is written. It is not changing how fast humans can review it.**

- AI tools generate code **10–100x faster** than a developer can understand it
- **66% of developers** spend extra time fixing AI-generated code that is "almost right"
- In practice, AI tools make experienced developers **19% slower** — because the review burden explodes
- **71% of developers** do not merge AI code without manual review

> The bottleneck is no longer writing code. It is knowing whether the code is going in the right direction.

*Sources: METR study 2025, Greptile State of AI Coding 2025*

---

## Slide 2 — The Core Problem

**In a fast-moving codebase, three things break silently:**

1. **Architecture diverges from intention** — nobody notices until it is too late
2. **Bad patterns spread** — one shortcut becomes the team convention
3. **New people get lost** — the real architecture lives in senior developers' heads, not in the code

**The result:**
- Projects slow down over time instead of speeding up
- AI tools make the problem worse, not better — they generate code that matches patterns they see, including bad ones
- Compliance and audit readiness require weeks of manual documentation work

---

## Slide 3 — What HexDI Is (Without the Technical Words)

HexDI is a framework that turns your **architecture into a real, living object inside your system** — not a diagram in Confluence that nobody reads.

Three things it does:

1. **Makes the architecture visible** — you can see the whole system as a graph, always up to date, always correct
2. **Makes bad practices impossible** — the compiler blocks incorrect wiring before the code is ever committed
3. **Makes the code self-documenting** — everything a developer needs to understand the system is in the code itself

---

## Slide 4 — Win 1: AI Code is Validated Automatically

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

**With HexDI:** The compiler blocks invalid architecture. Circular dependencies: blocked. Missing dependency: blocked. Wrong wiring: blocked. The rules are not a convention — they are a constraint, enforced before any code can run.

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

**With HexDI:** A new developer opens the graph visualizer and sees the entire system in one view — every service, every dependency, every boundary. No reading 200 pages of wiki. No asking senior developers to explain the architecture. The system explains itself.

**What your manager gains:**
- Onboarding time cut from months to days
- Senior developers stop losing 30% of their time on architecture explanations
- New hires are productive and autonomous faster

---

## Slide 8 — Win 5: The Code Is the Documentation

**Problem today:** Documentation goes stale. Someone updates the code, forgets the doc. Six months later nobody trusts either.

**With HexDI:** The port name, the dependency declaration, the service contract — it is all in the code, typed, enforced. There is no separate document that can drift. If the code compiles, the documentation is correct. If it does not compile, the code is telling you exactly what is wrong.

**What your manager gains:**
- Zero documentation maintenance cost
- Zero documentation trust issues
- New developers read the code and understand the system — not a document that may or may not reflect reality

---

## Slide 9 — Win 6: Swap Any Technology Without Breaking Everything

**Problem today:** Changing a database, a logging tool, or an external API means touching dozens of files and hoping nothing breaks. Every technology decision feels permanent.

**With HexDI:** Every external dependency is behind a port (a typed contract). Swapping it means changing one file — the adapter. The compiler tells you exactly what needs updating. Nothing hidden, nothing implicit.

**What your manager gains:**
- Vendor lock-in disappears
- Technology decisions are reversible
- Migrations go from "3-month projects" to "1-week tasks"
- You can adopt better AI tooling, infrastructure, or vendors without architectural cost

---

## Slide 10 — Win 7: Compliance and Audit Readiness Are Structural

**The Sanofi context:** Proving to an auditor that system X only communicates with system Y through approved channels currently requires reading code and trusting that developers documented it correctly.

**With HexDI:** The entire dependency graph is explicit, typed, and inspectable. Every service boundary is declared in code. An auditor — or a compliance tool — can read the graph and get a complete, accurate picture of what talks to what, with zero ambiguity.

**What your manager gains:**
- Audit preparation goes from weeks of manual documentation to generating a report from the graph
- Compliance evidence is always current — it is produced by the running system, not written by hand
- Regulatory risk is reduced because the architecture is verifiably consistent with the documentation

---

## Slide 11 — Summary: What Changes for Your Manager

| Today | With HexDI |
|---|---|
| AI generates code nobody fully trusts | AI code is structurally validated automatically |
| Architecture is in a doc nobody reads | Architecture is the running system — always correct |
| Bad practices spread silently | Bad practices are blocked before the code is committed |
| New hire costs $35k in lost productivity | New hire reads the graph, productive in days |
| Docs drift from reality | No docs to maintain — the code is the truth |
| Swapping a tool is a multi-month project | Swapping a tool is a one-week task |
| Compliance requires weeks of manual evidence | Compliance is readable directly from the running graph |

---

## Slide 12 — The Ask

HexDI is not a tool you evaluate later. It is a structural decision you make at the beginning of a project.

**The cost of not adopting it:**
- Every sprint adds technical debt that gets harder to see and more expensive to fix
- Every AI-generated feature is a potential architecture problem waiting to surface
- Every new hire costs months of productivity that could be days

**The cost of adopting it:**
- One week of setup
- One learning curve for the team
- A codebase that gets easier to work with over time — not harder

> The longer you wait, the more the architecture is already decided by accident.

---

*Sources: [METR AI study 2025](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/) · [Greptile State of AI Coding 2025](https://www.greptile.com/state-of-ai-coding-2025) · [DevOps Institute onboarding 2024](https://fullscale.io/blog/developer-retention-costs-onboarding/) · [Stack Overflow Developer Survey 2024](https://survey.stackoverflow.co/2024/technology)*
