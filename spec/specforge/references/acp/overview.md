# ACP — Overview

**Source:** [Welcome](https://agentcommunicationprotocol.dev/introduction/welcome), [Mission & Team](https://agentcommunicationprotocol.dev/about/mission-and-team), [ACP vs MCP vs A2A](https://agentcommunicationprotocol.dev/about/mcp-and-a2a)
**Captured:** 2026-02-28

---

## What ACP Is

The Agent Communication Protocol (ACP) is an open protocol for agent interoperability under the Linux Foundation AI & Data organization. It solves the growing challenge of connecting AI agents, applications, and humans across disparate frameworks and infrastructures.

ACP uses REST-based endpoints following standard HTTP conventions — no JSON-RPC, no proprietary SDKs required. Agents are invocable with standard HTTP tools (curl, Postman) and communicate using MIME types for extensible content negotiation.

---

## Key Capabilities

| Capability                     | Description                                                                         |
| ------------------------------ | ----------------------------------------------------------------------------------- |
| **Multi-modal**                | Text, images, audio, video, custom binary formats via MIME types                    |
| **Sync & Async**               | Synchronous request-response plus async-first long-running tasks                    |
| **Streaming**                  | Real-time incremental updates during processing                                     |
| **Stateful & Stateless**       | Session management for conversational agents; stateless for utility agents          |
| **Online & Offline Discovery** | Live server queries plus embedded metadata in distribution packages                 |
| **Framework Agnostic**         | Works with BeeAI, LangChain, CrewAI, LlamaIndex, OpenAI, and custom implementations |

---

## Governance

ACP operates as part of the **Linux Foundation AI & Data** organization. It follows transparent, community-driven governance practices aligned with open collaboration principles. The project was launched by IBM in March 2025 and actively recruits contributors through GitHub discussions and a dedicated community repository.

---

## ACP vs MCP vs A2A

Three protocols occupy distinct layers of the agentic stack:

| Dimension         | MCP                           | ACP                                             | A2A                          |
| ----------------- | ----------------------------- | ----------------------------------------------- | ---------------------------- |
| **Focus**         | Model-to-tool connections     | Agent-to-agent communication                    | Agent-to-agent communication |
| **Launched**      | 2024 (Anthropic)              | March 2025 (IBM)                                | April 2025 (Google)          |
| **Governance**    | Anthropic-led                 | Linux Foundation (open)                         | Google-led                   |
| **Transport**     | JSON-RPC over stdio/SSE       | REST/HTTP                                       | REST/HTTP                    |
| **Content Model** | Tool schemas                  | MIME-type-based (extensible)                    | Pre-defined types            |
| **Discovery**     | Server capability negotiation | Online + offline (embedded in packages)         | Agent Cards                  |
| **Agent Types**   | N/A (tools, not agents)       | Stateless serverless to stateful conversational | Task-oriented                |

### Complementary Relationship

MCP handles **internal** agent operations (connecting a model to its tools and resources). ACP and A2A handle **external** agent interactions (communication between separate agents). Together they create layered agentic architectures:

```
┌─────────────────────────────┐
│  Agent A                    │
│  ┌───────────────────────┐  │         ┌──────────────┐
│  │  LLM + MCP Tools      │──│── ACP ──│   Agent B    │
│  └───────────────────────┘  │         └──────────────┘
└─────────────────────────────┘
```

ACP distinguishes itself from A2A through Linux Foundation governance, co-development with the BeeAI platform, offline discovery via embedded package metadata, and MIME-type extensibility.

---

## Official SDKs

| SDK            | Package         | Status                        |
| -------------- | --------------- | ----------------------------- |
| **Python**     | `acp-sdk`       | Primary SDK, production-ready |
| **TypeScript** | `acp-sdk` (npm) | Available                     |

---

## SpecForge Relevance

ACP provides a standardized agent-to-agent protocol that complements SpecForge's existing architecture:

- **Agent System** (`c3-agent-system.md`): SpecForge's `AgentRoleRegistry` maps to ACP's agent manifest — both define agent identity, capabilities, and discovery. ACP's decorator-based registration (`@server.agent`) parallels SpecForge's role-based registration pattern.
- **MCP Composition** (`c3-mcp-composition.md`): ACP explicitly bridges to MCP via its adapter, enabling ACP agents to be consumed as MCP tools. This extends SpecForge's MCP composition layer with external agent interoperability.
- **ADR-004** (Agent Communication): ACP's REST-based, async-first approach with structured message parts aligns with the communication patterns chosen for SpecForge agents. The protocol's framework-agnostic design means SpecForge could expose its agents via ACP without coupling to a specific framework.
