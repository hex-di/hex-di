# Child Containers

Child containers extend a parent's ports with additional adapters. Two primary use cases:
lazy-loading feature modules and per-tenant/per-user singleton isolation.

## Lazy loading (code-split boundaries)

```typescript
// createLazyChild — graph loaded on first resolve, not at startup
const featureChild = parent.createLazyChild(
  () => import("./feature/graph.js").then(m => m.featureGraph),
  { name: "FeatureModule" }
);

featureChild.isLoaded; // false — graph not yet loaded
const service = await featureChild.resolve(FeatureServicePort); // triggers load
featureChild.isLoaded; // true

// createChildAsync — graph loaded immediately but asynchronously
const child = await parent.createChildAsync(
  () => import("./feature/graph.js").then(m => m.featureGraph),
  { name: "FeatureModule" }
);
```

## Tenant/user isolation (forked singletons)

```typescript
// createChild — graph loaded synchronously; use buildFragment() for the child graph
const tenantGraph = GraphBuilder.forParent(rootGraph)
  .provide(TenantDatabaseAdapter)
  .buildFragment(); // parent satisfies missing deps

const tenantChild = parent.createChild(tenantGraph, {
  name: `tenant-${tenantId}`,
  inheritanceModes: {
    // Override per-port how singletons are inherited from parent
    DatabasePort: "forked",    // new instance for this child, parent unaffected
    LoggerPort: "shared",      // reuse parent's singleton (default)
  },
});
```

## Inheritance modes

| Mode | Behavior |
|---|---|
| `"shared"` (default) | Use parent's singleton instance |
| `"forked"` | Create new singleton for this child; parent unaffected |
| `"isolated"` | New singleton per child, never shared |

- Child containers are always `"initialized"` — they inherit parent's phase
- Child can resolve all parent ports plus its own new ports
- `buildFragment()` (not `build()`) is required for child graphs — parent satisfies missing deps
