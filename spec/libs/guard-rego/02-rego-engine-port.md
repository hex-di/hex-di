# 02 — Rego Engine Port

The `RegoEnginePort` is the primary interface for OPA/Rego policy evaluation. It sends a query to OPA's Data API and returns the parsed response wrapped in a `Result`.

---

## RegoEnginePort Interface

REQUIREMENT (RG-PORT-001): The `RegoEnginePort` MUST define an async `query` method that sends an OPA query request and returns `Promise<Result<OpaQueryResponse, RegoEngineError>>`.

```ts
interface RegoEnginePort {
  readonly query: (request: OpaQueryRequest) => Promise<Result<OpaQueryResponse, RegoEngineError>>;
}
```

REQUIREMENT (RG-PORT-002): The `RegoEnginePort` MUST define a `health` method that checks OPA's availability via `GET /health` and returns `Promise<Result<OpaHealthStatus, RegoEngineError>>`.

```ts
interface RegoEnginePort {
  readonly health: () => Promise<Result<OpaHealthStatus, RegoEngineError>>;
}

interface OpaHealthStatus {
  readonly healthy: boolean;
  readonly bundlesReady?: boolean;
  readonly pluginsReady?: boolean;
}
```

REQUIREMENT (RG-PORT-003): The `RegoEnginePort` MUST be a pure port interface with no dependency on HTTP client implementation details. Adapters implement this port.

---

## OPA Query Request

REQUIREMENT (RG-PORT-010): The `OpaQueryRequest` MUST contain: the policy path (Rego package path), and the input document.

```ts
interface OpaQueryRequest {
  readonly path: string;
  readonly input: Readonly<Record<string, unknown>>;
}
```

REQUIREMENT (RG-PORT-011): The `path` field MUST be the Rego package path without the `/v1/data/` prefix. For example, `"authz/documents/allow"` maps to `POST /v1/data/authz/documents/allow`.

REQUIREMENT (RG-PORT-012): The `input` field MUST be a plain JSON-serializable object. It is sent as the `"input"` field in the OPA request body.

---

## OPA Query Response

REQUIREMENT (RG-PORT-020): The `OpaQueryResponse` MUST contain the raw OPA `result` field and the HTTP response metadata.

```ts
interface OpaQueryResponse {
  readonly result: unknown;
  readonly decisionId?: string;
  readonly httpStatus: number;
  readonly metrics?: OpaMetrics;
}

interface OpaMetrics {
  readonly timerServerHandlerNs?: number;
  readonly timerRegoQueryEvalNs?: number;
  readonly timerRegoQueryCompileNs?: number;
}
```

REQUIREMENT (RG-PORT-021): The `result` field MUST be the raw JSON value returned by OPA. Its structure depends on the Rego policy being evaluated. The decision mapper (§06) is responsible for interpreting it.

REQUIREMENT (RG-PORT-022): If OPA returns a `decisionId` in the response, it MUST be captured and propagated to the Guard `Decision` trace for audit correlation.

REQUIREMENT (RG-PORT-023): If OPA returns `metrics` (when configured with `?metrics=true`), they MUST be captured in the response for observability.

REQUIREMENT (RG-PORT-024): If OPA returns HTTP 200 with an empty result (undefined decision), the adapter MUST treat this as a `deny` decision per OPA's convention that undefined = no matching rules = deny.

---

## Port Factory

REQUIREMENT (RG-PORT-030): The `createRegoEngine` factory MUST return `Promise<Result<RegoEnginePort, RegoEngineCreationError>>`. The factory accepts a `RegoEngineConfig` with OPA connection options.

```ts
async function createRegoEngine(
  config: RegoEngineConfig
): Promise<Result<RegoEnginePort, RegoEngineCreationError>>;

interface RegoEngineConfig {
  readonly baseUrl: string; // e.g., "http://localhost:8181"
  readonly timeout?: number; // ms, default: 5000
  readonly retries?: number; // default: 0
  readonly retryDelay?: number; // ms, default: 100
  readonly headers?: Readonly<Record<string, string>>; // custom headers (e.g., auth token)
  readonly metrics?: boolean; // request OPA metrics, default: false
  readonly healthCheckOnCreate?: boolean; // default: true
  readonly fetchImpl?: typeof fetch; // injectable fetch for testing
}
```

REQUIREMENT (RG-PORT-031): When `healthCheckOnCreate` is `true` (default), the factory MUST call OPA's `/health` endpoint. If the health check fails, the factory MUST return `Err(RegoEngineCreationError)` with tag `"opa-unreachable"`.

REQUIREMENT (RG-PORT-032): The `fetchImpl` parameter allows injecting a custom `fetch` implementation for testing. When not provided, the global `fetch` is used.

REQUIREMENT (RG-PORT-033): The factory MUST NOT throw. All initialization errors are returned via `Result.Err`.
