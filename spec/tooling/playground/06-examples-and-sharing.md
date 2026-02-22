# 06 — Examples and Sharing

This document specifies the example library, example templates, URL sharing, and iframe embedding mode.

---

## 26. Example Library

### 26.1 Purpose

The example library provides curated, runnable code samples that demonstrate HexDi patterns. Each example is a self-contained workspace (one or more files) that compiles and executes to produce meaningful inspector output.

Examples serve three audiences:

1. **New users**: Learn HexDi by reading and running working examples
2. **Documentation**: Embed specific examples in docs via iframe
3. **Sharing**: Start from an example, modify it, share the modified version via URL

### 26.2 Example Registry

```typescript
interface ExampleTemplate {
  readonly id: string; // URL-safe identifier, e.g. "basic-registration"
  readonly title: string; // Display name, e.g. "Basic Port & Adapter Registration"
  readonly description: string; // One-line description for the dropdown
  readonly category: ExampleCategory;
  readonly files: ReadonlyMap<string, string>; // path → content
  readonly entryPoint: string; // Main file to execute (default: "main.ts")
  readonly timeoutMs?: number; // Override default 5s timeout
  readonly defaultPanel?: string; // Panel to show after execution, e.g. "graph"
}

type ExampleCategory =
  | "basics" // Fundamental DI concepts
  | "patterns" // Common patterns and best practices
  | "libraries" // Library-specific examples (flow, store, query, saga)
  | "advanced"; // Complex multi-library composition

interface ExampleRegistry {
  getAll(): readonly ExampleTemplate[];
  getById(id: string): ExampleTemplate | undefined;
  getByCategory(category: ExampleCategory): readonly ExampleTemplate[];
}
```

### 26.3 Example Dropdown

The toolbar contains an example dropdown that lists all examples, grouped by category:

```
┌─ Examples ──────────────────────────┐
│  Basics                             │
│    Basic Port & Adapter Registration│
│    Lifetime Management              │
│    Dependency Graph Analysis         │
│    Scope Creation & Hierarchy       │
│    Child Containers & Inheritance   │
│  Patterns                           │
│    Resolution Tracing               │
│    Error Handling with Result       │
│  Libraries                          │
│    Flow State Machine               │
│    Store State Management           │
│    Query Cache Patterns             │
│    Saga Workflow Orchestration       │
│  Advanced                           │
│    Multi-Library Composition        │
└─────────────────────────────────────┘
```

Selecting an example:

1. Replaces the virtual filesystem with the example's files
2. Opens the entry point file in the editor
3. Clears the console
4. Does NOT auto-run (user must click "Run")

If the current workspace has unsaved changes (differs from the last loaded state), a confirmation prompt appears: "Loading an example will replace your current code. Continue?"

---

## 27. Example Templates

### 27.1 Basics

#### `basic-registration` — Basic Port & Adapter Registration

Single-file example showing the fundamental pattern: define a port, implement an adapter, build a graph, create a container, resolve the port.

```typescript
// main.ts
import { createPort } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";

// Define a port
const GreeterPort = createPort<{ greet(name: string): string }>("Greeter");

// Build a graph with an adapter
const graph = new GraphBuilder()
  .provide(GreeterPort, () => ({
    greet: (name: string) => `Hello, ${name}!`,
  }))
  .build();

// Create a container and resolve
const container = createContainer(graph);
const greeter = container.resolve(GreeterPort);
console.log(greeter.greet("World"));
```

**Default panel**: `graph`

#### `lifetime-management` — Lifetime Management

Demonstrates singleton, scoped, and transient lifetimes with a counter service.

```typescript
// main.ts
import { createPort, Lifetime } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";

const CounterPort = createPort<{ next(): number }>("Counter");

let count = 0;
const graph = new GraphBuilder()
  .provide(
    CounterPort,
    () => {
      let local = 0;
      return { next: () => ++local };
    },
    { lifetime: Lifetime.Transient }
  )
  .build();

const container = createContainer(graph);

// Each resolve creates a new instance (transient)
const counter1 = container.resolve(CounterPort);
const counter2 = container.resolve(CounterPort);
console.log("Counter1:", counter1.next(), counter1.next()); // 1, 2
console.log("Counter2:", counter2.next()); // 1 (new instance)
```

**Default panel**: `container`

#### `dependency-graph` — Dependency Graph Analysis

Multi-port example creating a visible dependency graph with several services depending on each other.

