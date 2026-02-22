# Port Gate Hooks

Port gate hooks provide infrastructure-level authorization at the container level. They operate **before** subject-aware guard enforcement and are designed for coarse-grained access control.

## `createPortGateHook()`

Creates a resolution hook that intercepts port resolution and evaluates a policy before allowing the resolution to proceed.

```typescript
import { createPortGateHook } from "@hex-di/guard";

const gateHook = createPortGateHook({
  gates: [
    { port: AdminPort, policy: hasRole(AdminRole) },
    { port: AuditPort, policy: hasPermission(ViewAudit) },
  ],
  subjectPort: SubjectProviderPort,
});
```

Register the hook with the container:

```typescript
const container = createContainer(graph, {
  hooks: [gateHook],
});
```

When any gated port is resolved, the hook:

1. Resolves the current subject from `SubjectProviderPort`
2. Evaluates the gate's policy against the subject
3. Allows resolution to proceed if the policy grants access
4. Throws `PortGatedError` if the policy denies access

## `createRoleGate()`

A shorthand for the common case of gating ports by role.

```typescript
import { createRoleGate } from "@hex-di/guard";

const roleGate = createRoleGate({
  gates: [
    { port: AdminPort, role: AdminRole },
    { port: SuperAdminPort, role: SuperAdminRole },
  ],
  subjectPort: SubjectProviderPort,
});
```

This is equivalent to:

```typescript
const roleGate = createPortGateHook({
  gates: [
    { port: AdminPort, policy: hasRole(AdminRole) },
    { port: SuperAdminPort, policy: hasRole(SuperAdminRole) },
  ],
  subjectPort: SubjectProviderPort,
});
```

## Port Gates vs Guard Enforcement

| Aspect          | Port Gate Hooks          | Guard Enforcement (`enforcePolicy`) |
| --------------- | ------------------------ | ----------------------------------- |
| **Level**       | Container infrastructure | Individual adapter                  |
| **Granularity** | Entire port              | Per-adapter, per-method             |
| **Timing**      | Before resolution starts | During resolution                   |
| **Audit**       | No audit trail           | Full audit trail                    |
| **Error type**  | `PortGatedError`         | `AccessDeniedError`                 |
| **Use case**    | Block entire subsystems  | Fine-grained authorization          |

Port gates are best for broad access control ("only admins can resolve anything from the admin subsystem"), while guard enforcement is for fine-grained policies ("users can read their own data but not others'").

## `PortGatedError`

Thrown when a port gate blocks resolution.

```typescript
type PortGatedError = {
  readonly _tag: "PortGatedError";
  readonly portName: string;
  readonly subjectId: string;
  readonly message: string;
};
```

Unlike `AccessDeniedError` from guard enforcement, `PortGatedError` does not include the full `Decision` trace (since port gates are intentionally coarse-grained).

## Combining Gates and Guards

You can use both mechanisms together. Port gates act as a first line of defense, and guard enforcement provides fine-grained control within allowed subsystems.

```typescript
// Port gate: only staff can resolve UserPort at all
const gate = createRoleGate({
  gates: [{ port: UserPort, role: StaffRole }],
  subjectPort: SubjectProviderPort,
});

// Guard: within staff, only those with WriteUsers can modify
const GuardedUserAdapter = enforcePolicy(UserAdapter, {
  policy: hasPermission(WriteUsers),
  subjectPort: SubjectProviderPort,
});
```
