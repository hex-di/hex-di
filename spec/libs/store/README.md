# HexDI Store Specification

**Package:** `@hex-di/store`
**Version:** 0.1.0
**Status:** Draft
**Created:** 2026-02-06
**Last Updated:** 2026-02-06

---

## Summary

`@hex-di/store` brings reactive state management into HexDI's hexagonal architecture. State ports are real `DirectedPort<StateService<T, A>, TName, "outbound">` types. State adapters are real `Adapter<...>` types. There is no separate Store runtime -- Container manages everything.

State changes propagate through a signal-based reactivity core with glitch-free batching, diamond dependency solving, and fine-grained subscriptions. Cross-cutting concerns (logging, persistence, analytics) are effect ports -- regular DI adapters in the graph -- not global middleware.

## Packages

| Package                 | Description                                                          |
| ----------------------- | -------------------------------------------------------------------- |
| `@hex-di/store`         | Core state ports, adapters, reactivity engine                        |
| `@hex-di/store-react`   | React hooks (`useStateValue`, `useActions`, `useAtom`, `useDerived`) |
| `@hex-di/store-testing` | Test utilities, mock adapters, state assertions                      |

## Dependencies

| Package                 | Dependencies                              | Peer Dependencies      |
| ----------------------- | ----------------------------------------- | ---------------------- |
| `@hex-di/store`         | `@hex-di/core`, `@hex-di/result`          | `alien-signals >= 1.0` |
| `@hex-di/store-react`   | `@hex-di/store`                           | `react >= 18`          |
| `@hex-di/store-testing` | `@hex-di/store`, `@hex-di/result-testing` | `vitest >= 3.0`        |

## Table of Contents

### [01 - Overview & Philosophy](./01-overview.md)

1. [Overview](./01-overview.md#1-overview)
2. [Philosophy](./01-overview.md#2-philosophy)
3. [Package Structure](./01-overview.md#3-package-structure)
4. [Architecture Diagram](./01-overview.md#4-architecture-diagram)

### [02 - Core Concepts](./02-core-concepts.md)

5. [StateService](./02-core-concepts.md#5-stateservice)
6. [ActionMap & BoundActions](./02-core-concepts.md#6-actionmap--boundactions)
7. [DeepReadonly & Snapshot Separation](./02-core-concepts.md#7-deepreadonly--snapshot-separation)
8. [Signal Reactivity Primitives](./02-core-concepts.md#8-signal-reactivity-primitives)

### [03 - State Ports](./03-state-ports.md)

9. [createStatePort](./03-state-ports.md#9-createstateport)
10. [createAtomPort](./03-state-ports.md#10-createatomport)
11. [createDerivedPort](./03-state-ports.md#11-createderivedport)
    11a. [createAsyncDerivedPort](./03-state-ports.md#11a-createasyncderivedport)

### [04 - State Adapters](./04-state-adapters.md)

13. [createStateAdapter](./04-state-adapters.md#13-createstateadapter)
14. [createAtomAdapter](./04-state-adapters.md#14-createatomadapter)
15. [createDerivedAdapter](./04-state-adapters.md#15-createderivedadapter)
    15a. [createAsyncDerivedAdapter](./04-state-adapters.md#15a-createasyncderivedadapter)
16. [Effect-as-Port Pattern](./04-state-adapters.md#17-effect-as-port-pattern)

### [05 - Reactivity](./05-reactivity.md)

18. [Signal-Based Core](./05-reactivity.md#18-signal-based-core)
19. [Fine-Grained Subscriptions](./05-reactivity.md#19-fine-grained-subscriptions)
20. [Diamond Dependency Solver](./05-reactivity.md#20-diamond-dependency-solver)
21. [Glitch-Free Batching](./05-reactivity.md#21-glitch-free-batching)
22. [Snapshot Separation](./05-reactivity.md#22-snapshot-separation)

### [05b - Store Introspection](./05b-introspection.md)

- [A. StoreInspectorAPI](./05b-introspection.md#a-storeinspectorapi)
- [B. StoreSnapshot](./05b-introspection.md#b-storesnapshot)
- [C. Action History](./05b-introspection.md#c-action-history)
- [D. Subscriber Dependency Graph](./05b-introspection.md#d-subscriber-dependency-graph)
- [E. Tracing Integration](./05b-introspection.md#e-tracing-integration)
- [F. StoreInspectorEvent](./05b-introspection.md#f-storeinspectorevent)
- [G. MCP Resource Readiness](./05b-introspection.md#g-mcp-resource-readiness)

### [06 - Lifecycle](./06-lifecycle.md)

23. [Mount & Unmount](./06-lifecycle.md#23-mount--unmount)
24. [Container Scope Integration](./06-lifecycle.md#24-container-scope-integration)
25. [Scoped State](./06-lifecycle.md#25-scoped-state)
26. [Disposal](./06-lifecycle.md#26-disposal)

### [07 - React Integration](./07-react-integration.md)

27. [useStateValue](./07-react-integration.md#27-usestatevalue)
28. [useActions](./07-react-integration.md#28-useactions)
    28a. [useStatePort](./07-react-integration.md#usestateport-convenience)
29. [useAtom](./07-react-integration.md#29-useatom)
30. [useDerived](./07-react-integration.md#30-usederived)
    30a. [useAsyncDerived](./07-react-integration.md#30a-useasyncderived)
    30b. [useAsyncDerivedSuspense](./07-react-integration.md#30b-useasyncderivedsuspense)
31. [StoreProvider](./07-react-integration.md#32-storeprovider)

### [08 - Testing](./08-testing.md)

33. [Test Utilities](./08-testing.md#33-test-utilities)
34. [Mock Adapters](./08-testing.md#34-mock-adapters)
35. [State Assertions](./08-testing.md#35-state-assertions)
36. [Scope-Isolated Tests](./08-testing.md#36-scope-isolated-tests)

### [09 - Advanced Patterns](./09-advanced.md)

37. [Bidirectional Derived State](./09-advanced.md#37-bidirectional-derived-state)
38. [Optimistic Updates](./09-advanced.md#39-optimistic-updates)
39. [Undo/Redo](./09-advanced.md#40-undoredo)
40. [Multi-Tenant State](./09-advanced.md#41-multi-tenant-state)
41. [Hydration](./09-advanced.md#42-hydration)

### [10 - API Reference](./10-api-reference.md)

42a. [Error Classes](./10-api-reference.md#42a-error-classes) 43. [Port Factories](./10-api-reference.md#43-port-factories) 44. [Adapter Factories](./10-api-reference.md#44-adapter-factories) 45. [Service Interfaces](./10-api-reference.md#45-service-interfaces) 46. [Type Utilities](./10-api-reference.md#46-type-utilities) 47. [React Hooks](./10-api-reference.md#47-react-hooks) 48. [Testing API](./10-api-reference.md#48-testing-api) 49. [Store Introspection](./10-api-reference.md#49-store-introspection)

### [11 - Appendices](./11-appendices.md)

- [Appendix A: Comparison with State Management Libraries](./11-appendices.md#appendix-a-comparison-with-state-management-libraries)
- [Appendix B: Glossary](./11-appendices.md#appendix-b-glossary)
- [Appendix C: Design Decisions](./11-appendices.md#appendix-c-design-decisions)

---

## Release Scope

All sections (1-49, 05b, 11a, 15a, 28a, 30a, 30b, 42a) ship in version 0.1.0.

---

_End of Table of Contents_
