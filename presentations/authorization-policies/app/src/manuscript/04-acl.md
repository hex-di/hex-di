# 04 — Access Control Lists (ACL)

## Core Concept

An ACL is a list of permissions attached directly to a resource, specifying which subjects can perform which actions.

## How It Works

```
Resource: /documents/report.pdf
  ├── alice: [read, write]
  ├── bob: [read]
  └── editors-group: [read, write, delete]
```

## Real-World Examples

- **UNIX file permissions**: `rwxr-xr--` (owner/group/other)
- **AWS S3 bucket ACLs**: Grant read/write per AWS account
- **Network ACLs**: Firewall rules (allow/deny per IP/port)
- **Windows NTFS**: Per-file ACL with inheritance

## Code Example

```typescript
interface ACLEntry {
  subject: string;
  permissions: ("read" | "write" | "delete")[];
}

interface ACL {
  resource: string;
  entries: ACLEntry[];
}

function checkAccess(acl: ACL, subject: string, action: string): boolean {
  const entry = acl.entries.find(e => e.subject === subject);
  return entry?.permissions.includes(action) ?? false;
}
```

## Strengths

- Simple to understand and implement
- Direct resource-to-permission mapping
- Well-suited for file systems and network rules
- Mature tooling (decades of OS support)

## Weaknesses

- Doesn't scale: N resources x M users = N\*M entries
- No policy abstraction — permissions are scattered per resource
- Difficult to audit ("What can user X access across 10,000 files?")
- No dynamic/contextual decisions
