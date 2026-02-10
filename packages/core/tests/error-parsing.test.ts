/**
 * Comprehensive tests for error parsing utilities.
 *
 * Tests isHexError() and parseError() for all error codes HEX001-HEX019,
 * plus multiple errors and unknown error formats.
 */

import { describe, it, expect } from "vitest";
import { isHexError, parseError, ErrorCode } from "../src/index.js";

// =============================================================================
// isHexError()
// =============================================================================

describe("isHexError()", () => {
  it("returns true for ERROR[HEX...] messages", () => {
    expect(isHexError("ERROR[HEX001]: Duplicate adapter for 'Logger'")).toBe(true);
  });

  it("returns true for WARNING[HEX...] messages", () => {
    expect(isHexError("WARNING[HEX007]: Type-level depth limit (10) exceeded")).toBe(true);
  });

  it("returns true for Multiple validation errors: prefix", () => {
    expect(isHexError("Multiple validation errors: ERROR[HEX001] ERROR[HEX002]")).toBe(true);
  });

  it("returns false for non-HEX error messages", () => {
    expect(isHexError("Something went wrong")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isHexError("")).toBe(false);
  });

  it("returns false for ERROR without HEX prefix", () => {
    expect(isHexError("ERROR: something")).toBe(false);
  });

  it("returns false for WARNING without HEX prefix", () => {
    expect(isHexError("WARNING: something")).toBe(false);
  });

  it("returns false for partial match at non-start position", () => {
    expect(isHexError("prefix ERROR[HEX001]: something")).toBe(false);
  });
});

// =============================================================================
// parseError() - returns undefined for non-HEX messages
// =============================================================================

describe("parseError() - non-HEX messages", () => {
  it("returns undefined for non-HEX error", () => {
    expect(parseError("random error")).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(parseError("")).toBeUndefined();
  });
});

// =============================================================================
// parseError() - HEX001: Duplicate Adapter
// =============================================================================

describe("parseError() - HEX001: Duplicate Adapter", () => {
  it("parses duplicate adapter error with port name", () => {
    const msg = "ERROR[HEX001]: Duplicate adapter for 'Logger'. Fix: remove one adapter.";
    const result = parseError(msg);
    expect(result).toBeDefined();
    expect(result?.code).toBe(ErrorCode.DUPLICATE_ADAPTER);
    expect(result?.message).toBe(msg);
    expect(result?.details).toEqual({ portName: "Logger" });
  });

  it("extracts correct port name from duplicate adapter error", () => {
    const msg = "ERROR[HEX001]: Duplicate adapter for 'UserService'. Fix: remove one adapter.";
    const result = parseError(msg);
    expect(result?.code).toBe("DUPLICATE_ADAPTER");
    expect(result?.details).toEqual({ portName: "UserService" });
  });
});

// =============================================================================
// parseError() - HEX002: Circular Dependency
// =============================================================================

describe("parseError() - HEX002: Circular Dependency", () => {
  it("parses type-level format circular dependency", () => {
    const msg = "ERROR[HEX002]: Circular dependency: A -> B -> A. Fix: break the cycle.";
    const result = parseError(msg);
    expect(result).toBeDefined();
    expect(result?.code).toBe(ErrorCode.CIRCULAR_DEPENDENCY);
    expect(result?.message).toBe(msg);
    expect(result?.details).toEqual({ cyclePath: "A -> B -> A" });
  });

  it("parses runtime format circular dependency with cycle path", () => {
    const msg = "ERROR[HEX002]: Circular dependency detected at runtime: X -> Y -> X";
    const result = parseError(msg);
    expect(result?.code).toBe(ErrorCode.CIRCULAR_DEPENDENCY);
    expect(result?.details).toEqual({ cyclePath: "X -> Y -> X" });
  });

  it("parses runtime format with depth exceeded note", () => {
    const msg =
      "ERROR[HEX002]: Circular dependency detected at runtime (depth exceeded type-level limit): P -> Q -> P";
    const result = parseError(msg);
    expect(result?.code).toBe(ErrorCode.CIRCULAR_DEPENDENCY);
    expect(result?.details).toEqual({ cyclePath: "P -> Q -> P" });
  });

  it("parses simple runtime format without cycle path", () => {
    const msg = "ERROR[HEX002]: Circular dependency detected at runtime";
    const result = parseError(msg);
    expect(result?.code).toBe(ErrorCode.CIRCULAR_DEPENDENCY);
    expect(result?.details).toEqual({});
  });
});