```typescript
// main.ts
import { createPort } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";

const ConfigPort = createPort<{ dbUrl: string }>("Config");
const LoggerPort = createPort<{ log(msg: string): void }>("Logger");
const DatabasePort = createPort<{ query(sql: string): string[] }>("Database");
const UserRepoPort = createPort<{ findById(id: string): string }>("UserRepo");
const AuthServicePort = createPort<{ authenticate(token: string): boolean }>("AuthService");

const graph = new GraphBuilder()
  .provide(ConfigPort, () => ({ dbUrl: "postgres://localhost/app" }))
  .provide(LoggerPort, () => ({ log: (msg: string) => console.log(`[LOG] ${msg}`) }))
  .provide(
    DatabasePort,
    (config, logger) => {
      logger.log(`Connecting to ${config.dbUrl}`);
      return { query: (sql: string) => [`result for: ${sql}`] };
    },
    { dependencies: [ConfigPort, LoggerPort] }
  )
  .provide(
    UserRepoPort,
    (db, logger) => ({
      findById: (id: string) => {
        logger.log(`Finding user ${id}`);
        return db.query(`SELECT * FROM users WHERE id = '${id}'`)[0];
      },
    }),
    { dependencies: [DatabasePort, LoggerPort] }
  )
  .provide(
    AuthServicePort,
    (userRepo, logger) => ({
      authenticate: (token: string) => {
        logger.log(`Authenticating token: ${token}`);
        const user = userRepo.findById("user-1");
        return user !== undefined;
      },
    }),
    { dependencies: [UserRepoPort, LoggerPort] }
  )
  .build();

const container = createContainer(graph);
const auth = container.resolve(AuthServicePort);
console.log("Authenticated:", auth.authenticate("abc123"));
```

**Default panel**: `graph`

#### `scope-hierarchy` — Scope Creation & Hierarchy

Demonstrates scope creation, nested scopes, and scoped lifetime resolution.

**Default panel**: `scopes`

#### `child-containers` — Child Containers & Inheritance

Shows child container creation with inheritance modes (shared, forked, isolated).

**Default panel**: `container`

### 27.2 Patterns

#### `resolution-tracing` — Resolution Tracing

Demonstrates resolution timing and dependency chain tracing.

**Default panel**: `tracing`

#### `error-handling-result` — Error Handling with Result

Shows Result type integration with port resolution, including error rates and recovery.

**Default panel**: `health`

### 27.3 Libraries

#### `flow-state-machine` — Flow State Machine

Demonstrates a Flow state machine with activities and transitions visible in the overview panel.

**Default panel**: `overview`

#### `store-state-management` — Store State Management

Shows Store port usage with state updates and action dispatching.

**Default panel**: `overview`

#### `query-cache-patterns` — Query Cache Patterns

Demonstrates Query port with cache management and invalidation.

**Default panel**: `overview`

#### `saga-orchestration` — Saga Workflow Orchestration

Shows a multi-step Saga with compensation and rollback.

**Default panel**: `overview`

### 27.4 Advanced

#### `multi-library-composition` — Multi-Library Composition

A comprehensive example using multiple hex-di libraries together: Flow for state machines, Store for state, Query for data fetching, Logger for structured logging — all composed in a single container with full inspector visibility.

This is a multi-file example:

```
ports/
  logger.ts
  cache.ts
  user-service.ts
adapters/
  console-logger.ts
  memory-cache.ts
  user-service-impl.ts
main.ts
```

**Default panel**: `graph`

---

## 28. URL Sharing

### 28.1 Encoding Scheme

The playground encodes the full workspace state in the URL hash. This enables sharing without a backend server.

**URL format**: `https://playground.hex-di.dev/#code/<encoded-data>`

**Encoding process**:

1. Serialize the workspace state to JSON
2. Compress with deflate (pako library)
3. Encode as base64url (URL-safe base64)
4. Prepend `code/` prefix

```typescript
interface ShareableState {
  readonly files: ReadonlyArray<[string, string]>; // [path, content] pairs
  readonly activeFile: string;
  readonly activePanel?: string;
}

function encodeShareableState(state: ShareableState): string {
  const json = JSON.stringify(state);
  const compressed = pako.deflate(json);
  const encoded = base64url.encode(compressed);
  return `code/${encoded}`;
}

function decodeShareableState(hash: string): ShareableState {
  const encoded = hash.replace(/^code\//, "");
  const compressed = base64url.decode(encoded);
  const json = pako.inflate(compressed, { to: "string" });
  return JSON.parse(json);
}
```

### 28.2 URL Length Considerations

- **Target**: Support workspaces up to ~50KB of source code (well above typical examples)
- **Compression ratio**: TypeScript source code compresses well with deflate (~60-70% reduction)
- **URL length limit**: Modern browsers support URLs up to 2MB+. The practical limit is ~100KB encoded, supporting ~200KB+ of source code.
- **Fallback**: If the encoded state exceeds 100KB, the Share button shows a warning: "Workspace too large for URL sharing. Consider reducing file count or size."

