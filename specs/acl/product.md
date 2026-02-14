# @hex-di/guard -- Product Specification

## Name Decision

**Recommended name: `@hex-di/guard`**

| Candidate   | Pros                                                                                                                                                                                                                                                                                                      | Cons                                                                                                                                                                                                |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `acl`       | Familiar term                                                                                                                                                                                                                                                                                             | ACL specifically means Access Control Lists -- a flat allow/deny model. This lib does RBAC + ABAC, which are strictly broader paradigms. Misleading.                                                |
| `auth`      | Short, well-known                                                                                                                                                                                                                                                                                         | Ambiguous. "auth" conflates authentication (identity verification) with authorization (permission checks). This library only does authorization. Every search for "auth" issues will surface noise. |
| `authz`     | Disambiguates from authn                                                                                                                                                                                                                                                                                  | Abbreviation is jargon. Unfamiliar to developers outside the IAM space. Looks like a typo of "auth".                                                                                                |
| `access`    | Descriptive                                                                                                                                                                                                                                                                                               | Generic. Could mean network access, file access, API access. Doesn't convey the rule-evaluation nature of the library.                                                                              |
| `policy`    | Accurate for ABAC                                                                                                                                                                                                                                                                                         | Narrow. Policies are one mechanism among roles, permissions, and combinators. The library is more than just policies.                                                                               |
| `permit`    | Action-oriented                                                                                                                                                                                                                                                                                           | Sounds like a noun (a permit). Could confuse with license/permit concepts. Also an existing library name in other ecosystems.                                                                       |
| `shield`    | Evocative                                                                                                                                                                                                                                                                                                 | Marketing-flavored. Doesn't fit the technical, noun-based convention of the monorepo (core, graph, runtime, logger, tracing, query, store, saga, flow).                                             |
| **`guard`** | **Short. Noun-based. Fits the hex-di naming convention perfectly. Accurately describes what the library does: it guards access to operations and resources. Already a familiar concept in frameworks (route guards, auth guards, NestJS guards). Neutral enough to cover RBAC, ABAC, and future models.** | Minor overlap with the TypeScript type guard concept, but context makes the distinction clear.                                                                                                      |

The hex-di monorepo uses short, singular nouns: `core`, `graph`, `runtime`, `result`, `logger`, `tracing`, `query`, `store`, `saga`, `flow`. The name `guard` follows this pattern exactly. It communicates the intent -- guarding access -- without implying a specific authorization model.

---

## Mission

### What problem does this solve?

Authorization logic in TypeScript applications suffers from three pervasive problems:

1. **Scattered checks.** Permission logic lives in route handlers, service methods, React components, and middleware -- spread across the entire codebase with no single source of truth. When requirements change, developers hunt through dozens of files to update checks, inevitably missing some.

2. **Opaque, untestable rules.** Authorization decisions are encoded as imperative callback functions (`(user, resource) => boolean`). These functions cannot be serialized, inspected, composed algebraically, or explained to auditors. Testing them requires mocking the entire function body rather than asserting on declarative structure.

3. **No container integration.** Existing authorization libraries (casl, casbin, accesscontrol) operate as standalone singletons. They have no concept of DI scopes, lifetime management, or container-driven resolution. In hex-di applications, this means authorization bypasses the entire architecture -- no tracing, no inspection, no scope-per-request isolation.

### Why does this belong in hex-di?

Authorization is a cross-cutting concern that touches every layer of an application. In hexagonal architecture, it belongs at the boundary between driving adapters (inbound ports) and the application core. The hex-di container already provides the resolution hooks, scope lifecycle, and inspection infrastructure needed to make authorization a first-class citizen of the dependency graph rather than an afterthought bolted on at the middleware layer.

`@hex-di/guard` treats permissions, roles, and policies as the same kind of typed, branded, compile-time-validated tokens that hex-di uses for ports and adapters. Authorization becomes part of the graph -- visible in inspection, traceable in spans, and scoped to requests.

### Pitch

`@hex-di/guard` is an authorization library for hex-di that provides compile-time-safe RBAC and ABAC through branded permission tokens, declarative policy combinators, and first-class container integration -- making authorization visible, testable, and architecturally sound.

---

## Target Audience

### Primary Users

- **TypeScript application developers** building multi-role systems (SaaS products, admin panels, enterprise tools) who already use or are adopting hex-di for dependency injection. They need authorization that integrates with their container, not a standalone library that fights it.

- **Frontend teams using React with hex-di** who need component-level authorization (show/hide UI based on permissions) with the same type safety they get from `usePort`. They want `<Can>` and `<Cannot>` gates, not manual `if (user.role === 'admin')` scattered through JSX.

