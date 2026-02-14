# @hex-di/guard -- Architecture Review

This document is a critical review of the proposed `@hex-di/guard` library. It examines twelve design areas, identifies real problems in each, and proposes concrete solutions.

---

## 1. Dependency Direction: Does Permission Belong in Core?

### Analysis

The product spec states that `@hex-di/guard` depends only on `@hex-di/core`. The Permission type uses the same branded nominal token pattern as Port -- `Symbol.for()` + phantom brand + `Object.freeze()`. This raises the question: should Permission be defined in `@hex-di/core` or stay in `@hex-di/guard`?

**Arguments for putting Permission in core:**

- Other packages (query, store, saga, flow) might want to reference permissions for their own guard integration without depending on `@hex-di/guard`.
- The branding machinery (`unique symbol`, phantom types) already exists in core.
- Core already hosts cross-cutting primitives: `Port`, `Adapter`, `ContainerError`, `ContextVariable`.

**Arguments against (and why they win):**

1. **Core is zero-dependency and domain-agnostic.** Ports and Adapters are universal DI concepts. Permissions are an authorization-domain concept. Adding `Permission<TResource, TAction>` to core is the same category error as adding `LogLevel` to core -- it is domain logic leaking into infrastructure.

2. **Core's public API surface is already large** (280+ lines of exports in `index.ts`). Every export in core becomes a maintenance commitment for the entire monorepo. Permission tokens would add `createPermission`, `isPermission`, `InferPermissionName`, `InferPermissionResource`, `InferPermissionAction`, `Permission`, `Role`, etc. This balloons the API for a concern most hex-di users will never touch.

3. **The "other packages might need it" argument is speculative.** If query/store/saga need guard-awareness, they should depend on `@hex-di/guard` (or use a thin `@hex-di/guard-core` package). This follows the existing pattern: `@hex-di/tracing` does not put `Span` or `Tracer` in core -- it defines its own ports.

4. **Circular pressure.** If Permission lives in core, and guard depends on core, and eventually core needs to reference guard decisions for resolution-level enforcement, you get a circular dependency or an awkward split.

### Verdict

**Permission stays in `@hex-di/guard`.** The guard package defines its own branded nominal tokens using the same pattern as core's Port, but as an independent token system. Core remains domain-agnostic.

### Recommended Action

If other packages need to be "guard-aware" (e.g., `@hex-di/query` wants to accept a policy for query execution), define a minimal `PolicyLike` structural interface in that package's own types, or accept `@hex-di/guard` as an optional peer dependency. Do not pollute core.

---

## 2. Policy as Data vs. Policy as Function: The Serialization Lie

### The Problem

The product spec makes a strong claim: "Policies are data, not callbacks. They can be serialized to JSON." This is true for `hasPermission`, `hasRole`, `allOf`, `anyOf`, `not`. These are trivially serializable discriminated unions.

But `hasAttribute` breaks the contract. The spec shows:

```typescript
const canEditOwnArticle = allOf(
  hasPermission(ArticleEditPermission),
  hasAttribute("ownerId", eq(subject("id")))
);
```

Serialized:

```json
{
  "kind": "allOf",
  "policies": [
    { "kind": "hasPermission", "permission": "article:edit" },
    {
      "kind": "hasAttribute",
      "key": "ownerId",
      "matcher": { "kind": "eq", "ref": { "kind": "subject", "path": "id" } }
    }
  ]
}
```

This works for simple equality comparisons with fixed paths. But the shaping-questions document asks about `gt`, `lt`, `contains`, `startsWith`, `in(["a","b"])`, regex, and arbitrary nested paths like `subject("organization.plan.tier")`.

**The real problem is this:** The moment you allow expressions like `subject.attributes.department === resource.attributes.department`, you are building a query language. You have two choices:

1. **Accept the query language and build it explicitly.** Define a closed set of matchers (`eq`, `neq`, `in`, `gt`, `lt`, `contains`, `startsWith`, `regex`), a closed set of reference types (`subject(path)`, `resource(path)`, `literal(value)`), and a closed set of logical combinators (`and`, `or`, `not`). This is what XACML, OPA/Rego, and Cedar do. It is serializable, but it is a DSL, and building a correct and performant evaluator for it is a substantial engineering effort.

