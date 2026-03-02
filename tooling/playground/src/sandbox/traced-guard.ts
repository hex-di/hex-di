/**
 * TracedGuard — instrumented Guard module that captures policy evaluations.
 *
 * Wraps the real evaluate() from @hex-di/guard and records each evaluation
 * to produce GuardEvaluationDescriptor and GuardEvaluationExecution data
 * for the Guard Panel.
 *
 * @packageDocumentation
 * @internal
 */

// =============================================================================
// Local Type Definitions
// =============================================================================
// These mirror the types in @hex-di/devtools-ui panels/guard/types.ts.
// Defined locally because the devtools-ui package only exports from its root
// index and the worker cannot import sub-paths. The worker protocol
// serialization will convert these to structured-clone-safe format.

type PolicyKind =
  | "hasPermission"
  | "hasRole"
  | "hasAttribute"
  | "hasResourceAttribute"
  | "hasSignature"
  | "hasRelationship"
  | "allOf"
  | "anyOf"
  | "not"
  | "labeled";

interface PolicyNodeDescriptor {
  readonly nodeId: string;
  readonly kind: PolicyKind;
  readonly label: string | undefined;
  readonly children: readonly PolicyNodeDescriptor[];
  readonly leafData: PolicyLeafData | undefined;
  readonly depth: number;
  readonly fieldStrategy: "intersection" | "union" | "first" | undefined;
}

type PolicyLeafData =
  | { readonly type: "hasPermission"; readonly resource: string; readonly action: string }
  | { readonly type: "hasRole"; readonly roleName: string }
  | { readonly type: "hasAttribute"; readonly attribute: string; readonly matcher: string }
  | { readonly type: "hasResourceAttribute"; readonly attribute: string; readonly matcher: string }
  | { readonly type: "hasSignature"; readonly meaning: string }
  | { readonly type: "hasRelationship"; readonly relation: string };

interface GuardEvaluationDescriptor {
  readonly descriptorId: string;
  readonly portName: string;
  readonly label: string;
  readonly rootNode: PolicyNodeDescriptor;
  readonly leafCount: number;
  readonly maxDepth: number;
  readonly policyKinds: ReadonlySet<PolicyKind>;
  readonly hasAsyncPolicies: boolean;
  readonly sourceLocation: string | undefined;
}

type SerializedValue =
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

interface SerializedSubject {
  readonly id: string;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
  readonly attributes: Readonly<Record<string, SerializedValue>>;
  readonly authenticationMethod: string;
  readonly authenticatedAt: string;
  readonly identityProvider: string | undefined;
}

interface EvaluationNodeTrace {
  readonly nodeId: string;
  readonly kind: PolicyKind;
  readonly result: "allow" | "deny";
  readonly evaluated: boolean;
  readonly durationMs: number;
  readonly children: readonly EvaluationNodeTrace[];
  readonly reason: string | undefined;
  readonly resolvedValue: SerializedValue | undefined;
  readonly asyncResolution: boolean;
  readonly visibleFields: readonly string[] | undefined;
}

interface GuardEvaluationExecution {
  readonly executionId: string;
  readonly descriptorId: string;
  readonly portName: string;
  readonly subject: SerializedSubject;
  readonly decision: "allow" | "deny";
  readonly rootTrace: EvaluationNodeTrace;
  readonly durationMs: number;
  readonly evaluatedAt: string;
  readonly reason: string | undefined;
  readonly visibleFields: readonly string[] | undefined;
}

interface SerializedRole {
  readonly name: string;
  readonly directPermissions: readonly string[];
  readonly inherits: readonly string[];
  readonly flattenedPermissions: readonly string[];
  readonly hasCircularInheritance: boolean;
}

// =============================================================================
// Guard Library Type Constraints
// =============================================================================
// These describe the shapes of @hex-di/guard runtime objects we intercept.

interface PolicyConstraintLike {
  readonly kind: string;
  readonly policies?: readonly PolicyConstraintLike[];
  readonly policy?: PolicyConstraintLike;
  readonly label?: string;
  readonly permission?: { readonly resource: string; readonly action: string };
  readonly roleName?: string;
  readonly attribute?: string;
  readonly matcher?: { readonly kind: string };
  readonly meaning?: string;
  readonly relation?: string;
  readonly fieldStrategy?: string;
}

