# @hex-di/guard

Compile-time-safe authorization for the HexDI ecosystem. Permissions and roles are branded nominal tokens, policies are serializable discriminated unions composed through algebraic combinators, and enforcement integrates directly with the HexDI dependency graph.

## Features

- **Permission tokens** -- branded nominal tokens created with `Symbol.for()` + phantom brands
- **Role DAG** -- role inheritance with automatic permission flattening and cycle detection
- **Policy combinators** -- algebraic composition (`allOf`, `anyOf`, `not`, `hasPermission`, `hasRole`, `hasAttribute`)
- **Synchronous evaluator** -- pure `evaluate()` function returning `Decision` with full trace
- **Guard adapter** -- `enforcePolicy()` wraps adapters with policy enforcement at resolution time
- **Serialization** -- policies are JSON-serializable data, not callbacks
- **Port gate hook** -- coarse-grained and fine-grained authorization at the container level
- **GxP compliance** -- audit trail, electronic signatures, write-ahead log, circuit breaker

For detailed walkthroughs with architecture diagrams, see the [documentation](./docs/).

## Installation

```bash
pnpm add @hex-di/guard
```

Dependencies: `@hex-di/core`, `@hex-di/result`

## Quick Start

### With DI Container

```typescript
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import {
  createPermission,
  createRole,
  hasPermission,
  evaluate,
  enforcePolicy,
} from "@hex-di/guard";

// Define permissions and roles
const ReadUsers = createPermission("ReadUsers");
const WriteUsers = createPermission("WriteUsers");
const AdminRole = createRole("Admin", { permissions: [ReadUsers, WriteUsers] });

// Evaluate a policy
const policy = hasPermission(ReadUsers);
const decision = evaluate(policy, subject);
// decision.granted === true | false

// Guard an adapter in the DI graph
const GuardedUserAdapter = enforcePolicy(UserAdapter, {
  policy: hasPermission(ReadUsers),
  subjectPort: SubjectProviderPort,
});
```

### Standalone

```typescript
import {
  createPermission,
  createRole,
  hasPermission,
  hasRole,
  allOf,
  evaluate,
} from "@hex-di/guard";

const Read = createPermission("Read");
const Write = createPermission("Write");
const Editor = createRole("Editor", { permissions: [Read, Write] });

const subject = {
  id: "user-1",
  permissions: new Set([Read]),
  roles: new Set([Editor]),
  attributes: {},
};

const policy = allOf(hasPermission(Read), hasRole(Editor));
const decision = evaluate(policy, subject);
// decision.granted === true
// decision.trace contains evaluation path
```

## Permissions

Permission tokens are branded nominal values. Two permissions with the same name are identity-equal across module boundaries via `Symbol.for()`.

```typescript
import { createPermission, createPermissionGroup } from "@hex-di/guard";

// Single permission
const ReadUsers = createPermission("ReadUsers");
const WriteUsers = createPermission("WriteUsers");
const DeleteUsers = createPermission("DeleteUsers");

// Permission group for convenient bundling
const UserPermissions = createPermissionGroup("UserPermissions", {
  read: ReadUsers,
  write: WriteUsers,
  delete: DeleteUsers,
});
```

## Roles

Roles carry a set of permissions and support DAG-based inheritance with automatic permission flattening. Circular inheritance is detected at construction time.

```typescript
import { createRole } from "@hex-di/guard";

const ViewerRole = createRole("Viewer", {
  permissions: [ReadUsers],
});

const EditorRole = createRole("Editor", {
  permissions: [WriteUsers],
  inherits: [ViewerRole], // inherits ReadUsers from Viewer
});

const AdminRole = createRole("Admin", {
  permissions: [DeleteUsers],
  inherits: [EditorRole], // inherits ReadUsers + WriteUsers
});
```

Permissions flatten automatically -- `Admin` receives all permissions from the entire chain without explicit declaration.

| Role   | Direct Permissions | Flattened Permissions                    |
| ------ | ------------------ | ---------------------------------------- |
| Viewer | `ReadUsers`        | `ReadUsers`                              |
| Editor | `WriteUsers`       | `WriteUsers`, `ReadUsers`                |
| Admin  | `DeleteUsers`      | `DeleteUsers`, `WriteUsers`, `ReadUsers` |

