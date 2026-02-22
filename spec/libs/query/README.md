# HexDI Query Specification

**Package:** `@hex-di/query`
**Version:** 0.1.0
**Status:** Draft
**Created:** 2026-02-01
**Last Updated:** 2026-02-07

---

## Summary

`@hex-di/query` brings data fetching and caching into HexDI's hexagonal architecture. Query ports are real `DirectedPort<QueryFetcher<TData, TParams>, TName, "inbound">` types. Query adapters are real `Adapter<...>` types. The QueryClient wraps the container as an extension -- it is not a port in the graph. Each scope gets a child client with its own isolated cache. Query fetches integrate with `@hex-di/tracing` via the resolution hooks system and produce structured error types extending `ContainerError`.

All query and mutation adapters return `ResultAsync<TData, TError>` from `@hex-di/result`, making the error channel structural rather than phantom. QueryClient methods propagate typed errors as `ResultAsync<TData, TError | QueryResolutionError>`.

Components declare **what** data they need through ports. Adapters implement **how** to fetch it. The query runtime handles caching, deduplication, background refresh, retry, and garbage collection. Cross-cutting concerns (auth headers, request logging, offline persistence) are infrastructure ports -- regular DI adapters in the graph.

## Packages

| Package                  | Description                                                               |
| ------------------------ | ------------------------------------------------------------------------- |
| `@hex-di/query`          | Core query/mutation ports, adapters, cache, client, deduplication         |
| `@hex-di/query-react`    | React hooks (`useQuery`, `useMutation`, `useQueries`, `useSuspenseQuery`) |
| `@hex-di/query-testing`  | Test utilities, mock adapters, query assertions                           |
| `@hex-di/query-devtools` | Browser devtools panel and in-app inspector overlay (future)              |
| `@hex-di/result`         | `Result<T, E>` and `ResultAsync<T, E>` types for typed error handling     |

## Table of Contents

### [01 - Overview & Philosophy](./01-overview.md)

