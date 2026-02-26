# Centralized Policies

Replace derivePermissions() with a centralized policy file.

**Before:** `canManageUsers: isAdmin || isManager`
**After:** `export const canManageUsers = withLabel("Can Manage Users", anyOf(hasRole("admin"), ...))`