interface EvaluationTraceLike {
  readonly policyKind: string;
  readonly label?: string;
  readonly result: "allow" | "deny";
  readonly reason?: string;
  readonly durationMs: number;
  readonly children?: readonly EvaluationTraceLike[];
  readonly visibleFields?: ReadonlyArray<string>;
}

interface DecisionLike {
  readonly kind: "allow" | "deny";
  readonly evaluationId: string;
  readonly evaluatedAt: string;
  readonly subjectId: string;
  readonly trace: EvaluationTraceLike;
  readonly durationMs: number;
  readonly reason?: string;
  readonly visibleFields?: ReadonlyArray<string>;
}

interface ResultLike {
  isOk(): boolean;
  isErr(): boolean;
  readonly value?: unknown;
  readonly error?: unknown;
}

interface AuthSubjectLike {
  readonly id: string;
  readonly roles: readonly string[];
  readonly permissions: ReadonlySet<string>;
  readonly attributes: Readonly<Record<string, unknown>>;
  readonly authenticationMethod: string;
  readonly authenticatedAt: string;
  readonly identityProvider?: string;
}

interface EvaluationContextLike {
  readonly subject: AuthSubjectLike;
}

interface RoleConstraintLike {
  readonly name: string;
  readonly permissions: readonly { readonly resource: string; readonly action: string }[];
  readonly inherits: readonly RoleConstraintLike[];
}

// =============================================================================
// Value Serialization
// =============================================================================

const MAX_DEPTH = 3;
const MAX_STRING_LENGTH = 200;
const MAX_COLLECTION_SIZE = 10;

function serializeGuardValue(value: unknown, depth: number = 0): SerializedValue {
  if (depth > MAX_DEPTH) {
    return { type: "string", value: "[max depth]" };
  }

  if (value === null) return { type: "null" };
  if (value === undefined) return { type: "undefined" };

  if (typeof value === "string") {
    const truncated = value.length > MAX_STRING_LENGTH;
    return {
      type: "string",
      value: truncated ? value.slice(0, MAX_STRING_LENGTH) + "…" : value,
    };
  }
  if (typeof value === "number") return { type: "number", value };
  if (typeof value === "boolean") return { type: "boolean", value };
  if (typeof value === "function") {
    return { type: "function", name: value.name || "anonymous" };
  }
  if (typeof value === "symbol" || typeof value === "bigint") {
    return { type: "string", value: String(value) };
  }

  if (value instanceof Set) {
    const items: SerializedValue[] = [];
    let count = 0;
    for (const v of value) {
      if (count >= MAX_COLLECTION_SIZE) break;
      items.push(serializeGuardValue(v, depth + 1));
      count++;
    }
    return { type: "set", items, truncated: value.size > MAX_COLLECTION_SIZE };
  }

  if (value instanceof Map) {
    const entries = new Map<string, SerializedValue>();
    let count = 0;
    for (const [k, v] of value) {
      if (count >= MAX_COLLECTION_SIZE) break;
      entries.set(String(k), serializeGuardValue(v, depth + 1));
      count++;
    }
    return { type: "map", entries, truncated: value.size > MAX_COLLECTION_SIZE };
  }

  if (Array.isArray(value)) {
    const truncated = value.length > MAX_COLLECTION_SIZE;
    const items = value
      .slice(0, MAX_COLLECTION_SIZE)
      .map(item => serializeGuardValue(item, depth + 1));
    return { type: "array", items, truncated };
  }

  // Plain object
  try {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record);
    const truncated = keys.length > MAX_COLLECTION_SIZE;
    const entries = new Map<string, SerializedValue>();
    const limit = Math.min(keys.length, MAX_COLLECTION_SIZE);
    for (let i = 0; i < limit; i++) {
      entries.set(keys[i], serializeGuardValue(record[keys[i]], depth + 1));
    }
    return { type: "object", entries, truncated };
  } catch {
    return { type: "string", value: "[Object]" };
  }
}

// =============================================================================
// Subject Serialization
// =============================================================================

