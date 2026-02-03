# Feature Landscape: Runtime DI Improvements

**Domain:** Runtime DI container improvements (override API, errors, plugins, options)
**Researched:** 2026-02-03
**Focus:** Improving @hex-di/runtime from 8.7/10 to 9.5/10

## Overview

This research focuses on four specific feature categories for runtime improvements:

1. **Type-safe override APIs** - `withOverrides()` improvements
2. **Error message enhancements** - Actionable errors with suggestions
3. **Plugin system robustness** - Extensibility without pollution
4. **Container options ergonomics** - Merged createContainer options

These are **subsequent milestone features** - the codebase already has working override, error, and plugin systems. This research evaluates expected behaviors and competitive patterns.

---

## Table Stakes

Features users expect. Missing = product feels incomplete.

| Feature                   | Why Expected                                                | Complexity | Existing State                                  |
| ------------------------- | ----------------------------------------------------------- | ---------- | ----------------------------------------------- |
| Type-safe override API    | Overrides should be type-checked                            | Medium     | Partial - port names are strings, not validated |
| Actionable error messages | Modern DI containers explain what went wrong and how to fix | Low-Medium | Partial - has error codes but no suggestions    |
| Plugin system testing     | Extensions need documented test patterns                    | Low        | Missing - no official testing guidance          |
| Single options object     | Ergonomic API design                                        | Low        | Split into `containerOptions` + `hookOptions`   |

### Feature 1: Type-Safe Override API

**Current state:** The `withOverrides()` method accepts `Record<string, () => unknown>`:

```typescript
// Current API - port names as strings, no type validation
container.withOverrides(
  { Logger: () => new MockLogger() }, // "Logger" is just a string
  () => {
    /* test code */
  }
);
```

**Expected behavior:** Override keys should be validated against container's provided ports:

```typescript
// Expected - compile error if "Loger" typo
container.withOverrides(
  { Loger: () => new MockLogger() }, // TS error: "Loger" not in provided ports
  () => {
    /* test code */
  }
);
```

**Industry patterns:**

| Framework    | Override Mechanism                     | Type Safety                                                       |
| ------------ | -------------------------------------- | ----------------------------------------------------------------- |
| InversifyJS  | `rebind()` method                      | Uses service identifier (Symbol/string) - runtime validation only |
| TSyringe     | `registerInstance()` before resolve    | No override concept; uses registration order                      |
| typed-inject | `provideValue()` in injector chain     | Type-safe via token matching                                      |
| .NET DI      | Child container with new registrations | Runtime validation via IServiceCollection                         |

**Why table stakes:**

- HexDI is a compile-time DI system - override should leverage type system
- Typos in port names cause silent failures (override not applied)
- Current API accepts any string, including non-existent ports

**Implementation complexity: MEDIUM**

- Type-level: Extract port names from `TProvides | TExtends` union
- Use mapped type for override shape: `{ [K in PortNames]?: () => ServiceType<K> }`
- Runtime: Already validates port existence

**Existing codebase support:**

```typescript
// packages/runtime/src/types.ts already has:
type ExtractPortNames<T extends Port<unknown, string>> =
  T extends Port<infer _S, infer TName> ? TName : never;

type InferServiceByName<TPorts extends Port<unknown, string>, TName extends string> =
  TPorts extends Port<infer TService, TName> ? TService : never;
```

### Feature 2: Actionable Error Messages

**Current state:** Errors have structured fields but messages are basic:

```typescript
// Current error message
"Cannot resolve scoped port 'UserContext' from the root container.
Scoped ports must be resolved from a scope created via createScope()."
```

**Expected behavior:** Errors should include:

1. What went wrong (already present)
2. Why it went wrong (context)
3. How to fix it (actionable suggestion with code example)

**Example enhanced error:**

```typescript
"Cannot resolve scoped port 'UserContext' from the root container.

Why: Scoped ports have per-request lifetime and require a scope context.

Fix: Create a scope before resolving:

  const scope = container.createScope();
  const userContext = scope.resolve(UserContextPort);
  // Use userContext...
  await scope.dispose();

See: https://hexdi.dev/docs/scopes"
```

**Industry patterns:**

