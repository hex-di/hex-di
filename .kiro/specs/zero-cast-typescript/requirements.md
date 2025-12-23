# Requirements Document: Zero-Cast TypeScript Refactoring

## Introduction

This feature eliminates all unsafe type casting patterns (`as unknown`, `as any`) and eslint-disable comments from the codebase. The goal is to achieve zero-cast TypeScript with strong, explicit typing throughout the entire project. This improves type safety, maintainability, and developer experience.

## Glossary

- **Type Cast**: An explicit type assertion using the `as` keyword (e.g., `value as string`)
- **Unsafe Cast**: Type casts to `any` or `unknown` that bypass TypeScript's type checking
- **Zero-Cast**: A codebase where all types are inferred or explicitly declared without unsafe casts
- **Strong Typing**: Using specific, concrete types instead of generic `any` or `unknown`
- **Type Guard**: A function or condition that narrows a type to a more specific type
- **Generic Type Parameter**: A type variable that allows functions/classes to work with multiple types while maintaining type safety

## Requirements

### Requirement 1: Eliminate Unsafe Casts in Network Layer

**User Story:** As a developer, I want the devtools network layer to use strong types instead of unsafe casts, so that type errors are caught at compile time.

#### Acceptance Criteria

1. WHEN the DevToolsServer test suite runs THEN all `as any` casts in `packages/devtools-network/tests/server.test.ts` SHALL be replaced with proper type definitions
2. WHEN the DevToolsServer handles connections THEN the connection handler SHALL accept properly typed parameters without casting
3. WHEN creating test requests THEN the request factory SHALL use discriminated unions or proper types instead of `as any` for method types
4. WHEN the server broadcasts data updates THEN the WebSocket client set SHALL be properly typed without casting

### Requirement 2: Eliminate Unsafe Casts in Hono Integration

**User Story:** As a developer, I want the Hono middleware to use strong types for context manipulation, so that context operations are type-safe.

#### Acceptance Criteria

1. WHEN the Hono middleware sets container and scope on context THEN the context setter SHALL be properly typed without `as unknown` casts
2. WHEN retrieving scope from Hono context THEN the retrieval function SHALL use proper type guards instead of `as unknown` casts
3. WHEN retrieving container from Hono context THEN the retrieval function SHALL use proper type guards instead of `as unknown` casts
4. WHEN accessing context variables THEN the key lookup SHALL be type-safe without casting to `keyof E["Variables"]`

### Requirement 3: Eliminate Unsafe Casts in Runtime Container

**User Story:** As a developer, I want the runtime container to resolve ports with strong types, so that port resolution is type-safe.

#### Acceptance Criteria

1. WHEN the container resolves async ports THEN the port resolution loop SHALL use proper typing without `as any` casts
2. WHEN sorting ports for resolution THEN the sorted ports array SHALL maintain type information without casting

### Requirement 4: Eliminate Unsafe Casts in Devtools Tests

**User Story:** As a developer, I want the devtools test suite to use proper mock types, so that test code is type-safe.

#### Acceptance Criteria

1. WHEN creating mock WebSocket objects THEN the mock SHALL be properly typed without `as any` casts
2. WHEN setting mock event handlers THEN the handlers SHALL be properly typed without `null as any` assignments
3. WHEN simulating WebSocket events THEN the event objects SHALL be properly typed without casting

### Requirement 5: Eliminate Unsafe Casts in Devtools State Management

**User Story:** As a developer, I want the devtools state receiver to use strong types for timeline and panel updates, so that state mutations are type-safe.

#### Acceptance Criteria

1. WHEN dispatching timeline grouping updates THEN the grouping payload SHALL be properly typed without `as any` casts
2. WHEN dispatching timeline sort updates THEN the sort order payload SHALL be properly typed without `as any` casts
3. WHEN dispatching active tab updates THEN the tab ID payload SHALL be properly typed without `as any` casts
4. WHEN dispatching action sync updates THEN the action payload SHALL be properly typed without `as any` casts

### Requirement 6: Eliminate Unsafe Casts in React Showcase

**User Story:** As a developer, I want the React showcase bundle composition to use strong types, so that feature composition is type-safe.

#### Acceptance Criteria

1. WHEN composing feature bundles THEN the builder result SHALL be properly typed without `as any` casts
2. WHEN composing plugins THEN the builder result SHALL be properly typed without `as any` casts
3. WHEN selecting adapters based on async configuration THEN the adapter array SHALL be properly typed without casting

### Requirement 7: Eliminate eslint-disable Comments

**User Story:** As a developer, I want the codebase to have no eslint-disable comments, so that all code follows linting rules.

#### Acceptance Criteria

1. WHEN the React showcase compose functions execute THEN they SHALL not require eslint-disable comments
2. WHEN the devtools TUI type definitions are declared THEN they SHALL not require eslint-disable comments for JSX namespace augmentation
3. WHEN linting the codebase THEN no eslint-disable comments SHALL be present in source files

## Implementation Notes

- This refactoring requires careful analysis of each unsafe cast to understand the underlying type mismatch
- Some casts may require introducing new types, type guards, or helper functions
- Test code may need refactoring to use proper mock types or test utilities
- The goal is to maintain all existing functionality while improving type safety
