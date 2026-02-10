# Cross-Library Integration Specs

HexDI libraries are designed to be independent: no library imports another directly. Integration between libraries is achieved through **port composition** in `GraphBuilder`. Each integration spec documents the patterns, wiring, error handling, and testing strategies for combining two HexDI libraries in a single application graph.

## Tier 1 (Primary Integration Points)

| Spec                              | Libraries                    | Description                                                           |
| --------------------------------- | ---------------------------- | --------------------------------------------------------------------- |
| [Store + Query](./store-query.md) | @hex-di/store, @hex-di/query | Cache-to-state sync, mutation coordination, optimistic updates        |
| [Flow + Saga](./flow-saga.md)     | @hex-di/flow, @hex-di/saga   | Machine-triggered sagas, saga steps using machines, progress feedback |

## Tier 2 (Secondary Integration Points)

| Spec                            | Libraries                   | Description                                                |
| ------------------------------- | --------------------------- | ---------------------------------------------------------- |
| [Store + Flow](./store-flow.md) | @hex-di/store, @hex-di/flow | Bidirectional state sync between machines and store        |
| [Store + Saga](./store-saga.md) | @hex-di/store, @hex-di/saga | Saga steps reading/writing store state                     |
| [Query + Saga](./query-saga.md) | @hex-di/query, @hex-di/saga | Query-backed saga steps, post-saga cache invalidation      |
| [Query + Flow](./query-flow.md) | @hex-di/query, @hex-di/flow | Machine-triggered queries, query state driving transitions |

## Architecture Principle

Libraries never import each other. A `@hex-di/saga` step does not `import` from `@hex-di/store` or `@hex-di/query`. Instead, each library defines ports (typed tokens) and adapters (implementations). The `GraphBuilder` composes adapters from multiple libraries into a single dependency graph, and the container resolves ports at runtime. This ensures that each library can be developed, tested, and versioned independently while still participating in rich cross-library workflows.