// =============================================================================
// parseError() - HEX003: Captive Dependency
// =============================================================================

describe("parseError() - HEX003: Captive Dependency", () => {
  it("parses type-level format captive dependency", () => {
    const msg =
      "ERROR[HEX003]: Captive dependency: singleton 'CacheService' cannot depend on transient 'RequestLogger'";
    const result = parseError(msg);
    expect(result).toBeDefined();
    expect(result?.code).toBe(ErrorCode.CAPTIVE_DEPENDENCY);
    expect(result?.message).toBe(msg);
    expect(result?.details).toEqual({
      dependentLifetime: "singleton",
      dependentName: "CacheService",
      captiveLifetime: "transient",
      captiveName: "RequestLogger",
    });
  });

  it("parses runtime format captive dependency", () => {
    const msg =
      "ERROR[HEX003]: Captive dependency detected at runtime: singleton 'A' cannot depend on scoped 'B'";
    const result = parseError(msg);
    expect(result?.code).toBe(ErrorCode.CAPTIVE_DEPENDENCY);
    expect(result?.details).toEqual({
      dependentLifetime: "singleton",
      dependentName: "A",
      captiveLifetime: "scoped",
      captiveName: "B",
    });
  });

  it("parses simple runtime format without details", () => {
    const msg = "ERROR[HEX003]: Captive dependency detected at runtime";
    const result = parseError(msg);
    expect(result?.code).toBe(ErrorCode.CAPTIVE_DEPENDENCY);
    expect(result?.details).toEqual({});
  });
});

// =============================================================================
// parseError() - HEX004: Reverse Captive Dependency
// =============================================================================

describe("parseError() - HEX004: Reverse Captive Dependency", () => {
  it("parses reverse captive dependency error", () => {
    const msg =
      "ERROR[HEX004]: Reverse captive dependency: Existing singleton 'Cache' would capture new transient 'Logger'";
    const result = parseError(msg);
    expect(result).toBeDefined();
    expect(result?.code).toBe(ErrorCode.REVERSE_CAPTIVE_DEPENDENCY);
    expect(result?.message).toBe(msg);
    expect(result?.details).toEqual({
      existingLifetime: "singleton",
      existingName: "Cache",
      newLifetime: "transient",
      newName: "Logger",
    });
  });
});

// =============================================================================
// parseError() - HEX005: Lifetime Inconsistency
// =============================================================================

describe("parseError() - HEX005: Lifetime Inconsistency", () => {
  it("parses lifetime inconsistency error", () => {
    const msg =
      "ERROR[HEX005]: Lifetime inconsistency for 'Logger': Graph A provides singleton, Graph B provides transient";
    const result = parseError(msg);
    expect(result).toBeDefined();
    expect(result?.code).toBe(ErrorCode.LIFETIME_INCONSISTENCY);
    expect(result?.message).toBe(msg);
    expect(result?.details).toEqual({
      portName: "Logger",
      lifetimeA: "singleton",
      lifetimeB: "transient",
    });
  });
});

// =============================================================================
// parseError() - HEX006: Self-Dependency
// =============================================================================

describe("parseError() - HEX006: Self-Dependency", () => {
  it("parses self-dependency error", () => {
    const msg = "ERROR[HEX006]: Self-dependency detected. Adapter for 'Logger' depends on itself.";
    const result = parseError(msg);
    expect(result).toBeDefined();
    expect(result?.code).toBe(ErrorCode.SELF_DEPENDENCY);
    expect(result?.message).toBe(msg);
    expect(result?.details).toEqual({ portName: "Logger" });
  });
});

// =============================================================================
// parseError() - HEX007: Depth Limit Exceeded
// =============================================================================

