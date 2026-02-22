# HexDI Stream Specification

**Package:** `@hex-di/stream`
**Version:** 0.1.0
**Status:** Draft
**Created:** 2026-02-10
**Last Updated:** 2026-02-10

---

## Summary

`@hex-di/stream` brings general-purpose reactive streams into HexDI's hexagonal architecture. Stream ports are real `DirectedPort<StreamProducer<T, E>, TName, "inbound">` types. Stream adapters are real `Adapter<...>` types. Container manages resolution, scoping, and disposal -- there is no separate stream runtime.

Streams support both push-based (observer/subscribe) and pull-based (AsyncIterable) consumption with a hybrid backpressure model. A dual-channel error model separates recoverable typed errors (`E`) from terminal failures (`unknown`), aligning with `@hex-di/result`. Operators compose via a plain-function protocol with no base class or registration -- any `(source: Stream<A, B>) => Stream<C, D>` is an operator.

Components declare **what** streams they need through ports. Adapters implement **how** to produce them. The stream runtime handles subscription management, backpressure buffering, multicast sharing, and disposal. Cross-cutting concerns (logging, metrics, tracing) are infrastructure ports -- regular DI adapters in the graph.

## Packages

| Package                  | Description                                                                                                                      |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `@hex-di/stream`         | Core stream primitives, subjects, 20 operators, backpressure, port/adapter factories, container observation, inspector, registry |
| `@hex-di/stream-react`   | React hooks (`useStream`, `useStreamValue`, `useSubject`, `StreamProvider`)                                                      |
| `@hex-di/stream-testing` | Test utilities, mock stream/subject adapters, test scheduler, stream assertions                                                  |

## Dependencies

| Package                  | Dependencies                               | Peer Dependencies |
| ------------------------ | ------------------------------------------ | ----------------- |
| `@hex-di/stream`         | `@hex-di/core`, `@hex-di/result`           | -                 |
| `@hex-di/stream-react`   | `@hex-di/stream`, `@hex-di/react`          | `react >= 18`     |
| `@hex-di/stream-testing` | `@hex-di/stream`, `@hex-di/result-testing` | `vitest >= 3.0`   |

> **Note:** `@hex-di/stream` does not depend on `@hex-di/graph` at compile time. `GraphBuilder` usage shown in examples is consumer-side -- applications import `@hex-di/graph` directly to compose their dependency graphs. Stream adapters are plain `Adapter` objects compatible with any graph builder.

## Table of Contents

### [01 - Overview & Philosophy](./01-overview.md)

