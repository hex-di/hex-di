/**
 * Error Parsing Utilities.
 *
 * This module provides runtime utilities for parsing and categorizing
 * HexDI error messages.
 *
 * @packageDocumentation
 */

import { ErrorCode } from "./codes.js";
import type { ParsedError, DepthLimitExceededDetails } from "./types.js";

/**
 * Checks if a string is a HexDI error or warning message.
 *
 * @param message - The string to check
 * @returns `true` if the message starts with "ERROR[HEX", "WARNING[HEX", or "Multiple validation errors:"
 *
 * @example
 * ```typescript
 * if (isHexError(result)) {
 *   console.error('Validation failed:', result);
 * }
 * ```
 */
export function isHexError(message: string): boolean {
  return (
    message.startsWith("ERROR[HEX") ||
    message.startsWith("WARNING[HEX") ||
    message.startsWith("Multiple validation errors:")
  );
}

/**
 * Parses a HexDI error message into structured information.
 *
 * @param message - The error message to parse
 * @returns Parsed error info, or `undefined` if not a valid HexDI error
 *
 * @example
 * ```typescript
 * const error = "ERROR[HEX001]: Duplicate adapter for 'Logger'. Fix: ...";
 * const parsed = parseError(error);
 * // { code: 'DUPLICATE_ADAPTER', message: error, details: { portName: 'Logger' } }
 * ```
 */
