# Huly — API Client

**Source:** https://github.com/hcengineering/platform/tree/main/packages/client, https://github.com/hcengineering/platform/tree/main/server/account
**Captured:** 2026-02-28

---

## Client Architecture

Huly's TypeScript API client communicates with the Transactor over WebSocket for all CRUD operations and live queries.

```
┌──────────────────────────────┐
│        Application           │
│                              │
│  ┌────────────────────────┐  │
│  │     Client API          │  │
│  │  (TxFactory + queries)  │  │
│  └───────────┬────────────┘  │
│              │               │
│  ┌───────────┴────────────┐  │
│  │    Connection Layer     │  │
│  │  (WebSocket transport)  │  │
│  └───────────┬────────────┘  │
└──────────────┼───────────────┘
               │ wss://
        ┌──────┴──────┐
        │ Transactor  │
        └─────────────┘
```

---

## Authentication

Huly supports two authentication methods:

### Email/Password Authentication

```typescript
// 1. Login to get a token
const token = await loginWithPassword(email, password, workspaceUrl);

// 2. Use token for WebSocket connection
const client = await createClient(workspaceUrl, token);
```

### Token-Based Authentication

```typescript
// Direct token usage (for API integrations, service accounts)
const client = await createClient(workspaceUrl, existingToken);
```

### Service Secret Authentication

For server-to-server communication, services use a shared secret:

```typescript
// Internal service authentication
const token = generateServiceToken(serviceSecret, workspaceId);
```

### Token Structure

| Field           | Description               |
| --------------- | ------------------------- |
| `accountUuid`   | Account identifier        |
| `workspaceUuid` | Target workspace          |
| `email`         | Account email             |
| `role`          | Account role in workspace |
| `exp`           | Expiration timestamp      |

---

## TxFactory — CRUD Operations

All mutations are performed through transaction factories:

### Create

```typescript
import { TxFactory } from "@hcengineering/core";

const factory = new TxFactory(currentUser);

// Create a new issue
const createTx = factory.createTxCreateDoc(
  tracker.class.Issue, // Class
  projectSpace, // Space
  {
    title: "Fix login bug",
    description: "Users cannot log in with SSO",
    status: openStatus,
    priority: IssuePriority.High,
    assignee: assigneeRef,
    number: nextIssueNumber,
  }
);

await client.tx(createTx);
```

### Update

```typescript
// Update an issue's status
const updateTx = factory.createTxUpdateDoc(tracker.class.Issue, issue.space, issue._id, {
  status: inProgressStatus,
  assignee: currentUser,
});

await client.tx(updateTx);
```

### Delete

```typescript
// Remove a document
const removeTx = factory.createTxRemoveDoc(tracker.class.Issue, issue.space, issue._id);

await client.tx(removeTx);
```

### Apply Mixin

```typescript
// Add GitHub integration data to an issue
const mixinTx = factory.createTxMixin(
  issue._id,
  tracker.class.Issue,
  issue.space,
  github.mixin.GithubIssue,
  {
    githubNumber: 42,
    repository: githubRepoRef,
    url: "https://github.com/org/repo/issues/42",
  }
);

await client.tx(mixinTx);
```

---

## Querying

### Find Operations

```typescript
// Find all open issues in a project
const issues = await client.findAll(
  tracker.class.Issue,
  {
    space: projectRef,
    status: { $in: [openStatus, inProgressStatus] },
  },
  {
    sort: { priority: SortingOrder.Descending },
    limit: 50,
  }
);
```

### Query Operators

| Operator       | Description      | Example                                  |
| -------------- | ---------------- | ---------------------------------------- |
| `$eq`          | Equals (default) | `{ status: openStatus }`                 |
| `$ne`          | Not equals       | `{ status: { $ne: closedStatus } }`      |
| `$in`          | In array         | `{ priority: { $in: [1, 2] } }`          |
| `$nin`         | Not in array     | `{ assignee: { $nin: [user1, user2] } }` |
| `$gt` / `$gte` | Greater than     | `{ priority: { $gt: 2 } }`               |
| `$lt` / `$lte` | Less than        | `{ createdOn: { $lt: yesterday } }`      |
| `$like`        | Pattern match    | `{ title: { $like: '%bug%' } }`          |
| `$exists`      | Field exists     | `{ assignee: { $exists: true } }`        |

### Find Options

```typescript
interface FindOptions<T extends Doc> {
  sort?: SortingQuery<T>; // Sort order
  limit?: number; // Max results
  skip?: number; // Offset for pagination
  projection?: Projection<T>; // Select specific fields
  lookup?: Lookup<T>; // Join related documents
  total?: boolean; // Include total count
}
```

### Live Queries

```typescript
// Subscribe to real-time updates
const unsubscribe = client.query(
  tracker.class.Issue,
  { space: projectRef },
  (result: Issue[]) => {
    // Called initially and on every change
    renderIssueList(result);
  },
  {
    sort: { modifiedOn: SortingOrder.Descending },
  }
);

// Later: clean up subscription
unsubscribe();
```

---

## WebSocket Transport

### Connection Setup

```typescript
// Connection URL format
const wsUrl = `wss://${host}/ws/${workspaceId}?token=${token}`;

// Connection options
interface ConnectionOptions {
  url: string;
  token: string;
  workspace: string;
  timeout?: number; // Connection timeout (default: 30s)
  reconnect?: boolean; // Auto-reconnect on disconnect
}
```

### Message Protocol

The WebSocket protocol carries JSON-encoded messages:

| Direction       | Message Type   | Purpose                                  |
| --------------- | -------------- | ---------------------------------------- |
| Client → Server | `tx`           | Submit a transaction                     |
| Client → Server | `find`         | Execute a query                          |
| Client → Server | `subscribe`    | Start a live query                       |
| Client → Server | `unsubscribe`  | Stop a live query                        |
| Server → Client | `tx-result`    | Transaction result                       |
| Server → Client | `find-result`  | Query results                            |
| Server → Client | `tx-broadcast` | Transaction broadcast (for live queries) |
| Server → Client | `error`        | Error notification                       |

### Reconnection

The client automatically reconnects on disconnect:

1. Exponential backoff (1s, 2s, 4s, 8s, ... up to 30s)
2. Re-authenticates with existing token
3. Re-subscribes all live queries
4. Replays any pending transactions

---

## Rate Limiting

| Endpoint               | Limit            | Window                   |
| ---------------------- | ---------------- | ------------------------ |
| Authentication         | 10 requests      | Per minute               |
| Transaction submission | 100 transactions | Per second per workspace |
| Query execution        | 200 queries      | Per second per workspace |
| File upload            | 10 MB            | Per request              |
| WebSocket connections  | 50               | Per workspace            |

---

## SpecForge Relevance

| Huly Concept                          | SpecForge Parallel                                                       |
| ------------------------------------- | ------------------------------------------------------------------------ |
| `TxFactory` CRUD pattern              | SpecForge's adapter factory pattern — factories produce typed operations |
| WebSocket transport                   | SpecForge's transport-agnostic port design (adapters choose transport)   |
| Live query subscriptions              | SpecForge Query library's reactive data patterns                         |
| Token-based authentication            | SpecForge Guard's authentication adapter pattern                         |
| Service secret authentication         | SpecForge's internal adapter-to-adapter communication patterns           |
| Query operators (`$eq`, `$in`, `$gt`) | SpecForge Query's type-safe query builder API                            |
| Reconnection with replay              | SpecForge Saga's resume/recovery patterns                                |
