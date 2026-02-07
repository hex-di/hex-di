# Phase 5: AUTONOMY — The Application Acts on Its Own Knowledge

## Status: 0% Complete

> _"The application acts on its own self-knowledge. Auto-healing (saga compensations). Auto-optimization (pre-warming based on trace data). Auto-scaling (scope pools based on load patterns). The MAPE-K loop closes completely."_

---

## Vision Statement

Phase 5 is the endgame of HexDI's vision. The application doesn't just _know_ about itself (Phase 2), _report_ what it knows (Phase 3), or _expose_ it to external tools (Phase 4) — it **acts** on that knowledge autonomously.

This is the complete closure of the MAPE-K feedback loop: the application monitors itself, analyzes what it sees, plans corrective actions, executes them, and learns from the results.

The analogy: a modern car doesn't just report "engine temperature high" — it automatically adjusts the cooling system. HexDI doesn't just report "PaymentPort resolution slow" — it enables the application to engage a circuit breaker, retry with backoff, or pre-warm the dependency chain.

---

## Theoretical Foundations

### IBM Autonomic Computing (2001)

IBM defined four "self-\*" properties for autonomic systems. HexDI maps to each:

| Self-\* Property       | Definition                                              | HexDI Implementation                                                                                                                                                               |
| ---------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Self-Configuration** | Automatic configuration following high-level policies   | Graph builder auto-validates and wires dependencies. Adapters self-declare their requirements. Compile-time validation catches misconfigurations before runtime.                   |
| **Self-Optimization**  | Continuous performance tuning                           | Tracing identifies slow resolutions. Complexity scoring identifies graph hotspots. Pre-warming engine resolves hot paths proactively. Lifetime advisor suggests optimizations.     |
| **Self-Healing**       | Automatic discovery and correction of faults            | Saga compensations auto-rollback on failure. Circuit breakers prevent cascade failures. Retry with backoff recovers from transient errors. Scope disposal prevents resource leaks. |
| **Self-Protection**    | Proactive identification and protection against threats | Compile-time cycle detection. Captive dependency prevention. Scope isolation. Dead letter queues capture and quarantine failures.                                                  |

### MAPE-K Loop

The Monitor-Analyze-Plan-Execute-Knowledge cycle is the core framework for autonomic behavior:

```
  ┌──────────────────────────────────────────────────────────────┐
  │                        MAPE-K LOOP                            │
  │                                                               │
  │   ┌─────────┐    ┌─────────┐    ┌──────┐    ┌─────────┐     │
  │   │ MONITOR │───>│ ANALYZE │───>│ PLAN │───>│ EXECUTE │     │
  │   └────┬────┘    └────┬────┘    └──┬───┘    └────┬────┘     │
  │        │              │            │              │           │
  │        ▼              ▼            ▼              ▼           │
  │   Collect:       Detect:       Generate:     Apply:          │
  │   - trace spans  - latency     - increase    - with human    │
  │   - state Δ       spikes       timeout       approval gate  │
  │   - scope events - error       - enable      - gradual       │
  │   - cache stats   surges       circuit       rollout        │
  │   - flow events  - cache       breaker      - rollback      │
  │                   misses      - pre-warm     capability     │
  │                  - scope       cache                         │
  │                   leaks       - scale pool                   │
  │                                                               │
  │                  ┌──────────────────────┐                     │
  │                  │     KNOWLEDGE        │                     │
  │                  │                      │                     │
  │                  │  Historical patterns │                     │
  │                  │  Baseline metrics    │                     │
  │                  │  Action outcomes     │                     │
  │                  │  Success rates       │                     │
  │                  └──────────────────────┘                     │
  └──────────────────────────────────────────────────────────────┘

  HexDI Mapping:
  ──────────────
  Monitor  = @hex-di/tracing spans + runtime inspector + store subscriptions
  Analyze  = Anomaly detection on trace aggregates + graph complexity warnings
  Plan     = Action plans with impact estimates + rollback strategies
  Execute  = Apply with human-approval gate + gradual rollout + auto-rollback
  Knowledge = Historical pattern database + baseline metrics + outcome tracking
```

### Digital Twin Theory

The dependency graph + runtime snapshot + trace history form a **software digital twin**:

| Digital Twin Concept | HexDI Implementation                                                           |
| -------------------- | ------------------------------------------------------------------------------ |
| Physical system      | The running application with its services, state, and behavior                 |
| Virtual model        | The dependency graph + runtime snapshot + trace history                        |
| Synchronization      | Continuous — every resolution, state change, lifecycle event updates the model |
| Queryable            | Inspection APIs, MCP resources, A2A skills (Phase 4)                           |
| Simulatable          | Graph analysis can answer "what if" questions about dependency changes         |
| **Actionable**       | **Phase 5: the twin drives real changes in the system**                        |

In Phase 5, the digital twin becomes ACTIVE — it doesn't just reflect reality, it changes it.

---

## Current State

**Nothing exists.** Phase 5 is entirely planned. No autonomy features are implemented.

| Component            | Status      | Notes                                  |
| -------------------- | ----------- | -------------------------------------- |
| Saga compensations   | Not started | Saga library (Phase 3.7) doesn't exist |
| Circuit breaker      | Not started | No patterns package exists             |
| Retry with backoff   | Not started | No patterns package exists             |
| Scope leak detection | Not started | No leak detection code                 |
| Pre-warming engine   | Not started | No optimization code                   |
| Scope pooling        | Not started | No pooling code                        |
| MAPE-K loop          | Not started | No autonomy code                       |
| Health assessment    | Not started | No health package                      |

---

## Detailed Component Plans

### 5.1 Auto-Healing — 0% → 100%

The application automatically recovers from failures using saga compensations, circuit breakers, retry patterns, and leak detection.

---

#### 5.1.1 Saga Compensation Engine

**DEPENDS ON:** Phase 3.7 (saga library)

When a saga step fails, the compensation engine automatically executes the compensation chain in reverse order, rolling back completed steps.

**Interface Design:**

