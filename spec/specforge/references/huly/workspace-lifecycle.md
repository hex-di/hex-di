# Huly — Workspace Lifecycle

**Source:** https://github.com/hcengineering/platform/tree/main/server/account, https://github.com/hcengineering/platform/tree/main/packages/core/src
**Captured:** 2026-02-28

---

## Workspace State Machine

Huly workspaces progress through a state machine with 20+ states. The lifecycle covers creation, initialization, active use, maintenance, and deletion.

### Primary States

```
                    ┌──────────────┐
                    │   PENDING    │ ← Workspace requested
                    └──────┬───────┘
                           │
                    ┌──────┴───────┐
                    │  CREATING    │ ← DB schema, indices being created
                    └──────┬───────┘
                           │
                    ┌──────┴───────┐
                    │ UPGRADING    │ ← Applying model migrations
                    └──────┬───────┘
                           │
              ┌────────────┴────────────┐
              │                         │
       ┌──────┴───────┐         ┌──────┴───────┐
       │   ACTIVE     │         │ MIGRATION    │
       │              │◄────────│ REQUIRED     │
       └──┬───┬───┬───┘         └──────────────┘
          │   │   │
    ┌─────┘   │   └─────┐
    │         │         │
┌───┴───┐ ┌──┴───┐ ┌───┴──────┐
│ARCHVD │ │MAINT │ │DISABLING │
│       │ │      │ │          │
└───────┘ └──────┘ └────┬─────┘
                        │
                 ┌──────┴───────┐
                 │  DISABLED    │
                 └──────┬───────┘
                        │
                 ┌──────┴───────┐
                 │  DELETING    │
                 └──────┬───────┘
                        │
                 ┌──────┴───────┐
                 │  DELETED     │
                 └──────────────┘
```

### All Workspace States

| State                | Description                                        |
| -------------------- | -------------------------------------------------- |
| `pending`            | Workspace creation requested, queued               |
| `creating`           | Database schema and initial data being provisioned |
| `upgrading`          | Model migrations running (version upgrade)         |
| `active`             | Fully operational, accepting connections           |
| `migration-required` | Needs migration before becoming active             |
| `maintenance`        | Temporarily unavailable for maintenance            |
| `archiving`          | Being archived (read-only transition)              |
| `archived`           | Read-only, no active connections                   |
| `disabling`          | Being disabled (pre-deletion)                      |
| `disabled`           | Disabled, no access allowed                        |
| `deleting`           | Data being purged                                  |
| `deleted`            | Fully removed                                      |
| `error`              | Creation or migration failed                       |
| `timeout`            | Operation timed out                                |
| `restoring`          | Being restored from backup                         |
| `pending-deletion`   | Marked for deletion, waiting grace period          |
| `migrating`          | Active migration in progress                       |
| `initializing`       | First-time initialization after creation           |
| `configuring`        | Plugin configuration being applied                 |
| `suspending`         | Being suspended (billing/quota)                    |
| `suspended`          | Suspended due to billing or quota                  |

---

## Identity Model

Huly uses a layered identity system to separate global accounts from workspace-specific identities:

### Identity Hierarchy

```
┌─────────────────────────────────────────────────┐
│              Global (Account Service)            │
│                                                  │
│  PersonUuid ─── Global person identity (UUID)    │
│       │                                          │
│  AccountUuid ── Account identity (UUID)          │
│       │                                          │
│  SocialId ──── External identity (email, GitHub) │
│                                                  │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────┐
│             Workspace-Local                      │
│                                                  │
│  PersonId ──── Workspace-scoped person ref       │
│       │                                          │
│  Member ────── Workspace membership record       │
│                                                  │
└─────────────────────────────────────────────────┘
```

### Identity Types

| Type          | Scope     | Format           | Purpose                                            |
| ------------- | --------- | ---------------- | -------------------------------------------------- |
| `PersonUuid`  | Global    | UUID v4          | Unique person across all workspaces                |
| `AccountUuid` | Global    | UUID v4          | Login account (may map to multiple PersonUuids)    |
| `SocialId`    | Global    | `provider:value` | External identity (e.g., `email:user@example.com`) |
| `PersonId`    | Workspace | Branded string   | Person reference within a workspace                |
| `Member`      | Workspace | Doc              | Workspace membership with role                     |

### Social Identity Resolution

```typescript
// Social IDs link external identities to platform accounts
interface SocialId {
  type: SocialIdType; // 'email' | 'github' | 'google' | 'telegram' | ...
  value: string; // The external identifier
  personUuid: PersonUuid; // Links to the global person
  verified: boolean; // Whether ownership is verified
}
```

---

## Account Role Hierarchy

