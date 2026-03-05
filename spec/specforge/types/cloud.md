---
id: TYPE-SF-007
kind: types
title: "Cloud & Billing Types"
status: active
domain: cloud
behaviors: []
adrs: []
---

# Cloud & Billing Types

- [architecture/c1-system-context.md](../architecture/c1-system-context.md) -- system context for cloud services
- [types/extensibility.md](./extensibility.md) -- `OrchestratorEvent` used by `EventStream`
- [types/errors.md](./errors.md) -- `CloudApiError`, `BillingError`

---

## Billing Types

```typescript
interface PlanDetails {
  readonly tier: "starter" | "pro" | "team" | "enterprise" | "unlimited";
  readonly storageLimit: number;
  readonly projectLimit: number;
  readonly memberLimit: number;
}

interface BillingPeriod {
  readonly start: string;
  readonly end: string;
}

interface UsageReport {
  readonly period: BillingPeriod;
  readonly storageUsed: number;
  readonly flowRunCount: number;
  readonly activeProjects: number;
}

interface StorageUsage {
  readonly used: number;
  readonly limit: number;
  readonly percentage: number;
}
```

---

## Subscription Status

Subscription status returned by `BillingService.checkSubscription()` in [types/ports.md](./ports.md). Tagged union discriminated by `_tag`.

```typescript
type SubscriptionStatus =
  | { readonly _tag: "active"; readonly plan: PlanDetails; readonly expiresAt: Date }
  | { readonly _tag: "trialing"; readonly plan: PlanDetails; readonly trialEndsAt: Date }
  | { readonly _tag: "past-due"; readonly plan: PlanDetails; readonly gracePeriodEndsAt: Date }
  | { readonly _tag: "cancelled"; readonly cancelledAt: Date; readonly accessUntil: Date }
  | { readonly _tag: "expired" };
```

---

## Cloud API Types

```typescript
interface GraphRequest {
  readonly query: string;
  readonly params?: Record<string, unknown>;
}

interface GraphResponse {
  readonly records: ReadonlyArray<Record<string, unknown>>;
  readonly metadata: QueryMetadata;
}

interface GraphMutation {
  readonly operation: "upsert-node" | "upsert-edge" | "delete-node" | "delete-edge";
  readonly data: Record<string, unknown>;
}

interface QueryMetadata {
  readonly resultCount: number;
  readonly executionTime: number;
}
```

---

## Analytics Types

```typescript
interface AnalyticsQuery {
  readonly metric: string;
  readonly period: BillingPeriod;
  readonly groupBy?: string;
}

interface AnalyticsResult {
  readonly metric: string;
  readonly dataPoints: ReadonlyArray<DataPoint>;
}

interface DataPoint {
  readonly timestamp: string;
  readonly value: number;
  readonly label?: string;
}
```

---

## Event Streaming

```typescript
type EventStream = AsyncIterable<OrchestratorEvent>;
```
