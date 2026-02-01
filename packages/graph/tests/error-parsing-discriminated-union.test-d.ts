/**
 * Type-level tests for discriminated union implementation in error parsing.
 * Verifies proper type narrowing and compile-time safety.
 */

import { expectTypeOf, test } from "vitest";
import {
  type ParsedGraphError,
  type DuplicateAdapterDetails,
  type CaptiveDependencyDetails,
  type CircularDependencyDetails,
  type MissingDependencyDetails,
  type MultipleErrorsDetails,
  parseGraphError,
  GraphErrorCode,
} from "../src/advanced.js";

test("ParsedGraphError is a proper discriminated union", () => {
  // Test that ParsedGraphError can be narrowed by checking the code field
  const testNarrowing = (error: ParsedGraphError): void => {
    switch (error.code) {
      case GraphErrorCode.DUPLICATE_ADAPTER: {
        // Should narrow to ParsedDuplicateAdapterError
        expectTypeOf(error.details).toEqualTypeOf<Readonly<DuplicateAdapterDetails>>();
        // Details should have portName
        expectTypeOf(error.details.portName).toEqualTypeOf<string>();
        break;
      }
      case GraphErrorCode.CAPTIVE_DEPENDENCY: {
        // Should narrow to ParsedCaptiveDependencyError
        expectTypeOf(error.details).toEqualTypeOf<Readonly<CaptiveDependencyDetails>>();
        // All fields are optional for runtime variations
        expectTypeOf(error.details.dependentLifetime).toEqualTypeOf<string | undefined>();
        expectTypeOf(error.details.dependentName).toEqualTypeOf<string | undefined>();
        expectTypeOf(error.details.captiveLifetime).toEqualTypeOf<string | undefined>();
        expectTypeOf(error.details.captiveName).toEqualTypeOf<string | undefined>();
        break;
      }
      case GraphErrorCode.CIRCULAR_DEPENDENCY: {
        // Should narrow to ParsedCircularDependencyError
        expectTypeOf(error.details).toEqualTypeOf<Readonly<CircularDependencyDetails>>();
        // cyclePath is optional for simple runtime format
        expectTypeOf(error.details.cyclePath).toEqualTypeOf<string | undefined>();
        break;
      }
      case GraphErrorCode.MISSING_DEPENDENCY: {
        // Should narrow to ParsedMissingDependencyError
        expectTypeOf(error.details).toEqualTypeOf<Readonly<MissingDependencyDetails>>();
        expectTypeOf(error.details.missingPorts).toEqualTypeOf<string>();
        break;
      }
      case GraphErrorCode.MULTIPLE_ERRORS: {
        // Should narrow to ParsedMultipleErrorsError
        expectTypeOf(error.details).toEqualTypeOf<Readonly<MultipleErrorsDetails>>();
        expectTypeOf(error.details.errorCount).toEqualTypeOf<string>();
        expectTypeOf(error.details.errorCodes).toEqualTypeOf<string>();
        break;
      }
    }
  };

  // Verify the function compiles without errors
  expectTypeOf(testNarrowing).toBeFunction();
});

test("parseGraphError returns discriminated union or undefined", () => {
  const result = parseGraphError("ERROR[HEX001]: Duplicate adapter for 'Logger'.");

  if (result) {
    // Should be ParsedGraphError - verify code is a valid error code type
    expectTypeOf(result.code).toBeString();

    // Can access common fields
    expectTypeOf(result.code).toEqualTypeOf<
      | typeof GraphErrorCode.DUPLICATE_ADAPTER
      | typeof GraphErrorCode.CIRCULAR_DEPENDENCY
      | typeof GraphErrorCode.CAPTIVE_DEPENDENCY
      | typeof GraphErrorCode.REVERSE_CAPTIVE_DEPENDENCY
      | typeof GraphErrorCode.LIFETIME_INCONSISTENCY
      | typeof GraphErrorCode.SELF_DEPENDENCY
      | typeof GraphErrorCode.DEPTH_LIMIT_EXCEEDED
      | typeof GraphErrorCode.MISSING_DEPENDENCY
      | typeof GraphErrorCode.OVERRIDE_WITHOUT_PARENT
      | typeof GraphErrorCode.MISSING_PROVIDES
      | typeof GraphErrorCode.INVALID_PROVIDES
      | typeof GraphErrorCode.INVALID_REQUIRES_TYPE
      | typeof GraphErrorCode.INVALID_REQUIRES_ELEMENT
      | typeof GraphErrorCode.INVALID_LIFETIME_TYPE
      | typeof GraphErrorCode.INVALID_LIFETIME_VALUE
      | typeof GraphErrorCode.INVALID_FACTORY
      | typeof GraphErrorCode.DUPLICATE_REQUIRES
      | typeof GraphErrorCode.INVALID_FINALIZER
      | typeof GraphErrorCode.INVALID_LAZY_PORT
      | typeof GraphErrorCode.MULTIPLE_ERRORS
      | typeof GraphErrorCode.UNKNOWN_ERROR
    >();

    expectTypeOf(result.message).toEqualTypeOf<string>();

    // Details type exists on all parsed errors
    expectTypeOf(result.details).not.toBeNever();
  } else {
    expectTypeOf(result).toEqualTypeOf<undefined>();
  }
});

