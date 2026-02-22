import { ok, err, fromThrowable } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import type { PolicyConstraint } from "../policy/constraint.js";
import type { MatcherExpression } from "../policy/types.js";
import type { PolicyDeserializationError, AuditEntryParseError } from "../errors/types.js";
import { ACL007, ACL014 } from "../errors/codes.js";
import {
  hasPermission,
  hasRole,
  hasAttribute,
  hasResourceAttribute,
  hasSignature,
  hasRelationship,
  allOf,
  anyOf,
  not,
  withLabel,
} from "../policy/combinators.js";
import { createPermission } from "../tokens/permission.js";
import type { AuditEntry } from "../guard/types.js";

const MAX_DESERIALIZE_DEPTH = 64;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isMatcherExpression(v: unknown): v is MatcherExpression {
  if (!isPlainObject(v)) return false;
  const kind = v["kind"];
  return (
    kind === "eq" ||
    kind === "neq" ||
    kind === "in" ||
    kind === "exists" ||
    kind === "fieldMatch" ||
    kind === "gte" ||
    kind === "lt" ||
    kind === "someMatch" ||
    kind === "contains" ||
    kind === "everyMatch" ||
    kind === "size"
  );
}

function isValidAuditEntry(v: unknown): v is AuditEntry {
  if (!isPlainObject(v)) return false;
  return (
    typeof v["evaluationId"] === "string" &&
    typeof v["timestamp"] === "string" &&
    typeof v["subjectId"] === "string" &&
    typeof v["authenticationMethod"] === "string" &&
    typeof v["policy"] === "string" &&
    (v["decision"] === "allow" || v["decision"] === "deny") &&
    typeof v["portName"] === "string" &&
    typeof v["scopeId"] === "string" &&
    typeof v["reason"] === "string" &&
    typeof v["durationMs"] === "number" &&
    v["schemaVersion"] === 1
  );
}

/**
 * Deserializes a JSON string into a PolicyConstraint.
 * Returns Err(PolicyDeserializationError) if the JSON is invalid.
 */
export function deserializePolicy(
  json: string,
): Result<PolicyConstraint, PolicyDeserializationError> {
  const parseResult = fromThrowable(
    (): unknown => JSON.parse(json),
    (cause): PolicyDeserializationError => Object.freeze({
      code: ACL007,
      message: `Policy deserialization failed: invalid JSON`,
      input: json,
      cause,
    }),
  );
  if (parseResult.isErr()) return err(parseResult.error);
  return parsePolicy(parseResult.value, 0);
}

