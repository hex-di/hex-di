---
sidebar_position: 1
title: React Integration
---

# React Integration

The `@hex-di/guard-react` package provides React components and hooks for integrating authorization into your UI, with full support for React Suspense.

## Installation

```bash
npm install @hex-di/guard-react
```

## SubjectProvider

The `SubjectProvider` component provides the current `AuthSubject` to all child components via React Context.

```typescript
import { SubjectProvider } from "@hex-di/guard-react";
import { createAuthSubject } from "@hex-di/guard";

function App() {
  const [subject, setSubject] = useState(null);

  useEffect(() => {
    // Fetch current user and create subject
    fetchCurrentUser().then(user => {
      setSubject(createAuthSubject({
        id: user.id,
        roles: user.roles,
        permissions: user.permissions,
        attributes: user.attributes,
      }));
    });
  }, []);

  return (
    <SubjectProvider value={subject}>
      {/* Your app components */}
    </SubjectProvider>
  );
}
```

## Can/Cannot Components

Conditional rendering based on policy evaluation.

### Can Component

Renders children only if the policy grants access.

```typescript
import { Can } from "@hex-di/guard-react";
import { hasPermission } from "@hex-di/guard";

function UserList() {
  return (
    <Can policy={hasPermission(ReadUsers)}>
      <div>
        {/* This only renders if user has ReadUsers permission */}
        <UserTable />
      </div>
    </Can>
  );
}

// With fallback
function AdminPanel() {
  return (
    <Can
      policy={hasRole(AdminRole)}
      fallback={<div>Access denied - admin only</div>}
    >
      <AdminDashboard />
    </Can>
  );
}
```

### Cannot Component

Renders children only if the policy denies access.

```typescript
import { Cannot } from "@hex-di/guard-react";
import { hasAttribute } from "@hex-di/guard";

function TrialBanner() {
  return (
    <Cannot policy={hasAttribute("subscription", "premium")}>
      <div className="banner">
        Upgrade to Premium for more features!
      </div>
    </Cannot>
  );
}
```

## Hooks

All hooks come in two variants: standard (suspends) and deferred (never suspends).

### `useSubject()` / `useSubjectDeferred()`

Access the current subject.

```typescript
import { useSubject, useSubjectDeferred } from "@hex-di/guard-react";

// Suspends while subject is loading
function UserProfile() {
  const subject = useSubject();

  return <div>Welcome, {subject.id}!</div>;
}

// Never suspends - returns null while loading
function UserStatus() {
  const subject = useSubjectDeferred();

  if (!subject) {
    return <div>Loading...</div>;
  }

  return <div>Status: {subject.attributes.status}</div>;
}
```

### `useCan()` / `useCanDeferred()`

Boolean check for policy evaluation.

```typescript
import { useCan, useCanDeferred } from "@hex-di/guard-react";

// Suspends while evaluating
function EditButton() {
  const canEdit = useCan(hasPermission(WriteUsers));

  return (
    <button disabled={!canEdit}>
      Edit
    </button>
  );
}

// Never suspends - returns loading state
function DeleteButton() {
  const { allowed, loading } = useCanDeferred(hasPermission(DeleteUsers));

  return (
    <button disabled={loading || !allowed}>
      {loading ? "..." : "Delete"}
    </button>
  );
}
```

### `usePolicy()` / `usePolicyDeferred()`

Get the full `Decision` object with trace.

```typescript
import { usePolicy, usePolicyDeferred } from "@hex-di/guard-react";

// Suspends while evaluating
function ResourceView({ resourceId }) {
  const decision = usePolicy(
    allOf(
      hasPermission(ReadResource),
      hasResourceAttribute("id", resourceId)
    )
  );

  if (!decision.granted) {
    return <div>Access denied: {decision.reason}</div>;
  }

  // Use decision.visibleFields to filter displayed data
  return <ResourceDetails fields={decision.visibleFields} />;
}

// Never suspends
function ResourceStatus() {
  const { decision, loading } = usePolicyDeferred(hasRole(ViewerRole));

  if (loading) return <Spinner />;
  if (!decision?.granted) return <AccessDenied />;

  return <ResourceContent />;
}
```

### `usePolicies()` / `usePoliciesDeferred()`

Evaluate multiple named policies at once.

```typescript
import { usePolicies, usePoliciesDeferred } from "@hex-di/guard-react";

// Suspends while evaluating
function Dashboard() {
  const decisions = usePolicies({
    canViewUsers: hasPermission(ReadUsers),
    canViewReports: hasPermission(ReadReports),
    canManageSettings: hasRole(AdminRole),
  });

  return (
    <div>
      {decisions.canViewUsers.granted && <UserWidget />}
      {decisions.canViewReports.granted && <ReportsWidget />}
      {decisions.canManageSettings.granted && <SettingsWidget />}
    </div>
  );
}

// Never suspends
function Navigation() {
  const { decisions, loading } = usePoliciesDeferred({
    users: hasPermission(ReadUsers),
    admin: hasRole(AdminRole),
  });

  if (loading) return <NavSkeleton />;

  return (
    <nav>
      {decisions.users?.granted && <Link to="/users">Users</Link>}
      {decisions.admin?.granted && <Link to="/admin">Admin</Link>}
    </nav>
  );
}
```

## `createGuardHooks()` Factory

Create a typed set of hooks for your application's specific permissions and roles.