test("All error codes have corresponding detail types", () => {
  // Type-level exhaustiveness check
  type ErrorCodeToDetails = {
    [GraphErrorCode.DUPLICATE_ADAPTER]: DuplicateAdapterDetails;
    [GraphErrorCode.CIRCULAR_DEPENDENCY]: CircularDependencyDetails;
    [GraphErrorCode.CAPTIVE_DEPENDENCY]: CaptiveDependencyDetails;
    [GraphErrorCode.REVERSE_CAPTIVE_DEPENDENCY]: import("../src/validation/error-parsing.js").ReverseCaptiveDependencyDetails;
    [GraphErrorCode.LIFETIME_INCONSISTENCY]: import("../src/validation/error-parsing.js").LifetimeInconsistencyDetails;
    [GraphErrorCode.SELF_DEPENDENCY]: import("../src/validation/error-parsing.js").SelfDependencyDetails;
    [GraphErrorCode.DEPTH_LIMIT_EXCEEDED]: import("../src/validation/error-parsing.js").DepthLimitExceededDetails;
    [GraphErrorCode.MISSING_DEPENDENCY]: MissingDependencyDetails;
    [GraphErrorCode.OVERRIDE_WITHOUT_PARENT]: import("../src/validation/error-parsing.js").OverrideWithoutParentDetails;
    [GraphErrorCode.MISSING_PROVIDES]: import("../src/validation/error-parsing.js").MissingProvidesDetails;
    [GraphErrorCode.INVALID_PROVIDES]: import("../src/validation/error-parsing.js").InvalidProvidesDetails;
    [GraphErrorCode.INVALID_REQUIRES_TYPE]: import("../src/validation/error-parsing.js").InvalidRequiresTypeDetails;
    [GraphErrorCode.INVALID_REQUIRES_ELEMENT]: import("../src/validation/error-parsing.js").InvalidRequiresElementDetails;
    [GraphErrorCode.INVALID_LIFETIME_TYPE]: import("../src/validation/error-parsing.js").InvalidLifetimeTypeDetails;
    [GraphErrorCode.INVALID_LIFETIME_VALUE]: import("../src/validation/error-parsing.js").InvalidLifetimeValueDetails;
    [GraphErrorCode.INVALID_FACTORY]: import("../src/validation/error-parsing.js").InvalidFactoryDetails;
    [GraphErrorCode.DUPLICATE_REQUIRES]: import("../src/validation/error-parsing.js").DuplicateRequiresDetails;
    [GraphErrorCode.INVALID_FINALIZER]: import("../src/validation/error-parsing.js").InvalidFinalizerDetails;
    [GraphErrorCode.INVALID_LAZY_PORT]: import("../src/validation/error-parsing.js").InvalidLazyPortDetails;
    [GraphErrorCode.MULTIPLE_ERRORS]: MultipleErrorsDetails;
    [GraphErrorCode.UNKNOWN_ERROR]: import("../src/validation/error-parsing.js").UnknownErrorDetails;
  };

  // Verify all codes are covered
  type AllCodes = keyof typeof GraphErrorCode;
  type MappedCodes = keyof ErrorCodeToDetails;

  // This should be true - all error codes have detail types
  expectTypeOf<MappedCodes>().toEqualTypeOf<(typeof GraphErrorCode)[AllCodes]>();
});

test("Details are properly readonly", () => {
  const error: ParsedGraphError = {
    code: GraphErrorCode.DUPLICATE_ADAPTER,
    message: "test",
    details: { portName: "Logger" },
  };

  // @ts-expect-error - details should be readonly
  error.details = { portName: "NewLogger" };

  if (error.code === GraphErrorCode.DUPLICATE_ADAPTER) {
    // @ts-expect-error - portName should be readonly
    error.details.portName = "NewLogger";
  }
});

