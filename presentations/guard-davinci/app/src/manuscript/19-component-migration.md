# Component Migration

Before/after for 3 real components:

1. brand-header.tsx: canDeleteBrand → useCan(policies.canDeleteBrand)
2. create-item-button.tsx: canManageMemoryItems → useCan(policies.canManageMemory)
3. routes.config.ts: useUserStore.getState().canManageUsers → guardClient.check(policies.canManageUsers)
