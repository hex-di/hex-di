# ACP — Agent Manifest & Discovery

**Source:** [Agent Manifest](https://agentcommunicationprotocol.dev/core-concepts/agent-manifest), [Agent Discovery](https://agentcommunicationprotocol.dev/core-concepts/agent-discovery)
**Captured:** 2026-02-28

---

## Agent Manifest

The Agent Manifest advertises an agent's identity, capabilities, and runtime metadata to clients. It enables discoverability and content type negotiation.

### Registration via Decorator

```python
@server.agent(
    name="image-analyzer",
    description="Analyzes images and returns structured descriptions",
    input_content_types=["image/png", "image/jpeg"],
    output_content_types=["text/plain", "application/json"]
)
async def analyze_image(input: list[Message], context: Context):
    # implementation
    pass
```

### Manifest Fields

| Field                  | Required | Default       | Description                                           |
| ---------------------- | -------- | ------------- | ----------------------------------------------------- |
| `name`                 | Yes      | Function name | Agent identifier (alphanumeric, hyphens, underscores) |
| `description`          | Yes      | Docstring     | Agent purpose and capabilities                        |
| `input_content_types`  | No       | `["*/*"]`     | MIME types the agent accepts                          |
| `output_content_types` | No       | `["*/*"]`     | MIME types the agent produces                         |

If `name` and `description` are not provided in the decorator, the agent's function name and docstring are used as defaults.

### Content Type Negotiation

Agents declare their I/O compatibility through MIME type fields with wildcard support:

| Pattern            | Matches                    |
| ------------------ | -------------------------- |
| `*/*`              | Any content type (default) |
| `image/*`          | Any image format           |
| `text/plain`       | Plain text only            |
| `application/json` | JSON only                  |

Common MIME types: `text/plain`, `application/json`, `image/png`, `image/jpeg`, `application/pdf`, `text/html`

---

## Agent Discovery

Four mechanisms enable clients to locate and connect with agents:

### 1. Basic Discovery (Online)

Query a running ACP server directly:

```python
# REST endpoint
GET http://localhost:8000/agents

# Python SDK
async with Client(base_url="http://localhost:8000") as client:
    agents = await client.agents()
```

### 2. Open Discovery (Online)

Agents publish metadata via a well-known manifest file:

```
https://your-domain.com/.well-known/agent.yml
```

Enables discovery knowing only the agent's domain. Deployment and consumption details require separate standardization.

### 3. Registry-Based Discovery (Online/Offline)

A centralized registry provides unified agent listings across multiple ACP servers:

- Centralized management and scalable discovery
- Demonstrated in the BeeAI Platform
- Not yet in the official ACP spec (experimental)

### 4. Embedded Discovery (Offline)

Agent metadata embeds directly into distribution packages (e.g., container image labels):

- Works without network connectivity
- Prevents capability mismatches between metadata and deployed agent
- Integrates with CI/CD pipelines for consistent metadata throughout deployment

---

## Discovery Method Comparison

| Method       | Connectivity   | Maturity     | Use Case                                      |
| ------------ | -------------- | ------------ | --------------------------------------------- |
| **Basic**    | Online         | Stable       | Development, direct server access             |
| **Open**     | Online         | Stable       | Public agents, domain-based discovery         |
| **Registry** | Online/Offline | Experimental | Multi-server management, platform integration |
| **Embedded** | Offline        | Experimental | Air-gapped environments, CI/CD pipelines      |

---

## SpecForge Relevance

ACP's agent manifest and discovery patterns directly inform SpecForge's agent registration:

- **AgentRoleRegistry** (`c3-agent-system.md`): ACP's manifest schema (name, description, content types) maps to SpecForge's role registry where agents declare their capabilities. The decorator-based registration (`@server.agent`) parallels SpecForge's declarative role definitions.
- **Agent Roles** (`behaviors/BEH-SF-017-agent-roles.md`): ACP's content type negotiation (what an agent accepts/produces) is analogous to SpecForge's role contracts — each agent role declares what artifacts it consumes and produces.
- **Embedded Discovery**: ACP's offline discovery via package metadata aligns with SpecForge's goal of self-contained, reproducible agent configurations that don't depend on external registries at runtime.