2. **Admit that attribute policies are not serializable and use a hybrid.** The RBAC layer (permissions, roles, combinators) is serializable data. The ABAC layer (attribute checks) is a function. Provide a `custom(fn)` escape hatch that marks the policy as non-serializable.

### Why the Hybrid is Dangerous

If you choose option 2, the "policies are data" pitch becomes misleading. Every time someone uses `hasAttribute` with a non-trivial comparison, the policy tree becomes non-serializable. Auditors cannot export it. `explainPolicy()` cannot describe it. DevTools cannot display it. The library's differentiator over casl ("casl rules are callback-based") evaporates.

### Why the DSL is Dangerous

If you choose option 1, you are committing to building and maintaining a mini expression language with type-safe matchers, path resolution, and an evaluator. This is a 3-6 month project on its own -- larger than the rest of the guard library combined.

### Recommendation

**Start with option 1, but with a strictly minimal matcher set.** For v1:

- Matchers: `eq`, `neq`, `in` (array membership), `exists` (attribute is present).
- References: `subject(path: string)`, `resource(path: string)`, `literal(value: string | number | boolean)`.
- No `gt`, `lt`, `regex`, `contains`, `startsWith` in v1. These can be added later without breaking changes because the matcher union is extensible (add new `kind` variants).

**Explicitly forbid a `custom(fn)` escape hatch in v1.** This preserves the serialization invariant. If a user needs a custom check, they compose it outside the policy tree:

```typescript
// Instead of:
const policy = allOf(
  hasPermission(EditPerm),
  custom(ctx => ctx.subject.age >= 18)
);

// Do:
const policy = hasPermission(EditPerm);
// Check age separately in application code before evaluating policy.
```

This keeps the invariant: **every Policy is JSON-serializable, period.** If you later need a function escape hatch, add it as a separate `RuntimePolicy` type that is explicitly not serializable, keeping the distinction visible in the type system.

---

## 3. Guard Wrapping: Type System Impact

### The Mechanism

`guard(adapter, { policy })` takes an existing adapter and returns a new adapter that:

- Provides the same port.
- Requires the original adapter's dependencies PLUS `PolicyEnginePort` and `SubjectProviderPort`.
- Wraps the factory to check the policy before calling the original factory.

### Problem 1: The `requires` Union Grows

Consider an adapter:

```typescript
const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [DatabasePort],
  factory: ({ Database }) => new UserServiceImpl(Database),
});
```

After guarding:

```typescript
const GuardedUserService = guard(UserServiceAdapter, {
  policy: hasPermission(UserReadPermission),
});
// GuardedUserService.requires = [DatabasePort, PolicyEnginePort, SubjectProviderPort]
```

The type system must express this. The `Adapter` type carries `TRequires` as a type parameter. The guarded adapter's `TRequires` must be the union of the original requires and the guard's requires. This is expressible:

```typescript
type GuardedAdapter<A extends AdapterConstraint> = Adapter<
  InferAdapterProvides<A>,
  InferAdapterRequires<A> | typeof PolicyEnginePort | typeof SubjectProviderPort,
  InferAdapterLifetime<A>,
  ...
>;
```

But there is a subtlety: the `requires` field at runtime is a **tuple** (`TRequiresTuple`), not a union. The guard must concatenate the original requires array with `[PolicyEnginePort, SubjectProviderPort]`. The `Adapter` type derives `TRequiresTuple` from `TRequires`, so this should work if `TRequires` is correctly widened. But this needs explicit testing against the GraphBuilder's cycle detection and missing-dependency validation, which operate on the runtime `requires` array.

### Problem 2: Async Factory Wrapping

If the original adapter has an async factory (`factoryKind: "async"`), the guard wrapper must also be async. But the guard's own logic (resolve subject, evaluate policy) may also be async (the subject is resolved from a scoped adapter, which is synchronous, but policy evaluation could be async if the PermissionStore is remote).

This creates a question: is the guard wrapper always async? If so, it inherits the async factory constraint: **async factories must be singletons**. But scoped or transient adapters are the most common candidates for guarding (you want per-request authorization checks). A guarded scoped adapter that becomes async-singleton defeats the purpose.