1. [Overview](./01-overview.md#1-overview)
2. [Philosophy](./01-overview.md#2-philosophy)
3. [Package Structure](./01-overview.md#3-package-structure)
4. [Architecture Diagram](./01-overview.md#4-architecture-diagram)

### [02 - Core Concepts](./02-core-concepts.md)

5. [Stream&lt;T, E&gt;](./02-core-concepts.md#5-streamt-e)
6. [StreamObserver&lt;T, E&gt;](./02-core-concepts.md#6-streamobservert-e)
7. [StreamSink&lt;T, E&gt;](./02-core-concepts.md#7-streamsinkt-e)
8. [Subscription](./02-core-concepts.md#8-subscription)
9. [Dual Error Model](./02-core-concepts.md#9-dual-error-model)
10. [Cold vs Hot Semantics](./02-core-concepts.md#10-cold-vs-hot-semantics)
11. [Operator Concept](./02-core-concepts.md#11-operator-concept)

### [03 - Stream Ports](./03-stream-ports.md)

12. [createStreamPort](./03-stream-ports.md#12-createstreamport)
13. [StreamPort Type Definition](./03-stream-ports.md#13-streamport-type-definition)
14. [SubjectPort](./03-stream-ports.md#14-subjectport)
15. [OperatorPort](./03-stream-ports.md#15-operatorport)
16. [Type Guards](./03-stream-ports.md#16-type-guards)
17. [Type Inference Utilities](./03-stream-ports.md#17-type-inference-utilities)

### [04 - Stream Adapters](./04-stream-adapters.md)

18. [createStreamAdapter](./04-stream-adapters.md#18-createstreamadapter)
19. [createSubjectAdapter](./04-stream-adapters.md#19-createsubjectadapter)
20. [createOperatorAdapter](./04-stream-adapters.md#20-createoperatoradapter)
21. [Adapter Composition](./04-stream-adapters.md#21-adapter-composition)
22. [Lifetime Semantics](./04-stream-adapters.md#22-lifetime-semantics)

### [05 - Stream Creation](./05-stream-creation.md)

23. [createStream](./05-stream-creation.md#23-createstream)
24. [of](./05-stream-creation.md#24-of)
25. [fromIterable](./05-stream-creation.md#25-fromiterable)
26. [fromAsyncIterable](./05-stream-creation.md#26-fromasynciterable)
27. [fromPromise](./05-stream-creation.md#27-frompromise)
28. [fromResultAsync](./05-stream-creation.md#28-fromresultasync)
29. [fromEvent](./05-stream-creation.md#29-fromevent)
30. [interval / timer](./05-stream-creation.md#30-interval--timer)
31. [EMPTY / NEVER](./05-stream-creation.md#31-empty--never)

### [06 - Subjects](./06-subjects.md)

32. [Subject](./06-subjects.md#32-subject)
33. [BehaviorSubject](./06-subjects.md#33-behaviorsubject)
34. [ReplaySubject](./06-subjects.md#34-replaysubject)
35. [Subject Factories](./06-subjects.md#35-subject-factories)
36. [Multicast Semantics](./06-subjects.md#36-multicast-semantics)

### [07 - Operators](./07-operators.md)

37. [Operator Protocol](./07-operators.md#37-operator-protocol)
38. [defineOperator](./07-operators.md#38-defineoperator)
39. [Transform Operators](./07-operators.md#39-transform-operators)
40. [Filter Operators](./07-operators.md#40-filter-operators)
41. [Flattening Operators](./07-operators.md#41-flattening-operators)
42. [Timing Operators](./07-operators.md#42-timing-operators)
43. [Combination Operators](./07-operators.md#43-combination-operators)
44. [Error Operators](./07-operators.md#44-error-operators)
45. [Multicast Operators](./07-operators.md#45-multicast-operators)
46. [Utility Operators](./07-operators.md#46-utility-operators)

### [08 - Backpressure](./08-backpressure.md)

47. [Hybrid Backpressure Model](./08-backpressure.md#47-hybrid-backpressure-model)
48. [BufferConfig & OverflowStrategy](./08-backpressure.md#48-bufferconfig--overflowstrategy)
49. [buffer() Operator](./08-backpressure.md#49-buffer-operator)
50. [AsyncIterable Natural Backpressure](./08-backpressure.md#50-asynciterable-natural-backpressure)
51. [Producer-Side AbortSignal](./08-backpressure.md#51-producer-side-abortsignal)

### [09 - Container Observation](./09-container-observation.md)

52. [observePort](./09-container-observation.md#52-observeport)
53. [observeContainer](./09-container-observation.md#53-observecontainer)
54. [ContainerEvent](./09-container-observation.md#54-containerevent)

### [10 - Integration](./10-integration.md)

55. [DI Ports](./10-integration.md#55-di-ports)
56. [Registry & Inspector Adapters](./10-integration.md#56-registry--inspector-adapters)
57. [Tracing Bridge](./10-integration.md#57-tracing-bridge)
58. [Lifecycle Management](./10-integration.md#58-lifecycle-management)

### [11 - Introspection](./11-introspection.md)

59. [StreamRegistry](./11-introspection.md#59-streamregistry)
60. [StreamInspector](./11-introspection.md#60-streaminspector)
61. [StreamSnapshot](./11-introspection.md#61-streamsnapshot)
62. [StreamInspectorEvent](./11-introspection.md#62-streaminspectorevent)
63. [MCP Resource Readiness](./11-introspection.md#63-mcp-resource-readiness)

### [12 - React Integration](./12-react-integration.md)

64. [useStream](./12-react-integration.md#64-usestream)
65. [useStreamValue](./12-react-integration.md#65-usestreamvalue)
66. [useSubject](./12-react-integration.md#66-usesubject)
67. [StreamProvider](./12-react-integration.md#67-streamprovider)
68. [createStreamHooks](./12-react-integration.md#68-createstreamhooks)

### [13 - Testing](./13-testing.md)

69. [Test Utilities](./13-testing.md#69-test-utilities)
70. [Mock Stream & Subject Adapters](./13-testing.md#70-mock-stream--subject-adapters)
71. [TestScheduler](./13-testing.md#71-testscheduler)
72. [Stream Assertions](./13-testing.md#72-stream-assertions)
73. [Type-Level Tests](./13-testing.md#73-type-level-tests)

### [14 - Advanced Patterns](./14-advanced.md)

74. [Dependent Streams](./14-advanced.md#74-dependent-streams)
75. [Scheduler Abstraction](./14-advanced.md#75-scheduler-abstraction)
76. [Error Recovery Patterns](./14-advanced.md#76-error-recovery-patterns)
77. [Memory Management](./14-advanced.md#77-memory-management)
78. [SSR Considerations](./14-advanced.md#78-ssr-considerations)

### [15 - API Reference](./15-api-reference.md)

79. [Stream Factories](./15-api-reference.md#79-stream-factories)
80. [Subject Factories](./15-api-reference.md#80-subject-factories)
81. [Port Factories](./15-api-reference.md#81-port-factories)
82. [Adapter Factories](./15-api-reference.md#82-adapter-factories)
83. [Operators](./15-api-reference.md#83-operators)
84. [Container Observation](./15-api-reference.md#84-container-observation)
85. [Introspection](./15-api-reference.md#85-introspection)
86. [Type Utilities](./15-api-reference.md#86-type-utilities)
87. [React Hooks](./15-api-reference.md#87-react-hooks)
88. [Testing API](./15-api-reference.md#88-testing-api)
89. [Error Types](./15-api-reference.md#89-error-types)

### [16 - Appendices](./16-appendices.md)

- [Appendix A: Comparison with Reactive Libraries](./16-appendices.md#appendix-a-comparison-with-reactive-libraries)
- [Appendix B: Glossary](./16-appendices.md#appendix-b-glossary)
- [Appendix C: Design Decisions](./16-appendices.md#appendix-c-design-decisions)

### [17 - Definition of Done](./17-definition-of-done.md)

- [Test Tables](./17-definition-of-done.md#test-tables)
- [Type-Level Tests](./17-definition-of-done.md#type-level-tests)
- [Integration Tests](./17-definition-of-done.md#integration-tests)
- [E2E Tests](./17-definition-of-done.md#e2e-tests)
- [Mutation Testing](./17-definition-of-done.md#mutation-testing)
- [Verification Checklist](./17-definition-of-done.md#verification-checklist)

---

## Release Scope

All sections (1-89) ship in version 0.1.0. Devtools (`@hex-di/stream-devtools`) is deferred to 0.2.0.

---

_End of Table of Contents_
