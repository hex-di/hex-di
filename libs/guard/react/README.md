# @hex-di/guard-react

React integration for `@hex-di/guard` -- a `SubjectProvider`, declarative `Can`/`Cannot` components, and a full set of authorization hooks with Suspense support.

## Features

- **SubjectProvider** -- provides the authenticated subject to the component tree via React context
- **Can / Cannot** -- declarative components that render children based on policy evaluation
- **Suspense-aware hooks** -- `useSubject`, `useCan`, `usePolicy`, `usePolicies` suspend while the subject loads
- **Deferred hooks** -- non-suspending variants (`useSubjectDeferred`, `useCanDeferred`, `usePolicyDeferred`, `usePoliciesDeferred`) return loading state
- **Isolated contexts** -- `createGuardHooks()` factory for multi-tenant or multi-scope scenarios with independent contexts

## Installation

```bash
pnpm add @hex-di/guard-react
```

Dependencies: `@hex-di/guard`

Peer dependency: `react >= 18`

## Quick Start

```tsx
import { SubjectProvider, Can, useCan } from "@hex-di/guard-react";
import { hasPermission, createPermission } from "@hex-di/guard";

const WriteDocuments = createPermission("WriteDocuments");

function App({ currentUser }) {
  return (
    <SubjectProvider subject={currentUser}>
      <Suspense fallback={<Loading />}>
        <Dashboard />
      </Suspense>
    </SubjectProvider>
  );
}

function Dashboard() {
  return (
    <Can policy={hasPermission(WriteDocuments)} fallback={<ReadOnlyBanner />}>
      <EditButton />
    </Can>
  );
}
```

## SubjectProvider

Provides the current authenticated subject to all descendant components. The subject is frozen on mount to prevent TOCTOU mutations.

Pass `"loading"` while the subject is being resolved asynchronously -- child hooks will suspend (or report loading state for deferred variants).

```tsx
import { SubjectProvider } from "@hex-di/guard-react";

function App({ user, isLoading }) {
  return (
    <SubjectProvider subject={isLoading ? "loading" : user}>
      <Suspense fallback={<Spinner />}>
        <ProtectedContent />
      </Suspense>
    </SubjectProvider>
  );
}
```

## Components

### Can

Renders children when the subject satisfies the given policy. Suspends while the subject is loading (works with `React.Suspense`). Renders `fallback` (or nothing) when access is denied.

```tsx
import { Can } from "@hex-di/guard-react";
import { hasPermission } from "@hex-di/guard";

<Can policy={hasPermission(WriteDocuments)} fallback={<AccessDenied />}>
  <EditForm />
</Can>;
```

### Cannot

Renders children when the subject does NOT satisfy the given policy. Useful for showing fallback UI for unauthorized users.

```tsx
import { Cannot } from "@hex-di/guard-react";
import { hasPermission } from "@hex-di/guard";

<Cannot policy={hasPermission(AdminAccess)}>
  <ReadOnlyBanner />
</Cannot>;
```

## Hooks

Every hook throws `MissingSubjectProviderError` if used outside a `SubjectProvider`.

### Suspending hooks

These hooks suspend the component while the subject is loading. Wrap them in a `<Suspense>` boundary.

```tsx
import { useSubject, useCan, usePolicy, usePolicies } from "@hex-di/guard-react";

// Get the current subject (suspends while loading)
const subject = useSubject();

// Check a single policy (returns boolean)
const canEdit = useCan(hasPermission(WriteDocuments));

// Get the full Decision object
const decision = usePolicy(hasPermission(WriteDocuments));
// decision.kind === "allow" | "deny"

// Evaluate multiple named policies at once
const decisions = usePolicies({
  canRead: hasPermission(ReadDocuments),
  canWrite: hasPermission(WriteDocuments),
});
// decisions.canRead.kind === "allow"
```

### Deferred hooks

These hooks never suspend. They return loading state instead, making them suitable for non-Suspense architectures.