Huly defines 7 role levels with hierarchical permissions:

| Level | Role            | Permissions                               |
| ----- | --------------- | ----------------------------------------- |
| 0     | `DocGuest`      | View shared documents only                |
| 1     | `Guest`         | View public spaces, limited interaction   |
| 2     | `Member`        | Full access to assigned spaces            |
| 3     | `Maintainer`    | Manage spaces, moderate content           |
| 4     | `QualifiedUser` | Extended features (controlled documents)  |
| 5     | `Admin`         | Workspace administration                  |
| 6     | `Owner`         | Full control, billing, workspace deletion |

### Role Checking

```typescript
type AccountRole =
  | "DocGuest" // 0
  | "Guest" // 1
  | "Member" // 2
  | "Maintainer" // 3
  | "QualifiedUser" // 4
  | "Admin" // 5
  | "Owner"; // 6

function hasRole(userRole: AccountRole, requiredRole: AccountRole): boolean {
  return roleLevel(userRole) >= roleLevel(requiredRole);
}
```

---

## Space-Based RBAC

Within a workspace, access control is managed through **Spaces**:

### Space Access Model

```typescript
interface Space extends Doc {
  name: string;
  private: boolean; // If true, only listed members can access
  members: PersonId[]; // Users with access (when private)
  owners: PersonId[]; // Users who can manage the space
  type?: Ref<SpaceType>; // SpaceType defines available roles
}
```

### SpaceType / Role / Permission System

```typescript
// SpaceType defines what roles are available in a space
interface SpaceType extends Doc {
  name: string;
  roles: Ref<Role>[]; // Available roles in this space type
  targetClass: Ref<Class<Space>>; // What kind of space this type applies to
}

// Role defines a named permission set
interface Role extends Doc {
  name: string;
  permissions: Permission[]; // What this role can do
}

// Permission is a specific action that can be granted
type Permission = "create" | "update" | "delete" | "manage-members" | "archive" | "configure";
// ... domain-specific permissions
```

### Permission Resolution

```
User requests action on Doc
     │
     ▼
Find Doc's Space
     │
     ▼
Check Space.private?
     │
     ├── Private: Is user in Space.members?
     │     │
     │     ├── No → DENY
     │     └── Yes → Check role permissions
     │
     └── Public: Check workspace role
           │
           ▼
     Get user's Role in this Space
           │
           ▼
     Does Role include required Permission?
           │
           ├── Yes → ALLOW
           └── No → DENY
```

---

## Workspace Provisioning

### Creation Flow

```
1. Account service receives creation request
     │
     ▼
2. Validate: user quota, name uniqueness, plan limits
     │
     ▼
3. Create workspace record (state: 'pending')
     │
     ▼
4. Provision infrastructure:
   ├── Create CockroachDB schema
   ├── Create Elasticsearch index
   ├── Create MinIO bucket
   └── Create Redpanda topics
     │
     ▼
5. Apply model migrations (state: 'upgrading')
   ├── Install core model
   ├── Install plugin models (tracker, hr, chunter, ...)
   └── Run migration scripts
     │
     ▼
6. Initialize default data:
   ├── Default SpaceTypes
   ├── Default Roles
   ├── System user
   └── Welcome content
     │
     ▼
7. Mark active (state: 'active')
```

### Upgrade Flow

When Huly is updated, workspaces may need model migrations:

```
1. Server detects version mismatch
     │
     ▼
2. Set state: 'migration-required'
     │
     ▼
3. Queue workspace for migration
     │
     ▼
4. Migration worker picks up workspace
   ├── Set state: 'upgrading'
   ├── Apply pending model migrations
   ├── Re-index search if needed
   └── Validate data integrity
     │
     ▼
5. Set state: 'active'
```

---

## SpecForge Relevance

| Huly Concept                               | SpecForge Parallel                                                          |
| ------------------------------------------ | --------------------------------------------------------------------------- |
| Workspace state machine (20+ states)       | SpecForge Flow's state machine definitions — complex lifecycle modeling     |
| Identity hierarchy (PersonUuid → PersonId) | SpecForge's branded type hierarchies for type-safe identity                 |
| AccountRole hierarchy (7 levels)           | SpecForge Guard's role-based access control policies                        |
| Space-based RBAC                           | SpecForge Guard's `hasRole` / `hasPermission` policy kinds                  |
| SpaceType / Role / Permission              | SpecForge Guard's `SpaceType` equivalent: policy composition                |
| Workspace provisioning flow                | SpecForge Saga's orchestrated multi-step workflows                          |
| Migration system                           | SpecForge Flow's state machine transitions for lifecycle management         |
| Social identity resolution                 | SpecForge's adapter pattern — mapping external identities to internal types |
