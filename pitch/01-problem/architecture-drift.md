# Architecture Drift

> The gap between what the architecture document says and what the code actually does. It opens the day the first document is written, and it widens every sprint.

---

## What Architecture Drift Is

Architecture drift is the progressive divergence between:

1. **Intended architecture** — the design that was agreed in the kickoff meeting, documented in Confluence, communicated to the team
2. **Actual architecture** — what the code does, which services talk to which, what dependencies exist

On day one of a project, these are aligned. By month three, they are meaningfully different. By year one, they are often unrecognizably different.

---

## How It Happens

Architecture drift is not the result of bad developers or bad intentions. It is structural.

### The Documentation Update Problem

When a developer changes the code, they have two jobs: change the code and update the documentation. In practice, under time pressure, the code change gets done and the documentation update gets deferred. "I'll update the diagram later." Later never comes.

The documentation is now one sprint behind. Next sprint it is two sprints behind. The gap compounds.

### The Convention Problem

Good teams establish architecture conventions: "we use the Repository pattern for data access," "every external dependency goes behind an interface." These are shared knowledge, not enforced constraints.

When a new developer joins, or a contractor is brought in, or a junior developer is working late on a deadline, the convention may not be followed. The shortcut that worked once becomes the pattern the AI tool learns. The bad practice spreads.

### The AI Amplification Problem

AI coding assistants learn from the code they are shown. If the codebase has 5 files with correct dependency injection and 3 files where it was bypassed "just this once," the AI will generate both patterns. It cannot distinguish intended architecture from accumulated exceptions.

This means architecture drift accelerates with AI adoption. The AI is not malicious — it is pattern-matching. But in an unstructured codebase, patterns include the drift.

---

## The Cost of Architecture Drift

### Short-Term: Debugging Becomes Harder

When architecture is undocumented and inconsistent, debugging requires reconstructing the system mentally from first principles every time. Developers cannot trust the documentation. They cannot trust that the code follows the pattern. They must read every file.

Developers spend 35–50% of their time debugging. [Source: Cambridge University / ACM Queue] Architecture drift inflates this by making every debugging session more expensive.

### Medium-Term: Changes Become Risky

"What breaks if I change this?" becomes unanswerable without extensive manual analysis. The team cannot trace dependencies. They adopt defensive practices: extensive manual testing, long testing cycles, change freezes.

Vendor swaps — changing a logging library, migrating a database, adopting a new API — become multi-month projects rather than multi-day tasks. This is pure architectural overhead: the business pays for work that could have been avoided.

### Long-Term: Compliance Becomes Impossible

In a regulated environment, the architecture is a compliance artifact. Auditors ask: does System A only access Patient Data through approved channels? Can you prove it?

When architecture has drifted, the honest answer is: "we think so, and here is the documentation we wrote six months ago." Auditors do not accept this. The team spends weeks manually reconstructing evidence that should have been structurally impossible to dispute.

---

## Why Traditional Solutions Fail

### "We'll Do Architecture Reviews"
Architecture reviews catch some drift at the time of the review. By the next review, drift has resumed. Reviews are expensive, periodic, and depend on human attention — which is finite.

### "We'll Write Better Documentation"
Documentation is always behind the code. The more sophisticated the documentation, the harder it is to keep current. ADRs, C4 diagrams, Confluence pages — all valid, all stale within months.

### "We'll Enforce with Linting"
Linters check syntax and code quality. They cannot validate that the dependency graph reflects the intended architecture. ESLint cannot tell you that a circular dependency was introduced, or that a service is being accessed without going through its port.

### "We'll Train the Team"
Training transfers conventions, not constraints. Conventions are followed when the developer remembers, has time, and agrees with the decision. Constraints are followed always — because the code does not compile otherwise.

---

## The HexDI Solution

HexDI makes architecture drift structurally impossible for the core dependency graph.

Every dependency is declared in code. Every service boundary is a typed port. The GraphBuilder validates the entire dependency graph at compile time. If the graph is inconsistent, the code does not build.

This means:

- **A developer cannot bypass a port** — the factory function receives typed dependencies; there is no mechanism to directly instantiate a service
- **A circular dependency cannot be introduced** — compile error with the full dependency chain
- **A missing dependency cannot be silently ignored** — compile error at the call site
- **The documentation cannot drift from the code** — the dependency graph *is* the code

The architecture lives in the GraphBuilder declarations. Every change to the architecture is a code change. Every code change is versioned, reviewed, and traceable. The gap between documentation and reality cannot open because the documentation is the runtime graph.

---

## For the Sanofi Context

In a GxP project, architecture drift is not just a technical problem — it is a regulatory risk. An auditor asking "what does Service X communicate with?" cannot be answered with "according to our Confluence page, written eight months ago." The auditor wants evidence. HexDI's dependency graph is evidence: versioned, typed, structurally correct by construction.

---

*Sources: [Cambridge University/ACM debugging time](https://queue.acm.org/detail.cfm?id=3454124) · [IBM Systems Sciences defect cost multiplier](https://www.ibm.com/topics/bug-tracking)*
