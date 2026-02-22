# Enforced Practices

> The compiler is the best architect on the team. It never forgets, never makes exceptions, and works on every commit.

---

## The Difference Between Convention and Constraint

**Convention:** The team has agreed that services should not directly instantiate their dependencies. This is a good principle. It is written in the architecture documentation. It is enforced in code review — when the reviewer remembers, has time, and recognizes the violation.

**Constraint:** There is no mechanism to directly instantiate a dependency. A service declares what it needs; the container provides it. The alternative does not compile.

HexDI replaces conventions with constraints. Not because developers cannot be trusted, but because constraints eliminate an entire category of errors that conventions cannot.

---

## What Gets Enforced

### Circular Dependencies — Compile Error

**What it prevents:** Service A depends on Service B, which depends on Service A. At runtime, this causes an infinite loop or a frozen startup. It is hard to diagnose because the error does not have an obvious cause.

**What HexDI does:** The GraphBuilder detects cycles at build time. The error message shows the full dependency chain: `A → B → A`. The code does not compile until the cycle is broken.

### Missing Dependencies — Compile Error

**What it prevents:** A service declares that it needs `DatabasePort`, but nobody provided a `DatabaseAdapter` in the graph. At runtime, the service either fails silently or throws an obscure error. In some frameworks, this is only discovered when the specific code path is executed.

**What HexDI does:** When you call `.build()` on the GraphBuilder, TypeScript verifies that every required dependency is satisfied. The error type is `MissingDependencyError<typeof DatabasePort>` — you know exactly which port is missing.

### Duplicate Providers — Compile Error

**What it prevents:** Two adapters both claim to implement `LoggerPort`. The container does not know which one to use. Behavior is undefined or framework-specific.

**What HexDI does:** `DuplicateProviderError<typeof LoggerPort>` at compile time. One provider per port, always.

### Invalid Port Resolution — Compile Error

**What it prevents:** Code that tries to resolve a service that is not in the graph. At runtime, this throws. With HexDI, it is a type error: you cannot call `container.resolve(UnknownPort)` without `UnknownPort` being declared in the graph type.

### Lifetime Scope Violations — Compile Error

**What it prevents:** A singleton service depending on a scoped service. This is a classic lifetime mismatch bug: the singleton captures the scoped dependency at creation time and holds it indefinitely, even after the scope is disposed. In HTTP servers, this means a singleton holds a per-request service beyond the request lifetime.

**What HexDI does:** The type system models lifetimes. Declaring a singleton-lifetime adapter that depends on a scoped-lifetime port is a compile error. The rules are structural.

---

## What This Replaces

### The Code Review Convention
Today: senior developers review PRs and check for architectural violations. This works when the reviewer has time, notices the issue, and agrees it is a violation.

With HexDI: the compiler reviews structural correctness on every build. The senior developer's attention is freed for business logic, performance, security — the things that actually require human judgment.

### The Runbook Culture
Today: "how to wire up a new service" is in a runbook, a wiki, or tribal knowledge. Getting it wrong is easy; nobody finds out until runtime.

With HexDI: the only way to wire up a new service is to declare its port and its dependencies. The compiler guides you. You cannot do it wrong without getting a clear error.

### The "Works On My Machine" Problem
Today: architectural bugs often depend on initialization order, environment configuration, or subtle state. They pass code review and local tests and fail in staging or production.

With HexDI: the architecture is validated at compile time, before any code runs. The initialization order is determined by the graph, not by implicit load order. "Works on my machine" architectural bugs cannot exist.

---

## The Contractor and AI Agent Problem

Two specific scenarios where conventions completely fail and constraints are essential:

**Contractors:** A contractor is brought in for 3 months to build a feature. They are unfamiliar with the team's architectural conventions. They build something that works but violates the intended boundaries. The violation is discovered in a code review, or at an audit, or not at all.

With HexDI: the contractor must declare their service's dependencies using the existing port system. If they bypass a boundary (e.g., accessing a database directly without going through the repository port), the code does not compile. The constraint guides them toward the correct pattern without any team intervention.

**AI Agents:** An AI coding agent generates a new service module. It generates code that looks architecturally correct but has a subtle wiring error or bypasses a declared boundary. The code passes lint checks and style rules. It fails at runtime.

With HexDI: the AI agent's output must compile. If the generated code violates the structural rules — missing dependency, wrong lifetime, bypassed port — it does not build. The structural validation is fully automated and runs before the code is ever executed.

---

## The Psychological Shift

When practices are conventions, they create cognitive load. Developers must remember the rules, apply them under time pressure, and catch violations in review. This is fatiguing and error-prone.

When practices are constraints, they disappear from conscious consideration. Developers focus on business logic because architectural correctness is handled by the compiler. They get faster feedback (a compile error is faster than a production incident), and they trust the feedback (the compiler is never wrong).

Teams that adopt HexDI report that after the initial learning curve, the compiler feels like a safety net rather than an obstacle. Architectural mistakes are discovered in seconds rather than days. The quality floor rises. And it rises permanently — not for as long as everyone remembers to follow the convention.