1. [Overview](./01-overview.md#1-overview)
2. [Philosophy](./01-overview.md#2-philosophy)
3. [Package Structure](./01-overview.md#3-package-structure)
4. [Architecture Diagram](./01-overview.md#4-architecture-diagram)

### [02 - Core Concepts](./02-core-concepts.md)

5. [QueryPort](./02-core-concepts.md#5-queryport)
6. [MutationPort](./02-core-concepts.md#6-mutationport)
7. [QueryAdapter](./02-core-concepts.md#7-queryadapter)
8. [MutationAdapter](./02-core-concepts.md#8-mutationadapter)
9. [QueryClient](./02-core-concepts.md#9-queryclient)
10. [QueryCache](./02-core-concepts.md#10-querycache)

### [03 - Query Ports](./03-query-ports.md)

11. [createQueryPort](./03-query-ports.md#11-createqueryport)
12. [QueryPort Type Definition](./03-query-ports.md#12-queryport-type-definition)
13. [Query Defaults](./03-query-ports.md#13-query-defaults)
14. [Type Inference Utilities](./03-query-ports.md#14-type-inference-utilities)

### [04 - Mutation Ports](./04-mutation-ports.md)

15. [createMutationPort](./04-mutation-ports.md#15-createmutationport)
16. [MutationPort Type Definition](./04-mutation-ports.md#16-mutationport-type-definition)
17. [Mutation Effects](./04-mutation-ports.md#17-mutation-effects)
18. [Type Inference Utilities](./04-mutation-ports.md#18-type-inference-utilities)

### [05 - Query Adapters](./05-query-adapters.md)

19. [createQueryAdapter](./05-query-adapters.md#19-createqueryadapter)
20. [FetchContext](./05-query-adapters.md#20-fetchcontext)
21. [Adapter Composition](./05-query-adapters.md#21-adapter-composition)
22. [Streamed Queries](./05-query-adapters.md#22-streamed-queries)

### [06 - Mutation Adapters](./06-mutation-adapters.md)

23. [createMutationAdapter](./06-mutation-adapters.md#23-createmutationadapter)
24. [MutationContext](./06-mutation-adapters.md#24-mutationcontext)
25. [Optimistic Update Protocol](./06-mutation-adapters.md#25-optimistic-update-protocol)

### [07 - Cache Architecture](./07-cache.md)

26. [Cache Key Structure](./07-cache.md#26-cache-key-structure)
27. [Cache Entry](./07-cache.md#27-cache-entry)
28. [QueryCache Interface](./07-cache.md#28-querycache-interface)
29. [Structural Sharing](./07-cache.md#29-structural-sharing)
30. [Garbage Collection](./07-cache.md#30-garbage-collection)
31. [Cache Persistence](./07-cache.md#31-cache-persistence)

### [08 - Query Lifecycle](./08-lifecycle.md)

32. [Lifecycle Diagram](./08-lifecycle.md#32-lifecycle-diagram)
33. [Query States](./08-lifecycle.md#33-query-states)
34. [State Transitions](./08-lifecycle.md#34-state-transitions)
35. [Staleness](./08-lifecycle.md#35-staleness)
36. [Refetch Triggers](./08-lifecycle.md#36-refetch-triggers)
37. [Deduplication](./08-lifecycle.md#37-deduplication)
38. [Retry & Backoff](./08-lifecycle.md#38-retry--backoff)

### [09 - Query Client](./09-query-client.md)

39. [QueryClient Interface](./09-query-client.md#39-queryclient-interface)
40. [QueryClient Factory](./09-query-client.md#40-queryclient-factory)
41. [Invalidation](./09-query-client.md#41-invalidation)
42. [Cancellation](./09-query-client.md#42-cancellation)
43. [Prefetching](./09-query-client.md#43-prefetching)
44. [QueryClient as Container Extension](./09-query-client.md#44-queryclient-as-container-extension)
    44b. [QueryResolutionError](./09-query-client.md#44b-queryresolutionerror)
    44c. [Disposal](./09-query-client.md#44c-disposal)

### [09b - Query Introspection](./09b-introspection.md)

- [A. QueryInspectorAPI](./09b-introspection.md#a-queryinspectorapi)
- [B. QuerySnapshot](./09b-introspection.md#b-querysnapshot)
- [C. Fetch History](./09b-introspection.md#c-fetch-history)
- [D. Cache Dependency Graph](./09b-introspection.md#d-cache-dependency-graph)
- [E. Tracing Integration](./09b-introspection.md#e-tracing-integration)
- [F. QueryInspectorEvent](./09b-introspection.md#f-queryinspectorevent)

### [10 - HexDI Integration](./10-integration.md)

45. [Graph Composition](./10-integration.md#45-graph-composition)
46. [Resolution Flow](./10-integration.md#46-resolution-flow)
47. [Scoped Queries](./10-integration.md#47-scoped-queries)
48. [Multi-Tenant Configuration](./10-integration.md#48-multi-tenant-configuration)
    48b. [Compile-Time Query Dependency Validation](./10-integration.md#48b-compile-time-query-dependency-validation)
    48c. [Resolution Hooks Integration](./10-integration.md#48c-resolution-hooks-integration)
    48d. [Captive Dependency Rules](./10-integration.md#48d-captive-dependency-rules-for-query-adapters)
    48e. [Adapter Resolution](./10-integration.md#48e-adapter-resolution)

### [11 - React Integration](./11-react-integration.md)

49. [QueryClientProvider](./11-react-integration.md#49-queryclientprovider)
50. [useQuery](./11-react-integration.md#50-usequery)
51. [useMutation](./11-react-integration.md#51-usemutation)
52. [useQueries](./11-react-integration.md#52-usequeries)
53. [useInfiniteQuery](./11-react-integration.md#53-useinfinitequery)
54. [useSuspenseQuery](./11-react-integration.md#54-usesuspensequery)
55. [useQueryClient](./11-react-integration.md#55-usequeryclient)
56. [useIsFetching](./11-react-integration.md#56-useisfetching)

### [12 - Testing](./12-testing.md)

57. [Test Utilities](./12-testing.md#57-test-utilities)
58. [Mock Adapters](./12-testing.md#58-mock-adapters)
59. [Query Assertions](./12-testing.md#59-query-assertions)
60. [Scope-Isolated Tests](./12-testing.md#60-scope-isolated-tests)
    60b. [Type-Level Tests](./12-testing.md#60b-type-level-tests)
    60c. [Test Scope Lifecycle Helpers](./12-testing.md#60c-test-scope-lifecycle-helpers)

### [13 - Advanced Patterns](./13-advanced.md)

61. [Dependent Queries](./13-advanced.md#61-dependent-queries)
62. [Parallel Queries](./13-advanced.md#62-parallel-queries)
63. [Pagination & Infinite Scroll](./13-advanced.md#63-pagination--infinite-scroll)
64. [Optimistic Updates](./13-advanced.md#64-optimistic-updates)
65. [Polling & Real-Time](./13-advanced.md#65-polling--real-time)
66. [Prefetching](./13-advanced.md#66-prefetching)
67. [Offline Support](./13-advanced.md#67-offline-support)
68. [Query Composition](./13-advanced.md#68-query-composition)
    68b. [Cross-Graph Query Dependencies](./13-advanced.md#68b-cross-graph-query-dependencies)
    68c. [SSR, Streaming SSR & React Server Components](./13-advanced.md#68c-server-side-rendering-streaming-ssr-and-react-server-components)

### [14 - API Reference](./14-api-reference.md)

69. [Port Factories](./14-api-reference.md#69-port-factories)
70. [Adapter Factories](./14-api-reference.md#70-adapter-factories)
71. [Client Interfaces](./14-api-reference.md#71-client-interfaces)
72. [Cache Interfaces](./14-api-reference.md#72-cache-interfaces)
73. [State Types](./14-api-reference.md#73-state-types)
74. [Type Utilities](./14-api-reference.md#74-type-utilities)
75. [React Hooks](./14-api-reference.md#75-react-hooks)
76. [Testing API](./14-api-reference.md#76-testing-api)
77. [Query Introspection](./14-api-reference.md#77-query-introspection)
78. [SSR Utilities](./14-api-reference.md#78-ssr-utilities)

### [15 - Appendices](./15-appendices.md)

- [Appendix A: Comparison with Data Fetching Libraries](./15-appendices.md#appendix-a-comparison-with-data-fetching-libraries)
- [Appendix B: Glossary](./15-appendices.md#appendix-b-glossary)
- [Appendix C: Design Decisions](./15-appendices.md#appendix-c-design-decisions)
- [Appendix D: Migration from TanStack Query](./15-appendices.md#appendix-d-migration-from-tanstack-query)

---

## Release Scope

All sections (1-78, 09b, 68c) ship in version 0.1.0. Devtools (`@hex-di/query-devtools`) is deferred to 0.2.0.

---

_End of Table of Contents_
