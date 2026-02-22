# 11 - React Integration

> **Document Control**
>
> | Property         | Value                                    |
> |------------------|------------------------------------------|
> | Document ID      | GUARD-11                                 |
> | Revision         | 1.0                                      |
> | Effective Date   | 2026-02-13                               |
> | Status           | Effective                                |
> | Author           | HexDI Engineering                        |
> | Reviewer         | GxP Compliance Review                    |
> | Approved By      | Technical Lead, Quality Assurance Manager |
> | Classification   | GxP Functional Specification             |
> | DMS Reference    | Git VCS (GPG-signed tag: guard/v0.2.5)   |
> | Change History   | 1.0 (2026-02-13): Initial controlled release |

_Previous: [10 - Cross-Library Integration](./10-cross-library.md)_

---

## 38. SubjectProvider

A pure React context provider that makes the authorization subject available to descendant components. Following architecture review decision #5, this is NOT a DI scope -- it is a React context provider only. The subject flows through React context, not through the DI container.

### Interface

```typescript
interface SubjectProviderProps {
  /** The current authorization subject, or null if not yet loaded. */
  readonly subject: AuthSubject | null;
  /** React children. */
  readonly children: ReactNode;
}

/**
 * Provides the authorization subject to descendant components.
 *
 * Accepts `subject: AuthSubject | null`:
 * - `AuthSubject`: A loaded, authenticated subject
 * - `null`: Subject not yet loaded (loading state)
 *
 * Does NOT create a DI scope. The subject flows through React context,
 * not through the DI container. This prevents unnecessary scope nesting
 * when used alongside HexDiAutoScopeProvider.
 *
 * Dual-behavior:
 * - **Suspense hooks** (`useCan`, `usePolicy`, `useSubject`): suspend
 *   when subject is null. Consumers wrap with `<Suspense>` for loading UI.
 * - **Deferred hooks** (`useCanDeferred`, `usePolicyDeferred`,
 *   `useSubjectDeferred`): never suspend. Return discriminated unions
 *   with a `status` field for inline loading control.
 *
 * SSR: Must be present in the server render tree. If missing,
 * all hooks throw a MissingSubjectProviderError.
 *
 * SSR with Suspense hooks: requires either (a) a non-null subject
 * passed to SubjectProvider (typical -- subject extracted from request
 * headers before render), or (b) a `<Suspense>` boundary in the
 * server tree. Recommend using deferred hooks for SSR if the subject
 * might be unavailable during server render.
 */
function SubjectProvider(props: SubjectProviderProps): ReactElement;
```

```
RECOMMENDED: SubjectProvider SHOULD validate the structural integrity of a non-null
             subject before storing it in context:
             (a) `id` MUST be a non-empty string.
             (b) `authenticationMethod` MUST be a non-empty string.
             If validation fails, SubjectProvider SHOULD log a warning via
             console.warn (or the application's logging adapter) with the field name
             and violation. The invalid subject SHOULD still be stored (to avoid
             blocking the UI) but the warning enables early detection of integration
             errors. When gxp is true in the guard configuration, consider elevating
             this to a hard rejection (throw MissingSubjectProviderError with a
             descriptive message) to prevent invalid subjects from reaching useCan().
             Reference: EU GMP Annex 11 §6 (accuracy checks on data input).
```

### Suspense Mechanism

When subject is `null`, the `SubjectProvider` stores a pending `Promise` in context. Suspense hooks read this promise and throw it (the React Suspense protocol), causing the nearest `<Suspense>` boundary to render its fallback. When the subject becomes non-null, the promise resolves, React re-renders, and the hooks return clean values:

```typescript
// Internal mechanism sketch (not public API)
const SubjectProvider = ({ subject, children }: SubjectProviderProps) => {
  const promiseRef = useRef<{ promise: Promise<void>; resolve: () => void } | null>(null);

  if (subject !== null && promiseRef.current !== null) {
    promiseRef.current.resolve();
    promiseRef.current = null;
  }

  if (subject === null && promiseRef.current === null) {
    let resolve: () => void;
    const promise = new Promise<void>((r) => { resolve = r; });
    promiseRef.current = { promise, resolve: resolve! };
  }

  const frozenSubject = subject !== null ? Object.freeze(subject) : null;
  const precomputed = useMemo(
    () => frozenSubject !== null ? precompute(frozenSubject) : null,
    [frozenSubject],
  );

  return (
    <SubjectContext.Provider value={{ precomputed, pending: promiseRef.current?.promise ?? null }}>
      {children}
    </SubjectContext.Provider>
  );
};
```

### Subject Revocation (Non-Null to Null Transition)

```
REQUIREMENT: When the subject prop transitions from a non-null AuthSubject to null
             (subject revocation), SubjectProvider MUST immediately suspend all
             downstream hooks (useGuard, usePermission, etc.) via React Suspense.
             No hook invoked after the transition may observe the previous (now-stale)
             subject value. This prevents authorization decisions based on a revoked
             identity.
             Reference: 21 CFR 11.10(d) (limiting system access to authorized
             individuals), EU GMP Annex 11 §12.4 (access lifecycle).
```

