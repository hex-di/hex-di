---
id: RES-06
kind: research
title: "Contracts, Blame & Gradual Typing for TypeScript DI"
status: Draft
date: 2026-03-04
outcome: pending
related_adr: []
---

# RES-06: Contracts, Blame & Gradual Typing for TypeScript DI

## Executive Summary

TypeScript is a gradually typed language — static and dynamic typing coexist. When hex-di's runtime type checking detects a mismatch (e.g., an adapter returning the wrong error type), blame tracking identifies whether the fault lies in the port definition, the adapter implementation, or the composition. Contract theory and gradual typing research formalize this reasoning.

Key insight: **If port types check at compile time, any runtime failure must be in the adapter or the composition, not in the service logic. Blame theory makes this guarantee precise.**

## Research Findings

### Finding 1: Findler, Felleisen (2002) — Contracts for Higher-Order Functions

**Paper**: Robert Bruce Findler, Matthias Felleisen. "Contracts for Higher-Order Functions." ICFP 2002.

**Theoretical insight**: Introduces higher-order contracts — runtime checks for functions that take functions as arguments. Develops the blame calculus: when a contract check fails, blame is assigned to the party that violated the contract. For higher-order functions, blame can fall on the caller (for providing a bad argument) or the callee (for returning a bad result).

**hex-di diagnosis**: Port contracts are higher-order — a port specifies a service interface whose methods accept and return complex types including callbacks and Result types. When an adapter violates its contract, error messages should precisely identify: (a) which port, (b) which method, (c) which party is at fault.

**Potential improvement**: Instrument adapter bindings with blame-aware contract checks. When an adapter method returns an unexpected error type, the blame message identifies the adapter factory (not the service consuming the port) as the violator.

### Finding 2: Ahmed et al. (2011) — Blame for All

**Paper**: Amal Ahmed, Robert Bruce Findler, Jeremy Siek, Philip Wadler. "Blame for All." POPL 2011.

**Theoretical insight**: Extends blame tracking to gradually typed systems. Establishes the blame theorem: well-typed programs in the static portion cannot be blamed for failures. Only the dynamically typed boundaries (where types are erased or unknown) can be at fault.

**hex-di diagnosis**: In hex-di, the "well-typed" portion is port definitions with their TypeScript types. The "dynamic" portion is runtime adapter resolution and the graph builder. The blame theorem means: if types check at the port level, runtime failures are always in the adapter or composition layer.

**Potential improvement**: This validates the architecture — the type-safe layer (ports, Result types, tagged errors) is blame-free. Invest in making the dynamic layer (graph builder, adapter resolution) as small as possible to minimize the blame surface.

### Finding 3: New, Licata, Ahmed (2019) — Gradual Type Theory

**Paper**: Max S. New, Daniel R. Licata, Amal Ahmed. "Gradual Type Theory." POPL 2019.

**Theoretical insight**: Formal framework for reasoning about program equivalence in gradually typed languages. Proves that gradual upcasts are pure and gradual downcasts are strict. Establishes that type-based refactorings and optimizations remain correct when transitioning from fully static to gradual typing.

**hex-di diagnosis**: TypeScript's type erasure means runtime behavior doesn't change when types are added or removed. But hex-di's type-level features (phantom brands, conditional types for error narrowing) must remain behavioral equivalences — adding types should never change runtime behavior.

**Potential improvement**: Use Gradual Type Theory as a design principle: every type-level feature in hex-di must satisfy the gradual guarantee. Adding type annotations to port definitions must not change runtime behavior, only catch more errors at compile time.

### Finding 4: Siek, Thiemann, Wadler (2021) — Blame and Coercion

**Paper**: Jeremy Siek, Peter Thiemann, Philip Wadler. "Blame and Coercion: Together Again for the First Time." JFP 2021.

**Theoretical insight**: Reconciles blame tracking and coercion approaches within gradual typing. Coercions are runtime type conversions inserted at type boundaries. Blame tracking identifies which coercion failed and who is responsible.

**hex-di diagnosis**: When the graph builder resolves an adapter for a port, it performs a kind of coercion — the adapter's concrete type is "cast" to the port's interface type. TypeScript does this structurally at compile time, but runtime mismatches (e.g., missing methods) can still occur if the graph is assembled dynamically.

**Potential improvement**: Insert explicit runtime contract checks (coercions) at adapter binding points. When a check fails, blame is traced back to the specific `createAdapter()` call that produced the incompatible implementation, not to the service consuming the port.

### Finding 5: Findler, Tobin-Hochstadt, Flatt (2012) — Chaperones and Impersonators

**Paper**: T. Stephen Strickland, Sam Tobin-Hochstadt, Robert Bruce Findler, Matthew Flatt. "Chaperones and Impersonators." OOPSLA 2012.

**Theoretical insight**: Chaperones wrap values to interpose on operations while maintaining behavioral equivalence. Impersonators are a stronger form that can change behavior. Chaperones enable transparent contract enforcement without changing the underlying value's identity.

**hex-di diagnosis**: Adapter decorators (adding logging, caching, guard checks) are chaperones — they wrap the adapter to add behavior while maintaining the port contract. Currently, nothing enforces that decorators maintain behavioral equivalence.

**Potential improvement**: Define adapter decorators as formal chaperones: they can observe and log but not change the core adapter's return values. Guard decorators can reject (fail fast) but not modify success values. This is enforced by the decorator type signature.

## Applicability to hex-di

### Near-term (TypeScript-feasible)

- Blame-aware error messages identifying which adapter factory violated which port contract
- Runtime contract checks at adapter binding points with clear blame assignment
- Gradual guarantee as a design principle: type annotations never change runtime behavior

### Medium-term (requires design work)

- Formal decorator/chaperone model ensuring decorators maintain port contracts
- Minimized blame surface by reducing the dynamic layer (graph builder) scope
- Contract inheritance for composed ports and adapter chains

### Long-term (theoretical foundation)

- Full blame calculus for the DI graph — every runtime failure traces to a specific contract violation
- Coercion-based adapter binding with automatic contract insertion
- Verified decorator composition preserving behavioral equivalence

## Risk Assessment

| Risk                                                     | Likelihood | Impact | Mitigation                                      |
| -------------------------------------------------------- | ---------- | ------ | ----------------------------------------------- |
| Runtime contract checks add performance overhead         | Medium     | Medium | Make checks dev-mode only, strip in production  |
| Blame messages too complex for users to understand       | Medium     | High   | Layer messages: simple summary + detailed trace |
| Chaperone model too restrictive for practical decorators | Low        | Medium | Allow explicit opt-out with `unsafeDecorator()` |

## Bibliography

1. Findler, R.B., Felleisen, M. (2002). "Contracts for Higher-Order Functions." ICFP 2002.
2. Ahmed, A. et al. (2011). "Blame for All." POPL 2011.
3. New, M.S., Licata, D.R., Ahmed, A. (2019). "Gradual Type Theory." POPL 2019.
4. Siek, J., Thiemann, P., Wadler, P. (2021). "Blame and Coercion." JFP 2021.
5. Strickland, T.S. et al. (2012). "Chaperones and Impersonators." OOPSLA 2012.
