# Five Authorization Gaps

1. **No Route Guards** — `/settings/user-management` accessible to everyone via URL. Only UI hiding.
2. **Client-Side Only** — DevTools can bypass all permission checks. `useUserStore.setState({ canDeleteBrand: true })`
3. **No Audit Trail** — No record of who accessed what. Impossible to answer: "Who deleted Brand X?"
4. **No Type Safety** — Permissions are plain booleans. `canDeleteBrand` and `canManageBrands` are indistinguishable at the type level.
5. **No Brand Scoping Enforcement** — `allowedBrandIds` checked ad-hoc per component. Easy to forget.
