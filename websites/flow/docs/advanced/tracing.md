---
sidebar_position: 3
title: Tracing
---

# Tracing

Flow provides comprehensive tracing capabilities for monitoring, debugging, and auditing state machine execution, including GxP-compliant audit trails.

## FlowTransitionEvent

Each transition generates a detailed event for tracing:

```typescript
interface FlowTransitionEvent {
  id: string; // Unique event ID
  machineId: string; // Machine identifier
  prevState: string; // Previous state
  event: EventAny; // Triggering event
  nextState: string; // New state
  effects: EffectAny[]; // Effects to execute
  timestamp: number; // When transition occurred
  duration?: number; // Transition duration in ms
  hash?: string; // Hash for audit trail (GxP F9)
}
```

## Flow Collector

The collector interface provides transition tracking:

```typescript
import { FlowMemoryCollector, createMachineRunner } from "@hex-di/flow";

// Create collector with retention policy
const collector = new FlowMemoryCollector({
  maxTransitions: 1000,
  slowThresholdMs: 100,
  expiryMs: 3600000, // 1 hour
});

// Use with runner
const runner = createMachineRunner(machine, {
  collector,
});

// Query transitions
const transitions = collector.query({
  machineId: "user-flow",
  eventType: "LOGIN",
  minDuration: 50,
});

// Get statistics
const stats = collector.getStats();
console.log(`Total transitions: ${stats.totalTransitions}`);
console.log(`Slow transitions: ${stats.slowTransitions}`);
console.log(`Average duration: ${stats.averageDuration}ms`);

// Subscribe to live events
const unsubscribe = collector.subscribe(event => {
  console.log(`Transition: ${event.prevState} → ${event.nextState}`);
});

// Clear history
collector.clear();
```

## Filtering Transitions

Use `FlowTransitionFilter` to query specific transitions:

```typescript
interface FlowTransitionFilter {
  machineId?: string; // Filter by machine
  prevState?: string; // Filter by source state
  nextState?: string; // Filter by target state
  eventType?: string; // Filter by event type
  minDuration?: number; // Minimum duration
  maxDuration?: number; // Maximum duration
  startTime?: number; // Time range start
  endTime?: number; // Time range end
  hasEffects?: boolean; // Only transitions with effects
}

// Query examples
const slowTransitions = collector.query({
  minDuration: 100,
});

const loginTransitions = collector.query({
  eventType: "LOGIN",
  startTime: Date.now() - 3600000, // Last hour
});

const errorTransitions = collector.query({
  nextState: "error",
});
```

## Retention Policy

Configure how transitions are retained:

```typescript
interface FlowRetentionPolicy {
  maxTransitions: number; // Maximum stored transitions
  slowThresholdMs: number; // Threshold for slow transitions
  expiryMs: number; // Auto-expiry time
}

const DEFAULT_FLOW_RETENTION_POLICY: FlowRetentionPolicy = {
  maxTransitions: 500,
  slowThresholdMs: 50,
  expiryMs: 300000, // 5 minutes
};

// Custom retention policy
const productionPolicy: FlowRetentionPolicy = {
  maxTransitions: 10000,
  slowThresholdMs: 100,
  expiryMs: 86400000, // 24 hours
};

const collector = new FlowMemoryCollector(productionPolicy);
```

## Memory Collector

The `FlowMemoryCollector` provides in-memory transition storage:

```typescript
class FlowMemoryCollector implements FlowCollector {
  constructor(policy?: FlowRetentionPolicy);

  // Collect a transition event
  collect(event: FlowTransitionEvent): void;

  // Query stored transitions
  query(filter?: FlowTransitionFilter): FlowTransitionEvent[];

  // Subscribe to new transitions
  subscribe(fn: FlowSubscriber): Unsubscribe;

  // Get statistics
  getStats(): FlowStats;

  // Clear all stored transitions
  clear(): void;
}

// Statistics interface
interface FlowStats {
  totalTransitions: number;
  uniqueMachines: number;
  slowTransitions: number;
  averageDuration: number;
  memoryUsage: number;
}
```

## NoOp Collector

For production with zero overhead:

