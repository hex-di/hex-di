# Brand Scoping Policy

Replace DaVinci's ad-hoc brand filtering with a declarative policy.

**Before:** `allowedBrandIds === null ? allBrands : allBrands.filter(brand => allowedBrandIds.has(brand.id))`

**After:**

```typescript
const canAccessBrand = withLabel(
  "Brand Access",
  anyOf(
    hasRole("admin"),
    hasAttribute("scope", eq(literal("global"))),
    hasAttribute("allowedBrandIds", contains(brandId))
  )
);
```

Permission matrix: admin → all brands, global → all brands, local → contains check.