| Framework    | Error Quality                            | Example                                            |
| ------------ | ---------------------------------------- | -------------------------------------------------- |
| Rust (cargo) | Excellent - includes fix suggestions     | "Did you mean `crate::Logger`?"                    |
| TypeScript   | Good - structured with error codes       | TS2304: Cannot find name 'X'                       |
| Angular DI   | Good - NullInjectorError with token path | Shows injection hierarchy                          |
| InversifyJS  | Basic - just error message               | "No matching bindings found for serviceIdentifier" |

**Why table stakes:**

- DI errors are notoriously confusing (circular deps, missing bindings)
- Modern tooling sets high expectations for error quality
- HexDI already has error codes (HEX001-HEX021) - foundation exists

**Implementation complexity: LOW-MEDIUM**

- Each error class gets an enhanced message template
- Add optional `suggestion` property to ContainerError base
- Include code snippets in messages (multi-line)

**Existing error types to enhance:**

| Error                            | Current Message                           | Enhancement Priority                |
| -------------------------------- | ----------------------------------------- | ----------------------------------- |
| ScopeRequiredError               | "Cannot resolve scoped port from root"    | HIGH - common mistake               |
| CircularDependencyError          | "Circular dependency: A -> B -> A"        | HIGH - add resolution suggestions   |
| DisposedScopeError               | "Cannot resolve from disposed scope"      | MEDIUM - add lifecycle context      |
| FactoryError                     | "Factory for port 'X' threw"              | MEDIUM - add factory debugging tips |
| AsyncInitializationRequiredError | "Cannot resolve async port synchronously" | HIGH - common mistake               |

### Feature 3: Plugin System Testing Patterns

**Current state:** Plugin system exists with resolution hooks but no testing guidance:

```typescript
// packages/runtime/src/resolution/hooks.ts
export interface ResolutionHooks {
  beforeResolve?: (context: ResolutionHookContext) => void;
  afterResolve?: (context: ResolutionResultContext) => void;
}
```

**Expected behavior:** Clear patterns for:

1. Testing plugins in isolation
2. Verifying hook calls
3. Testing hook ordering/composition

**Industry patterns:**

| Framework          | Plugin Testing                  | Pattern                        |
| ------------------ | ------------------------------- | ------------------------------ |
| Express middleware | Supertest + mock req/res        | Integration testing            |
| React hooks        | @testing-library/react-hooks    | Isolated hook testing          |
| Vite plugins       | vitest + mock transform context | Unit testing with mock context |
| Webpack plugins    | compiler.run() with memfs       | Full compilation testing       |

**Why table stakes:**

- Users building custom plugins need guidance
- Plugin bugs are hard to debug without good tests
- HexDI already has good test infrastructure

**Implementation complexity: LOW**

- Document patterns in @hex-di/testing README
- Add helper functions for hook verification
- Provide example test files

**Suggested testing utilities:**

```typescript
// Could add to @hex-di/testing
export function createMockHookContext(
  overrides?: Partial<ResolutionHookContext>
): ResolutionHookContext;
export function createHookSpy(): { hooks: ResolutionHooks; getCalls(): ResolutionHookContext[] };
```

### Feature 4: Merged Container Options

**Current state:** `createContainer()` has split parameters:

```typescript
// Current API - two separate options objects
createContainer(
  graph,
  { name: "App" },           // containerOptions
  { hooks: { ... } }         // hookOptions (optional)
);
```

**Expected behavior:** Single merged options object:

```typescript
// Expected - single options object
createContainer(graph, {
  name: "App",
  hooks: { ... },
  devtools: { ... },
});
```

**Industry patterns:**

| Framework             | Options Pattern         | Example                           |
| --------------------- | ----------------------- | --------------------------------- |
| React.createContext   | Single options object   | `createContext(defaultValue)`     |
| Express               | Single options object   | `express({ strict: true })`       |
| Vite createServer     | Single config object    | `createServer({ root, plugins })` |
| InversifyJS Container | Single ContainerOptions | `new Container({ defaultScope })` |

**Why table stakes:**

- Two parameters is awkward - users must remember what goes where
- Single object is standard JavaScript pattern
- Easier to extend in future (just add properties)