describe("parseError() - HEX007: Depth Limit Exceeded", () => {
  it("parses depth limit warning with all details", () => {
    const msg =
      "WARNING[HEX007]: Type-level depth limit (10) exceeded for port 'DeepService'. Last port visited: 'Service10'.";
    const result = parseError(msg);
    expect(result).toBeDefined();
    expect(result?.code).toBe(ErrorCode.DEPTH_LIMIT_EXCEEDED);
    expect(result?.message).toBe(msg);
    expect(result?.details).toEqual({
      maxDepth: "10",
      startPort: "DeepService",
      lastPort: "Service10",
    });
  });

  it("parses depth limit warning with only maxDepth", () => {
    const msg = "WARNING[HEX007]: Type-level depth limit (5) exceeded. No port details.";
    const result = parseError(msg);
    expect(result?.code).toBe(ErrorCode.DEPTH_LIMIT_EXCEEDED);
    expect(result?.details).toEqual({ maxDepth: "5" });
  });

  it("parses depth limit warning with startPort but no lastPort", () => {
    const msg =
      "WARNING[HEX007]: Type-level depth limit (8) exceeded for port 'StartService'. No last port.";
    const result = parseError(msg);
    expect(result?.code).toBe(ErrorCode.DEPTH_LIMIT_EXCEEDED);
    expect(result?.details).toEqual({
      maxDepth: "8",
      startPort: "StartService",
    });
  });
});

// =============================================================================
// parseError() - HEX008: Missing Dependency
// =============================================================================

describe("parseError() - HEX008: Missing Dependency", () => {
  it("parses missing adapter error (singular)", () => {
    const msg = "ERROR[HEX008]: Missing adapter for 'Logger'. Ensure it is registered.";
    const result = parseError(msg);
    expect(result).toBeDefined();
    expect(result?.code).toBe(ErrorCode.MISSING_DEPENDENCY);
    expect(result?.message).toBe(msg);
    expect(result?.details).toEqual({ missingPorts: "'Logger'" });
  });

  it("parses missing adapters error (plural)", () => {
    const msg =
      "ERROR[HEX008]: Missing adapters for 'Logger', 'Database'. Ensure they are registered.";
    const result = parseError(msg);
    expect(result?.code).toBe(ErrorCode.MISSING_DEPENDENCY);
    expect(result?.details).toEqual({ missingPorts: "'Logger', 'Database'" });
  });
});

// =============================================================================
// parseError() - HEX009: Override Without Parent
// =============================================================================

describe("parseError() - HEX009: Override Without Parent", () => {
  it("parses override without parent error", () => {
    const msg = "ERROR[HEX009]: Cannot use override() without forParent()";
    const result = parseError(msg);
    expect(result).toBeDefined();
    expect(result?.code).toBe(ErrorCode.OVERRIDE_WITHOUT_PARENT);
    expect(result?.message).toBe(msg);
    expect(result?.details).toEqual({});
  });
});

// =============================================================================
// parseError() - HEX010: Missing Provides
// =============================================================================

describe("parseError() - HEX010: Missing Provides", () => {
  it("parses missing provides error", () => {
    const msg = "ERROR[HEX010]: Invalid adapter config: 'provides' is required.";
    const result = parseError(msg);
    expect(result).toBeDefined();
    expect(result?.code).toBe(ErrorCode.MISSING_PROVIDES);
    expect(result?.message).toBe(msg);
    expect(result?.details).toEqual({});
  });
});

// =============================================================================
// parseError() - HEX011: Invalid Provides
// =============================================================================

describe("parseError() - HEX011: Invalid Provides", () => {
  it("parses invalid provides error with actual type", () => {
    const msg = "ERROR[HEX011]: Invalid adapter config: 'provides' must be a Port. Got: string";
    const result = parseError(msg);
    expect(result).toBeDefined();
    expect(result?.code).toBe(ErrorCode.INVALID_PROVIDES);
    expect(result?.details).toEqual({ actualType: "string" });
  });

  it("parses invalid provides error without actual type", () => {
    const msg = "ERROR[HEX011]: Invalid adapter config: 'provides' is invalid.";
    const result = parseError(msg);
    expect(result?.code).toBe(ErrorCode.INVALID_PROVIDES);
    expect(result?.details).toEqual({});
  });
});

