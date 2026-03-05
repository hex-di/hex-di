---
id: RES-08
kind: research
title: "Refinement & Dependent Types for Compile-Time Graph Safety"
status: Draft
date: 2026-03-04
outcome: pending
related_adr: []
---

# RES-08: Refinement & Dependent Types for Compile-Time Graph Safety

## Executive Summary

Dependency graphs have invariants (acyclicity, completeness, uniqueness) that should be enforced at compile time rather than runtime. Refinement types and dependent types provide the theoretical tools to verify these properties statically. TypeScript's type-level programming capabilities can approximate many of these guarantees.

Key insight: **TypeScript conditional types, mapped types, and template literal types form a limited but practical refinement type system. This research identifies which graph invariants can be pushed to compile time within TypeScript's constraints.**

## Research Findings

### Finding 1: Jhala et al. (2015-2018) — Liquid Types & Refinement Reflection

**Papers**:

- Niki Vazou et al. "Bounded Refinement Types." ICFP 2015.
- Ranjit Jhala, Niki Vazou. "Refinement Reflection." POPL 2018.

**Theoretical insight**: Refinement types augment standard types with logical predicates verified by an SMT solver. `{v: Int | v > 0}` is a positive integer. Refinement reflection extends this by reflecting Haskell functions into the logic, enabling verification of complex properties like list sortedness or tree balancedness.

**hex-di diagnosis**: Graph invariants are refinement predicates: "this graph has no cycles," "every port has exactly one adapter," "disposal order respects dependency order." Currently verified at runtime by the graph builder.

**Potential improvement**: Encode graph invariants as TypeScript type-level computations. For example, duplicate port detection can be a type error: if the same port name appears twice in a graph builder's type accumulator, the builder method returns `never` (compile error). hex-di already does some of this — explore extending to more invariants.

### Finding 2: Eisenberg (2016) — Dependent Types in Haskell

**Paper**: Richard A. Eisenberg. "Dependent Types in Haskell: Theory and Practice." PhD dissertation, University of Pennsylvania, 2016.

**Theoretical insight**: Explores bringing dependent types to Haskell/GHC — a practical language with existing ecosystem constraints (similar to TypeScript). Key patterns: type-level natural numbers, singletons (term-level witnesses of type-level values), and type families as type-level functions.

**hex-di diagnosis**: TypeScript's type system supports type-level computation via conditional types, mapped types, and template literal types. These provide a limited form of dependent types sufficient for many DI graph invariants.

**Potential improvement**: Apply the "singletons" pattern to hex-di: port names as literal types (already done), adapter tags as literal types, and graph structure as a type-level data structure. The graph builder's return type encodes the full graph topology, enabling compile-time cycle detection and completeness checking.

### Finding 3: White, Bour, Yallop (2015) — Modular Implicits

**Paper**: Leo White, Frederic Bour, Jeremy Yallop. "Modular Implicits." ML Workshop 2015.

**Theoretical insight**: Type-directed implicit module resolution for ad-hoc polymorphism. The compiler automatically selects the correct module implementation based on type constraints — essentially compile-time dependency injection.

**hex-di diagnosis**: Modular implicits solve the same problem as hex-di but at compile time: given a type constraint (port), automatically select the correct implementation (adapter). TypeScript doesn't have implicits, but the type-level graph builder achieves similar outcomes.

**Potential improvement**: Study modular implicits' resolution algorithm for ambiguity detection. When multiple adapters could satisfy a port, the graph builder should provide the same quality of error messages as a modular implicits system (listing candidates, explaining why each is or isn't selected).

## Applicability to hex-di

### Near-term (TypeScript-feasible, some already implemented)

- Port name literal types for duplicate detection (compile-time)
- Adapter tag literal types for conflict detection (compile-time)
- Builder method return types encoding accumulated graph structure

### Medium-term (requires type-level research)

- Type-level cycle detection via recursive conditional types
- Completeness checking: "all required ports have adapters" as a type constraint
- Ambiguity detection with helpful error messages when multiple adapters match

### Long-term (beyond TypeScript's current limits)

- Full type-level graph topology encoding
- Disposal order verification at compile time
- Automatic adapter selection via type-directed resolution

## Risk Assessment

| Risk                                                       | Likelihood | Impact | Mitigation                                                    |
| ---------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------- |
| TypeScript type-level computation hits recursion limits    | High       | High   | Limit graph size for compile-time checks, fallback to runtime |
| Complex type errors confuse users                          | High       | High   | Provide custom error messages via branded error types         |
| Type-level encoding breaks with TypeScript version updates | Medium     | Medium | Pin TypeScript version, test type-level features in CI        |
| Diminishing returns beyond basic invariants                | Medium     | Medium | Focus on the top 3-4 most valuable invariants                 |

## Bibliography

1. Vazou, N. et al. (2015). "Bounded Refinement Types." ICFP 2015.
2. Jhala, R., Vazou, N. (2018). "Refinement Reflection." POPL 2018.
3. Eisenberg, R.A. (2016). "Dependent Types in Haskell." PhD dissertation, UPenn.
4. White, L., Bour, F., Yallop, J. (2015). "Modular Implicits." ML Workshop 2015.
