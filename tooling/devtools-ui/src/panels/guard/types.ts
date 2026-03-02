/**
 * Core data models for the Guard Panel.
 *
 * Spec: 01-overview.md Section 1.4, 14-integration.md Sections 14.2, 14.8
 *
 * @packageDocumentation
 */

import type { PolicyKind } from "@hex-di/guard";

// ---------------------------------------------------------------------------
// 1.4.1 GuardEvaluationDescriptor
// ---------------------------------------------------------------------------

/** Static description of a guard policy tree's structure for a port. */
export interface GuardEvaluationDescriptor {
  /** Unique identifier for this policy tree. */
  readonly descriptorId: string;

  /** The port being protected. */
  readonly portName: string;

  /** Human-readable label. */
  readonly label: string;

  /** Static policy tree structure (root). */
  readonly rootNode: PolicyNodeDescriptor;

  /** Total leaf policies in the tree. */
  readonly leafCount: number;

  /** Deepest branch depth. */
  readonly maxDepth: number;

  /** All policy kinds present in the tree. */
  readonly policyKinds: ReadonlySet<PolicyKind>;

  /** Whether the tree contains async-capable policies. */
  readonly hasAsyncPolicies: boolean;

  /** Source location where the guard is defined (file:line). */
  readonly sourceLocation: string | undefined;
}

// ---------------------------------------------------------------------------
// 1.4.2 PolicyNodeDescriptor
// ---------------------------------------------------------------------------

/** Describes a single node in the policy tree. */
export interface PolicyNodeDescriptor {
  /** Depth-first index within the tree. */
  readonly nodeId: string;

  /** Policy kind discriminant. */
  readonly kind: PolicyKind;

  /** Human-readable label (from labeled() wrapper). */
  readonly label: string | undefined;

  /** Child nodes (empty for leaves). */
  readonly children: readonly PolicyNodeDescriptor[];

  /** Leaf-specific data (undefined for compound nodes). */
  readonly leafData: PolicyLeafData | undefined;

  /** Depth in the tree (root = 0). */
  readonly depth: number;

  /** Field visibility strategy for compound nodes. */
  readonly fieldStrategy: "intersection" | "union" | "first" | undefined;
}

// ---------------------------------------------------------------------------
// 1.4.3 PolicyLeafData
// ---------------------------------------------------------------------------

/** Discriminated union of leaf policy data. */
export type PolicyLeafData =
  | { readonly type: "hasPermission"; readonly resource: string; readonly action: string }
  | { readonly type: "hasRole"; readonly roleName: string }
  | { readonly type: "hasAttribute"; readonly attribute: string; readonly matcher: string }
  | { readonly type: "hasResourceAttribute"; readonly attribute: string; readonly matcher: string }
  | { readonly type: "hasSignature"; readonly meaning: string }
  | { readonly type: "hasRelationship"; readonly relation: string };

// ---------------------------------------------------------------------------
// 1.4.4 GuardEvaluationExecution
// ---------------------------------------------------------------------------

/** A complete execution trace of a guard policy evaluation. */
export interface GuardEvaluationExecution {
  /** Unique execution ID (matches EvaluationTrace.evaluationId). */
  readonly executionId: string;

  /** Reference to the descriptor. */
  readonly descriptorId: string;

  /** Port name being guarded. */
  readonly portName: string;

  /** Serialized subject being evaluated. */
  readonly subject: SerializedSubject;

  /** Final decision outcome. */
  readonly decision: "allow" | "deny";

  /** Per-node evaluation traces (tree structure). */
  readonly rootTrace: EvaluationNodeTrace;

  /** Total evaluation duration in milliseconds. */
  readonly durationMs: number;

  /** ISO 8601 timestamp of evaluation. */
  readonly evaluatedAt: string;

  /** Reason for denial (undefined for allow). */
  readonly reason: string | undefined;

  /** Fields visible after evaluation (field masking). */
  readonly visibleFields: readonly string[] | undefined;
}

// ---------------------------------------------------------------------------
// 1.4.5 EvaluationNodeTrace
// ---------------------------------------------------------------------------

/** Runtime trace of a single node's evaluation. */
export interface EvaluationNodeTrace {
  /** Matches PolicyNodeDescriptor.nodeId. */
  readonly nodeId: string;

  /** Policy kind. */
  readonly kind: PolicyKind;

  /** Evaluation result. */
  readonly result: "allow" | "deny";

  /** Whether this node was actually evaluated (false = short-circuited). */
  readonly evaluated: boolean;

  /** Duration in milliseconds. */
  readonly durationMs: number;

  /** Child traces (matching tree structure). */
  readonly children: readonly EvaluationNodeTrace[];

  /** Reason for denial. */
  readonly reason: string | undefined;

