import { evaluate } from "../evaluator/evaluate.js";
import { hasRole } from "../policy/combinators.js";
import type { AuthSubject } from "../subject/auth-subject.js";
import { ACL007 } from "../errors/codes.js";

/**
 * Error thrown when a role gate denies access.
 */
export class RoleGateError extends Error {
  readonly code = ACL007;

  constructor(
    readonly roleName: string,
    readonly subjectId: string,
  ) {
    super(`Subject '${subjectId}' lacks required role '${roleName}'`);
    this.name = "RoleGateError";
  }
}

/**
 * Resolution hook interface — minimal subset needed for typing.
 */
export interface RoleResolutionHook {
  beforeResolve(context: { readonly portName: string; readonly subject?: AuthSubject }): void;
}

/**
 * Creates a beforeResolve hook that enforces a single role requirement
 * on every port resolution.
 *
 * The hook checks that the subject obtained from the context has the
 * specified role before allowing the resolution to proceed.
 *
 * @example
 * ```ts
 * const hook = createRoleGate("admin");
 * // Wire into the DI container's beforeResolve hook
 * ```
 */
export function createRoleGate(roleName: string): RoleResolutionHook {
  const policy = hasRole(roleName);

  return {
    beforeResolve(context: { readonly portName: string; readonly subject?: AuthSubject }): void {
      const subject = context.subject;
      if (subject === undefined) {
        throw new RoleGateError(roleName, "<no-subject>");
      }

      const result = evaluate(policy, { subject });
      if (result.isErr()) {
        throw result.error;
      }

      if (result.value.kind === "deny") {
        throw new RoleGateError(roleName, subject.id);
      }
    },
  };
}