```
RECOMMENDED: SubjectProviderProps SHOULD accept an optional onSubjectRevoked callback:
             readonly onSubjectRevoked?: () => void;
             When present, SubjectProvider SHOULD invoke this callback synchronously
             during the non-null → null transition, before suspending hooks. This
             allows consumers to perform cleanup (e.g., clearing cached permissions,
             logging the revocation event) at the moment of revocation.
```

### Usage

```typescript
import { SubjectProvider } from "@hex-di/guard/react";

function App() {
  const [subject, setSubject] = useState<AuthSubject | null>(null);

  useEffect(() => {
    loadCurrentUser().then(user => {
      setSubject({
        id: user.id,
        roles: user.roles,
        permissions: user.permissions,
        attributes: user.attributes,
        authenticationMethod: user.authenticationMethod,
        authenticatedAt: user.authenticatedAt,
      });
    });
  }, []);

  return (
    <SubjectProvider subject={subject}>
      <Suspense fallback={<LoadingSpinner />}>
        <Dashboard />
      </Suspense>
    </SubjectProvider>
  );
}
```

### Null Subject Handling

When `subject` is `null`:

**Suspense hooks** suspend, delegating loading UI to the nearest `<Suspense>` boundary:

```typescript
function Dashboard() {
  // Suspends until subject is available. No undefined checks needed.
  const canEdit = useCan(WritePermission);

  return canEdit ? <EditPanel /> : <ReadOnlyPanel />;
}

// Parent wraps with Suspense for loading UI:
<Suspense fallback={<LoadingSpinner />}>
  <Dashboard />
</Suspense>
```

**Deferred hooks** return discriminated unions for inline loading control:

```typescript
function Dashboard() {
  const result = useCanDeferred(WritePermission);

  switch (result.status) {
    case "pending":
      return <LoadingSpinner />;
    case "allowed":
      return <EditPanel />;
    case "denied":
      return <ReadOnlyPanel />;
  }
}
```

### PrecomputedSubject

The `PrecomputedSubject` type is defined in 06-subject.md (section 16). The canonical definition includes both `roleSet` (for O(1) role membership checks) and `permissionSet` (for O(1) permission lookups). `SubjectProvider` creates the precomputed form using `precomputeSubject()` when the subject changes.

### Subject Immutability Enforcement

When `SubjectProvider` receives a non-null `subject`, it calls `Object.freeze()` on the subject before storing it in context. This prevents accidental mutation of the subject after it enters the authorization pipeline, eliminating TOCTOU (time-of-check-to-time-of-use) vulnerabilities:

```typescript
// Internal behavior (not public API)
const frozenSubject = subject !== null ? Object.freeze(subject) : null;
```

This ensures:

1. **No mutation after check:** Once the subject is used for an authorization decision, its permissions cannot be altered before the decision is enforced.
2. **Referential stability:** Frozen objects maintain stable identity for React memoization.
3. **Fail-fast on mutation attempts:** `Object.freeze()` causes strict mode to throw `TypeError` on mutation, surfacing bugs early.

> **Note:** `createTestSubject()` in `@hex-di/guard-testing` already returns frozen subjects (see section 51). This ensures test subjects match production behavior.

### SSR Requirements

On the server, SubjectProvider must be present in the render tree. The subject should be available synchronously (extracted from request headers/cookies before rendering):

```typescript
// Server-side rendering
function ServerApp({ subject }: { subject: AuthSubject }) {
  return (
    <SubjectProvider subject={subject}>
      <App />
    </SubjectProvider>
  );
}
```

If SubjectProvider is missing from the tree, all hooks (`useCan`, `usePolicy`, `useSubject`, `useCanDeferred`, `usePolicyDeferred`, `useSubjectDeferred`) throw a `MissingSubjectProviderError` -- the same pattern as `usePort()` throwing without `ContainerProvider`.

**SSR with Suspense hooks:** Suspense hooks require either a non-null subject (typical for SSR -- subject is extracted from request headers before render) or a `<Suspense>` boundary in the server tree. If the subject might be unavailable during server render, use deferred hooks instead.

---

## 39. Can and Cannot Components

Conditional rendering components that gate children based on the subject's authorization. Both components **suspend** when the subject is `null`, delegating loading UI to `<Suspense>` boundaries. The `fallback` prop is exclusively for the **denied** case, not for loading.

### Can Component

````typescript
interface CanProps {
  /** Permission to check. */
  readonly permission?: PermissionConstraint;
  /** Complex policy to evaluate (alternative to permission). */
  readonly policy?: PolicyConstraint;
  /** Rendered when authorized. */
  readonly children: ReactNode;
  /** Rendered when denied. Default: null. */
  readonly fallback?: ReactNode;
}

/**
 * Renders children when the subject has the specified permission
 * or when the specified policy evaluates to allow.
 *
 * **Suspends** when the subject is null. Wrap with `<Suspense>`
 * to provide a loading UI. The `fallback` prop is for the denied
 * case only, not for loading.
 *
 * @example Permission check with Suspense
 * ```tsx
 * <Suspense fallback={<Skeleton />}>
 *   <Can permission={UserPerms.write}>
 *     <EditButton />
 *   </Can>
 * </Suspense>
 * ```
 *
 * @example Complex policy
 * ```tsx
 * <Can policy={allOf(hasPermission(UserPerms.write), hasRole("editor"))}>
 *   <EditButton />
 * </Can>
 * ```
 *
 * @example With denied fallback
 * ```tsx
 * <Can permission={UserPerms.delete} fallback={<DisabledButton />}>
 *   <DeleteButton />
 * </Can>
 * ```
 */