```typescript
interface CompensationEngine {
  /** Execute compensations for a failed saga */
  onStepFailure(sagaId: string, failedStep: string, error: Error): Promise<CompensationResult>;

  /** Get compensation state for a workflow */
  getCompensationState(sagaId: string): CompensationState;

  /** Retry a failed compensation */
  retryCompensation(sagaId: string, step: string): Promise<void>;

  /** Get all failed compensations in dead-letter state */
  getDeadLetterCompensations(): DeadLetterEntry[];
}

interface CompensationResult {
  status: "fully-compensated" | "partially-compensated" | "compensation-failed";
  compensatedSteps: string[];
  failedCompensations: { step: string; error: Error }[];
  duration: number;
  traceId: string;
}

type CompensationState =
  | { phase: "idle" }
  | { phase: "compensating"; currentStep: string; completedSteps: string[] }
  | { phase: "completed"; result: CompensationResult }
  | { phase: "failed"; error: Error; partialResult: CompensationResult };
```

**Compensation flow:**

```
  Saga: step1 ──> step2 ──> step3 ──> step4 (FAILS)
                                         │
                                    ┌────▼────┐
                                    │ Failure  │
                                    │ Detected │
                                    └────┬────┘
                                         │
                        Compensation chain (reverse order):
                                         │
                              ┌──────────▼──────────┐
                              │ compensate(step3)    │
                              │ compensate(step2)    │
                              │ compensate(step1)    │
                              └──────────┬──────────┘
                                         │
                              ┌──────────▼──────────┐
                              │ Result:              │
                              │ fully-compensated    │
                              │ or partial + DLQ     │
                              └─────────────────────┘
```

**Where:** `packages/saga/src/compensation/engine.ts`
**Effort:** XL (15-20 days)
**Tracing:** Span per compensation step with parent = saga span

---

#### 5.1.2 Circuit Breaker Port Pattern

Wraps any port with circuit breaker logic to prevent cascade failures.

**States:**

```
  ┌────────┐   failure threshold   ┌────────┐   reset timeout   ┌───────────┐
  │ CLOSED │ ─────────────────────>│  OPEN  │ ─────────────────>│ HALF-OPEN │
  │        │   (normal operation)  │        │   (fast-fail all) │           │
  │ Allow  │<──────────────────────│ Reject │<──────────────────│  Test 1   │
  │ all    │   success in          │ all    │   failure in      │  request  │
  └────────┘   half-open           └────────┘   half-open       └───────────┘
```

**Interface Design:**

```typescript
interface CircuitBreakerConfig {
  failureThreshold: number; // failures before OPEN (default: 5)
  resetTimeout: number; // ms before HALF-OPEN (default: 30000)
  halfOpenMaxAttempts: number; // test requests in HALF-OPEN (default: 1)
  monitorInterval?: number; // health check interval (default: 5000)
  isFailure?: (error: Error) => boolean; // custom failure classification
}

interface CircuitBreakerState {
  state: "closed" | "open" | "half-open";
  failureCount: number;
  lastFailureTime: number | null;
  successCount: number;
  totalRequests: number;
}

/** Wraps a port with circuit breaker - returns same Port type */
function withCircuitBreaker<TService>(
  port: Port<TService>,
  config: CircuitBreakerConfig
): Port<TService>;

/** Inspector integration */
interface CircuitBreakerInspector {
  getState(portName: string): CircuitBreakerState;
  getAllBreakers(): { portName: string; state: CircuitBreakerState }[];
  reset(portName: string): void;
  forceOpen(portName: string): void;
}
```

**Where:** `packages/runtime/src/patterns/circuit-breaker.ts`
**Effort:** Large (8-10 days)
**Reports to:** Container inspector via `inspector.getCircuitBreakerStates()`
**Tracing:** Attribute `hex-di.circuit-breaker.state` on resolution spans

---

#### 5.1.3 Retry with Exponential Backoff

Wraps any port with automatic retry logic for transient failures.

**Interface Design:**

```typescript
interface RetryConfig {
  maxRetries: number; // max retry attempts (default: 3)
  initialDelay: number; // first retry delay in ms (default: 100)
  maxDelay: number; // cap on delay in ms (default: 10000)
  backoffFactor: number; // multiplier per retry (default: 2)
  jitterFactor: number; // randomization 0-1 (default: 0.1)
  retryableErrors?: (error: Error) => boolean; // which errors to retry
}

function withRetry<TService>(port: Port<TService>, config: RetryConfig): Port<TService>;

/** Retry timeline example:
 *  Attempt 1: immediate
 *  Attempt 2: 100ms + jitter
 *  Attempt 3: 200ms + jitter
 *  Attempt 4: 400ms + jitter (if maxRetries >= 3)
 */
```

**Where:** `packages/runtime/src/patterns/retry.ts`
**Effort:** Medium (4-5 days)
**Tracing:** Each retry attempt is a child span with `hex-di.retry.attempt` attribute

---

#### 5.1.4 Scope Leak Detection + Auto-Cleanup

Monitors scope lifecycle to detect scopes that outlive their expected lifetime.

**Interface Design:**

```typescript
interface LeakDetectorConfig {
  maxScopeAge: number; // ms before warning (default: 300000 = 5min)
  checkInterval: number; // ms between checks (default: 60000 = 1min)
  autoDispose: boolean; // auto-dispose leaked scopes? (default: false)
  autoDisposeAfter: number; // ms before auto-disposal (default: 600000 = 10min)
  excludeScopes?: string[]; // scope names to never flag
  onLeakDetected: (leak: ScopeLeakInfo) => void;
}

interface ScopeLeakInfo {
  scopeId: string;
  scopeName: string;
  age: number; // ms since creation
  resolvedPorts: string[];
  parentScopeId: string;
  createdAt: number;
}

interface LeakDetector {
  start(): void;
  stop(): void;
  getLeaks(): ScopeLeakInfo[];
  getStats(): LeakDetectorStats;
}

interface LeakDetectorStats {
  totalScopesCreated: number;
  totalScopesDisposed: number;
  currentActiveScopes: number;
  leaksDetected: number;
  leaksAutoDisposed: number;
  avgScopeLifetime: number;
}
```