function serializeSubject(subject: AuthSubjectLike): SerializedSubject {
  const permissions: string[] = [];
  for (const perm of subject.permissions) {
    permissions.push(perm);
  }

  const attributes: Record<string, SerializedValue> = {};
  for (const [key, value] of Object.entries(subject.attributes)) {
    attributes[key] = serializeGuardValue(value);
  }

  return {
    id: subject.id,
    roles: [...subject.roles],
    permissions,
    attributes,
    authenticationMethod: subject.authenticationMethod,
    authenticatedAt: subject.authenticatedAt,
    identityProvider: subject.identityProvider ?? undefined,
  };
}

// =============================================================================
// Descriptor Building
// =============================================================================
// Replicates the logic from devtools-ui/panels/guard/descriptor-builder.ts
// locally, since the worker cannot import from devtools-ui sub-paths.

interface WalkState {
  nextId: number;
  policyKinds: Set<PolicyKind>;
  leafCount: number;
  maxDepth: number;
  hasAsyncPolicies: boolean;
}

const VALID_POLICY_KINDS = new Set<string>([
  "hasPermission",
  "hasRole",
  "hasAttribute",
  "hasResourceAttribute",
  "hasSignature",
  "hasRelationship",
  "allOf",
  "anyOf",
  "not",
  "labeled",
]);

function isPolicyKind(kind: string): kind is PolicyKind {
  return VALID_POLICY_KINDS.has(kind);
}

function buildDescriptorFromConstraint(
  portName: string,
  constraint: PolicyConstraintLike
): GuardEvaluationDescriptor {
  const state: WalkState = {
    nextId: 0,
    policyKinds: new Set(),
    leafCount: 0,
    maxDepth: 0,
    hasAsyncPolicies: false,
  };

  const rootNode = walkConstraint(constraint, 0, state);

  return {
    descriptorId: `guard:${portName}`,
    portName,
    label: portName,
    rootNode,
    leafCount: state.leafCount,
    maxDepth: state.maxDepth,
    policyKinds: state.policyKinds,
    hasAsyncPolicies: state.hasAsyncPolicies,
    sourceLocation: undefined,
  };
}

function walkConstraint(
  constraint: PolicyConstraintLike,
  depth: number,
  state: WalkState
): PolicyNodeDescriptor {
  const nodeId = `node-${state.nextId}`;
  state.nextId += 1;

  const kind = constraint.kind;
  if (isPolicyKind(kind)) {
    state.policyKinds.add(kind);
  }

  if (depth > state.maxDepth) {
    state.maxDepth = depth;
  }

  if (!isPolicyKind(kind)) {
    state.leafCount += 1;
    return {
      nodeId,
      kind: kind as PolicyKind,
      label: undefined,
      children: [],
      leafData: undefined,
      depth,
      fieldStrategy: undefined,
    };
  }

  switch (kind) {
    case "allOf": {
      const children = (constraint.policies ?? []).map(p => walkConstraint(p, depth + 1, state));
      return {
        nodeId,
        kind: "allOf",
        label: undefined,
        children,
        leafData: undefined,
        depth,
        fieldStrategy:
          (constraint.fieldStrategy as "intersection" | "union" | "first") ?? "intersection",
      };
    }

    case "anyOf": {
      const children = (constraint.policies ?? []).map(p => walkConstraint(p, depth + 1, state));
      return {
        nodeId,
        kind: "anyOf",
        label: undefined,
        children,
        leafData: undefined,
        depth,
        fieldStrategy: (constraint.fieldStrategy as "intersection" | "union" | "first") ?? "first",
      };
    }

    case "not": {
      const child = constraint.policy
        ? walkConstraint(constraint.policy, depth + 1, state)
        : undefined;
      return {
        nodeId,
        kind: "not",
        label: undefined,
        children: child ? [child] : [],
        leafData: undefined,
        depth,
        fieldStrategy: undefined,
      };
    }

    case "labeled": {
      const child = constraint.policy
        ? walkConstraint(constraint.policy, depth + 1, state)
        : undefined;
      return {
        nodeId,
        kind: "labeled",
        label: constraint.label,
        children: child ? [child] : [],
        leafData: undefined,
        depth,
        fieldStrategy: undefined,
      };
    }

    case "hasPermission": {
      state.leafCount += 1;
      return {
        nodeId,
        kind: "hasPermission",
        label: undefined,
        children: [],
        leafData: constraint.permission
          ? {
              type: "hasPermission",
              resource: constraint.permission.resource,
              action: constraint.permission.action,
            }
          : undefined,
        depth,
        fieldStrategy: undefined,
      };
    }

    case "hasRole": {
      state.leafCount += 1;
      return {
        nodeId,
        kind: "hasRole",
        label: undefined,
        children: [],
        leafData: constraint.roleName
          ? { type: "hasRole", roleName: constraint.roleName }
          : undefined,
        depth,
        fieldStrategy: undefined,
      };
    }

    case "hasAttribute": {
      state.leafCount += 1;
      return {
        nodeId,
        kind: "hasAttribute",
        label: undefined,
        children: [],
        leafData: constraint.attribute
          ? {
              type: "hasAttribute",
              attribute: constraint.attribute,
              matcher: constraint.matcher?.kind ?? "unknown",
            }
          : undefined,
        depth,
        fieldStrategy: undefined,
      };
    }

    case "hasResourceAttribute": {
      state.leafCount += 1;
      return {
        nodeId,
        kind: "hasResourceAttribute",
        label: undefined,
        children: [],
        leafData: constraint.attribute
          ? {
              type: "hasResourceAttribute",
              attribute: constraint.attribute,
              matcher: constraint.matcher?.kind ?? "unknown",
            }
          : undefined,
        depth,
        fieldStrategy: undefined,
      };
    }

    case "hasSignature": {
      state.leafCount += 1;
      return {
        nodeId,
        kind: "hasSignature",
        label: undefined,
        children: [],
        leafData: constraint.meaning
          ? { type: "hasSignature", meaning: constraint.meaning }
          : undefined,
        depth,
        fieldStrategy: undefined,
      };
    }

    case "hasRelationship": {
      state.leafCount += 1;
      state.hasAsyncPolicies = true;
      return {
        nodeId,
        kind: "hasRelationship",
        label: undefined,
        children: [],
        leafData: constraint.relation
          ? { type: "hasRelationship", relation: constraint.relation }
          : undefined,
        depth,
        fieldStrategy: undefined,
      };
    }
  }
}

