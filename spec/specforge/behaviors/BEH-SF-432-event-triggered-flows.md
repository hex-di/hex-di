---
id: BEH-SF-432
kind: behavior
title: Event-Triggered Flows
status: active
id_range: 432--439
invariants: [INV-SF-9, INV-SF-12]
adrs: [ADR-007, ADR-011]
types: [flow, hooks]
ports: [EventBusPort, OrchestratorPort, FlowEnginePort, ConfigPort]
---

# 64 — Event-Triggered Flows

**Feature:** [FEAT-SF-030](../features/FEAT-SF-030-event-triggered-flows.md)

---

## BEH-SF-432: Webhook Endpoint Registration — Receive External Events

SpecForge exposes configurable webhook endpoints that receive events from external services (GitHub, GitLab, generic HTTP). Each endpoint is authenticated, validated, and routed to the event processing pipeline.

### Contract

REQUIREMENT (BEH-SF-432): `EventBusPort.registerWebhook(config)` MUST create an HTTP endpoint at the specified path that accepts POST requests. The config MUST specify: `path` (URL path), `source` (provider identifier), `secret` (shared secret for signature verification), and `eventFilter` (array of event types to accept). Incoming requests MUST be verified against the shared secret using HMAC-SHA256 signature validation. Events matching the filter MUST be published to the event bus. Non-matching events MUST be acknowledged (200) but not published. Invalid signatures MUST be rejected with 401.

### Verification

- Registration test: register a webhook; send a valid POST; verify event is published to the bus.
- Signature test: send a request with invalid HMAC signature; verify 401 rejection.
- Filter test: register with filter `["push"]`; send a `pull_request` event; verify it is acknowledged but not published.

---

## BEH-SF-433: Event-to-Flow Mapping — Declarative Trigger Rules

A declarative mapping engine connects events to flows. Each mapping specifies the event source, event type, conditions, and the flow to trigger with optional parameter overrides.

### Contract

REQUIREMENT (BEH-SF-433): `EventBusPort.registerMapping(mapping)` MUST create a rule that triggers a flow when a matching event arrives. The mapping MUST specify: `eventSource`, `eventType`, `conditions` (optional JSONPath expressions evaluated against the event payload), `flowId` (the flow to trigger), and `params` (parameter overrides for the flow). When an event matches a mapping's source, type, and conditions, `FlowEnginePort.trigger(flowId, params, eventContext)` MUST be called. Multiple mappings MAY match the same event, triggering multiple flows.

### Verification

- Mapping test: register a mapping for "github/push"; emit a matching event; verify the flow is triggered.
- Condition test: register a mapping with condition `$.ref == "refs/heads/main"`; emit an event with a different ref; verify the flow is not triggered.
- Multi-match test: register two mappings for the same event; emit the event; verify both flows are triggered.

---

## BEH-SF-434: File Watcher Triggers — Local Change Detection

File watchers monitor local directories for changes to spec files, code files, or configuration. When changes are detected, the watcher emits events that trigger mapped flows for incremental verification.

### Contract

REQUIREMENT (BEH-SF-434): `EventBusPort.registerFileWatcher(config)` MUST start monitoring the specified paths for file system changes. The config MUST specify: `paths` (array of glob patterns), `events` (array of "create", "modify", "delete"), and `debounceMs` (milliseconds to wait before emitting, to batch rapid changes). When changes are detected after the debounce window, the watcher MUST publish a `FileChangeEvent` containing `changedFiles` (array of {path, event}), `timestamp`, and `watcherId`. The watcher MUST ignore changes in `.git/` and `node_modules/` directories by default.

### Verification

- Change detection test: create a file matching the glob; verify `FileChangeEvent` is published.
- Debounce test: create 5 files within the debounce window; verify a single `FileChangeEvent` containing all 5 files.
- Ignore test: create a file in `.git/`; verify no event is published.

---

## BEH-SF-435: Cron-Style Scheduled Triggers — Periodic Flow Execution

Flows can be scheduled to run at regular intervals using cron-style expressions. Scheduled triggers execute flows with preconfigured parameters on a repeating cadence.

### Contract

REQUIREMENT (BEH-SF-435): `EventBusPort.registerSchedule(config)` MUST create a recurring trigger that fires according to the specified cron expression. The config MUST specify: `cronExpression` (standard 5-field cron syntax), `flowId`, `params` (flow parameters), and `timezone` (IANA timezone identifier). When the cron expression matches the current time, the system MUST publish a `ScheduledEvent` and trigger the mapped flow. Missed schedules (system was offline) MUST be detected on startup and optionally fired if configured with `catchUp: true`.

