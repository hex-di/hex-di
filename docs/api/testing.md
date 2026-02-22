---
title: "@hex-di/testing"
description: API reference for @hex-di/testing providing mock adapters, TestGraphBuilder, graph assertions, and React testing utilities.
sidebar_position: 6
sidebar_label: "@hex-di/testing"
---

# @hex-di/testing API Reference

Testing utilities for HexDI applications including mocks, overrides, and assertions.

## Installation

```bash
pnpm add -D @hex-di/testing
```

## Overview

`@hex-di/testing` provides:
- `createAdapterTest()` - Unit test adapters
- `createMockAdapter()` - Create typed mock adapters
- `TestGraphBuilder` - Override adapters in test graphs
- Graph assertions and snapshots
- React testing utilities
- Vitest integration

## Adapter Testing

### createAdapterTest

Creates a test harness for unit testing an adapter's factory function.

```typescript
function createAdapterTest<A extends Adapter<Port<unknown, string>, Port<unknown, string> | never, Lifetime>>(
  adapter: A,
  deps: ResolvedDeps<InferAdapterRequires<A>>
): AdapterTestHarness<A>
```

**Returns:**

```typescript
interface AdapterTestHarness<A> {
  invoke(): InferService<InferAdapterProvides<A>>;
  getDeps(): ResolvedDeps<InferAdapterRequires<A>>;
}
```

**Example:**

```typescript
import { createAdapterTest } from '@hex-di/testing';
import { vi } from 'vitest';

describe('UserServiceAdapter', () => {
  it('logs when fetching user', async () => {
    const mockLogger = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };

    const mockDatabase = {
      query: vi.fn().mockResolvedValue({ id: '1', name: 'Alice' })
    };

    const harness = createAdapterTest(UserServiceAdapter, {
      Logger: mockLogger,
      Database: mockDatabase
    });

    const service = harness.invoke();
    await service.getUser('1');

    const deps = harness.getDeps();
    expect(deps.Logger.log).toHaveBeenCalledWith('Fetching user 1');
  });
});
```

### createMockAdapter

Creates a typed mock adapter with partial implementation.

```typescript
function createMockAdapter<
  P extends Port<unknown, string>,
  TLifetime extends Lifetime = 'singleton'
>(
  port: P,
  implementation: Partial<InferService<P>>,
  options?: MockAdapterOptions<TLifetime>
): Adapter<P, never, TLifetime>
```

**Options:**

```typescript
interface MockAdapterOptions<TLifetime extends Lifetime> {
  lifetime?: TLifetime;
}
```

**Example:**

```typescript
import { createMockAdapter } from '@hex-di/testing';
import { vi } from 'vitest';

const mockLogger = createMockAdapter(LoggerPort, {
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
});

// Partial implementation
const partialMock = createMockAdapter(UserServicePort, {
  getUser: vi.fn().mockResolvedValue({ id: '1', name: 'Mock' })
  // Other methods will throw "not implemented"
});

// Custom lifetime
const scopedMock = createMockAdapter(
  UserSessionPort,
  { user: { id: '1', name: 'Test' } },
  { lifetime: 'scoped' }
);
```

## TestGraphBuilder

### TestGraphBuilder.from

Creates a test graph builder from an existing graph.

```typescript
class TestGraphBuilder<TProvides, TRequires> {
  static from<TProvides extends Port<unknown, string>>(
    graph: Graph<TProvides>
  ): TestGraphBuilder<TProvides, never>;

  override<A extends Adapter<...>>(
    adapter: A
  ): TestGraphBuilder<TProvides, TRequires>;

  build(): Graph<TProvides>;
}
```

**Example:**

```typescript
import { TestGraphBuilder, createMockAdapter } from '@hex-di/testing';
import { createContainer } from '@hex-di/runtime';

const mockLogger = createMockAdapter(LoggerPort, {
  log: vi.fn()
});

const mockDatabase = createMockAdapter(DatabasePort, {
  query: vi.fn().mockResolvedValue([])
});

const testGraph = TestGraphBuilder.from(productionGraph)
  .override(mockLogger)
  .override(mockDatabase)
  .build();

const container = createContainer({ graph: testGraph, name: "Test" });
```