**Where:** `packages/runtime/src/patterns/leak-detector.ts`
**Effort:** Large (6-8 days)
**Reports to:** Container inspector via `inspector.getLeakDetectorStats()`

---

#### 5.1.5 Dead Letter Queue

Captures failed resolutions and compensations that can't be recovered, allowing later analysis and replay.

**Interface Design:**

```typescript
interface DeadLetterQueue {
  /** Add a failed resolution to the DLQ */
  enqueue(entry: DeadLetterInput): void;

  /** Get all entries */
  getEntries(filter?: DeadLetterFilter): DeadLetterEntry[];

  /** Replay a failed resolution */
  replay(entryId: string): Promise<ReplayResult>;

  /** Mark entry as acknowledged (won't appear in active list) */
  acknowledge(entryId: string): void;

  /** Get counts */
  getCount(): number;
  getActiveCount(): number;
}

interface DeadLetterEntry {
  id: string;
  portName: string;
  error: Error;
  traceId: string;
  scopeId?: string;
  timestamp: number;
  retryCount: number;
  status: "active" | "acknowledged" | "replayed";
  context: Record<string, unknown>;
}

interface DeadLetterFilter {
  portName?: string;
  status?: "active" | "acknowledged" | "replayed";
  since?: number;
  limit?: number;
}

type ReplayResult =
  | { success: true; value: unknown; duration: number }
  | { success: false; error: Error };
```

**Where:** `packages/runtime/src/patterns/dead-letter.ts`
**Effort:** Large (6-8 days)
**Reports to:** Container inspector via `inspector.getDeadLetterQueue()`
**MCP Resource:** `hexdi://runtime/dead-letter`

---

### 5.2 Auto-Optimization — 0% → 100%

The application optimizes itself based on telemetry data.

---

#### 5.2.1 Pre-Warming Engine

Analyzes tracing data to identify hot resolution paths and pre-resolves them on startup or scope creation, eliminating cold-start latency.

**Interface Design:**

```typescript
interface PreWarmingConfig {
  strategy: "trace-based" | "static" | "hybrid";
  traceWindow: number; // ms of trace history to analyze (default: 3600000 = 1hr)
  minResolutionCount: number; // min resolutions to consider "hot" (default: 10)
  preWarmOnStartup: boolean; // pre-warm singletons on container creation
  preWarmOnScopeCreate: boolean; // pre-warm scoped ports when scope created
  excludePorts?: string[]; // ports to never pre-warm (e.g., heavy or side-effectful)
  maxPreWarmTime?: number; // ms budget for pre-warming (default: 5000)
}

interface PreWarmingEngine {
  /** Analyze traces and generate a pre-warming plan */
  analyze(): PreWarmingPlan;

  /** Execute a pre-warming plan */
  execute(plan: PreWarmingPlan): Promise<PreWarmingResult>;

  /** Get pre-warming statistics */
  getStats(): PreWarmingStats;
}

interface PreWarmingPlan {
  hotPorts: HotPortInfo[];
  totalEstimatedSaving: number; // ms saved per scope creation
  estimatedPreWarmTime: number; // ms to execute pre-warming
}

interface HotPortInfo {
  portName: string;
  avgResolutionsPerScope: number;
  avgResolutionDuration: number; // ms
  totalResolutions: number;
  estimatedSaving: number; // ms saved by pre-warming
}

interface PreWarmingResult {
  preWarmedPorts: string[];
  failedPorts: { portName: string; error: Error }[];
  duration: number;
  estimatedSaving: number;
}

interface PreWarmingStats {
  plansGenerated: number;
  plansExecuted: number;
  totalPortsPreWarmed: number;
  totalTimeSaved: number; // estimated cumulative ms saved
  lastPlanAt: number;
}
```

**Algorithm:**

```
  1. Query tracing: getResolutionsByPort(lastHour)
  2. Rank ports by: frequency × avgDuration
  3. Filter: only ports above minResolutionCount threshold
  4. Generate plan: ordered list of ports to pre-warm
  5. Execute: resolve each port in plan order
  6. Track: time spent vs estimated savings
```

**Where:** `packages/runtime/src/optimization/pre-warming.ts`
**Effort:** Large (8-10 days)
**Depends on:** Phase 3.1 (tracing query API)

---

#### 5.2.2 Adaptive Scope Pooling

Maintains a pool of pre-created scopes that are recycled instead of created/destroyed, reducing GC pressure and allocation overhead.

**Interface Design:**

```typescript
interface ScopePoolConfig {
  minPoolSize: number; // minimum scopes in pool (default: 5)
  maxPoolSize: number; // maximum scopes in pool (default: 50)
  adaptiveScaling: boolean; // auto-adjust based on usage patterns
  scalingInterval: number; // ms between scaling decisions (default: 30000)
  scaleUpThreshold: number; // % utilization to trigger scale-up (default: 0.8)
  scaleDownThreshold: number; // % utilization to trigger scale-down (default: 0.2)
  recycleStrategy: "reset" | "dispose-create";
}

interface ScopePool {
  /** Acquire a scope from the pool (or create if pool empty) */
  acquire(name?: string): Scope;

  /** Release a scope back to the pool */
  release(scope: Scope): void;

  /** Get pool statistics */
  getStats(): PoolStats;

  /** Manually resize the pool */
  resize(newSize: number): void;

  /** Shut down the pool */
  dispose(): Promise<void>;
}

interface PoolStats {
  poolSize: number;
  available: number;
  inUse: number;
  utilizationPercent: number;
  totalAcquisitions: number;
  totalRecycles: number;
  totalCreations: number; // fresh scopes created (pool was empty)
  avgAcquisitionTime: number; // ms
  avgRecycleTime: number; // ms
}
```

**Where:** `packages/runtime/src/optimization/scope-pool.ts`
**Effort:** XL (12-15 days)
**Reports to:** Container inspector via `inspector.getScopePoolStats()`

---

