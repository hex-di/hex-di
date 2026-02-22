# The AI Velocity Gap

> AI generates code faster than humans can validate it. This is a structural problem — and structural problems require structural solutions.

---

## The Premise

AI coding assistants (GitHub Copilot, Claude, GPT-4 Code Interpreter) have dramatically reduced the time it takes to *produce* code. A developer who would have spent 2 hours writing a service can now produce a working draft in 20 minutes.

This is the promise. Here is the problem.

---

## The Reality: Experienced Developers Are Getting Slower

In July 2025, METR published a controlled study measuring the actual productivity impact of AI coding assistants on experienced open-source developers working on real tasks.

**Result: Experienced developers using AI tools were 19% slower on average.**

This was not a small study of novices. These were developers with deep familiarity with their codebases, working on the kinds of tasks they do every day.

The cause was clear: **the review burden exploded**. AI generated code fast. Validating that the generated code was correct, consistent with the architecture, and safe to merge took longer than writing it manually would have.

*Source: [METR, "Measuring the Impact of Early-2025 AI on Experienced Open-Source Developer Productivity", July 2025](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/)*

---

## The Mechanism: Why AI Makes Review Harder

When a developer writes code from scratch, they reason about correctness as they write. The result is often verbose and cautious — but the developer *knows* what it does.

When AI generates code, the developer receives a finished artifact and must work backwards to understand it. Worse:

1. **AI is fluent but not correct.** The code looks right. It may not be right.
2. **AI matches local patterns.** If the codebase has a bad pattern in 5 files, the AI will use it in the 6th.
3. **AI does not understand the architecture.** It sees the files you show it. It cannot see the dependency graph, the service boundaries, or the invariants.
4. **AI-generated code is confident.** There are no "I'm not sure about this" signals. All output looks equally authoritative.

---

## The Data

| Metric | Value | Source |
|---|---|---|
| Developer slowdown with AI tools | **19%** | METR 2025 |
| Developers spending extra time fixing AI code | **66%** | Greptile 2025 |
| Developers who always manually review AI code | **71%** | Greptile 2025 |
| AI code generation speed vs human | **10–100x faster** | Industry consensus |

The gap between production speed and validation speed is widening. In 2024 it was a minor friction. By 2026, with AI agents writing entire modules, it will be the primary development bottleneck.

---

## What the Gap Means for Architecture

AI tools generate code that is structurally plausible but architecturally unverified. In a codebase without explicit structural rules:

- An AI agent might introduce a circular dependency that only fails at runtime
- An AI agent might inject a service at the wrong lifetime scope, causing subtle state leaks
- An AI agent might create a direct dependency where a port was intended, breaking the abstraction boundary
- None of these will be caught by a linter, a formatter, or a standard code review

In a regulated environment (pharmaceutical, medical devices, clinical trials), any of these can become a compliance issue. A service that was supposed to be isolated from patient data, accessed through an approved adapter, directly touching a database — and nobody notices until the audit.

---

## The HexDI Solution

HexDI does not slow down AI generation. It moves structural validation from humans to the compiler.

**Before HexDI:** Developer generates code → manual review → hopes someone catches the wiring error → production incident or compliance finding.

**With HexDI:** Developer generates code → compiler validates structure → if the dependency graph is invalid, the code does not build → nothing bad reaches production.

The AI velocity gap closes because the review burden for structural correctness is eliminated. Code review focuses on business logic, not wiring.

Specifically:
- **Missing dependencies** → compile error with the port name
- **Circular dependencies** → compile error with the dependency chain
- **Wrong lifetime scope** → compile error
- **Unknown port resolution** → compile error
- **Duplicate providers** → compile error

The compiler reviews the architecture. Humans review the logic.

---

## For the Sanofi Context

In a GxP environment, "AI-generated code that looked right but had wrong service boundaries" is not an acceptable post-deployment finding. The validation burden at Sanofi is not just technical — it is regulatory.

HexDI's compile-time validation means that any AI-generated code that touches regulated services must be structurally correct before it can even be committed to a branch. This is not a process control. It is a technical control — and technical controls are stronger than process controls in every regulatory framework.

---

*Sources: [METR 2025](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/) · [Greptile 2025](https://www.greptile.com/state-of-ai-coding-2025)*
