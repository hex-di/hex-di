---
id: RES-02
kind: research
title: "Session Types & Behavioral Contracts for Port Safety"
status: Draft
date: 2026-03-04
outcome: pending
related_adr: []
---

# RES-02: Session Types & Behavioral Contracts for Port Safety

## Executive Summary

Port contracts in hexagonal architecture are session types — they specify the protocol between a service and its adapter. Session types provide formal guarantees that both sides of a communication channel follow the agreed protocol. This research explores how session type theory can enhance port/adapter safety in `@hex-di/core`.

Key insight: **Ports define session types (expected interaction protocols), and adapters must implement those protocols. When adapters fail (returning Result errors), the session must still be maintained.**

## Research Findings

### Finding 1: Wadler (2012) — Propositions as Sessions

**Paper**: Philip Wadler. "Propositions as Sessions." ICFP 2012.

**Theoretical insight**: Establishes a Curry-Howard correspondence between classical linear logic and session types. Propositions correspond to session types, proofs to processes, and cut elimination to communication.

**hex-di diagnosis**: Port interfaces define what methods exist and their type signatures, but not the valid ordering of method calls or state transitions (e.g., "must call `connect()` before `query()`").

**Potential improvement**: Encode port interaction protocols as state machines at the type level. TypeScript's conditional types could track the "current state" of an adapter, ensuring methods are called in valid order.

### Finding 2: Fowler et al. (2019) — Exceptional Asynchronous Session Types

**Paper**: Sam Fowler, Simon Lindley, J. Garrett Morris, Sára Decova. "Exceptional Asynchronous Session Types: Session Types without Tiers." POPL 2019.

**Theoretical insight**: Integrates exception handling with session-typed communication. Traditional session types assume clean communication paths; this work maintains session guarantees even when exceptions occur.

**hex-di diagnosis**: When an adapter returns a `Result.err()`, the port contract must still hold — the caller must be able to continue using the port or handle the error. Currently, nothing prevents an adapter from entering an invalid state after an error.

**Potential improvement**: Define "recovery protocols" as part of port contracts. After an error, the session type specifies what operations are still valid (retry, fallback, or graceful degradation).

### Finding 3: Gay, Gesbert, Ravara, Vasconcelos (2015) — Modular Session Types for Objects

**Paper**: Simon J. Gay, Nils Gesbert, Antonio Ravara, Vasco T. Vasconcelos. "Modular Session Types for Objects." Logical Methods in Computer Science, 2015.

**Theoretical insight**: Extends session types to object-oriented languages. Attaches session types to class definitions to specify method call sequences, modularizing protocol implementations into separately-callable methods.

**hex-di diagnosis**: Port interfaces are object-like (method collections). Currently each method is independent — no protocol constraints between them.

**Potential improvement**: TypeScript could track port "state" as a phantom type parameter, narrowing available methods based on the adapter's lifecycle phase (uninitialized → ready → disposed).

### Finding 4: Yoshida, Scalas (2019) — Less Is More: Multiparty Session Types Revisited

**Paper**: Lorenzo Scalas, Nobuko Yoshida. "Less Is More: Multiparty Session Types Revisited." POPL 2019.

**Theoretical insight**: Simplifies multiparty session types while maintaining full expressiveness. Multiparty session types describe protocols involving more than two participants.

**hex-di diagnosis**: In a DI container, services interact through a graph of dependencies — a multiparty scenario. Nothing currently verifies that the full dependency graph satisfies all port contracts simultaneously.

**Potential improvement**: The graph builder could verify that composed adapters respect not just individual port contracts but also cross-service protocol constraints (e.g., "ServiceA calls PortB before ServiceC calls PortB").

## Applicability to hex-di

### Near-term (TypeScript-feasible)

- Phantom type parameters encoding adapter lifecycle state (uninitialized/ready/disposed)
- Compile-time prevention of method calls on disposed adapters

### Medium-term (requires research)

- Protocol state machines encoded as mapped types
- Conditional method availability based on adapter state

### Long-term (theoretical)

- Multiparty protocol verification across the full dependency graph
- Automatic protocol inference from adapter implementations

## Risk Assessment

| Risk                                                      | Likelihood | Impact | Mitigation                                    |
| --------------------------------------------------------- | ---------- | ------ | --------------------------------------------- |
| TypeScript type system too limited for full session types | High       | Medium | Focus on lifecycle states, not full protocols |
| Phantom types add ergonomic overhead                      | Medium     | Medium | Provide builder helpers that infer states     |
| Multiparty verification is undecidable in general         | High       | Low    | Restrict to acyclic dependency graphs         |

## Bibliography

1. Wadler, P. (2012). "Propositions as Sessions." ICFP 2012.
2. Fowler, S., Lindley, S., Morris, J.G., Decova, S. (2019). "Exceptional Asynchronous Session Types." POPL 2019.
3. Gay, S.J., Gesbert, N., Ravara, A., Vasconcelos, V.T. (2015). "Modular Session Types for Objects." LMCS.
4. Scalas, L., Yoshida, N. (2019). "Less Is More: Multiparty Session Types Revisited." POPL 2019.