#### 5.2.3 Lifetime Promotion Advisor

Analyzes trace data to recommend lifetime changes for better performance or memory usage.

**Interface Design:**

```typescript
interface LifetimeAdvisor {
  /** Analyze resolution patterns and suggest lifetime changes */
  analyze(): LifetimeRecommendation[];

  /** Get resolution frequency for a specific port */
  getResolutionFrequency(portName: string): ResolutionFrequency;
}

interface LifetimeRecommendation {
  portName: string;
  currentLifetime: "singleton" | "scoped" | "transient";
  suggestedLifetime: "singleton" | "scoped" | "transient";
  reason: string;
  confidence: number; // 0-1 confidence score
  estimatedImpact: string; // human-readable: "reduce memory 15%"
  evidence: ResolutionFrequency;
}

interface ResolutionFrequency {
  portName: string;
  totalResolutions: number;
  uniqueResults: number; // how many distinct instances created
  avgResolutionsPerScope: number;
  alwaysSameResult: boolean; // true = could be singleton
  rarelyUsed: boolean; // true = could downgrade from singleton
}
```

**Heuristics:**

```
  Transient → Singleton:
    IF alwaysSameResult AND totalResolutions > 20 AND uniqueResults == 1
    THEN suggest singleton (confidence: 0.8)
    IMPACT: "eliminate ~N redundant instantiations"

  Transient → Scoped:
    IF avgResolutionsPerScope > 3 AND uniqueResults < totalResolutions/3
    THEN suggest scoped (confidence: 0.7)
    IMPACT: "reduce per-scope instantiations by ~Nx"

  Singleton → Transient:
    IF totalResolutions < 3 AND memoryPressure == high
    THEN suggest transient (confidence: 0.5)
    IMPACT: "free ~Xkb of singleton memory"
```

**Where:** `packages/runtime/src/optimization/lifetime-advisor.ts`
**Effort:** Large (8-10 days)
**Depends on:** Phase 3.1 (tracing query API)

---

#### 5.2.4 Slow Resolution Alerting

Real-time monitoring of resolution performance with alerting on degradation.

**Interface Design:**

```typescript
interface AlertingConfig {
  baselineWindow: number; // ms to establish baseline (default: 300000 = 5min)
  degradationThreshold: number; // multiplier for alert (default: 2.0 = 200%)
  evaluationInterval: number; // ms between evaluations (default: 10000)
  minSamples: number; // min resolutions before alerting (default: 10)
  cooldownPeriod: number; // ms between repeat alerts (default: 60000)
  onAlert: (alert: PerformanceAlert) => void;
}

interface PerformanceAlert {
  type: "latency-degradation" | "error-rate-spike" | "cache-miss-increase";
  severity: "warning" | "critical";
  portName: string;
  currentValue: number;
  baselineValue: number;
  degradationFactor: number; // currentValue / baselineValue
  since: number; // timestamp when degradation started
  sampleCount: number;
  affectedScopes: string[];
  suggestedAction: string;
}

interface AlertingEngine {
  start(): void;
  stop(): void;
  getActiveAlerts(): PerformanceAlert[];
  getBaselines(): Map<string, PerformanceBaseline>;
  resetBaseline(portName?: string): void;
}

interface PerformanceBaseline {
  portName: string;
  avgDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
  errorRate: number;
  cacheHitRate: number;
  sampleCount: number;
  establishedAt: number;
}
```

**Where:** `packages/tracing/src/alerting/engine.ts`
**Effort:** Medium (5-6 days)
**Depends on:** Phase 3.1 (tracing query API)

---

### 5.3 MAPE-K Feedback Loop — 0% → 100%

The complete autonomic computing loop.

---

#### 5.3.1 Monitor Agent

Continuously collects metrics from all HexDI subsystems into unified time-series data.

**Interface Design:**

```typescript
interface MonitorAgent {
  /** Start continuous monitoring */
  start(): void;

  /** Stop monitoring */
  stop(): void;

  /** Get metrics for a time range */
  getMetrics(timeRange: TimeRange): Metrics;

  /** Subscribe to metrics updates */
  subscribe(listener: (metrics: Metrics) => void): () => void;

  /** Get current health indicators */
  getHealthIndicators(): HealthIndicators;
}

interface Metrics {
  timestamp: number;
  window: number; // ms window for these metrics

  resolution: {
    total: number;
    successful: number;
    failed: number;
    avgDuration: number;
    p50Duration: number;
    p95Duration: number;
    p99Duration: number;
    cacheHitRate: number;
  };

  scopes: {
    active: number;
    created: number;
    disposed: number;
    avgLifetime: number;
    leakSuspects: number;
  };

  flow: {
    activeMachines: number;
    transitions: number;
    activeActivities: number;
    failedTransitions: number;
  };

  store: {
    totalStores: number;
    stateChanges: number;
    subscriberCount: number;
  };

  query: {
    totalQueries: number;
    cacheHits: number;
    cacheMisses: number;
    pendingQueries: number;
    staleQueries: number;
  };

  system: {
    estimatedMemoryUsage: number;
    containerCount: number;
    adapterCount: number;
  };
}

interface HealthIndicators {
  overallHealth: number; // 0-100
  signals: {
    name: string;
    value: number;
    threshold: number;
    status: "ok" | "warning" | "critical";
  }[];
}
```

**Data sources:**

```
  Monitor Agent collects from:
  ├── @hex-di/tracing ─── resolution spans, error spans, timing
  ├── @hex-di/runtime ─── scope lifecycle events, container phase
  ├── @hex-di/flow    ─── state transitions, activity lifecycle
  ├── @hex-di/store   ─── state changes, subscriber counts
  ├── @hex-di/query   ─── cache stats, fetch activity
  └── @hex-di/saga    ─── workflow progress, compensation events
```

**Where:** `packages/autonomy/src/monitor.ts`
**Effort:** Large (8-10 days)
**Depends on:** Phase 3 (all library reporting)

---

#### 5.3.2 Analyze Agent

Detects anomalies and classifies issues from the monitored metrics.

