# HexDI Logging Specification

**Package:** `@hex-di/logger`
**Version:** 0.1.0
**Status:** Draft
**Created:** 2026-02-08
**Last Updated:** 2026-02-08

---

## Summary

`@hex-di/logger` provides structured, context-aware logging for the HexDI ecosystem. Every log entry is a typed data structure -- not a formatted string. Logging flows through ports and adapters following hexagonal architecture: the core package defines contracts and ships three built-in adapters (NoOp, Console, Memory), while production backends (Pino, Winston, Bunyan) live in separate packages with zero coupling to the core.

Context propagates automatically through child loggers and DI scope variables. Annotations merge additively. Sensitive data is redacted before it reaches any handler. The NoOp adapter costs nothing -- zero allocations, zero overhead -- for production scenarios where logging is disabled.

`@hex-di/logger` integrates with HexDI's nervous system: container resolution events can be logged automatically, trace context correlates log entries with spans, and the inspector can query logging statistics across the dependency graph.

## Packages

| Package                  | Description                                                      |
| ------------------------ | ---------------------------------------------------------------- |
| `@hex-di/logger`         | Core ports, types, built-in adapters, context, testing utilities |
| `@hex-di/logger-pino`    | Pino backend handler adapter                                     |
| `@hex-di/logger-winston` | Winston backend handler adapter                                  |
| `@hex-di/logger-bunyan`  | Bunyan backend handler adapter                                   |

## Table of Contents

### [01 - Overview & Philosophy](./01-overview.md)

