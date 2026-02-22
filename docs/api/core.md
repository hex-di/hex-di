---
title: "@hex-di/core"
description: API reference for @hex-di/core — the foundational package providing typed port tokens, adapters, error classes, and utilities.
sidebar_position: 1
sidebar_label: "@hex-di/core"
---

# @hex-di/core API Reference

The foundational layer of HexDI with zero dependencies. Provides typed port tokens, adapter types, error classes, and utilities.

## Installation

```bash
pnpm add @hex-di/core
```

## Overview

`@hex-di/core` provides:
- `port<T>()` - Preferred builder for creating port tokens (infers literal name)
- `createPort()` - Explicit factory for creating port tokens
- `createAdapter()` - Factory for creating adapters
- `DirectedPort<T, TName, TDirection>` - Typed port token type
- Type utilities for extracting port information
- Error classes (`ContainerError` and subclasses)
- Context variable utilities

## Creating Ports

### `port<T>()` — Preferred Builder

Creates a typed port token with a service type and optional metadata. The name is inferred as a literal type from the config object.

```typescript
import { port } from '@hex-di/core';

interface Logger {
  log(message: string): void;
}

// Name 'Logger' is inferred as literal type
const LoggerPort = port<Logger>()({ name: 'Logger' });
// Type: DirectedPort<Logger, 'Logger', 'outbound'>

// With direction (inbound = driven by external input)
const HttpRequestPort = port<Request>()({ name: 'HttpRequest', direction: 'inbound' });

// With full metadata
const DatabasePort = port<Database>()({
  name: 'Database',
  direction: 'outbound',
  category: 'data/database',
  tags: ['persistence', 'sql'],
  description: 'Relational database access',
});
```

### `createPort()` — Explicit Alternative

```typescript
import { createPort } from '@hex-di/core';

// Name and service explicit; direction defaults to 'outbound'
const LoggerPort = createPort<'Logger', Logger>({ name: 'Logger' });

// With all parameters explicit
const AuditPort = createPort<'Audit', AuditService, 'outbound'>({
  name: 'Audit',
  direction: 'outbound',
  category: 'observability/audit',
  tags: ['gxp', 'compliance'],
});
```

**Configuration:**

| Property | Required | Default | Description |
|----------|----------|---------|-------------|
| `name` | Yes | — | Unique port identifier |
| `direction` | No | `'outbound'` | `'inbound'` or `'outbound'` |
| `category` | No | `undefined` | Category in `'domain/sub'` format |
| `tags` | No | `[]` | Searchable tags |
| `description` | No | `undefined` | Human-readable description |

## Types

### `DirectedPort<T, TName, TDirection>`

A branded port type that serves as a compile-time contract for a service interface.

```typescript
// Usually inferred — rarely written manually
type LoggerPort = DirectedPort<Logger, 'Logger', 'outbound'>;
```

**Type Parameters:**
- `T` — The service interface type (phantom)
- `TName` — The literal string type for the port name
- `TDirection` — `'inbound'` or `'outbound'`

**Properties:**
- `__portName` — The port name for debugging and error messages
- `direction` — The port direction

### `PortDirection`

```typescript
type PortDirection = 'inbound' | 'outbound';
```

### `InferService<P>`

Extracts the service interface type from a port.

```typescript
const LoggerPort = port<Logger>()({ name: 'Logger' });

type LoggerService = InferService<typeof LoggerPort>;
// LoggerService = Logger
```

### `InferPortName<P>`

Extracts the port name literal type.

```typescript
type Name = InferPortName<typeof LoggerPort>;
// Name = 'Logger'
```

### `InferPortDirection<P>`

Extracts the direction literal type.

```typescript
type Dir = InferPortDirection<typeof LoggerPort>;
// Dir = 'outbound'
```

## Port Utilities

### `isDirectedPort(value)`

Runtime type guard for directed ports.

```typescript
import { isDirectedPort } from '@hex-di/core';

if (isDirectedPort(maybePort)) {
  console.log(maybePort.__portName);
}
```

### `getPortDirection(port)`

Returns the direction of a port.

```typescript
import { getPortDirection } from '@hex-di/core';

const dir = getPortDirection(LoggerPort); // 'outbound'
```

### `getPortMetadata(port)`

Returns the metadata of a port.

