# ACL Library Shaping Questions

Based on the vision for `@hex-di/acl` and my analysis of the existing hex-di ecosystem patterns (ports/adapters, branded nominal types, Result-based error handling, factory patterns for React), here are targeted questions to shape the specification.

---

## 1. Permission Granularity and Modeling

I'm assuming permissions are flat branded tokens like `createPermission("article:read")` where the `resource:action` pair is encoded in the name string, similar to how `createPort<T>()({ name: "Logger" })` works. The alternative would be structured permissions with separate `resource` and `action` phantom type parameters, e.g., `createPermission<"Article", "Read">()`.

**The structured approach would enable compile-time validation** -- the type system could enforce that a policy referencing `Permission<"Article", "Read">` can only be evaluated against a `ResourceDescriptor<"Article">`. The flat string approach is simpler but loses that compile-time link.

Which approach do you prefer? Or should we support both (a flat convenience form that defaults to `string` resource type, and a structured form for full type safety)?

---

## 2. Role Hierarchy: Tree or DAG?

I assume roles form a **tree** hierarchy (each role has at most one parent), e.g., `Admin extends Editor extends Viewer`. This is simpler to reason about and avoids diamond inheritance issues with conflicting permissions.

The alternative is a **DAG** (directed acyclic graph) where a role can inherit from multiple parents, e.g., `TeamLead extends [Editor, Reviewer]`. This is more expressive but introduces the question of how conflicting policies resolve when inherited from different branches.

Which model fits your use cases? If DAG, should we require explicit conflict resolution (e.g., `deny-overrides` or `allow-overrides` at the role definition site)?

---

## 3. Policy Evaluation Order and Conflict Resolution

The vision describes policies as discriminated union data structures with combinators (`allOf`, `anyOf`, `not`). When multiple policies apply to the same resource:action pair, I need to understand the conflict resolution strategy.

I'm assuming a **deny-overrides** model: if any applicable policy denies, the final decision is Deny, regardless of other Allow decisions. This is the most secure default and aligns with AWS IAM / XACML patterns.

Alternatives:

- **First-match** (ordered policy list, first matching policy wins)
- **Allow-overrides** (any Allow wins over Deny)
- **Configurable per-engine** (the PolicyEngine adapter decides)

Which strategy should be the default? Should users be able to override it, and if so, at what level (per-engine, per-resource, per-policy set)?

---

## 4. Policy Data Structure: How Deep Does Serialization Go?

You specified policies must be "discriminated union data structures (not callbacks), serializable, inspectable, testable." This is a strong design constraint I want to validate the boundaries of.

I assume this means a policy like:

```typescript
const canEditOwnArticle = allOf(
  hasPermission(ArticleEditPermission),
  hasAttribute("ownerId", eq(subject("id")))
);
```

produces a plain JSON-serializable tree:

```json
{
  "type": "allOf",
  "policies": [
    { "type": "hasPermission", "permission": "article:edit" },
    {
      "type": "hasAttribute",
      "key": "ownerId",
      "matcher": { "type": "eq", "ref": { "type": "subject", "path": "id" } }
    }
  ]
}
```

Questions:

- Should `subject("id")` references be limited to a fixed set of known paths, or should they support arbitrary nested paths like `subject("organization.plan.tier")`?
- Should matchers support operations beyond equality? E.g., `gt`, `lt`, `contains`, `startsWith`, `in(["a","b"])`, regex? Or should we start minimal (eq, neq, in) and expand later?
- Should there be a `custom` matcher escape hatch (non-serializable callback) for truly dynamic checks, or is full serializability a hard requirement with no exceptions?

---

## 5. ResourceDescriptor: Static Type or Dynamic Bag of Attributes?

The vision lists `ResourceDescriptor` with `{ type, id, ownerId, attributes }`. I need to understand the typing story here.

Option A -- **Loosely typed**: `ResourceDescriptor` is a flat interface with `type: string`, `id: string`, `ownerId?: string`, `attributes: Record<string, unknown>`. Simple, but policies can reference non-existent attributes with no compile-time feedback.

Option B -- **Generically typed**: `ResourceDescriptor<TType extends string, TAttrs>` where `TAttrs` is a user-defined shape. Policies referencing `hasAttribute("ownerId", ...)` would be type-checked against the resource's attribute type. More complex, but catches bugs at compile time.

Given the ecosystem's emphasis on compile-time safety via phantom types, I lean toward Option B. Is that the right call, or would the ergonomic cost be too high for most users?

---

## 6. Subject Provider: Scoped Lifetime and Request Context

