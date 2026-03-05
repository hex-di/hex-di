# Huly — Collaboration & Real-Time

**Source:** https://github.com/hcengineering/platform/tree/main/services/collaborator, https://github.com/hcengineering/platform/tree/main/server/middleware
**Captured:** 2026-02-28

---

## Real-Time Architecture

Huly provides real-time collaboration through three complementary systems:

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Y.js CRDT  │    │ Transactor  │    │ HulyPulse   │
│  (documents)│    │ (data ops)  │    │ (push notif) │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │
  Collaborator        WebSocket           Redis
   service             server            pub-sub
       │                  │                  │
  ┌────┴────┐      ┌─────┴─────┐     ┌─────┴─────┐
  │Document │      │Transaction │     │Notification│
  │co-editing│     │broadcast   │     │delivery    │
  └─────────┘      └───────────┘     └───────────┘
```

| System         | Scope                     | Transport                        | Consistency                  |
| -------------- | ------------------------- | -------------------------------- | ---------------------------- |
| **Y.js CRDT**  | Document content editing  | WebSocket (Collaborator service) | Eventual (CRDT merge)        |
| **Transactor** | Structured data mutations | WebSocket (Transactor service)   | Strong (transaction-ordered) |
| **HulyPulse**  | Push notifications        | Redis pub-sub                    | Best-effort delivery         |

---

## Y.js CRDT — Collaborative Document Editing

Huly uses **Y.js** for real-time collaborative editing of rich-text documents (issues, wiki pages, etc.).

### Collaborator Service

A standalone service that:

1. Hosts Y.js document rooms
2. Manages WebSocket connections from multiple editors
3. Persists document state to storage (MinIO)
4. Synchronizes CRDT state across connected clients

### Flow

```
┌─────────┐    ┌─────────┐
│ User A   │    │ User B   │
│ (editor) │    │ (editor) │
└────┬─────┘    └────┬─────┘
     │ WebSocket     │ WebSocket
     │               │
┌────┴───────────────┴────┐
│    Collaborator Service  │
│                          │
│  ┌──────────────────┐   │
│  │  Y.js Document    │   │
│  │  Room             │   │
│  │                    │   │
│  │  ┌────────────┐   │   │
│  │  │ Y.Doc       │   │   │
│  │  │ (CRDT state)│   │   │
│  │  └────────────┘   │   │
│  └──────────────────┘   │
│                          │
│  ┌──────────────────┐   │
│  │  Persistence      │   │
│  │  (MinIO snapshots)│   │
│  └──────────────────┘   │
└──────────────────────────┘
```

### CRDT Merge Behavior

- **Conflict-free:** Concurrent edits merge automatically without conflicts
- **Character-level:** Each character insertion/deletion is a CRDT operation
- **Offline-capable:** Edits made offline merge when reconnected
- **Awareness:** Cursor positions and selections are shared via Y.js awareness protocol

---

## Transactor WebSocket — Structured Data Real-Time

The Transactor provides real-time updates for all structured data (issues, projects, members, etc.) through **live queries**:

### Live Query Pattern

```typescript
// Client subscribes to a query
const query = client.createQuery(tracker.class.Issue, {
  space: projectRef,
  status: { $ne: closedStatus },
});

// Query results update reactively when matching documents change
query.subscribe(issues => {
  // Re-renders UI automatically
  displayIssues(issues);
});
```

### Transaction Broadcast

When a transaction is committed, the Transactor broadcasts it to all connected clients in the same workspace:

```
Client A                 Transactor                 Client B
   │                        │                          │
   │── TxCreateDoc(Issue) ─►│                          │
   │                        │── commit to DB ──►       │
   │                        │                          │
   │◄── TxResult(ok) ──────│                          │
   │                        │── broadcast Tx ─────────►│
   │                        │                          │
   │                        │    Client B's live       │
   │                        │    queries re-evaluate   │