```tsx
import {
  useSubjectDeferred,
  useCanDeferred,
  usePolicyDeferred,
  usePoliciesDeferred,
} from "@hex-di/guard-react";

// Returns the subject or null while loading
const subject = useSubjectDeferred();

// Returns { allowed: boolean, loading: boolean }
const { allowed, loading } = useCanDeferred(hasPermission(WriteDocuments));

// Returns { decision: Decision | undefined, loading: boolean }
const { decision, loading } = usePolicyDeferred(hasPermission(WriteDocuments));

// Returns Record<string, PolicyResult>
const results = usePoliciesDeferred({
  canRead: hasPermission(ReadDocuments),
  canWrite: hasPermission(WriteDocuments),
});
```

## Isolated Contexts

For multi-tenant or multi-scope applications, `createGuardHooks()` creates an independent React context with its own provider and hook set, preventing cross-context subject leakage.

```tsx
import { createGuardHooks } from "@hex-di/guard-react";

const TenantA = createGuardHooks();
const TenantB = createGuardHooks();

function App() {
  return (
    <>
      <TenantA.SubjectProvider subject={tenantAUser}>
        <TenantADashboard />
      </TenantA.SubjectProvider>
      <TenantB.SubjectProvider subject={tenantBUser}>
        <TenantBDashboard />
      </TenantB.SubjectProvider>
    </>
  );
}

function TenantADashboard() {
  const canEdit = TenantA.useCan(hasPermission(WriteDocs));
  // ...
}
```

## API Reference

### Provider

| Export            | Kind      | Description                                |
| ----------------- | --------- | ------------------------------------------ |
| `SubjectProvider` | component | Provides the subject to the component tree |
| `SubjectContext`  | context   | Raw React context (advanced usage)         |

### Components

| Export   | Kind      | Description                             |
| -------- | --------- | --------------------------------------- |
| `Can`    | component | Renders children when policy is allowed |
| `Cannot` | component | Renders children when policy is denied  |

### Suspending Hooks

| Export                  | Kind | Description                                                            |
| ----------------------- | ---- | ---------------------------------------------------------------------- |
| `useSubject()`          | hook | Returns the current subject; suspends while loading                    |
| `useCan(policy)`        | hook | Returns `true` if subject satisfies the policy; suspends while loading |
| `usePolicy(policy)`     | hook | Returns the `Decision` object; suspends while loading                  |
| `usePolicies(policies)` | hook | Evaluates multiple named policies; suspends while loading              |

### Deferred Hooks

| Export                          | Kind | Description                                                      |
| ------------------------------- | ---- | ---------------------------------------------------------------- |
| `useSubjectDeferred()`          | hook | Returns subject or `null` while loading; never suspends          |
| `useCanDeferred(policy)`        | hook | Returns `CanResult` (`{ allowed, loading }`); never suspends     |
| `usePolicyDeferred(policy)`     | hook | Returns `PolicyResult` (`{ decision, loading }`); never suspends |
| `usePoliciesDeferred(policies)` | hook | Returns `Record<string, PolicyResult>`; never suspends           |

### Factory

| Export               | Kind     | Description                                                 |
| -------------------- | -------- | ----------------------------------------------------------- |
| `createGuardHooks()` | function | Creates an isolated context with its own provider and hooks |

### Types

| Export                 | Kind | Description                                             |
| ---------------------- | ---- | ------------------------------------------------------- |
| `SubjectState`         | type | `TSubject \| "loading"`                                 |
| `CanResult`            | type | `{ allowed: boolean; loading: boolean }`                |
| `PolicyResult`         | type | `{ decision: Decision \| undefined; loading: boolean }` |
| `GuardHooks`           | type | Return type of `createGuardHooks()`                     |
| `SubjectProviderProps` | type | Props for `SubjectProvider`                             |
| `CanProps`             | type | Props for `Can`                                         |
| `CannotProps`          | type | Props for `Cannot`                                      |

### Errors

| Export                        | Kind  | Description                                          |
| ----------------------------- | ----- | ---------------------------------------------------- |
| `MissingSubjectProviderError` | class | Thrown when a hook is used outside `SubjectProvider` |

## Related Packages

| Package                    | Description                                                   |
| -------------------------- | ------------------------------------------------------------- |
| `@hex-di/guard`            | Core guard library: permissions, roles, policies, evaluation  |
| `@hex-di/guard-testing`    | Test utilities: memory adapters, fixtures, conformance suites |
| `@hex-di/guard-validation` | GxP validation protocols (IQ/OQ/PQ) and traceability matrix   |

## License

MIT
