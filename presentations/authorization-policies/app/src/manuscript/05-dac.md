# 05 — Discretionary Access Control (DAC)

## Core Concept

Resource owners have discretion to grant or revoke access to their resources. The owner decides who can access what — no central authority required.

## How It Works

```
Owner: alice
  └── document.pdf
       ├── alice: [read, write, share] (owner)
       ├── bob: [read]  (granted by alice)
       └── carol: [read, write] (granted by alice)
```

## Real-World Examples

- **Google Drive / Dropbox**: File owner shares with specific people
- **GitHub repositories**: Repo owner manages collaborator access
- **Social media**: Post visibility settings (public/friends/private)
- **Email forwarding**: Sender controls who receives

## Code Example

```typescript
interface Resource {
  id: string;
  ownerId: string;
  acl: Map<string, Permission[]>;
}

function grantAccess(
  resource: Resource,
  granterId: string,
  targetId: string,
  perms: Permission[]
): boolean {
  if (resource.ownerId !== granterId) return false; // Only owner can grant
  resource.acl.set(targetId, perms);
  return true;
}

function canDelegate(resource: Resource, userId: string): boolean {
  return resource.ownerId === userId; // Delegation is owner-only
}
```

## Strengths

- Intuitive — matches how people think about ownership
- Flexible — owners manage their own resources
- Low administrative overhead — no central admin needed
- Natural fit for collaborative tools

## Weaknesses

- Trojan horse problem — malicious programs inherit user's permissions
- No central enforcement — security depends on every owner's decisions
- Difficult to enforce organization-wide policies
- Access can propagate uncontrollably through delegation chains
