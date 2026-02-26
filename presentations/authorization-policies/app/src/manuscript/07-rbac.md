# 07 — Role-Based Access Control (RBAC)

## Core Concept

Users are assigned to roles, and roles carry permissions. Access is determined by role membership, not individual identity.

## How It Works

```
Users → Roles → Permissions

alice → [admin]     → [read, write, delete, manage_users]
bob   → [editor]    → [read, write]
carol → [viewer]    → [read]
dave  → [editor, reviewer] → [read, write, approve]
```

## Role Hierarchy

```
         admin
        /     \
    manager   auditor
      |
    editor
      |
    viewer
```

Higher roles inherit all permissions of lower roles.

## Real-World Examples

- **AWS IAM**: Roles attached to users/services
- **Kubernetes**: ClusterRole / Role bindings
- **Database systems**: PostgreSQL roles, MySQL privileges
- **Enterprise apps**: Salesforce profiles, Jira project roles

## Code Example

```typescript
interface Role {
  name: string;
  permissions: Set<string>;
  parents: Role[]; // Role hierarchy
}

function effectivePermissions(role: Role): Set<string> {
  const perms = new Set(role.permissions);
  for (const parent of role.parents) {
    for (const p of effectivePermissions(parent)) {
      perms.add(p);
    }
  }
  return perms;
}

function hasPermission(userRoles: Role[], action: string): boolean {
  return userRoles.some(role => effectivePermissions(role).has(action));
}
```

## The Role Explosion Problem

- 10 departments x 5 seniority levels x 8 resource types = 400 roles
- Each unique combination needs its own role
- Roles become user-specific, defeating the purpose
- RBAC alone cannot express: "Editors can edit documents in THEIR department"

## Strengths

- Intuitive and widely understood
- Simplifies administration (manage roles, not individual access)
- Good audit trail (which roles have which permissions)
- NIST standardized (well-defined model)

## Weaknesses

- Role explosion in complex organizations
- Cannot express contextual/attribute-based rules
- Static — no runtime conditions (time, location, risk)
- Coarse-grained — all-or-nothing per role