```typescript
import { noopFlowCollector } from "@hex-di/flow";

// Zero-overhead collector
const runner = createMachineRunner(machine, {
  collector: noopFlowCollector,
});

// All operations are no-ops
noopFlowCollector.collect(event); // Does nothing
noopFlowCollector.query(); // Returns []
noopFlowCollector.getStats(); // Returns zeros
```

## Hash Chain for Audit Trails

For GxP compliance (F9), create tamper-evident audit trails:

```typescript
import { computeHash, createTracingRunner } from "@hex-di/flow";

// Enable hash chaining
const runner = createTracingRunner(machine, {
  collector: new FlowMemoryCollector(),
  enableHashChain: true,
  hashAlgorithm: "SHA-256",
});

// Each transition includes previous hash
runner.send({ type: "START" });
const transitions = collector.query();

console.log(transitions[0].hash); // Hash of first transition
console.log(transitions[1].hash); // Hash includes previous hash

// Verify chain integrity
function verifyHashChain(events: FlowTransitionEvent[]): boolean {
  let previousHash = "";

  for (const event of events) {
    const expectedHash = computeHash({
      ...event,
      previousHash,
    });

    if (event.hash !== expectedHash) {
      return false; // Chain broken
    }

    previousHash = event.hash;
  }

  return true;
}

const isValid = verifyHashChain(transitions);
console.log(`Audit trail valid: ${isValid}`);
```

## DevTools Integration

Connect collectors to development tools:

```typescript
import { createFlowInspectorAdapter } from "@hex-di/flow";

// Create inspector adapter for DevTools
const inspectorAdapter = createFlowInspectorAdapter({
  maxTransitions: 5000,
  slowThresholdMs: 50,
  enableProfiling: true,
});

// Add to container
const container = createContainer()
  .addAdapter(inspectorAdapter)
  .addAdapter(userFlowAdapter)
  .build();

// DevTools can now access transition data
const inspector = container.get(FlowInspectorPort);
const timeline = inspector.getTimeline({ limit: 100 });
const slowest = inspector.getSlowestTransitions(10);
```

## Distributed Tracing (GxP F13)

Integrate with distributed tracing systems:

```typescript
import { createFlowTracingHook } from "@hex-di/flow";

// OpenTelemetry integration
const tracingHook = createFlowTracingHook({
  tracer: openTelemetryTracer,
  includeContext: false, // Don't include sensitive data
  includeEffects: true,
  spanNameFormat: event => `flow.${event.machineId}.${event.prevState}->${event.nextState}`,
});

const runner = createMachineRunner(machine, {
  tracingHook,
});

// Each transition creates a span
runner.send({ type: "PROCESS" });
// Span: flow.order.idle->processing

// Nested spans for effects
// Span: flow.order.effect.invoke.PaymentService.charge
```

### Custom Tracing Hook

Implement custom tracing logic:

```typescript
import { FlowTracingHook, TracerLike } from "@hex-di/flow";

class CustomTracingHook implements FlowTracingHook {
  constructor(private tracer: TracerLike) {}

  onTransitionStart(event: FlowTransitionEvent): void {
    const span = this.tracer.startSpan(`machine.${event.machineId}`, {
      attributes: {
        "flow.machine_id": event.machineId,
        "flow.prev_state": event.prevState,
        "flow.next_state": event.nextState,
        "flow.event_type": event.event.type,
        "flow.has_effects": event.effects.length > 0,
      },
    });

    // Store span for later
    this.activeSpans.set(event.id, span);
  }

  onTransitionEnd(event: FlowTransitionEvent, error?: unknown): void {
    const span = this.activeSpans.get(event.id);
    if (!span) return;

    if (error) {
      span.setStatus({ code: StatusCode.ERROR });
      span.recordException(error);
    } else {
      span.setStatus({ code: StatusCode.OK });
    }

    if (event.duration) {
      span.setAttribute("flow.duration_ms", event.duration);
    }

    span.end();
    this.activeSpans.delete(event.id);
  }

  onEffectStart(effect: EffectAny, parentEvent: FlowTransitionEvent): void {
    // Create child span for effect
    const parentSpan = this.activeSpans.get(parentEvent.id);
    const span = this.tracer.startSpan(`effect.${effect._tag}`, { parent: parentSpan });

    this.effectSpans.set(effect, span);
  }

  onEffectEnd(effect: EffectAny, error?: unknown): void {
    const span = this.effectSpans.get(effect);
    if (!span) return;

    if (error) {
      span.setStatus({ code: StatusCode.ERROR });
    }

    span.end();
    this.effectSpans.delete(effect);
  }

  private activeSpans = new Map<string, Span>();
  private effectSpans = new Map<EffectAny, Span>();
}
```