## Policies

Policies are discriminated unions composed through algebraic combinators. Every policy is serializable JSON data.

### Combinators

```typescript
import { hasPermission, hasRole, hasAttribute, allOf, anyOf, not } from "@hex-di/guard";

// Leaf policies
const canRead = hasPermission(ReadUsers);
const isAdmin = hasRole(AdminRole);
const isActive = hasAttribute("status", "active");

// Composed policies
const canEdit = allOf(hasPermission(WriteUsers), isActive);
const canAccess = anyOf(isAdmin, canRead);
const notSuspended = not(hasAttribute("status", "suspended"));
```

| Combinator                 | Description                    |
| -------------------------- | ------------------------------ |
| `hasPermission(p)`         | Subject has permission `p`     |
| `hasRole(r)`               | Subject has role `r`           |
| `hasAttribute(key, value)` | Subject attribute matches      |
| `allOf(...policies)`       | All policies must grant        |
| `anyOf(...policies)`       | At least one policy must grant |
| `not(policy)`              | Inverts the decision           |

## Evaluation

The `evaluate()` function is pure and synchronous. It returns a `Decision` with the grant/deny result and a full `EvaluationTrace` for debugging and audit.

```typescript
import { evaluate } from "@hex-di/guard";

const decision = evaluate(policy, subject);

if (decision.granted) {
  // Access allowed
} else {
  // decision.trace describes why access was denied
}
```

For policies that require async attribute resolution:

```typescript
import { evaluateAsync } from "@hex-di/guard";

const decision = await evaluateAsync(policy, subject, {
  attributeResolver: async key => fetchAttribute(key),
});
```

## Guard Adapter

`enforcePolicy()` wraps an existing adapter with policy enforcement. When the guarded adapter is resolved from the container, the subject is resolved from a scoped adapter, the policy is evaluated, and denial produces an `AccessDeniedError`.

```typescript
import { enforcePolicy } from "@hex-di/guard";

const GuardedUserAdapter = enforcePolicy(UserAdapter, {
  policy: hasPermission(ReadUsers),
  subjectPort: SubjectProviderPort,
});

// Register in graph instead of UserAdapter
const graph = GraphBuilder.create().add(GuardedUserAdapter).build();
```

## Port Gate Hook

For coarse-grained authorization at the container level, `createPortGateHook` and `createRoleGate` restrict access to entire ports.

```typescript
import { createPortGateHook, createRoleGate } from "@hex-di/guard";

// Block resolution of AdminPort unless subject has AdminRole
const gateHook = createPortGateHook({
  gates: [{ port: AdminPort, policy: hasRole(AdminRole) }],
  subjectPort: SubjectProviderPort,
});

// Or use the role-based shorthand
const roleGate = createRoleGate({
  gates: [{ port: AdminPort, role: AdminRole }],
  subjectPort: SubjectProviderPort,
});
```

## Serialization

Policies are plain data and can be serialized to JSON, deserialized back, and explained as human-readable strings.

```typescript
import { serializePolicy, deserializePolicy, explainPolicy } from "@hex-di/guard";

const json = serializePolicy(policy);
// Store in database, send over network, etc.

const restored = deserializePolicy(json);
// Structurally identical to original

const explanation = explainPolicy(policy);
// "all of: has permission 'ReadUsers', has role 'Admin'"
```

## GxP Infrastructure

For regulated environments, the guard package includes audit trail, write-ahead log, circuit breaker, meta-audit, and decommissioning utilities.

```typescript
import {
  createWriteAheadLog,
  createCircuitBreaker,
  createScopeDisposalVerifier,
  detectClockDrift,
  enforceRetention,
  createMetaAuditEntry,
  archiveAuditTrail,
  createDecommissioningChecklist,
} from "@hex-di/guard";
```

## API Reference

### Tokens

| Export                             | Kind     | Description                                             |
| ---------------------------------- | -------- | ------------------------------------------------------- |
| `createPermission(name)`           | function | Create a branded permission token                       |
| `createPermissionGroup(name, map)` | function | Bundle permissions into a named group                   |
| `createRole(name, config)`         | function | Create a role with permissions and optional inheritance |

### Policy Combinators