function Can(props: CanProps): ReactElement;
````

### Cannot Component

````typescript
interface CannotProps {
  /** Permission to check. */
  readonly permission?: PermissionConstraint;
  /** Complex policy to evaluate (alternative to permission). */
  readonly policy?: PolicyConstraint;
  /** Rendered when unauthorized. */
  readonly children: ReactNode;
  /** Rendered when authorized. Default: null. */
  readonly fallback?: ReactNode;
}

/**
 * Renders children when the subject does NOT have the specified
 * permission or when the specified policy evaluates to deny.
 *
 * The inverse of <Can>. Useful for displaying "contact admin"
 * messages, upgrade prompts, or read-only indicators.
 *
 * **Suspends** when the subject is null. Wrap with `<Suspense>`
 * to provide a loading UI. The `fallback` prop is for the
 * authorized case only, not for loading.
 *
 * @example
 * ```tsx
 * <Suspense fallback={<Skeleton />}>
 *   <Cannot permission={UserPerms.write}>
 *     <span>Contact your administrator for write access</span>
 *   </Cannot>
 * </Suspense>
 * ```
 */
function Cannot(props: CannotProps): ReactElement;
````

### Behavior Matrix

| Subject State | Permission | `<Can>` renders      | `<Cannot>` renders   |
| ------------- | ---------- | -------------------- | -------------------- |
| `null`        | N/A        | **suspends**         | **suspends**         |
| Has perm      | check      | `children`           | `fallback` (or null) |
| Lacks perm    | check      | `fallback` (or null) | `children`           |

### Usage

```typescript
import { Can, Cannot } from "@hex-di/guard/react";
import { Suspense } from "react";

function UserActions({ userId }: { userId: string }) {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <div>
        <Can permission={UserPerms.read}>
          <UserProfile userId={userId} />
        </Can>

        <Can permission={UserPerms.write} fallback={<ReadOnlyBadge />}>
          <EditUserButton userId={userId} />
        </Can>

        <Can permission={UserPerms.delete}>
          <DeleteUserButton userId={userId} />
        </Can>

        <Cannot permission={UserPerms.write}>
          <p>You do not have permission to edit this user.</p>
        </Cannot>
      </div>
    </Suspense>
  );
}
```

---

## 40. useCan and useCanDeferred Hooks

### useCan (Suspense)

A hook that checks whether the current subject has a specific permission. **Suspends** when the subject is not yet loaded, returning a clean `boolean` with no `undefined` states.

#### Signature

```typescript
/**
 * Checks if the current subject has the specified permission.
 *
 * **Suspends** when SubjectProvider has a null subject. Wrap the
 * consuming component with `<Suspense>` to provide a loading UI.
 *
 * Returns:
 * - `true`: Subject has the permission
 * - `false`: Subject does not have the permission
 *
 * Never returns `undefined`. Loading state is handled by Suspense.
 *
 * Performs an O(1) set lookup against the precomputed permission set.
 * Memoized by permission reference + subject identity.
 *
 * @param permission - The permission to check
 * @returns boolean
 *
 * @throws MissingSubjectProviderError if called outside SubjectProvider tree
 */
function useCan(permission: PermissionConstraint): boolean;
```

#### Usage

```typescript
import { useCan } from "@hex-di/guard/react";

function EditButton() {
  // Suspends until subject is loaded. No undefined checks needed.
  const canEdit = useCan(UserPerms.write);

  return (
    <button disabled={!canEdit}>
      {canEdit ? "Edit" : "No Access"}
    </button>
  );
}

// Parent provides Suspense boundary:
<Suspense fallback={<Skeleton />}>
  <EditButton />
</Suspense>
```

#### Implementation Sketch

```typescript
// Internal implementation sketch (not public API)
function useCan(permission: PermissionConstraint): boolean {
  const { precomputed, pending } = useContext(SubjectContext);

  if (precomputed === null) {
    // Throw the pending promise to trigger Suspense
    throw pending;
  }

  return useMemo(
    () => precomputed.permissionSet.has(`${permission.resource}:${permission.action}`),
    [precomputed, permission]
  );
}
```

### useCanDeferred (Non-Suspense)

An escape-hatch hook that checks permission without suspending. Returns a discriminated union for inline loading control.

#### CanResult Type

```typescript
/**
 * Discriminated union for deferred permission check results.
 *
 * - `pending`: Subject not yet loaded
 * - `allowed`: Subject has the permission
 * - `denied`: Subject does not have the permission
 */
type CanResult =
  | { readonly status: "pending" }
  | { readonly status: "allowed" }
  | { readonly status: "denied"; readonly reason: string };
```

#### Signature

