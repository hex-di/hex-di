# @hex-di/guard -- Agent-OS Specification

## Goal

`@hex-di/guard` is an authorization library for hex-di that provides compile-time-safe RBAC and ABAC through branded permission tokens, declarative policy combinators, and first-class container integration -- making authorization visible, testable, and architecturally sound.

---

## User Stories

1. **As a TypeScript developer**, I want to define permissions as branded tokens so that typos are caught at compile time.

2. **As a backend developer**, I want to guard DI adapter resolution with policies so that unauthorized access is blocked at the container level.

3. **As a React developer**, I want `<Can>` / `<Cannot>` components and `useCan()` hooks to conditionally render based on the user's permissions.

4. **As a security auditor**, I want policies to be serializable JSON so that I can export, inspect, and verify the authorization model without reading application code.

5. **As a test engineer**, I want to evaluate policies in isolation (without a container) and assert on decisions using custom matchers like `toAllow()` and `toDeny()`.

---

## Requirements

### Core Engine (Roadmap items 1--5)

- **Permission tokens.** `createPermission({ resource, action })` produces branded nominal tokens using `Symbol.for()` + phantom brand. Structural compatibility: two `Permission<'user', 'read'>` from different modules are the same type. Includes `isPermission` type guard, `InferResource`, `InferAction`, and `FormatPermission` utility types. `createPermissionGroup(resource, actions)` provides batch creation.

- **Role tokens with DAG inheritance.** `createRole({ name, permissions, inherits })` produces branded role tokens. Roles form a DAG (directed acyclic graph) -- a role may inherit from multiple parents. `flattenPermissions(role)` eagerly resolves the full permission set at creation time using depth-limited recursion (Peano counter, max 20). Circular inheritance is detected at both compile time (`ValidateRoleInheritance` conditional type) and runtime (visited-set + depth limit returning `Result`).

- **Policy data types.** Discriminated union on `kind` field: `HasPermission`, `HasRole`, `HasAttribute`, `AllOf`, `AnyOf`, `Not`. Every variant is a plain frozen object. All policies are JSON-serializable -- no function escape hatch in v1. `HasAttribute` uses a closed matcher DSL rather than callbacks.

- **Policy combinators.** `hasPermission()`, `hasRole()`, `hasAttribute()`, `allOf()`, `anyOf()`, `not()` construct policy data. Combinators compose (accept other combinators as arguments). The result is always a frozen, serializable object. The matcher DSL for `hasAttribute` supports: `eq`, `neq`, `in`, `exists` with reference types `subject(path)`, `resource(path)`, `literal(value)`.

- **Policy evaluator.** `evaluate(policy, context)` is a pure, strictly synchronous function. Returns `Result<Decision, PolicyEvaluationError>` where `Decision` is an `Allow | Deny` discriminated union (not Result -- a Deny is a valid outcome, not an error). Each decision carries an `EvaluationTrace` tree recording which sub-policies were checked and their individual verdicts.

- **AuthSubject requirements.** Every `AuthSubject` must include `authenticationMethod` (a string identifying how the subject was authenticated, e.g., "oauth2", "api-key", "saml") and `authenticatedAt` (an ISO 8601 timestamp recording when authentication occurred). These fields are required for audit trail provenance and compliance reporting.

### Container Integration (Roadmap items 6--7)

- **Subject port and scoped adapter.** `SubjectProviderPort` is an outbound port with scoped lifetime. `createSubjectAdapter(factory)` produces a scoped adapter resolving the current subject per request. The subject is immutable within a scope.

- **Guard adapter.** `guard(adapter, { policy })` wraps an existing adapter with a policy check. The guarded adapter's `requires` tuple is the union of the original requires and `[PolicyEnginePort, SubjectProviderPort]`, with automatic deduplication via `AppendAclPorts`. Guard evaluation is synchronous. On denial, the factory throws `AccessDeniedError extends ContainerError`; consumers use `tryResolve()` for `Result`-based handling. Guarded ports appear in the dependency graph with policy metadata.

### Serialization and Inspection (Roadmap item 8)

- **Policy serialization.** `serializePolicy(policy)` produces JSON; `deserializePolicy(json)` returns `Result<Policy, ParseError>`. `explainPolicy(policy, subject)` produces a human-readable explanation of why a policy passed or failed. Guard decisions integrate with the hex-di inspector so they appear in container snapshots.

### React (Roadmap items 9--11)

- **SubjectProvider.** A pure React context provider. Does NOT create a DI scope. Stores the subject in React context. Accepts `Subject | null` where `null` means "subject not yet resolved."

- **Can/Cannot gates.** `<Can permission={...}>` and `<Cannot permission={...}>` for conditional rendering. Accept a `fallback` prop for the unauthorized state. `<Policy policy={...}>` for complex policy-based gates.

- **Hooks.** `useCan(permission)` returns `boolean | undefined` (three-state: `true` = allowed, `false` = denied, `undefined` = subject not loaded). `usePolicy(policy)` returns the full `Decision`. `useSubject()` returns the raw subject from context. All hooks are synchronous and created via the factory pattern (`createGuardHooks()`).

