/**
 * Proxy-based chaperone that wraps resolved services to enforce port contracts at runtime.
 *
 * @packageDocumentation
 */

import type { ChaperoneConfig, ChaperoneViolation, PortContract } from "./types.js";

/** Minimal console interface for environments without DOM types. */
declare const console: undefined | { warn?: (...args: unknown[]) => void };

function emitWarning(message: string): void {
  if (typeof console !== "undefined" && typeof console.warn === "function") {
    console.warn(message);
  }
}

function handleViolation(
  config: ChaperoneConfig,
  violation: ChaperoneViolation
): never | undefined {
  if (config.onViolation) {
    config.onViolation(violation);
  }

  if (config.mode === "strict") {
    throw Object.freeze(violation);
  }

  if (config.mode === "dev" || config.mode === "warn") {
    emitWarning(`[hex-di chaperone] ${violation.message}`);
  }

  return undefined;
}

/** Type guard that narrows unknown to a callable function. */
function isCallable(value: unknown): value is (...args: Array<unknown>) => unknown {
  return typeof value === "function";
}

/**
 * Wrap a resolved service in a Proxy that validates port contracts at runtime.
 * In "off" mode, returns the service unwrapped (zero overhead).
 */
export function chaperoneService<T extends object>(
  service: T,
  contract: PortContract,
  config: ChaperoneConfig
): T {
  if (config.mode === "off") return service;

  return new Proxy(service, {
    get(target, prop, receiver) {
      const value: unknown = Reflect.get(target, prop, receiver);

      if (typeof prop === "string" && contract.members.includes(prop)) {
        // Verify the member exists and is callable
        if (!isCallable(value)) {
          const violation: ChaperoneViolation = Object.freeze({
            _tag: "ChaperoneViolation" as const,
            portName: contract.portName,
            member: prop,
            kind: "missing-method" as const,
            message: `Port '${contract.portName}' expects '${prop}' to be a method, got ${typeof value}`,
          });

          return handleViolation(config, violation);
        }

        // Wrap method to validate return values in strict/dev mode
        if (config.mode === "strict" || config.mode === "dev") {
          const fn = value;
          return function wrappedMethod(this: unknown, ...args: Array<unknown>): unknown {
            return fn.apply(target, args);
          };
        }
      }

      return value;
    },
  });
}

/**
 * Create a PortContract from a port name and its expected method names.
 */
export function createPortContract(portName: string, methods: ReadonlyArray<string>): PortContract {
  return Object.freeze({
    portName,
    members: methods,
  });
}