**Solution:** The guard wrapper must be synchronous in its critical path. The subject is resolved synchronously (it is scoped, already in cache after first resolution). The policy evaluation must be synchronous (all data is in memory -- the permission set was loaded when the subject was created). The PermissionStore is consulted at subject-creation time, not at policy-evaluation time. This keeps the guard factory synchronous and preserves the original adapter's lifetime.

### Problem 3: Return Type Transformation

The product spec mentions guarded methods returning `Result<T, AccessDeniedError>`. But if `guard()` wraps the adapter factory, the return type of `container.resolve(UserServicePort)` changes from `UserService` to `Result<UserService, AccessDeniedError>`. This is a **breaking type change** -- every consumer of that port now needs to unwrap the Result.

Alternatively, the guard throws `AccessDeniedError` (the factory throws, and `resolve()` propagates it). This preserves the return type but makes authorization failures exceptional.

**Recommendation:** The guard throws. `resolve()` already throws `FactoryError`, `CircularDependencyError`, etc. Authorization denial is another resolution failure. Use `tryResolve()` to get `Result<UserService, ContainerError>` where `ContainerError` includes `AccessDeniedError`. Do not change the port's service type.

### Problem 4: Graph Composition

The GraphBuilder validates that all required ports are provided. If `GuardedUserServiceAdapter` requires `PolicyEnginePort` and `SubjectProviderPort`, those must be in the graph. This means the user must `.provide(PolicyEngineAdapter).provide(SubjectProviderAdapter)` in their graph builder chain. This is correct but verbose. Consider a `createGuardGraph()` helper that bundles the guard infrastructure adapters.

---

## 4. Resolution Hook vs. Guard: Two Enforcement Mechanisms

### The Problem

The proposal defines two enforcement mechanisms:

1. **`guard(adapter, { policy })`** -- Wraps an individual adapter. Policy check happens inside the factory. Enforcement is per-adapter.

2. **`createAuthorizationHook({ policies })`** -- A `beforeResolve` hook that checks a policy map (`Map<Port, Policy>`) before any resolution. Enforcement is cross-cutting.

Having two mechanisms with overlapping responsibility creates ambiguity:

- When should a user use `guard()` vs. the hook?
- What happens if both are applied to the same port? Double-check? The hook denies first, then the guard denies again?
- Can the hook see the resource context? The `ResolutionHookContext` has `port`, `portName`, `lifetime`, `scopeId`, but no resource descriptor or subject. The hook would need to resolve the subject from the scope, which means resolving inside a resolution hook -- a reentrancy risk.

### Analysis

Looking at the existing `ResolutionHookContext` in `packages/runtime/src/resolution/hooks.ts`, the context provides:

```typescript
interface ResolutionHookContext {
  readonly port: Port<unknown, string>;
  readonly portName: string;
  readonly lifetime: Lifetime;
  readonly scopeId: string | null;
  readonly parentPort: Port<unknown, string> | null;
  readonly isCacheHit: boolean;
  readonly depth: number;
  readonly containerId: string;
  readonly containerKind: ContainerKind;
  readonly inheritanceMode: InheritanceMode | null;
  readonly parentContainerId: string | null;
  readonly duration: number;
  readonly error: Error | null;
  readonly result?: unknown;
}
```

No subject. No resource. No way to access the scope's resolved services from within the hook without triggering another resolution (which would fire the hook again -- infinite recursion unless guarded).

### Verdict

**The resolution hook is the wrong mechanism for fine-grained authorization.** It is appropriate for coarse-grained "can this port be resolved at all" checks (like a kill switch or a feature flag), but not for subject+resource authorization.

**The `guard()` wrapper is the correct primary mechanism.** It runs inside the factory, after dependency resolution, with full access to the resolved subject (via its `requires` tuple). It can evaluate policies against both the subject and the resource context.

### Recommendation

1. **Keep `guard()` as the primary mechanism.** This is where RBAC and ABAC policies are evaluated.

2. **Rename `createAuthorizationHook` to something narrower**, like `createPortGateHook`. Make it explicitly a coarse-grained gate: "is this port allowed to be resolved in this context?" No subject, no resource -- just port name and a static allow/deny map. Use case: disable ports in certain environments, feature flags, tenant-scoped port restrictions.

3. **Document clearly:** `guard()` = per-adapter, subject-aware, resource-aware. Port gate hook = global, coarse, no subject. They are complementary, not overlapping.