// =============================================================================
// parseError() - HEX012: Invalid Requires Type
// =============================================================================

describe("parseError() - HEX012: Invalid Requires Type", () => {
  it("parses invalid requires type error with actual type", () => {
    const msg = "ERROR[HEX012]: Invalid adapter config: 'requires' must be array. Got: object";
    const result = parseError(msg);
    expect(result).toBeDefined();
    expect(result?.code).toBe(ErrorCode.INVALID_REQUIRES_TYPE);
    expect(result?.details).toEqual({ actualType: "object" });
  });

  it("parses invalid requires type error without actual type", () => {
    const msg = "ERROR[HEX012]: Invalid adapter config: 'requires' is invalid.";
    const result = parseError(msg);
    expect(result?.code).toBe(ErrorCode.INVALID_REQUIRES_TYPE);
    expect(result?.details).toEqual({});
  });
});

// =============================================================================
// parseError() - HEX013: Invalid Requires Element
// =============================================================================

describe("parseError() - HEX013: Invalid Requires Element", () => {
  it("parses invalid requires element error with index", () => {
    const msg = "ERROR[HEX013]: Invalid element at 'requires[2]' is not a Port.";
    const result = parseError(msg);
    expect(result).toBeDefined();
    expect(result?.code).toBe(ErrorCode.INVALID_REQUIRES_ELEMENT);
    expect(result?.details).toEqual({ index: "2" });
  });
});

// =============================================================================
// parseError() - HEX014: Invalid Lifetime Type
// =============================================================================

describe("parseError() - HEX014: Invalid Lifetime Type", () => {
  it("parses invalid lifetime type error with actual type", () => {
    const msg = "ERROR[HEX014]: Invalid adapter config: 'lifetime' must be a string. Got: number";
    const result = parseError(msg);
    expect(result).toBeDefined();
    expect(result?.code).toBe(ErrorCode.INVALID_LIFETIME_TYPE);
    expect(result?.details).toEqual({ actualType: "number" });
  });

  it("parses invalid lifetime type error without actual type", () => {
    const msg = "ERROR[HEX014]: Invalid adapter config: 'lifetime' is missing.";
    const result = parseError(msg);
    expect(result?.code).toBe(ErrorCode.INVALID_LIFETIME_TYPE);
    expect(result?.details).toEqual({});
  });
});

// =============================================================================
// parseError() - HEX015: Invalid Lifetime Value
// =============================================================================

describe("parseError() - HEX015: Invalid Lifetime Value", () => {
  it("parses invalid lifetime value error with actual value", () => {
    const msg =
      'ERROR[HEX015]: Invalid adapter config: \'lifetime\' must be "singleton", "scoped", "transient". Got: "request".';
    const result = parseError(msg);
    expect(result).toBeDefined();
    expect(result?.code).toBe(ErrorCode.INVALID_LIFETIME_VALUE);
    expect(result?.details).toEqual({ actualValue: "request" });
  });

  it("parses invalid lifetime value error without actual value", () => {
    const msg = "ERROR[HEX015]: Invalid adapter config: 'lifetime' value is not valid.";
    const result = parseError(msg);
    expect(result?.code).toBe(ErrorCode.INVALID_LIFETIME_VALUE);
    expect(result?.details).toEqual({});
  });
});

// =============================================================================
// parseError() - HEX016: Invalid Factory
// =============================================================================

describe("parseError() - HEX016: Invalid Factory", () => {
  it("parses invalid factory error with actual type", () => {
    const msg = "ERROR[HEX016]: Invalid adapter config: 'factory' must be a function. Got: string";
    const result = parseError(msg);
    expect(result).toBeDefined();
    expect(result?.code).toBe(ErrorCode.INVALID_FACTORY);
    expect(result?.details).toEqual({ actualType: "string" });
  });

  it("parses invalid factory error without actual type", () => {
    const msg = "ERROR[HEX016]: Invalid adapter config: 'factory' is missing.";
    const result = parseError(msg);
    expect(result?.code).toBe(ErrorCode.INVALID_FACTORY);
    expect(result?.details).toEqual({});
  });
});

// =============================================================================
// parseError() - HEX017: Duplicate Requires
// =============================================================================

