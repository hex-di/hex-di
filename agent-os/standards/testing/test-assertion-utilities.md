# Test Assertion Utilities

Domain-specific assertion helpers for spans and log entries. Both throw a descriptive `Error`
(listing all available entries) on failure, and return the matched entry on success.

## Span Assertions

```typescript
import { assertSpanExists } from "@hex-di/tracing/testing";

const spans = tracer.getCollectedSpans();

// All matcher fields are optional; only specified fields are checked
const span = assertSpanExists(spans, {
  name: "GET /users",                       // exact string or RegExp
  status: "ok",                             // "unset" | "ok" | "error"
  attributes: { "http.status_code": 200 },  // subset match
  hasEvent: "cache.hit",                    // at least one event with this name
  minDuration: 10,                          // span.endTime - span.startTime >= 10ms
});
```

## Log Assertions

```typescript
import { assertLogEntry } from "@hex-di/logger/testing";

const entries = logger.getEntries();

const entry = assertLogEntry(entries, {
  level: "error",                // exact level
  message: /failed to connect/,  // exact string or RegExp
  annotations: { requestId: "abc" },  // subset match
  hasError: true,                // entry.error !== undefined
});
```

- Matcher fields are a **subset match** — the span/entry may have additional fields not in the matcher
- Returns the **first** match; throws if none found
- Error message lists all available entries for quick debugging
