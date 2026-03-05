---
id: BEH-SF-095
kind: behavior
title: Deployment Modes
status: active
id_range: "095--100"
invariants: [INV-SF-24, INV-SF-29]
adrs: [ADR-005]
types: [cloud, cloud]
ports:
  [
    GraphStorePort,
    AuthPort,
    BillingPort,
    MarketplacePort,
    TelemetryPort,
    ConfigPort,
    HealthCheckPort,
  ]
---

# 13 — Deployment Modes

## BEH-SF-095: Solo Mode — Local Server + Local Neo4j, No Auth, All Features

Solo self-hosted mode is a single-developer deployment. The local SpecForge Server connects to a local Neo4j instance via `bolt://localhost:7687`. No authentication is required. All features are available including all 5 flows, all 8 agent roles, composition, analytics, and `specforge ask`.

### Contract

REQUIREMENT (BEH-SF-095): When `mode: "solo"` is configured, the system MUST use `LocalNeo4jAdapter` to connect to a local Neo4j instance, MUST use `NoOpAuthAdapter` (all auth methods return success), and MUST use `NoOpBillingAdapter`. All 5 flows, all 8 agent roles, analytics, composition, and `specforge ask` MUST be available. No login MUST be required.

### Verification

- Adapter test: verify solo mode loads `LocalNeo4jAdapter`, `NoOpAuthAdapter`, `NoOpBillingAdapter`.
- No auth test: verify all operations succeed without authentication.
- Feature parity test: verify all 5 predefined flows, all 8 agent roles, composition, and analytics are functional.
- Default connection test: verify the default Neo4j URI is `bolt://localhost:7687`.

---

## BEH-SF-096: SaaS Mode — Local Server + Cloud Neo4j, OAuth, Billing, All Features

SaaS mode connects the local SpecForge Server to SpecForge Cloud for managed Neo4j, OAuth authentication, billing, and the agent marketplace. All features are available.

### Contract

REQUIREMENT (BEH-SF-096): When `mode: "saas"` is configured (the default), the system MUST use `CloudNeo4jAdapter` (graph operations via HTTPS to SpecForge Cloud), MUST use `CloudOAuthAdapter` (GitHub/Google OAuth, JWT issuance), and MUST use `StripeBillingAdapter`. Claude Code CLI credentials MUST remain local — SpecForge Cloud MUST NOT access them.

### Verification

- Adapter test: verify SaaS mode loads `CloudNeo4jAdapter`, `CloudOAuthAdapter`, `StripeBillingAdapter`.
- OAuth test: verify login triggers a browser OAuth flow and returns a JWT.
- Credential isolation test: verify no Claude Code CLI credentials are transmitted to SpecForge Cloud.
- Feature parity test: verify all features are available regardless of billing tier.

---

## BEH-SF-097: Feature Parity — All Flows, Agents, Analytics Available in All Modes

All SpecForge features (5 flows, 8 agent roles, `specforge ask`, composition, analytics) are available in all deployment modes. Tiers gate cloud infrastructure, not features.

### Contract

REQUIREMENT (BEH-SF-097): The following features MUST be available in both solo and SaaS modes without any tier restriction: all 5 predefined flows (spec-writing, reverse, code-review, risk-assessment, onboarding), all 8 agent roles, `specforge ask` NLQ, session composition, and analytics. The only mode-specific differences MUST be: managed infrastructure and billing (SaaS only).

### Verification

- Solo features test: run each flow, composition, and analytics in solo mode; verify all work.
- SaaS features test: run each flow plus cloud features in SaaS mode; verify all work.
- No tier gating test: verify no feature check gates on billing tier.
- Agent count test: verify all 8 agent roles are available in both modes.

---

## BEH-SF-098: Mode Detection — from `.specforge/config.json` Mode Field

The deployment mode is determined by the `mode` field in `.specforge/config.json`. The server reads this field at startup to determine which backend adapters to load.

### Contract

REQUIREMENT (BEH-SF-098): The system MUST read the `mode` field from `.specforge/config.json` at server startup. Valid values MUST be `"solo"` and `"saas"`. The default MUST be `"solo"` if the field is absent. The `SPECFORGE_MODE` environment variable MUST override the config file value.

### Verification

