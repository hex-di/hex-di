---
id: RES-05
kind: research
title: "Module Systems & Compositional Verification for DI Graphs"
status: Draft
date: 2026-03-04
outcome: pending
related_adr: []
---

# RES-05: Module Systems & Compositional Verification for DI Graphs

## Executive Summary

Dependency injection is module linking. Ports are module signatures, adapters are module implementations, and the graph builder is the linker. Decades of research on ML module systems, Haskell's Backpack, and compositional compiler verification provide the formal foundation for reasoning about DI graph correctness.

Key insight: **Individually correct adapters must compose into a correct system. Compositional verification ensures this without re-verifying each adapter in every composition context.**

## Research Findings

### Finding 1: Rossberg, Russo, Dreyer (2014) — F-ing Modules

**Paper**: Andreas Rossberg, Claudio V. Russo, Derek Dreyer. "F-ing Modules." JFP 2014.

**Theoretical insight**: Elaborates ML modules into System F (polymorphic lambda calculus). Full ML module power — generative and applicative functors, first-class modules, recursive modules — expressed within a well-understood type theory. Provides a canonical interpretation of module features.

**hex-di diagnosis**: hex-di's port/adapter composition can be understood through the module lens: ports are signatures (what's expected), adapters are structures (what's provided), and the graph builder performs functor application (wiring implementations to interfaces).

**Potential improvement**: Formalize the graph builder as a functor application engine. This makes explicit what it means for an adapter to "satisfy" a port — it's signature matching. TypeScript's structural type system already does this, but the module-theoretic view clarifies edge cases (variance, optional methods, extra properties).

### Finding 2: Kilpatrick, Dreyer, SPJ, Marlow (2014) — Backpack

**Paper**: Scott Kilpatrick, Derek Dreyer, Simon Peyton Jones, Simon Marlow. "Backpack: Retrofitting Haskell with Interfaces." POPL 2014.

**Theoretical insight**: Adds explicit interface/implementation separation to Haskell. Packages can be parameterized by signatures (interfaces). Concrete implementations are supplied at link time. Multiple implementations can be mixed in, and the system checks compatibility.

**hex-di diagnosis**: Backpack's signature/implementation separation is almost exactly the port/adapter pattern. Backpack's "indefinite packages" (packages with unfilled signatures) correspond to services with unresolved port dependencies. "Instantiation" (filling in implementations) corresponds to adapter binding.

**Potential improvement**: Adopt Backpack's approach to signature matching: when binding an adapter to a port, verify not just type compatibility but also that the adapter provides all required operations. The graph builder could report "missing operations" errors similar to Backpack's linker errors.

### Finding 3: Kang, Kim, Hur, Dreyer, Vafeiadis (2016) — Lightweight Verification of Separate Compilation

**Paper**: Jeehoon Kang et al. "Lightweight Verification of Separate Compilation." POPL 2016.

**Theoretical insight**: Verifies that separately compiled modules link safely without full compositional compiler verification. Uses "specification linking" — each module is verified against a specification, and specifications compose to give end-to-end guarantees.

**hex-di diagnosis**: Adapters are developed separately. The graph builder links them at runtime. Currently, link-time verification is limited to port type compatibility. Nothing verifies behavioral properties (e.g., "adapter A's output satisfies adapter B's precondition").

**Potential improvement**: Define behavioral specifications for ports (preconditions, postconditions, invariants). The graph builder verifies that composed specifications are consistent. At minimum, port metadata could include machine-readable contracts that are checked at graph construction time.

### Finding 4: Neis et al. (2015) — Pilsner: A Compositionally Verified Compiler

**Paper**: Georg Neis et al. "Pilsner: A Compositionally Verified Compiler." ICFP 2015.

**Theoretical insight**: First compositionally verified compiler for a language with mutable state. Each compilation pass is verified independently, and proofs compose for end-to-end guarantees. Uses parametric bisimulation for cross-module reasoning.

**hex-di diagnosis**: When the graph builder composes adapters, each adapter has been "verified" (typed) independently. But the composition itself might violate properties that hold for individual components. For example, two adapters might individually be thread-safe but compose into a deadlock.

**Potential improvement**: Define composition properties that must be preserved (e.g., error propagation, disposal ordering, initialization ordering). Verify these properties at graph construction time rather than at runtime.

### Finding 5: Dreyer, Rossberg (2008) — Mixin' Up the ML Module System

**Paper**: Derek Dreyer, Andreas Rossberg. "Mixin' Up the ML Module System." ICFP 2008.

**Theoretical insight**: Mixin modules combine benefits of ML functors with recursive and mutually-dependent module definitions. Handles the case where modules need to reference each other, which standard functor composition cannot express.

**hex-di diagnosis**: Circular dependencies in the DI graph are currently detected and rejected at runtime. Mixin module theory provides a framework for understanding WHEN circular dependencies are safe (when the recursion is well-founded) and when they're not.

**Potential improvement**: Instead of blanket-rejecting cycles, detect whether cycles are well-founded (e.g., lazy initialization breaks the cycle). The graph builder could accept cycles with explicit `lazy()` annotations while rejecting direct cycles.

## Applicability to hex-di

### Near-term (TypeScript-feasible)

- Formalize adapter-to-port matching as signature matching with clear error messages
- Report "missing operations" errors when an adapter doesn't fully implement a port
- Verify disposal order respects dependency order at graph construction time

### Medium-term (requires design work)

- Behavioral port specifications (pre/postconditions) checked at graph construction
- Well-founded cycle detection (allow lazy-initialized circular dependencies)
- Composition property verification (error propagation, initialization ordering)

### Long-term (theoretical foundation)

- Full compositional verification of the graph builder's correctness
- Parametric bisimulation for cross-adapter reasoning
- Mixin semantics for safe circular dependencies

## Risk Assessment

| Risk                                                     | Likelihood | Impact | Mitigation                                      |
| -------------------------------------------------------- | ---------- | ------ | ----------------------------------------------- |
| Behavioral specifications too complex for users to write | High       | Medium | Provide common specifications as presets        |
| Composition verification is computationally expensive    | Medium     | Medium | Restrict to key properties, cache results       |
| Well-founded cycle detection has edge cases              | High       | High   | Conservative: reject ambiguous cycles           |
| Over-engineering beyond TypeScript's practical limits    | Medium     | High   | Incremental adoption, start with error messages |

## Bibliography

1. Rossberg, A., Russo, C.V., Dreyer, D. (2014). "F-ing Modules." JFP 2014.
2. Kilpatrick, S., Dreyer, D., Peyton Jones, S., Marlow, S. (2014). "Backpack." POPL 2014.
3. Kang, J. et al. (2016). "Lightweight Verification of Separate Compilation." POPL 2016.
4. Neis, G. et al. (2015). "Pilsner: A Compositionally Verified Compiler." ICFP 2015.
5. Dreyer, D., Rossberg, A. (2008). "Mixin' Up the ML Module System." ICFP 2008.