**Interface Design:**

```typescript
interface AnalyzeAgent {
  /** Detect anomalies in recent metrics */
  detectAnomalies(metrics: Metrics, baseline: Metrics): Anomaly[];

  /** Classify a detected anomaly */
  classifyIssue(anomaly: Anomaly): IssueClassification;

  /** Get historical anomaly patterns */
  getKnownPatterns(): AnomalyPattern[];
}

type AnomalyType =
  | "latency-spike" // resolution duration > 2x baseline
  | "error-surge" // error rate > 3x baseline
  | "cache-degradation" // cache hit rate dropped > 20%
  | "scope-leak" // active scopes growing without disposal
  | "memory-growth" // estimated memory growing linearly
  | "cascade-failure" // multiple ports failing simultaneously
  | "flow-deadlock" // flow machine stuck in state
  | "query-stale" // queries returning stale data
  | "saga-compensation-loop"; // saga repeatedly failing and compensating

interface Anomaly {
  id: string;
  type: AnomalyType;
  severity: "low" | "medium" | "high" | "critical";
  affectedPorts: string[];
  startTime: number;
  duration: number;
  metrics: {
    current: number;
    baseline: number;
    deviation: number; // current / baseline
  };
  details: Record<string, unknown>;
}

interface IssueClassification {
  rootCause: string; // human-readable root cause
  category: "performance" | "reliability" | "resource" | "correctness";
  suggestedActions: string[];
  historicalMatches: number; // how many times this pattern seen before
  lastSeen?: number; // timestamp of last occurrence
}
```

**Detection algorithms:**

```
  Latency Spike:
    IF p95Duration > baseline.p95Duration * 2 FOR > 30s
    THEN anomaly(severity = high)

  Error Surge:
    IF errorRate > baseline.errorRate * 3 AND failed > 5
    THEN anomaly(severity = critical)

  Cascade Failure:
    IF multiple ports show error-surge simultaneously
    AND they share a common dependency
    THEN anomaly(type = cascade-failure, root = common dependency)

  Scope Leak:
    IF scopes.active is monotonically increasing over 5 evaluation periods
    AND scopes.disposed < scopes.created * 0.9
    THEN anomaly(type = scope-leak)
```

**Where:** `packages/autonomy/src/analyze.ts`
**Effort:** XL (15-20 days)

---

#### 5.3.3 Plan Agent

Generates action plans for detected anomalies with impact estimation and rollback strategies.

**Interface Design:**

```typescript
interface PlanAgent {
  /** Generate an action plan for an anomaly */
  generatePlan(anomaly: Anomaly, knowledge: KnowledgeBase): ActionPlan;

  /** Estimate the impact of executing a plan */
  estimateImpact(plan: ActionPlan): ImpactEstimate;

  /** Generate alternative plans */
  generateAlternatives(anomaly: Anomaly): ActionPlan[];
}

interface ActionPlan {
  id: string;
  anomalyId: string;
  actions: Action[];
  estimatedDuration: number; // ms to execute
  riskLevel: "low" | "medium" | "high";
  rollbackPlan: Action[];
  confidence: number; // 0-1 based on historical success
  reasoning: string; // human-readable explanation
}

type Action =
  | { type: "increase-timeout"; port: string; currentTimeout: number; newTimeout: number }
  | { type: "enable-circuit-breaker"; port: string; config: CircuitBreakerConfig }
  | { type: "enable-retry"; port: string; config: RetryConfig }
  | { type: "pre-warm-port"; port: string; scope?: string }
  | { type: "scale-scope-pool"; currentSize: number; newSize: number }
  | { type: "promote-lifetime"; port: string; from: Lifetime; to: Lifetime }
  | { type: "dispose-leaked-scopes"; scopeIds: string[] }
  | { type: "invalidate-cache"; queryIds: string[] }
  | { type: "reset-circuit-breaker"; port: string }
  | { type: "alert-human"; message: string; severity: string };

interface ImpactEstimate {
  expectedImprovement: string; // "reduce p95 latency by ~40%"
  riskAssessment: string; // "low risk — only affects timeout config"
  sideEffects: string[]; // ["may increase memory usage by ~5%"]
  historicalSuccessRate: number; // from knowledge base
}
```

**Plan selection strategy:**

```
  1. Retrieve anomaly classification
  2. Query knowledge base for similar past anomalies
  3. If high-confidence match: reuse proven plan (adjust params)
  4. If no match: generate plan from ruleset:
     - latency-spike → increase timeout + enable circuit breaker
     - error-surge → enable retry + circuit breaker + alert human
     - cache-degradation → invalidate stale cache + increase TTL
     - scope-leak → dispose leaked scopes + alert human
     - cascade-failure → circuit-break root cause + alert human (high risk)
  5. Estimate impact from historical data
  6. Generate rollback plan (reverse of each action)
  7. Assign confidence score
```

**Where:** `packages/autonomy/src/plan.ts`
**Effort:** XL (12-15 days)
**Depends on:** 5.3.2, 5.3.5

---

#### 5.3.4 Execute Agent

Applies action plans with safety mechanisms: human approval gates, gradual rollout, and automatic rollback on degradation.

**Interface Design:**

