# ACP — Architecture

**Source:** [Architecture](https://agentcommunicationprotocol.dev/core-concepts/architecture)
**Captured:** 2026-02-28

---

## Client-Server Model

ACP establishes a client-server relationship where:

- An **ACP client** can be an agent, application, or any service that makes requests to an ACP server
- An **ACP server** hosts one or more agents that execute requests and return results using the ACP protocol
- A single process can act as **both** a server (handling incoming requests) and a client (making outbound requests to other agents)

All communication uses standard REST/HTTP — no specialized transports required.

---

## Deployment Patterns

### Single-Agent Setup

```
┌──────────┐     REST/HTTP     ┌──────────────────┐
│  Client   │ ───────────────► │  Server (1 Agent) │
└──────────┘                   └──────────────────┘
```

- One client connects directly to one agent via REST/HTTP
- Server wraps the agent and exposes standardized ACP endpoints
- Best for: direct specialized agent communication, development, proof-of-concept

### Multi-Agent Single Server

```
┌──────────┐     REST/HTTP     ┌──────────────────────┐
│  Client   │ ───────────────► │  Server              │
└──────────┘                   │  ├── Agent A          │
                               │  ├── Agent B          │
                               │  └── Agent C          │
                               └──────────────────────┘
```

- One server hosts multiple agents behind a unified HTTP endpoint
- Each agent is individually addressable via agent metadata routing
- Benefits: shared infrastructure, simplified deployment, centralized monitoring, consistent security
- Best for: agents with similar resource needs or related functionality

### Distributed Multi-Server

```
                               ┌──────────────────┐
                          ┌──► │  Server 1 (A, B)  │
┌──────────┐              │    └──────────────────┘
│  Client   │ ────────────┤
└──────────┘              │    ┌──────────────────┐
                          └──► │  Server 2 (C, D)  │
                               └──────────────────┘
```

- Clients communicate with multiple independent servers
- Enables: independent scaling, load distribution, fault isolation, diverse technology stacks
- Best for: production deployments with independent development cycles

### Router Pattern (Advanced)

```
┌──────────┐         ┌─────────────────┐         ┌──────────────┐
│  Client   │ ──────► │  Router Agent    │ ──────► │  Agent A     │
└──────────┘         │  (orchestrator)  │ ──────► │  Agent B     │
                     │                  │ ──────► │  Agent C     │
                     │  + MCP Tools     │         └──────────────┘
                     └─────────────────┘
```

- A central Router Agent orchestrates complex workflows by:
  1. Decomposing requests into specialized tasks
  2. Routing to appropriate agents
  3. Aggregating responses
  4. Leveraging proprietary tools and downstream agents via MCP
- Best for: complex multi-step workflows requiring intelligent dispatching

---

## HTTP Endpoints

| Method | Endpoint                | Purpose                                      |
| ------ | ----------------------- | -------------------------------------------- |
| `GET`  | `/agents`               | List available agents with manifest metadata |
| `POST` | `/runs`                 | Create a new agent run                       |
| `GET`  | `/runs/{run_id}`        | Retrieve run state and results               |
| `POST` | `/runs/{run_id}`        | Resume an awaiting run                       |
| `POST` | `/runs/{run_id}/cancel` | Request run cancellation                     |

---

## SpecForge Relevance

ACP's deployment patterns map directly to SpecForge's container architecture:

- **Client-Server Topology** (`c2-containers.md`): ACP's single-agent and multi-agent patterns mirror SpecForge's container decomposition — a SpecForge server could host multiple agent roles behind a single endpoint, each addressable by role name.
- **Server Architecture** (`c3-server.md`): ACP's REST endpoints provide a concrete protocol for SpecForge's server layer. The `/agents` discovery endpoint parallels SpecForge's registry pattern, while `/runs` maps to flow execution.
- **Router Pattern**: ACP's Router Agent aligns with SpecForge's orchestration layer — a central agent that decomposes specs into tasks and routes to specialized agents (writer, reviewer, implementer).
