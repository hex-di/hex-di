# Field Visibility

Different DaVinci roles see different data. Strategies: intersection, first, union.

```typescript
const fieldPolicies = {
  userName: hasPermission(user.read),
  userRoles: hasPermission(user.manage),
  brandDelete: hasPermission(brand.delete),
  promoSync: hasPermission(brand.sync),
  runHistory: hasPermission(run.readAll),
};

const fields = computeFieldVisibility(fieldPolicies, {
  subject: localWriter,
  strategy: "intersection",
});
```
