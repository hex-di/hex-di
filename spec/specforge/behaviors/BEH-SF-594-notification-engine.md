---
id: BEH-SF-594
kind: behavior
title: Notification Engine
status: active
id_range: 594--597
invariants: [INV-SF-12]
adrs: [ADR-011]
types: [hooks, extensibility]
ports: [NotificationRouterPort, EventBusPort]
---

# 51 — Notification Engine

---

## BEH-SF-594: Notification Event Aggregation from EventBusPort

> **Invariant:** None

The notification engine subscribes to the EventBusPort and aggregates platform events (flow completions, findings, approval requests, drift alerts, budget warnings, backend failures) into a unified notification stream. Events are classified by type and severity before entering the routing pipeline.

### Contract

REQUIREMENT (BEH-SF-594): The notification engine MUST subscribe to all event channels on `EventBusPort` and aggregate incoming events into a `NotificationEvent` stream. Each `NotificationEvent` MUST include: `eventId` (unique identifier), `eventType` (the originating event type, e.g., `"flow.completed"`, `"finding.created"`, `"approval.requested"`), `severity` (`"critical"` | `"high"` | `"medium"` | `"low"` | `"info"`), `timestamp` (ISO 8601), `payload` (event-specific data), and `source` (subsystem identifier). The engine MUST NOT drop events during aggregation — all events emitted on subscribed channels MUST appear in the notification stream. The engine MUST classify events into severity levels based on configurable classification rules (see BEH-SF-596). Events that do not match any classification rule MUST default to `"info"` severity.

### Verification

- Unit test: Flow completion event on EventBusPort produces a `NotificationEvent` with correct `eventType` and `severity`.
- Unit test: All event fields (`eventId`, `eventType`, `severity`, `timestamp`, `payload`, `source`) are populated.
- Unit test: Events without matching classification rules default to `"info"` severity.
- Unit test: Concurrent events from multiple channels are all captured (no dropped events).
- Integration test: Subscribing to EventBusPort and emitting 10 events produces 10 `NotificationEvent` entries.

---

## BEH-SF-595: Notification Routing to User-Configured Channels

> **Invariant:** None

Classified notification events are routed to delivery channels based on user and organization configuration. Supported channels include OS notifications (desktop app), browser notifications (web dashboard), VS Code notification panel, email digests (SaaS mode), and webhook callbacks (CI integrations).

### Contract

REQUIREMENT (BEH-SF-595): `NotificationRouterPort.route(event: NotificationEvent)` MUST evaluate the event against the routing rules configured for the target user or organization. Each routing rule MUST specify: `channelType` (one of `"os"`, `"browser"`, `"vscode"`, `"email"`, `"webhook"`), `filter` (event type and severity conditions that must match), and `config` (channel-specific delivery configuration such as webhook URL or email address). The router MUST dispatch the event to ALL channels whose filters match. Failed delivery to one channel MUST NOT block delivery to other channels — each channel dispatch is independent. The router MUST emit a `NotificationDispatchLog` entry for each dispatch attempt, recording `eventId`, `channelType`, `status` (`"delivered"` | `"failed"`), and `timestamp`. If no routing rules match an event, the event MUST be silently discarded (no error).

### Verification

- Unit test: Event matching two routing rules dispatches to both channels.
- Unit test: Failed dispatch to webhook does not prevent dispatch to email.
- Unit test: `NotificationDispatchLog` records correct status for each channel attempt.
- Unit test: Event with no matching routing rules is discarded without error.
- Unit test: Channel-specific config (e.g., webhook URL) is passed to the delivery adapter.

---

## BEH-SF-596: Notification Preference Configuration per Event Type

> **Invariant:** None

Users configure notification preferences to control which event types and severities produce notifications on which channels. Preferences are persisted and applied across sessions.

### Contract

REQUIREMENT (BEH-SF-596): `NotificationRouterPort.setPreferences(userId, preferences: NotificationPreference[])` MUST persist notification preferences for the specified user. Each `NotificationPreference` MUST include: `eventTypePattern` (glob pattern matching event types, e.g., `"flow.*"`, `"finding.created"`), `severityThreshold` (minimum severity to trigger notification), and `channels` (array of enabled channel types). `NotificationRouterPort.getPreferences(userId)` MUST return the persisted preferences for the user. When routing an event (BEH-SF-595), user preferences MUST be applied as an additional filter — a channel dispatch only occurs if the event passes both the routing rule filter AND the user's preference threshold. Preferences MUST survive application restarts (persisted to configuration store). Default preferences MUST be applied for users who have not configured any preferences: all event types at `"high"` severity and above, delivered to `"browser"` channel.

### Verification

- Unit test: Setting preferences for a user and retrieving them returns the same preferences.
- Unit test: An event below the user's severity threshold is not dispatched.
- Unit test: An event above the threshold on a disabled channel is not dispatched.
- Unit test: Users without explicit preferences receive default preferences.
- Unit test: Preferences persist across simulated restarts (save/load cycle).

---

## BEH-SF-597: Notification Deduplication and Batching

> **Invariant:** None

Repeated or high-frequency events are deduplicated and batched to prevent alert fatigue. Identical events within a configurable time window are collapsed into a single notification with a count.

### Contract

REQUIREMENT (BEH-SF-597): The notification engine MUST deduplicate events before routing. Two events are considered duplicates if they share the same `eventType`, `source`, and a configurable subset of `payload` fields (the deduplication key). Duplicate events arriving within a configurable `deduplicationWindow` (default: 60 seconds) MUST be collapsed into a single `BatchedNotification` with `count` (number of collapsed events), `firstSeen` (timestamp of first event), and `lastSeen` (timestamp of most recent event). The batched notification MUST be dispatched after the deduplication window closes (not on each individual event). If a single event arrives with no duplicates within the window, it MUST be dispatched as a regular notification (not batched). The deduplication window MUST be configurable per event type via `NotificationRouterPort.setDeduplicationConfig(eventTypePattern, windowMs, keyFields)`. Deduplication state MUST be held in memory only — it does not need to survive restarts.

### Verification

- Unit test: Two identical events within 60s produce a single `BatchedNotification` with `count: 2`.
- Unit test: Two events with different deduplication keys are not collapsed.
- Unit test: A single event with no duplicates is dispatched as a regular notification.
- Unit test: Configuring a 30s window on `"finding.*"` events applies the custom window.
- Unit test: Deduplication state resets after application restart (in-memory only).
- Unit test: Batched notification includes correct `firstSeen` and `lastSeen` timestamps.