1. [Overview](./01-overview.md#1-overview)
2. [Philosophy](./01-overview.md#2-philosophy)
3. [Package Structure](./01-overview.md#3-package-structure)
4. [Architecture Diagram](./01-overview.md#4-architecture-diagram)

### [02 - Core Concepts](./02-core-concepts.md)

5. [Structured Logging Principles](./02-core-concepts.md#5-structured-logging-principles)
6. [Log Levels and Severity](./02-core-concepts.md#6-log-levels-and-severity)
7. [OpenTelemetry Alignment](./02-core-concepts.md#7-opentelemetry-alignment)
8. [Structured Entries vs Formatted Strings](./02-core-concepts.md#8-structured-entries-vs-formatted-strings)

### [03 - Log Types](./03-log-types.md)

9. [LogLevel](./03-log-types.md#9-loglevel)
10. [LogEntry](./03-log-types.md#10-logentry)
11. [LogContext](./03-log-types.md#11-logcontext)
12. [LogLevelValue and shouldLog](./03-log-types.md#12-loglevelvalue-and-shouldlog)

### [04 - Logger Port](./04-logger-port.md)

13. [Logger Interface](./04-logger-port.md#13-logger-interface)
14. [LoggerPort Definition](./04-logger-port.md#14-loggerport-definition)
15. [Child Loggers](./04-logger-port.md#15-child-loggers)
16. [Annotations](./04-logger-port.md#16-annotations)
17. [Timing Operations](./04-logger-port.md#17-timing-operations)

### [05 - Handler & Formatter Ports](./05-handler-formatter-ports.md)

18. [LogHandler Interface](./05-handler-formatter-ports.md#18-loghandler-interface)
19. [LogHandlerPort Definition](./05-handler-formatter-ports.md#19-loghandlerport-definition)
20. [LogFormatter Interface](./05-handler-formatter-ports.md#20-logformatter-interface)
21. [LogFormatterPort Definition](./05-handler-formatter-ports.md#21-logformatterport-definition)
22. [Built-in Formatters](./05-handler-formatter-ports.md#22-built-in-formatters)

### [06 - Built-in Adapters](./06-built-in-adapters.md)

23. [NoOp Adapter](./06-built-in-adapters.md#23-noop-adapter)
24. [Console Adapter](./06-built-in-adapters.md#24-console-adapter)
25. [Memory Adapter](./06-built-in-adapters.md#25-memory-adapter)
26. [Scoped Logger Adapter](./06-built-in-adapters.md#26-scoped-logger-adapter)

### [07 - Backend Adapters](./07-backend-adapters.md)

27. [@hex-di/logger-pino](./07-backend-adapters.md#27-hex-dilogger-pino)
28. [@hex-di/logger-winston](./07-backend-adapters.md#28-hex-dilogger-winston)
29. [@hex-di/logger-bunyan](./07-backend-adapters.md#29-hex-dilogger-bunyan)
30. [Level Mapping](./07-backend-adapters.md#30-level-mapping)

### [08 - Context Propagation](./08-context-propagation.md)

31. [Context Variables](./08-context-propagation.md#31-context-variables)
32. [Header Extraction](./08-context-propagation.md#32-header-extraction)
33. [Scope Propagation](./08-context-propagation.md#33-scope-propagation)
34. [Context Merging](./08-context-propagation.md#34-context-merging)

### [09 - Redaction & Sampling](./09-redaction-sampling.md)

35. [Sensitive Data Redaction](./09-redaction-sampling.md#35-sensitive-data-redaction)
36. [Log Sampling](./09-redaction-sampling.md#36-log-sampling)
37. [Rate Limiting](./09-redaction-sampling.md#37-rate-limiting)

### [10 - Instrumentation](./10-instrumentation.md)

38. [Container Instrumentation](./10-instrumentation.md#38-container-instrumentation)
39. [Resolution Hooks](./10-instrumentation.md#39-resolution-hooks)
40. [Scope Lifecycle Logging](./10-instrumentation.md#40-scope-lifecycle-logging)

### [11 - Framework Integration](./11-framework-integration.md)

41. [Hono Middleware](./11-framework-integration.md#41-hono-middleware)
42. [React Hooks and Providers](./11-framework-integration.md#42-react-hooks-and-providers)
43. [Request-Scoped Logging](./11-framework-integration.md#43-request-scoped-logging)

### [12 - Tracing Integration](./12-tracing-integration.md)

44. [Span Correlation](./12-tracing-integration.md#44-span-correlation)
45. [Trace Context in Log Entries](./12-tracing-integration.md#45-trace-context-in-log-entries)
46. [Cross-Observability](./12-tracing-integration.md#46-cross-observability)

### [13 - Inspection & Reporting](./13-inspection.md)

47. [LoggerInspector Interface](./13-inspection.md#47-loggerinspector-interface)
48. [LoggingSnapshot & Events](./13-inspection.md#48-loggingsnapshot--events)
49. [Statistics & Diagnostics](./13-inspection.md#49-statistics--diagnostics)
50. [MCP Resource Readiness](./13-inspection.md#50-mcp-resource-readiness)

### [14 - Testing](./14-testing.md)

51. [MemoryLogger](./14-testing.md#51-memorylogger)
52. [assertLogEntry](./14-testing.md#52-assertlogentry)
53. [Testing Patterns](./14-testing.md#53-testing-patterns)
54. [Testing Utilities](./14-testing.md#54-testing-utilities)

### [15 - API Reference](./15-api-reference.md)

55. [Core Types](./15-api-reference.md#55-core-types)
56. [Ports](./15-api-reference.md#56-ports)
57. [Logger Methods](./15-api-reference.md#57-logger-methods)
58. [Handler & Formatter](./15-api-reference.md#58-handler--formatter)
59. [Built-in Adapters](./15-api-reference.md#59-built-in-adapters)
60. [Backend Adapters](./15-api-reference.md#60-backend-adapters)
61. [Context & Utilities](./15-api-reference.md#61-context--utilities)
62. [Testing API](./15-api-reference.md#62-testing-api)
63. [Inspection API](./15-api-reference.md#63-inspection-api)

### [16 - Appendices](./16-appendices.md)

- [Appendix A: Level Mapping Tables](./16-appendices.md#appendix-a-level-mapping-tables)
- [Appendix B: OpenTelemetry Severity Alignment](./16-appendices.md#appendix-b-opentelemetry-severity-alignment)
- [Appendix C: Performance Characteristics](./16-appendices.md#appendix-c-performance-characteristics)
- [Appendix D: Comparison with Other Libraries](./16-appendices.md#appendix-d-comparison-with-other-libraries)
- [Appendix E: Glossary](./16-appendices.md#appendix-e-glossary)
- [Appendix F: Design Decisions](./16-appendices.md#appendix-f-design-decisions)

### [17 - Definition of Done](./17-definition-of-done.md)

- [DoD 1: Core Types](./17-definition-of-done.md#dod-1-core-types-spec-sections-9-12)
- [DoD 2: Logger Port](./17-definition-of-done.md#dod-2-logger-port-spec-sections-13-17)
- [DoD 3: Handler & Formatter Ports](./17-definition-of-done.md#dod-3-handler--formatter-ports-spec-sections-18-22)
- [DoD 4: Built-in Adapters](./17-definition-of-done.md#dod-4-built-in-adapters-spec-sections-23-26)
- [DoD 5: Backend Adapters](./17-definition-of-done.md#dod-5-backend-adapters-spec-sections-27-30)
- [DoD 6: Context Propagation](./17-definition-of-done.md#dod-6-context-propagation-spec-sections-31-34)
- [DoD 7: Redaction & Sampling](./17-definition-of-done.md#dod-7-redaction--sampling-spec-sections-35-37)
- [DoD 8: Instrumentation](./17-definition-of-done.md#dod-8-instrumentation-spec-sections-38-40)
- [DoD 9: Framework Integration](./17-definition-of-done.md#dod-9-framework-integration-spec-sections-41-43)
- [DoD 10: Tracing Integration](./17-definition-of-done.md#dod-10-tracing-integration-spec-sections-44-46)
- [DoD 11: Testing Utilities](./17-definition-of-done.md#dod-11-testing-utilities-spec-sections-51-54)
- [DoD 12: Inspection & Reporting](./17-definition-of-done.md#dod-12-inspection--reporting-spec-sections-47-50)
- [Test Count Summary](./17-definition-of-done.md#test-count-summary)
- [Verification Checklist](./17-definition-of-done.md#verification-checklist)
- [Mutation Testing Strategy](./17-definition-of-done.md#mutation-testing-strategy)

---

## Release Scope

All sections (1-63) ship in version 0.1.0.

---

_End of Table of Contents_