4. **If both are applied:** The hook runs first (it is `beforeResolve`, before the factory executes). If the hook denies, the guard never runs. If the hook allows, the guard runs inside the factory. This ordering is inherent to the architecture and requires no special handling -- just documentation.

---

## 5. Scope Coupling: SubjectProvider and Existing Scopes

### The Problem

The proposal says SubjectProvider creates a scope in React. The existing React integration already has `HexDiAutoScopeProvider` which creates scopes tied to component lifecycle. If SubjectProvider creates its own scope, and the user already has an `HexDiAutoScopeProvider`, you get nested scopes:

```tsx
<HexDiContainerProvider container={container}>
  <HexDiAutoScopeProvider>
    {" "}
    {/* scope-0 */}
    <SubjectProvider subject={user}>
      {" "}
      {/* scope-1 (nested) */}
      <MyComponent />
    </SubjectProvider>
  </HexDiAutoScopeProvider>
</HexDiContainerProvider>
```

This means `MyComponent` resolves services from `scope-1`, not `scope-0`. The subject is in `scope-1`. But scoped services registered in `scope-0` are invisible to `scope-1` unless `scope-1` is a child of `scope-0` (which it is, since `HexDiAutoScopeProvider` provides the parent resolver context).

The real problem: the SubjectProvider in React does NOT need to create its own scope. The subject is an authorization concept, not a DI scope concept. The subject should be provided via React context, not via a DI scope.

### Analysis

Looking at how `HexDiAutoScopeProvider` works (`integrations/react/src/providers/auto-scope-provider.tsx`):

```tsx
function HexDiAutoScopeProvider({ name, children }) {
  // Creates scope from parent resolver context
  const resolverContext = useContext(ResolverContext);
  // ...creates scope, provides it via ResolverContext.Provider
}
```

The scope is a DI concept -- it manages service lifetimes. The subject is a business concept -- it represents "who is making the request."

If SubjectProvider creates a DI scope, it conflates these two concerns. A user who already has a scope (from `HexDiAutoScopeProvider` or from a server-side request handler) would get a redundant nested scope just to provide the subject.

### Recommendation

**SubjectProvider should NOT create a DI scope.** It should:

1. **On the server side:** The subject is provided as a scoped adapter. The existing request scope (created by the server framework integration) resolves the SubjectProviderPort to the current user. No extra scope needed.

2. **On the React side:** The SubjectProvider is a pure React context provider. It stores the subject in React context. The `useCan` hook reads from React context, not from the DI container. The subject does NOT flow through the DI container in React -- it flows through React context.

This means the React integration has:

- `SubjectProvider` -- React context provider for the subject. No DI scope.
- `useCan(permission)` -- Reads subject from React context, evaluates policy in-memory.
- `usePolicy(policy)` -- Same, returns full decision.

The server-side integration has:

- SubjectProviderPort -- A port with a scoped adapter that reads the subject from the request.
- `guard()` -- Wraps adapters, resolves subject from SubjectProviderPort via DI.

These are different integration paths for different environments. The React side should not touch the DI scope for authorization.

---

## 6. Static vs. Dynamic Permissions: Type Divergence

### The Problem

Static roles are defined with `createRole`:

```typescript
const AdminRole = createRole("admin", {
  permissions: [UserReadPerm, UserWritePerm, ArticleReadPerm, ArticleWritePerm],
  inherits: [EditorRole],
});
```

The type system knows the full permission set of `AdminRole` at compile time. A function that expects `Subject<{ roles: [typeof AdminRole] }>` can statically verify that the subject has `UserReadPerm`.

But `PermissionStorePort` allows runtime assignment:

```typescript
// At runtime, from a database:
const dynamicRoles = await permissionStore.getRoles(userId);
// dynamicRoles: Role[] -- no compile-time knowledge of contents
```

Now the subject's permissions are `Set<string>` at runtime, with no type-level guarantee. The compile-time `Permission<'user', 'read'>` branded token is matched by string name, not by type identity. This is the same loss of type safety that happens when you serialize/deserialize any branded type.

### Analysis

This is not actually a problem -- it is the expected behavior of a system with both static and dynamic permission sources. The resolution:

