---
id: RES-03
kind: research
title: "Linear & Affine Types for Resource Lifecycle Management"
status: Draft
date: 2026-03-04
outcome: pending
related_adr: []
---

# RES-03: Linear & Affine Types for Resource Lifecycle Management

## Executive Summary

Adapters in `@hex-di/core` own resources (database connections, file handles, HTTP clients). The DI container owns adapters. Linear and affine type systems provide compile-time guarantees that resources are:

- **Initialized exactly once** (no double-init)
- **Used correctly** (no use-after-dispose)
- **Disposed deterministically** (no leaks)

Key insight: **Linearity on function arrows (not separate types) is the practical approach for TypeScript — track resource state through phantom type parameters rather than requiring a new type system.**

## Research Findings

### Finding 1: Bernardy, Boespflug, Newton, SPJ, Spiwack (2018) — Linear Haskell

**Paper**: Jean-Philippe Bernardy et al. "Linear Haskell: Practical Linearity in a Higher-Order Polymorphic Language." POPL 2018.

**Theoretical insight**: Attaches linearity to function arrows rather than creating separate linear/non-linear types. A function `f :: a %1 -> b` guarantees it consumes its argument exactly once. This enables mutable data structures with pure interfaces and protocol enforcement in I/O.

**hex-di diagnosis**: Adapter `dispose()` should be called exactly once. Currently nothing prevents double-dispose or forgotten dispose. Singleton adapters shared across scopes add complexity — the container must track ownership.

**Potential improvement**: Model adapter handles as affine resources (used at most once for dispose). TypeScript phantom types could encode `Adapter<"active">` vs `Adapter<"disposed">`, with `dispose()` only available on active adapters.

### Finding 2: Jung, Jourdan, Krebbers, Dreyer (2018) — RustBelt

**Paper**: Ralf Jung et al. "RustBelt: Securing the Foundations of the Rust Programming Language." POPL 2018.

**Theoretical insight**: Formal safety proof for Rust's ownership and borrowing system using Iris (higher-order concurrent separation logic). Proves that unsafe code behind safe abstractions maintains memory safety. Key concepts: ownership transfer, borrowing with lifetimes, interior mutability with runtime checks.

**hex-di diagnosis**: The DI container is the "owner" of all adapters. When a service receives a port reference, it "borrows" the adapter. Scoped containers create child ownership. Currently this ownership model is implicit — violations (e.g., holding an adapter reference past scope disposal) fail at runtime.

**Potential improvement**: Make ownership explicit in the type system. `ScopedRef<T>` could encode that a reference is only valid within a specific scope. The graph builder could verify that no adapter outlives its scope.

### Finding 3: Weiss, Gierczak, Patterson, Ahmed (2019) — Oxide: The Essence of Rust

**Paper**: Aaron Weiss et al. "Oxide: The Essence of Rust." arXiv:1903.00982.

**Theoretical insight**: Formalizes Rust's borrow checker as a type system where lifetimes approximate reference provenances. Provides the first syntactic type safety proof for borrow checking.

**hex-di diagnosis**: Adapter lifetime management maps to Rust's lifetime system. Singleton adapters have container lifetime. Scoped adapters have request lifetime. Transient adapters have no managed lifetime.

**Potential improvement**: Encode adapter lifetimes as phantom type parameters: `Adapter<"singleton">`, `Adapter<"scoped">`, `Adapter<"transient">`. The container enforces that scoped adapters don't escape their scope. TypeScript's type system can track this at compile time via branded types.

### Finding 4: Munch-Maccagnoni (2018) — Resource Polymorphism

**Paper**: Guillaume Munch-Maccagnoni. "Resource Polymorphism." arXiv:1803.02796.

**Theoretical insight**: Code polymorphic over whether a resource needs deterministic cleanup. Synthesizes RAII from Rust/C++ with garbage collection from OCaml/Haskell. A function can work with both managed and unmanaged resources without specialization.

**hex-di diagnosis**: Some adapters need disposal (database connections, file handles) and some don't (pure computation, in-memory caches). The container must handle both uniformly. Currently, `dispose()` is optional — adapters without cleanup simply don't implement it.

**Potential improvement**: Resource polymorphism formalizes the current approach. The container's disposal logic is already resource-polymorphic (calls dispose if present, skips if absent). The paper validates this design choice and provides guidance for edge cases (what happens when a resource-polymorphic adapter wraps a disposable one?).

## Applicability to hex-di

### Near-term (TypeScript-feasible)

- Phantom type branding for adapter lifecycle states (`"active"` | `"disposed"`)
- Compile-time prevention of use-after-dispose via conditional method types
- Branded `ScopedRef<T>` that encode scope boundaries

### Medium-term (requires design work)

- Container-enforced ownership model matching Rust's borrow semantics
- Scope-aware adapter resolution that prevents reference escaping
- Graph builder verification that disposal order respects dependency order

### Long-term (theoretical foundation)

- Full affine type encoding for adapter handles
- Formal proof that the container's lifecycle management is sound
- Resource polymorphism for adapter composition (decorators, wrappers)

## Risk Assessment

| Risk                                            | Likelihood | Impact | Mitigation                                                   |
| ----------------------------------------------- | ---------- | ------ | ------------------------------------------------------------ |
| Phantom types make adapter API verbose          | Medium     | High   | Builder pattern hides phantom parameters                     |
| Runtime enforcement still needed (types erased) | Certain    | Low    | Types catch bugs at dev time; runtime is safety net          |
| Scope escape detection has false positives      | Medium     | Medium | Allow explicit `escape()` annotation for intentional escapes |

## Bibliography

1. Bernardy, J-P. et al. (2018). "Linear Haskell." POPL 2018.
2. Jung, R. et al. (2018). "RustBelt: Securing the Foundations of the Rust Programming Language." POPL 2018.
3. Weiss, A. et al. (2019). "Oxide: The Essence of Rust." arXiv:1903.00982.
4. Munch-Maccagnoni, G. (2018). "Resource Polymorphism." arXiv:1803.02796.