### InferTestGraphProvides

Type utility for test graph provides.

```typescript
type Provides = InferTestGraphProvides<typeof testGraphBuilder>;
```

## Graph Assertions

### assertGraphComplete

Asserts that all dependencies are satisfied.

```typescript
function assertGraphComplete(graph: Graph<Port<unknown, string>>): void
```

**Throws:**
- `GraphAssertionError` if dependencies are missing

**Example:**

```typescript
describe('production graph', () => {
  it('is complete', () => {
    assertGraphComplete(appGraph);
  });
});
```

### assertPortProvided

Asserts that a specific port is in the graph.

```typescript
function assertPortProvided<P extends Port<unknown, string>>(
  graph: Graph<Port<unknown, string>>,
  port: P
): void
```

**Example:**

```typescript
it('provides Logger', () => {
  assertPortProvided(appGraph, LoggerPort);
});
```

### assertLifetime

Asserts a port's lifetime in the graph.

```typescript
function assertLifetime<P extends Port<unknown, string>>(
  graph: Graph<Port<unknown, string>>,
  port: P,
  lifetime: Lifetime
): void
```

**Example:**

```typescript
it('Logger is singleton', () => {
  assertLifetime(appGraph, LoggerPort, 'singleton');
});

it('UserSession is scoped', () => {
  assertLifetime(appGraph, UserSessionPort, 'scoped');
});
```

### GraphAssertionError

Error thrown by assertion functions.

```typescript
class GraphAssertionError extends Error {
  readonly assertion: string;
  readonly details: Record<string, unknown>;
}
```

## Graph Snapshots

### serializeGraph

Serializes a graph for snapshot testing.

```typescript
function serializeGraph(graph: Graph<Port<unknown, string>>): GraphSnapshot
```

**Returns:**

```typescript
interface GraphSnapshot {
  adapters: AdapterSnapshot[];
}

interface AdapterSnapshot {
  port: string;       // port name
  lifetime: Lifetime;
  requires: string[]; // sorted alphabetically
}

interface SerializeGraphOptions {
  preserveOrder?: boolean; // default: false (sorts alphabetically)
}
```

**Example:**

```typescript
describe('graph structure', () => {
  it('matches snapshot', () => {
    const snapshot = serializeGraph(appGraph);
    expect(snapshot).toMatchSnapshot();
  });
});
```

## Vitest Integration

The Vitest-specific utilities are available at the `@hex-di/testing/vitest` subpath. They require Vitest as a peer dependency and use `beforeEach`/`afterEach` under the hood.

### createSpiedMockAdapter

Creates a mock adapter with all methods automatically wrapped as `vi.fn()`.

```typescript
function createSpiedMockAdapter<
  P extends Port<unknown, string>,
  TLifetime extends Lifetime = 'singleton'
>(
  port: P,
  implementation?: Partial<InferService<P>>,
  options?: MockAdapterOptions<TLifetime>
): SpiedAdapter<P, TLifetime>
```

**Returns:**

```typescript
interface SpiedAdapter<P, TLifetime> {
  adapter: Adapter<P, never, TLifetime>;   // pass to TestGraphBuilder.override()
  implementation: SpiedService<P>;          // vi.fn() spies for assertions
}
```

**Example:**

```typescript
import { createSpiedMockAdapter } from '@hex-di/testing/vitest';
import { TestGraphBuilder } from '@hex-di/testing';

// All methods are auto-wrapped as vi.fn()
const { adapter: mockLogger, implementation } = createSpiedMockAdapter(LoggerPort);

const testGraph = TestGraphBuilder.from(appGraph)
  .override(mockLogger)
  .build();

// After running code...
expect(implementation.log).toHaveBeenCalledWith('hello');
```

### useTestContainer

Vitest hook that creates a fresh container before each test and disposes it after.

```typescript
function useTestContainer<TProvides extends Port<unknown, string>>(
  graphFactory: () => Graph<TProvides>
): {
  container: Container<TProvides>;
  scope: Scope<TProvides>;
}
```

**Example:**