```typescript
import { createGuardHooks } from "@hex-di/guard-react";
import { createPermission, createRole } from "@hex-di/guard";

// Define your app's permissions
const Permissions = {
  ReadPosts: createPermission("ReadPosts"),
  WritePosts: createPermission("WritePosts"),
  DeletePosts: createPermission("DeletePosts"),
} as const;

// Define your app's roles
const Roles = {
  Reader: createRole("Reader", {
    permissions: [Permissions.ReadPosts],
  }),
  Author: createRole("Author", {
    permissions: [Permissions.WritePosts],
    inherits: [Roles.Reader],
  }),
} as const;

// Create typed hooks
export const {
  useSubject,
  useSubjectDeferred,
  useCan,
  useCanDeferred,
  usePolicy,
  usePolicyDeferred,
  usePolicies,
  usePoliciesDeferred,
} = createGuardHooks<typeof Permissions, typeof Roles>();

// Now use throughout your app with full type safety
function BlogPost() {
  const canEdit = useCan(hasPermission(Permissions.WritePosts));
  // TypeScript knows about your specific permissions!
}
```

## Suspense vs Deferred

### When to use Suspense hooks (standard)

Use the standard hooks when:

- The component shouldn't render until authorization is determined
- You have a Suspense boundary with a loading fallback
- You want React's built-in loading states

```typescript
function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <SubjectProvider value={subject}>
        <AuthorizedContent />
      </SubjectProvider>
    </Suspense>
  );
}

function AuthorizedContent() {
  // This suspends, so LoadingSpinner shows while loading
  const canView = useCan(hasPermission(ViewContent));

  if (!canView) return <AccessDenied />;
  return <Content />;
}
```

### When to use Deferred hooks

Use deferred hooks when:

- You need to show partial UI while authorization loads
- You want custom loading states
- You're not using Suspense boundaries

```typescript
function PartialUI() {
  const { allowed, loading } = useCanDeferred(hasPermission(EditContent));

  return (
    <div>
      <h1>Content Title</h1>
      <p>Content body...</p>
      {loading ? (
        <Skeleton />
      ) : allowed ? (
        <EditButton />
      ) : null}
    </div>
  );
}
```

## Types

### SubjectState

```typescript
type SubjectState = {
  readonly subject: AuthSubject | null;
  readonly loading: boolean;
  readonly error: Error | null;
};
```

### CanResult

```typescript
type CanResult = {
  readonly allowed: boolean;
  readonly loading: boolean;
};
```

### PolicyResult

```typescript
type PolicyResult = {
  readonly decision: Decision | null;
  readonly loading: boolean;
};
```

## Error Handling

### MissingSubjectProviderError

Thrown when hooks are used outside of a `SubjectProvider`.

```typescript
import { MissingSubjectProviderError } from "@hex-di/guard-react";

// This will throw MissingSubjectProviderError
function BadComponent() {
  const subject = useSubject(); // Error! No provider
}

// Wrap with provider to fix
function GoodApp() {
  return (
    <SubjectProvider value={subject}>
      <GoodComponent />
    </SubjectProvider>
  );
}
```

## Complete Example

```typescript
import React, { Suspense, useState, useEffect } from "react";
import {
  SubjectProvider,
  Can,
  Cannot,
  useCan,
  usePolicy,
  usePoliciesDeferred,
} from "@hex-di/guard-react";
import {
  createAuthSubject,
  hasPermission,
  hasRole,
  allOf,
} from "@hex-di/guard";

// Define your permissions and roles
const Permissions = {
  ViewDashboard: createPermission("ViewDashboard"),
  EditSettings: createPermission("EditSettings"),
};

const Roles = {
  User: createRole("User", {
    permissions: [Permissions.ViewDashboard],
  }),
  Admin: createRole("Admin", {
    permissions: [Permissions.EditSettings],
    inherits: [Roles.User],
  }),
};

function App() {
  const [subject, setSubject] = useState(null);

  useEffect(() => {
    // Simulate fetching user data
    fetchUser().then(user => {
      setSubject(createAuthSubject({
        id: user.id,
        roles: user.roles,
        permissions: [],
        attributes: user.attributes,
      }));
    });
  }, []);

  return (
    <SubjectProvider value={subject}>
      <Suspense fallback={<Loading />}>
        <Dashboard />
      </Suspense>
    </SubjectProvider>
  );
}

function Dashboard() {
  const canView = useCan(hasPermission(Permissions.ViewDashboard));

  if (!canView) {
    return <div>You don't have access to the dashboard</div>;
  }

  return (
    <div>
      <h1>Dashboard</h1>

      <Can policy={hasRole(Roles.Admin)}>
        <AdminPanel />
      </Can>

      <Cannot policy={hasRole(Roles.Admin)}>
        <div>Contact an admin for advanced features</div>
      </Cannot>

      <NavigationMenu />
    </div>
  );
}

function NavigationMenu() {
  const { decisions, loading } = usePoliciesDeferred({
    dashboard: hasPermission(Permissions.ViewDashboard),
    settings: hasPermission(Permissions.EditSettings),
  });

  if (loading) {
    return <div>Loading menu...</div>;
  }

  return (
    <nav>
      {decisions.dashboard?.granted && (
        <a href="/dashboard">Dashboard</a>
      )}
      {decisions.settings?.granted && (
        <a href="/settings">Settings</a>
      )}
    </nav>
  );
}
```
