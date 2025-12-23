# Design Document: Zero-Cast TypeScript Refactoring

## Overview

This design eliminates all unsafe type casting (`as unknown`, `as any`) and eslint-disable comments from the codebase. The refactoring maintains all existing functionality while improving type safety through:

1. **Proper type definitions** for test utilities and mocks
2. **Type guards and helper functions** for context manipulation
3. **Discriminated unions** for method types
4. **Generic type parameters** for flexible but type-safe APIs
5. **Proper WebSocket mock types** for testing

## Architecture

### Current Issues and Solutions

#### 1. Network Layer (DevToolsServer Tests)

**Problem**: Multiple `as any` casts in test setup and message handling

**Solution**:

- Create a `TypedInMemoryWebSocket` class that properly implements WebSocket interface
- Define discriminated union for request methods using `Methods` enum
- Create type-safe request/notification factories
- Use proper generic types for event listeners

**Key Changes**:

- `attachToServer()` will use proper method overloading instead of casting
- Request creation will use discriminated unions for method types
- Event listeners will be properly typed with generics

#### 2. Hono Integration (Context Manipulation)

**Problem**: `as unknown` casts when accessing context variables

**Solution**:

- Create a `ContextVariableKey` branded type for type-safe key access
- Implement `getContextVariable<T>()` helper with proper type inference
- Use TypeScript's `keyof` with proper constraint instead of casting
- Create type-safe setter/getter pair

**Key Changes**:

- Replace `context.get(key as unknown as keyof E["Variables"])` with `getContextVariable<T>(context, key)`
- Use branded types to ensure type safety at compile time
- Leverage Hono's type system properly

#### 3. Runtime Container (Port Resolution)

**Problem**: `as any` cast when sorting ports for async resolution

**Solution**:

- Create a `PortComparator` utility function with proper typing
- Use `Array.from()` with proper type inference
- Implement proper type guards for port validation

**Key Changes**:

- Replace `port as any` with proper port type validation
- Use `Array.from(this.asyncPorts).sort()` with proper comparator
- Add type guard function `isPort(value): value is Port<unknown, string>`

#### 4. Devtools Tests (Mock WebSocket)

**Problem**: Multiple `as any` casts for mock WebSocket objects

**Solution**:

- Create a `MockWebSocket` class implementing WebSocket interface
- Define proper event handler types
- Use `Partial<WebSocket>` with proper initialization
- Create factory functions for mock creation

**Key Changes**:

- Replace inline mock objects with `MockWebSocket` class
- Use proper event handler typing
- Implement `WebSocketEventMap` for type-safe event handling

#### 5. Devtools State Management (Timeline/Panel Updates)

**Problem**: `as any` casts for timeline grouping, sort order, and tab IDs

**Solution**:

- Create discriminated union types for timeline grouping values
- Define enum for sort order values
- Create branded type for tab IDs
- Use proper type narrowing in dispatch functions

**Key Changes**:

- Define `TimelineGrouping` enum with proper values
- Define `SortOrder` enum with proper values
- Use discriminated unions in action payloads
- Replace `as any` with proper type assertions

#### 6. React Showcase (Feature Composition)

**Problem**: `as any` casts when composing feature bundles

**Solution**:

- Create generic `GraphBuilder` with proper type parameters
- Implement `composeFeatures()` with proper generic constraints
- Use conditional types for adapter selection
- Create type-safe feature composition helpers

**Key Changes**:

- Replace `let result: any = builder` with proper generic types
- Use `GraphBuilder<TProvides, TAsyncPorts, TPhase>` throughout
- Implement proper type inference for composed graphs
- Create helper functions for adapter selection

#### 7. ESLint Disable Comments

**Problem**: eslint-disable comments bypassing type checking

**Solution**:

- Fix underlying type issues so comments aren't needed
- Use proper TypeScript features instead of disabling rules
- Configure ESLint to enforce no-explicit-any

**Key Changes**:

- Remove all `eslint-disable-next-line @typescript-eslint/no-explicit-any` comments
- Fix the code that required them
- Add ESLint rule to prevent future `any` usage

## Components and Interfaces

### Type Utilities

```typescript
// Branded types for type-safe keys
type ContextVariableKey<T = unknown> = string & {
  readonly __brand: "ContextVariableKey";
  readonly __type: T;
};

// Type guard for ports
function isPort(value: unknown): value is Port<unknown, string> {
  return (
    typeof value === "object" &&
    value !== null &&
    "__portName" in value &&
    typeof (value as any).__portName === "string"
  );
}

// Type-safe context variable access
function getContextVariable<T>(context: Context, key: ContextVariableKey<T>): T | undefined {
  return context.get(key as keyof Context["Variables"]) as T | undefined;
}
```