```typescript
import { useTestContainer } from '@hex-di/testing/vitest';

describe('UserService', () => {
  const { container, scope } = useTestContainer(() => testGraph);

  it('resolves services', () => {
    const logger = container.resolve(LoggerPort);
    expect(logger).toBeDefined();
  });

  it('creates scoped services', () => {
    const session = scope.resolve(UserSessionPort);
    expect(session).toBeDefined();
  });

  // Container and scope auto-disposed after each test
});
```

### createTestContainer

Creates a container without automatic lifecycle (manual management).

```typescript
function createTestContainer<TProvides extends Port<unknown, string>>(
  graph: Graph<TProvides>
): {
  container: Container<TProvides>;
  scope: Scope<TProvides>;
  dispose: () => Promise<void>;
}
```

**Example:**

```typescript
import { createTestContainer } from '@hex-di/testing/vitest';

describe('manual cleanup', () => {
  let cleanup: () => Promise<void>;
  let container: Container<AppPorts>;

  beforeEach(() => {
    const result = createTestContainer(testGraph);
    container = result.container;
    cleanup = result.dispose;
  });

  afterEach(async () => {
    await cleanup();
  });

  it('works', () => {
    const service = container.resolve(LoggerPort);
    expect(service).toBeDefined();
  });
});
```

## React Testing

### renderWithContainer

Renders a component with a DI container.

```typescript
function renderWithContainer(
  element: React.ReactElement,
  graph: Graph<Port<unknown, string>>,
  options?: RenderWithContainerOptions
): RenderResult & { diContainer: Container<...> }
```

**Options:**

```typescript
interface RenderWithContainerOptions {
  withScope?: boolean;
  container?: Container<...>;
}
```

**Example:**

```typescript
import { renderWithContainer } from '@hex-di/testing';
import { screen, fireEvent } from '@testing-library/react';

describe('MessageInput', () => {
  it('sends message on submit', async () => {
    const mockSend = vi.fn();
    const mockChat = createMockAdapter(ChatServicePort, {
      sendMessage: mockSend
    });

    const testGraph = TestGraphBuilder.from(appGraph)
      .override(mockChat)
      .build();

    renderWithContainer(<MessageInput />, testGraph, { withScope: true });

    const input = screen.getByPlaceholderText('Message...');
    fireEvent.change(input, { target: { value: 'Hello!' } });

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockSend).toHaveBeenCalledWith('Hello!');
  });
});
```

## Complete Example

```typescript
import { describe, it, expect, vi } from 'vitest';
import {
  createAdapterTest,
  createMockAdapter,
  TestGraphBuilder,
  assertGraphComplete,
  serializeGraph
} from '@hex-di/testing';
import { useTestContainer } from '@hex-di/testing/vitest';

// Unit test adapter
describe('ChatServiceAdapter', () => {
  it('sends message with user info', () => {
    const mockLogger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const mockSession = { user: { id: '1', name: 'Alice' } };
    const mockStore = { addMessage: vi.fn(), getMessages: vi.fn(), subscribe: vi.fn() };

    const harness = createAdapterTest(ChatServiceAdapter, {
      Logger: mockLogger,
      UserSession: mockSession,
      MessageStore: mockStore
    });

    const service = harness.invoke();
    service.sendMessage('Hello!');

    expect(mockStore.addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        senderName: 'Alice',
        content: 'Hello!'
      })
    );
  });
});

// Integration test with overrides
describe('ChatService integration', () => {
  const mockLogger = createMockAdapter(LoggerPort, {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  });

  const testGraph = TestGraphBuilder.from(appGraph)
    .override(mockLogger)
    .build();

  const { scope } = useTestContainer(() => testGraph);

  it('sends messages through store', () => {
    const chat = scope.resolve(ChatServicePort);
    const store = scope.resolve(MessageStorePort);

    chat.sendMessage('Test');

    expect(store.getMessages()).toHaveLength(1);
  });
});

// Graph validation
describe('appGraph', () => {
  it('is complete', () => {
    assertGraphComplete(appGraph);
  });

  it('matches snapshot', () => {
    expect(serializeGraph(appGraph)).toMatchSnapshot();
  });
});
```