1. **Static path (compile-time):** When policies reference `Permission<'user', 'read'>` and the subject's roles are statically known, the type system can verify compatibility. This is the "golden path" for applications where the permission model is fixed.

2. **Dynamic path (runtime):** When permissions come from a database, the branded token degrades to its runtime representation (`{ __permissionName: "user:read" }`). Matching is by name string. This is correct -- you cannot have compile-time guarantees about runtime data.

3. **The type system should NOT try to unify these.** Attempting to make `Subject<DynamicRoles>` type-compatible with `Subject<StaticRoles>` would require existential types or runtime type narrowing, both of which add complexity without practical benefit.

### Recommendation

- Define `Subject` with a `permissions: ReadonlySet<string>` field (runtime representation).
- Static permission tokens have a `__permissionName: string` field that is used for runtime matching.
- The `evaluate` function compares by name string, not by type identity.
- The type system validates policy construction (you cannot pass a typo to `hasPermission()`), but policy evaluation is runtime-only.
- Document this explicitly: "Compile-time safety applies to policy definition. Policy evaluation is always runtime."

---

## 7. Circular Role Inheritance: Runtime Detection Gap

### The Problem

The product spec says circular role inheritance is detected at definition time for static roles. For example:

```typescript
const RoleA = createRole("a", { inherits: [RoleB] });
const RoleB = createRole("b", { inherits: [RoleA] }); // Error at definition time
```

But if roles come from `PermissionStorePort` (a database), the DAG is constructed at runtime. The `flattenPermissions(role)` function must traverse the inheritance graph, and if the database contains a cycle (RoleA -> RoleB -> RoleA), it will loop infinitely.

### Analysis

The shaping-questions document asks about this but does not confirm that runtime cycle detection is planned.

This is not a theoretical concern. In production systems, role hierarchies are maintained by administrators via a UI. Human error (or malicious action) can create cycles. A cycle in the role graph that crashes the application is a severity-1 incident.

### Recommendation

1. **`flattenPermissions()` must include a visited-set cycle detector.** This is trivial to implement (track visited role names in a `Set<string>`, throw `CircularRoleInheritanceError` if a role is visited twice) but must be mandated in the spec, not left as an implementation detail.

2. **Runtime cycle detection returns `Result<PermissionSet, CircularRoleError>`**, not an exception. The caller (SubjectProvider adapter) can decide how to handle it -- deny all permissions, log and fall back to direct permissions only, or propagate the error.

3. **Consider depth limiting.** Even without cycles, deeply nested role hierarchies (100+ levels) can be a performance problem. Add a configurable `maxInheritanceDepth` (default: 32) that errors when exceeded.

4. **The static `createRole` factory should also detect cycles at call time**, using a similar visited-set check on the `inherits` array's transitive closure. TypeScript's type system cannot prevent cycles in value-level data structures, so this must be a runtime check even for "static" roles.

---

## 8. AuditTrail as Port: Over-Engineering Assessment

### The Question

Is `AuditTrailPort` needed as a separate port, or should authorization decisions be emitted through the existing `@hex-di/logger` and `@hex-di/tracing` infrastructure?

### Analysis

Looking at the existing patterns:

- `@hex-di/logger` defines `LogHandlerPort` -- an outbound port for processing log entries. It has adapters for console, memory, bunyan, pino, winston.
- `@hex-di/tracing` defines `Tracer` interface with `startSpan()`, `endSpan()`. It has adapters for console, memory, datadog, jaeger, otel, zipkin.
- `instrumentContainer()` in `@hex-di/tracing` uses resolution hooks to create spans -- it does not define its own port for trace output.

The proposed `AuditTrailPort` would be:

```typescript
interface AuditTrail {
  record(decision: PolicyDecision): void;
}
```

This is functionally identical to `LogHandler.handle(entry)` where `entry.level = decision.outcome === 'allow' ? 'info' : 'warn'` and the structured data is the decision details. Or to a tracing span with the decision as attributes.

### Verdict

**AuditTrailPort is over-engineering for v1.** The decision details can be:

1. **Logged** via `@hex-di/logger`: `logger.info("authorization.decision", { policy, subject, outcome, ... })`. Structured logging already supports arbitrary metadata.