```typescript
/**
 * Checks if the current subject has the specified permission
 * without suspending.
 *
 * Returns a discriminated union with a `status` field:
 * - `{ status: "pending" }`: Subject not yet loaded
 * - `{ status: "allowed" }`: Subject has the permission
 * - `{ status: "denied", reason: string }`: Subject lacks the permission
 *
 * Use this hook when you need inline loading control instead of
 * Suspense boundaries. Prefer `useCan` (Suspense) for most cases.
 *
 * @param permission - The permission to check
 * @returns CanResult
 *
 * @throws MissingSubjectProviderError if called outside SubjectProvider tree
 */
function useCanDeferred(permission: PermissionConstraint): CanResult;
```

#### Usage

```typescript
import { useCanDeferred } from "@hex-di/guard/react";

function EditButton() {
  const result = useCanDeferred(UserPerms.write);

  switch (result.status) {
    case "pending":
      return <Skeleton />;
    case "allowed":
      return <button>Edit</button>;
    case "denied":
      return <button disabled>No Access</button>;
  }
}
```

#### Implementation Sketch

```typescript
// Internal implementation sketch (not public API)
function useCanDeferred(permission: PermissionConstraint): CanResult {
  const { precomputed } = useContext(SubjectContext);

  if (precomputed === null) {
    return { status: "pending" };
  }

  return useMemo(() => {
    const has = precomputed.permissionSet.has(`${permission.resource}:${permission.action}`);
    return has
      ? { status: "allowed" }
      : {
          status: "denied",
          reason: `Subject lacks permission ${permission.resource}:${permission.action}`,
        };
  }, [precomputed, permission]);
}
```

### Memoization

Both `useCan` and `useCanDeferred` are memoized by permission reference and subject identity. Since:

- Policies are frozen objects (referentially stable)
- The subject changes only when SubjectProvider receives a new `subject` prop

The hooks recalculate only when the subject changes. Within a render cycle with the same subject, multiple calls with the same permission reference return the same value without re-evaluation.

---

## 41. usePolicy and usePolicyDeferred Hooks

### usePolicy (Suspense)

A hook that evaluates a full policy against the current subject and returns the complete Decision object. **Suspends** when the subject is not yet loaded.

#### Signature

```typescript
/**
 * Evaluates a policy against the current subject.
 *
 * **Suspends** when SubjectProvider has a null subject. Wrap the
 * consuming component with `<Suspense>` to provide a loading UI.
 *
 * Returns the full Decision object for complex policies that need
 * more than a simple boolean. Useful for:
 * - Displaying denial reasons to the user
 * - Logging decision traces
 * - Conditional rendering based on specific denial paths
 *
 * Never returns `undefined`. Loading state is handled by Suspense.
 *
 * Memoized by [policy, resource, subject] -- frozen policies are referentially
 * stable, subjects change infrequently, and resource is compared by reference.
 *
 * @param policy   - The policy to evaluate
 * @param options  - Optional resource passed to EvaluationContext
 * @returns Decision
 *
 * @throws MissingSubjectProviderError if called outside SubjectProvider tree
 */
function usePolicy(
  policy: PolicyConstraint,
  options?: { readonly resource?: Resource },
): Decision;
```

#### Usage

```typescript
import { usePolicy } from "@hex-di/guard/react";

function AdminPanel() {
  const adminPolicy = allOf(
    hasPermission(AdminPerms.access),
    hasRole("admin"),
  );

  // Suspends until subject is loaded. No undefined checks needed.
  const decision = usePolicy(adminPolicy);

  if (decision.kind === "deny") {
    return (
      <AccessDeniedPage
        reason={decision.reason}
        trace={decision.trace}
      />
    );
  }

  return <AdminDashboard />;
}

// Parent provides Suspense boundary:
<Suspense fallback={<LoadingSpinner />}>
  <AdminPanel />
</Suspense>
```

### usePolicyDeferred (Non-Suspense)

An escape-hatch hook that evaluates a policy without suspending. Returns a discriminated union with the full `Decision` object.

#### PolicyResult Type

```typescript
/**
 * Discriminated union for deferred policy evaluation results.
 *
 * - `pending`: Subject not yet loaded
 * - `resolved`: Policy evaluated, carries the full Decision object
 *
 * The Decision object contains `kind`, `reason`, `trace`,
 * `evaluationId`, `evaluatedAt`, and `subjectId`.
 */
type PolicyResult =
  | { readonly status: "pending" }
  | { readonly status: "resolved"; readonly decision: Decision };
```

#### Signature

```typescript
/**
 * Evaluates a policy against the current subject without suspending.
 *
 * Returns a discriminated union with a `status` field:
 * - `{ status: "pending" }`: Subject not yet loaded
 * - `{ status: "resolved", decision: Decision }`: Policy evaluated
 *
 * The `decision` field carries the full Decision object (kind, reason,
 * trace, evaluationId, evaluatedAt, subjectId) to avoid field
 * duplication on the result type.
 *
 * Use this hook when you need inline loading control instead of
 * Suspense boundaries. Prefer `usePolicy` (Suspense) for most cases.
 *
 * @param policy   - The policy to evaluate
 * @param options  - Optional resource passed to EvaluationContext
 * @returns PolicyResult
 *
 * @throws MissingSubjectProviderError if called outside SubjectProvider tree
 */
function usePolicyDeferred(
  policy: PolicyConstraint,
  options?: { readonly resource?: Resource },
): PolicyResult;
```

#### Usage