// =============================================================================
// Trace Conversion
// =============================================================================
// Converts the library's EvaluationTrace tree to the panel's
// EvaluationNodeTrace tree, aligning with the PolicyNodeDescriptor
// to assign stable node IDs and detect short-circuited children.

function convertTrace(
  descriptorNode: PolicyNodeDescriptor,
  libraryTrace: EvaluationTraceLike | undefined
): EvaluationNodeTrace {
  if (!libraryTrace) {
    // Short-circuited node: was never evaluated
    return {
      nodeId: descriptorNode.nodeId,
      kind: descriptorNode.kind,
      result: "deny",
      evaluated: false,
      durationMs: 0,
      children: descriptorNode.children.map(child => convertTrace(child, undefined)),
      reason: undefined,
      resolvedValue: undefined,
      asyncResolution: false,
      visibleFields: undefined,
    };
  }

  // Align trace children with descriptor children.
  // The library trace only includes children that were actually evaluated.
  // Short-circuited children have no trace entry.
  const traceChildren = libraryTrace.children ?? [];
  const childTraces: EvaluationNodeTrace[] = descriptorNode.children.map(
    (childDescriptor, index) => {
      const childTrace = index < traceChildren.length ? traceChildren[index] : undefined;
      return convertTrace(childDescriptor, childTrace);
    }
  );

  return {
    nodeId: descriptorNode.nodeId,
    kind: descriptorNode.kind,
    result: libraryTrace.result,
    evaluated: true,
    durationMs: libraryTrace.durationMs,
    children: childTraces,
    reason: libraryTrace.reason ?? undefined,
    resolvedValue: undefined,
    asyncResolution: false,
    visibleFields: libraryTrace.visibleFields ? [...libraryTrace.visibleFields] : undefined,
  };
}

// =============================================================================
// Role Hierarchy Extraction
// =============================================================================

const capturedRoles = new Map<string, RoleConstraintLike>();