- Config test: set `mode: "solo"` in config; start the server; verify solo adapters are loaded.
- Default test: omit the `mode` field; verify the system defaults to `solo`.
- Env override test: set `SPECFORGE_MODE=solo`; verify it overrides the config file value.
- Invalid mode test: set `mode: "invalid"`; verify the server reports a configuration error (exit code 3).

---

## BEH-SF-099: Onboarding Solo — Init, Server Start, Reverse (No Auth)

Solo onboarding flow: `specforge init --mode solo` creates config, `specforge server start` starts the server, `specforge reverse .` runs the first flow immediately against the local codebase.

### Contract

REQUIREMENT (BEH-SF-099): The solo onboarding path MUST: (a) `specforge init --mode solo` creates `.specforge/config.json` with `mode: "solo"` and validates local Neo4j connectivity, (b) `specforge server start` starts the local SpecForge Server, (c) `specforge reverse .` runs the reverse engineering flow immediately without authentication. No login step MUST be required.

### Verification

- Init test: run `specforge init --mode solo`; verify `.specforge/config.json` is created with correct content.
- Server test: run `specforge server start`; verify the server starts and connects to local Neo4j.
- Flow test: run `specforge reverse .`; verify the flow executes without authentication.
- End-to-end test: run the full onboarding sequence; verify results appear in the graph.

---

## BEH-SF-100: Onboarding SaaS — Login, Reverse (Zero Config, < 5 Minutes)

SaaS onboarding flow: `specforge login` triggers OAuth, `specforge reverse .` runs immediately against the local codebase with results pushed to managed Neo4j. Total time target: less than 5 minutes from download to first value.

### Contract

REQUIREMENT (BEH-SF-100): The SaaS onboarding path MUST: (a) `specforge login` opens a browser OAuth flow and stores the JWT, (b) `specforge reverse .` runs the reverse engineering flow with results pushed to the managed Neo4j via Cloud API. The user MUST NOT need to configure Neo4j credentials. The entire flow from login to visible results MUST be achievable in under 5 minutes.

### Verification

- Login test: run `specforge login` in SaaS mode; verify it opens the browser OAuth flow and stores credentials.
- Zero config test: verify no Neo4j configuration is required by the user.
- Flow test: run `specforge reverse .`; verify results are visible in the graph.
- Timing test: measure the elapsed time from login to first graph results; target < 5 minutes.

---

## Server Startup Error Handling

**BEH-SF-DEPLOY-01:** REQUIREMENT: Server startup MUST follow a sequential initialization sequence. On failure at step N, steps 1..N-1 MUST be rolled back in reverse order.

**BEH-SF-DEPLOY-02:** REQUIREMENT: Startup failure MUST produce a structured error log with the failed step name, step number, and cause.

Startup sequence:

1. Load configuration (ConfigPort)
2. Validate port bindings
3. Connect to Neo4j (GraphStorePort)
4. Start ACP server (ACPServerPort)
5. Start WebSocket server
6. Bind HTTP endpoints
7. Write lock file
8. Report healthy

---

## Lock File Protocol

**BEH-SF-DEPLOY-03:** REQUIREMENT: Lock file acquisition MUST use atomic file locking (`flock()` on Unix, `LockFileEx()` on Windows).

**BEH-SF-DEPLOY-04:** REQUIREMENT: Lock file MUST be JSON format with fields: `pid` (number), `port` (number), `startedAt` (ISO 8601 string), `version` (string), `embedded` (boolean).

**BEH-SF-DEPLOY-05:** REQUIREMENT: Stale lock file detection MUST check if the PID is alive via `kill(pid, 0)`. Stale locks MUST be removed and re-acquired.

- **Location:** `.specforge/server.lock`
- **Permissions:** `0600` (owner read/write only)
- **Retry:** 3 attempts with 500ms backoff between attempts

---

## Mode Detection Precedence

**BEH-SF-DEPLOY-06:** REQUIREMENT: Deployment mode MUST be determined by the following precedence (highest first):

1. `SPECFORGE_MODE` environment variable
2. `.specforge/config.json` field `mode`
3. Default: `"solo"`

---

## Health Check Contract

**BEH-SF-DEPLOY-07:** REQUIREMENT: `GET /health` MUST return a JSON response with the following schema:

```typescript
interface HealthResponse {
  readonly status: "healthy" | "degraded" | "unhealthy";
  readonly checks: Record<string, "ok" | "degraded" | "failed">;
  readonly uptime: number;
  readonly version: string;
}
```

- HTTP 200 for `healthy` or `degraded` status
- HTTP 503 for `unhealthy` status
- Individual check timeout: 5 seconds
- Total health check timeout: 15 seconds

---

## Graceful Shutdown

**BEH-SF-DEPLOY-08:** REQUIREMENT: On SIGTERM, the server MUST execute the following shutdown sequence:

1. Stop accepting new flow runs
2. Drain in-flight runs (30-second timeout)
3. Close WebSocket connections (code 1000 Normal Closure)
4. Disconnect from Neo4j
5. Remove lock file
6. Exit with code 0

**BEH-SF-DEPLOY-09:** REQUIREMENT: If in-flight runs do not complete within 30 seconds, they MUST be forcefully cancelled.

---

## Neo4j Connection Lifecycle

**BEH-SF-DEPLOY-10:** REQUIREMENT: Neo4j connection pool size MUST be configurable: 10 (solo default), 50 (SaaS default).

**BEH-SF-DEPLOY-11:** REQUIREMENT: Idle connections MUST be closed after 60 seconds.

**BEH-SF-DEPLOY-12:** REQUIREMENT: Connection retry MUST use exponential backoff: 3 attempts at 1s, 2s, 4s intervals.

**BEH-SF-DEPLOY-13:** REQUIREMENT: Mid-flow Neo4j unavailability MUST trigger event buffering. Buffered events MUST be replayed on reconnection via `GraphSyncService.fullRebuild()`.

---

## CLI Embedded Server

**BEH-SF-DEPLOY-14:** REQUIREMENT: CLI-started servers MUST set `embedded: true` in the lock file.

**BEH-SF-DEPLOY-15:** REQUIREMENT: Desktop App MUST NOT adopt embedded servers (check `embedded` flag in lock file).

**BEH-SF-DEPLOY-16:** REQUIREMENT: Embedded servers MUST auto-shutdown when the parent CLI process exits.

---

> **Multi-client discovery (M30):** The lock file is the coordination point. The first client to acquire the lock starts the server. Subsequent clients read the lock file for the server port and connect.

**BEH-SF-DEPLOY-17:** REQUIREMENT: Default port MUST be 7432. Environment override via `SPECFORGE_PORT`. On port conflict, increment until available (max 10 attempts).

**BEH-SF-DEPLOY-18:** REQUIREMENT: Server MUST reject clients with incompatible major version via `X-SpecForge-Version` header check. Semver major version = breaking.

---

## Degraded Mode

**BEH-SF-DEPLOY-19:** REQUIREMENT: Critical ports (GraphStorePort, MessageExchangePort, SessionManagerPort) being unavailable MUST result in `unhealthy` status.

**BEH-SF-DEPLOY-20:** REQUIREMENT: Non-critical ports (TelemetryPort, AnalyticsPort, CachePort) being unavailable MUST result in `degraded` status.

**BEH-SF-DEPLOY-21:** REQUIREMENT: Degraded mode MUST exit automatically when the unavailable port reconnects successfully.

---

> **Structured error format (N12):** All server errors use the format: `{ _tag: string, message: string, context: Record<string, unknown>, timestamp: string }`.

---

## Mode-Switched Port Behaviors

### BillingService

**BEH-SF-353:** In solo mode, `BillingService` (NoOpBilling) MUST return `active` subscription status for all queries.

**BEH-SF-354:** In SaaS mode, `BillingService` (StripeBilling) MUST check subscription status before allowing flow execution.

### TelemetryService

**BEH-SF-355:** In solo mode, `TelemetryService` (NoOpTelemetry) MUST be a complete no-op — zero network calls, zero disk writes.

**BEH-SF-356:** In SaaS mode, `TelemetryService` MUST collect anonymous usage metrics and batch-send at 60-second intervals.

### MarketplaceService

**BEH-SF-357:** In solo mode, `MarketplaceService` (LocalFiles) MUST load templates from `~/.specforge/templates/` with file-watching for hot reload.

**BEH-SF-358:** In SaaS mode, `MarketplaceService` (CloudMarketplace) MUST cache template listings for 5 minutes to reduce API calls.

---