**Implementation complexity: LOW**

- Merge `CreateContainerOptions` and `ContainerOptions` interfaces
- Update `createContainer()` signature
- Backward-compatible: old signature still works (with deprecation)

**Proposed merged interface:**

```typescript
export interface CreateContainerOptions {
  // Container identity (from current CreateContainerOptions)
  readonly name: string;

  // DevTools settings (from current CreateContainerOptions)
  readonly devtools?: ContainerDevToolsOptions;

  // Resolution hooks (from current ContainerOptions)
  readonly hooks?: ResolutionHooks;
}
```

---

## Differentiators

Features that set product apart. Not expected, but valued.

| Feature                              | Value Proposition                             | Complexity | Notes                                         |
| ------------------------------------ | --------------------------------------------- | ---------- | --------------------------------------------- |
| Type-safe override with inference    | Override factories get correct return type    | Medium     | Most DI containers don't type-check overrides |
| Error suggestions with code snippets | Errors include copy-paste-ready fix           | Low        | Only Rust-quality tooling does this well      |
| Hook composition order guarantees    | beforeResolve in order, afterResolve reversed | Low        | Already implemented, needs documentation      |
| Override scope isolation             | Override instances isolated from parent memo  | Low        | Already implemented, unique to HexDI          |

### Feature 1: Type-Safe Override with Return Type Inference

**Why differentiator:**

- Most JavaScript DI containers don't validate override types at all
- HexDI can infer the expected return type from the port definition
- Catches return type mismatches at compile time

**Example:**

```typescript
interface Logger { log(msg: string): void }
const LoggerPort = port<Logger>()({ name: "Logger" });

container.withOverrides({
  Logger: () => ({ log: (x) => console.log(x) }),  // TS infers Logger type
}, () => { ... });

// Error case:
container.withOverrides({
  Logger: () => ({ wrong: "shape" }),  // TS error: missing 'log' method
}, () => { ... });
```

### Feature 2: Error Suggestions with Code Snippets

**Why differentiator:**

- No JavaScript DI container provides this level of error UX
- Reduces time-to-fix for common mistakes
- Makes HexDI approachable for DI newcomers

**Example enhanced error:**

```typescript
// CircularDependencyError enhancement
throw new CircularDependencyError(chain, {
  suggestion: `
To break this cycle, consider one of:

1. Use a factory function to defer resolution:
   factory: (deps) => new UserService(() => deps.AuthService)

2. Split the circular dependency:
   UserService -> UserRepository -> AuthService (no back-reference)

3. Use event-based communication instead of direct dependency.
`,
  learnMoreUrl: "https://hexdi.dev/docs/circular-deps",
});
```

### Feature 3: Hook Composition with Documented Order

**Why differentiator:**

- Hook composition order is critical for tracing/logging plugins
- Most frameworks don't document middleware-like composition order
- HexDI already implements this correctly (just needs documentation)

**Current implementation (already correct):**

```typescript
// packages/runtime/src/container/factory.ts:125-137
beforeResolve(ctx: ResolutionHookContext): void {
  // Called in order of installation
  for (const source of holder.hookSources) {
    source.beforeResolve?.(ctx);
  }
},
afterResolve(ctx: ResolutionResultContext): void {
  // Called in reverse order (middleware pattern)
  for (let i = holder.hookSources.length - 1; i >= 0; i--) {
    holder.hookSources[i].afterResolve?.(ctx);
  }
},
```

### Feature 4: Override Scope Isolation

**Why differentiator:**

- `withOverrides()` creates isolated memoization context
- Instances created during override don't pollute parent container
- Enables safe testing without container state leakage

**Already implemented:**

```typescript
// packages/runtime/src/container/override-context.ts:141
// Fork from parent's singleton memo to inherit existing singletons
this.overrideMemo = container.getSingletonMemo().fork();
```

---

## Anti-Features

Features to explicitly NOT build. Common mistakes in this domain.

