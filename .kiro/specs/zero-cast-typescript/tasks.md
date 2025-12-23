# Implementation Plan: Zero-Cast TypeScript Refactoring

## Overview

This implementation plan converts the codebase to zero-cast TypeScript by systematically replacing unsafe type casts with proper type definitions, type guards, and helper functions. The work is organized by component area, with testing integrated at each step.

## Tasks

- [x] 1. Create Type Utility Library
  - Create `packages/runtime/src/types/branded-types.ts` with `ContextVariableKey` and other branded types
  - Create `packages/runtime/src/types/type-guards.ts` with `isPort()` and other type guard functions
  - Create `packages/runtime/src/types/helpers.ts` with `getContextVariable()` and context helpers
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 1.1 Write unit tests for type utilities
  - Test `isPort()` with valid and invalid inputs
  - Test `getContextVariable()` with different types
  - Test branded type constraints
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 2. Refactor Hono Integration
  - [x] 2.1 Update `packages/hono/src/middleware.ts` to use type-safe context setters
    - Replace `(context as unknown as { set: ... }).set` with proper typed setter
    - Use new type utilities from step 1
    - _Requirements: 2.1, 2.2_

  - [x] 2.2 Update `packages/hono/src/helpers.ts` to use type guards
    - Replace `context.get(key as unknown as keyof E["Variables"])` with `getContextVariable<T>()`
    - Remove all `as unknown` casts
    - _Requirements: 2.3, 2.4_

- [x] 2.3 Write property test for context type preservation
  - **Property 2: Context Variable Type Preservation**
  - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

- [-] 3. Refactor Runtime Container
  - [ ] 3.1 Update `packages/runtime/src/container/impl.ts` port resolution
    - Create `PortComparator` utility function
    - Replace `port as any` with proper type validation
    - Use `Array.from(this.asyncPorts).sort()` with proper comparator
    - _Requirements: 3.1, 3.2_

- [x] 3.2 Write property test for port resolution type safety
  - **Property 3: Port Resolution Type Safety**
  - **Validates: Requirements 3.1, 3.2**

- [x] 4. Create Mock WebSocket Types
  - Create `packages/devtools-network/tests/mock-websocket.ts` with `MockWebSocket` class
  - Implement proper WebSocket interface
  - Create factory functions for mock creation
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 4.1 Write unit tests for mock WebSocket
  - Test mock WebSocket creation and event handling
  - Test type compatibility with WebSocket interface
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 5. Refactor DevToolsServer Tests
  - [ ] 5.1 Update `packages/devtools-network/tests/server.test.ts` to use typed mocks
    - Replace `(server as any).handleConnection()` with proper method access
    - Replace `{} as any` with proper typed objects
    - Use `MockWebSocket` from step 4
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ] 5.2 Create type-safe request factory
    - Create discriminated union for request methods
    - Implement `createTypedRequest()` function
    - Replace `"unknown.method" as any` with proper method types
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 5.3 Write property test for DevToolsServer type safety
  - **Property 1: Type Safety Invariant** (for network layer)
  - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**

- [ ] 6. Create Timeline and Panel Types
  - Create `packages/devtools/src/types/timeline.ts` with `TimelineGrouping` enum and types
  - Create `packages/devtools/src/types/panel.ts` with `SortOrder` enum and types
  - Create discriminated union types for state updates
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 6.1 Write unit tests for timeline types
  - Test enum values and type constraints
  - Test discriminated union narrowing
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 7. Refactor Devtools State Management
  - [ ] 7.1 Update `packages/devtools/src/network/state-receiver.ts`
    - Replace `timelineUpdate.grouping as any` with proper type
    - Replace `timelineUpdate.sortOrder as any` with proper type
    - Replace `panelUpdate.activeTabId as any` with proper type
    - Use new types from step 6
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ] 7.2 Update `packages/devtools/src/network/action-sync.ts`
    - Replace `action.payload as any` with proper type narrowing
    - Use discriminated unions for action types
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 7.3 Write property test for timeline update type safety
  - **Property 5: Timeline Update Type Safety**
  - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**

- [ ] 8. Create Feature Composition Types
  - Create `packages/react/src/types/feature-composition.ts` with generic constraints
  - Implement `GraphBuilderWithTypes<>` helper
  - Create type-safe feature composition utilities
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 8.1 Write unit tests for feature composition types
  - Test generic type inference
  - Test adapter selection logic
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 9. Refactor React Showcase Feature Composition
  - [ ] 9.1 Update `examples/react-showcase/src/plugins/compose.ts`
    - Replace `let result: any = builder` with proper generic types
    - Remove all `eslint-disable-next-line` comments
    - Use new feature composition types from step 8
    - _Requirements: 6.1, 6.2, 6.3, 7.1_

  - [ ] 9.2 Update `examples/react-showcase/src/features/chat/di/bundle.ts`
    - Replace `messageStoreAdapter as any` with proper type
    - Use conditional types for adapter selection
    - _Requirements: 6.1, 6.2, 6.3_

- [ ] 9.3 Write property test for feature composition type safety
  - **Property 6: Feature Composition Type Preservation**
  - **Validates: Requirements 6.1, 6.2, 6.3**

- [ ] 10. Remove ESLint Disable Comments
  - [ ] 10.1 Update `packages/devtools/src/tui/opentui.d.ts`
    - Fix JSX namespace augmentation without eslint-disable
    - Use proper TypeScript configuration
    - _Requirements: 7.2_

- [ ] 10.2 Write property test for ESLint compliance
  - **Property 7: ESLint Compliance**
  - **Validates: Requirements 7.1, 7.2, 7.3**

- [ ] 11. Checkpoint - Verify All Tests Pass
  - Run full test suite for all modified packages
  - Verify TypeScript compilation with strict mode
  - Verify ESLint passes with no-explicit-any rule
  - Ensure all functionality is preserved

- [ ] 12. Final Verification
  - [ ] 12.1 Search codebase for remaining unsafe casts
    - Verify no `as any` remains
    - Verify no `as unknown` remains
    - Verify no `eslint-disable` comments remain
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [ ] 12.2 Run full test suite
    - All unit tests pass
    - All property tests pass
    - All integration tests pass
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [ ] 12.3 Verify type checking
    - TypeScript strict mode enabled
    - No type errors in any file
    - ESLint passes with all rules enabled
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

## Notes

- All tasks are required for comprehensive type safety
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- All existing functionality must be preserved
- TypeScript strict mode must remain enabled throughout
- ESLint with `@typescript-eslint/no-explicit-any` rule must pass
