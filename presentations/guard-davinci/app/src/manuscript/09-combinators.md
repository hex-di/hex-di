# Policy Combinators

DaVinci's compound permissions become composable policy trees.

```typescript
const canManageUsers = withLabel(
  "Can Manage Users",
  anyOf(
    hasRole("admin"),
    hasRole("global_content_manager"),
    hasRole("local_content_manager"),
    hasRole("cph_content_manager")
  )
);
```

Short-circuit evaluation: `anyOf` stops at first `allow`, `allOf` stops at first `deny`.