function parsePolicy(
  input: unknown,
  depth: number,
): Result<PolicyConstraint, PolicyDeserializationError> {
  if (depth > MAX_DESERIALIZE_DEPTH) {
    return err(Object.freeze({
      code: ACL007,
      message: `Policy deserialization failed: exceeds maximum depth of ${MAX_DESERIALIZE_DEPTH}`,
      input,
    }));
  }

  if (!isPlainObject(input)) {
    return err(Object.freeze({
      code: ACL007,
      message: `Policy deserialization failed: expected object, got ${typeof input}`,
      input,
    }));
  }

  const obj = input;
  const kind = obj["kind"];

  if (typeof kind !== "string") {
    return err(Object.freeze({
      code: ACL007,
      message: `Policy deserialization failed: missing or invalid 'kind' field`,
      input,
    }));
  }

  switch (kind) {
    case "hasPermission": {
      const permStr = obj["permission"];
      if (typeof permStr !== "string" || !permStr.includes(":")) {
        return err(Object.freeze({
          code: ACL007,
          message: `Policy deserialization failed: hasPermission requires 'permission' as "resource:action"`,
          input,
        }));
      }
      const colonIdx = permStr.indexOf(":");
      const resource = permStr.slice(0, colonIdx);
      const action = permStr.slice(colonIdx + 1);
      const permission = createPermission({ resource, action });
      const fields = parseOptionalStringArray(obj["fields"]);
      return ok(hasPermission(permission, fields !== undefined ? { fields } : undefined));
    }
    case "hasRole": {
      const roleName = obj["roleName"];
      if (typeof roleName !== "string") {
        return err(Object.freeze({
          code: ACL007,
          message: `Policy deserialization failed: hasRole requires 'roleName' string`,
          input,
        }));
      }
      return ok(hasRole(roleName));
    }
    case "hasAttribute": {
      const attribute = obj["attribute"];
      if (typeof attribute !== "string") {
        return err(Object.freeze({
          code: ACL007,
          message: `Policy deserialization failed: hasAttribute requires 'attribute' string`,
          input,
        }));
      }
      const matcher = obj["matcher"];
      if (!isMatcherExpression(matcher)) {
        return err(Object.freeze({
          code: ACL007,
          message: `Policy deserialization failed: hasAttribute requires valid 'matcher' MatcherExpression`,
          input,
        }));
      }
      const fields = parseOptionalStringArray(obj["fields"]);
      return ok(hasAttribute(attribute, matcher, fields !== undefined ? { fields } : undefined));
    }
    case "hasResourceAttribute": {
      const attribute = obj["attribute"];
      if (typeof attribute !== "string") {
        return err(Object.freeze({
          code: ACL007,
          message: `Policy deserialization failed: hasResourceAttribute requires 'attribute' string`,
          input,
        }));
      }
      const matcher = obj["matcher"];
      if (!isMatcherExpression(matcher)) {
        return err(Object.freeze({
          code: ACL007,
          message: `Policy deserialization failed: hasResourceAttribute requires valid 'matcher' MatcherExpression`,
          input,
        }));
      }
      const fields = parseOptionalStringArray(obj["fields"]);
      return ok(hasResourceAttribute(attribute, matcher, fields !== undefined ? { fields } : undefined));
    }
    case "hasSignature": {
      const meaning = obj["meaning"];
      if (typeof meaning !== "string" || meaning.length === 0) {
        return err(Object.freeze({
          code: ACL007,
          message: `Policy deserialization failed: hasSignature requires non-empty 'meaning' string`,
          input,
        }));
      }
      const signerRole = obj["signerRole"];
      if (signerRole !== undefined && typeof signerRole !== "string") {
        return err(Object.freeze({
          code: ACL007,
          message: `Policy deserialization failed: hasSignature 'signerRole' must be a string`,
          input,
        }));
      }
      return ok(
        hasSignature(
          meaning,
          signerRole !== undefined ? { signerRole } : undefined,
        ),
      );
    }
    case "hasRelationship": {
      const relation = obj["relation"];
      if (typeof relation !== "string") {
        return err(Object.freeze({
          code: ACL007,
          message: `Policy deserialization failed: hasRelationship requires 'relation' string`,
          input,
        }));
      }
      const resourceType = typeof obj["resourceType"] === "string" ? obj["resourceType"] : undefined;
      const rawDepth = obj["depth"];
      const depth2 = typeof rawDepth === "number" ? rawDepth : undefined;
      const fields = parseOptionalStringArray(obj["fields"]);
      return ok(
        hasRelationship(relation, {
          ...(resourceType !== undefined ? { resourceType } : {}),
          ...(depth2 !== undefined ? { depth: depth2 } : {}),
          ...(fields !== undefined ? { fields } : {}),
        }),
      );
    }
    case "allOf": {
      const policies = obj["policies"];
      if (!Array.isArray(policies)) {
        return err(Object.freeze({
          code: ACL007,
          message: `Policy deserialization failed: allOf requires 'policies' array`,
          input,
        }));
      }
      const parsed: PolicyConstraint[] = [];
      for (const child of policies) {
        const result = parsePolicy(child, depth + 1);
        if (result.isErr()) return result;
        parsed.push(result.value);
      }
      return ok(allOf(...parsed));
    }
    case "anyOf": {
      const policies = obj["policies"];
      if (!Array.isArray(policies)) {
        return err(Object.freeze({
          code: ACL007,
          message: `Policy deserialization failed: anyOf requires 'policies' array`,
          input,
        }));
      }
      const parsed: PolicyConstraint[] = [];
      for (const child of policies) {
        const result = parsePolicy(child, depth + 1);
        if (result.isErr()) return result;
        parsed.push(result.value);
      }
      return ok(anyOf(...parsed));
    }
    case "not": {
      const policy = obj["policy"];
      const result = parsePolicy(policy, depth + 1);
      if (result.isErr()) return result;
      return ok(not(result.value));
    }
    case "labeled": {
      const label = obj["label"];
      if (typeof label !== "string") {
        return err(Object.freeze({
          code: ACL007,
          message: `Policy deserialization failed: labeled requires 'label' string`,
          input,
        }));
      }
      const policy = obj["policy"];
      const result = parsePolicy(policy, depth + 1);
      if (result.isErr()) return result;
      return ok(withLabel(label, result.value));
    }
    default:
      return err(Object.freeze({
        code: ACL007,
        message: `Policy deserialization failed: unknown policy kind '${kind}'`,
        input,
      }));
  }
}

function parseOptionalStringArray(value: unknown): readonly string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return undefined;
  if (!value.every((v): v is string => typeof v === "string")) return undefined;
  return value;
}

/**
 * Deserializes a JSON string into an AuditEntry.
 */
export function deserializeAuditEntry(
  json: string,
): Result<AuditEntry, AuditEntryParseError> {
  const parseResult = fromThrowable(
    (): unknown => JSON.parse(json),
    (cause): AuditEntryParseError => Object.freeze({
      code: ACL014,
      message: `Audit entry deserialization failed: invalid JSON`,
      input: json,
      cause,
    }),
  );
  if (parseResult.isErr()) return err(parseResult.error);
  const parsed = parseResult.value;

  if (!isPlainObject(parsed)) {
    return err(Object.freeze({
      code: ACL014,
      message: `Audit entry deserialization failed: expected object`,
      input: parsed,
    }));
  }

  const obj = parsed;
  const required = [
    "evaluationId",
    "timestamp",
    "subjectId",
    "authenticationMethod",
    "policy",
    "decision",
    "portName",
    "scopeId",
    "reason",
    "durationMs",
    "schemaVersion",
  ];

  for (const field of required) {
    if (obj[field] === undefined) {
      return err(Object.freeze({
        code: ACL014,
        message: `Audit entry deserialization failed: missing required field '${field}'`,
        input: parsed,
      }));
    }
  }

  const schemaVersion = obj["schemaVersion"];
  if (schemaVersion !== 1) {
    return err(Object.freeze({
      code: ACL014,
      message: `Audit entry deserialization failed: unsupported schemaVersion ${String(schemaVersion)}`,
      input: parsed,
    }));
  }

  if (!isValidAuditEntry(obj)) {
    return err(Object.freeze({
      code: ACL014,
      message: `Audit entry deserialization failed: invalid field types`,
      input: parsed,
    }));
  }

  return ok(obj);
}
