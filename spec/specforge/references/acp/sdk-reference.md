# ACP — SDK Reference

**Source:** [Quickstart](https://agentcommunicationprotocol.dev/introduction/quickstart), [Generate Artifacts](https://agentcommunicationprotocol.dev/how-to/generate-artifacts), [Debug with OpenTelemetry](https://agentcommunicationprotocol.dev/how-to/debug)
**Captured:** 2026-02-28

---

## Python SDK Installation

```bash
uv init --python '>=3.11' my_acp_project
cd my_acp_project
uv add acp-sdk
```

---

## Core Classes

### Server

Creates and runs an ACP server hosting agents:

```python
from acp_sdk.server import Server

server = Server()

@server.agent()
async def echo(input: list[Message], context: Context):
    """Echo agent — returns input messages."""
    for message in input:
        yield message

server.run()                             # Default: localhost:8000
server.run(configure_telemetry=True)     # With OpenTelemetry
server.run(store=RedisStore(redis=r))    # With HA storage
```

### Client

Connects to an ACP server and invokes agents:

```python
from acp_sdk.client import Client

async with Client(base_url="http://localhost:8000") as client:
    # List agents
    agents = await client.agents()

    # Synchronous run
    run = await client.run_sync(agent="echo", input=[...])

    # Asynchronous run
    run = await client.run_async(agent="echo", input=[...])

    # Streaming run
    async for event in client.run_stream(agent="echo", input=[...]):
        pass

    # Get run status
    run = await client.get_run(run_id)
```

### Message & MessagePart

Data structures for agent communication:

```python
from acp_sdk.models import Message, MessagePart

message = Message(
    role="user",
    parts=[
        MessagePart(content="Hello", content_type="text/plain"),
        MessagePart(content_url="https://example.com/image.png", content_type="image/png"),
        MessagePart(
            name="result.json",
            content=json.dumps(data),
            content_type="application/json"
        ),
    ]
)
```

### Context

Server-side context providing session access and runtime metadata:

```python
@server.agent()
async def stateful_agent(input: list[Message], context: Context):
    # Access session history
    history = [msg async for msg in context.session.load_history()]

    # Access session state
    state = await context.session.load_state()
    await context.session.store_state(updated_state)
```

---

## Decorators

### `@server.agent()`

| Parameter              | Type        | Default       | Description         |
| ---------------------- | ----------- | ------------- | ------------------- |
| `name`                 | `str`       | Function name | Agent identifier    |
| `description`          | `str`       | Docstring     | Agent capabilities  |
| `input_content_types`  | `list[str]` | `["*/*"]`     | Accepted MIME types |
| `output_content_types` | `list[str]` | `["*/*"]`     | Produced MIME types |

---

## Session Context Manager

```python
async with Client(base_url="http://localhost:8000") as client, client.session() as session:
    run1 = await session.run_sync(agent="chat", input=[Message(...)])
    run2 = await session.run_sync(agent="chat", input=[Message(...)])
    # Both runs share the same session — agent sees full history
```

---

## Yield Patterns

Agents use `AsyncGenerator[RunYield, RunYieldResume]` for output:

```python
from acp_sdk.server import RunYield, RunYieldResume

@server.agent()
async def agent(input: list[Message], context: Context) -> AsyncGenerator[RunYield, RunYieldResume]:
    # Yield intermediate thoughts (non-message)
    yield {"thought": "Analyzing input..."}

    # Yield message parts (included in response)
    yield MessagePart(content="Result", content_type="text/plain")

    # Yield artifacts
    yield MessagePart(
        name="chart.png",
        content=base64_data,
        content_type="image/png",
        content_encoding="base64"
    )
```

---

## Async Patterns

All ACP operations are async-first:

```python
import asyncio
from acp_sdk.client import Client
from acp_sdk.models import Message, MessagePart

async def main():
    async with Client(base_url="http://localhost:8000") as client:
        # Parallel agent invocations
        results = await asyncio.gather(
            client.run_sync(agent="analyzer", input=[...]),
            client.run_sync(agent="classifier", input=[...]),
        )

if __name__ == "__main__":
    asyncio.run(main())
```

---

## Debugging with OpenTelemetry

### Server-Side (One Flag)

```python
server.run(configure_telemetry=True)
```

### Client-Side (Manual Setup)

```python
from opentelemetry.sdk.resources import Resource
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

resource = Resource.create(attributes={"service.name": "acp-client"})
provider = TracerProvider(resource=resource)
provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
trace.set_tracer_provider(provider)
```

### Framework Instrumentation

For LangGraph/LangChain agents, add framework-specific instrumentation:

```python
from openinference.instrumentation.langchain import LangChainInstrumentor
LangChainInstrumentor().instrument()
```

---

## HA Storage Options

| Backend          | Import                                       | Configuration                                   |
| ---------------- | -------------------------------------------- | ----------------------------------------------- |
| Memory (default) | Built-in                                     | `server.run()`                                  |
| Redis            | `from acp_sdk.server import RedisStore`      | `server.run(store=RedisStore(redis=redis))`     |
| PostgreSQL       | `from acp_sdk.server import PostgreSQLStore` | `server.run(store=PostgreSQLStore(aconn=conn))` |

---

## SpecForge Relevance

ACP's SDK patterns inform SpecForge's adapter layer:

- **Claude Code Adapter** (`behaviors/BEH-SF-151-claude-code-adapter.md`): ACP's `@server.agent()` decorator pattern provides an alternative adapter model — SpecForge agents could be exposed via ACP in addition to the current Claude Code adapter, enabling multi-protocol access.
- **Agent Types** (`types/agent.md`): ACP's SDK classes (Server, Client, Message, Context) map to SpecForge's agent type definitions. The `Context` class (with session, history, state) mirrors what SpecForge provides to agents during flow execution.
- **Yield Pattern**: ACP's `AsyncGenerator[RunYield, RunYieldResume]` is a concrete implementation of the streaming/incremental output pattern that SpecForge agents use to report progress during long-running spec generation.