```typescript
interface ExecuteAgent {
  /** Execute an action plan */
  execute(plan: ActionPlan, gate: ApprovalGate): Promise<ExecutionResult>;

  /** Rollback a previously executed plan */
  rollback(executionId: string): Promise<RollbackResult>;

  /** Get all active/recent executions */
  getExecutions(filter?: ExecutionFilter): Execution[];

  /** Pause an in-progress execution */
  pause(executionId: string): void;

  /** Resume a paused execution */
  resume(executionId: string): void;
}

interface ApprovalGate {
  /** Does this plan require human approval? */
  requiresApproval: boolean;

  /** Auto-approve plans below this risk level */
  autoApproveBelow: "low" | "medium" | "high";

  /** Timeout for human approval (auto-reject after) */
  approvalTimeout: number;

  /** Callback for approval request */
  onApprovalRequired: (plan: ActionPlan, estimate: ImpactEstimate) => Promise<ApprovalDecision>;
}

interface ApprovalDecision {
  approved: boolean;
  approvedBy?: string;
  reason?: string;
  modifications?: Partial<Action>[]; // human can modify actions
}

interface ExecutionResult {
  executionId: string;
  planId: string;
  status: "completed" | "partially-completed" | "failed" | "rolled-back";
  actionsExecuted: { action: Action; result: "success" | "failed"; duration: number }[];
  totalDuration: number;
  metricsAfter: Metrics; // metrics snapshot after execution
  improvement?: string; // "p95 latency reduced from 340ms to 120ms"
}

/** Safety mechanisms */
interface SafetyConfig {
  /** Monitor metrics during execution — rollback if degradation */
  monitorDuringExecution: boolean;

  /** Max degradation before auto-rollback */
  maxDegradation: number; // e.g., 1.5 = 50% worse than before

  /** Monitoring interval during execution */
  monitorInterval: number; // ms

  /** Canary: apply to subset first */
  canaryPercentage?: number; // 0-1, e.g., 0.1 = apply to 10% first

  /** Canary evaluation time before full rollout */
  canaryEvaluationTime?: number; // ms
}
```

**Execution flow:**

```
  Plan received
       │
  ┌────▼────┐
  │ Approval │──── auto-approve (low risk)
  │   Gate   │──── request human approval (medium/high risk)
  │          │──── reject (too high risk / timeout)
  └────┬────┘
       │ approved
  ┌────▼────┐
  │ Canary  │──── apply to subset
  │ Phase   │──── monitor for canaryEvaluationTime
  │         │──── if degradation → rollback
  └────┬────┘
       │ canary passed
  ┌────▼────┐
  │ Full    │──── apply all actions
  │ Rollout │──── monitor continuously
  │         │──── if degradation > threshold → auto-rollback
  └────┬────┘
       │ success
  ┌────▼────┐
  │ Record  │──── save to knowledge base
  │ Outcome │──── update baselines
  └─────────┘
```

**Where:** `packages/autonomy/src/execute.ts`
**Effort:** Large (10-12 days)
**Depends on:** 5.3.3, all Phase 5.1 patterns

---

#### 5.3.5 Knowledge Base

Stores historical patterns, action outcomes, and performance baselines. Enables the system to learn from past experiences.

**Interface Design:**

```typescript
interface KnowledgeBase {
  /** Record an anomaly → plan → result triple */
  record(entry: KnowledgeEntry): void;

  /** Find similar past anomalies */
  findSimilar(anomaly: Anomaly, limit?: number): HistoricalMatch[];

  /** Get success rate for an action type */
  getSuccessRate(actionType: string): number;

  /** Get performance baseline for a port */
  getBaseline(portName: string): PerformanceBaseline;

  /** Update baseline with new data */
  updateBaseline(portName: string, metrics: Metrics): void;

  /** Export knowledge base for backup/transfer */
  export(): SerializedKnowledgeBase;

  /** Import from backup */
  import(data: SerializedKnowledgeBase): void;
}

interface KnowledgeEntry {
  anomaly: Anomaly;
  plan: ActionPlan;
  result: ExecutionResult;
  timestamp: number;
  environment: string; // "production" | "staging" | "development"
}

interface HistoricalMatch {
  entry: KnowledgeEntry;
  similarity: number; // 0-1 similarity score
  outcome: "success" | "partial" | "failure";
  applicability: string; // "high — same port, same anomaly type"
}

interface PerformanceBaseline {
  portName: string;
  avgDuration: number;
  p50: number;
  p95: number;
  p99: number;
  errorRate: number;
  cacheHitRate: number;
  sampleCount: number;
  establishedAt: number;
  lastUpdated: number;
}
```

**Storage:**

```
  Knowledge Base Storage Options:
  ├── In-memory (development/testing)
  ├── File-based JSON (simple persistence)
  ├── SQLite (embedded, durable)
  └── External DB via port (production — user provides adapter)
```

**Where:** `packages/autonomy/src/knowledge.ts`
**Effort:** Large (8-10 days)

---

### 5.4 Health Assessment — 0% → 100%

Automated health scoring combining all signals into a single report.

---

#### 5.4.1 Package Setup

Create `packages/health/` with standard package structure.

**Where:** `packages/health/`
**Effort:** Small (1 day)

---

#### 5.4.2 Health Scoring Engine

Combines multiple signals into a weighted overall health score.

**Interface Design:**

```typescript
interface HealthEngine {
  /** Generate a health report */
  assess(container: Container): HealthReport;

  /** Configure health scoring weights */
  configure(config: HealthConfig): void;

  /** Get health history */
  getHistory(timeRange: TimeRange): HealthReport[];
}

interface HealthReport {
  overallScore: number; // 0-100
  status: "healthy" | "degraded" | "unhealthy" | "critical";
  signals: HealthSignal[];
  recommendations: HealthRecommendation[];
  generatedAt: number;
  assessmentDuration: number; // ms to generate report
}

interface HealthSignal {
  name: string;
  category: "structure" | "performance" | "reliability" | "resources";
  score: number; // 0-100
  weight: number; // contribution to overall (sums to 1.0)
  status: "ok" | "warning" | "critical";
  details: string;
  trend: "improving" | "stable" | "degrading";
}

interface HealthRecommendation {
  priority: "low" | "medium" | "high" | "critical";
  category: string;
  message: string;
  estimatedImpact: string;
  relatedSignals: string[];
}

interface HealthConfig {
  signals: {
    name: string;
    weight: number;
    warningThreshold: number;
    criticalThreshold: number;
  }[];
}
```

**Default signals:**

```
  Signal                   Weight   Source              Warning   Critical
  ─────────────────────── ────── ────────────────── ──────── ──────────
  Graph Complexity          0.10   graph inspection     > 80       > 120
  Error Rate                0.25   tracing aggregation  > 5%       > 15%
  P95 Latency               0.20   tracing aggregation  > 500ms    > 2000ms
  Cache Hit Rate            0.10   query inspector      < 70%      < 40%
  Scope Leak Suspect Count  0.10   leak detector        > 3        > 10
  Active Circuit Breakers   0.10   circuit breaker ins.  > 1        > 3
  Dead Letter Queue Size    0.10   DLQ inspector        > 10       > 50
  Failed Compensations      0.05   saga inspector       > 1        > 5
```