| Anti-Feature                | Why Avoid                                  | What to Do Instead                            |
| --------------------------- | ------------------------------------------ | --------------------------------------------- |
| Global override registry    | Pollutes container state, hard to clean up | Use `withOverrides()` scoped pattern          |
| Async override factories    | Complicates API, rare use case             | Keep override factories sync                  |
| Override by instance        | Can't guarantee cleanup/disposal           | Use factory pattern for fresh instances       |
| Mutable hook lists          | Hard to reason about hook order            | Return unsubscribe function from installHooks |
| Multiple options signatures | Confusing which parameter is which         | Single options object                         |
| Custom error formatting     | Breaks structured logging                  | Keep structured properties, enhance message   |

### Anti-Feature 1: Global Override Registry

**Why avoid:**

- State leakage between tests
- Hard to track what's overridden
- `withOverrides()` scoped pattern is cleaner

**Bad pattern:**

```typescript
// DON'T: Global override registration
container.registerOverride(LoggerPort, mockLogger);
// ... tests run ...
container.clearOverrides(); // Easy to forget!
```

**Good pattern (already implemented):**

```typescript
// DO: Scoped override with automatic cleanup
container.withOverrides({ Logger: () => mockLogger }, () => {
  // Override active only in this callback
});
// Automatically cleaned up
```

### Anti-Feature 2: Async Override Factories

**Why avoid:**

- Complicates `withOverrides()` API (would need to return Promise)
- Rare use case - mocks are typically sync
- Can use `resolveAsync()` if needed

**What to do instead:**

- Keep override factories sync
- If async setup needed, do it before withOverrides:

```typescript
const mockDb = await createMockDatabase();
container.withOverrides({ Database: () => mockDb }, () => {
  // Use pre-created async mock
});
```

### Anti-Feature 3: Override by Instance

**Why avoid:**

- Can't control instance lifecycle
- Disposal issues (who owns the instance?)
- Factory pattern ensures fresh instances

**Bad pattern:**

```typescript
// DON'T: Pass instance directly
container.withOverrides({ Logger: mockLoggerInstance }, fn);
// Problem: mockLoggerInstance might be mutated between tests
```

**Good pattern (current):**

```typescript
// DO: Factory returns fresh instance
container.withOverrides({ Logger: () => createMockLogger() }, fn);
// Each override context gets fresh instance
```

### Anti-Feature 4: Mutable Hook Lists

**Why avoid:**

- Hard to reason about hook execution order
- Race conditions if hooks modified during resolution
- Memory leaks if unsubscribe forgotten

**Current implementation is correct:**

```typescript
// packages/runtime/src/container/factory.ts:398-407
installHooks(hooks: ResolutionHooks): () => void {
  hooksHolder.hookSources.push(hooks);
  return () => {  // Returns unsubscribe function
    const idx = hooksHolder.hookSources.indexOf(hooks);
    if (idx !== -1) {
      hooksHolder.hookSources.splice(idx, 1);
    }
  };
}
```

### Anti-Feature 5: Multiple Options Signatures

**Why avoid:**

- `createContainer(graph, naming, hooks)` is confusing
- Easy to pass arguments in wrong order
- Hard to extend (adding new option means new parameter?)

**Current (problematic):**

```typescript
createContainer(graph, { name: "App" }, { hooks });
// Which object gets devtools? hooks? name?
```

**Proposed (cleaner):**

```typescript
createContainer(graph, { name: "App", hooks, devtools });
// All options in one place
```

### Anti-Feature 6: Custom Error Formatting

**Why avoid:**

- Breaks JSON logging (structured loggers expect Error.message to be plain)
- Breaks error tracking services (Sentry, Datadog)
- Multi-line messages work fine in console

**What to do instead:**

- Keep structured properties (`error.code`, `error.portName`, etc.)
- Enhance `error.message` with multi-line text
- Add optional `error.suggestion` property for programmatic access

---

## Feature Dependencies

```
Type-Safe Override API
  |
  +-- Already has type infrastructure (ExtractPortNames, InferServiceByName)
  |
  +-- Independent of other features

Error Message Enhancements
  |
  +-- Independent of other features
  |
  +-- Can enhance incrementally per error type

Plugin Testing Patterns
  |
  +-- Depends on: existing hook system (already implemented)
  |
  +-- Documentation + test utilities in @hex-di/testing

Merged Container Options
  |
  +-- Independent of other features
  |
  +-- Breaking change (needs migration path)
```