### DevTools (Roadmap item 12)

- **Inspector integration.** Guard evaluation events are exposed through the hex-di `LibraryInspector` protocol. Each guard check emits an event with policy, subject summary, decision, and timing. Events appear in the unified snapshot alongside container and tracing data.

---

## Key Design Decisions

| #   | Decision                                                                                                        | Rationale                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Library name: `@hex-di/guard`                                                                                   | Fits the hex-di short-noun convention (`core`, `graph`, `runtime`, `result`, `logger`, `tracing`, `query`, `store`, `saga`, `flow`). Communicates intent without implying a specific authorization model.                                                                                                                                                                                              |
| 2   | Permissions: structural via `Symbol.for()`, typed as `Permission<TResource, TAction>`                           | Two independently created `Permission<'user', 'read'>` must be interchangeable. Unlike Ports (nominal), permissions represent universal concepts.                                                                                                                                                                                                                                                      |
| 3   | Roles: DAG inheritance, eager flattening, depth-limited (Peano counter, max 20)                                 | Supports multi-parent inheritance (`TeamLead extends [Editor, Reviewer]`). Eager flattening avoids recursive resolution at usage sites and stays within TypeScript's recursion limits.                                                                                                                                                                                                                 |
| 4   | Policies: discriminated unions (`kind` field), serializable data, no function escape hatch in v1                | Preserves the invariant that every `Policy` is JSON-serializable. Differentiator over casl (callback-based rules). If a user needs a custom check, they compose it outside the policy tree.                                                                                                                                                                                                            |
| 5   | Matcher DSL: closed set -- `eq`, `neq`, `in`, `exists` with `subject(path)`, `resource(path)`, `literal(value)` | Minimal but extensible. Avoids building a full expression language in v1. New matcher `kind` variants can be added without breaking changes.                                                                                                                                                                                                                                                           |
| 6   | Guard evaluation: strictly synchronous                                                                          | The subject is resolved synchronously (scoped, already cached). Policy evaluation operates on in-memory data. Keeping it synchronous preserves the original adapter's lifetime semantics (async factories must be singletons, which conflicts with scoped guards).                                                                                                                                     |
| 7   | Guard throws `AccessDeniedError extends ContainerError`; `tryResolve()` returns `Result`                        | Consistent with the existing container error model (`resolve()` throws `FactoryError`, `CircularDependencyError`, etc.). Authorization denial is another resolution failure, not a new control-flow mechanism.                                                                                                                                                                                         |
| 8   | React SubjectProvider: pure React context, NOT DI scope                                                         | The subject is a business concept, not a DI scope concept. Creating a scope for authorization conflates two concerns and produces unnecessary nested scopes.                                                                                                                                                                                                                                           |
| 9   | Server SubjectProvider: scoped adapter via DI                                                                   | The existing request scope (created by the server framework) resolves `SubjectProviderPort` to the current user. Per-request isolation via hex-di's scope system.                                                                                                                                                                                                                                      |
| 10  | AuditTrailPort: Required port for guard(); NoopAuditTrail provided for non-regulated environments               | AuditTrailPort provides the guaranteed, structured audit record required for compliance. Every guard evaluation (allow and deny) records an AuditEntry with evaluationId, subjectId, authenticationMethod, policy, decision, portName, scopeId, and timestamp. NoopAuditTrail is a built-in adapter that discards entries without error, suitable for non-regulated environments or local development. |
| 11  | Dual enforcement: `guard()` = primary; `createPortGateHook()` = coarse port gate                                | `guard()` runs inside the factory with full subject+resource access. The hook runs as `beforeResolve` with no subject -- suitable only for coarse "can this port be resolved at all" gates (feature flags, kill switches). They are complementary, not overlapping.                                                                                                                                    |
| 12  | Cycle detection: mandatory visited-set + depth limit (32) in `flattenPermissions()`, returns `Result`           | Runtime role hierarchies (from databases) can contain cycles due to human error. A cycle that crashes the application is a severity-1 incident. The visited-set is trivial to implement; the depth limit catches pathological graphs.                                                                                                                                                                  |
| 13  | Decision type: `Allow                                                                                           | Deny`discriminated union (not`Result`)                                                                                                                                                                                                                                                                                                                                                                 | A `Deny` is a valid expected outcome, not an error. `Result` implies success/failure semantics that do not apply to authorization decisions. The `Result` type is reserved for operations that can actually fail (e.g., policy evaluation encountering an invalid attribute). |
| 14  | `useCan()` three-state: `boolean                                                                                | undefined` (undefined = subject not loaded)                                                                                                                                                                                                                                                                                                                                                            | Prevents flash of unauthorized content. `undefined` signals "subject not yet available" so `<Can>` can render its fallback. Follows the pattern of `useSyncExternalStore` returning `undefined` before hydration.                                                             |
| 15  | Double-guard: deduplicate requires; prefer `allOf()` composition                                                | `guard(guard(adapter, policyA), policyB)` would duplicate `PolicyEnginePort` and `SubjectProviderPort` in requires, triggering `HEX017`. The `AppendAclPorts` type deduplicates at both type and runtime level. For composing policies, `guard(adapter, allOf(policyA, policyB))` is preferred.                                                                                                        |

