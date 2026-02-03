/**
 * Tests for lastPort field in DepthLimitExceeded error parsing.
 *
 * When a depth limit is exceeded during type-level validation, the error
 * message should include information about which port was being processed
 * when the limit was hit. This helps developers debug deep dependency chains.
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import { parseGraphError, GraphErrorCode } from "./test-types.js";

describe("DepthLimitExceededDetails.lastPort", () => {
  it("should include lastPort in parsed error when present in message", () => {
    // Error message format with lastPort information
    const error =
      "WARNING[HEX007]: Type-level depth limit (50) exceeded. " +
      "Last port visited: 'CachePort'. " +
      "Fix: Use GraphBuilder.withMaxDepth<N>() for deeper graphs.";

    const parsed = parseGraphError(error);

    expect(parsed).toBeDefined();
    expect(parsed?.code).toBe(GraphErrorCode.DEPTH_LIMIT_EXCEEDED);
    expect(parsed?.details).toHaveProperty("maxDepth", "50");
    expect(parsed?.details).toHaveProperty("lastPort", "CachePort");
  });

  it("should handle missing lastPort gracefully", () => {
    // Original error format without lastPort
    const error =
      "WARNING[HEX007]: Type-level depth limit (100) exceeded. " +
      "Fix: Use GraphBuilder.withMaxDepth<N>() for deeper graphs.";

    const parsed = parseGraphError(error);

    expect(parsed).toBeDefined();
    expect(parsed?.code).toBe(GraphErrorCode.DEPTH_LIMIT_EXCEEDED);
    expect(parsed?.details).toHaveProperty("maxDepth", "100");
    // lastPort should be undefined when not present in message
    expect(parsed?.details).not.toHaveProperty("lastPort");
  });

  it("should extract lastPort with complex port names", () => {
    // Port names can contain various characters
    const error =
      "WARNING[HEX007]: Type-level depth limit (25) exceeded. " +
      "Last port visited: 'MyService_v2'. " +
      "Fix: Use GraphBuilder.withMaxDepth<N>() for deeper graphs.";

    const parsed = parseGraphError(error);

    expect(parsed?.code).toBe(GraphErrorCode.DEPTH_LIMIT_EXCEEDED);
    expect(parsed?.details).toHaveProperty("lastPort", "MyService_v2");
  });

  it("should extract startPort when present", () => {
    // Full error format with both start and last ports
    const error =
      "WARNING[HEX007]: Type-level depth limit (50) exceeded for port 'DatabasePort'. " +
      "Last port visited: 'CachePort'. " +
      "Fix: Use GraphBuilder.withMaxDepth<N>() for deeper graphs.";

    const parsed = parseGraphError(error);

    expect(parsed?.code).toBe(GraphErrorCode.DEPTH_LIMIT_EXCEEDED);
    expect(parsed?.details).toHaveProperty("startPort", "DatabasePort");
    expect(parsed?.details).toHaveProperty("lastPort", "CachePort");
    expect(parsed?.details).toHaveProperty("maxDepth", "50");
  });
});
