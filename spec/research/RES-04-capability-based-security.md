---
id: RES-04
kind: research
title: "Capability-Based Security for Guard & Authority Management"
status: Draft
date: 2026-03-04
outcome: pending
related_adr: []
---

# RES-04: Capability-Based Security for Guard & Authority Management

## Executive Summary

The guard system in hex-di implements capability-based access control through composable policies (`hasPermission`, `hasRole`, `allOf`, `anyOf`, `not`, etc.). Object-capability theory provides the formal foundation for reasoning about authority flow through the dependency graph.

Key insight: **Security cannot be bolted on as a separate concern — it must be woven into how authority flows through the DI graph. Ports restrict authority scope; the guard system constrains authority transitions.**

## Research Findings

### Finding 1: Miller, Yee, Shapiro (2003) — Capability Myths Demolished

**Paper**: Mark S. Miller, Ka-Ping Yee, Jonathan Shapiro. "Capability Myths Demolished." Technical report, 2003.

**Theoretical insight**: Systematically refutes common misconceptions about capabilities. Demonstrates that capabilities provide equivalent or superior security to ACLs while being more composable. Key properties: capabilities naturally enforce least authority, are unforgeable, and are transferable only through explicit delegation.

**hex-di diagnosis**: Ports are capabilities — a service can only access the ports injected into it. The DI container controls capability distribution. But the guard system adds a second authorization layer (policy checks) on top of capability distribution.

**Potential improvement**: Unify the two layers. Port injection IS the capability grant; guard policies should constrain HOW capabilities are used (e.g., "you have the UserRepository port, but can only call `findById` for users you own"). This aligns guard checks with the natural authority boundary of port injection.

### Finding 2: Miller, Tulloh, Shapiro (2012) — The Structure of Authority

**Paper**: Mark S. Miller, Bill Tulloh, Jonathan S. Shapiro. "The Structure of Authority: Why Security Is not a Separable Concern." 2012.

**Theoretical insight**: Authority must flow through object references, not ambient channels. The object-capability model makes authority flow visible in the code structure. Security emerges from the structure of object references rather than from a separate access-control layer.

**hex-di diagnosis**: The hexagonal architecture already encodes authority structure — services can only reach external systems through ports. But ambient authority leaks are possible: global variables, static methods, environment variables accessed inside adapters.

**Potential improvement**: Enforce that adapters receive all external authority through constructor injection (no ambient access). The graph builder could verify this by analyzing adapter factory signatures — every dependency must come through the port graph.

### Finding 3: Swasey, Garg, Dreyer (2017) — Robust and Compositional Verification of OCap Patterns

**Paper**: David Swasey, Deepak Garg, Derek Dreyer. "Robust and Compositional Verification of Object Capability Patterns." OOPSLA 2017.

**Theoretical insight**: Formal verification of capability patterns using Iris separation logic. Proves that composed capability patterns (membrane, sealer/unsealer, caretaker) maintain security properties. Key contribution: verification is compositional — verified components compose into verified systems.

**hex-di diagnosis**: Guard policies compose via `allOf`, `anyOf`, `not`. But no formal argument exists that composed policies maintain intended security properties (e.g., does `anyOf(adminPolicy, not(blockedPolicy))` actually enforce what was intended?).

**Potential improvement**: Define semantic security properties for guard compositions and verify them. At minimum, provide a "policy analyzer" that detects common composition errors (e.g., `anyOf` with a trivially-true branch, `not` applied to a required policy creating a bypass).

### Finding 4: Miller, Van Cutsem, Tulloh (2013) — Distributed Electronic Rights in JavaScript

**Paper**: Mark S. Miller, Tom Van Cutsem, Bill Tulloh. "Distributed Electronic Rights in JavaScript." 2013.

**Theoretical insight**: Demonstrates capability-based security in JavaScript using `Object.freeze()` and proxies. Frozen objects are tamper-proof capability tokens. Proxies enable transparent capability attenuation (wrapping a capability to restrict its use).

**hex-di diagnosis**: hex-di already uses `Object.freeze()` for error objects. Port references could similarly be frozen capabilities. The adapter wrapping/decoration pattern is a form of capability attenuation (adding logging, caching, or guard checks around a port implementation).

**Potential improvement**: Freeze port references to prevent mutation. Adapter decorators become formal capability attenuators — each decorator can only narrow authority, never expand it. TypeScript's type system can encode this with `Readonly<Port>` + phantom branding.

### Finding 5: Tang, Lindley (2026) — Rows and Capabilities as Modal Effects

**Paper**: Wenhao Tang, Sam Lindley. "Rows and Capabilities as Modal Effects." POPL 2026.

**Theoretical insight**: Unifies row-based effect typing with capability-based reasoning using modal logic. Shows that capabilities and effects are dual perspectives on the same underlying structure: effects describe what computations DO, capabilities describe what computations CAN DO.

**hex-di diagnosis**: The Result error channel (row-based effects from RES-01) and the guard system (capability-based authority) are currently separate systems. This paper suggests they should be unified — an adapter's error channel IS its capability profile.

**Potential improvement**: Explore encoding guard policies as type-level effect constraints. A service that requires `hasPermission("admin")` could have this reflected in its type: `AdminService<Requires<"admin">>`. The graph builder verifies that the capability is provided.

## Applicability to hex-di

### Near-term (TypeScript-feasible)

- Freeze port references (`Object.freeze`) as tamper-proof capability tokens
- Verify adapter factories receive all authority through constructor params (no ambient access)
- Guard policy composition analyzer detecting common errors

### Medium-term (requires design work)

- Unify port injection with capability granting — a single authority model
- Adapter decorators as formal capability attenuators (can only narrow, never expand)
- Type-level encoding of capability requirements on services

### Long-term (theoretical foundation)

- Unify error channels and guard policies into a single row-typed capability system
- Compositional verification that policy compositions maintain security properties
- Formal model of authority flow through the dependency graph

## Risk Assessment

| Risk                                                      | Likelihood | Impact | Mitigation                                  |
| --------------------------------------------------------- | ---------- | ------ | ------------------------------------------- |
| Capability model too restrictive for pragmatic use        | Medium     | High   | Provide escape hatches with explicit opt-in |
| Freezing port references breaks adapter mutation patterns | Low        | Medium | Audit existing adapters before freezing     |
| Policy analyzer produces false positives                  | Medium     | Medium | Make analyzer advisory, not blocking        |
| Type-level capability encoding too complex                | High       | Medium | Keep as opt-in advanced feature             |

## Bibliography

1. Miller, M.S., Yee, K., Shapiro, J. (2003). "Capability Myths Demolished."
2. Miller, M.S., Tulloh, B., Shapiro, J.S. (2012). "The Structure of Authority."
3. Swasey, D., Garg, D., Dreyer, D. (2017). "Robust and Compositional Verification of Object Capability Patterns." OOPSLA 2017.
4. Miller, M.S., Van Cutsem, T., Tulloh, B. (2013). "Distributed Electronic Rights in JavaScript."
5. Tang, W., Lindley, S. (2026). "Rows and Capabilities as Modal Effects." POPL 2026.
