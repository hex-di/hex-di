---
id: RES-07
kind: research
title: "Category Theory & Extensible Effects for Compositional Architecture"
status: Draft
date: 2026-03-04
outcome: pending
related_adr: []
---

# RES-07: Category Theory & Extensible Effects for Compositional Architecture

## Executive Summary

Dependency injection is fundamentally about composition: composing services from ports, ports from adapters, and graphs from nodes. Category theory provides the mathematical framework for reasoning about when compositions are correct. Extensible effects bridge the gap between theory and practical effect system design.

Key insight: **The DI graph forms a category where ports are morphisms, adapters are natural transformations, and the associativity/identity laws guarantee correct nesting. Understanding this structure prevents composition bugs that type checking alone cannot catch.**

## Research Findings

### Finding 1: Fong, Spivak (2018) — Seven Sketches in Compositionality

**Paper**: Brendan Fong, David I. Spivak. "Seven Sketches in Compositionality: An Invitation to Applied Category Theory." Cambridge University Press, 2018.

**Theoretical insight**: Connects practical applications (databases, circuits, dynamical systems) with categorical concepts (adjoint functors, enriched categories, toposes). The central theme: compositionality is a universal property that appears across disparate domains.

**hex-di diagnosis**: The DI container composes adapters into a service graph. This composition must be associative (the order of wiring doesn't matter) and have an identity (a pass-through adapter that does nothing). Currently, these properties hold by convention but aren't formally guaranteed.

**Potential improvement**: Verify composition laws at the type level. An adapter combinator `compose(a, b)` should satisfy `compose(compose(a, b), c) ≡ compose(a, compose(b, c))` and `compose(a, identity) ≡ a`. TypeScript can encode these as type-level equalities.

### Finding 2: Kiselyov, Sabry, Swords (2013/2015) — Extensible Effects & Freer Monads

**Papers**:

- Oleg Kiselyov, Amr Sabry, Cameron Swords. "Extensible Effects." Haskell Symposium 2013.
- Oleg Kiselyov, Hiromi Ishii. "Freer Monads, More Extensible Effects." Haskell Symposium 2015.

**Theoretical insight**: Extensible effects modularly combine computational effects without monad transformers. The freer monad construction provides an efficient foundation: effects are described by an open union of operation signatures, and handlers interpret one effect at a time (the rest propagate). This is the practical realization of the algebraic effect theory from RES-01.

**hex-di diagnosis**: `Result<T, E>` uses union types as the open row. `andThen` extends the row (adds errors). `catchTag` handles one effect and propagates the rest. This is exactly the extensible effects pattern — already implemented, but without the categorical vocabulary.

**Potential improvement**: Recognize that `Result<T, E>` + `andThen` + `catchTag` forms a free monad over the error effect. This means all free monad laws apply: associativity of `andThen`, left/right identity with `ok()`, and naturality of `map`. These laws can be tested as property-based tests.

### Finding 3: Petricek (2018) — What We Talk About When We Talk About Monads

**Paper**: Tomas Petricek. "What We Talk About When We Talk About Monads." The Art, Science, and Engineering of Programming, 2018.

**Theoretical insight**: Examines monads through philosophical and cognitive lenses. Identifies three levels of understanding: formal (category theory), metaphorical (burritos, conveyor belts), and implementation-based (flatMap, bind). Shows that the community's understanding is multi-layered and that practical utility doesn't require deep formal knowledge.

**hex-di diagnosis**: hex-di's API uses implementation-based vocabulary (`andThen`, `map`, `catchTag`) rather than categorical vocabulary (`bind`, `fmap`, `handle`). This is the right choice for adoption — users don't need to know category theory to use the API correctly.

**Potential improvement**: Maintain the implementation-based API surface while using categorical structure internally for correctness verification. Documentation can optionally explain the categorical foundation for users who want deeper understanding.

### Finding 4: Leijen (2016) — Algebraic Effects for Functional Programming (Koka)

**Paper**: Daan Leijen. "Algebraic Effects for Functional Programming." MSR-TR-2016-29.

**Theoretical insight**: Presents row-typed algebraic effects with an efficient compilation strategy targeting JavaScript. Effect types use scoped labels and row polymorphism. The compilation to JavaScript demonstrates that algebraic effects have practical performance in dynamic runtimes.

**hex-di diagnosis**: The JavaScript compilation strategy validates that effect tracking can be zero-cost at runtime. TypeScript's discriminated unions provide the same row-polymorphic structure as Koka's effect rows. The compilation to JS means the theory maps directly to the target platform.

**Potential improvement**: Study Koka's compilation strategy for effect handler optimization. The `catchTag` implementation could benefit from the same optimizations (e.g., inlining known handlers, specializing for common error types).

## Applicability to hex-di

### Near-term (TypeScript-feasible)

- Property-based tests for monad laws (`andThen` associativity, `ok()` identity, `map` naturality)
- Explicit documentation of which categorical laws each combinator satisfies
- Maintain implementation-based vocabulary for API surface

### Medium-term (requires design work)

- Adapter composition combinators with verified associativity
- Free monad interpretation of the error channel for optimization opportunities
- Effect handler compilation optimizations inspired by Koka

### Long-term (theoretical foundation)

- Full categorical model of the DI graph (objects = services, morphisms = port connections)
- Functor/natural transformation framework for adapter composition verification
- Profunctor optics for port transformation and composition

## Risk Assessment

| Risk                                           | Likelihood | Impact | Mitigation                                      |
| ---------------------------------------------- | ---------- | ------ | ----------------------------------------------- |
| Category theory alienates users                | High       | Low    | Keep theory in internals and optional docs only |
| Property-based tests are slow                  | Low        | Low    | Run as separate CI job, not in unit test suite  |
| Over-abstraction for minimal practical benefit | Medium     | High   | Only adopt patterns that catch real bugs        |

## Bibliography

1. Fong, B., Spivak, D.I. (2018). "Seven Sketches in Compositionality." Cambridge University Press.
2. Kiselyov, O., Sabry, A., Swords, C. (2013). "Extensible Effects." Haskell Symposium 2013.
3. Kiselyov, O., Ishii, H. (2015). "Freer Monads, More Extensible Effects." Haskell Symposium 2015.
4. Petricek, T. (2018). "What We Talk About When We Talk About Monads." Programming 2018.
5. Leijen, D. (2016). "Algebraic Effects for Functional Programming." MSR-TR-2016-29.
