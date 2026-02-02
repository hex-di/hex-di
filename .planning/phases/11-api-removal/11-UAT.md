---
status: complete
phase: 11-api-removal
source: 11-CONTEXT.md, git commit cc05550
started: 2026-02-02T15:50:00Z
updated: 2026-02-02T15:55:00Z
---

## Current Test

[testing complete]

## Tests

### 1. createAsyncAdapter removed (REM-01)

expected: Importing `createAsyncAdapter` from `@hex-di/core` produces TypeScript error "Module has no exported member"
result: pass
verified: Not in index.ts exports, pnpm typecheck passes

### 2. defineService removed (REM-02)

expected: Importing `defineService` from `@hex-di/core` produces TypeScript error "Module has no exported member"
result: pass
verified: Not in index.ts exports, pnpm typecheck passes

### 3. defineAsyncService removed (REM-03)

expected: Importing `defineAsyncService` from `@hex-di/core` produces TypeScript error "Module has no exported member"
result: pass
verified: Not in index.ts exports, pnpm typecheck passes

### 4. ServiceBuilder removed (REM-04)

expected: Importing `ServiceBuilder` from `@hex-di/core` produces TypeScript error "Module has no exported member"
result: pass
verified: Not in index.ts exports, pnpm typecheck passes

### 5. fromClass removed (REM-05)

expected: Importing `fromClass` from `@hex-di/core` produces TypeScript error "Module has no exported member"
result: pass
verified: Not in index.ts exports, pnpm typecheck passes

### 6. createClassAdapter removed (REM-06)

expected: Importing `createClassAdapter` from `@hex-di/core` produces TypeScript error "Module has no exported member"
result: pass
verified: Not in index.ts exports, pnpm typecheck passes

### 7. createAdapter is the only adapter API

expected: `createAdapter` is exported from `@hex-di/core` and works for creating adapters (async or sync)
result: pass
verified: Exported at index.ts line 88 from ./adapters/unified.js

### 8. All tests pass

expected: Running `pnpm test` in the monorepo passes all tests
result: pass
verified: 1634 tests passed

### 9. TypeScript compilation succeeds

expected: Running `pnpm typecheck` in the monorepo completes with 0 errors
result: pass
verified: 0 errors across all 13 packages

## Summary

total: 9
passed: 9
issues: 0
pending: 0
skipped: 0

## Gaps

[none]
