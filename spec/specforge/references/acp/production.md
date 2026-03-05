# ACP — Production-Grade Features

**Source:** [Production Grade](https://agentcommunicationprotocol.dev/core-concepts/production-grade), [High Availability](https://agentcommunicationprotocol.dev/how-to/high-availability), [Debug with OpenTelemetry](https://agentcommunicationprotocol.dev/how-to/debug)
**Captured:** 2026-02-28

---

## Security

ACP implements HTTP-native security mechanisms:

| Layer                   | Mechanism                                                         |
| ----------------------- | ----------------------------------------------------------------- |
| **Transport**           | TLS encryption for end-to-end secure communication                |
| **Authentication**      | Basic Auth, Bearer tokens, JWTs                                   |
| **Access Control**      | Reverse proxy integration to enforce security policies            |
| **Identity Federation** | Under development — multi-provider auth, consistent authorization |

---

## Scalability

ACP is designed as a stateless protocol (like HTTP), enabling standard scaling patterns:

- **Load Balancing**: Deploy behind standard HTTP load balancers; session-based routing for stateful agents
- **Kubernetes**: Full integration with K8s and cloud-native platforms
- **Horizontal Scaling**: Multiple server replicas with shared storage backends
- **No Session Affinity Required**: With external storage, any replica can handle any request

---

## Storage Backends

Three backends for managing distributed state in HA deployments:

### Memory Store (Default)

| Property        | Value                        |
| --------------- | ---------------------------- |
| **Use Case**    | Development, single-instance |
| **Persistence** | None — data lost on restart  |
| **HA Support**  | No                           |

### Redis Store

```python
from acp_sdk.server import RedisStore, Server
from redis.asyncio import Redis

redis = Redis(host="your-redis-host", port=6379, password="your-redis-password")
server = Server()

@server.agent()
async def my_agent(input):
    pass

server.run(store=RedisStore(redis=redis))
```

| Property         | Value                                       |
| ---------------- | ------------------------------------------- |
| **Use Case**     | Production HA with fast access              |
| **Features**     | Pub/Sub notifications, automatic expiration |
| **Requirements** | Redis 6.0+ accessible across all replicas   |

### PostgreSQL Store

```python
from acp_sdk.server import PostgreSQLStore, Server
from psycopg import AsyncConnection

aconn = await AsyncConnection.connect("postgresql://user:password@host:5432/database")
server = Server()

@server.agent()
async def my_agent(input):
    pass

server.run(store=PostgreSQLStore(aconn=aconn, table="acp_store", channel="acp_update"))
```

| Property         | Value                                            |
| ---------------- | ------------------------------------------------ |
| **Use Case**     | Production HA with persistence                   |
| **Features**     | ACID compliance, LISTEN/NOTIFY for notifications |
| **Requirements** | PostgreSQL 12+ with JSONB support                |

---

## Observability

### OpenTelemetry Integration

The ACP SDK provides built-in OpenTelemetry support:

```python
server = Server()

@server.agent()
async def my_agent(input: list[Message]):
    yield message

server.run(configure_telemetry=True)  # Enable tracing
```

### Tracing Backends

**Jaeger** — General-purpose distributed tracing:

```bash
docker run --rm \
  -e COLLECTOR_ZIPKIN_HOST_PORT=:9411 \
  -p 16686:16686 -p 4317:4317 -p 4318:4318 -p 9411:9411 \
  jaegertracing/all-in-one:latest
```

Access traces at `http://localhost:16686/search`.

**Phoenix** — AI-focused observability with agent-specific semantic conventions:

```bash
docker run -p 4318:6006 -i -t arizephoenix/phoenix
```

Access traces at `http://localhost:4318/projects`.

### Client-Side Telemetry

```python
from opentelemetry.sdk.resources import Resource
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

def setup_tracer():
    resource = Resource.create(attributes={"service.name": "acp-client"})
    provider = TracerProvider(resource=resource)
    provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
    trace.set_tracer_provider(provider)
```

### Standards Compatibility

| Standard          | Purpose                             |
| ----------------- | ----------------------------------- |
| **OpenTelemetry** | Distributed tracing and metrics     |
| **OpenInference** | AI/ML-specific semantic conventions |
| **OpenLLMetry**   | LLM observability framework         |

---

## Deployment

ACP provides **standalone ASGI application** support via SDK factory functions, enabling integration with external ASGI servers:

- FastAPI integration
- Uvicorn deployment
- Standard Docker containerization
- Kubernetes orchestration

---

## SpecForge Relevance

ACP's production features inform SpecForge's deployment and operations strategy:

- **Deployment** (`deployment-saas.md`): ACP's storage backend options (Memory → Redis → PostgreSQL) provide a concrete progression path for SpecForge's own session persistence — development with in-memory, production with Redis/PostgreSQL.
- **Cloud Services** (`c3-cloud-services.md`): ACP's Kubernetes-native scaling and load balancing patterns apply directly to SpecForge's cloud deployment topology.
- **Deployment Modes** (`behaviors/BEH-SF-095-deployment-modes.md`): ACP's HA deployment with multiple replicas behind a load balancer maps to SpecForge's horizontal scaling requirements.
- **Observability**: ACP's OpenTelemetry integration provides a model for SpecForge's agent tracing — tracking spec generation flows across multiple agent interactions with distributed tracing.