```typescript
import { usePolicyDeferred } from "@hex-di/guard/react";

function AdminPanel() {
  const adminPolicy = allOf(
    hasPermission(AdminPerms.access),
    hasRole("admin"),
  );

  const result = usePolicyDeferred(adminPolicy);

  if (result.status === "pending") {
    return <LoadingSpinner />;
  }

  if (result.decision.kind === "deny") {
    return (
      <AccessDeniedPage
        reason={result.decision.reason}
        trace={result.decision.trace}
      />
    );
  }

  return <AdminDashboard />;
}
```

#### Implementation Sketch

```typescript
// Internal implementation sketch (not public API)
function usePolicyDeferred(policy: PolicyConstraint): PolicyResult {
  const { precomputed } = useContext(SubjectContext);

  if (precomputed === null) {
    return { status: "pending" };
  }

  return useMemo(
    () => ({ status: "resolved", decision: evaluate(policy, { subject: precomputed }) }),
    [policy, precomputed]
  );
}
```

### Memoization

Both `usePolicy` and `usePolicyDeferred` wrap evaluation in `useMemo` keyed by `[policy, subject]`. Since policies are frozen (stable reference) and subjects change infrequently (once per login/scope), this memoizes effectively.

---

## 42. useSubject and useSubjectDeferred Hooks

### useSubject (Suspense)

A hook that returns the current authorization subject from context. **Suspends** when the subject is not yet loaded.

#### Signature

```typescript
/**
 * Returns the current authorization subject from SubjectProvider context.
 *
 * **Suspends** when SubjectProvider has a null subject. Wrap the
 * consuming component with `<Suspense>` to provide a loading UI.
 *
 * Never returns `null`. Loading state is handled by Suspense.
 *
 * @returns AuthSubject
 *
 * @throws MissingSubjectProviderError if called outside SubjectProvider tree
 */
function useSubject(): AuthSubject;
```

#### Usage

```typescript
import { useSubject } from "@hex-di/guard/react";

function UserGreeting() {
  // Suspends until subject is loaded. No null checks needed.
  const subject = useSubject();

  return <span>Welcome, {subject.id}</span>;
}

// Parent provides Suspense boundary:
<Suspense fallback={<span>Loading...</span>}>
  <UserGreeting />
</Suspense>
```

### useSubjectDeferred (Non-Suspense)

An escape-hatch hook that returns the subject without suspending. Returns `AuthSubject | null` for inline loading control.

#### Signature

```typescript
/**
 * Returns the current authorization subject from SubjectProvider
 * context without suspending.
 *
 * Returns `null` if SubjectProvider has not yet received a subject
 * (loading state).
 *
 * Use this hook when you need inline loading control instead of
 * Suspense boundaries. Prefer `useSubject` (Suspense) for most cases.
 *
 * @returns AuthSubject | null
 *
 * @throws MissingSubjectProviderError if called outside SubjectProvider tree
 */
function useSubjectDeferred(): AuthSubject | null;
```

#### Usage

```typescript
import { useSubjectDeferred } from "@hex-di/guard/react";

function UserGreeting() {
  const subject = useSubjectDeferred();

  if (subject === null) {
    return <span>Loading...</span>;
  }

  return <span>Welcome, {subject.id}</span>;
}
```

### Direct Subject Access

`useSubject` and `useSubjectDeferred` provide direct access to the raw subject for cases where the higher-level hooks (`useCan`, `usePolicy`) are insufficient:

```typescript
function UserDebugPanel() {
  // Suspends until subject is loaded
  const subject = useSubject();

  return (
    <pre>
      {JSON.stringify({
        id: subject.id,
        roles: subject.roles,
        permissions: [...subject.permissions],
        attributes: subject.attributes,
      }, null, 2)}
    </pre>
  );
}
```

---

## createGuardHooks Factory

Following the `createTypedHooks()` factory pattern from `integrations/react/src/factories/create-typed-hooks.tsx`, `createGuardHooks()` creates an isolated set of guard hooks and components bound to a specific type parameter. This enables applications with multiple guard contexts (e.g., main app + embedded widget with different subjects).

### Signature

```typescript
/**
 * Creates an isolated set of guard hooks and components.
 *
 * Each call creates a new React context, so multiple instances
 * are independent. This follows the same factory pattern as
 * createTypedHooks() in @hex-di/react.
 *
 * @returns An object containing SubjectProvider, Can, Cannot,
 *          useCan, usePolicy, useSubject, useCanDeferred,
 *          usePolicyDeferred, and useSubjectDeferred -- all bound
 *          to the same internal React context.
 */
function createGuardHooks(): GuardHooks;

interface GuardHooks {
  readonly SubjectProvider: ComponentType<SubjectProviderProps>;
  readonly Can: ComponentType<CanProps>;
  readonly Cannot: ComponentType<CannotProps>;
  readonly useCan: (permission: PermissionConstraint) => boolean;
  readonly usePolicy: (
    policy: PolicyConstraint,
    options?: { readonly resource?: Resource }
  ) => Decision;
  readonly useSubject: () => AuthSubject;
  readonly useCanDeferred: (permission: PermissionConstraint) => CanResult;
  readonly usePolicyDeferred: (
    policy: PolicyConstraint,
    options?: { readonly resource?: Resource }
  ) => PolicyResult;
  readonly useSubjectDeferred: () => AuthSubject | null;
  readonly usePolicies: <M extends PoliciesMap>(
    policies: M,
    options?: { readonly enricher?: SubjectEnricher; readonly resource?: Resource }
  ) => PoliciesDecisions<M>;
  readonly usePoliciesDeferred: <M extends PoliciesMap>(
    policies: M,
    options?: { readonly enricher?: SubjectEnricher; readonly resource?: Resource }
  ) => PoliciesResult<M>;
}
```