describe("parseError() - HEX017: Duplicate Requires", () => {
  it("parses duplicate requires error", () => {
    const msg = "ERROR[HEX017]: Invalid requires array. Duplicate port 'Logger' found.";
    const result = parseError(msg);
    expect(result).toBeDefined();
    expect(result?.code).toBe(ErrorCode.DUPLICATE_REQUIRES);
    expect(result?.details).toEqual({ portName: "Logger" });
  });
});

// =============================================================================
// parseError() - HEX018: Invalid Finalizer
// =============================================================================

describe("parseError() - HEX018: Invalid Finalizer", () => {
  it("parses invalid finalizer error with actual type", () => {
    const msg = "ERROR[HEX018]: Invalid adapter config: 'finalizer' must be a function, got string";
    const result = parseError(msg);
    expect(result).toBeDefined();
    expect(result?.code).toBe(ErrorCode.INVALID_FINALIZER);
    expect(result?.details).toEqual({ actualType: "string" });
  });

  it("parses invalid finalizer error without actual type", () => {
    const msg = "ERROR[HEX018]: Invalid adapter config: 'finalizer' is not valid.";
    const result = parseError(msg);
    expect(result?.code).toBe(ErrorCode.INVALID_FINALIZER);
    expect(result?.details).toEqual({});
  });
});

// =============================================================================
// parseError() - HEX019: Invalid Lazy Port
// =============================================================================

describe("parseError() - HEX019: Invalid Lazy Port", () => {
  it("parses invalid lazy port error", () => {
    const msg = "ERROR[HEX019]: Invalid lazy port: missing original port reference";
    const result = parseError(msg);
    expect(result).toBeDefined();
    expect(result?.code).toBe(ErrorCode.INVALID_LAZY_PORT);
    expect(result?.message).toBe(msg);
    expect(result?.details).toEqual({});
  });
});

// =============================================================================
// parseError() - Multiple Errors
// =============================================================================

describe("parseError() - Multiple Errors", () => {
  it("parses multiple errors message with error count and codes", () => {
    const msg =
      "Multiple validation errors: ERROR[HEX001]: Duplicate adapter. ERROR[HEX002]: Circular dependency.";
    const result = parseError(msg);
    expect(result).toBeDefined();
    expect(result?.code).toBe(ErrorCode.MULTIPLE_ERRORS);
    expect(result?.message).toBe(msg);
    expect(result?.details).toEqual({
      errorCount: "2",
      errorCodes: "HEX001,HEX002",
    });
  });

  it("parses multiple errors with single error code", () => {
    const msg = "Multiple validation errors: ERROR[HEX008]: Missing adapter for 'X'.";
    const result = parseError(msg);
    expect(result?.code).toBe(ErrorCode.MULTIPLE_ERRORS);
    expect(result?.details).toEqual({
      errorCount: "1",
      errorCodes: "HEX008",
    });
  });

  it("handles multiple errors with no embedded error codes", () => {
    const msg = "Multiple validation errors: something went wrong";
    const result = parseError(msg);
    expect(result?.code).toBe(ErrorCode.MULTIPLE_ERRORS);
    expect(result?.details).toEqual({
      errorCount: "0",
      errorCodes: "",
    });
  });
});

// =============================================================================
// parseError() - Unknown HEX Error Format
// =============================================================================

describe("parseError() - Unknown HEX Error Format", () => {
  it("returns UNKNOWN_ERROR for unrecognized HEX error format", () => {
    const msg = "ERROR[HEX999]: Some unknown error format";
    const result = parseError(msg);
    expect(result).toBeDefined();
    expect(result?.code).toBe(ErrorCode.UNKNOWN_ERROR);
    expect(result?.message).toBe(msg);
    expect(result?.details).toEqual({ rawMessage: msg });
  });

  it("returns UNKNOWN_ERROR for WARNING that does not match HEX007", () => {
    const msg = "WARNING[HEX999]: Some unknown warning format";
    const result = parseError(msg);
    expect(result?.code).toBe(ErrorCode.UNKNOWN_ERROR);
    expect(result?.details).toEqual({ rawMessage: msg });
  });
});
