---
sidebar_position: 5
title: Subjects
---

# AuthSubject

The `AuthSubject` is the identity being evaluated against a policy. It carries the subject's permissions, roles, and attributes.

## `AuthSubject` Interface

```typescript
type AuthSubject = {
  readonly id: string;
  readonly permissions: ReadonlySet<Permission>;
  readonly roles: ReadonlySet<Role>;
  readonly attributes: Readonly<Record<string, unknown>>;
};
```

- **`id`** -- unique identifier for the subject (user ID, service account ID, etc.)
- **`permissions`** -- the set of permissions the subject holds
- **`roles`** -- the set of roles assigned to the subject
- **`attributes`** -- arbitrary key-value pairs for attribute-based policies

## `SubjectProviderPort`

A scoped port for resolving the current subject in DI contexts. The subject provider is typically scoped per-request or per-session.

```typescript
import { SubjectProviderPort } from "@hex-di/guard";

// Adapter that resolves the current user from a request context
const RequestSubjectAdapter = createAdapter(SubjectProviderPort, {
  factory: ({ requestContext }) => ({
    getSubject: () => requestContext.currentUser,
  }),
  ports: [RequestContextPort],
});
```

## `createAuthSubject()`

Factory function for creating `AuthSubject` instances.

```typescript
import { createAuthSubject } from "@hex-di/guard";

const subject = createAuthSubject({
  id: "user-1",
  permissions: [ReadUsers, WriteUsers],
  roles: [EditorRole],
  attributes: {
    department: "engineering",
    status: "active",
  },
});
```

The factory converts permission and role arrays to `ReadonlySet` internally.

## `withAttributes()`

Creates a new subject with additional or overridden attributes. Does not mutate the original.

```typescript
import { withAttributes } from "@hex-di/guard";

const enriched = withAttributes(subject, {
  lastLogin: new Date(),
  mfaVerified: true,
});
// enriched has all original attributes plus lastLogin and mfaVerified
```

## `getAttribute()`

Type-safe attribute retrieval.

```typescript
import { getAttribute } from "@hex-di/guard";

const department = getAttribute(subject, "department");
// department: unknown -- use type guards for specific types
```

## `PrecomputedSubject`

For hot paths where permission/role lookups need to be O(1), `PrecomputedSubject` precomputes flattened permission sets from roles at construction time.

```typescript
import { PrecomputedSubject } from "@hex-di/guard";

const precomputed = PrecomputedSubject.from(subject);
// All role permissions are flattened into the permission set
// hasPermission checks are O(1) Set lookups
```

This is an optimization -- the standard `AuthSubject` works for most cases. Use `PrecomputedSubject` when you're evaluating many policies against the same subject (e.g., batch authorization checks).
