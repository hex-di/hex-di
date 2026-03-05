---
id: TYPE-SF-003
kind: types
title: API Wire Format Types
status: active
domain: api
behaviors: []
adrs: []
---

# API Wire Format Types

---

## REST Endpoints

### Agent Discovery

```typescript
// GET /agents
interface AgentListResponse {
  readonly agents: ReadonlyArray<ACPAgentManifest>;
}
```

### Run Management

```typescript
// POST /runs
interface CreateRunRequest {
  readonly agentId: string;
  readonly sessionId?: string;
  readonly input: ReadonlyArray<ACPMessage>;
  readonly streaming?: boolean;
  readonly maxBudgetUsd?: number;
}

interface CreateRunResponse {
  readonly runId: string;
  readonly status: RunStatus;
  readonly createdAt: string; // ISO 8601
}

// GET /runs/{runId}
interface GetRunResponse {
  readonly runId: string;
  readonly agentId: string;
  readonly status: RunStatus;
  readonly output: ReadonlyArray<ACPMessage>;
  readonly createdAt: string;
  readonly completedAt?: string;
}

// POST /runs/{runId}/cancel
interface CancelRunResponse {
  readonly runId: string;
  readonly status: "cancelling" | "cancelled";
}

// POST /runs/{runId}/resume
interface ResumeRunRequest {
  readonly input: ReadonlyArray<ACPMessage>;
}
```

### Health Check

```typescript
// GET /health
interface HealthResponse {
  readonly status: "healthy" | "degraded" | "unhealthy";
  readonly checks: Record<string, "ok" | "degraded" | "failed">;
  readonly uptime: number;
  readonly version: string;
}
```

---

## Error Response Wire Format

All error responses follow this format:

```typescript
interface ErrorResponse {
  readonly _tag: string; // Discriminant tag matching the error type
  readonly message: string; // Human-readable error message
  readonly context: Record<string, unknown>; // Structured error context
  readonly timestamp: string; // ISO 8601 timestamp
}
```

HTTP status code mapping:

- 400: Validation errors (malformed request, invalid state transition)
- 401: Authentication errors (missing/invalid Bearer token)
- 403: Authorization errors (untrusted external agent, insufficient permissions)
- 404: Not found (unknown run ID, unknown agent ID)
- 429: Rate limit exceeded
- 500: Internal server errors
- 503: Server unhealthy / overloaded

---

## WebSocket Message Envelope

```typescript
interface WSMessageEnvelope {
  readonly type:
    | "run.status"
    | "run.output"
    | "run.error"
    | "agent.registered"
    | "agent.deregistered";
  readonly runId?: string;
  readonly agentId?: string;
  readonly payload: unknown; // Type-specific payload
  readonly timestamp: string; // ISO 8601
  readonly sequence: number; // Monotonically increasing per connection
}
```

---

## SSE Event Format

For streaming runs (`GET /runs/{runId}/stream`):

```typescript
// SSE event: "message"
interface SSERunEvent {
  readonly type: "output" | "status" | "error" | "done";
  readonly data: ACPMessage | RunStatus | ErrorResponse | null;
  readonly sequence: number;
}
```

SSE event stream:

- `event: message` with `type: "output"` -- incremental output message part
- `event: message` with `type: "status"` -- run state transition
- `event: message` with `type: "error"` -- run error
- `event: message` with `type: "done"` -- stream complete (terminal state reached)
