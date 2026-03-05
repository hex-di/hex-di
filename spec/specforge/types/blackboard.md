---
id: TYPE-SF-006
kind: types
title: Blackboard Types
status: active
domain: blackboard
behaviors: []
adrs: [ADR-018]
---

# Blackboard Types

**Status: Superseded by [types/acp.md](./acp.md)**

This file is retained for historical reference. The blackboard pattern has been replaced by ACP's message model per [ADR-018](../decisions/ADR-018-acp-agent-protocol.md).

## Mapping to ACP Types

| Blackboard Type          | ACP Replacement                                               | Notes                                             |
| ------------------------ | ------------------------------------------------------------- | ------------------------------------------------- |
| `BlackboardDocument`     | `ACPMessagePart` with `name` and `contentType: text/markdown` | Documents become named message part artifacts     |
| `Finding`                | `ACPMessage` with `CitationMetadata`                          | Findings expressed via citation metadata on parts |
| `BlackboardMessage`      | `ACPMessage` with `role: agent/{name}`                        | Role-addressed messages replace targeted messages |
| `BlackboardEvent`        | ACP session history entry                                     | Event log replaced by append-only session history |
| `BlackboardMetrics`      | Computed from ACP session history                             | Metrics derived from message counts and metadata  |
| `BlackboardSubscription` | `MessageExchangeService.subscribe()`                          | Subscription via ACP session events               |
| `BlackboardService`      | `MessageExchangeService`                                      | Port replacement                                  |

See [behaviors/BEH-SF-229-acp-messaging.md](../behaviors/BEH-SF-229-acp-messaging.md) for the replacement behavioral contracts.

---

- [architecture/c1-system-context.md](../architecture/c1-system-context.md) -- system context for blackboard placement
- [types/agent.md](./agent.md) -- `AgentRole` used by `BlackboardDocument`, `BlackboardMessage`, `FindingFilter`
- [types/flow.md](./flow.md) -- `Finding` referenced by `FindingAdded` event
- [types/errors.md](./errors.md) -- `BlackboardError`

---

## Document Layer

```typescript
interface BlackboardDocument {
  readonly documentId: string;
  readonly title: string;
  readonly content: string;
  readonly version: number;
  readonly authorAgent: AgentRole;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface DocumentSummary {
  readonly documentId: string;
  readonly title: string;
  readonly version: number;
  readonly authorAgent: AgentRole;
  readonly updatedAt: string;
}
```

---

## Message Layer

```typescript
interface BlackboardMessage {
  readonly messageId: string;
  readonly threadId?: string;
  readonly fromAgent: AgentRole;
  readonly targetRole?: AgentRole;
  readonly content: string;
  readonly kind:
    | "clarification-request"
    | "clarification-response"
    | "broadcast"
    | "human-feedback";
  readonly priority?: "normal" | "highest";
  readonly timestamp: string;
}
```

---

## Findings Layer

```typescript
interface FindingUpdate {
  readonly status?: "open" | "resolved" | "wont-fix" | "deferred";
  readonly resolution?: string;
}

interface FindingFilter {
  readonly severity?: "critical" | "major" | "minor" | "observation";
  readonly status?: "open" | "resolved" | "wont-fix" | "deferred";
  readonly agentRole?: AgentRole;
}
```

---

## Metrics

```typescript
interface BlackboardMetrics {
  readonly documentCount: number;
  readonly findingCount: number;
  readonly messageCount: number;
  readonly openFindings: number;
  readonly criticalFindings: number;
}
```

---

## Subscription

> **Superseded (N20):** `Unsubscribe` is now canonically defined in [types/ports.md](./ports.md#shared-utility-types). The definition below is retained for historical reference only.

```typescript
type Unsubscribe = () => void;
```

---

## Event Types

Every blackboard mutation emits an immutable event. Events are idempotent for replay during graph sync recovery -- replaying the same event produces the same graph state (upsert semantics).

```typescript
type BlackboardEvent =
  | DocumentWritten
  | FindingAdded
  | MessagePosted
  | MetricsUpdated
  | HumanFeedbackPosted;

interface DocumentWritten {
  readonly _tag: "DocumentWritten";
  readonly documentId: string;
  readonly version: number;
  readonly authorAgent: string;
  readonly timestamp: string;
}

interface FindingAdded {
  readonly _tag: "FindingAdded";
  readonly finding: Finding;
  readonly timestamp: string;
}

interface MessagePosted {
  readonly _tag: "MessagePosted";
  readonly threadId?: string;
  readonly fromAgent: string;
  readonly timestamp: string;
}

interface MetricsUpdated {
  readonly _tag: "MetricsUpdated";
  readonly phase: string;
  readonly iteration: number;
  readonly timestamp: string;
}

interface HumanFeedbackPosted {
  readonly _tag: "HumanFeedbackPosted";
  readonly messageId: string;
  readonly userId?: string;
  readonly timestamp: string;
}
```