  /** Resolved value for attribute/relationship checks. */
  readonly resolvedValue: SerializedValue | undefined;

  /** Whether this node required async resolution. */
  readonly asyncResolution: boolean;

  /** Fields visible from this node. */
  readonly visibleFields: readonly string[] | undefined;
}

// ---------------------------------------------------------------------------
// 1.4.6 SerializedSubject
// ---------------------------------------------------------------------------

/** Serialized representation of an auth subject for display. */
export interface SerializedSubject {
  /** Subject identifier. */
  readonly id: string;

  /** Assigned roles. */
  readonly roles: readonly string[];

  /** Permissions in "resource:action" format. */
  readonly permissions: readonly string[];

  /** Subject attributes. */
  readonly attributes: Readonly<Record<string, SerializedValue>>;

  /** Authentication method (e.g., "jwt", "api-key"). */
  readonly authenticationMethod: string;

  /** ISO 8601 timestamp of authentication. */
  readonly authenticatedAt: string;

  /** Identity provider name. */
  readonly identityProvider: string | undefined;
}

// ---------------------------------------------------------------------------
// 1.4.7 SerializedValue
// ---------------------------------------------------------------------------

/** Depth-limited serialized value for transport and display. */
export type SerializedValue =
  | { readonly type: "string"; readonly value: string }
  | { readonly type: "number"; readonly value: number }
  | { readonly type: "boolean"; readonly value: boolean }
  | { readonly type: "null" }
  | { readonly type: "undefined" }
  | {
      readonly type: "object";
      readonly entries: ReadonlyMap<string, SerializedValue>;
      readonly truncated: boolean;
    }
  | {
      readonly type: "array";
      readonly items: readonly SerializedValue[];
      readonly truncated: boolean;
    }
  | { readonly type: "function"; readonly name: string }
  | { readonly type: "circular" }
  | {
      readonly type: "set";
      readonly items: readonly SerializedValue[];
      readonly truncated: boolean;
    }
  | {
      readonly type: "map";
      readonly entries: ReadonlyMap<string, SerializedValue>;
      readonly truncated: boolean;
    };

// ---------------------------------------------------------------------------
// 1.4.8 GuardPortStatistics
// ---------------------------------------------------------------------------

/** Per-port aggregate statistics. */
export interface GuardPortStatistics {
  /** Port name. */
  readonly portName: string;

  /** Total number of evaluations. */
  readonly totalEvaluations: number;

  /** Number of allow decisions. */
  readonly allowCount: number;

  /** Number of deny decisions. */
  readonly denyCount: number;

  /** Number of error outcomes. */
  readonly errorCount: number;

  /** Allow rate (0.0 to 1.0). */
  readonly allowRate: number;

  /** Most frequent deny reason. */
  readonly topDenyReason: string | undefined;

  /** Number of unique subjects seen. */
  readonly uniqueSubjects: number;

  /** Policy kind of the root policy. */
  readonly policyKind: string;
}

// ---------------------------------------------------------------------------
// 1.4.9 GuardPanelSnapshot
// ---------------------------------------------------------------------------

/** Complete snapshot of all Guard data for the panel. */
export interface GuardPanelSnapshot {
  /** All registered descriptors. */
  readonly descriptors: ReadonlyMap<string, GuardEvaluationDescriptor>;

  /** Per-port aggregate statistics. */
  readonly portStats: ReadonlyMap<string, GuardPortStatistics>;

  /** Recent executions (newest first). */
  readonly recentExecutions: readonly GuardEvaluationExecution[];

  /** All discovered paths across all descriptors. */
  readonly paths: ReadonlyMap<string, readonly GuardPathDescriptor[]>;

  /** Role hierarchy data. */
  readonly roleHierarchy: readonly SerializedRole[];

  /** Total evaluations observed. */
  readonly totalEvaluationsObserved: number;

  /** Global allow rate across all ports. */
  readonly globalAllowRate: number;

  /** Timestamp of this snapshot. */
  readonly snapshotTimestamp: number;
}

// ---------------------------------------------------------------------------
// 1.4.10 GuardPathDescriptor
// ---------------------------------------------------------------------------

/** A single possible path through a policy tree. */
export interface GuardPathDescriptor {
  /** Unique path ID. */
  readonly pathId: string;

  /** Reference to the descriptor. */
  readonly descriptorId: string;

  /** Ordered node IDs visited along this path. */
  readonly nodeIds: readonly string[];

  /** Per-node outcomes along this path. */
  readonly nodeOutcomes: readonly ("allow" | "deny" | "skip")[];

  /** Final outcome of this path. */
  readonly finalOutcome: "allow" | "deny";

  /** Human-readable description of this path. */
  readonly description: string;