## Performance Monitoring

Track performance metrics:

```typescript
// Create runner with duration tracking
const runner = createTracingRunnerWithDuration(machine, {
  collector: new FlowMemoryCollector(),
});

// Analyze performance
const stats = collector.getStats();
console.log(`Average transition: ${stats.averageDuration}ms`);

// Find performance bottlenecks
const slowTransitions = collector.query({
  minDuration: 100,
});

for (const transition of slowTransitions) {
  console.log(
    `Slow: ${transition.prevState} → ${transition.nextState} ` + `(${transition.duration}ms)`
  );
}

// Monitor specific paths
const loginPath = collector.query({
  prevState: "idle",
  nextState: "authenticating",
});

const avgLoginTime = loginPath.reduce((sum, t) => sum + (t.duration || 0), 0) / loginPath.length;

console.log(`Average login time: ${avgLoginTime}ms`);
```

## Audit Sink Integration

For GxP compliance (F3), integrate with audit systems:

```typescript
import { FlowAuditSink, setFlowAuditSink } from "@hex-di/flow";

// Implement audit sink
class DatabaseAuditSink implements FlowAuditSink {
  async record(event: FlowAuditRecord): Promise<void> {
    await db.auditLog.insert({
      timestamp: event.timestamp,
      machineId: event.machineId,
      userId: event.metadata?.userId,
      action: `${event.prevState} → ${event.nextState}`,
      eventType: event.event.type,
      duration: event.duration,
      hash: event.hash,
      signature: await this.sign(event),
    });
  }

  private async sign(event: FlowAuditRecord): Promise<string> {
    // Digital signature for non-repudiation
    return crypto.sign(JSON.stringify(event), privateKey);
  }
}

// Set global audit sink
setFlowAuditSink(new DatabaseAuditSink());

// All transitions are now audited
const runner = createMachineRunner(machine, {
  auditMetadata: { userId: currentUser.id },
});
```

## Visualizing Traces

Export traces for visualization:

```typescript
// Export to Chrome DevTools format
function exportToDevTools(events: FlowTransitionEvent[]) {
  return events.map(event => ({
    name: `${event.prevState} → ${event.nextState}`,
    cat: "flow",
    ph: "X", // Complete event
    ts: event.timestamp * 1000, // Microseconds
    dur: (event.duration || 0) * 1000,
    pid: event.machineId,
    tid: 1,
    args: {
      event: event.event.type,
      effects: event.effects.length,
    },
  }));
}

// Export to Jaeger format
function exportToJaeger(events: FlowTransitionEvent[]) {
  return {
    traceID: generateTraceId(),
    spans: events.map(event => ({
      traceID: generateTraceId(),
      spanID: event.id,
      operationName: `${event.machineId}.transition`,
      startTime: event.timestamp * 1000,
      duration: (event.duration || 0) * 1000,
      tags: [
        { key: "machine.id", value: event.machineId },
        { key: "state.from", value: event.prevState },
        { key: "state.to", value: event.nextState },
        { key: "event.type", value: event.event.type },
      ],
    })),
  };
}
```

## Best Practices

1. **Use NoOp in production**: Zero overhead when tracing isn't needed
2. **Set appropriate retention**: Balance memory usage with debugging needs
3. **Filter aggressively**: Query only relevant transitions
4. **Enable hash chains for audit**: Required for GxP compliance
5. **Don't trace sensitive data**: Exclude PII from traces
6. **Monitor slow transitions**: Identify performance bottlenecks
7. **Integrate with APM tools**: Use distributed tracing for complex systems
8. **Archive audit trails**: Store audit data separately from operational traces