| Export                     | Kind     | Description                            |
| -------------------------- | -------- | -------------------------------------- |
| `hasPermission(p)`         | function | Leaf policy: subject has permission    |
| `hasRole(r)`               | function | Leaf policy: subject has role          |
| `hasAttribute(key, value)` | function | Leaf policy: subject attribute matches |
| `allOf(...policies)`       | function | All sub-policies must grant            |
| `anyOf(...policies)`       | function | At least one sub-policy must grant     |
| `not(policy)`              | function | Invert a policy decision               |

### Evaluation

| Export                                 | Kind     | Description                                |
| -------------------------------------- | -------- | ------------------------------------------ |
| `evaluate(policy, subject)`            | function | Synchronous policy evaluation              |
| `evaluateAsync(policy, subject, opts)` | function | Async evaluation with attribute resolution |
| `Decision`                             | type     | Evaluation result (`granted`, `trace`)     |
| `EvaluationTrace`                      | type     | Detailed evaluation path                   |

### Guard

| Export                           | Kind     | Description                           |
| -------------------------------- | -------- | ------------------------------------- |
| `enforcePolicy(adapter, config)` | function | Wrap adapter with policy enforcement  |
| `createGuardGraph(config)`       | function | Create guard-specific graph fragment  |
| `createGuardHealthCheck()`       | function | Health check for guard infrastructure |
| `AccessDeniedError`              | class    | Thrown when policy denies access      |
| `createNoopAuditTrailAdapter()`  | function | No-op audit trail for non-GxP use     |

### Hooks

| Export                       | Kind     | Description                             |
| ---------------------------- | -------- | --------------------------------------- |
| `createPortGateHook(config)` | function | Coarse-grained port-level authorization |
| `createRoleGate(config)`     | function | Role-based port gate shorthand          |

### Serialization

| Export                    | Kind     | Description                       |
| ------------------------- | -------- | --------------------------------- |
| `serializePolicy(policy)` | function | Policy to JSON                    |
| `deserializePolicy(json)` | function | JSON to policy                    |
| `explainPolicy(policy)`   | function | Human-readable policy description |

### Subject

| Export                | Kind | Description                                            |
| --------------------- | ---- | ------------------------------------------------------ |
| `AuthSubject`         | type | Subject interface (id, permissions, roles, attributes) |
| `SubjectProviderPort` | port | Port for resolving current subject                     |

### GxP Infrastructure

| Export                              | Kind     | Description                            |
| ----------------------------------- | -------- | -------------------------------------- |
| `createWriteAheadLog()`             | function | WAL for audit durability               |
| `createCircuitBreaker(opts)`        | function | Circuit breaker for audit trail writes |
| `createScopeDisposalVerifier()`     | function | Verify scope cleanup                   |
| `detectClockDrift(a, b)`            | function | Clock drift detection                  |
| `enforceRetention(entries, policy)` | function | Apply retention policy                 |
| `createMetaAuditEntry(data)`        | function | Meta-audit entry creation              |
| `archiveAuditTrail(entries, opts)`  | function | Archive audit trail data               |
| `createDecommissioningChecklist()`  | function | System decommissioning checklist       |

### Inspection

| Export           | Kind  | Description                       |
| ---------------- | ----- | --------------------------------- |
| `GuardInspector` | class | Runtime inspection of guard state |

### Error Types

| Export                         | Kind  | Description                |
| ------------------------------ | ----- | -------------------------- |
| `AccessDeniedError`            | class | Policy denied access       |
| `CircularRoleInheritanceError` | type  | Circular role DAG detected |
| `PolicyEvaluationError`        | type  | Evaluation failed          |
| `PolicyDeserializationError`   | type  | Invalid serialized policy  |
| `AuditTrailWriteError`         | type  | Audit write failed         |
| `SignatureError`               | type  | Electronic signature error |

## Related Packages

| Package                    | Description                                                                             |
| -------------------------- | --------------------------------------------------------------------------------------- |
| `@hex-di/guard-testing`    | Test utilities: `createTestSubject`, `testPolicy`, custom matchers, memory adapters     |
| `@hex-di/guard-react`      | React integration: `SubjectProvider`, `Can`/`Cannot`, `useCan`/`usePolicy`/`useSubject` |
| `@hex-di/guard-validation` | Programmatic IQ/OQ/PQ runners and traceability matrix generation                        |

## License

MIT
