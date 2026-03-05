---
id: TYPE-SF-004
kind: types
title: Audit Types
status: active
domain: audit
behaviors: []
adrs: [ADR-011]
---

# Audit Types

- [types/errors.md](./errors.md) -- error types for audit failures
- [plugins/PLG-gxp.md](../plugins/PLG-gxp.md) -- GxP compliance plugin
- [behaviors/BEH-SF-201-permission-governance.md](../behaviors/BEH-SF-201-permission-governance.md) -- permission governance behaviors
- [decisions/ADR-011-hooks-as-event-bus.md](../decisions/ADR-011-hooks-as-event-bus.md) -- ADR-011

---

## Audit Records

```typescript
interface AuditRecord {
  readonly _tag: "AuditRecord";
  readonly recordId: string;
  readonly timestamp: string;
  readonly sessionId: string;
  readonly agentRole: string;
  readonly tool: string;
  readonly toolInput: Record<string, unknown>;
  readonly toolResult: string;
  readonly permissionDecision: PermissionDecision;
  readonly contentHash: string;
  readonly previousRecordHash: string;
}
```

---

## Permission Decisions

```typescript
type PermissionDecision =
  | { readonly _tag: "Allowed"; readonly rule: string; readonly layer: PermissionLayer }
  | {
      readonly _tag: "Denied";
      readonly rule: string;
      readonly layer: PermissionLayer;
      readonly reason: string;
    }
  | {
      readonly _tag: "Escalated";
      readonly rule: string;
      readonly fromLayer: PermissionLayer;
      readonly toLayer: PermissionLayer;
    };

type PermissionLayer =
  | "enterprise"
  | "organization"
  | "compliance"
  | "repository"
  | "git-context"
  | "role"
  | "session"
  | "real-time"
  | "file"
  | "audit"
  | "impact";
```

---

## Audit Chain Integrity

```typescript
interface MerkleWitness {
  readonly rootHash: string;
  readonly path: ReadonlyArray<string>;
  readonly leafIndex: number;
  readonly publishedAt: string;
}

interface AuditChain {
  readonly chainId: string;
  readonly headHash: string;
  readonly length: number;
  readonly lastVerified: string;
  readonly witness: MerkleWitness | null;
}

interface ReconciliationResult {
  readonly hookChainValid: boolean;
  readonly acpSessionChainValid: boolean;
  readonly chainsConsistent: boolean;
  readonly discrepancies: ReadonlyArray<{
    readonly recordId: string;
    readonly hookHash: string;
    readonly acpSessionHash: string;
  }>;
}
```

---

## Trust and Blast Radius

```typescript
interface TrustScore {
  readonly agentRole: string;
  readonly sessionId: string;
  readonly cleanIterations: number;
  readonly totalIterations: number;
  readonly currentTier: "restricted" | "standard" | "elevated" | "autonomous";
  readonly score: number;
}

interface BlastRadiusReport {
  readonly targetPath: string;
  readonly affectedFiles: ReadonlyArray<string>;
  readonly affectedBehaviors: ReadonlyArray<string>;
  readonly affectedTests: ReadonlyArray<string>;
  readonly impactScore: number;
  readonly recommendation: "allow" | "review" | "deny";
}
```
