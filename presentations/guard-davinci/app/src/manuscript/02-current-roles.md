# Hardcoded Roles

**Source:** `stores/user.ts`

The DaVinci app defines 7 hardcoded roles as a const object:

```typescript
const Role = {
  ADMIN: "admin",
  GLOBAL_CONTENT_WRITER: "global_content_writer",
  GLOBAL_CONTENT_MANAGER: "global_content_manager",
  LOCAL_CONTENT_WRITER: "local_content_writer",
  LOCAL_CONTENT_MANAGER: "local_content_manager",
  CPH_CONTENT_WRITER: "cph_content_writer",
  CPH_CONTENT_MANAGER: "cph_content_manager",
} as const;
```

The `derivePermissions()` function computes ~12 boolean flags from these roles:

```typescript
function derivePermissions(user) {
  const isAdmin = roles.some(r => r.id === Role.ADMIN);
  const isManager = roles.some(r => MANAGER_ROLES.has(r.id));

  return {
    canManageUsers: isAdmin || isManager,
    canDeleteBrand: isAdmin,
    canSyncPromoMats: isAdmin,
    canManageMemoryItems: isAdmin || isManager,
    canViewAllRuns: isAdmin,
    canViewStatus: isAdmin || isManager,
    canAddBrand: isAdmin,
    canApproveGlobalContent: isAdmin || isManager,
  };
}
```

**Key point:** Every new permission requires modifying this function, rebuilding, and redeploying.