### Usage

```typescript
import { createGuardHooks } from "@hex-di/guard/react";

// Create an isolated guard context for the main app
const {
  SubjectProvider,
  Can,
  Cannot,
  useCan,
  usePolicy,
  useSubject,
  useCanDeferred,
  usePolicyDeferred,
  useSubjectDeferred,
} = createGuardHooks();

// Use in the app
function App() {
  return (
    <SubjectProvider subject={currentUser}>
      <Suspense fallback={<LoadingSpinner />}>
        <Dashboard />
      </Suspense>
    </SubjectProvider>
  );
}

// Create a separate guard context for an embedded widget
const widgetGuard = createGuardHooks();

function EmbeddedWidget({ widgetSubject }: { widgetSubject: AuthSubject }) {
  return (
    <widgetGuard.SubjectProvider subject={widgetSubject}>
      <Suspense fallback={<WidgetSkeleton />}>
        <widgetGuard.Can permission={WidgetPerms.view}>
          <WidgetContent />
        </widgetGuard.Can>
      </Suspense>
    </widgetGuard.SubjectProvider>
  );
}
```

### Default Export

The package exports both the factory and a default set of hooks for convenience:

```typescript
// @hex-di/guard/react exports:

// Factory (for creating isolated contexts)
export { createGuardHooks } from "./factories/create-guard-hooks.js";

// Types
export type { CanResult, PolicyResult } from "./types.js";

// Default hooks (created from a single shared context)
const defaultHooks = createGuardHooks();
export const SubjectProvider = defaultHooks.SubjectProvider;
export const Can = defaultHooks.Can;
export const Cannot = defaultHooks.Cannot;
export const useCan = defaultHooks.useCan;
export const usePolicy = defaultHooks.usePolicy;
export const useSubject = defaultHooks.useSubject;
export const useCanDeferred = defaultHooks.useCanDeferred;
export const usePolicyDeferred = defaultHooks.usePolicyDeferred;
export const useSubjectDeferred = defaultHooks.useSubjectDeferred;
export const usePolicies = defaultHooks.usePolicies;
export const usePoliciesDeferred = defaultHooks.usePoliciesDeferred;
```

---

## 73. usePolicies and usePoliciesDeferred Hooks

### Supporting Types

```typescript
/**
 * A record mapping named keys to policies.
 * The keys become the keys of the resulting decisions record.
 */
type PoliciesMap = Readonly<Record<string, PolicyConstraint>>;

/**
 * Suspending result type for usePolicies.
 * Never returns pending — the hook suspends instead.
 */
type PoliciesDecisions<M extends PoliciesMap> = {
  readonly [K in keyof M]: Decision;
};

/**
 * Deferred result type for usePoliciesDeferred.
 */
type PoliciesResult<M extends PoliciesMap> =
  | { readonly status: 'pending' }
  | { readonly status: 'ready'; readonly decisions: PoliciesDecisions<M> };

/**
 * Subject enricher function.
 * Called with the resolved subject before all policy evaluations.
 * Returns an augmented subject with additional attributes.
 * Used to inject resource-specific computed context.
 */
type SubjectEnricher = (subject: AuthSubject) => AuthSubject;
```

### usePolicies (Suspense Variant)

```typescript
/**
 * Evaluates a map of policies and returns a typed decisions record.
 *
 * Suspends when the subject is null (delegating loading UI to <Suspense>).
 *
 * The optional enricher is called once with the resolved subject before
 * any policy evaluation. Use withAttributes() inside the enricher to
 * inject computed context such as time-of-day or scope match results.
 *
 * All policies share the same enriched subject and EvaluationContext.
 * evaluate() is called once per policy key, synchronously.
 *
 * @param policies  - Named map of policies to evaluate
 * @param options   - Optional enricher, resource
 * @returns A record mapping each key to its Decision (Allow | Deny)
 *
 * @throws MissingSubjectProviderError if called outside SubjectProvider tree
 */
function usePolicies<M extends PoliciesMap>(
  policies: M,
  options?: {
    readonly enricher?: SubjectEnricher;
    readonly resource?: Resource;
  }
): PoliciesDecisions<M>;
```

### usePoliciesDeferred (Non-Suspense Variant)

```typescript
/**
 * Evaluates a map of policies without suspending.
 * Returns a discriminated union with a `status` field.
 *
 * Use when components must render something during the loading state
 * without a <Suspense> boundary.
 *
 * @param policies  - Named map of policies to evaluate
 * @param options   - Optional enricher, resource
 * @returns PoliciesResult<M>
 *
 * @throws MissingSubjectProviderError if called outside SubjectProvider tree
 */
function usePoliciesDeferred<M extends PoliciesMap>(
  policies: M,
  options?: {
    readonly enricher?: SubjectEnricher;
    readonly resource?: Resource;
  }
): PoliciesResult<M>;
```

