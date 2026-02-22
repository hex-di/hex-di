import type { PolicyConstraint } from "../policy/constraint.js";
import type { MatcherExpression, ValueRef } from "../policy/types.js";
import { isPolicy } from "../policy/types.js";
import { formatPermission } from "../tokens/permission.js";
import { assertNever } from "@hex-di/result";

/**
 * Produces a human-readable explanation of a policy tree.
 */
export function explainPolicy(policy: PolicyConstraint, indent = 0): string {
  const prefix = "  ".repeat(indent);

  if (!isPolicy(policy)) {
    return `${prefix}unknown(${policy.kind})`;
  }

  switch (policy.kind) {
    case "hasPermission": {
      const perm = formatPermission(policy.permission);
      const fields =
        policy.fields !== undefined ? ` [fields: ${policy.fields.join(", ")}]` : "";
      return `${prefix}has permission '${perm}'${fields}`;
    }
    case "hasRole": {
      return `${prefix}has role '${policy.roleName}'`;
    }
    case "hasAttribute": {
      const fields =
        policy.fields !== undefined ? ` [fields: ${policy.fields.join(", ")}]` : "";
      return `${prefix}attribute '${policy.attribute}' matches ${explainMatcher(policy.matcher)}${fields}`;
    }
    case "hasResourceAttribute": {
      const fields =
        policy.fields !== undefined ? ` [fields: ${policy.fields.join(", ")}]` : "";
      return `${prefix}resource attribute '${policy.attribute}' matches ${explainMatcher(policy.matcher)}${fields}`;
    }
    case "hasSignature": {
      const role =
        policy.signerRole !== undefined ? ` by '${policy.signerRole}'` : "";
      return `${prefix}has valid signature with meaning '${policy.meaning}'${role}`;
    }
    case "hasRelationship": {
      const depth =
        policy.depth !== undefined ? ` (depth: ${policy.depth})` : "";
      const type =
        policy.resourceType !== undefined ? ` of type '${policy.resourceType}'` : "";
      return `${prefix}has relationship '${policy.relation}'${type}${depth}`;
    }
    case "allOf": {
      const children = policy.policies
        .map((child) => explainPolicy(child, indent + 1))
        .join("\n");
      return `${prefix}all of:\n${children}`;
    }
    case "anyOf": {
      const children = policy.policies
        .map((child) => explainPolicy(child, indent + 1))
        .join("\n");
      return `${prefix}any of:\n${children}`;
    }
    case "not": {
      return `${prefix}not:\n${explainPolicy(policy.policy, indent + 1)}`;
    }
    case "labeled": {
      return `${prefix}[${policy.label}]:\n${explainPolicy(policy.policy, indent + 1)}`;
    }
    default:
      return assertNever(policy);
  }
}

function explainMatcher(matcher: MatcherExpression): string {
  switch (matcher.kind) {
    case "eq":
      return `= ${explainRef(matcher.ref)}`;
    case "neq":
      return `\u2260 ${explainRef(matcher.ref)}`;
    case "in":
      return `in [${matcher.values.join(", ")}]`;
    case "exists":
      return "exists";
    case "fieldMatch":
      return `field '${matcher.field}' ${explainMatcher(matcher.matcher)}`;
    case "gte":
      return `\u2265 ${String(matcher.value)}`;
    case "lt":
      return `< ${String(matcher.value)}`;
    case "someMatch":
      return `some match ${explainMatcher(matcher.matcher)}`;
    case "contains":
      return `contains ${JSON.stringify(matcher.value)}`;
    case "everyMatch":
      return `every match ${explainMatcher(matcher.matcher)}`;
    case "size":
      return `size ${explainMatcher(matcher.matcher)}`;
    default:
      return assertNever(matcher);
  }
}

function explainRef(ref: ValueRef): string {
  switch (ref.kind) {
    case "subject":
      return `subject.${ref.path}`;
    case "resource":
      return `resource.${ref.path}`;
    case "literal":
      return JSON.stringify(ref.value);
    default:
      return assertNever(ref);
  }
}
