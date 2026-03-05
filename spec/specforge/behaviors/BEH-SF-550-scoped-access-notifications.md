---
id: BEH-SF-550
kind: behavior
title: Scoped Access & Notifications
status: active
id_range: 550--553
invariants: [INV-SF-43]
adrs: [ADR-024]
types: [acp, auth, ports]
ports: [ScopedPermissionPort, NotificationRouterPort]
---

# 45 — Scoped Access & Notifications

**ADR:** [ADR-024](../decisions/ADR-024-permission-policy-architecture.md)

---

## BEH-SF-550: Graph Region Scoped Permissions — Subtree Path Boundaries

> **Invariant:** [INV-SF-43](../invariants/INV-SF-43-permission-policy-determinism.md) — Deny-by-Default Policy Evaluation

Permissions can be scoped to graph subtree paths, enabling fine-grained access control over specific regions of the knowledge graph. A scope is defined as a path pattern (e.g., `compliance/*`, `features/auth/**`) that matches graph nodes by their hierarchical label path. This allows organizations to restrict agent or user access to specific domains without affecting access to the rest of the graph.

### Contract

REQUIREMENT (BEH-SF-550): `ScopedPermissionPort.defineScope(scopeId, pathPattern, permissions)` MUST register a permission scope where `scopeId` is a unique identifier, `pathPattern` is a glob-style path pattern matching graph node label paths, and `permissions` is an object with `read: boolean`, `write: boolean`, and `delete: boolean`. When `ScopedPermissionPort.evaluate(subject, action, nodePath)` is called, the system MUST find all scopes whose `pathPattern` matches the `nodePath`, then resolve permissions using the most-specific-match-wins rule (longer patterns override shorter ones). If no scope matches, the system MUST fall back to `PermissionPolicyService.evaluate()` for global policy evaluation. Overlapping scopes with equal specificity MUST be resolved by preferring `deny` (deny-wins-on-tie). Each scope MUST be recorded as a `PermissionScope` graph node linked to its target path pattern. `ScopedPermissionPort.listScopes()` MUST return all registered scopes with their path patterns and permission sets.

### Verification

- Scope creation test: define a scope for `compliance/*` with `read: true, write: false`; verify scope is registered and returned by `listScopes()`.
- Match test: evaluate `write` on node `compliance/findings/F-001`; verify denied (scope has `write: false`).
- Specificity test: define `features/*` (read-only) and `features/auth/**` (read-write); evaluate `write` on `features/auth/login`; verify allowed (more specific scope wins).
- Fallback test: evaluate an action on a node with no matching scope; verify the system delegates to `PermissionPolicyService.evaluate()`.
- Deny-on-tie test: define two scopes with equal path length, one allowing and one denying; verify deny wins.
- Graph node test: define a scope; verify a `PermissionScope` graph node is created with the correct path pattern.

---

## BEH-SF-551: Permission Boundary Visualization — Interactive Map Overlay

The dashboard provides an interactive permission map overlay on the graph explorer. Each graph region is color-coded by the effective permissions of the current user: green (full access), yellow (read-only), red (no access), and gray (no explicit scope — inherits global policy). Users can click a region to see the scope chain that produces the effective permission.

### Contract

REQUIREMENT (BEH-SF-551): When the graph explorer is rendered with the permission overlay enabled, the system MUST compute effective permissions for each visible graph region by calling `ScopedPermissionPort.evaluate(currentUser, action, nodePath)` for all visible node paths. Each region MUST be color-coded: `green` for `{read: true, write: true, delete: true}`, `yellow` for `{read: true, write: false}`, `red` for `{read: false}`, and `gray` for nodes with no matching scope. Clicking a color-coded region MUST display a `ScopeChainView` showing: the applicable scopes in specificity order, the effective permission, and the resolution rule that produced it (most-specific-wins or deny-on-tie). The overlay MUST refresh when scopes are modified (reacting to `ScopeChangedEvent`). The overlay MUST NOT degrade graph explorer performance — permission computation MUST be batched and cached with a TTL of 30 seconds.

### Verification

