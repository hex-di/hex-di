# Authorization, Visible.

**Before:**

- 40+ scattered useUserStore checks
- No audit trail
- No type safety — plain booleans
- No route guards — URL bypass
- Ad-hoc brand scoping
- No testing infrastructure

**After:**

- Centralized policy registry
- Full audit trail with hash chain
- Branded permission types
- Route-level GuardedRoute
- Declarative brand policies
- Property-based policy testing

```
pnpm add @hex-di/guard
```