### Mock WebSocket

```typescript
class MockWebSocket implements WebSocket {
  readyState: number = 1;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  send(data: string | ArrayBufferLike): void {
    /* ... */
  }
  close(): void {
    /* ... */
  }
}
```

### Timeline Types

```typescript
enum TimelineGrouping {
  NONE = "none",
  BY_SERVICE = "by-service",
  BY_LIFETIME = "by-lifetime",
}

enum SortOrder {
  ASCENDING = "ascending",
  DESCENDING = "descending",
}

type TimelineUpdate = {
  grouping?: TimelineGrouping;
  sortOrder?: SortOrder;
  sortDescending?: boolean;
  filterText?: string;
};
```

## Data Models

### Request/Response Types

```typescript
// Discriminated union for methods
type RequestMethod =
  | typeof Methods.REGISTER_APP
  | typeof Methods.LIST_APPS
  | typeof Methods.GET_GRAPH
  | typeof Methods.GET_TRACE;

// Type-safe request creation
function createTypedRequest<M extends RequestMethod>(
  id: number,
  method: M,
  params: ParamsForMethod<M>
): Request<M> {
  return { id, method, params };
}
```

### Feature Bundle Types

```typescript
// Proper generic constraints for feature composition
type FeatureBundle<
  TProvides extends Port<unknown, string> = Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
> = {
  name: string;
  adapters: Adapter<TProvides, any, any, "sync">[];
  asyncAdapters: Adapter<TProvides, any, any, "async">[];
  requires: Port<unknown, string>[];
};
```

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Type Safety Invariant

**For all** TypeScript source files in the codebase, the file SHALL compile without any `as any`, `as unknown`, or `eslint-disable` comments.

**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7**

### Property 2: Context Variable Type Preservation

**For any** context variable key and value pair, storing and retrieving the value through the context API SHALL preserve the type information without requiring unsafe casts.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

### Property 3: Port Resolution Type Safety

**For any** port in the async ports set, resolving the port SHALL return a value of the correct type without requiring unsafe casts.

**Validates: Requirements 3.1, 3.2**

### Property 4: Mock WebSocket Type Compatibility

**For any** mock WebSocket object used in tests, the object SHALL be assignable to the WebSocket type without requiring unsafe casts.

**Validates: Requirements 4.1, 4.2, 4.3**

### Property 5: Timeline Update Type Safety

**For any** timeline update operation, the update payload SHALL be properly typed according to the timeline state schema without requiring unsafe casts.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

### Property 6: Feature Composition Type Preservation

**For any** feature bundle composition operation, the resulting graph builder SHALL maintain proper type information for all composed features without requiring unsafe casts.

**Validates: Requirements 6.1, 6.2, 6.3**

### Property 7: ESLint Compliance

**For all** TypeScript source files in the codebase, the file SHALL pass ESLint checks with the `@typescript-eslint/no-explicit-any` rule enabled.

**Validates: Requirements 7.1, 7.2, 7.3**

## Error Handling

### Type Errors

- **Compile-time errors**: TypeScript will catch type mismatches during compilation
- **Runtime validation**: Type guards will validate assumptions at runtime
- **Error messages**: Clear error messages when type requirements aren't met

### Migration Strategy

1. **Phase 1**: Create new type-safe utilities alongside existing code
2. **Phase 2**: Gradually migrate code to use new utilities
3. **Phase 3**: Remove old unsafe code and verify compilation
4. **Phase 4**: Run full test suite to ensure functionality

## Testing Strategy

### Unit Tests

- Test type guards with valid and invalid inputs
- Test context variable access with different types
- Test mock WebSocket behavior
- Test feature composition with various combinations

### Property-Based Tests

- **Property 1**: Verify no unsafe casts exist in compiled output
- **Property 2**: Verify context operations preserve types
- **Property 3**: Verify port resolution returns correct types
- **Property 4**: Verify mock objects are type-compatible
- **Property 5**: Verify timeline updates are properly typed
- **Property 6**: Verify feature composition maintains types
- **Property 7**: Verify ESLint compliance

### Integration Tests

- Verify DevToolsServer works with typed connections
- Verify Hono middleware works with typed context
- Verify container resolution works with typed ports
- Verify devtools state management works with typed updates
- Verify React showcase works with typed feature composition

### Test Configuration

- Minimum 100 iterations per property test
- TypeScript strict mode enabled
- ESLint with `@typescript-eslint/no-explicit-any` rule
- Full type checking in test files