- Color coding test: define scopes producing all 4 access levels; enable overlay; verify correct colors on each region.
- Scope chain test: click a yellow region; verify `ScopeChainView` shows the read-only scope with the `most-specific-wins` rule.
- Refresh test: modify a scope; verify the overlay updates within 5 seconds (cache TTL considered).
- Performance test: render graph with 1000 nodes and overlay enabled; verify rendering completes within 2 seconds.
- Cache test: render overlay twice within 30 seconds; verify `ScopedPermissionPort.evaluate()` is not called a second time for unchanged nodes.

---

## BEH-SF-552: Event Classification Engine — Categorize Events by Type and Severity

The notification system classifies all platform events before routing them. Each event is assigned a `category` (one of: `flow`, `agent`, `graph`, `security`, `system`) and a `severity` (one of: `info`, `warning`, `error`, `critical`). Classification rules are configurable and can be extended via plugins.

### Contract

REQUIREMENT (BEH-SF-552): `NotificationRouterPort.classify(event)` MUST assign a `category` and `severity` to every platform event. Classification MUST be determined by matching the event against an ordered list of classification rules, where each rule specifies: `ruleId`, `eventPattern` (regex or structured matcher on event type and properties), `category`, and `severity`. The first matching rule wins. If no rule matches, the event MUST receive category `"system"` and severity `"info"` (default classification). Classification rules MUST be loadable via `NotificationRouterPort.loadClassificationRules(rules)` and MUST be replaceable at runtime without restart. Each classification MUST produce a `ClassifiedEvent` containing the original event, assigned `category`, assigned `severity`, `matchedRuleId` (or `"default"` if no rule matched), and `classifiedAt` timestamp.

### Verification

- Match test: define a rule matching `FlowFailedEvent` → `category: "flow"`, `severity: "error"`; classify a `FlowFailedEvent`; verify correct classification.
- Default test: classify an event that matches no rule; verify `category: "system"`, `severity: "info"`, `matchedRuleId: "default"`.
- Order test: define rule A (broad match) and rule B (narrow match) where both match an event; place B first; verify B's classification is used.
- Runtime reload test: load new rules while events are being classified; verify new rules take effect for subsequent events.
- Classified event test: classify an event; verify `ClassifiedEvent` contains all required fields including `classifiedAt` timestamp.

---

## BEH-SF-553: Multi-Channel Routing Rules — Map Classified Events to Delivery Channels

After classification, events are routed to delivery channels based on configurable routing rules. Channels include `in-app`, `email`, `slack`, and `webhook`. Routing rules support per-severity overrides — for example, `critical` security events can be routed to Slack and email while `info` events go only to in-app notifications.

### Contract

REQUIREMENT (BEH-SF-553): `NotificationRouterPort.route(classifiedEvent)` MUST determine the delivery channels for a `ClassifiedEvent` by evaluating routing rules. Each routing rule specifies: `ruleId`, `categoryPattern` (glob matching event categories), `channels` (default channel list), and `severityOverrides` (a map of severity → channel list that overrides the default). The system MUST evaluate all matching rules and MUST merge their channel lists (union of all matched channels). For each matched rule, if the event's severity has an entry in `severityOverrides`, the override channels MUST replace that rule's default channels. After routing, the system MUST dispatch the event to each resolved channel via `NotificationRouterPort.dispatch(classifiedEvent, channel)`. Each dispatch MUST be independent — a failure to deliver to one channel MUST NOT prevent delivery to others. The system MUST record a `NotificationDispatchLog` entry with `eventId`, `channels` (attempted), `successes`, `failures`, and `dispatchTimeMs`.

### Verification

- Default routing test: define a rule for `flow/*` → channels `["in-app"]`; route a `flow` category event with severity `info`; verify dispatched to `in-app`.
- Severity override test: define a rule with `channels: ["in-app"]` and `severityOverrides: { "critical": ["slack", "email"] }`; route a `critical` event; verify dispatched to `slack` and `email` (not `in-app`).
- Multi-rule merge test: define two rules that both match; rule A routes to `["in-app"]`, rule B routes to `["email"]`; verify event is dispatched to both `in-app` and `email`.
- Failure isolation test: dispatch to `slack` (fails) and `email` (succeeds); verify email delivery is not affected by slack failure.
- Dispatch log test: route and dispatch an event; verify `NotificationDispatchLog` records correct `channels`, `successes`, and `failures`.
- No match test: route an event matching no rules; verify no channels are dispatched to and log records empty channels.

---
