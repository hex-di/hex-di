# Auth Subjects

Map DaVinci's `/user/me` response to a Guard subject with roles, permissions, and attributes.

The `/user/me` payload carries the full `allowedContexts` shape — each entry has `brandId`, `brandLabel`, `country`, and `indications`. The adapter normalizes these into id-only tuples and passes them as `allowedContexts` on the subject attributes, preserving the association between brand, country, and indications.

```json
{
  "id": "user-123",
  "userName": "alice.smith",
  "firstName": "Alice",
  "lastName": "Smith",
  "email": "alice@example.com",
  "roles": [{ "id": "local_content_manager", "label": "Local Content Manager" }],
  "allowedContexts": [
    {
      "brandId": "brand-123",
      "brandLabel": "Dupixent",
      "country": { "id": "FR", "label": "France" },
      "indications": [{ "id": "ind-01", "label": "Atopic Dermatitis" }]
    },
    {
      "brandId": "brand-456",
      "brandLabel": "Aubagio",
      "country": { "id": "FR", "label": "France" },
      "indications": [{ "id": "ind-02", "label": "Multiple Sclerosis" }]
    }
  ]
}
```

```typescript
const subject = createAuthSubject(
  "user-123",
  ["local_content_manager"],
  new Set(["brand:read", "brand:write", "content:read", ...]),
  {
    scope: "local",
    allowedContexts: [
      { brandId: "brand-123", country: "FR", indications: ["ind-01"] },
      { brandId: "brand-456", country: "FR", indications: ["ind-02"] },
    ],
  },
)
```

Subject attributes carry arbitrary metadata — scope, MFA status, and the full `allowedContexts` tuples. Each tuple preserves the association between brand, country, and indications — policies can match on any single dimension or the full combination.
