# Coding Conventions

**Analysis Date:** 2026-02-01

## Naming Patterns

**Files:**

- `kebab-case.ts` for regular modules: `factory.ts`, `types.ts`, `guards.ts`, `constants.ts`
- `kebab-case.test.ts` for test files: `immutability.test.ts`, `factory-deps.test.ts`
- `kebab-case.test-d.ts` for type-level tests: `graph-builder.test-d.ts`
- Directories follow `kebab-case`: `collectors/`, `inspection/`, `adapters/`, `errors/`

**Functions:**

- `camelCase` for all functions: `createPort()`, `createAdapter()`, `createAsyncAdapter()`, `lazyPort()`
- `camelCase` for type guards: `isPortLike()`, `isLazyPort()`, `isAdapter()`
- Prefix internal functions with underscore when exported for testing: `__emptyDepGraphBrand`, `__emptyLifetimeMapBrand`
- Internal helper functions without export can be private

**Variables:**

- `camelCase` for all variables: `VALID_LIFETIMES`, `config`, `adapter`, `graph`
- `UPPER_SNAKE_CASE` for constants: `SINGLETON`, `SCOPED`, `TRANSIENT`, `SYNC`, `ASYNC`, `EMPTY_REQUIRES`
- `_prefixed` for intentionally unused parameters: `_filter`, `_callback`, `_constructorOpt`

**Types:**

- `PascalCase` for all type names: `Port`, `Adapter`, `TraceCollector`, `TraceEntry`, `GraphBuilder`
- `PascalCase` for interfaces: `Logger`, `Database`, `UserService`, `TraceSubscriber`
- `PascalCase` for enum-like constant unions: `Lifetime` ("singleton" | "scoped" | "transient")
- Generic type parameters use single letters or descriptive PascalCase: `<T>`, `<TPort>`, `<TName>`, `<TProvides>`

## Code Style

**Formatting:**

- Prettier is used with strict settings: `semi: true`, `singleQuote: false`, `tabWidth: 2`
- Line length: 100 characters (printWidth: 100)
- Trailing commas: "es5" (include in objects/arrays, not in function parameters)
- Arrow functions: no parentheses around single parameters (`arg => ...` not `(arg) => ...`)
- Bracket spacing: `true` (spaces in object literals: `{ x: 1 }`)

**Linting:**

- ESLint with TypeScript plugin enforces type safety
- Core rule: `@typescript-eslint/no-explicit-any`: "error" — never use `any`
- Type safety: `@typescript-eslint/no-unsafe-*` warnings guide proper typing
- Code quality: `prefer-const` enforced, unused variables flagged with `_` prefix allowed
- Promise safety: `@typescript-eslint/no-floating-promises` and `@typescript-eslint/no-misused-promises` required
- Console usage: only `console.warn()` and `console.error()` allowed in production code

## Import Organization

**Order:**

1. External library imports (e.g., `import type { defineConfig } from "vitest/config"`)
2. Internal type imports (e.g., `import type { Port } from "../ports/types.js"`)
3. Internal value imports (e.g., `import { createAdapter } from "./factory.js"`)
4. Imports use explicit file extensions: `.js` not omitted

**Path Aliases:**

- No path aliases used; relative imports preferred
- Relative paths from current file: `import { X } from "./sibling.js"`
- Parent directory imports: `import { X } from "../parent/module.js"`
- Adjacent directory imports: `import type { X } from "../sibling-dir/module.js"`

**Type vs Value:**

- Always use `import type` for type-only imports to support isolatedModules
- Value and type imports can be combined in single statement when both are needed

## Error Handling

**Patterns:**

- Custom error classes extend `ContainerError` base class: `CircularDependencyError`, `FactoryError`, `DisposedScopeError`
- Errors include stable string code: `code` property with `ErrorCode` or `GraphErrorCode`
- Errors distinguish between programming errors (`isProgrammingError: true`) and runtime conditions (`isProgrammingError: false`)
- Error messages include error codes: `"ERROR[HEX010]: Invalid adapter config"` or `"WARNING[HEX007]: Type-level depth limit exceeded"`
- Error parsing utility: `parseError()` and `isHexError()` for runtime error handling
- Type guards for error detection: `hasMessageProperty()` for error-like objects