export function parseError(message: string): ParsedError | undefined {
  if (!isHexError(message)) {
    return undefined;
  }

  // Multiple errors
  if (message.startsWith("Multiple validation errors:")) {
    const errorCodeMatches = message.matchAll(/ERROR\[HEX(\d{3})\]/g);
    const errorCodes = Array.from(errorCodeMatches, m => `HEX${m[1]}`);
    return {
      code: ErrorCode.MULTIPLE_ERRORS,
      message,
      details: {
        errorCount: String(errorCodes.length),
        errorCodes: errorCodes.join(","),
      },
    };
  }

  // Duplicate adapter (HEX001)
  const duplicateMatch = message.match(
    /ERROR\[HEX001\]: Duplicate adapter for '(?<portName>[^']+)'/
  );
  if (duplicateMatch?.groups) {
    return {
      code: ErrorCode.DUPLICATE_ADAPTER,
      message,
      details: { portName: duplicateMatch.groups.portName },
    };
  }

  // Circular dependency (HEX002) - type-level format
  const circularMatch = message.match(
    /ERROR\[HEX002\]: Circular dependency: (?<cyclePath>.+?)\. Fix:/
  );
  if (circularMatch?.groups) {
    return {
      code: ErrorCode.CIRCULAR_DEPENDENCY,
      message,
      details: { cyclePath: circularMatch.groups.cyclePath },
    };
  }

  // Circular dependency (HEX002) - runtime format
  const circularRuntimeMatch = message.match(
    /ERROR\[HEX002\]: Circular dependency detected at runtime(?: \(depth exceeded type-level limit\))?: (?<cyclePath>.+)/
  );
  if (circularRuntimeMatch?.groups) {
    return {
      code: ErrorCode.CIRCULAR_DEPENDENCY,
      message,
      details: { cyclePath: circularRuntimeMatch.groups.cyclePath },
    };
  }

  // Circular dependency (HEX002) - simple runtime format
  if (message.match(/ERROR\[HEX002\]: Circular dependency detected at runtime/)) {
    return {
      code: ErrorCode.CIRCULAR_DEPENDENCY,
      message,
      details: {},
    };
  }

  // Captive dependency (HEX003) - type-level format
  const captiveMatch = message.match(
    /ERROR\[HEX003\]: Captive dependency: (?<dependentLifetime>\w+) '(?<dependentName>[^']+)' cannot depend on (?<captiveLifetime>\w+) '(?<captiveName>[^']+)'/
  );
  if (captiveMatch?.groups) {
    return {
      code: ErrorCode.CAPTIVE_DEPENDENCY,
      message,
      details: {
        dependentLifetime: captiveMatch.groups.dependentLifetime,
        dependentName: captiveMatch.groups.dependentName,
        captiveLifetime: captiveMatch.groups.captiveLifetime,
        captiveName: captiveMatch.groups.captiveName,
      },
    };
  }

  // Captive dependency (HEX003) - runtime format
  const captiveRuntimeMatch = message.match(
    /ERROR\[HEX003\]: Captive dependency detected at runtime: (?<dependentLifetime>\w+) '(?<dependentName>[^']+)' cannot depend on (?<captiveLifetime>\w+) '(?<captiveName>[^']+)'/
  );
  if (captiveRuntimeMatch?.groups) {
    return {
      code: ErrorCode.CAPTIVE_DEPENDENCY,
      message,
      details: {
        dependentLifetime: captiveRuntimeMatch.groups.dependentLifetime,
        dependentName: captiveRuntimeMatch.groups.dependentName,
        captiveLifetime: captiveRuntimeMatch.groups.captiveLifetime,
        captiveName: captiveRuntimeMatch.groups.captiveName,
      },
    };
  }

  // Captive dependency (HEX003) - simple runtime format
  if (message.match(/ERROR\[HEX003\]: Captive dependency detected at runtime/)) {
    return {
      code: ErrorCode.CAPTIVE_DEPENDENCY,
      message,
      details: {},
    };
  }

  // Reverse captive dependency (HEX004)
  const reverseCaptiveMatch = message.match(
    /ERROR\[HEX004\]: Reverse captive dependency: Existing (?<existingLifetime>\w+) '(?<existingName>[^']+)' would capture new (?<newLifetime>\w+) '(?<newName>[^']+)'/
  );
  if (reverseCaptiveMatch?.groups) {
    return {
      code: ErrorCode.REVERSE_CAPTIVE_DEPENDENCY,
      message,
      details: {
        existingLifetime: reverseCaptiveMatch.groups.existingLifetime,
        existingName: reverseCaptiveMatch.groups.existingName,
        newLifetime: reverseCaptiveMatch.groups.newLifetime,
        newName: reverseCaptiveMatch.groups.newName,
      },
    };
  }

  // Lifetime inconsistency (HEX005)
  const lifetimeMatch = message.match(
    /ERROR\[HEX005\]: Lifetime inconsistency for '(?<portName>[^']+)': Graph A provides (?<lifetimeA>\w+), Graph B provides (?<lifetimeB>\w+)/
  );
  if (lifetimeMatch?.groups) {
    return {
      code: ErrorCode.LIFETIME_INCONSISTENCY,
      message,
      details: {
        portName: lifetimeMatch.groups.portName,
        lifetimeA: lifetimeMatch.groups.lifetimeA,
        lifetimeB: lifetimeMatch.groups.lifetimeB,
      },
    };
  }

  // Self-dependency (HEX006)
  const selfDepMatch = message.match(
    /ERROR\[HEX006\]: Self-dependency detected\. Adapter for '(?<portName>[^']+)'/
  );
  if (selfDepMatch?.groups) {
    return {
      code: ErrorCode.SELF_DEPENDENCY,
      message,
      details: { portName: selfDepMatch.groups.portName },
    };
  }

  // Depth limit warning (HEX007)
  const depthLimitMatch = message.match(
    /WARNING\[HEX007\]: Type-level depth limit \((?<maxDepth>\d+)\) exceeded/
  );
  if (depthLimitMatch?.groups) {
    const startPortMatch = message.match(/exceeded for port '(?<startPort>[^']+)'/);
    const lastPortMatch = message.match(/Last port visited: '(?<lastPort>[^']+)'/);

    const details: DepthLimitExceededDetails = {
      maxDepth: depthLimitMatch.groups.maxDepth,
      ...(startPortMatch?.groups?.startPort && { startPort: startPortMatch.groups.startPort }),
      ...(lastPortMatch?.groups?.lastPort && { lastPort: lastPortMatch.groups.lastPort }),
    };

    return {
      code: ErrorCode.DEPTH_LIMIT_EXCEEDED,
      message,
      details,
    };
  }

  // Missing dependency (HEX008)
  const missingMatch = message.match(
    /ERROR\[HEX008\]: Missing adapters? for (?<missingPorts>[^.]+)\./
  );
  if (missingMatch?.groups) {
    return {
      code: ErrorCode.MISSING_DEPENDENCY,
      message,
      details: { missingPorts: missingMatch.groups.missingPorts },
    };
  }

  // Override without parent (HEX009)
  if (message.match(/ERROR\[HEX009\]: Cannot use override\(\) without forParent\(\)/)) {
    return {
      code: ErrorCode.OVERRIDE_WITHOUT_PARENT,
      message,
      details: {},
    };
  }

  // Missing provides (HEX010)
  if (message.match(/ERROR\[HEX010\]/)) {
    return {
      code: ErrorCode.MISSING_PROVIDES,
      message,
      details: {},
    };
  }

  // Invalid provides (HEX011)
  const invalidProvidesMatch = message.match(/ERROR\[HEX011\]:.*Got: (?<actualType>\w+)/);
  if (invalidProvidesMatch?.groups) {
    return {
      code: ErrorCode.INVALID_PROVIDES,
      message,
      details: { actualType: invalidProvidesMatch.groups.actualType },
    };
  }
  if (message.match(/ERROR\[HEX011\]/)) {
    return {
      code: ErrorCode.INVALID_PROVIDES,
      message,
      details: {},
    };
  }

  // Invalid requires type (HEX012)
  const invalidRequiresTypeMatch = message.match(/ERROR\[HEX012\]:.*Got: (?<actualType>\w+)/);
  if (invalidRequiresTypeMatch?.groups) {
    return {
      code: ErrorCode.INVALID_REQUIRES_TYPE,
      message,
      details: { actualType: invalidRequiresTypeMatch.groups.actualType },
    };
  }
  if (message.match(/ERROR\[HEX012\]/)) {
    return {
      code: ErrorCode.INVALID_REQUIRES_TYPE,
      message,
      details: {},
    };
  }

  // Invalid requires element (HEX013)
  const invalidRequiresElementMatch = message.match(
    /ERROR\[HEX013\]: .*'requires\[(?<index>\d+)\]'/
  );
  if (invalidRequiresElementMatch?.groups) {
    return {
      code: ErrorCode.INVALID_REQUIRES_ELEMENT,
      message,
      details: { index: invalidRequiresElementMatch.groups.index },
    };
  }

  // Invalid lifetime type (HEX014)
  const invalidLifetimeTypeMatch = message.match(/ERROR\[HEX014\]:.*Got: (?<actualType>\w+)/);
  if (invalidLifetimeTypeMatch?.groups) {
    return {
      code: ErrorCode.INVALID_LIFETIME_TYPE,
      message,
      details: { actualType: invalidLifetimeTypeMatch.groups.actualType },
    };
  }
  if (message.match(/ERROR\[HEX014\]/)) {
    return {
      code: ErrorCode.INVALID_LIFETIME_TYPE,
      message,
      details: {},
    };
  }

  // Invalid lifetime value (HEX015)
  const invalidLifetimeValueMatch = message.match(/ERROR\[HEX015\]:.*Got: "(?<actualValue>[^"]+)"/);
  if (invalidLifetimeValueMatch?.groups) {
    return {
      code: ErrorCode.INVALID_LIFETIME_VALUE,
      message,
      details: { actualValue: invalidLifetimeValueMatch.groups.actualValue },
    };
  }
  if (message.match(/ERROR\[HEX015\]/)) {
    return {
      code: ErrorCode.INVALID_LIFETIME_VALUE,
      message,
      details: {},
    };
  }

  // Invalid factory (HEX016)
  const invalidFactoryMatch = message.match(/ERROR\[HEX016\]:.*Got: (?<actualType>\w+)/);
  if (invalidFactoryMatch?.groups) {
    return {
      code: ErrorCode.INVALID_FACTORY,
      message,
      details: { actualType: invalidFactoryMatch.groups.actualType },
    };
  }
  if (message.match(/ERROR\[HEX016\]/)) {
    return {
      code: ErrorCode.INVALID_FACTORY,
      message,
      details: {},
    };
  }

  // Duplicate requires (HEX017)
  const duplicateRequiresMatch = message.match(
    /ERROR\[HEX017\]: .*Duplicate port '(?<portName>[^']+)'/
  );
  if (duplicateRequiresMatch?.groups) {
    return {
      code: ErrorCode.DUPLICATE_REQUIRES,
      message,
      details: { portName: duplicateRequiresMatch.groups.portName },
    };
  }

  // Invalid finalizer (HEX018)
  const invalidFinalizerMatch = message.match(/ERROR\[HEX018\]:.*got (?<actualType>\w+)/);
  if (invalidFinalizerMatch?.groups) {
    return {
      code: ErrorCode.INVALID_FINALIZER,
      message,
      details: { actualType: invalidFinalizerMatch.groups.actualType },
    };
  }
  if (message.match(/ERROR\[HEX018\]/)) {
    return {
      code: ErrorCode.INVALID_FINALIZER,
      message,
      details: {},
    };
  }

  // Invalid lazy port (HEX019)
  if (message.match(/ERROR\[HEX019\]/)) {
    return {
      code: ErrorCode.INVALID_LAZY_PORT,
      message,
      details: {},
    };
  }

  // Unknown HEX error format
  return {
    code: ErrorCode.UNKNOWN_ERROR,
    message,
    details: {
      rawMessage: message,
    },
  };
}