**Where:** `packages/health/src/scoring.ts`
**Effort:** Large (8-10 days)
**Depends on:** Phase 3 (library reporting) + Phase 5.1 (patterns)

---

#### 5.4.3 Degradation Detection

Detects gradual degradation by comparing current metrics against established baselines with trend analysis.

**Interface Design:**

```typescript
interface DegradationDetector {
  /** Check for degradation trends */
  detectTrends(history: HealthReport[]): TrendReport;

  /** Get degradation alerts */
  getAlerts(): DegradationAlert[];
}

interface TrendReport {
  overallTrend: "improving" | "stable" | "degrading";
  degradingSignals: {
    signal: string;
    currentScore: number;
    scoreOneHourAgo: number;
    scoreOneDayAgo: number;
    rateOfChange: number; // score units per hour
  }[];
  forecastedStatus: "healthy" | "degraded" | "unhealthy" | "critical";
  forecastedIn: number; // ms until forecasted status
}
```

**Where:** `packages/health/src/degradation.ts`
**Effort:** Large (6-8 days)

---

#### 5.4.4 Health Report Generation

Generate reports in multiple formats for different consumers.

**Formats:**

- **JSON** — for MCP/A2A/REST consumption
- **Markdown** — for human-readable reports
- **Structured log** — for observability platforms

```typescript
interface ReportGenerator {
  toJSON(report: HealthReport): string;
  toMarkdown(report: HealthReport): string;
  toStructuredLog(report: HealthReport): Record<string, unknown>;
}
```

**Where:** `packages/health/src/report.ts`
**Effort:** Medium (3-4 days)

---

## The End State

When Phase 5 is complete, a HexDI application can:

```
  ┌──────────────────────────────────────────────────────────────────┐
  │                                                                   │
  │   An application that:                                            │
  │                                                                   │
  │   1. Knows what it's made of          (graph)       ─ Phase 2 ✅ │
  │   2. Knows what it's doing            (tracing)     ─ Phase 2 ✅ │
  │   3. Knows what state it's in         (runtime)     ─ Phase 2 ✅ │
  │   4. Reports everything it knows      (reporting)   ─ Phase 3    │
  │   5. Tells external systems about it  (MCP/A2A)     ─ Phase 4    │
  │   6. Detects its own problems         (monitor)     ─ Phase 5    │
  │   7. Diagnoses root causes            (analyze)     ─ Phase 5    │
  │   8. Plans corrective actions         (plan)        ─ Phase 5    │
  │   9. Executes fixes autonomously      (execute)     ─ Phase 5    │
  │  10. Learns from the results          (knowledge)   ─ Phase 5    │
  │                                                                   │
  │   Not because someone instrumented it from the outside.          │
  │   Because self-awareness AND self-action are built into           │
  │   its foundation.                                                 │
  │                                                                   │
  └──────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

Phase 5 has deep dependencies on earlier phases:

```
  Phase 5 Prerequisites:
  ──────────────────────

  5.1.1 Saga Compensation      ← Phase 3.7 (Saga Library)
  5.1.2 Circuit Breaker        ← Phase 1 (standalone)
  5.1.3 Retry with Backoff     ← Phase 1 (standalone)
  5.1.4 Scope Leak Detection   ← Phase 2 (scope tree inspection)
  5.1.5 Dead Letter Queue      ← Phase 2 (tracing)

  5.2.1 Pre-Warming Engine     ← Phase 3.1 (Tracing Query API)
  5.2.2 Scope Pooling          ← Phase 2 (scope management)
  5.2.3 Lifetime Advisor       ← Phase 3.1 (Tracing Query API)
  5.2.4 Slow Resolution Alert  ← Phase 3.1 (Tracing Query API)

  5.3.1 Monitor Agent          ← Phase 3 (ALL library reporting)
  5.3.2 Analyze Agent          ← 5.3.1
  5.3.3 Plan Agent             ← 5.3.2 + 5.3.5
  5.3.4 Execute Agent          ← 5.3.3 + 5.1 (all patterns)
  5.3.5 Knowledge Base         ← Standalone (but needs data from 5.3.1-5.3.4)

  5.4.1 Health Package Setup   ← Standalone
  5.4.2 Health Scoring         ← Phase 3 + 5.1
  5.4.3 Degradation Detection  ← 5.4.2
  5.4.4 Report Generation      ← 5.4.2
