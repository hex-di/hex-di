import type { PermissionConstraint } from "../tokens/permission.js";

/**
 * Discriminant tag for all policy types.
 */
export type PolicyKind =
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

/**
 * Structural constraint matching any Policy.
 */
export interface PolicyConstraint {
  readonly kind: PolicyKind;
}

export type { PermissionConstraint };

function isPlainRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/**
 * Type guard: returns true if the value is a PolicyConstraint (i.e. an object with a valid kind).
 */
export function isPolicyConstraint(v: unknown): v is PolicyConstraint {
  if (!isPlainRecord(v)) return false;
  const kind = v["kind"];
  return (
    kind === "hasPermission" ||
    kind === "hasRole" ||
    kind === "hasAttribute" ||
    kind === "hasResourceAttribute" ||
    kind === "hasSignature" ||
    kind === "hasRelationship" ||
    kind === "allOf" ||
    kind === "anyOf" ||
    kind === "not" ||
    kind === "labeled"
  );
}
