---
phase: 07-type-helpers
plan: 01
title: Add InboundPorts and OutboundPorts filter utilities
status: complete
completed: 2026-02-02
---

# Summary: Phase 07-01 - Type Helpers

## Objective

Add `InboundPorts<Union>` and `OutboundPorts<Union>` type utilities that filter a union of ports to only those with the specified direction.

## What Was Implemented

### Type Filter Utilities

Added two type-level utilities to `packages/core/src/ports/types.ts`:

1. **`InboundPorts<P>`** - Filters a union of ports to only those with 'inbound' direction
2. **`OutboundPorts<P>`** - Filters a union of ports to only those with 'outbound' direction

Both utilities:

- Work at the type level (no runtime cost)
- Preserve full DirectedPort type information (service interface, name, direction)
- Return `never` when no matching ports exist in the union

### Exports

Added exports to `packages/core/src/index.ts`:

- `InboundPorts` type
- `OutboundPorts` type

### Tests

Added 5 type-level tests in `packages/core/tests/directed-ports.test.ts`:

- InboundPorts filters to only inbound ports
- OutboundPorts filters to only outbound ports
- InboundPorts returns never for outbound-only union
- OutboundPorts returns never for inbound-only union
- Preserves full DirectedPort type including service and name

## Files Changed

- `packages/core/src/ports/types.ts` - Added InboundPorts and OutboundPorts type utilities
- `packages/core/src/index.ts` - Added exports
- `packages/core/tests/directed-ports.test.ts` - Added type tests

## Verification

- All 8 UAT tests passed
- 1667 total tests pass
- Build succeeds for @hex-di/core

## Commits

- `feat(07-01): add InboundPorts and OutboundPorts filter utilities`
