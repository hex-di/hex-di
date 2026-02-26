# Bootstrap Guard

Step 1 of the migration: install @hex-di/guard and create two files that replace the `Role` enum and `derivePermissions()` in `stores/user.ts`.

## permissions.ts

Define all permission tokens using `createPermissionGroup`. 5 groups matching DaVinci's `derivePermissions()` logic: brand (read, write, delete, sync), content (read, write, approve, publish), user (read, manage), run (read, readAll), memory (read, write, delete, toggle). 17 tokens total — one per boolean flag in the original code.

## roles.ts

Define 7 roles using `createRole` with the writer→manager inheritance pattern:

- `global_content_writer` — base read + content.write + memory.read
- `global_content_manager` — content.approve, content.publish, user.manage, memory.write/delete/toggle + inherits globalWriter
- `local_content_writer` / `local_content_manager` — same shape as global pair
- `cph_content_writer` / `cph_content_manager` — same shape as global pair
- `admin` — all 17 permissions, no inheritance chain

Permission tokens replace boolean flags like `canAddBrand`, `canApproveGlobalContent`, `canManageMemoryItems`. Roles replace the `MANAGER_ROLES` / `GLOBAL_ROLES` sets with typed inheritance.

## Key point

Guard is a standalone library — zero runtime overhead, no React providers, no Zustand, no context wrappers. Both files export plain frozen objects. 5 groups, 17 tokens, 7 roles.
