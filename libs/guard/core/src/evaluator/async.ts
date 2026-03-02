import { ok, err } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import type { PolicyConstraint } from "../policy/constraint.js";
import type { Policy } from "../policy/types.js";
import { isPolicy } from "../policy/types.js";
import type { EvaluationContext, EvaluateOptions } from "./evaluate.js";
import type { Decision } from "./decision.js";
import type { PolicyEvaluationError } from "../errors/types.js";
import type { AttributeResolveTimeoutError, AttributeResolveError } from "../errors/types.js";
import { evaluate } from "./evaluate.js";
import { ACL018, ACL026 } from "../errors/codes.js";

/**
 * Interface for resolving subject or resource attributes asynchronously.
 * Used with evaluateAsync() to support dynamic attribute lookups.
 */
export interface AttributeResolver {
  /**
   * Resolves the value of an attribute for a given subject.
   * @param subjectId - The subject identifier
   * @param attribute - The attribute name to resolve
   * @param resource - Optional resource context for resource-scoped attributes
   */
  resolve(
    subjectId: string,
    attribute: string,
    resource?: Readonly<Record<string, unknown>>
  ): Promise<unknown>;
}

/**
 * Options for async evaluation.
 */
export interface AsyncEvaluateOptions extends EvaluateOptions {
  /** Timeout in milliseconds for attribute resolution. Default: 5000ms. */
  readonly resolverTimeoutMs?: number;
  /** Maximum number of concurrent attribute resolutions. Default: 10. */
  readonly maxConcurrentResolutions?: number;
}

/**
 * Error union for async evaluation failures.
 */
export type AsyncEvaluationError =
  | PolicyEvaluationError
  | AttributeResolveTimeoutError
  | AttributeResolveError;

/**
 * Extracts all attribute names referenced in a policy tree.
 */
function collectAttributeNames(policy: PolicyConstraint): Set<string> {
  const attrs = new Set<string>();

  function walk(p: Policy): void {
    switch (p.kind) {
      case "hasAttribute":
        attrs.add(p.attribute);
        break;
      case "hasResourceAttribute":
        attrs.add(`resource:${p.attribute}`);
        break;
      case "allOf":
      case "anyOf":
        for (const child of p.policies) {
          if (isPolicy(child)) walk(child);
        }
        break;
      case "not":
        if (isPolicy(p.policy)) walk(p.policy);
        break;
      case "labeled":
        if (isPolicy(p.policy)) walk(p.policy);
        break;
      default:
        break;
    }
  }

  if (isPolicy(policy)) {
    walk(policy);
  }
  return attrs;
}

/**
 * Resolves an attribute with a timeout.
 */
async function resolveWithTimeout(
  resolver: AttributeResolver,
  subjectId: string,
  attribute: string,
  resource: Readonly<Record<string, unknown>> | undefined,
  timeoutMs: number
): Promise<Result<unknown, AttributeResolveTimeoutError | AttributeResolveError>> {
  const timeoutPromise = new Promise<Result<unknown, AttributeResolveTimeoutError>>(resolve => {
    const timer = setTimeout(() => {
      resolve(
        err(
          Object.freeze({
            code: ACL026,
            message: `Attribute resolution timed out after ${timeoutMs}ms for '${attribute}'`,
            attribute,
            timeoutMs,
          })
        )
      );
    }, timeoutMs);
    // Prevent timer from blocking process exit (Node.js)
    if (typeof timer === "object" && typeof timer.unref === "function") timer.unref();
  });

  const resolvePromise: Promise<Result<unknown, AttributeResolveError>> = resolver
    .resolve(subjectId, attribute, resource)
    .then(
      (value): Result<unknown, AttributeResolveError> => ok(value),
      (cause: unknown): Result<unknown, AttributeResolveError> =>
        err(
          Object.freeze({
            code: ACL018,
            message: `Attribute resolution failed for '${attribute}': ${cause instanceof Error ? cause.message : String(cause)}`,
            attribute,
            cause,
          })
        )
    );

  return Promise.race([resolvePromise, timeoutPromise]);
}

/**
 * Evaluates an authorization policy asynchronously, resolving dynamic attributes
 * via the provided AttributeResolver before calling the synchronous evaluate().
 *
 * - `evaluatedAt` is captured BEFORE async resolution begins (GxP requirement)
 * - Resolved attributes are merged into the subject's attributes for the evaluation
 * - Short-circuit preservation: the resolver is invoked for all attributes found
 *   in the policy tree, then synchronous evaluate() handles the rest
 */
export async function evaluateAsync(
  policy: PolicyConstraint,
  context: EvaluationContext,
  resolver: AttributeResolver,
  options?: AsyncEvaluateOptions
): Promise<Result<Decision, AsyncEvaluationError>> {
  // Capture evaluatedAt BEFORE any async resolution (GxP requirement)
  const evaluatedAt = context.evaluatedAt ?? new Date().toISOString();
  const timeoutMs = options?.resolverTimeoutMs ?? 5000;

  // Collect all attribute names referenced in the policy
  const attrNames = collectAttributeNames(policy);
  const subjectAttrs = attrNames;

  // Separate subject and resource attributes
  const resolverCalls: Array<{
    attribute: string;
    isResource: boolean;
  }> = [];

  for (const attr of subjectAttrs) {
    if (attr.startsWith("resource:")) {
      resolverCalls.push({ attribute: attr.slice("resource:".length), isResource: true });
    } else if (!(attr in (context.subject.attributes ?? {}))) {
      // Skip attributes already present in subject.attributes — resolver must not overwrite them
      resolverCalls.push({ attribute: attr, isResource: false });
    }
  }

  // Resolve all attributes concurrently (respecting maxConcurrentResolutions)
  const maxConcurrent = options?.maxConcurrentResolutions ?? 10;
  const resolvedSubjectAttrs: Record<string, unknown> = {};
  const resolvedResourceAttrs: Record<string, unknown> = {};

  // Process in batches
  for (let i = 0; i < resolverCalls.length; i += maxConcurrent) {
    const batch = resolverCalls.slice(i, i + maxConcurrent);
    const results = await Promise.all(
      batch.map(({ attribute, isResource }) =>
        resolveWithTimeout(
          resolver,
          context.subject.id,
          attribute,
          context.resource,
          timeoutMs
        ).then(r => ({ attribute, isResource, result: r }))
      )
    );

    for (const { attribute, isResource, result } of results) {
      if (result.isErr()) {
        return err(result.error);
      }
      if (isResource) {
        resolvedResourceAttrs[attribute] = result.value;
      } else {
        resolvedSubjectAttrs[attribute] = result.value;
      }
    }
  }

  // Merge resolved attributes into context
  const mergedSubject = {
    ...context.subject,
    attributes: {
      ...context.subject.attributes,
      ...resolvedSubjectAttrs,
    },
  };

  const mergedResource =
    Object.keys(resolvedResourceAttrs).length > 0
      ? { ...(context.resource ?? {}), ...resolvedResourceAttrs }
      : context.resource;

  const mergedContext: EvaluationContext = {
    ...context,
    subject: mergedSubject,
    resource: mergedResource,
    evaluatedAt,
  };

  return evaluate(policy, mergedContext, options);
}
