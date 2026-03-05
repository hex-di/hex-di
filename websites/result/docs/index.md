---
sidebar_position: 1
title: Introduction
---

# Introduction

Rust-style `Result<T, E>` for TypeScript. Errors as values — no throws, no surprises.

## Overview

`@hex-di/result` provides a comprehensive toolkit for error handling without exceptions. Instead of throwing errors that disrupt control flow, this library treats errors as values that can be transformed, combined, and handled explicitly.

## Features

- **`ok` / `err` factories** — Create success and failure values with type safety
- **`Result<T, E>` discriminated union** — Type-safe error handling with exhaustive checking
- **`ResultAsync<T, E>` for async operations** — First-class support for asynchronous workflows
- **`Option<T>` for nullable values** — Explicit handling of absent values without `null`
- **Combinators** — `all`, `any`, `partition` for working with multiple results
- **`safeTry` generators** — Sequential operations with automatic error propagation
- **Do notation** — Build up context step-by-step with `bind` and `let_`
- **Error patterns** — Discriminated error types with exhaustive handling
- **Tagged error handling** — `catchTag`, `catchTags` for progressive error elimination
- **Effect system** — Type-level effect tracking, contracts, and composable handlers
- **Serialization** — JSON serialization and Standard Schema v1 support

## Installation

```bash
pnpm add @hex-di/result
```

```bash
npm install @hex-di/result
```

```bash
yarn add @hex-di/result
```

## Quick Start

### Basic Usage

```typescript
import { ok, err, type Result } from "@hex-di/result";

function divide(a: number, b: number): Result<number, string> {
  if (b === 0) return err("division by zero");
  return ok(a / b);
}

const result = divide(10, 2);
if (result.isOk()) {
  console.log(result.value); // 5
} else {
  console.error(result.error);
}
```

### Method Chaining

Transform and combine results using a rich API of methods:

```typescript
const doubled = divide(10, 2)
  .map(n => n * 2) // Transform the value if Ok
  .andThen(n => divide(n, 3)) // Chain another operation
  .unwrapOr(0); // Extract value or use default
// Result: 3.333...
```

### Error Handling

Handle errors explicitly without try-catch:

```typescript
import { fromThrowable } from "@hex-di/result";

const parseConfig = fromThrowable(
  () => JSON.parse(configString),
  e => new Error(`Invalid config: ${e}`)
);

const config = parseConfig
  .mapErr(e => ({ type: "ParseError", message: e.message }))
  .match(
    config => processConfig(config),
    error => logError(error)
  );
```

## What's Next

- Learn about the [Result Type](concepts/result-type) and its methods
- Explore [Transformations & Chaining](guides/transformations) for composing operations
- Discover [Async Results](guides/async-results) for asynchronous workflows
- Master [Generators & Do Notation](guides/generators) for sequential operations
- Use [Tagged Error Handling](guides/tagged-error-handling) for `catchTag` and progressive error elimination
- Learn about [Combinators](guides/combinators) for batch processing patterns
- Explore the [Effect System](advanced/effect-system) for type-level effect tracking and contracts
