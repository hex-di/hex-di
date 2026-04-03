/**
 * Build GuardEvaluationDescriptor trees from policy constraints.
 *
 * @internal
 */

import type {
  GuardEvaluationDescriptor,
  PolicyConstraintLike,
  PolicyKind,
  PolicyNodeDescriptor,
} from "./types.js";

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

export function buildDescriptorFromConstraint(
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

// ---------------------------------------------------------------------------
// Composite node builders (allOf, anyOf, not, labeled)
// ---------------------------------------------------------------------------

function buildCompositeNode(
  kind: "allOf" | "anyOf",
  nodeId: string,
  constraint: PolicyConstraintLike,
  depth: number,
  state: WalkState,
  defaultStrategy: "intersection" | "first"
): PolicyNodeDescriptor {
  const children = (constraint.policies ?? []).map(p => walkConstraint(p, depth + 1, state));
  return {
    nodeId,
    kind,
    label: undefined,
    children,
    leafData: undefined,
    depth,
    fieldStrategy:
      (constraint.fieldStrategy as "intersection" | "union" | "first") ?? defaultStrategy,
  };
}

function buildUnaryNode(
  kind: "not" | "labeled",
  nodeId: string,
  constraint: PolicyConstraintLike,
  depth: number,
  state: WalkState
): PolicyNodeDescriptor {
  const child = constraint.policy ? walkConstraint(constraint.policy, depth + 1, state) : undefined;
  return {
    nodeId,
    kind,
    label: kind === "labeled" ? constraint.label : undefined,
    children: child ? [child] : [],
    leafData: undefined,
    depth,
    fieldStrategy: undefined,
  };
}

// ---------------------------------------------------------------------------
// Leaf node builders
// ---------------------------------------------------------------------------

function buildLeafNode(
  kind: PolicyKind,
  nodeId: string,
  constraint: PolicyConstraintLike,
  depth: number,
  state: WalkState
): PolicyNodeDescriptor {
  state.leafCount += 1;
  if (kind === "hasRelationship") {
    state.hasAsyncPolicies = true;
  }
  return {
    nodeId,
    kind,
    label: undefined,
    children: [],
    leafData: resolveLeafData(kind, constraint),
    depth,
    fieldStrategy: undefined,
  };
}

function resolveAttributeLeaf(
  kind: "hasAttribute" | "hasResourceAttribute",
  constraint: PolicyConstraintLike
): PolicyNodeDescriptor["leafData"] {
  if (!constraint.attribute) return undefined;
  return {
    type: kind,
    attribute: constraint.attribute,
    matcher: constraint.matcher?.kind ?? "unknown",
  };
}

function resolveLeafData(
  kind: PolicyKind,
  constraint: PolicyConstraintLike
): PolicyNodeDescriptor["leafData"] {
  switch (kind) {
    case "hasPermission":
      return constraint.permission
        ? {
            type: "hasPermission",
            resource: constraint.permission.resource,
            action: constraint.permission.action,
          }
        : undefined;
    case "hasRole":
      return constraint.roleName ? { type: "hasRole", roleName: constraint.roleName } : undefined;
    case "hasAttribute":
    case "hasResourceAttribute":
      return resolveAttributeLeaf(kind, constraint);
    case "hasSignature":
      return constraint.meaning ? { type: "hasSignature", meaning: constraint.meaning } : undefined;
    case "hasRelationship":
      return constraint.relation
        ? { type: "hasRelationship", relation: constraint.relation }
        : undefined;
    default:
      return undefined;
  }
}

// ---------------------------------------------------------------------------
// Walk
// ---------------------------------------------------------------------------

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
    case "allOf":
      return buildCompositeNode("allOf", nodeId, constraint, depth, state, "intersection");
    case "anyOf":
      return buildCompositeNode("anyOf", nodeId, constraint, depth, state, "first");
    case "not":
    case "labeled":
      return buildUnaryNode(kind, nodeId, constraint, depth, state);
    default:
      return buildLeafNode(kind, nodeId, constraint, depth, state);
  }
}
