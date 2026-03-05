# 08 — Configuration

This chapter specifies the adapter factory, its configuration options, and how it integrates with the HexDI Guard system.

---

## Adapter Factory

REQUIREMENT (RG-CFG-001): The `createRegoAdapter` function MUST be the primary entry point for creating a Guard-compatible OPA/Rego adapter. It returns `Promise<Result<RegoAdapter, RegoAdapterCreationError>>`.

```ts
async function createRegoAdapter(
  config: RegoAdapterConfig
): Promise<Result<RegoAdapter, RegoAdapterCreationError>>;

interface RegoAdapter {
  readonly engine: RegoEnginePort;
  readonly inputMapper: InputMapper;
  readonly evaluate: (
    context: EvaluationContext,
    path: string,
    options?: RegoEvaluateOptions
  ) => Promise<Result<Decision, RegoAdapterError>>;
  readonly health: () => Promise<Result<OpaHealthStatus, RegoEngineError>>;
}
```

REQUIREMENT (RG-CFG-002): The `RegoAdapterConfig` MUST accept OPA connection options, input mapping configuration, and optional evaluation defaults.

```ts
interface RegoAdapterConfig {
  readonly baseUrl: string; // e.g., "http://localhost:8181"
  readonly timeout?: number; // ms, default: 5000
  readonly retries?: number; // default: 0
  readonly retryDelay?: number; // ms, default: 100
  readonly headers?: Readonly<Record<string, string>>;
  readonly metrics?: boolean; // default: false
  readonly provenance?: boolean; // default: false
  readonly healthCheckOnCreate?: boolean; // default: true
  readonly defaultAdditionalInput?: Readonly<Record<string, unknown>>;
  readonly fetchImpl?: typeof fetch; // injectable for testing
}
```

REQUIREMENT (RG-CFG-003): The factory MUST perform the following steps:

1. Validate the configuration (baseUrl is a valid URL, timeout > 0)
2. Create the HTTP client with the configured options
3. Perform a health check (if `healthCheckOnCreate` is true)
4. Return the assembled `RegoAdapter`

If any step fails, the factory MUST return `Err` with the specific error.

---

## OPA Connection Options

REQUIREMENT (RG-CFG-010): The `baseUrl` MUST be a valid HTTP or HTTPS URL pointing to the OPA daemon. The adapter appends API paths (`/v1/data/...`, `/health`) to this base URL.

REQUIREMENT (RG-CFG-011): The `timeout` MUST apply to each individual HTTP request. If a request exceeds the timeout, the adapter returns `RegoEngineError` with tag `"timeout"`.

REQUIREMENT (RG-CFG-012): When `retries` is greater than 0, the adapter MUST retry failed requests (network errors and timeouts only, NOT OPA 4xx/5xx responses). Retry delay follows exponential backoff starting from `retryDelay`.

```ts
// Retry delay: retryDelay * 2^attempt
// retries: 3, retryDelay: 100ms
// Attempt 0: immediate
// Attempt 1: 100ms delay
// Attempt 2: 200ms delay
// Attempt 3: 400ms delay
```

REQUIREMENT (RG-CFG-013): Custom `headers` are sent with every HTTP request. This supports OPA deployments behind authentication proxies (e.g., `Authorization: Bearer <token>`).

REQUIREMENT (RG-CFG-014): When `metrics` is `true`, the adapter appends `?metrics=true` to OPA query URLs. OPA returns evaluation timing metrics in the response.

REQUIREMENT (RG-CFG-015): When `provenance` is `true`, the adapter appends `?provenance=true` to OPA query URLs. OPA returns bundle revision information.

---

## Input Mapping Options

REQUIREMENT (RG-CFG-020): The `defaultAdditionalInput` provides static input fields that are merged into every OPA query's input document. Per-evaluation `additionalInput` overrides defaults.

```ts
const adapter = await createRegoAdapter({
  baseUrl: "http://localhost:8181",
  defaultAdditionalInput: {
    environment: {
      region: "us-east-1",
      stage: "production",
    },
  },
});
```

REQUIREMENT (RG-CFG-021): Input mapping configuration is minimal because OPA's input document is a direct projection of Guard's evaluation context. No entity type mapping is needed (unlike Cedar's typed entity model).

---

## Guard Integration

REQUIREMENT (RG-CFG-030): The `regoPolicy` factory function MUST accept a reference to a `RegoAdapter` instance and produce a Guard `PolicyConstraint`.

```ts
function regoPolicy(
  adapter: RegoAdapter,
  path: string,
  options?: RegoPolicyOptions
): PolicyConstraint;
```

REQUIREMENT (RG-CFG-031): The produced `PolicyConstraint` MUST be usable with Guard's `evaluateAsync()` function. When Guard encounters a `regoPolicy` kind during evaluation, it MUST delegate to the Rego adapter's async `evaluate` method.

REQUIREMENT (RG-CFG-032): Because OPA evaluation is asynchronous (HTTP), the `regoPolicy` constraint MUST be evaluated via Guard's `evaluateAsync()`, NOT the synchronous `evaluate()`. If a `regoPolicy` is passed to the synchronous `evaluate()`, it MUST return `Err(PolicyEvaluationError)` with a message indicating that async evaluation is required.

REQUIREMENT (RG-CFG-033): The Rego adapter MUST be injectable via HexDI's dependency graph.

```ts
// Example DI registration:
const regoPort = createPort<RegoAdapter>("rego-engine");

const regoAdapter = createAdapter({
  port: regoPort,
  factory: async () =>
    createRegoAdapter({
      baseUrl: "http://localhost:8181",
      healthCheckOnCreate: true,
    }),
});
```

REQUIREMENT (RG-CFG-034): The Rego adapter MUST support being wrapped with Guard's `guard()` function for policy enforcement at port resolution time.

```ts
// Example: OPA-backed authorization on a document service
const documentService = guard({
  adapter: documentServiceAdapter,
  policy: allOf([
    hasRole("viewer"), // native Guard check (sync)
    regoPolicy(regoAdapter, "authz/documents/allow"), // OPA check (async)
  ]),
  subject: subjectProvider,
});
```

---

## Evaluation Options

REQUIREMENT (RG-CFG-040): The `RegoEvaluateOptions` MUST support per-evaluation overrides.

```ts
interface RegoEvaluateOptions {
  readonly additionalInput?: Readonly<Record<string, unknown>>;
  readonly timeout?: number; // per-evaluation timeout override
  readonly decisionPath?: string; // navigate into result (e.g., "result.decision")
}
```

REQUIREMENT (RG-CFG-041): Per-evaluation `additionalInput` MUST be merged with `defaultAdditionalInput`. Per-evaluation values override defaults (shallow merge at each key level).

REQUIREMENT (RG-CFG-042): The `decisionPath` option allows navigating into nested OPA results. For example, if the Rego policy returns `{"result": {"decision": {"allow": true}}}`, setting `decisionPath: "result.decision"` extracts the nested `{"allow": true}` for decision parsing. Each dot-separated segment navigates one level deeper.