- **Backend teams building APIs with hex-di** who need request-scoped authorization that participates in the container lifecycle. They want guard adapters that intercept resolution, not middleware that duplicates the service layer's knowledge of business rules.

### Secondary Users

- **Security auditors and compliance reviewers** who benefit from policies being serializable data structures rather than opaque functions. They can inspect the policy graph, export it as JSON, and verify that the authorization model matches requirements without reading application code.

- **DevTools users** who want to see authorization decisions in the hex-di inspector -- which policies were evaluated, which passed, which failed, and why.

---

## Competitive Landscape

### Existing Libraries

| Library                       | Model         | Approach                                                                         | Weakness from hex-di perspective                                                                                                                                             |
| ----------------------------- | ------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **casl**                      | ABAC          | Defines abilities as `can(action, subject)` rules. Runtime evaluation.           | Rules are callback-based, not serializable. No DI integration. Global `Ability` instance -- no scope isolation. React integration exists but is not type-safe with DI.       |
| **casbin**                    | RBAC/ABAC/ACL | Policy files (CSV/text) with a model definition language. Powerful and flexible. | Completely external to TypeScript's type system. Policies are strings, not types. No compile-time validation. Heavy runtime with its own DSL interpreter. Zero DI awareness. |
| **accesscontrol**             | RBAC          | Fluent builder: `ac.grant('admin').readAny('video')`.                            | RBAC only, no attribute-based policies. Unmaintained. No TypeScript-first design. No DI integration.                                                                         |
| **oso** (deprecated)          | Polar DSL     | Separate policy language compiled to rules.                                      | Discontinued. Required learning a custom language. No TypeScript type integration.                                                                                           |
| **@nestjs/passport + guards** | Middleware    | NestJS-specific decorators and guard classes.                                    | Framework-locked to NestJS. Imperative guard classes, not declarative policies.                                                                                              |

### How @hex-di/guard Differs

1. **Policies are data, not callbacks.** Policies are discriminated unions -- plain objects with a `kind` field. They can be serialized to JSON, stored in databases, transmitted over the wire, and reconstructed without `eval`. This makes them inspectable, auditable, and testable by structure rather than by execution.

2. **Compile-time permission tokens.** Permissions are branded nominal types created with the same `createPort`-style factory pattern as hex-di ports. A typo in a permission name is a type error, not a silent runtime failure.

3. **Algebraic combinators.** `allOf`, `anyOf`, `not`, `hasPermission`, `hasRole`, `hasAttribute` compose into arbitrarily complex policies while remaining serializable data. No function nesting, no closure capture.

4. **Container-native.** Guard adapters plug into the hex-di graph. Authorization participates in resolution hooks, shows up in tracing spans, respects scope boundaries, and can be overridden in child containers for testing. The subject (the "who" being authorized) is resolved from the container scope, not from a global variable.

5. **React integration follows hex-di patterns.** `<Can>` and `<Cannot>` are components. `useCan` and `usePolicy` are hooks. `SubjectProvider` sets the authorization subject in React context. All created via the same factory pattern as `createTypedHooks`.

---

## Non-Goals

The following are explicitly out of scope for `@hex-di/guard`:

- **Authentication.** This library does not handle login, session management, token validation, OAuth flows, or identity verification. It assumes a subject (user/entity) has already been authenticated and is available in the container scope.

- **Persistence of policies.** The library defines policy data structures and evaluation. Storing policies in a database, loading them from a config file, or syncing them with a remote policy server is the application's responsibility. The serializable nature of policies makes this straightforward but it is not a built-in feature.

- **Network-level enforcement.** This library does not provide HTTP middleware, WebSocket interceptors, or GraphQL directives. It provides guard adapters that the application wires into its inbound port layer. Framework-specific glue (Express middleware, Hono middleware, tRPC middleware) may appear in separate integration packages but is not part of the core library.

- **Multi-tenancy.** Tenant isolation is an application-level concern handled by hex-di scopes. `@hex-di/guard` provides the authorization primitives; the application composes them with its tenant model.

- **Admin UI for policy management.** No built-in dashboard. Policies are code (or serialized data loaded at startup). A visual policy editor could be built on top of the serializable policy format but is not part of this library.

- **Encryption or data protection.** This library decides "can this subject do this action?" -- it does not encrypt fields, mask data, or enforce data-at-rest policies.

---

## Technical Design Principles

These principles follow directly from the hex-di architecture:

1. **Zero dependencies.** The core `@hex-di/guard` package depends only on `@hex-di/core`. No external authorization libraries are vendored or wrapped.

2. **Branded nominal tokens.** Permissions and roles are branded types, following the same `Symbol.for()` + phantom brand pattern used by `Port` and `Adapter` in `@hex-di/core`. Two permissions with the same string name but created separately are distinct types.