**Assertion Pattern:**

- Use `assertValidAdapterConfig()` pattern for configuration validation at runtime
- Throw `TypeError` with descriptive messages during validation
- Validate all user inputs before processing

## Logging

**Framework:** `console` methods only (no external logging library)

**Patterns:**

- Only `console.warn()` and `console.error()` allowed in production code
- No `console.log()` in production
- Test files can use all console methods
- Logging typically wraps resolution tracing data, not general debug output

## Comments

**When to Comment:**

- JSDoc blocks required for all public APIs and complex functions
- Inline comments for non-obvious logic or design decisions
- Section dividers using `// =============================================================================` pattern
- Avoid comments that restate code; explain the "why"

**JSDoc/TSDoc:**

- Every exported function includes JSDoc with `@param`, `@returns`, `@remarks`, `@example`, `@throws`
- Type definitions include descriptive JSDoc blocks
- Example usage included in JSDoc for complex APIs
- Markdown formatting in descriptions for readability

**Example Pattern:**

````typescript
/**
 * Creates a typed adapter for dependency injection.
 *
 * Adapters bridge ports (interfaces) and concrete implementations,
 * specifying dependencies and lifetime management.
 *
 * @param config - Adapter configuration
 * @param config.provides - The port this adapter provides
 * @param config.requires - Array of required dependency ports
 * @param config.factory - Function that creates the service instance
 * @param config.lifetime - Service lifetime ("singleton", "scoped", "transient")
 * @returns A frozen adapter object
 * @throws {TypeError} If configuration is invalid
 *
 * @example
 * ```typescript
 * const adapter = createAdapter({
 *   provides: LoggerPort,
 *   requires: [],
 *   lifetime: "singleton",
 *   factory: () => ({ log: (msg) => console.log(msg) }),
 * });
 * ```
 */
export function createAdapter<...>(...): Adapter<...> {
  // implementation
}
````

## Function Design

**Size:**

- Prefer smaller, focused functions
- Functions with complex logic documented with section comments
- Factory functions can be longer (200+ lines for complex type inference)
- Helper functions extracted for repeated patterns

**Parameters:**

- Prefer single object parameter over multiple parameters
- Use destructuring in parameters: `{ provides, requires, lifetime, factory }`
- Type the entire parameter object for validation
- No optional parameters in function overloads; use separate overload signatures

**Return Values:**

- Always include explicit return type annotation in function signature
- Frozen objects returned from factories: `Object.freeze(adapter)`
- Readonly arrays from getter functions: `readonly TraceEntry[]`
- Type inference used extensively in implementations but explicit on public API

## Module Design

**Exports:**

- Barrel files collect related exports: `export { x, y, z } from "./module.js"`
- Type exports separated: `export type { X, Y, Z } from "./types.js"`
- Value and type exports often in separate statements at module top-level
- `@packageDocumentation` JSDoc tags explain module purpose

**Barrel Files:**

- `src/index.ts` is main entry point with organized sections
- Sections separated by clear comment blocks: `// ===== Section Name =====`
- Related exports grouped together (e.g., all Port exports, all Adapter exports)
- Ordered logically, not alphabetically

## Class Design

- Minimal use of classes; most code is functions and type definitions
- Classes used for GraphBuilder and container implementations
- `static` methods for factory functions: `GraphBuilder.create()`
- Instances are typically immutable or have very limited mutation
- Type parameters carried through class definition: `class GraphBuilder<TProvides, TRequires>`

## Generics

- Generic parameters named descriptively: `<TPort>`, `<TProvides>`, `<TRequires>`, `<TName>` not just `<T>`
- Single-letter generics only for single, obvious parameters
- Constraints documented in TSDoc when non-obvious
- Conditional types used for complex type manipulation

---

_Convention analysis: 2026-02-01_