2. **Traced** via `@hex-di/tracing`: A span like `guard:UserServicePort` with attributes `{ outcome: "deny", policy: "hasPermission:user:read", reason: "..." }`.

3. **Both**, using the existing infrastructure that hex-di users already have configured.

A dedicated `AuditTrailPort` adds:

- Another port to register in the graph.
- Another adapter to implement (memory, console, noop).
- Another interface to learn.
- Another thing that can fail (what if the audit trail adapter throws during `record()`?).

For zero added capability over logger + tracing.

### Recommendation

**Remove `AuditTrailPort` from v1.** Instead:

1. The `guard()` wrapper emits a structured log entry via `@hex-di/logger` (if the guard's requires include `LoggerPort`). The log entry contains the full decision.

2. The `guard()` wrapper creates a tracing span via `@hex-di/tracing` (if instrumented). The span contains decision attributes.

3. If a user needs dedicated audit persistence (write to an audit table, send to a SIEM), they implement it as a resolution hook or a wrapper around the policy engine. No dedicated port needed.

4. **If** demand emerges for a standardized audit interface (compliance requirements, external audit systems), add `AuditTrailPort` in v2 as a purpose-built extension.

---

## 9. React `<Can>` Timing: Flash of Unauthorized Content

### The Problem

The `<Can>` component conditionally renders children based on a permission check:

```tsx
<Can permission={ArticleEditPermission}>
  <EditButton />
</Can>
```

If the subject is loaded asynchronously (e.g., from an API after the component mounts), there is a timing window where:

1. Component mounts.
2. Subject is not yet available.
3. `<Can>` evaluates with no subject -- what does it render?
4. Subject arrives.
5. `<Can>` re-evaluates -- now renders correctly.

Between steps 2 and 4, there is either a flash of unauthorized content (if `<Can>` defaults to showing children) or a flash of missing content (if `<Can>` defaults to hiding children).

### SSR Considerations

On the server, the subject should be available synchronously (it was extracted from the request headers/cookies before rendering). But if the React integration uses React context for the subject, and the server render does not wrap the tree in a `SubjectProvider`, `<Can>` will throw or render the wrong state.

### Suspense Interaction

If SubjectProvider triggers a Suspense boundary while loading the subject, `<Can>` inside that boundary will never render in the unsettled state -- Suspense hides it. But this couples authorization to Suspense, which may not be desired.

### Recommendation

1. **`<Can>` and `<Cannot>` must accept a `fallback` prop** (like React.Suspense). When the subject is not available, render the fallback. Default fallback: `null` (hide). This prevents both flashes.

2. **`useCan()` returns a three-state value**, not a boolean:

   ```typescript
   type CanResult = { status: "loading" } | { status: "allowed" } | { status: "denied" };
   ```

   Or, more ergonomically, return `boolean | undefined` where `undefined` means "subject not yet available." This follows the pattern of React's `useSyncExternalStore` returning `undefined` before hydration.

3. **SubjectProvider must accept a `loading` state.** The provider's value should be `Subject | null`, where `null` means "subject not yet resolved." `<Can>` checks for null and renders fallback.

4. **SSR:** Require SubjectProvider to be present in the server render tree. If missing, `useCan()` throws (like `usePort()` throws without `ContainerProvider`). This prevents silent rendering bugs.

5. **Do NOT couple to Suspense.** Authorization should not suspend. Suspense is for data loading, not for permission checks. The subject should be loaded and available before the guarded component tree renders. If the subject is async, the `SubjectProvider` should handle the loading state internally or the parent component should gate rendering.

---

## 10. Policy Evaluation Performance: Memoization Strategy

### The Problem

`useCan(permission)` runs on every render. If the component re-renders frequently (state updates, parent re-renders), the policy evaluation runs repeatedly. For simple `hasPermission` checks, this is O(1) (set lookup). For complex policy trees with `allOf`/`anyOf`/`hasAttribute`, tree traversal is O(n) where n is the number of nodes.

In a typical React app, a `<Can>` gate might be in a list item rendered 100+ times. Each render evaluates the same policy against the same subject. Without memoization, this is 100x redundant work.

### Analysis

The memoization boundary must be carefully chosen:

1. **Per-render memoization (useMemo/React.memo):** The standard React approach. `useMemo(() => evaluate(policy, subject), [policy, subject])`. Works if `policy` and `subject` are referentially stable. Policies are frozen objects (referentially stable). Subjects should be referentially stable within a scope. This works.

2. **Per-subject memoization (cache on subject identity):** Precompute the effective permission set when the subject is created. Store it as a `ReadonlySet<string>`. For `hasPermission` checks, this is O(1). For `hasRole` checks, flatten at subject-creation time. For `hasAttribute` checks, no precomputation possible (depends on resource).

3. **Per-evaluation memoization (LRU cache keyed by policy+subject+resource):** Full memoization. Risk: cache invalidation when subject changes (e.g., role granted mid-session). Cache keys are complex (deep equality on resource descriptors). Likely over-engineering for v1.

### Recommendation

1. **Precompute the permission set at subject-creation time.** When SubjectProvider sets the subject, immediately compute `flattenPermissions(subject.roles)` and store it as a `ReadonlySet<string>`. This is done once per subject change, not once per render.

2. **`useCan(permission)` does a set lookup, not a tree evaluation.** For simple permission checks, this is O(1) and needs no further memoization.

3. **`usePolicy(policy)` wraps evaluation in `useMemo` keyed by `[policy, subject]`.** Since policies are frozen (stable reference) and subjects change infrequently (once per login/scope), this memoizes effectively.

4. **Do NOT build a general-purpose evaluation cache for v1.** The precomputed permission set handles the 90% case. Complex ABAC policies that depend on resource attributes cannot be memoized without knowing the resource identity, which changes per component instance.

5. **Export `PrecomputedSubject` as a public type** -- a subject with its permission set already flattened. The SubjectProvider creates `PrecomputedSubject` from the raw subject on entry. All downstream consumers use the precomputed form.

---

## 11. guard() Composability: Guarding a Guard

### The Problem

Can you do this?

```typescript
const GuardedUserService = guard(UserServiceAdapter, { policy: policyA });
const DoubleGuardedUserService = guard(GuardedUserService, { policy: policyB });
```

What should happen?

### Analysis

If `guard()` returns a standard `Adapter`, then `guard()` can accept another guarded adapter as input. The result is an adapter whose factory:

1. Checks `policyB` (outer guard).
2. Calls the inner factory, which checks `policyA` (inner guard).
3. If both pass, returns the service.

The `requires` tuple is: `originalRequires + [PolicyEnginePort, SubjectProviderPort]` (from inner) + `[PolicyEnginePort, SubjectProviderPort]` (from outer). But `PolicyEnginePort` and `SubjectProviderPort` appear twice in requires. The `createAdapter` factory validates no duplicate ports in requires: `"ERROR[HEX017]: Duplicate port in requires array."` This means **double-guarding will throw at adapter creation time**.

### This is a Real Bug

Even if the runtime doesn't throw (maybe the duplicate check is on name, and both entries have the same name so it deduplicates), the type system doubles the requires. And conceptually, double-guarding is a valid use case: coarse-grained outer guard ("can resolve this port") + fine-grained inner guard ("can perform this specific action").

### Recommendation

1. **`guard()` must deduplicate requires.** When composing, filter out ports that are already in the inner adapter's requires. The resulting requires is `Set.union(innerRequires, guardRequires)`, not `concat(innerRequires, guardRequires)`.

2. **At the type level,** express this as `InferAdapterRequires<A> | typeof PolicyEnginePort | typeof SubjectProviderPort` (union automatically deduplicates).

3. **At the runtime level,** deduplicate the requires array by port name before passing to the adapter constructor.

4. **Alternatively, design guard() to compose policies, not nest wrappers.** Instead of `guard(guard(adapter, policyA), policyB)`, provide `guard(adapter, allOf(policyA, policyB))`. This avoids the double-wrapping problem entirely and is more explicit.

5. **Document that `guard()` is not idempotent.** If a user guards the same adapter twice with the same policy, the policy is evaluated twice (wasting work). Provide a lint rule or runtime warning for this.

---

## 12. Error Types: Result vs. Exception Boundary

### The Problem

The ecosystem uses `Result<T, E>` for expected failures (parsing, validation) and throws for programmer errors (missing provider, disposed scope). Where does authorization denial fit?

- **It is expected.** A user without permission being denied is normal business logic, not an error.
- **It interrupts control flow.** If `resolve(UserServicePort)` is denied, the service cannot be returned. The resolution fails.
- **The existing container API throws for resolution failures.** `resolve()` throws `FactoryError`, `CircularDependencyError`, etc. But it also has `tryResolve()` returning `Result<T, ContainerError>`.

### Analysis

There are two enforcement sites:

1. **`guard()` adapter wrapper (inside factory).** The factory either returns the service or fails. If it fails due to authorization, the container wraps it in a `FactoryError`. The consumer gets a `FactoryError` with a cause of `AccessDeniedError`. This is consistent with how factory errors work today.

2. **`useCan()` / `<Can>` (React).** This is a query, not an enforcement. It returns a boolean/decision. No error, no exception. The component uses the boolean to conditionally render.

3. **Policy engine evaluation.** `evaluate(policy, subject, resource)` should return `Result<PolicyDecision, PolicyEvaluationError>` because evaluation can fail (invalid policy, missing attributes) -- these are distinct from "evaluation succeeded and the answer is deny."

### Recommendation

Define `AccessDeniedError` as a subclass of `ContainerError`:

```typescript
class AccessDeniedError extends ContainerError {
  readonly code = ErrorCode.ACCESS_DENIED;
  readonly policy: Policy;
  readonly decision: PolicyDecision;
}
```

The boundary:

| Site              | Mechanism                                               | Type                                                                         |
| ----------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `guard()` factory | Throws `AccessDeniedError`                              | Caught by `resolve()`, wrapped in `FactoryError`                             |
| `tryResolve()`    | Returns `Err(ContainerError)`                           | `ContainerError` union includes `AccessDeniedError` via `FactoryError.cause` |
| `evaluate()`      | Returns `Result<PolicyDecision, PolicyEvaluationError>` | Decision can be Allow or Deny                                                |
| `useCan()`        | Returns `boolean`                                       | No error                                                                     |
| `usePolicy()`     | Returns `PolicyDecision`                                | Decision includes reason and trace                                           |

This keeps the error model consistent with the existing container API. Users who want Result-based error handling use `tryResolve()`. Users who want exception-based flow use `resolve()` with try/catch. The guard does not change the container's error model -- it extends it with a new error variant.

---

## Summary of Critical Findings

| #   | Area                 | Severity | Issue                                                  | Recommendation                                                   |
| --- | -------------------- | -------- | ------------------------------------------------------ | ---------------------------------------------------------------- |
| 1   | Dependency Direction | Low      | Temptation to put Permission in core                   | Keep in guard package                                            |
| 2   | Serialization        | **High** | `hasAttribute` breaks serialization invariant          | Minimal matcher DSL, no function escape hatch in v1              |
| 3   | Guard Wrapping       | **High** | Async guard breaks lifetime semantics                  | Keep guard evaluation synchronous; throw on deny                 |
| 4   | Dual Enforcement     | Medium   | Hook vs guard confusion                                | Hook = coarse gate; guard = subject-aware; document clearly      |
| 5   | Scope Coupling       | **High** | SubjectProvider creating unnecessary DI scope in React | Use React context, not DI scope, for subject in React            |
| 6   | Type Divergence      | Low      | Static vs dynamic permission types                     | Expected behavior; match by name string at runtime               |
| 7   | Cycle Detection      | **High** | Runtime role cycles not explicitly covered             | Mandatory visited-set in flattenPermissions; depth limit         |
| 8   | AuditTrail Port      | Medium   | Over-engineering                                       | Remove for v1; use logger + tracing                              |
| 9   | Flash of Content     | Medium   | `<Can>` timing before subject loads                    | Three-state return; fallback prop; require SubjectProvider       |
| 10  | Performance          | Medium   | Redundant evaluation per render                        | Precompute permission set at subject-creation time               |
| 11  | Composability        | Medium   | Double-guard throws on duplicate requires              | Deduplicate requires; prefer `allOf()` composition               |
| 12  | Error Types          | Low      | Result vs exception boundary                           | `AccessDeniedError` extends `ContainerError`; throw from factory |

The four high-severity issues (2, 3, 5, 7) should be resolved in the design phase before implementation begins. The medium-severity issues should be addressed during implementation. The low-severity issues are design preferences that should be documented.
