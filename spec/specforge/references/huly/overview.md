# Huly — Overview

**Source:** https://github.com/hcengineering/platform, https://huly.io
**Captured:** 2026-02-28

---

## What Huly Is

**Huly** is an open-source, all-in-one project management platform that consolidates issue tracking, documents, chat, HR, and planning into a single product. Built by Hardcore Engineering (formerly Hard Core Software), Huly positions itself as a self-hostable alternative to Linear, Jira, Slack, and Notion combined.

### Key Properties

| Property        | Value                                |
| --------------- | ------------------------------------ |
| License         | EPL-2.0 (Eclipse Public License 2.0) |
| Repository      | `hcengineering/platform`             |
| Stars           | ~24.5k                               |
| Language        | TypeScript (~95%), Svelte (UI)       |
| Runtime         | Node.js (server), Browser (client)   |
| Package manager | Rush (monorepo)                      |

---

## Product Feature Areas

| Area                     | Capabilities                                                              |
| ------------------------ | ------------------------------------------------------------------------- |
| **Tracker**              | Issues, sub-issues, relations, sprints, milestones, velocity, estimations |
| **Documents**            | Real-time collaborative editing (Y.js CRDT), nested documents, templates  |
| **Chunter**              | Chat with channels, direct messages, threads, reactions, activity feed    |
| **HR**                   | Employee profiles, departments, vacation/sick tracking, onboarding        |
| **Planner**              | Personal action items, day planner, time-blocking, schedule view          |
| **Drive**                | File management, folders, versioned uploads, S3/MinIO storage             |
| **Love**                 | Virtual office / video conferencing (LiveKit integration)                 |
| **Controlled Documents** | QMS-grade document management with approval workflows                     |
| **Boards**               | Kanban-style views with customizable columns                              |
| **Tags/Labels**          | Hierarchical tagging across all modules                                   |

---

## Technology Stack

| Layer                  | Technology                                         |
| ---------------------- | -------------------------------------------------- |
| Frontend framework     | Svelte 4 + custom UI library (`@hcengineering/ui`) |
| Backend runtime        | Node.js 20+                                        |
| Primary database       | CockroachDB (PostgreSQL wire protocol)             |
| Search engine          | Elasticsearch / OpenSearch                         |
| Object storage         | MinIO (S3-compatible)                              |
| Message broker         | Redpanda (Kafka-compatible)                        |
| Cache / pub-sub        | Redis                                              |
| Realtime collaboration | Y.js CRDT                                          |
| Video / voice          | LiveKit                                            |
| Build / monorepo       | Rush + Heft                                        |

---

## Repository Structure

The `hcengineering/platform` monorepo (~192 packages) follows a layered structure:

```
platform/
├── models/           # Data model definitions per plugin (core, tracker, chunter, hr, ...)
├── packages/          # Shared libraries (core, platform, query, presentation, ...)
├── plugins/           # UI and server plugin implementations
├── server/            # Server-side modules (core, middleware, pipeline, ...)
├── server-plugins/    # Server plugin implementations (tracker, hr, notification, ...)
├── services/          # Standalone microservices (ai-bot, analytics, collaborator, ...)
├── pods/              # Service entry points (server, front, backup, ...)
├── tests/             # End-to-end test suites
├── dev/               # Developer tooling and scripts
└── rush.json          # Rush monorepo configuration
```

### Key Package Categories

| Directory         | Count | Purpose                                                              |
| ----------------- | ----- | -------------------------------------------------------------------- |
| `models/`         | ~30   | TypeScript model definitions (classes, mixins, spaces, transactions) |
| `plugins/`        | ~40   | Client-side UI plugin implementations                                |
| `server-plugins/` | ~20   | Server-side trigger and middleware implementations                   |
| `services/`       | ~15   | Standalone microservices (AI bot, analytics, collaborator, etc.)     |
| `packages/`       | ~50   | Shared core libraries (platform, core, query, etc.)                  |

---

## Open-Source Governance

- **License:** EPL-2.0 — allows commercial use, modification, and distribution; copyleft scoped to individual files (not viral across a project)
- **Contributor model:** Company-led open source (Hardcore Engineering is the primary maintainer)
- **Release cadence:** Continuous deployment; Docker images published to GitHub Container Registry
- **Community:** Active Discord, GitHub Discussions, and issue tracker

---

## SpecForge Relevance

| Huly Concept                        | SpecForge Parallel                                                                  |
| ----------------------------------- | ----------------------------------------------------------------------------------- |
| Plugin-based modular monorepo       | SpecForge's library-per-concern architecture (`@hex-di/core`, `@hex-di/flow`, etc.) |
| PRI (Platform Resource Identifiers) | Port/Adapter naming and resolution via `port()` / `createAdapter()`                 |
| `Obj → Doc → AttachedDoc` hierarchy | SpecForge's branded type hierarchies (`Ref<T>`, `Tag<T>`)                           |
| Transaction-based state changes     | SpecForge Saga's transaction model, Flow's state machine transitions                |
| Workspace multi-tenancy             | SpecForge's scoped runtime containers (`createScope()`)                             |
| CockroachDB + event streaming       | SpecForge's persistence port + event bus patterns                                   |
| Y.js CRDT collaboration             | Reference for future real-time collaboration features                               |