I assume `SubjectProviderPort` resolves the current actor and should have a **scoped** lifetime (one Subject per request/scope). This maps naturally to `@hex-di/runtime`'s scope system -- each HTTP request or React render tree creates a scope, and the Subject is resolved once within that scope.

Questions:

- Should the Subject be **immutable** within a scope (resolved once, cached), or can it be **upgraded** mid-scope (e.g., user authenticates partway through a request)?
- How does the Subject get populated? I assume through a `SubjectProviderPort` adapter that the user implements (e.g., reading from a JWT, session, or React context). Is that correct, or should we provide built-in extractors for common patterns (JWT, OAuth claims, etc.)?
- Should we provide a `withSubject(subject, fn)` utility for testing that creates a temporary scope with a fixed Subject?

---

## 7. Guard Integration: Wrapping Adapters vs. Resolution Hooks

The vision mentions both `guard(adapter, { resolve, methods })` for wrapping individual adapters and `createAuthorizationHook({ policies })` for cross-cutting enforcement via resolution hooks.

Looking at the existing `ResolutionHooks` in `@hex-di/runtime`, `beforeResolve` receives a `ResolutionHookContext` with the port name, lifetime, and scope info -- but no Subject or ResourceDescriptor. The hook would need access to the current Subject from the scope context.

Questions:

- For the `guard()` wrapper: should it wrap at the **adapter level** (decorating the factory to inject authorization checks before method calls) or at the **proxy level** (wrapping the resolved instance with a Proxy that intercepts method calls)?
- For the resolution hook approach: should authorization checks happen at **resolution time** ("can this Subject resolve UserServicePort at all?") or at **method invocation time** ("can this Subject call `userService.delete(id)` on this specific resource?")?
- Can both approaches coexist, where the hook provides coarse-grained "can resolve this port" checks and the guard provides fine-grained "can invoke this method on this resource" checks?

---

## 8. Decision Type and Audit Trail

The vision says `Decision` is `Allow | Deny` with a full audit trail. I need to understand the shape.

I assume a Decision looks like:

```typescript
type Decision = {
  readonly outcome: "allow" | "deny";
  readonly policy: Policy; // which policy produced this
  readonly subject: SubjectSnapshot; // who was evaluated
  readonly resource?: ResourceDescriptor; // what was accessed
  readonly reason: string; // human-readable explanation
  readonly evaluatedAt: number; // timestamp
  readonly trace: PolicyEvaluationTrace; // step-by-step evaluation tree
};
```

Questions:

- Should Decision be a Result type (`Result<Allow, Deny>`) to integrate with the existing `@hex-di/result` pattern, or a plain discriminated union? Result would let users chain `.map()` / `.andThen()` on authorization outcomes.
- How detailed should the audit trail be? Should `PolicyEvaluationTrace` record every combinator node evaluated (full tree), or just the final matching path?
- Should the `AuditTrailPort` be optional (zero overhead when not configured, like tracing hooks), or always active?
- Should audit entries be emittable to the existing `@hex-di/logger` and `@hex-di/tracing` infrastructure? E.g., should a deny decision automatically create a tracing span or log entry if those packages are present?

---

## 9. Error Handling: Result vs. Exceptions

The ecosystem uses `Result<T, E>` for expected failures and throws only for programmer errors. I need to clarify the boundary for ACL.

I assume:

- `policyEngine.evaluate(policy, subject, resource)` returns `Result<Decision, EvaluationError>` (could fail if policy references unknown attributes, or the Subject provider fails)
- `guard()` wrapped methods return the original return type but throw an `AccessDeniedError` (since authorization failure in a guarded method is more like an HTTP 403 -- an expected but exceptional control flow)
- `useCan()` in React returns a plain `boolean` (synchronous, no Result)

Is this the right split? Or should guarded methods also return Result (wrapping the original return type in `Result<T, AccessDeniedError>`)?

---

## 10. Performance: Caching and Memoization

Policy evaluation could be called frequently -- on every method invocation for guarded services, on every React render for `<Can>` gates.

I assume:

- **Permission set memoization**: A Subject's effective permissions (resolved through the role hierarchy) are computed once per scope and cached
- **Policy evaluation caching**: For the same (policy, subject, resource) tuple, the Decision is cached within a scope
- **React memoization**: `useCan` memoizes by policy reference + resource identity (shallow compare), recalculating only when Subject context changes

Questions:

- Should caching be opt-in or default? If default, what's the invalidation strategy within a scope?
- For the role hierarchy resolution, should we precompute the full transitive permission set on Subject creation (eager), or resolve permissions lazily and cache on first access?
- Should there be a `PermissionIndex` optimization where the engine builds a hash set of all granted permissions for O(1) lookups, falling back to policy tree evaluation only for ABAC rules?