### Usage Example

Write actions (create/update) and publish require different role+scope combinations. Two
gates are declared; each policy picks the right one. `createRoleGate` is called twice —
the result is still a plain, fully serializable `AnyOfPolicy`.

#### `auth/policies.ts`

```typescript
import {
  allOf, hasPermission, hasAttribute, someMatch, contains,
  resource, eq, createRoleGate,
} from '@hex-di/guard'
import { ContentPerms } from './permissions'

// Scope matchers — pure DSL expressions, no runtime closures
const inCountry = hasAttribute('scopes', someMatch({
  country: eq(resource('country')),
}))

const inBrand = hasAttribute('scopes', someMatch({
  country: eq(resource('country')),
  brand:   eq(resource('brand')),
}))

const inIndication = hasAttribute('scopes', someMatch({
  country:     eq(resource('country')),
  brand:       eq(resource('brand')),
  indications: contains(resource('indication')),
}))

// Write gate: editors and creators must match at least the indication
const writeScopeGate = createRoleGate([
  { role: 'global_admin'                          },
  { role: 'country_manager',  requires: inCountry    },
  { role: 'content_approver', requires: inIndication },
  { role: 'content_reviewer', requires: inIndication },
  { role: 'content_creator',  requires: inIndication },
])

// Publish gate: publishers get brand-level scope; all others need indication
const publishScopeGate = createRoleGate([
  { role: 'global_admin'                           },
  { role: 'country_manager',   requires: inCountry    },
  { role: 'content_publisher', requires: inBrand      },
  { role: 'content_approver',  requires: inIndication },
])

export const canReadContent       = hasPermission(ContentPerms.read)
export const canCreateContent     = allOf(hasPermission(ContentPerms.create),   writeScopeGate)
export const canUpdateContent     = allOf(hasPermission(ContentPerms.update),   writeScopeGate)
export const canPublishContent    = allOf(hasPermission(ContentPerms.publish),  publishScopeGate)
export const canSeeInternalFields = allOf(hasPermission(ContentPerms.internal), writeScopeGate)
```

#### `ContentCard.tsx` — no scope.ts, no custom hook, no manual type guards

```typescript
import { usePoliciesDeferred } from '@hex-di/guard/react'
import * as Policies from './auth/policies'

function ContentCard({ item }: { item: ContentItem }) {
  // resource fields are resolved against subject.attributes.scopes at evaluation time
  const access = usePoliciesDeferred(
    {
      canRead:        Policies.canReadContent,
      canCreate:      Policies.canCreateContent,
      canUpdate:      Policies.canUpdateContent,
      canPublish:     Policies.canPublishContent,
      canSeeInternal: Policies.canSeeInternalFields,
    },
    {
      resource: { brand: item.brand, country: item.country, indication: item.indication },
    },
  )

  if (access.status === 'pending') return <Skeleton />

  const { decisions } = access

  return (
    <div>
      {decisions.canSeeInternal.kind === 'allow' && <InternalNotes />}
      {decisions.canUpdate.kind === 'allow' && <EditButton />}
      {decisions.canPublish.kind === 'allow'
        ? <PublishButton />
        : <span title={decisions.canPublish.reason}>No publish access</span>
      }
    </div>
  )
}
```

### Memoization Contract

```
REQUIREMENT: usePolicies MUST memoize the decisions record by subject identity
             + policies map reference + enricher reference + resource reference.
             If none of these change between renders, the same decisions record
             object MUST be returned (referential stability for React.memo).
             evaluate() MUST NOT be called again on unchanged inputs.
```

```
RECOMMENDED: The enricher function SHOULD be stable (defined outside the component
             or memoized with useCallback). An unstable enricher identity will
             defeat memoization and cause evaluate() to run on every render.
```

---

## GxP Compliance Warning

> **WARNING:** React gates (`<Can>`, `<Cannot>`, `useCan`, `usePolicy`, `useCanDeferred`, `usePolicyDeferred`) are a **client-side UI convenience layer**. They do **NOT** provide GxP-compliant authorization enforcement. Specifically, React gates:
>
> 1. **Do NOT produce audit trail records** — no `AuditEntry` is created for client-side permission checks
> 2. **Do NOT enforce server-side access control** — a subject can bypass React gates by calling the API directly
> 3. **Do NOT capture electronic signatures** — `hasSignature` policies are not evaluated client-side
> 4. **Do NOT participate in hash chain integrity** — no `integrityHash` or `sequenceNumber` is assigned
> 5. **Do NOT satisfy 21 CFR Part 11 requirements** — client-side checks are not "secure, computer-generated" controls
>
> **GxP-regulated operations MUST go through the server-side `guard()` wrapper**, which evaluates policies, records audit entries, and enforces the full compliance contract defined in 07-guard-adapter.md and 17-gxp-compliance.md.
>
> React gates are appropriate for: hiding UI elements the user cannot act on, preventing unnecessary API calls, and improving user experience by showing contextual messages. They are a **defense-in-depth** layer, not a primary control.