function serializeRoleHierarchy(): readonly SerializedRole[] {
  const roles: SerializedRole[] = [];
  const visited = new Set<string>();

  for (const [, role] of capturedRoles) {
    if (visited.has(role.name)) continue;
    visited.add(role.name);

    // Detect circular inheritance
    const hasCircular = detectCircularInheritance(role, new Set());

    // Flatten permissions
    const flattenedSet = new Set<string>();
    flattenPermissionsFromRole(role, flattenedSet, new Set());

    roles.push({
      name: role.name,
      directPermissions: role.permissions.map(p => `${p.resource}:${p.action}`),
      inherits: role.inherits.map(r => r.name),
      flattenedPermissions: [...flattenedSet],
      hasCircularInheritance: hasCircular,
    });
  }

  return roles;
}

function detectCircularInheritance(role: RoleConstraintLike, stack: Set<string>): boolean {
  if (stack.has(role.name)) return true;
  stack.add(role.name);
  for (const parent of role.inherits) {
    if (detectCircularInheritance(parent, stack)) return true;
  }
  stack.delete(role.name);
  return false;
}

function flattenPermissionsFromRole(
  role: RoleConstraintLike,
  result: Set<string>,
  visited: Set<string>
): void {
  if (visited.has(role.name)) return;
  visited.add(role.name);

  for (const perm of role.permissions) {
    result.add(`${perm.resource}:${perm.action}`);
  }

  for (const parent of role.inherits) {
    flattenPermissionsFromRole(parent, result, visited);
  }
}

// =============================================================================
// Descriptor Cache
// =============================================================================
// We cache descriptors by portName to avoid rebuilding for every evaluation.
// A new descriptor is built only when the policy constraint changes (detected
// by comparing the constraint object reference).

const descriptorCache = new Map<
  string,
  {
    constraint: PolicyConstraintLike;
    descriptor: GuardEvaluationDescriptor;
  }
>();

let executionCounter = 0;

function getOrBuildDescriptor(
  portName: string,
  constraint: PolicyConstraintLike
): GuardEvaluationDescriptor {
  const cached = descriptorCache.get(portName);
  if (cached && cached.constraint === constraint) {
    return cached.descriptor;
  }

  const descriptor = buildDescriptorFromConstraint(portName, constraint);
  descriptorCache.set(portName, { constraint, descriptor });
  return descriptor;
}

// =============================================================================
// Public API — createInstrumentedGuardModule
// =============================================================================

interface GuardCompleteCallback {
  (descriptor: GuardEvaluationDescriptor, execution: GuardEvaluationExecution): void;
}

interface RoleHierarchyCallback {
  (roles: readonly SerializedRole[]): void;
}

interface GuardModule {
  readonly evaluate: (...args: unknown[]) => unknown;
  readonly evaluateAsync?: (...args: unknown[]) => unknown;
  readonly evaluateBatch?: (...args: unknown[]) => unknown;
  readonly createRole: (...args: unknown[]) => unknown;
  readonly [key: string]: unknown;
}

/**
 * Creates an instrumented version of the @hex-di/guard module.
 *
 * Replaces evaluate(), evaluateBatch(), and createRole() with traced versions.
 * All other exports pass through unchanged.
 */
