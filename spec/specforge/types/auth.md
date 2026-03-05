---
id: TYPE-SF-005
kind: types
title: Authentication Types
status: active
domain: auth
behaviors: []
adrs: []
---

# Authentication Types

- [architecture/c1-system-context.md](../architecture/c1-system-context.md) -- system context for auth in deployment modes
- [types/errors.md](./errors.md) -- `AuthError`

---

## Credentials

```typescript
type AuthCredentials =
  | { readonly kind: "oauth"; readonly provider: "github" | "google"; readonly code: string }
  | { readonly kind: "email"; readonly email: string; readonly password: string }
  | { readonly kind: "api-token"; readonly token: string }
  | { readonly kind: "local"; readonly username: string; readonly password: string };
```

---

## Session

```typescript
interface AuthSession {
  readonly userId: string;
  readonly email?: string;
  readonly orgId?: string;
  readonly orgRole?: "owner" | "admin" | "member" | "viewer";
  readonly token: string;
  readonly expiresAt: string;
}
```

---

## AuthIdentity

Identity object returned after successful authentication. Used by `AuthService.authenticate()` and `AuthService.authorize()` in [types/ports.md](./ports.md).

```typescript
interface AuthIdentity {
  readonly userId: string;
  readonly displayName: string;
  readonly email?: string;
  readonly roles: ReadonlyArray<string>;
  readonly permissions: ReadonlyArray<string>;
  readonly provider: "local" | "github-oauth";
  readonly issuedAt: Date;
  readonly expiresAt?: Date;
}
```

---

## Tokens

```typescript
interface AuthToken {
  readonly token: string;
  readonly expiresAt: string;
  readonly refreshToken?: string;
}

interface ApiToken {
  readonly tokenId: string;
  readonly name: string;
  readonly createdAt: string;
  readonly lastUsedAt?: string;
}
```