```

---

## Execution Order

| Wave       | Tasks                                                       | Prerequisites      | Estimated Duration |
| ---------- | ----------------------------------------------------------- | ------------------ | ------------------ |
| **Wave 1** | 5.1.2 Circuit Breaker, 5.1.3 Retry, 5.1.5 DLQ               | Phase 1 only       | 3-4 weeks          |
| **Wave 2** | 5.1.4 Leak Detection, 5.2.4 Alerting                        | Phase 2            | 2-3 weeks          |
| **Wave 3** | 5.1.1 Saga Compensation                                     | Phase 3.7          | 3-4 weeks          |
| **Wave 4** | 5.2.1 Pre-Warming, 5.2.2 Scope Pool, 5.2.3 Lifetime Advisor | Phase 3.1          | 5-6 weeks          |
| **Wave 5** | 5.4 Health Assessment                                       | Phase 3 + Wave 1-4 | 3-4 weeks          |
| **Wave 6** | 5.3 MAPE-K Loop                                             | Everything above   | 8-10 weeks         |

**Total estimated effort:** ~150-200 days (~30-40 weeks solo)

---

## Effort Estimation

| Task                             | Size | Days         | Prerequisites |
| -------------------------------- | ---- | ------------ | ------------- |
| 5.1.1 Saga Compensation Engine   | XL   | 15-20        | Phase 3.7     |
| 5.1.2 Circuit Breaker Port       | L    | 8-10         | Phase 1       |
| 5.1.3 Retry with Backoff         | M    | 4-5          | Phase 1       |
| 5.1.4 Scope Leak Detection       | L    | 6-8          | Phase 2       |
| 5.1.5 Dead Letter Queue          | L    | 6-8          | Phase 2       |
| 5.2.1 Pre-Warming Engine         | L    | 8-10         | Phase 3.1     |
| 5.2.2 Adaptive Scope Pooling     | XL   | 12-15        | Phase 2       |
| 5.2.3 Lifetime Promotion Advisor | L    | 8-10         | Phase 3.1     |
| 5.2.4 Slow Resolution Alerting   | M    | 5-6          | Phase 3.1     |
| 5.3.1 Monitor Agent              | L    | 8-10         | Phase 3 (all) |
| 5.3.2 Analyze Agent              | XL   | 15-20        | 5.3.1         |
| 5.3.3 Plan Agent                 | XL   | 12-15        | 5.3.2, 5.3.5  |
| 5.3.4 Execute Agent              | L    | 10-12        | 5.3.3, 5.1.\* |
| 5.3.5 Knowledge Base             | L    | 8-10         | Standalone    |
| 5.4.1 Health Package Setup       | S    | 1            | —             |
| 5.4.2 Health Scoring Engine      | L    | 8-10         | Phase 3, 5.1  |
| 5.4.3 Degradation Detection      | L    | 6-8          | 5.4.2         |
| 5.4.4 Report Generation          | M    | 3-4          | 5.4.2         |
| **TOTAL**                        |      | **~150-200** |               |

---

## Risk Assessment

Phase 5 involves autonomous behavior — actions that change the running system without human intervention. This carries inherent risks.

### Risks & Mitigations

| Risk                               | Severity | Mitigation                                                                                               |
| ---------------------------------- | -------- | -------------------------------------------------------------------------------------------------------- |
| Auto-action causes worse problem   | Critical | Human approval gate for medium/high risk actions. Canary deployment. Auto-rollback on degradation.       |
| Feedback loop oscillation          | High     | Cooldown periods between actions. Rate limiting on plan execution.                                       |
| Circuit breaker stays open forever | Medium   | Max open duration. Periodic health checks. Manual reset API.                                             |
| Pre-warming causes startup latency | Medium   | Time budget for pre-warming. Async pre-warming option.                                                   |
| Scope pool memory waste            | Low      | Adaptive scaling with min/max bounds. Memory pressure monitoring.                                        |
| Knowledge base grows unbounded     | Low      | Retention policy. Prune old entries. Size limits.                                                        |
| Incorrect anomaly classification   | Medium   | Confidence scores. Multiple detection algorithms. Human review for novel patterns.                       |
| Compensation creates more failures | High     | Dead letter queue for compensation failures. Max compensation retries. Human alert on repeated failures. |

### Safety Principles

1. **Human-in-the-loop by default**: All medium/high risk actions require human approval unless explicitly configured otherwise.
2. **Observability of autonomy**: Every autonomous action is traced and logged. The system reports what it did and why.
3. **Gradual rollout**: Canary deployment for all changes. Apply to subset first, evaluate, then full rollout.
4. **Automatic rollback**: If metrics degrade after an action, automatically rollback. No permanent changes without positive evidence.
5. **Bounded autonomy**: Rate limits, cooldowns, and maximum action counts prevent runaway behavior.
6. **Knowledge transparency**: The knowledge base is inspectable. Humans can see what the system "learned" and override conclusions.

---

## Key Files Reference

| Feature               | Package  | Path                                                    |
| --------------------- | -------- | ------------------------------------------------------- |
| Circuit Breaker       | runtime  | `packages/runtime/src/patterns/circuit-breaker.ts`      |
| Retry with Backoff    | runtime  | `packages/runtime/src/patterns/retry.ts`                |
| Leak Detector         | runtime  | `packages/runtime/src/patterns/leak-detector.ts`        |
| Dead Letter Queue     | runtime  | `packages/runtime/src/patterns/dead-letter.ts`          |
| Saga Compensation     | saga     | `packages/saga/src/compensation/engine.ts`              |
| Pre-Warming Engine    | runtime  | `packages/runtime/src/optimization/pre-warming.ts`      |
| Scope Pool            | runtime  | `packages/runtime/src/optimization/scope-pool.ts`       |
| Lifetime Advisor      | runtime  | `packages/runtime/src/optimization/lifetime-advisor.ts` |
| Alerting Engine       | tracing  | `packages/tracing/src/alerting/engine.ts`               |
| Monitor Agent         | autonomy | `packages/autonomy/src/monitor.ts`                      |
| Analyze Agent         | autonomy | `packages/autonomy/src/analyze.ts`                      |
| Plan Agent            | autonomy | `packages/autonomy/src/plan.ts`                         |
| Execute Agent         | autonomy | `packages/autonomy/src/execute.ts`                      |
| Knowledge Base        | autonomy | `packages/autonomy/src/knowledge.ts`                    |
| Health Scoring        | health   | `packages/health/src/scoring.ts`                        |
| Degradation Detection | health   | `packages/health/src/degradation.ts`                    |
| Report Generation     | health   | `packages/health/src/report.ts`                         |

---

## Relationship to Other Phases

```
  Phase 1 (Plumbing)     → Foundation that Phase 5 patterns wrap
  Phase 2 (Awareness)    → Self-knowledge that Phase 5 monitors
  Phase 3 (Reporting)    → Library data that Phase 5 aggregates
  Phase 4 (Communication)→ Channels through which Phase 5 reports actions
  Phase 5 (Autonomy)     → Closes the loop: knowledge → action → learning
```

Phase 5 is the culmination. Without Phases 1-4, there is nothing to monitor, analyze, plan for, or act upon. With Phase 5, the application becomes truly autonomic — a self-managing system that maintains its own health.

---

_"The best diagnostic tool is one that lets the system diagnose — and heal — itself."_
