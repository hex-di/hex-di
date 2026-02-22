# 08 - Context Propagation

_Previous: [07 - Backend Adapters](./07-backend-adapters.md)_

---

## 31. Context Variables

`@hex-di/logger` provides two context variables for propagating log state through the DI container without explicit parameter passing.

### LogContextVar

```typescript
import { createContextVariable, type ContextVariable } from "@hex-di/core";

/**
 * Context variable for log context propagation.
 *
 * Carries the current log context (correlationId, requestId, etc.)
 * through DI resolution. Services resolved within a scope that has
 * this variable set will inherit the context.
 */
const LogContextVar: ContextVariable<LogContext> = createContextVariable(
  "hex-di/log-context",
  {} // default: empty context
);
```

### LogAnnotationsVar

```typescript
/**
 * Context variable for log annotations propagation.
 *
 * Carries persistent annotations that should be included
 * in all log entries within a scope.
 */
const LogAnnotationsVar: ContextVariable<Record<string, unknown>> = createContextVariable(
  "hex-di/log-annotations",
  {} // default: no annotations
);
```

### How context variables work

Context variables are part of HexDI's scope system. When a scope is created, it can inherit or override context variables from its parent. The Scoped Logger Adapter reads these variables during resolution:

```
Container (root scope)
  LogContextVar: {}
  LogAnnotationsVar: {}
  |
  +-- Scope (request scope)
        LogContextVar: { correlationId: "abc-123", requestId: "req-456" }
        LogAnnotationsVar: { source: "api" }
        |
        +-- Logger resolved here inherits context + annotations
```

### Setting context variables in middleware

```typescript
// Hono middleware example
app.use("*", async (c, next) => {
  const scope = container.createScope();

  scope.setContextVariable(LogContextVar, {
    correlationId: c.req.header("x-correlation-id") ?? generateId(),
    requestId: generateId(),
  });

  scope.setContextVariable(LogAnnotationsVar, {
    method: c.req.method,
    path: c.req.path,
  });

  c.set("scope", scope);
  await next();
  scope.dispose();
});
```

## 32. Header Extraction

The `extractContextFromHeaders` utility extracts log context from HTTP request headers.

### Standard headers

```typescript
/**
 * Standard header names for context extraction.
 */
const CORRELATION_ID_HEADER = "x-correlation-id";
const REQUEST_ID_HEADER = "x-request-id";
```

### extractContextFromHeaders

```typescript
/**
 * Extract log context from request headers.
 *
 * Looks for standard correlation and request ID headers.
 * Returns a partial LogContext that can be merged with
 * existing context via mergeContext() or child().
 *
 * @param headers - Request headers (lowercase keys)
 * @returns Extracted partial log context
 */
function extractContextFromHeaders(
  headers: Record<string, string | undefined>
): Partial<LogContext>;
```

### Behavior

| Header             | Context field   | Condition             |
| ------------------ | --------------- | --------------------- |
| `x-correlation-id` | `correlationId` | Present and non-empty |
| `x-request-id`     | `requestId`     | Present and non-empty |

If a header is missing or empty string, the corresponding context field is omitted (not set to `undefined`).

### Usage

```typescript
import { extractContextFromHeaders, CORRELATION_ID_HEADER } from "@hex-di/logger";

// In server middleware:
const headers = {
  [CORRELATION_ID_HEADER]: req.headers["x-correlation-id"],
  [REQUEST_ID_HEADER]: req.headers["x-request-id"],
};

const extracted = extractContextFromHeaders(headers);
// { correlationId: "abc-123", requestId: "req-456" }
// or {} if no headers present

const requestLogger = logger.child(extracted);
```

### Extensibility

Applications that use additional propagation headers (e.g., `x-session-id`, `x-tenant-id`) should create their own extraction function that wraps `extractContextFromHeaders`:

