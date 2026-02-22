import { assertNever } from "@hex-di/result";
import type { PolicyEvaluationError } from "../errors/types.js";
import { ACL003 } from "../errors/codes.js";
import type { PolicyConstraint } from "../policy/constraint.js";
import { isPolicy } from "../policy/types.js";

/**
 * Creates a PolicyEvaluationError.
 */
export function createPolicyEvaluationError(
  policy: PolicyConstraint,
  cause: unknown,
): PolicyEvaluationError {
  return Object.freeze({
    code: ACL003,
    message: `Policy evaluation failed for '${describePolicyKind(policy)}'`,
    policy: describePolicyKind(policy),
    cause,
  });
}

function describePolicyKind(policy: PolicyConstraint): string {
  if (!isPolicy(policy)) return policy.kind;
  switch (policy.kind) {
    case "hasPermission":
      return `hasPermission(${policy.permission.resource}:${policy.permission.action})`;
    case "hasRole":
      return `hasRole(${policy.roleName})`;
    case "hasAttribute":
      return `hasAttribute(${policy.attribute})`;
    case "hasResourceAttribute":
      return `hasResourceAttribute(${policy.attribute})`;
    case "hasSignature":
      return `hasSignature(${policy.meaning})`;
    case "hasRelationship":
      return `hasRelationship(${policy.relation})`;
    case "allOf":
      return "allOf";
    case "anyOf":
      return "anyOf";
    case "not":
      return "not";
    case "labeled":
      return `labeled(${policy.label})`;
    default:
      return assertNever(policy);
  }
}
