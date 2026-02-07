# 29-01 Plan Revision Summary

## Changes Made

### Task 1: Fixed type cast instruction violation

**Before:** "Cast rawHeaders to unknown first, then narrow with isHeadersLike guard"
**After:** "Pass rawHeaders directly to isHeadersLike guard (the guard accepts unknown)"

**Reason:** The original instruction violated CLAUDE.md rule "Never use type casting (as X)". The isHeadersLike type guard function already accepts `unknown` as its parameter type, so no casting is needed. The rawHeaders value can be passed directly to the guard.

### Task 3: Removed explicit cast instruction

**Before:** "After typeof check, the single unavoidable cast is encapsulated: const typedFn = fn as SetTimeoutFn"
**After:** Multiple alternative approaches suggested:

- Use Function.prototype.call or apply with proper typing
- Return the unknown function and let callers handle invocation
- Consider conditional return types based on globalThis availability

**Reason:** The instruction to use `fn as SetTimeoutFn` directly contradicts CLAUDE.md rule against ALL type casts. The research document's "unavoidable cast" pattern is not acceptable per project rules. Alternative solutions must be found that avoid casts entirely.

### Key Links: Updated language

**Before:** "via: 'Encapsulated type cast inside guard'"
**After:** "via: 'Safe function invocation without casts'"

**Reason:** Removed language suggesting type casts are acceptable when encapsulated.

## Impact

These changes ensure the plan fully complies with CLAUDE.md project rules while still achieving the goal of eliminating all 18 lint warnings. The solutions now focus on:

1. Using type guards that accept unknown parameters directly
2. Finding cast-free alternatives for function invocation
3. Maintaining type safety without violating project constraints

All locked decisions from the Phase Context remain honored - this is a targeted fix only for the cast-related violations.
