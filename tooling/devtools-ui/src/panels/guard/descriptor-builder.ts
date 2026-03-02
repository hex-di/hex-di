/**
 * Descriptor builder for the Guard Panel.
 *
 * Transforms PolicyConstraint trees from @hex-di/guard into
 * GuardEvaluationDescriptor structures for visualization.
 *
 * Spec: 02-instrumentation.md Section 2.3
 *
 * @packageDocumentation
 */

import type { PolicyConstraint, PolicyKind } from "@hex-di/guard";
import { isPolicy } from "@hex-di/guard";
import type { GuardEvaluationDescriptor, PolicyLeafData, PolicyNodeDescriptor } from "./types.js";

// ── Descriptor Builder ──────────────────────────────────────────────────────

/** Mutable counter for depth-first node ID assignment. */
interface WalkState {
  nextId: number;
  policyKinds: Set<PolicyKind>;
  leafCount: number;
  maxDepth: number;
  hasAsyncPolicies: boolean;
}

/**
 * Build a GuardEvaluationDescriptor from a port name and PolicyConstraint.
 *
 * Walks the constraint tree depth-first, assigning stable node IDs,
 * and computing aggregate metrics.
 */
export function buildDescriptor(
  portName: string,
  constraint: PolicyConstraint,
  sourceLocation?: string
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
    sourceLocation,
  };
}

function walkConstraint(
  constraint: PolicyConstraint,
  depth: number,
  state: WalkState
): PolicyNodeDescriptor {
  const nodeId = `node-${state.nextId}`;
  state.nextId += 1;
  state.policyKinds.add(constraint.kind);

  if (depth > state.maxDepth) {
    state.maxDepth = depth;
  }

  if (!isPolicy(constraint)) {
    // Unknown policy kind — treat as leaf
    state.leafCount += 1;
    return {
      nodeId,
      kind: constraint.kind,
      label: undefined,
      children: [],
      leafData: undefined,
      depth,
      fieldStrategy: undefined,
    };
  }

  switch (constraint.kind) {
    case "allOf": {
      const children = constraint.policies.map(p => walkConstraint(p, depth + 1, state));
      return {
        nodeId,
        kind: "allOf",
        label: undefined,
        children,
        leafData: undefined,
        depth,
        fieldStrategy: constraint.fieldStrategy ?? "intersection",
      };
    }

    case "anyOf": {
      const children = constraint.policies.map(p => walkConstraint(p, depth + 1, state));
      return {
        nodeId,
        kind: "anyOf",
        label: undefined,
        children,
        leafData: undefined,
        depth,
        fieldStrategy: constraint.fieldStrategy ?? "first",
      };
    }

    case "not": {
      const child = walkConstraint(constraint.policy, depth + 1, state);
      return {
        nodeId,
        kind: "not",
        label: undefined,
        children: [child],
        leafData: undefined,
        depth,
        fieldStrategy: undefined,
      };
    }

    case "labeled": {
      const child = walkConstraint(constraint.policy, depth + 1, state);
      return {
        nodeId,
        kind: "labeled",
        label: constraint.label,
        children: [child],
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
        leafData: {
          type: "hasPermission",
          resource: constraint.permission.resource,
          action: constraint.permission.action,
        },
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
        leafData: { type: "hasRole", roleName: constraint.roleName },
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
        leafData: {
          type: "hasAttribute",
          attribute: constraint.attribute,
          matcher: describeMatcher(constraint.matcher),
        },
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
        leafData: {
          type: "hasResourceAttribute",
          attribute: constraint.attribute,
          matcher: describeMatcher(constraint.matcher),
        },
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
        leafData: { type: "hasSignature", meaning: constraint.meaning },
        depth,
        fieldStrategy: undefined,
      };
    }

    case "hasRelationship": {
      state.leafCount += 1;
      // Relationship resolvers may be async
      state.hasAsyncPolicies = true;
      return {
        nodeId,
        kind: "hasRelationship",
        label: undefined,
        children: [],
        leafData: { type: "hasRelationship", relation: constraint.relation },
        depth,
        fieldStrategy: undefined,
      };
    }
  }
}

// ── Matcher Description ──────────────────────────────────────────────────────

function describeMatcher(matcher: { readonly kind: string }): string {
  return matcher.kind;
}

/**
 * Extract leaf data from a PolicyConstraint (for external use).
 */
export function extractLeafData(constraint: PolicyConstraint): PolicyLeafData | undefined {
  if (!isPolicy(constraint)) return undefined;

  switch (constraint.kind) {
    case "hasPermission":
      return {
        type: "hasPermission",
        resource: constraint.permission.resource,
        action: constraint.permission.action,
      };
    case "hasRole":
      return { type: "hasRole", roleName: constraint.roleName };
    case "hasAttribute":
      return {
        type: "hasAttribute",
        attribute: constraint.attribute,
        matcher: describeMatcher(constraint.matcher),
      };
    case "hasResourceAttribute":
      return {
        type: "hasResourceAttribute",
        attribute: constraint.attribute,
        matcher: describeMatcher(constraint.matcher),
      };
    case "hasSignature":
      return { type: "hasSignature", meaning: constraint.meaning };
    case "hasRelationship":
      return { type: "hasRelationship", relation: constraint.relation };
    default:
      return undefined;
  }
}