```typescript
import { getPortMetadata } from '@hex-di/core';

const meta = getPortMetadata(DatabasePort);
// { description: '...', category: 'data/database', tags: ['persistence'] }
```

## Creating Adapters

```typescript
import { createAdapter } from '@hex-di/core';

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: 'singleton',
  factory: () => ({ log: (msg) => console.log(msg) }),
});

const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort, DatabasePort],
  lifetime: 'scoped',
  factory: ({ Logger, Database }) => ({
    getUser: async (id) => {
      Logger.log(`Fetching ${id}`);
      return Database.query('SELECT * FROM users WHERE id = ?', [id]);
    },
  }),
});
```

## Error Classes

### `ContainerError`

Base class for all container errors.

```typescript
abstract class ContainerError extends Error {
  readonly code: string;
  readonly isProgrammingError: boolean;
}
```

### `CircularDependencyError`

Thrown when a circular dependency is detected at resolution time.

```typescript
class CircularDependencyError extends ContainerError {
  readonly code = 'CIRCULAR_DEPENDENCY';
  readonly isProgrammingError = true;
  readonly dependencyChain: string[];
}
```

### `FactoryError`

Thrown when an adapter's factory function throws.

```typescript
class FactoryError extends ContainerError {
  readonly code = 'FACTORY_FAILED';
  readonly isProgrammingError = false;
  readonly portName: string;
  readonly cause: Error;
}
```

### `DisposedScopeError`

Thrown when resolving from a disposed scope.

```typescript
class DisposedScopeError extends ContainerError {
  readonly code = 'DISPOSED_SCOPE';
  readonly isProgrammingError = true;
}
```

### `ScopeRequiredError`

Thrown when resolving a scoped service from the root container.

```typescript
class ScopeRequiredError extends ContainerError {
  readonly code = 'SCOPE_REQUIRED';
  readonly isProgrammingError = true;
  readonly portName: string;
}
```

## Usage Patterns

### Basic Port Creation

```typescript
import { port } from '@hex-di/core';

// Define interface
interface UserService {
  getUser(id: string): Promise<User>;
  createUser(data: CreateUserDTO): Promise<User>;
}

// Create port — name inferred as literal
const UserServicePort = port<UserService>()({ name: 'UserService' });
```

### Port Collections

```typescript
import { port } from '@hex-di/core';

export const LoggerPort    = port<Logger>()({ name: 'Logger' });
export const ConfigPort    = port<Config>()({ name: 'Config' });
export const DatabasePort  = port<Database>()({ name: 'Database' });

// Union type for all ports
export type AppPorts =
  | typeof LoggerPort
  | typeof ConfigPort
  | typeof DatabasePort;
```

### Multiple Ports for Same Interface

```typescript
interface Logger { log(message: string): void }

// Different ports for different implementation roles
const ConsoleLoggerPort = port<Logger>()({ name: 'ConsoleLogger' });
const FileLoggerPort    = port<Logger>()({ name: 'FileLogger' });

// These are type-incompatible despite sharing the Logger interface
```

### Type Extraction

```typescript
// Extract service type for annotations
type LoggerType = InferService<typeof LoggerPort>;

function useLogger(): LoggerType {
  return container.resolve(LoggerPort);
}
```

## Best Practices

### 1. Use `port<T>()` for New Code

```typescript
// Preferred — name inferred as literal
const LoggerPort = port<Logger>()({ name: 'Logger' });

// Also fine — explicit but more verbose
const LoggerPort = createPort<'Logger', Logger>({ name: 'Logger' });
```

### 2. One Port per Interface Role

```typescript
const UserServicePort = port<UserService>()({ name: 'UserService' });
const AuthServicePort = port<AuthService>()({ name: 'AuthService' });
```

### 3. Separate Interfaces from Ports

```typescript
// types.ts — Pure interfaces
export interface Logger { log(message: string): void }

// ports.ts — Port definitions
import type { Logger } from './types';
export const LoggerPort = port<Logger>()({ name: 'Logger' });
```

### 4. Export AppPorts Type

```typescript
export type AppPorts =
  | typeof LoggerPort
  | typeof ConfigPort
  | typeof UserServicePort;
```

## Re-exports

`@hex-di/core` types are re-exported from `@hex-di/graph` and `@hex-di/runtime` for convenience:

```typescript
// Both work
import { port, createPort } from '@hex-di/core';
import type { DirectedPort, InferService } from '@hex-di/runtime';
```
