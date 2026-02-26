# Attribute-Based Access

Key for DaVinci: brand scoping via `hasAttribute("allowedBrandIds", contains("brand-123"))` and scope checks.

```typescript
const isGlobalScope = hasAttribute("scope", eq(literal("global")));
const canAccessBrand = hasAttribute("allowedBrandIds", contains("brand-123"));
const hasMfa = hasAttribute("mfaVerified", eq(literal(true)));
```

Matchers: `eq`, `neq`, `gte`, `lt`, `inArray`, `contains`, `exists`.