```
REQUIREMENT: When gxp is true, the application's GxP compliance documentation MUST
             explicitly state that React gate components (Can, Cannot, useCan,
             usePolicy, useCanDeferred, usePolicyDeferred) are classified as
             UI convenience controls only and are NOT GxP compliance controls.
             The documentation MUST identify the server-side guard() wrapper as
             the sole authoritative access control mechanism for GxP-regulated
             operations. Client-side permission checks MUST NOT be cited as
             evidence of access control compliance during regulatory audits.
             Every GxP-regulated operation that is gated client-side via React
             components MUST also be enforced server-side via the guard() wrapper
             with full audit trail recording, hash chain participation, and
             electronic signature evaluation (where applicable). Absence of
             server-side guard enforcement for a GxP-regulated operation
             constitutes a compliance gap regardless of client-side React gate
             coverage.
             Reference: 21 CFR 11.10(d) (limiting system access to authorized
             individuals), 21 CFR 11.10(g) (authority checks),
             EU GMP Annex 11 §12.1 (access controls).
```

### Optional `onDecision` Callback

For applications that want client-side observability of permission checks (e.g., client-side analytics, debugging, or telemetry), the `SubjectProvider` accepts an optional `onDecision` callback:

```typescript
interface ClientDecisionEvent {
  /** The policy label that was evaluated. */
  readonly policy: string;
  /** "permission" for useCan checks, "policy" for usePolicy evaluations. */
  readonly kind: "permission" | "policy";
  /** The subject who was checked. */
  readonly subjectId: string;
  /** ISO 8601 timestamp of the client-side check. */
  readonly timestamp: string;
  /** Always "client" to distinguish from server-side audit entries. */
  readonly source: "client";
}

interface SubjectProviderProps {
  readonly subject: AuthSubject | null;
  readonly children: ReactNode;
  /**
   * Optional callback fired on every client-side permission/policy check.
   * Fire-and-forget: errors in this callback do not affect rendering.
   *
   * **NOT a substitute for the server-side audit trail.**
   * This callback is for UI telemetry and debugging only.
   */
  readonly onDecision?: (event: ClientDecisionEvent) => void;
}
```

**Usage:**

```typescript
<SubjectProvider
  subject={currentUser}
  onDecision={(event) => {
    analytics.track("client_permission_check", event);
  }}
>
  <Suspense fallback={<LoadingSpinner />}>
    <App />
  </Suspense>
</SubjectProvider>
```

> **Note:** `onDecision` is fire-and-forget. If the callback throws, the error is caught and silently discarded — it MUST NOT affect rendering or permission evaluation behavior.

## Client-Side Security Considerations

While React gates are a UI convenience layer (not a compliance control), applications deployed in GxP environments SHOULD harden their client-side code to prevent unauthorized access to sensitive UI elements.

### Content Security Policy (CSP)

```
RECOMMENDED: GxP web applications SHOULD deploy a strict Content Security Policy (CSP)
             that prevents XSS attacks from bypassing React gate checks. The RECOMMENDED
             policy directives include:
             - script-src 'nonce-{random}' to allow only nonce-authenticated scripts
             - style-src 'self' 'nonce-{random}' to prevent style injection
             - connect-src with explicit API endpoint allowlist
             - frame-ancestors 'none' to prevent clickjacking
             - object-src 'none' to prevent plugin-based script execution
             - base-uri 'self' to prevent base tag hijacking of relative URLs
             Inline scripts and eval() MUST be prohibited (no 'unsafe-inline' or
             'unsafe-eval'). The CSP nonce SHOULD be generated per-request by the
             server and injected into the HTML template.

RECOMMENDED: GxP web applications SHOULD configure CSP violation reporting using the
             report-uri and/or report-to directives. CSP violation reports SHOULD be
             collected by a monitoring endpoint and reviewed as part of periodic security
             assessments. In GxP environments, CSP violations may indicate XSS attempts
             targeting guard gate components or audit trail review interfaces. Violation
             reports SHOULD include the violated directive, the blocked URI, and the
             document URI to support incident investigation.
```

### XSS Prevention

React's default JSX escaping provides baseline XSS protection. However, GxP applications SHOULD additionally:

1. **Sanitize user-provided data** before rendering in any context where React's escaping is bypassed (`dangerouslySetInnerHTML`, URL attributes, event handlers)
2. **Validate subject data** received from the API before passing it to `SubjectProvider` -- a compromised API response that inflates the subject's permissions would bypass all React gates

### Server-Side Rendering (SSR) for GxP

```
RECOMMENDED: GxP deployments SHOULD use server-side rendering (SSR) with a
             pre-resolved AuthSubject. This eliminates the loading state window
             where useCan() returns undefined and React gates are indeterminate.
             The server resolves the subject from the request context (JWT, session)
             and provides it as initial data to the React application. This ensures
             that the first render already reflects the correct authorization state.
```

```
RECOMMENDED: When useCan() returns undefined (subject loading), consuming components
             in security-sensitive contexts SHOULD treat this as a deny decision.
             Rendering protected content while the subject is unknown creates a
             window where unauthorized users may see GxP-relevant UI elements. The
             <Can> component's fallback prop handles this automatically; custom hooks
             using useCan() directly SHOULD include an explicit undefined-as-deny check.
```

---

_Previous: [10 - Cross-Library Integration](./10-cross-library.md) | Next: [12 - Inspection](./12-inspection.md)_