---

## 11. Testing Story

Users need to test their policies in isolation and test their services' authorization behavior.

I assume the testing approach mirrors `@hex-di/logger`'s `MemoryLogger` and `@hex-di/tracing`'s `MemoryTracer`:

- `MemoryPolicyEngine` that records all evaluations
- `StaticSubjectProvider` that returns a fixed Subject
- Helper functions like `asDenied(decision)` / `asAllowed(decision)` type guards
- A `createTestSubject({ roles, attributes })` builder for constructing test Subjects

Questions:

- Should we provide a `@hex-di/acl-testing` package (like `@hex-di/result-testing` with custom matchers) with Vitest/Jest matchers like `expect(decision).toAllow()` / `expect(decision).toDeny()`?
- Should there be a **policy simulator** that takes a policy tree and generates all possible input combinations that lead to Allow vs. Deny? (Useful for compliance auditing)
- Should the memory adapter record evaluation traces by default for assertion purposes?

---

## 12. Scope Boundaries: What's In vs. Out for v1?

Based on the vision, I want to confirm what's in scope for the initial release vs. future work.

**I assume IN scope for v1:**

- `@hex-di/acl` core library (Permission, Role, Policy, Subject, Decision, PolicyEngine port, combinators)
- Memory, Static, and Noop adapters
- Container integration (guard wrapper, resolution hook)
- `@hex-di/acl-react` with `<Can>`, `<Cannot>`, `useCan`, `usePolicy`, `useSubject`

**I assume OUT of scope for v1:**

- Persistent permission stores (database adapters)
- OIDC/JWT/OAuth claim extraction adapters
- Admin UI for role/permission management
- Policy versioning and migration
- Multi-tenancy support (tenant-scoped policies)
- Field-level access control (column/property filtering)
- Rate limiting or quota enforcement (separate concern)

Is this split correct? Are there items I should move between the two lists?

---

## 13. Integration with @hex-di/query, @hex-di/store, @hex-di/saga, @hex-di/flow

The ecosystem includes application libraries for data fetching, state management, sagas, and flows. ACL authorization likely intersects with these.

Questions:

- Should `@hex-di/query` queries be guardable? E.g., "this query can only be executed by users with `report:read` permission"?
- Should `@hex-di/store` mutations be guardable? E.g., "only admins can dispatch `resetUserData`"?
- Should `@hex-di/saga` / `@hex-di/flow` steps carry authorization context through their execution? E.g., a saga that crosses service boundaries should propagate the Subject.
- Or should these integrations be deferred entirely, with the guard/hook system being generic enough that users can wire them up manually?

---

## 14. Package Structure

I assume two packages:

- `packages/acl/` -- Core library (`@hex-di/acl`)
- `integrations/acl-react/` -- React integration (`@hex-di/acl-react`)

Following the existing pattern where `@hex-di/acl` has zero dependency on React and the React integration imports from both `@hex-di/acl` and `react`.

Should the React integration live under `integrations/` (matching `integrations/react/`) or should it be a separate package under `packages/` (like `packages/acl-react/`)? The current React integration is at `integrations/react/` -- should `acl-react` be a sub-export of that integration, or a standalone integration?

---

## Existing Code Reuse

Are there existing features in the codebase with similar patterns we should reference? Based on my analysis, I've identified:

- **Port/Adapter patterns**: `packages/core/src/ports/` and `packages/core/src/adapters/` for branded nominal token creation
- **Resolution hooks**: `packages/runtime/src/resolution/hooks.ts` for the guard/hook integration point
- **Logger port/adapter structure**: `packages/logger/` as a model for a library with Port + multiple Adapters (Memory, Console, Noop)
- **Tracing instrumentation**: `packages/tracing/src/instrumentation/` for how to wrap container behavior
- **React factory pattern**: `integrations/react/src/factories/create-typed-hooks.tsx` for the isolated context factory approach
- **Result type**: `packages/result/` for the error handling pattern
- **React component factory**: `integrations/react/src/factories/create-component.tsx` for the `requires` + render pattern

Are there other features or patterns I should be aware of? Please provide paths to any similar forms, layouts, or backend logic.

---

## Visual Assets Request

Do you have any design mockups, wireframes, or screenshots that could help guide the development?

If yes, please place them in: `specs/acl/planning/visuals/`

Use descriptive file names like:

- `policy-tree-diagram.png`
- `role-hierarchy-wireframe.png`
- `can-component-mockup.png`
- `audit-trail-ui.png`
- `guard-flow-diagram.png`

Please answer the questions above and let me know if you've added any visual files or can point to similar existing features.