  /** Observed frequency (0.0 to 1.0), undefined if never observed. */
  readonly frequency: number | undefined;

  /** Number of times this path was observed. */
  readonly observedCount: number;
}

// ---------------------------------------------------------------------------
// 1.4.11 SerializedRole
// ---------------------------------------------------------------------------

/** Serialized role for hierarchy visualization. */
export interface SerializedRole {
  /** Role name. */
  readonly name: string;

  /** Directly assigned permissions. */
  readonly directPermissions: readonly string[];

  /** Roles this role inherits from. */
  readonly inherits: readonly string[];

  /** All permissions after flattening inheritance. */
  readonly flattenedPermissions: readonly string[];

  /** Whether circular inheritance was detected. */
  readonly hasCircularInheritance: boolean;
}

// ---------------------------------------------------------------------------
// 1.4.12 GuardFilterState
// ---------------------------------------------------------------------------

/** State of all active filters across the panel. */
export interface GuardFilterState {
  /** Port name substring search. */
  readonly portSearch: string;

  /** Filter to a specific subject. undefined = all subjects. */
  readonly subjectId: string | undefined;

  /** Filter to a specific role. undefined = all roles. */
  readonly roleName: string | undefined;

  /** Filter by decision outcome. */
  readonly decision: "all" | "allow" | "deny" | "error";

  /** Filter to a specific policy kind. */
  readonly policyKind: PolicyKind | undefined;

  /** Temporal window for aggregate data. */
  readonly timeRange: "5m" | "1h" | "24h" | "all" | { readonly from: number; readonly to: number };
}

// ---------------------------------------------------------------------------
// 1.4.13 GuardViewId & GuardPanelNavigation
// ---------------------------------------------------------------------------

/** Identifiers for the 7 Guard Panel views. */
export type GuardViewId = "tree" | "log" | "paths" | "sankey" | "timeline" | "roles" | "overview";

/** Context passed when navigating to/from the Guard Panel. */
export interface GuardPanelNavigation {
  /** Descriptor to select on arrival. */
  readonly descriptorId: string | undefined;

  /** Execution to select on arrival. */
  readonly executionId: string | undefined;

  /** Node to highlight on arrival. */
  readonly nodeId: string | undefined;

  /** View to activate on arrival. */
  readonly view: GuardViewId | undefined;

  /** Subject to filter to on arrival. */
  readonly subjectId: string | undefined;

  /** Time range to set on arrival. */
  readonly timeRange: GuardFilterState["timeRange"] | undefined;
}

// ---------------------------------------------------------------------------
// 14.8 GuardPanelState
// ---------------------------------------------------------------------------

/** Internal state management for the Guard Panel. */
export interface GuardPanelState {
  /** Currently selected descriptor. */
  readonly selectedDescriptorId: string | undefined;

  /** Currently selected execution. */
  readonly selectedExecutionId: string | undefined;

  /** Currently selected node (within tree/trace). */
  readonly selectedNodeId: string | undefined;

  /** Currently active view. */
  readonly activeView: GuardViewId;

  /** Filter state. */
  readonly filter: GuardFilterState;

  /** Educational sidebar open/closed. */
  readonly educationalSidebarOpen: boolean;

  /** Live connection status. */
  readonly connectionStatus: "connected" | "disconnected";
}

// ---------------------------------------------------------------------------
// 14.2 GuardDataSource & GuardDataEvent
// ---------------------------------------------------------------------------

/** Events emitted by the Guard data source. */
export type GuardDataEvent =
  | { readonly type: "descriptor-registered"; readonly descriptorId: string }
  | { readonly type: "execution-added"; readonly portName: string; readonly executionId: string }
  | { readonly type: "statistics-updated"; readonly portName: string }
  | { readonly type: "role-hierarchy-updated" }
  | { readonly type: "snapshot-changed" }
  | { readonly type: "connection-lost" }
  | { readonly type: "connection-restored" };

/** Data source interface for the Guard Panel. */
export interface GuardDataSource {
  /** Get all evaluation descriptors. */
  getDescriptors(): ReadonlyMap<string, GuardEvaluationDescriptor>;

  /** Get per-port statistics. */
  getPortStatistics(): ReadonlyMap<string, GuardPortStatistics>;

  /** Get recent executions for a port. */
  getExecutions(portName: string): readonly GuardEvaluationExecution[];

  /** Get computed paths for a descriptor. */
  getPaths(descriptorId: string): readonly GuardPathDescriptor[];

  /** Get the role hierarchy. */
  getRoleHierarchy(): readonly SerializedRole[];

  /** Get the complete panel snapshot. */
  getSnapshot(): GuardPanelSnapshot;

  /** Subscribe to data changes. Returns unsubscribe function. */
  subscribe(listener: (event: GuardDataEvent) => void): () => void;
}
