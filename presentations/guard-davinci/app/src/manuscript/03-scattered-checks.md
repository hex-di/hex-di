# Scattered Permission Checks

40+ locations across the codebase use `useUserStore(state => state.canXxx)` pattern.

**Examples from real components:**

```typescript
// brand-header.tsx
const canDeleteBrand = useUserStore(state => state.canDeleteBrand);
const canSyncPromoMats = useUserStore(state => state.canSyncPromoMats);

// create-item-button.tsx
const canManageMemoryItems = useUserStore(state => state.canManageMemoryItems);

// run-item.tsx
const canViewAllRuns = useUserStore(state => state.canViewAllRuns);

// brand-selector.tsx
const canAddBrand = useUserStore(state => state.canAddBrand);
const allowedBrandIds = useUserStore(state => state.allowedBrandIds);
```

**Key point:** No centralized policy — logic is copy-pasted across components.