test("Optional fields correctly handle runtime variations", () => {
  // Test that optional fields are properly typed
  const captiveError: ParsedGraphError = {
    code: GraphErrorCode.CAPTIVE_DEPENDENCY,
    message: "test",
    details: {}, // All fields optional for runtime variations
  };

  if (captiveError.code === GraphErrorCode.CAPTIVE_DEPENDENCY) {
    // All fields should be optional - verify the type narrows correctly
    expectTypeOf(captiveError.details).toEqualTypeOf<Readonly<CaptiveDependencyDetails>>();

    // Verify optional fields can be accessed (may be undefined)
    expectTypeOf(captiveError.details.dependentLifetime).toEqualTypeOf<string | undefined>();
    expectTypeOf(captiveError.details.dependentName).toEqualTypeOf<string | undefined>();
    expectTypeOf(captiveError.details.captiveLifetime).toEqualTypeOf<string | undefined>();
    expectTypeOf(captiveError.details.captiveName).toEqualTypeOf<string | undefined>();
  }
});

test("Type narrowing works with if statements", () => {
  const error: ParsedGraphError = {} as ParsedGraphError;

  if (error.code === GraphErrorCode.DUPLICATE_ADAPTER) {
    // TypeScript should narrow to ParsedDuplicateAdapterError
    expectTypeOf(error.details.portName).toEqualTypeOf<string>();
  } else if (error.code === GraphErrorCode.MISSING_DEPENDENCY) {
    // TypeScript should narrow to ParsedMissingDependencyError
    expectTypeOf(error.details.missingPorts).toEqualTypeOf<string>();
  } else if (error.code === GraphErrorCode.CIRCULAR_DEPENDENCY) {
    // TypeScript should narrow to ParsedCircularDependencyError
    expectTypeOf(error.details.cyclePath).toEqualTypeOf<string | undefined>();
  }
});

test("Unknown error handling", () => {
  const unknownError: ParsedGraphError = {
    code: GraphErrorCode.UNKNOWN_ERROR,
    message: "Some future error",
    details: { rawMessage: "Some future error" },
  };

  if (unknownError.code === GraphErrorCode.UNKNOWN_ERROR) {
    expectTypeOf(unknownError.details.rawMessage).toEqualTypeOf<string>();
  }
});

test("No type-level regressions with literal types", () => {
  // Ensure error codes are literal types, not widened strings
  const code = GraphErrorCode.DUPLICATE_ADAPTER;
  expectTypeOf(code).toEqualTypeOf<"DUPLICATE_ADAPTER">();

  // Ensure numeric codes are also literal
  const numericCode = import("../src/validation/error-parsing.js").then(
    m => m.GraphErrorNumericCode.DUPLICATE_ADAPTER
  );
  numericCode.then(code => {
    expectTypeOf(code).toEqualTypeOf<"HEX001">();
  });
});

test("Discriminated union exhaustiveness in switch", () => {
  const handleAllErrors = (error: ParsedGraphError): string => {
    switch (error.code) {
      case GraphErrorCode.DUPLICATE_ADAPTER:
        return "duplicate";
      case GraphErrorCode.CIRCULAR_DEPENDENCY:
        return "circular";
      case GraphErrorCode.CAPTIVE_DEPENDENCY:
        return "captive";
      case GraphErrorCode.REVERSE_CAPTIVE_DEPENDENCY:
        return "reverse-captive";
      case GraphErrorCode.LIFETIME_INCONSISTENCY:
        return "lifetime";
      case GraphErrorCode.SELF_DEPENDENCY:
        return "self";
      case GraphErrorCode.DEPTH_LIMIT_EXCEEDED:
        return "depth";
      case GraphErrorCode.MISSING_DEPENDENCY:
        return "missing";
      case GraphErrorCode.OVERRIDE_WITHOUT_PARENT:
        return "override";
      case GraphErrorCode.MISSING_PROVIDES:
        return "missing-provides";
      case GraphErrorCode.INVALID_PROVIDES:
        return "invalid-provides";
      case GraphErrorCode.INVALID_REQUIRES_TYPE:
        return "invalid-requires-type";
      case GraphErrorCode.INVALID_REQUIRES_ELEMENT:
        return "invalid-requires-element";
      case GraphErrorCode.INVALID_LIFETIME_TYPE:
        return "invalid-lifetime-type";
      case GraphErrorCode.INVALID_LIFETIME_VALUE:
        return "invalid-lifetime-value";
      case GraphErrorCode.INVALID_FACTORY:
        return "invalid-factory";
      case GraphErrorCode.DUPLICATE_REQUIRES:
        return "duplicate-requires";
      case GraphErrorCode.INVALID_FINALIZER:
        return "invalid-finalizer";
      case GraphErrorCode.INVALID_LAZY_PORT:
        return "invalid-lazy";
      case GraphErrorCode.MULTIPLE_ERRORS:
        return "multiple";
      case GraphErrorCode.UNKNOWN_ERROR:
        return "unknown";
      default: {
        // Should be never if all cases are handled
        const _exhaustive: never = error;
        return _exhaustive;
      }
    }
  };

  expectTypeOf(handleAllErrors).toBeFunction();
});