function createInstrumentedGuardModule(
  realModule: GuardModule,
  onEvaluation: GuardCompleteCallback,
  onRoleHierarchyUpdate: RoleHierarchyCallback
): Record<string, unknown> {
  const instrumented: Record<string, unknown> = {};

  // Pass through all exports first
  for (const key of Object.keys(realModule)) {
    instrumented[key] = realModule[key];
  }

  // Replace evaluate()
  instrumented["evaluate"] = (policy: unknown, context: unknown, options?: unknown) => {
    const result = (realModule.evaluate as (p: unknown, c: unknown, o?: unknown) => ResultLike)(
      policy,
      context,
      options
    );

    if (result.isOk()) {
      const decision = result.value as DecisionLike;
      const constraint = policy as PolicyConstraintLike;
      const ctx = context as EvaluationContextLike;

      // Use a default portName since evaluate() doesn't have one
      // We derive it from the evaluationId or use "evaluate"
      const portName = `evaluate:${decision.evaluationId}`;
      const descriptor = getOrBuildDescriptor(portName, constraint);
      const rootTrace = convertTrace(descriptor.rootNode, decision.trace);

      executionCounter += 1;
      const execution: GuardEvaluationExecution = {
        executionId: decision.evaluationId,
        descriptorId: descriptor.descriptorId,
        portName,
        subject: serializeSubject(ctx.subject),
        decision: decision.kind,
        rootTrace,
        durationMs: decision.durationMs,
        evaluatedAt: decision.evaluatedAt,
        reason: decision.kind === "deny" ? (decision.reason ?? "Denied by policy") : undefined,
        visibleFields: decision.visibleFields ? [...decision.visibleFields] : undefined,
      };

      onEvaluation(descriptor, execution);
    }

    return result;
  };

  // Replace evaluateAsync()
  if (typeof realModule.evaluateAsync === "function") {
    const realEvaluateAsync = realModule.evaluateAsync;
    instrumented["evaluateAsync"] = async (
      policy: unknown,
      context: unknown,
      resolver: unknown,
      options?: unknown
    ) => {
      const result = await (
        realEvaluateAsync as (
          p: unknown,
          c: unknown,
          r: unknown,
          o?: unknown
        ) => Promise<ResultLike>
      )(policy, context, resolver, options);

      if (result.isOk()) {
        const decision = result.value as DecisionLike;
        const constraint = policy as PolicyConstraintLike;
        const ctx = context as EvaluationContextLike;

        const portName = `evaluateAsync:${decision.evaluationId}`;
        const descriptor = getOrBuildDescriptor(portName, constraint);
        const rootTrace = convertTrace(descriptor.rootNode, decision.trace);

        executionCounter += 1;
        const execution: GuardEvaluationExecution = {
          executionId: decision.evaluationId,
          descriptorId: descriptor.descriptorId,
          portName,
          subject: serializeSubject(ctx.subject),
          decision: decision.kind,
          rootTrace,
          durationMs: decision.durationMs,
          evaluatedAt: decision.evaluatedAt,
          reason: decision.kind === "deny" ? (decision.reason ?? "Denied by policy") : undefined,
          visibleFields: decision.visibleFields ? [...decision.visibleFields] : undefined,
        };

        onEvaluation(descriptor, execution);
      }

      return result;
    };
  }

  // Replace evaluateBatch()
  if (typeof realModule.evaluateBatch === "function") {
    const realEvaluateBatch = realModule.evaluateBatch;
    instrumented["evaluateBatch"] = (policies: unknown, context: unknown, options?: unknown) => {
      // evaluateBatch calls evaluate() internally, which we already instrument.
      // However, it calls the original evaluate, not our instrumented one.
      // So we call our instrumented evaluate for each policy manually.
      const policiesMap = policies as Readonly<Record<string, PolicyConstraintLike>>;
      const result: Record<string, unknown> = {};

      for (const key of Object.keys(policiesMap)) {
        result[key] = (
          instrumented["evaluate"] as (p: unknown, c: unknown, o?: unknown) => unknown
        )(policiesMap[key], context, options);
      }

      return result;
    };
  }

  // Replace createRole()
  instrumented["createRole"] = (...args: unknown[]) => {
    const role = (realModule.createRole as (...a: unknown[]) => unknown)(...args);
    const roleLike = role as RoleConstraintLike;

    // Cache the role for hierarchy building
    capturedRoles.set(roleLike.name, roleLike);

    // Also capture inherited roles recursively
    const captureInherited = (r: RoleConstraintLike): void => {
      if (capturedRoles.has(r.name)) return;
      capturedRoles.set(r.name, r);
      for (const parent of r.inherits) {
        captureInherited(parent);
      }
    };
    for (const parent of roleLike.inherits) {
      captureInherited(parent);
    }

    // Emit updated role hierarchy
    onRoleHierarchyUpdate(serializeRoleHierarchy());

    return role;
  };

  return instrumented;
}

export { createInstrumentedGuardModule, serializeRoleHierarchy };
export type {
  GuardCompleteCallback,
  RoleHierarchyCallback,
  GuardModule,
  GuardEvaluationDescriptor,
  GuardEvaluationExecution,
  EvaluationNodeTrace,
  SerializedSubject,
  SerializedValue,
  SerializedRole,
  PolicyNodeDescriptor,
  PolicyLeafData,
  PolicyKind,
};
