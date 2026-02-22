# HexDI Pitch Kit — Sanofi Accelerator

> A complete set of materials to convince stakeholders to adopt HexDI as the structural foundation for all Sanofi Accelerator projects.

---

## What Is In This Folder

| File / Folder | What It Is | Who It's For |
|---|---|---|
| [`sanofi-accelerator.md`](./sanofi-accelerator.md) | Original 12-slide deck | Non-technical manager, first meeting |
| [`deck.md`](./deck.md) | Expanded master deck (14 slides) | Any audience, any meeting |
| [`01-problem/`](./01-problem/) | Root causes: AI velocity gap, drift, costs | Technical leads, skeptics |
| [`02-solution/`](./02-solution/) | What HexDI is and how it works | All audiences |
| [`03-wins/`](./03-wins/) | All benefits on one page | Exec summary, time-constrained audience |
| [`04-competitive/`](./04-competitive/) | NestJS, InversifyJS, doing nothing | Teams with existing choices |
| [`05-roi/`](./05-roi/) | Sourced numbers and calculations | Finance, programme managers |
| [`06-sanofi/`](./06-sanofi/) | GxP compliance, AI + pharma, use cases | Compliance, QA, architects |
| [`07-objections/`](./07-objections/) | Every likely challenge, answered | Any objecting stakeholder |

---

## Recommended Reading Order

### 5-Minute Executive Summary
1. [`03-wins/fast-wins.md`](./03-wins/fast-wins.md) — the full value on one page
2. [`deck.md`](./deck.md) Slides 0 and 13 — the hook and the ask

### 30-Minute Deep Dive
1. [`deck.md`](./deck.md) — read straight through
2. [`05-roi/numbers.md`](./05-roi/numbers.md) — anchor the business case
3. [`07-objections/faq.md`](./07-objections/faq.md) — prepare for challenges

### Technical Audience
1. [`02-solution/full-ecosystem.md`](./02-solution/full-ecosystem.md) — the 20+ package platform
2. [`02-solution/nervous-system.md`](./02-solution/nervous-system.md) — the "application that knows itself"
3. [`02-solution/enforced-practices.md`](./02-solution/enforced-practices.md) — compiler-as-enforcer
4. [`04-competitive/vs-nestjs.md`](./04-competitive/vs-nestjs.md) and [`vs-inversify.md`](./04-competitive/vs-inversify.md)

### Compliance / QA Audience
1. [`06-sanofi/gxp-compliance.md`](./06-sanofi/gxp-compliance.md) — 21 CFR Part 11 gap analysis
2. [`06-sanofi/use-cases.md`](./06-sanofi/use-cases.md) — concrete Sanofi project scenarios
3. [`02-solution/architecture-as-object.md`](./02-solution/architecture-as-object.md) — why the graph is audit-ready

---

## The Core Argument (One Paragraph)

Software architecture is a compliance artifact. At Sanofi, proving that system X only touches system Y through approved channels is currently a manual, expensive, trust-dependent process. HexDI makes the architecture the live truth — a queryable graph that is structurally correct by construction, because invalid wiring does not compile. Every 21 CFR Part 11 and ALCOA+ requirement around attributability, integrity, and audit trails maps directly to a HexDI mechanism. Combined with the AI collaboration story — where HexDI's explicit contracts let AI tools reason correctly about structure, and the compiler validates the output — this is not a better DI container. It is the missing infrastructure layer that makes AI-assisted development safe in a regulated environment.