3. **Discriminated unions for policies.** Every policy node has a `readonly kind` field. The full policy type is a union: `HasPermission | HasRole | HasAttribute | AllOf | AnyOf | Not`. Pattern matching via `switch (policy.kind)` is exhaustive. No callbacks, no `evaluate` methods on objects.

4. **Result type for evaluation.** Policy evaluation returns `Result<PolicyDecision, PolicyError>`, not a boolean. The decision carries the full evaluation trace -- which sub-policies passed, which failed, and why. This enables detailed audit logging and debugging.

5. **Container integration via resolution hooks.** Guard adapters use the `beforeResolve` hook to intercept resolution and enforce policies. This means authorization is checked at the DI level, not at the route level. A guarded port cannot be resolved without passing its policy.

6. **Scope-per-request subject.** The authorization subject (user, service account, API key) is provided via a scoped adapter. Each request scope gets its own subject. No global mutable state.

---

## Roadmap

1. [ ] Permission tokens -- Create `permission<TName>()` factory that produces branded nominal permission tokens using the same `Symbol.for()` + phantom brand pattern as `@hex-di/core` ports. Include `isPermission` type guard and `InferPermissionName` utility type. `S`
2. [ ] Role tokens with inheritance -- Create `role<TName>()` factory for branded role tokens. Support a `permissions` array on each role and an `inherits` array for role hierarchy. Provide `flattenPermissions(role)` that resolves the full permission set including inherited roles. `S`
3. [ ] Policy data types -- Define the discriminated union policy type: `HasPermission`, `HasRole`, `HasAttribute`, `AllOf`, `AnyOf`, `Not`. Each variant is a plain frozen object with a `kind` field. Include `isPolicy` type guard and JSON serialization round-trip support. `M`
4. [ ] Policy combinators -- Implement `hasPermission()`, `hasRole()`, `hasAttribute()`, `allOf()`, `anyOf()`, `not()` combinator functions that construct policy data. Ensure combinators compose (a combinator can take other combinators as arguments) and the result is always serializable. `S`
5. [ ] Policy evaluator -- Implement `evaluate(policy, subject): Result<PolicyDecision, PolicyError>` pure function. The `PolicyDecision` includes the verdict (allow/deny), the full evaluation tree (which sub-policies matched), and timing. The `Subject` type defines `permissions`, `roles`, and `attributes` as readonly sets. `M`
6. [ ] Subject port and scoped adapter -- Define `SubjectPort` as an outbound port with scoped lifetime. Create `createSubjectAdapter` factory that produces a scoped adapter resolving the current subject. This enables per-request subject injection via hex-di scopes. `S`
7. [ ] Guard adapter -- Create `createGuardAdapter` that wraps any existing adapter with a policy check. The guard adapter uses `beforeResolve` hooks to intercept resolution, evaluate the policy against the scoped subject, and return `Err(AccessDeniedError)` on denial. Guarded ports appear in the dependency graph with their policy metadata. `L`
8. [ ] Policy inspection and serialization -- Implement `serializePolicy(policy): JSON` and `deserializePolicy(json): Result<Policy, ParseError>` for policy persistence. Add `explainPolicy(policy, subject): string` that produces a human-readable explanation of why a policy passed or failed. Integrate with the hex-di inspector so guard decisions appear in container snapshots. `M`
9. [ ] React integration: SubjectProvider -- Create `SubjectProvider` component that injects the authorization subject into React context, making it available to child components. Follows the factory pattern from `@hex-di/react` (`createGuardHooks()`). `S`
10. [ ] React integration: Can/Cannot gates -- Create `<Can permission={...}>` and `<Cannot permission={...}>` conditional rendering components. Create `<Policy policy={...}>` component for complex policy-based gates. Components accept `fallback` prop for unauthorized state. `S`
11. [ ] React integration: useCan and usePolicy hooks -- Create `useCan(permission)` hook returning a boolean and `usePolicy(policy)` hook returning the full `PolicyDecision`. Both hooks resolve the subject from context and evaluate synchronously. Include `useSubject()` hook for accessing the raw subject. `S`
12. [ ] Guard DevTools integration -- Expose guard evaluation events through the hex-di inspector protocol (`LibraryInspector`). Each guard check emits an event with policy, subject summary, decision, and timing. Events appear in the unified snapshot alongside container and tracing data. `M`

> Notes
>
> - Items 1-5 form the core authorization engine with zero container dependency (pure `@hex-di/core` peer dep only)
> - Items 6-7 integrate with `@hex-di/runtime` for container-native authorization
> - Items 8 adds persistence and inspection capabilities
> - Items 9-11 provide the React layer, depending on `@hex-di/react`
> - Item 12 connects to the existing DevTools/inspector infrastructure
> - Each item is independently testable and shippable
