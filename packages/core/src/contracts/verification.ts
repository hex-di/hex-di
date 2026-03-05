/**
 * Runtime behavioral verification via Proxy interception.
 *
 * When runtime verification is enabled, resolved services are wrapped in a
 * Proxy that intercepts method calls to check preconditions, postconditions,
 * and invariants. The proxy is transparent to the consumer.
 *
 * @see {@link https://hex-di.dev/spec/core/behaviors/13-behavioral-port-specs | BEH-CO-13-003}
 *
 * @packageDocumentation
 */

import { ContainerError } from "../errors/base.js";
import type {
  BehavioralPortSpec,
  MethodContract,
  NamedCondition,
  StatefulPortSpec,
  VerificationConfig,
  VerificationViolation,
} from "./behavioral.js";

// Declare console for environments without DOM lib
declare const console:
  | undefined
  | {
      warn?: (...args: unknown[]) => void;
      log?: (...args: unknown[]) => void;
    };

// =============================================================================
// Violation Error Classes
// =============================================================================

/**
 * Error thrown when a precondition is violated.
 */
export class PreconditionViolationError extends ContainerError {
  readonly _tag = "PreconditionViolation" as const;
  readonly code = "PRECONDITION_VIOLATION" as const;
  readonly isProgrammingError = true as const;
  readonly violation: VerificationViolation;

  constructor(violation: VerificationViolation) {
    super(
      `Precondition '${violation.contractName}' failed on ${violation.portName}.${violation.methodName}: ${violation.message}`
    );
    this.violation = Object.freeze(violation);
    Object.freeze(this);
  }
}

/**
 * Error thrown when a postcondition is violated.
 */
export class PostconditionViolationError extends ContainerError {
  readonly _tag = "PostconditionViolation" as const;
  readonly code = "POSTCONDITION_VIOLATION" as const;
  readonly isProgrammingError = true as const;
  readonly violation: VerificationViolation;

  constructor(violation: VerificationViolation) {
    super(
      `Postcondition '${violation.contractName}' failed on ${violation.portName}.${violation.methodName}: ${violation.message}`
    );
    this.violation = Object.freeze(violation);
    Object.freeze(this);
  }
}

/**
 * Error thrown when an invariant is violated.
 */
export class InvariantViolationError extends ContainerError {
  readonly _tag = "InvariantViolation" as const;
  readonly code = "INVARIANT_VIOLATION" as const;
  readonly isProgrammingError = true as const;
  readonly violation: VerificationViolation;
  readonly checkedAt: "pre-method" | "post-method";

