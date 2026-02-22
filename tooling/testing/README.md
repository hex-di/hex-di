# @hex-di/testing

Testing utilities for [HexDI](https://github.com/hex-di/hex-di) — override adapters, create type-safe mocks, and manage test container lifecycles.

## Installation

```bash
pnpm add -D @hex-di/testing
```

## Usage

```typescript
import { createTestGraph } from "@hex-di/testing";

const graph = createTestGraph(productionGraph, {
  overrides: [MockLoggerAdapter],
});

const container = await graph.build();
```

## Features

- **`createTestGraph`** — build a graph with specific adapters swapped out for test doubles
- **Mock adapters** — type-safe stubs validated against port contracts at compile time
- **Automatic cleanup** — test containers are disposed after each test without manual teardown
- **Graph assertions** — runtime helpers for asserting graph completeness and port wiring

## License

MIT