```typescript
function extractFullContext(headers: Record<string, string | undefined>): Partial<LogContext> {
  const base = extractContextFromHeaders(headers);
  const sessionId = headers["x-session-id"];
  const tenantId = headers["x-tenant-id"];

  return {
    ...base,
    ...(sessionId ? { sessionId } : {}),
    ...(tenantId ? { tenantId } : {}),
  };
}
```

## 33. Scope Propagation

When using DI scopes (e.g., per-request in Hono), log context propagates through the scope lifecycle.

### Scope creation

```
1. Request arrives
2. Middleware creates scope
3. Middleware sets LogContextVar with request-specific data
4. Services resolved in scope get a Logger with that context
5. Scope is disposed at request end
```

### Scope hierarchy

```
Root Container
  Logger context: { service: "api", environment: "production" }
  |
  +-- Request Scope A
  |     Logger context: { service: "api", environment: "production",
  |                        correlationId: "corr-1", requestId: "req-a" }
  |     |
  |     +-- Nested Scope (e.g., transaction)
  |           Logger context: { service: "api", environment: "production",
  |                              correlationId: "corr-1", requestId: "req-a",
  |                              transactionId: "tx-123" }
  |
  +-- Request Scope B
        Logger context: { service: "api", environment: "production",
                           correlationId: "corr-2", requestId: "req-b" }
```

### Automatic scopeId

The Scoped Logger Adapter automatically injects `scopeId` from the DI scope:

```typescript
// ScopedLoggerAdapter factory:
factory: (deps, scope) => {
  const handler = deps[LogHandlerPort.name];
  const baseLogger = createHandlerLogger(handler);
  return baseLogger.child({
    scopeId: scope?.id,
  });
};
```

This means every log entry from a scoped logger includes the scope ID without any manual intervention. Useful for correlating logs across scope boundaries.

## 34. Context Merging

### mergeContext function

```typescript
/**
 * Merge base context with override values.
 *
 * Override values take precedence. Undefined values in the
 * override are skipped (do not erase base values).
 *
 * @param base - The base log context
 * @param override - Values to merge into the base
 * @returns A new merged LogContext (never mutates inputs)
 */
function mergeContext(base: LogContext, override: Partial<LogContext>): LogContext;
```

### Merge semantics

| Scenario                | Base             | Override           | Result                         |
| ----------------------- | ---------------- | ------------------ | ------------------------------ |
| New key                 | `{ a: 1 }`       | `{ b: 2 }`         | `{ a: 1, b: 2 }`               |
| Override key            | `{ a: 1 }`       | `{ a: 2 }`         | `{ a: 2 }`                     |
| Undefined override skip | `{ a: 1 }`       | `{ a: undefined }` | `{ a: 1 }` (undefined skipped) |
| Empty override          | `{ a: 1, b: 2 }` | `{}`               | `{ a: 1, b: 2 }`               |
| Empty base              | `{}`             | `{ a: 1 }`         | `{ a: 1 }`                     |
| Both empty              | `{}`             | `{}`               | `{}`                           |

### Immutability

`mergeContext` always returns a new object. It never mutates the `base` or `override` arguments. This ensures that child logger creation does not affect the parent logger's context.

### Usage in Logger implementations

Every Logger implementation uses `mergeContext` in the `child()` method:

```typescript
child(context: Partial<LogContext>): Logger {
  return new LoggerImpl(
    this._entries,
    mergeContext(this._context, context),  // Merge parent + child context
    this._baseAnnotations,
    this._minLevel
  );
}
```

### Context merging order

When multiple child() calls are chained, context merges left-to-right (parent-to-child):

```typescript
const a = logger.child({ x: 1 }); // context: { x: 1 }
const b = a.child({ x: 2, y: 3 }); // context: { x: 2, y: 3 }
const c = b.child({ y: 4, z: 5 }); // context: { x: 2, y: 4, z: 5 }
```

---

_Previous: [07 - Backend Adapters](./07-backend-adapters.md) | Next: [09 - Redaction & Sampling](./09-redaction-sampling.md)_
