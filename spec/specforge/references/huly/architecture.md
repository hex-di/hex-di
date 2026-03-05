# Huly — Architecture

**Source:** https://github.com/hcengineering/platform/tree/main/server, https://github.com/hcengineering/platform/tree/main/services
**Captured:** 2026-02-28

---

## Service Topology

Huly operates as a **microservice architecture** with 30+ services. The **Transactor** is the central hub — all client operations flow through it, and it coordinates with specialized services.

```
                    ┌─────────────┐
                    │   Browser   │
                    │   Client    │
                    └──────┬──────┘
                           │ WebSocket
                    ┌──────┴──────┐
                    │  Front Pod  │
                    │  (Nginx +   │
                    │   static)   │
                    └──────┬──────┘
                           │
                    ┌──────┴──────┐
                    │ Transactor  │◄────── Central Hub
                    │  (server)   │
                    └──┬──┬──┬──┬─┘
                       │  │  │  │
          ┌────────────┘  │  │  └────────────┐
          │               │  │               │
    ┌─────┴─────┐  ┌─────┴──┴───┐  ┌────────┴────────┐
    │CockroachDB│  │ Redpanda   │  │  Elasticsearch   │
    │ (storage) │  │ (events)   │  │  (full-text)     │
    └───────────┘  └────────────┘  └──────────────────┘
          │               │
    ┌─────┴─────┐  ┌─────┴──────┐
    │   MinIO   │  │   Redis    │
    │  (blobs)  │  │  (cache/   │
    │           │  │   pubsub)  │
    └───────────┘  └────────────┘
```

---

## Core Services

| Service          | Role                                                      | Communication                             |
| ---------------- | --------------------------------------------------------- | ----------------------------------------- |
| **Transactor**   | Central hub, transaction processing, workspace management | WebSocket (clients), gRPC/HTTP (internal) |
| **Front**        | Static asset serving, reverse proxy                       | HTTP/HTTPS                                |
| **Collaborator** | Real-time document editing (Y.js)                         | WebSocket                                 |
| **Account**      | User/workspace lifecycle, authentication                  | REST API                                  |
| **AI Bot**       | LLM integration, AI-powered features                      | Internal API                              |
| **Analytics**    | Usage tracking, metrics collection                        | Event streaming                           |
| **Rekoni**       | Image processing, thumbnail generation                    | REST API                                  |
| **Sign**         | Digital signature service                                 | REST API                                  |
| **Print**        | Document export (PDF generation)                          | REST API                                  |
| **Telegram Bot** | Telegram integration                                      | Webhook                                   |
| **Gmail**        | Email integration                                         | OAuth + REST                              |
| **Love**         | Video/voice (LiveKit wrapper)                             | WebSocket                                 |
| **Backup**       | Workspace backup and restore                              | REST API                                  |

---

## Transactor — The Central Hub

The Transactor is Huly's most critical service. It processes all CRUD transactions, enforces consistency, manages workspace state, and coordinates real-time updates.

### Server Pipeline Pattern

The Transactor uses a **pipeline pattern** where incoming transactions flow through a chain of middleware processors:

```
Client Request
     │
     ▼
┌─────────────────┐
│  Auth Middleware │  ← Verifies token, resolves workspace
└────────┬────────┘
         │
┌────────┴────────┐
│ Space Security   │  ← Checks Space-based permissions
└────────┬────────┘
         │
┌────────┴────────┐
│  Trigger Engine  │  ← Executes server-side triggers (side effects)
└────────┬────────┘
         │
┌────────┴────────┐
│  Storage Layer   │  ← Persists to CockroachDB
└────────┬────────┘
         │
┌────────┴────────┐
│  Notification    │  ← Pushes real-time updates via Redis/WebSocket
└────────┬────────┘
         │
     Response
```

### Trigger System

Server-side triggers execute business logic in response to transactions:

```typescript
// Server plugin trigger registration pattern
export function createServerPlugin(): ServerPlugin {
  return {
    triggers: [
      {
        // Triggered after a Tracker issue is created
        trigger: tracker.trigger.OnIssueCreate,
        // Classes this trigger reacts to
        txClass: core.class.TxCreateDoc,
        objectClass: tracker.class.Issue,
      },
    ],
  };
}
```

Triggers run **server-side** after the primary transaction is committed, enabling:

- Automatic sub-issue numbering
- Notification dispatch
- Activity log generation
- Cross-module side effects (e.g., HR actions from Tracker events)

---

## Communication Patterns

### Client ↔ Transactor (WebSocket)

Primary client-server channel. Carries:

- **Transactions** (CRUD operations)
- **Live queries** (reactive data subscriptions)
- **Workspace events** (member changes, status updates)

### Service ↔ Service (HTTP/gRPC)

Internal service calls for specific operations:

- Account service ↔ Transactor (workspace provisioning)
- Collaborator ↔ Transactor (document state sync)
- AI Bot ↔ Transactor (AI-generated content)

### Event Streaming (Redpanda)

Asynchronous, decoupled communication for:

- **Activity feeds** — aggregated from multiple sources
- **Analytics events** — usage tracking
- **Notification dispatch** — HulyPulse notification routing
- **Full-text indexing** — Elasticsearch document indexing

### Cache / Pub-Sub (Redis)

Low-latency communication for:

- **Session state** — active workspace connections
- **Notification delivery** — HulyPulse push notifications
- **Cache invalidation** — cross-service cache coordination

---

## Workspace Isolation

Each Huly workspace is an isolated tenant:

| Aspect         | Isolation                                  |
| -------------- | ------------------------------------------ |
| Database       | Separate CockroachDB schema per workspace  |
| Object storage | Separate MinIO bucket prefix per workspace |
| Search index   | Separate Elasticsearch index per workspace |
| WebSocket      | Connections scoped to single workspace     |
| Transactions   | Cannot cross workspace boundaries          |

The Transactor manages multiple workspaces concurrently, routing each connection to the correct storage backend.

---

## Scalability Model

| Component     | Scaling Strategy                               |
| ------------- | ---------------------------------------------- |
| Transactor    | Horizontal (multiple pods, workspace affinity) |
| Front         | Horizontal (stateless, load balanced)          |
| Collaborator  | Horizontal (Y.js rooms sharded by document)    |
| CockroachDB   | Distributed SQL (built-in sharding)            |
| Redpanda      | Partitioned topics                             |
| Elasticsearch | Index sharding                                 |
| MinIO         | Distributed object storage                     |

---

## SpecForge Relevance

| Huly Pattern                          | SpecForge Parallel                                                       |
| ------------------------------------- | ------------------------------------------------------------------------ |
| Transactor as central hub             | SpecForge Runtime as the composition root / service resolution center    |
| Server pipeline (middleware chain)    | SpecForge's adapter composition, middleware patterns in Flow             |
| Trigger system (server-side effects)  | SpecForge Saga's side-effect orchestration, Flow's effect system         |
| Workspace isolation                   | SpecForge's scoped containers — each scope is an isolated "workspace"    |
| Event streaming via Redpanda          | SpecForge's EventBus port / adapter pattern                              |
| Live queries (reactive subscriptions) | SpecForge's Query library reactive data patterns                         |
| Service topology (30+ microservices)  | SpecForge's 192-plugin modular architecture (similar plugin-per-concern) |