### 28.3 Share Button Behavior

1. User clicks "Share" button in toolbar
2. Playground encodes current workspace state
3. URL hash is updated (pushes to browser history)
4. Encoded URL is copied to clipboard
5. Toast notification: "Link copied to clipboard"

### 28.4 URL Loading

On page load:

1. Check for `#code/` hash prefix
2. If present: decode the state, populate VirtualFS, set active file and panel
3. If absent: check for `#example/<id>` prefix
4. If present: load the named example template
5. If neither: show default workspace (single `main.ts` with starter template)

### 28.5 Example Deep Links

Examples can be linked directly: `https://playground.hex-di.dev/#example/basic-registration`

This loads the example template by ID without encoding the full source in the URL.

---

## 29. Iframe Embedding

### 29.1 Embed Mode Activation

Embed mode is activated by the `?embed=true` query parameter:

```
https://playground.hex-di.dev/?embed=true#example/dependency-graph
```

### 29.2 Embed Mode Differences

| Feature                   | Full Mode             | Embed Mode                           |
| ------------------------- | --------------------- | ------------------------------------ |
| File tree                 | Visible (collapsible) | Hidden                               |
| Example dropdown          | Full dropdown         | Hidden (example loaded from URL)     |
| Share button              | Visible               | Hidden                               |
| "Open in Playground" link | N/A                   | Visible (top-right corner)           |
| Toolbar                   | Full toolbar          | Minimal: Run button, theme toggle    |
| Console                   | Full pane             | Collapsed by default, toggle to show |
| Responsive breakpoint     | 800px                 | 600px for side-by-side               |

### 29.3 Embed Layout

**Wide (≥600px)**:

```
┌─ [Run ▶] ──────────── [Open in Playground ↗] ─┐
│                             │                   │
│   Monaco Editor             │   Active Panel    │
│   (read-write)              │                   │
│                             │                   │
└─────────────────────────────┴───────────────────┘
```

**Narrow (<600px)**:

```
┌─ [Run ▶] ─ [Editor | Panel] ─ [Open ↗] ─┐
│                                           │
│   Active View (editor or panel)           │
│   Tab switches between them               │
│                                           │
└───────────────────────────────────────────┘
```

### 29.4 "Open in Playground" Link

In embed mode, a link in the top-right corner opens the full playground in a new tab with the same code. The link includes the `#code/` hash encoding the current workspace state (including any user modifications).

### 29.5 Communication with Host Page

The embedded playground does not communicate with the host page via `postMessage`. It is a fully self-contained iframe. The host page controls the initial state via the URL hash.

If a future version needs host-page communication (e.g., for syncing theme with the documentation site), a `postMessage` protocol can be added, but it is out of scope for v1.

### 29.6 Security Headers

The playground sets appropriate security headers for iframe embedding:

```
X-Frame-Options: ALLOWALL
Content-Security-Policy: frame-ancestors *;
```

These allow any site to embed the playground. Since the playground runs entirely client-side with no backend, there are no CSRF or data leakage concerns from iframe embedding.

### 29.7 Documentation Integration Example

A documentation site can embed a playground example:

```html
<iframe
  src="https://playground.hex-di.dev/?embed=true#example/dependency-graph"
  width="100%"
  height="500"
  style="border: 1px solid #e2e8f0; border-radius: 8px;"
  title="HexDi Playground: Dependency Graph Example"
  loading="lazy"
></iframe>
```

The `loading="lazy"` attribute ensures the playground iframe is only loaded when it enters the viewport, avoiding unnecessary resource consumption.

### 29.8 Pre-Configured Embed Options

Additional query parameters control embed behavior:

| Parameter  | Values          | Default         | Description                                      |
| ---------- | --------------- | --------------- | ------------------------------------------------ |
| `embed`    | `true`          | N/A             | Activates embed mode                             |
| `theme`    | `light`, `dark` | `system`        | Forces a specific theme                          |
| `panel`    | Panel ID        | Example default | Which panel to show initially                    |
| `autorun`  | `true`          | `false`         | Auto-run code on load (skips "Run" button click) |
| `readonly` | `true`          | `false`         | Makes editor read-only                           |
| `console`  | `show`, `hide`  | `hide`          | Console pane visibility                          |

Example with all options:

```
https://playground.hex-di.dev/?embed=true&theme=dark&panel=graph&autorun=true&readonly=true#example/dependency-graph
```