---

## Existing Code References

The following codebase patterns serve as direct precedents for `@hex-di/guard` implementation.

| Pattern                                                                     | Location                                                  | Relevance                                                                                                                                                                                      |
| --------------------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Port branding (`Symbol.for()`, phantom brands, `Object.freeze()`)           | `packages/core/src/ports/directed.ts`                     | Permission and Role tokens follow the same branded nominal token pattern.                                                                                                                      |
| Adapter creation (`createAdapter`, `AdapterConstraint`, `requires` tuple)   | `packages/core/src/adapters/`                             | `guard()` wraps adapters, augmenting `requires` with ACL infrastructure ports. `GuardedAdapter<A>` type transformation mirrors the adapter type system.                                        |
| Resolution hooks (`beforeResolve`, `afterResolve`, `ResolutionHookContext`) | `packages/runtime/src/resolution/hooks.ts`                | `createPortGateHook()` plugs into the existing hook system. Guard decisions emit events through `afterResolve`.                                                                                |
| Container instrumentation (`instrumentContainer`, span creation)            | `packages/tracing/src/instrumentation/container.ts`       | Guard DevTools integration follows the same pattern: wrap container behavior, emit events through the inspector protocol.                                                                      |
| React factory pattern (`createTypedHooks`, isolated context)                | `integrations/react/src/factories/create-typed-hooks.tsx` | `createGuardHooks()` follows this pattern for `useCan`, `usePolicy`, `useSubject`.                                                                                                             |
| Memory adapters (`MemoryTracer`, `MemoryLogger`)                            | `packages/tracing/src/adapters/memory/tracer.ts`          | `MemoryPolicyEngine` and `createMemoryAuditTrail` follow the same pattern: implement the production interface, expose `getEntries()`, `clear()`, `findEntry()` for test assertions.            |
| Result-testing matchers (`setupResultMatchers`, `toBeOk`, `toBeErr`)        | `packages/result-testing/src/matchers.ts`                 | `setupGuardMatchers()` follows the same pattern: `expect.extend()`, `declare module "vitest"` augmentation, `toAllow()`, `toDeny()`, `toDenyWith()`, `toHaveEvaluated()`.                      |
| Error codes (`NumericErrorCode`, `ERROR[HEXxxx]:` format)                   | `packages/core/src/errors/codes.ts`                       | Guard error codes use the `ACL` prefix: `ACL001` (circular inheritance), `ACL003` (evaluation exception), `ACL006` (subject provider not configured), `ACL007` (policy engine not configured). |

---

## Out of Scope

The following are explicitly excluded from `@hex-di/guard`:

- **Authentication.** Login, session management, token validation, OAuth flows, identity verification. The library assumes a subject has already been authenticated.
- **Persistence.** Storing policies in databases, loading from config files, syncing with remote policy servers. The serializable policy format makes this straightforward but it is not built in.
- **Network-level enforcement.** HTTP middleware, WebSocket interceptors, GraphQL directives. Framework-specific glue may appear in separate integration packages.
- **Multi-tenancy.** Tenant isolation is handled by hex-di scopes. The library provides authorization primitives; the application composes them with its tenant model.
- **Admin UI.** No built-in dashboard for policy management. Policies are code or serialized data loaded at startup.
- **Encryption / data protection.** The library decides "can this subject do this action?" -- it does not encrypt fields, mask data, or enforce data-at-rest policies.

---

## Packages

| Package       | npm Name                | Location                    | Description                                                                                                                                                                                                                                                          |
| ------------- | ----------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| guard         | `@hex-di/guard`         | `packages/guard/`           | Core authorization library: permission/role tokens, policy data types, combinators, evaluator, guard adapter, subject port, serialization, inspector integration, `AuditTrailPort`, `NoopAuditTrail`. Zero dependencies beyond `@hex-di/core`.                       |
| guard-testing | `@hex-di/guard-testing` | `packages/guard-testing/`   | Test utilities: `createTestSubject`, `testPolicy`, `testGuard`, `setupGuardMatchers` (toAllow/toDeny/toDenyWith/toHaveEvaluated), `MemoryPolicyEngine`, `StaticSubjectProvider`, `MemoryAuditTrail`, `createTestGuardWrapper`. Peer deps: `@hex-di/guard`, `vitest`. |
| react-guard   | `@hex-di/react-guard`   | `integrations/react-guard/` | React integration: `SubjectProvider`, `<Can>`, `<Cannot>`, `<Policy>`, `useCan`, `usePolicy`, `useSubject`, `createGuardHooks`. Peer deps: `@hex-di/guard`, `@hex-di/react`, `react`.                                                                                |

---

## Formal Specification Reference

See `spec/guard/README.md` for the full multi-file specification covering type definitions, evaluation semantics, container integration protocol, React component contracts, serialization format, and error catalog.
