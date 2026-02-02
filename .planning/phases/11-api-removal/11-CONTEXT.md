# Phase 11: API Removal - Context

## Goal

Users have a clean API surface with only `createAdapter()` for adapter creation.

## Requirements

- **REM-01**: Remove `createAsyncAdapter()` function
- **REM-02**: Remove `defineService()` function (all overloads)
- **REM-03**: Remove `defineAsyncService()` function
- **REM-04**: Remove `ServiceBuilder` class
- **REM-05**: Remove `fromClass()` function
- **REM-06**: Remove `createClassAdapter()` function

## Current Exports to Remove

From `packages/core/src/index.ts`:

```typescript
// Line 98 - Remove
export { createAsyncAdapter } from "./adapters/factory.js";

// Line 101 - Remove
export { defineService, defineAsyncService, createClassAdapter } from "./adapters/service.js";

// Line 104 - Remove
export { ServiceBuilder } from "./adapters/builder.js";

// Line 107 - Remove
export { fromClass, ClassAdapterBuilder, ClassServiceBuilder } from "./adapters/from-class.js";
```

## Source Files to Delete

1. `packages/core/src/adapters/factory.js` - contains createAsyncAdapter
2. `packages/core/src/adapters/service.js` - contains defineService, defineAsyncService, createClassAdapter
3. `packages/core/src/adapters/builder.js` - contains ServiceBuilder
4. `packages/core/src/adapters/from-class.js` - contains fromClass, ClassAdapterBuilder, ClassServiceBuilder

## Test Files to Update/Remove

Any tests using the old APIs need to be updated to use `createAdapter()` or removed.

## Dependencies

- Phase 10 complete (unified API with async enforcement ready)

## Success Criteria

1. Attempting to import removed functions produces "not exported" error
2. Package exports only unified `createAdapter()` for adapter creation
3. All tests pass with new API
