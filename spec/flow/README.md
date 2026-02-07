# HexDI Flow Specification

**Version:** 0.1.0
**Status:** Draft
**Created:** 2026-02-07
**Last Updated:** 2026-02-07

---

## Table of Contents

### [01 - Overview & Philosophy](./01-overview.md)

1. [Overview](./01-overview.md#1-overview)
2. [Philosophy](./01-overview.md#2-philosophy)
3. [Package Structure](./01-overview.md#3-package-structure)

### [02 - Core Concepts](./02-core-concepts.md)

4. [Core Concepts](./02-core-concepts.md#4-core-concepts)

### [03 - Machine Definition](./03-machine-definition.md)

5. [Machine Definition](./03-machine-definition.md#5-machine-definition)

### [04 - States, Transitions & Guards](./04-states.md)

6. [State Nodes](./04-states.md#6-state-nodes)
7. [Transitions](./04-states.md#7-transitions)
8. [Guards](./04-states.md#8-guards)

### [05 - Effect System](./05-effects.md)

9. [Effect Architecture](./05-effects.md#9-effect-architecture)
10. [Effect Descriptors](./05-effects.md#10-effect-descriptors)
11. [Effect Execution](./05-effects.md#11-effect-execution)

### [06 - Activities](./06-activities.md)

12. [Activity System](./06-activities.md#12-activity-system)
13. [Activity Ports & Configuration](./06-activities.md#13-activity-ports--configuration)
14. [Activity Lifecycle](./06-activities.md#14-activity-lifecycle)

### [07 - Ports & Adapters](./07-ports-and-adapters.md)

15. [Flow Ports](./07-ports-and-adapters.md#15-flow-ports)
16. [Flow Adapters](./07-ports-and-adapters.md#16-flow-adapters)

### [08 - Runner & Interpreter](./08-runner.md)

17. [Pure Interpreter](./08-runner.md#17-pure-interpreter)
18. [Machine Runner](./08-runner.md#18-machine-runner)
19. [Snapshots & Subscriptions](./08-runner.md#19-snapshots--subscriptions)

### [09 - Hierarchical, Parallel & History States](./09-advanced-states.md)

20. [Hierarchical (Compound) States](./09-advanced-states.md#20-hierarchical-compound-states)
21. [Parallel States](./09-advanced-states.md#21-parallel-states)
22. [History States](./09-advanced-states.md#22-history-states)

### [10 - React Integration](./10-react-integration.md)

23. [React Hooks](./10-react-integration.md#23-react-hooks)
24. [React Patterns](./10-react-integration.md#24-react-patterns)

### [11 - Testing](./11-testing.md)

25. [Testing Patterns](./11-testing.md#25-testing-patterns)
26. [Test Harnesses](./11-testing.md#26-test-harnesses)

### [12 - Introspection & DevTools](./12-introspection.md)

27. [Tracing & Collectors](./12-introspection.md#27-tracing--collectors)
28. [DevTools Integration](./12-introspection.md#28-devtools-integration)

### [13 - Advanced Patterns](./13-advanced.md)

29. [Machine Composition](./13-advanced.md#29-machine-composition)
30. [Serialization & Persistence](./13-advanced.md#30-serialization--persistence)
31. [Supervision & Error Recovery](./13-advanced.md#31-supervision--error-recovery)

### [14 - API Reference](./14-api-reference.md)

32. [API Reference](./14-api-reference.md#32-api-reference)

### [15 - Appendices](./15-appendices.md)

- [Appendix A: Comparison with Other Libraries](./15-appendices.md#appendix-a-comparison-with-other-libraries)
- [Appendix B: Glossary](./15-appendices.md#appendix-b-glossary)
- [Appendix C: Design Decisions](./15-appendices.md#appendix-c-design-decisions)
- [Appendix D: Migration from Current Implementation](./15-appendices.md#appendix-d-migration-from-current-implementation)

---

_End of Table of Contents_
