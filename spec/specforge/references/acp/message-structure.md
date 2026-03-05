# ACP — Message Structure & Metadata

**Source:** [Message Structure](https://agentcommunicationprotocol.dev/core-concepts/message-structure), [Message Metadata](https://agentcommunicationprotocol.dev/core-concepts/message-metadata)
**Captured:** 2026-02-28

---

## Message Roles

Messages require a `role` identifying the sender:

| Role           | Description                                                     |
| -------------- | --------------------------------------------------------------- |
| `user`         | Messages from users                                             |
| `agent`        | Generic agent messages                                          |
| `agent/{name}` | Specific agent (e.g., `agent/image-analyzer`, `agent/chat_bot`) |

Agent names in roles support alphanumeric characters, underscores, and hyphens.

---

## Data Model

```python
class MessagePart(BaseModel):
    name: Optional[str] = None              # If set, part becomes an Artifact
    content_type: str                       # MIME type (required)
    content: Optional[str] = None           # Inline content
    content_encoding: Optional[Literal["plain", "base64"]] = "plain"
    content_url: Optional[AnyUrl] = None    # URL-based content
    metadata: Optional[CitationMetadata | TrajectoryMetadata] = None

class Message(BaseModel):
    role: Literal["user"] | Literal["agent"] | str
    parts: list[MessagePart]
```

---

## MessagePart Fields

| Field                      | Required  | Purpose                                      |
| -------------------------- | --------- | -------------------------------------------- |
| `content_type`             | Yes       | MIME type designation                        |
| `content` or `content_url` | Yes (one) | Payload delivery — mutually exclusive        |
| `content_encoding`         | No        | `"plain"` (default) or `"base64"` for binary |
| `name`                     | No        | Designates part as an Artifact               |
| `metadata`                 | No        | Semantic context (citation or trajectory)    |

---

## Content Delivery Methods

| Method        | Best For                                          | Example                      |
| ------------- | ------------------------------------------------- | ---------------------------- |
| **Inline**    | Small text-based or simple data                   | `content: "Hello world"`     |
| **URL-Based** | Large files, external resources                   | `content_url: "https://..."` |
| **Base64**    | Binary data (images, documents) embedded directly | `content_encoding: "base64"` |

Validation: each part must provide either `content` or `content_url`, never both.

---

## Artifacts

A MessagePart with a `name` field becomes an **Artifact** — a specialized output representing files, images, or structured data. Applications handle artifacts distinctly (downloads, iterative refinement, display).

Common artifact types:

- File generation (reports, documents)
- Structured data (JSON, CSV, XML)
- Visual content (images, charts)
- Downloadable assets

```python
# Image artifact (base64-encoded)
MessagePart(
    name="chart.png",
    content_type="image/png",
    content=base64_encoded_image,
    content_encoding="base64"
)

# JSON artifact
MessagePart(
    name="result.json",
    content_type="application/json",
    content=json.dumps(data)
)
```

---

## Citation Metadata

Attributes content to sources — essential for RAG systems and research agents:

```python
class CitationMetadata(BaseModel):
    kind: Literal["citation"] = "citation"
    start_index: Optional[int] = None    # Character position start
    end_index: Optional[int] = None      # Character position end
    url: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
```

---

## Trajectory Metadata

Exposes agent reasoning and tool interactions — enables debugging and transparency:

```python
class TrajectoryMetadata(BaseModel):
    kind: Literal["trajectory"] = "trajectory"
    message: Optional[str] = None
    tool_name: Optional[str] = None
    tool_input: Optional[dict] = None
    tool_output: Optional[dict] = None
```

Both metadata types require a `kind` discriminator field. Metadata is for context and transparency only — never put conversation content in metadata.

---

## SpecForge Relevance

ACP's message structure informs SpecForge's agent communication design:

- **Agent Communication** (`behaviors/BEH-SF-041-agent-communication.md`): ACP's role-based messages with typed parts map to SpecForge's inter-agent message format. The `agent/{name}` role pattern enables routing messages to specific agent roles.
- **Structured Output** (`types/structured-output.md`): ACP's artifact system (named message parts with MIME types) provides a concrete model for SpecForge's structured output types — specs, code, test results can each be typed artifacts.
- **Trajectory Metadata**: ACP's trajectory metadata (tool name, input, output) aligns with SpecForge's tracing requirements — capturing what tools each agent used during spec generation for audit trails.