  constructor(violation: VerificationViolation, checkedAt: "pre-method" | "post-method") {
    super(
      `Invariant '${violation.contractName}' failed ${checkedAt === "pre-method" ? "before" : "after"} ${violation.portName}.${violation.methodName}: ${violation.message}`
    );
    this.violation = Object.freeze(violation);
    this.checkedAt = checkedAt;
    Object.freeze(this);
  }
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Checks whether a `BehavioralPortSpec` includes invariants (i.e., is a `StatefulPortSpec`).
 */
function isStatefulSpec<T>(spec: BehavioralPortSpec<T>): spec is StatefulPortSpec<T> {
  return "invariants" in spec && Array.isArray((spec as Record<string, unknown>)["invariants"]);
}

// =============================================================================
// Violation Handling
// =============================================================================

/**
 * Handles a verification violation according to the configured `onViolation` mode.
 *
 * - `"error"` — throws the appropriate error
 * - `"warn"` — logs a warning via `console.warn`
 * - `"log"` — logs via `console.log`
 */
function handleViolation(
  violation: VerificationViolation,
  onViolation: "error" | "warn" | "log",
  checkedAt?: "pre-method" | "post-method"
): void {
  const formattedMessage = `[${violation._tag}] ${violation.contractName} on ${violation.portName}.${violation.methodName}: ${violation.message}`;

  switch (onViolation) {
    case "error": {
      switch (violation._tag) {
        case "PreconditionViolation":
          throw new PreconditionViolationError(violation);
        case "PostconditionViolation":
          throw new PostconditionViolationError(violation);
        case "InvariantViolation":
          throw new InvariantViolationError(violation, checkedAt ?? "post-method");
      }
      break;
    }
    case "warn":
      if (typeof console !== "undefined" && typeof console.warn === "function") {
        console.warn(formattedMessage);
      }
      break;
    case "log":
      if (typeof console !== "undefined" && typeof console.log === "function") {
        console.log(formattedMessage);
      }
      break;
  }
}

// =============================================================================
// Condition Checking Helpers
// =============================================================================

/**
 * Checks a list of conditions against a value.
 *
 * @returns The first failing condition's violation, or `undefined` if all pass
 */
function checkConditions<T>(
  conditions: ReadonlyArray<NamedCondition<T>>,
  value: T,
  tag: VerificationViolation["_tag"],
  portName: string,
  methodName: string
): VerificationViolation | undefined {
  for (const condition of conditions) {
    if (!condition.check(value)) {
      return Object.freeze({
        _tag: tag,
        contractName: condition.name,
        message: condition.message,
        portName,
        methodName,
      });
    }
  }
  return undefined;
}

// =============================================================================
// shouldCheck Helper
// =============================================================================

/**
 * Determines whether a particular check category should run given the mode.
 */
function shouldCheck(
  mode: "all" | "preconditions" | "postconditions" | "invariants",
  category: "preconditions" | "postconditions" | "invariants"
): boolean {
  return mode === "all" || mode === category;
}

// =============================================================================
// wrapWithVerification
// =============================================================================

/**
 * Wraps a service instance in a Proxy that intercepts method calls to check
 * preconditions, postconditions, and invariants.
 *
 * The proxy is transparent: non-function properties pass through without
 * interception. Only function properties listed in the behavioral spec are
 * wrapped with verification logic.
 *
 * Algorithm:
 * 1. The Proxy's `get` trap intercepts property access
 * 2. For function properties with a matching method contract:
 *    a. Check all invariants on the current service state (pre-call)
 *    b. Check all preconditions for this method against the arguments
 *    c. Invoke the original method
 *    d. For async methods (Promise return), `await` the result before continuing
 *    e. Check all postconditions for this method against the return value
 *    f. Check all invariants on the service state (post-call)
 *    g. If any check fails, handle per `onViolation` config
 *    h. Return the original method's return value
 * 3. For non-function properties, pass through without interception
 *
 * @typeParam T - The service interface type (must be an object)
 * @param instance - The real service instance
 * @param spec - The behavioral/stateful port spec with contracts and invariants
 * @param portName - The port name (used in violation messages)
 * @param config - Verification configuration (mode, onViolation)
 * @returns A Proxy wrapping the instance
 */
export function wrapWithVerification<T extends object>(
  instance: T,
  spec: BehavioralPortSpec<T>,
  portName: string,
  config?: VerificationConfig
): T {
  const onViolation = config?.onViolation ?? "error";
  const mode = config?.verificationMode ?? "all";
  const invariants = isStatefulSpec(spec) ? spec.invariants : [];
  const methods = spec.methods;

  return new Proxy(instance, {
    get(target, prop, receiver): unknown {
      const value = Reflect.get(target, prop, receiver);

      // Only intercept function properties that have a method contract
      if (typeof value !== "function" || typeof prop !== "string") {
        return value;
      }

      const contract = (
        methods as Record<string, MethodContract<readonly unknown[], unknown> | undefined>
      )[prop];
      if (contract === undefined) {
        return value;
      }

      // Return a wrapper function that performs verification
      return function wrappedMethod(this: unknown, ...args: unknown[]): unknown {
        const methodName = prop;

        // 1. Pre-call invariant checks
        if (shouldCheck(mode, "invariants") && invariants.length > 0) {
          for (const inv of invariants) {
            if (!inv.check(target as T)) {
              const violation: VerificationViolation = Object.freeze({
                _tag: "InvariantViolation" as const,
                contractName: inv.name,
                message: inv.message,
                portName,
                methodName,
              });
              handleViolation(violation, onViolation, "pre-method");
            }
          }
        }

        // 2. Precondition checks
        if (shouldCheck(mode, "preconditions") && contract.preconditions.length > 0) {
          const violation = checkConditions(
            contract.preconditions,
            args as readonly unknown[],
            "PreconditionViolation",
            portName,
            methodName
          );
          if (violation !== undefined) {
            handleViolation(violation, onViolation);
          }
        }

        // 3. Invoke the original method
        const result: unknown = Reflect.apply(value as (...a: unknown[]) => unknown, target, args);

        // 4. Check if result is a Promise (async method)
        if (
          result !== null &&
          result !== undefined &&
          typeof (result as Record<string, unknown>)["then"] === "function"
        ) {
          // Async: await the result, then check postconditions and post-invariants
          return (result as Promise<unknown>).then((resolved: unknown) => {
            // 5. Postcondition checks on resolved value
            if (shouldCheck(mode, "postconditions") && contract.postconditions.length > 0) {
              const violation = checkConditions(
                contract.postconditions,
                resolved,
                "PostconditionViolation",
                portName,
                methodName
              );
              if (violation !== undefined) {
                handleViolation(violation, onViolation);
              }
            }

            // 6. Post-call invariant checks
            if (shouldCheck(mode, "invariants") && invariants.length > 0) {
              for (const inv of invariants) {
                if (!inv.check(target as T)) {
                  const violation: VerificationViolation = Object.freeze({
                    _tag: "InvariantViolation" as const,
                    contractName: inv.name,
                    message: inv.message,
                    portName,
                    methodName,
                  });
                  handleViolation(violation, onViolation, "post-method");
                }
              }
            }

            return resolved;
          });
        }

        // Sync path: check postconditions and post-invariants immediately

        // 5. Postcondition checks
        if (shouldCheck(mode, "postconditions") && contract.postconditions.length > 0) {
          const violation = checkConditions(
            contract.postconditions,
            result,
            "PostconditionViolation",
            portName,
            methodName
          );
          if (violation !== undefined) {
            handleViolation(violation, onViolation);
          }
        }

        // 6. Post-call invariant checks
        if (shouldCheck(mode, "invariants") && invariants.length > 0) {
          for (const inv of invariants) {
            if (!inv.check(target as T)) {
              const violation: VerificationViolation = Object.freeze({
                _tag: "InvariantViolation" as const,
                contractName: inv.name,
                message: inv.message,
                portName,
                methodName,
              });
              handleViolation(violation, onViolation, "post-method");
            }
          }
        }

        return result;
      };
    },
  });
}
