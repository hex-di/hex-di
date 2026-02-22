---
title: Installation
description: Install HexDI with one command and configure TypeScript for structural dependency injection.
sidebar_position: 1
---

# Installation

## Install

```bash
pnpm add hex-di
```

That's it. The `hex-di` umbrella package includes everything you need:

- `@hex-di/core` — Port token system
- `@hex-di/graph` — GraphBuilder and compile-time validation
- `@hex-di/runtime` — Container and scopes

### React

```bash
pnpm add @hex-di/react
```

### Result (Rust-style error handling)

```bash
pnpm add @hex-di/result
```

Used by `GraphBuilder.tryBuild()` and any adapter that returns `Result<T, E>`.

### Testing

```bash
pnpm add -D @hex-di/testing
```

---

## TypeScript Configuration

HexDI requires TypeScript 5.0+ with `strict: true`.

```json
{
  "compilerOptions": {
    "strict": true,
    "moduleResolution": "bundler",
    "target": "ES2022",
    "module": "ESNext"
  }
}
```

`strict: true` is required — HexDI's compile-time guarantees depend on it. Without strict mode, the type system cannot enforce structural correctness.

### Recommended settings

```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true,
    "moduleResolution": "bundler",
    "target": "ES2022",
    "module": "ESNext",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

---

## Importing

### From the umbrella (recommended)

```typescript
import {
  port,
  createAdapter,
  GraphBuilder,
  createContainer,
} from "hex-di";
```

### From individual packages

```typescript
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
```

Both patterns work. The umbrella re-exports everything from the three core packages.

---

## Verify

```typescript
// verify-hexdi.ts
import { port, createAdapter, GraphBuilder, createContainer } from "hex-di";

interface Logger {
  log(message: string): void;
}

const LoggerPort = port<Logger>()({ name: "Logger" });

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({
    log: msg => console.log(`[Test] ${msg}`),
  }),
});

const graph = GraphBuilder.create().provide(LoggerAdapter).build();
const container = createContainer({ graph, name: "App" });

container.tryResolve(LoggerPort).match(
  (logger) => { logger.log("HexDI is working!"); },
  (error) => { console.error("Resolution failed:", error); },
);
```

```bash
npx tsx verify-hexdi.ts
# [Test] HexDI is working!
```

---

## Troubleshooting

**"Cannot find module 'hex-di'"** — Run `pnpm add hex-di` in your project root.

**Type errors with strict mode** — Add `"strict": true` to your `tsconfig.json`. HexDI requires it.

**Module resolution errors** — Use `"moduleResolution": "bundler"` or `"moduleResolution": "node16"`.

---

Next: [Core Concepts](./core-concepts.md)
