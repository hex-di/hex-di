# Library Root index.ts Structure

The root `index.ts` must be divided into sections using banner comments. Section order follows the dependency hierarchy (types before consumers).

```typescript
// =============================================================================
// Ports
// =============================================================================
export { LoggerPort } from "./ports/index.js";
export type { Logger } from "./ports/index.js";

// =============================================================================
// Core Types
// =============================================================================
export type { LogLevel, LogEntry } from "./types/index.js";

// =============================================================================
// Adapters
// =============================================================================
export { ConsoleLoggerAdapter, MemoryLoggerAdapter } from "./adapters/index.js";

// =============================================================================
// Context Variables
// =============================================================================
export { LogContextVar } from "./context/index.js";

// =============================================================================
// Utilities
// =============================================================================
export { mergeContext } from "./utils/index.js";

// =============================================================================
// Instrumentation
// =============================================================================
export { instrumentContainer } from "./instrumentation/index.js";

// =============================================================================
// Inspection
// =============================================================================
export { LoggerInspectorPort } from "./inspection/index.js";

// =============================================================================
// Testing Utilities
// =============================================================================
export { assertLogEntry } from "./testing/index.js";
```

- Banner format: `// ===...=== (78 chars)`, then `// Section Title`, then `// ===...===`
- Each section re-exports from its subdirectory's `index.js`
- Ports section is always first
- Testing Utilities section is always last
- Omit sections that don't apply to the lib