```

### Query Subscription Protocol

```typescript
interface LiveQuery {
  // Subscribe to documents matching a query
  query<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    callback: (result: T[]) => void,
    options?: FindOptions<T>
  ): () => void; // Returns unsubscribe function

  // Subscribe to a single document by ID
  queryOne<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    callback: (result: T | undefined) => void
  ): () => void;
}
```

---

## HulyPulse — Push Notifications

HulyPulse is Huly's notification system, handling delivery across multiple channels:

### Notification Channels

| Channel  | Transport              | Use Case                           |
| -------- | ---------------------- | ---------------------------------- |
| In-app   | WebSocket (Transactor) | Real-time in-app badges and toasts |
| Push     | Web Push (VAPID)       | Browser push notifications         |
| Email    | SMTP                   | Email digests and mentions         |
| Telegram | Bot API                | Telegram message notifications     |

### Notification Pipeline

```
Transaction committed
     │
     ▼
Notification trigger fires
     │
     ▼
┌──────────────────┐
│ Notification      │
│ classification    │
│ (mention, assign, │
│  status change)   │
└────────┬─────────┘
         │
    ┌────┴────┐
    │  Redis   │
    │  pub-sub │
    └────┬────┘
         │
    ┌────┴────────────────────┐
    │     HulyPulse Router     │
    │                          │
    ├── In-app (WebSocket)     │
    ├── Push (VAPID)           │
    ├── Email (SMTP)           │
    └── Telegram (Bot API)     │
```

---

## Transaction Pipeline

The full lifecycle of a mutation in Huly:

```
1. Client creates transaction
     │
     ▼
2. Transaction sent via WebSocket to Transactor
     │
     ▼
3. Auth middleware validates token and permissions
     │
     ▼
4. Space security checks access rights
     │
     ▼
5. Pre-triggers execute (validation, enrichment)
     │
     ▼
6. Transaction committed to CockroachDB
     │
     ▼
7. Post-triggers execute (side effects)
     │  ├── Notification triggers
     │  ├── Activity log generation
     │  ├── Full-text index updates (→ Elasticsearch)
     │  └── Event publishing (→ Redpanda)
     │
     ▼
8. Transaction broadcast to connected clients
     │
     ▼
9. Live queries re-evaluate on each client
```

---

## Optimistic Concurrency — `TxApplyIf`

For operations that require atomic multi-document updates, Huly uses `TxApplyIf`:

```typescript
// Example: Move issue to next sprint only if it's still in the current sprint
const tx: TxApplyIf = {
  _class: core.class.TxApplyIf,
  // Preconditions
  match: [
    {
      _class: tracker.class.Issue,
      _id: issueId,
      sprint: currentSprintRef, // Must still be in current sprint
    },
  ],
  notMatch: [],
  // Operations to apply atomically
  txes: [
    {
      _class: core.class.TxUpdateDoc,
      objectId: issueId,
      objectClass: tracker.class.Issue,
      operations: { sprint: nextSprintRef },
    },
  ],
};
```

If the preconditions fail (another user already moved the issue), the transaction is rejected and the client can retry with fresh state.

---

## SpecForge Relevance

| Huly Concept                            | SpecForge Parallel                                                    |
| --------------------------------------- | --------------------------------------------------------------------- |
| Y.js CRDT collaboration                 | Reference architecture for real-time collaborative features           |
| Live queries (reactive subscriptions)   | SpecForge Query library's reactive data patterns                      |
| Transaction broadcast                   | SpecForge EventBus — adapter broadcasts domain events                 |
| Notification pipeline (multi-channel)   | SpecForge's port-based notification adapter pattern                   |
| `TxApplyIf` optimistic concurrency      | SpecForge Saga's compensation model — detect conflicts, compensate    |
| Transaction pipeline (middleware chain) | SpecForge's adapter composition chain, middleware in runtime pipeline |
| Redis pub-sub for cross-service events  | SpecForge EventBus port with Redis adapter implementation             |
