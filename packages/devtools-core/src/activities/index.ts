/**
 * DevTools Activities
 *
 * Long-running activities for DevTools state machines using @hex-di/flow:
 * - ContainerDiscoveryActivity: Discovers containers via InspectorPlugin
 * - InspectorSubscriptionActivity: Subscribes to inspector events per-container
 * - TraceCollectorActivity: Collects traces from tracing API
 *
 * All activities use the activity() factory pattern with:
 * - Typed events via defineEvents()
 * - AbortSignal for cancellation
 * - EventSink for emitting events back to machines
 * - Proper cleanup lifecycle
 *
 * @packageDocumentation
 */

// =============================================================================
// Container Discovery Activity
// =============================================================================

export {
  ContainerDiscoveryActivity,
  ContainerDiscoveryEvents,
  ContainerDiscoveryPort,
  type ContainerDiscoveryInput,
  type ContainerDiscoveryOutput,
} from "./container-discovery.activity.js";

// =============================================================================
// Container Subscription Activity (Live Updates)
// =============================================================================

export {
  ContainerSubscriptionActivity,
  ContainerSubscriptionEvents,
  ContainerSubscriptionPort,
  type ContainerSubscriptionInput,
  type ContainerSubscriptionOutput,
  type InspectorRef,
} from "./container-subscription.activity.js";

// =============================================================================
// Inspector Subscription Activity
// =============================================================================

export {
  InspectorSubscriptionActivity,
  InspectorSubscriptionEvents,
  InspectorSubscriptionPort,
  runInspectorSubscription,
  type InspectorSubscriptionInput,
  type InspectorSubscriptionOutput,
  type InspectorEventSink,
  type InspectorSubscriptionEventType,
} from "./inspector-subscription.activity.js";

// =============================================================================
// Trace Collector Activity
// =============================================================================

export {
  TraceCollectorActivity,
  TraceCollectorEvents,
  TraceCollectorPort,
  runTraceCollector,
  type TraceCollectorInput,
  type TraceCollectorOutput,
  type TraceEventSink,
} from "./trace-collector.activity.js";