**Critical path:** None - all features are independent.

**Parallel workstreams:**

1. Type-safe override API
2. Error message enhancements (can do per-error-class)
3. Plugin testing patterns
4. Merged container options

---

## MVP Recommendation

For this milestone, prioritize:

1. **Merged container options** (LOW complexity, immediate ergonomic win)
2. **Type-safe override API** (MEDIUM complexity, high value for testing DX)
3. **Error message enhancements** (LOW-MEDIUM complexity, incremental per error)

Defer to post-milestone:

- **Plugin testing patterns**: Documentation task, not code change
- **Hook composition documentation**: Already implemented correctly

**Rationale:**

- Merged options is trivial and improves API immediately
- Type-safe overrides addresses real pain point (typos in override keys)
- Error enhancements can be incremental (enhance one error at a time)
- Plugin testing is documentation, not blocking code changes

---

## Existing HexDI Features (Context)

Already built:

- `withOverrides()` with callback pattern and isolated memoization
- Error hierarchy with codes (ContainerError base, 7 error subclasses)
- Resolution hooks system (beforeResolve, afterResolve)
- Hook installation API (installHooks returns unsubscribe)
- Container options split into naming + hooks

What's new in this milestone:

- Type-safe override API (restrict keys to port names)
- Enhanced error messages with suggestions
- Plugin testing utilities/documentation
- Merged container options interface

---

## Research Confidence

| Feature                 | Confidence | Sources                                                   |
| ----------------------- | ---------- | --------------------------------------------------------- |
| Override API patterns   | HIGH       | Existing codebase, InversifyJS/TSyringe comparison        |
| Error message patterns  | HIGH       | Rust/TypeScript error conventions, existing HexDI errors  |
| Plugin testing patterns | MEDIUM     | Express/React testing conventions (not DI-specific)       |
| Options ergonomics      | HIGH       | JavaScript API conventions, existing split implementation |

**Low confidence areas:**

- Plugin testing patterns: No DI-specific prior art, adapting from middleware testing

**Verification needed:**

- None - all features align with existing codebase patterns

---

## Competitive Analysis

| Feature                 | HexDI   | InversifyJS           | TSyringe | typed-inject      | .NET DI |
| ----------------------- | ------- | --------------------- | -------- | ----------------- | ------- |
| Type-safe overrides     | Planned | No                    | No       | Yes (token-based) | No      |
| Actionable errors       | Planned | No                    | No       | No                | No      |
| Scoped override context | Yes     | No (rebind is global) | No       | Yes               | Yes     |
| Hook system             | Yes     | Yes (activation)      | No       | No                | No      |
| Single options object   | Planned | Yes                   | N/A      | Yes               | Yes     |

**Key differentiators after improvements:**

- Compile-time override validation (unique)
- Error messages with fix suggestions (unique)
- Scoped override isolation (shared with typed-inject, .NET)

---

## Sources

**Authoritative (HIGH confidence):**

- HexDI codebase: `packages/runtime/src` (override-context.ts, errors/index.ts, hooks.ts)
- TypeScript Handbook: Mapped types, conditional types
- Existing test files: `packages/runtime/tests/override.test.ts`, `errors.test.ts`

**Community sources (MEDIUM confidence):**

- InversifyJS documentation: rebind() semantics
- TSyringe README: Registration patterns
- typed-inject README: provideValue() pattern

**Not verified (LOW confidence):**

- None - all findings are based on authoritative sources or existing code

---

## Open Questions

1. **Should enhanced error messages be opt-in?**
   - Concern: Multi-line messages may break some logging setups
   - Recommendation: Always include suggestion in message; add `suggestion` property for programmatic access

2. **Should override type validation be strict or permissive?**
   - Strict: Only exact port names allowed (catches typos)
   - Permissive: Allow any string, validate at runtime (current behavior)
   - Recommendation: Strict by default - the whole point is type safety

3. **Migration path for merged options?**
   - Option A: Breaking change (v5.0)
   - Option B: Deprecation warning in v4.x, remove in v5.0
   - Recommendation: Option B - add overload signature, warn on old usage

---

_Research completed: 2026-02-03_