### Verification

- Schedule test: register a schedule; advance time past the cron trigger; verify the flow is triggered.
- Timezone test: register with timezone "America/New_York"; verify trigger times respect the timezone.
- Catchup test: register with `catchUp: true`; simulate system offline during a trigger; restart; verify the missed trigger fires.

---

## BEH-SF-436: Background Execution Queue — Burst Handling with Retry

Triggered flows are executed via a background queue that handles burst events, provides retry with exponential backoff, and ensures no triggers are dropped under load.

### Contract

REQUIREMENT (BEH-SF-436): All event-triggered flows MUST be enqueued in a background execution queue before execution. The queue MUST process flows sequentially by default (configurable concurrency via `ConfigPort.setQueueConcurrency(n)`). Failed flow executions MUST be retried with exponential backoff: initial delay 1s, multiplier 2x, max 3 retries, max delay 30s. The queue MUST persist pending items to survive process restarts. `OrchestratorPort.getQueueStatus()` MUST return: `pending` (count), `running` (count), `failed` (count), and `completed` (count).

### Verification

- Enqueue test: trigger a flow via event; verify it enters the queue before execution.
- Retry test: trigger a flow that fails; verify retry with exponential backoff up to 3 attempts.
- Persistence test: enqueue items; restart the process; verify pending items are still in the queue.

---

## BEH-SF-437: Trigger Authentication — Validate Event Sources

All external triggers (webhooks, API calls) are authenticated to prevent unauthorized flow execution. Authentication methods include HMAC signatures, API keys, and OAuth tokens.

### Contract

REQUIREMENT (BEH-SF-437): Each webhook endpoint MUST validate incoming requests using the configured authentication method. Supported methods: `hmac-sha256` (signature in header), `api-key` (key in header or query parameter), and `oauth` (Bearer token validation). `EventBusPort.setTriggerAuth(webhookId, authConfig)` MUST configure the authentication method for a webhook. Requests failing authentication MUST be rejected with 401 and MUST NOT publish events to the bus. Authentication failures MUST be logged with the source IP and timestamp.

### Verification

- HMAC test: send a request with valid HMAC signature; verify event is published.
- Invalid key test: send a request with an invalid API key; verify 401 rejection.
- Logging test: send an unauthenticated request; verify the failure is logged with source IP.

---

## BEH-SF-438: Event Deduplication and Throttling — Prevent Duplicate Triggers

The event pipeline deduplicates identical events and throttles rapid-fire triggers to prevent redundant flow executions. Deduplication uses event content hashing; throttling uses configurable rate limits.

### Contract

REQUIREMENT (BEH-SF-438): The event pipeline MUST deduplicate events by computing a content hash (SHA-256 of source + type + payload). Events with identical hashes received within the `deduplicationWindowMs` (configurable, default 60000) MUST be dropped with a `DuplicateEventDropped` log entry. Throttling MUST enforce a maximum event rate per source: `ConfigPort.setThrottleRate(source, maxEventsPerMinute)`. Events exceeding the rate MUST be queued (not dropped) and processed when the rate allows. Queued events MUST be processed in FIFO order.

### Verification

- Dedup test: publish the same event twice within the dedup window; verify only one flow is triggered.
- Throttle test: set rate to 2/min; publish 5 events; verify 2 are processed immediately and 3 are queued.
- FIFO test: verify queued events are processed in the order they were received.

---

## BEH-SF-439: Trigger Audit Log — Complete Event History

All trigger events (received, authenticated, mapped, executed, failed) are recorded in an audit log. The audit log provides a complete history of event-triggered flow executions for debugging and compliance.

### Contract

REQUIREMENT (BEH-SF-439): Every event that enters the trigger pipeline MUST generate audit log entries for each stage: `received` (event arrived), `authenticated` (auth result), `mapped` (matching mappings found), `enqueued` (added to execution queue), `executed` (flow execution result), and `failed` (if any stage fails). Each entry MUST contain: `eventId`, `timestamp`, `stage`, `result` ("success" or "failure"), `details` (stage-specific metadata), and `durationMs`. `EventBusPort.getAuditLog(filter)` MUST return entries matching the filter criteria (by eventId, source, timeRange, or stage).

### Verification

- Full pipeline test: trigger a flow via webhook; verify audit entries for all stages (received -> authenticated -> mapped -> enqueued -> executed).
- Failure test: trigger with invalid auth; verify audit entries for received and authenticated (failure).
- Filter test: query audit log by source; verify only matching entries are returned.
