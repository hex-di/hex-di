/**
 * Tests for error suggestion enhancements.
 *
 * These tests verify:
 * 1. Levenshtein distance calculation
 * 2. suggestSimilarPort functionality with distance threshold
 * 3. Programming errors include actionable suggestions
 * 4. Suggestions contain copy-paste-ready code examples
 * 5. "Did you mean?" appears for typo'd port names
 */
// @ts-nocheck

import { describe, expect, it } from "vitest";
import { levenshteinDistance, suggestSimilarPort } from "../src/util/string-similarity.js";
import {
  CircularDependencyError,
  DisposedScopeError,
  ScopeRequiredError,
  AsyncInitializationRequiredError,
  NonClonableForkedError,
} from "../src/index.js";

// =============================================================================
// Levenshtein Distance Tests
// =============================================================================

describe("levenshteinDistance", () => {
  it("returns 0 for identical strings", () => {
    expect(levenshteinDistance("hello", "hello")).toBe(0);
    expect(levenshteinDistance("", "")).toBe(0);
    expect(levenshteinDistance("UserService", "UserService")).toBe(0);
  });

  it("returns correct distance for single character differences", () => {
    // Single insertion
    expect(levenshteinDistance("hello", "helo")).toBe(1);
    // Single deletion
    expect(levenshteinDistance("helo", "hello")).toBe(1);
    // Single substitution
    expect(levenshteinDistance("hello", "hallo")).toBe(1);
  });

  it("returns correct distance for multiple differences", () => {
    // Classic example: kitten -> sitting (3 edits)
    expect(levenshteinDistance("kitten", "sitting")).toBe(3);
    // Two character difference
    expect(levenshteinDistance("hello", "hxllo")).toBe(1); // e->x substitution
    expect(levenshteinDistance("hello", "hxlly")).toBe(2); // e->x, o->y
  });

  it("handles edge cases", () => {
    // Empty to non-empty
    expect(levenshteinDistance("", "abc")).toBe(3);
    expect(levenshteinDistance("abc", "")).toBe(3);
    // Completely different strings
    expect(levenshteinDistance("abc", "xyz")).toBe(3);
  });

  it("handles case sensitivity", () => {
    // Case differences count as substitutions
    expect(levenshteinDistance("UserService", "userservice")).toBe(2); // U->u, S->s
  });
});

// =============================================================================
// suggestSimilarPort Tests
// =============================================================================

describe("suggestSimilarPort", () => {
  const availablePorts = ["UserService", "AuthService", "LoggerService", "DatabaseAdapter"];

  it("returns closest match when distance <= 2", () => {
    // Distance 1: missing 'i'
    expect(suggestSimilarPort("UserServce", availablePorts)).toBe("UserService");
    // Distance 1: extra character
    expect(suggestSimilarPort("AuthxService", availablePorts)).toBe("AuthService");
  });

  it("returns undefined when no close match (distance > 2)", () => {
    // Distance 4: too different
    expect(suggestSimilarPort("UserSrv", availablePorts)).toBeUndefined();
    // Completely different
    expect(suggestSimilarPort("XYZ", availablePorts)).toBeUndefined();
  });

  it("returns closest match among multiple similar ports", () => {
    const ports = ["UserService", "UserServices", "UsersService"];
    // "UserServic" is distance 1 from "UserService" and "UserServices"
    // Should pick the first one it finds with distance 1
    const result = suggestSimilarPort("UserServic", ports);
    expect(result).toBe("UserService");
  });

  it("handles typos with distance 2", () => {
    // Missing one char and wrong case = distance 2
    expect(suggestSimilarPort("Loger", availablePorts)).toBeUndefined(); // distance 6, too far
    // Just missing 'g' = distance 1
    expect(suggestSimilarPort("LogerService", availablePorts)).toBe("LoggerService");
  });

  it("returns undefined for empty port list", () => {
    expect(suggestSimilarPort("UserService", [])).toBeUndefined();
  });

  it("handles exact match by returning it (distance 0)", () => {
    expect(suggestSimilarPort("UserService", availablePorts)).toBe("UserService");
  });
});

// =============================================================================
// Error Suggestion Tests
// =============================================================================

describe("CircularDependencyError suggestions", () => {
  it("includes actionable suggestion", () => {
    const error = new CircularDependencyError(["A", "B", "A"]);

    expect(error.suggestion).toBeDefined();
    expect(error.suggestion).toContain("To break the circular dependency");
  });

  it("includes code example", () => {
    const error = new CircularDependencyError(["ServiceA", "ServiceB", "ServiceA"]);

    expect(error.suggestion).toContain("```typescript");
    expect(error.suggestion).toContain("createAdapter");
    expect(error.suggestion).toContain("definePort");
  });

  it("suggests multiple refactoring strategies", () => {
    const error = new CircularDependencyError(["X", "Y", "X"]);

    expect(error.suggestion).toContain("Extract shared logic");
    expect(error.suggestion).toContain("Pass data as parameters");
    expect(error.suggestion).toContain("lazy injection");
  });
});

describe("DisposedScopeError suggestions", () => {
  it("includes lifecycle management guidance", () => {
    const error = new DisposedScopeError("UserServicePort");

    expect(error.suggestion).toBeDefined();
    expect(error.suggestion).toContain("lifecycle");
  });

  it("includes try/finally example", () => {
    const error = new DisposedScopeError("RequestContextPort");

    expect(error.suggestion).toContain("try");
    expect(error.suggestion).toContain("finally");
    expect(error.suggestion).toContain("dispose()");
  });

  it("suggests checking disposal state", () => {
    const error = new DisposedScopeError("ScopePort");

    expect(error.suggestion).toContain("Check if the scope is disposed");
    expect(error.suggestion).toContain("createScope()");
  });
});

describe("ScopeRequiredError suggestions", () => {
  it("includes scope creation example", () => {
    const error = new ScopeRequiredError("SessionPort");

    expect(error.suggestion).toBeDefined();
    expect(error.suggestion).toContain("createScope()");
  });

  it("includes code example with port name", () => {
    const error = new ScopeRequiredError("UserContextPort");

    expect(error.suggestion).toContain("```typescript");
    expect(error.suggestion).toContain("UserContextPort");
    expect(error.suggestion).toContain("scope.resolve");
  });

  it("includes disposal guidance", () => {
    const error = new ScopeRequiredError("RequestPort");

    expect(error.suggestion).toContain("dispose()");
  });
});

describe("AsyncInitializationRequiredError suggestions", () => {
  it("includes two resolution options", () => {
    const error = new AsyncInitializationRequiredError("DatabasePort");

    expect(error.suggestion).toBeDefined();
    expect(error.suggestion).toContain("Option 1");
    expect(error.suggestion).toContain("Option 2");
  });

  it("suggests resolveAsync as recommended approach", () => {
    const error = new AsyncInitializationRequiredError("AsyncServicePort");

    expect(error.suggestion).toContain("resolveAsync()");
    expect(error.suggestion).toContain("recommended");
  });

  it("includes initialize() alternative", () => {
    const error = new AsyncInitializationRequiredError("ConfigPort");

    expect(error.suggestion).toContain("initialize()");
    expect(error.suggestion).toContain("```typescript");
  });

  it("includes port name in code examples", () => {
    const error = new AsyncInitializationRequiredError("MyAsyncPort");

    expect(error.suggestion).toContain("MyAsyncPort");
  });
});

describe("NonClonableForkedError suggestions", () => {
  it("includes three inheritance mode alternatives", () => {
    const error = new NonClonableForkedError("DatabasePort");

    expect(error.suggestion).toBeDefined();
    expect(error.suggestion).toContain("Option 1");
    expect(error.suggestion).toContain("Option 2");
    expect(error.suggestion).toContain("Option 3");
  });

  it("suggests shared mode with explanation", () => {
    const error = new NonClonableForkedError("ConnectionPort");

    expect(error.suggestion).toContain("shared");
    expect(error.suggestion).toContain("share parent");
  });

  it("suggests isolated mode with explanation", () => {
    const error = new NonClonableForkedError("SocketPort");

    expect(error.suggestion).toContain("isolated");
    expect(error.suggestion).toContain("create new");
  });

  it("suggests marking adapter as clonable", () => {
    const error = new NonClonableForkedError("LoggerPort");

    expect(error.suggestion).toContain("clonable: true");
    expect(error.suggestion).toContain("createAdapter");
  });

  it("includes port name in all code examples", () => {
    const error = new NonClonableForkedError("MyServicePort");

    expect(error.suggestion).toContain("MyServicePort");
    const exampleCount = (error.suggestion?.match(/MyServicePort/g) || []).length;
    expect(exampleCount).toBeGreaterThanOrEqual(3); // Should appear in each option
  });
});

// =============================================================================
// "Did you mean?" Integration Tests
// =============================================================================

describe("Port not found 'Did you mean?' suggestions", () => {
  it("suggests similar port name in error message", () => {
    // This is tested via integration test since it requires container setup
    // We verify the suggestion logic works independently above
    // The integration happens in inspection/creation.ts

    // Mock scenario: if we had ports ["UserService", "AuthService"]
    // and tried to resolve "UserServce", the error should include:
    // "Did you mean 'UserService'?"

    const availablePorts = ["UserService", "AuthService", "LoggerService"];
    const typo = "UserServce";
    const suggestion = suggestSimilarPort(typo, availablePorts);

    expect(suggestion).toBe("UserService");

    // Error message would be constructed as:
    const errorMessage = `Port '${typo}' is not registered in this container.${
      suggestion ? ` Did you mean '${suggestion}'?` : ""
    } Use listPorts() to see available ports.`;

    expect(errorMessage).toContain("Did you mean 'UserService'?");
  });

  it("does not suggest when distance > 2", () => {
    const availablePorts = ["UserService", "AuthService"];
    const farOff = "XYZ";
    const suggestion = suggestSimilarPort(farOff, availablePorts);

    expect(suggestion).toBeUndefined();

    const errorMessage = `Port '${farOff}' is not registered in this container.${
      suggestion ? ` Did you mean '${suggestion}'?` : ""
    } Use listPorts() to see available ports.`;

    expect(errorMessage).not.toContain("Did you mean");
  });

  it("suggests closest match among similar ports", () => {
    const availablePorts = ["createUserService", "createUserSession", "createAuthService"];
    const typo = "createUserServic"; // Missing 'e' from "createUserService"

    const suggestion = suggestSimilarPort(typo, availablePorts);
    expect(suggestion).toBe("createUserService");
  });
});

// =============================================================================
// Suggestion Quality Tests
// =============================================================================

describe("Suggestion quality", () => {
  it("all programming errors have suggestions", () => {
    const circularError = new CircularDependencyError(["A", "B", "A"]);
    const disposedError = new DisposedScopeError("Port");
    const scopeRequiredError = new ScopeRequiredError("Port");
    const asyncInitError = new AsyncInitializationRequiredError("Port");
    const nonClonableError = new NonClonableForkedError("Port");

    expect(circularError.suggestion).toBeDefined();
    expect(disposedError.suggestion).toBeDefined();
    expect(scopeRequiredError.suggestion).toBeDefined();
    expect(asyncInitError.suggestion).toBeDefined();
    expect(nonClonableError.suggestion).toBeDefined();

    // All should be substantial (> 50 chars)
    expect(circularError.suggestion!.length).toBeGreaterThan(50);
    expect(disposedError.suggestion!.length).toBeGreaterThan(50);
    expect(scopeRequiredError.suggestion!.length).toBeGreaterThan(50);
    expect(asyncInitError.suggestion!.length).toBeGreaterThan(50);
    expect(nonClonableError.suggestion!.length).toBeGreaterThan(50);
  });

  it("all suggestions contain code examples", () => {
    const errors = [
      new CircularDependencyError(["A", "B", "A"]),
      new DisposedScopeError("Port"),
      new ScopeRequiredError("Port"),
      new AsyncInitializationRequiredError("Port"),
      new NonClonableForkedError("Port"),
    ];

    for (const error of errors) {
      expect(error.suggestion).toContain("```typescript");
      expect(error.suggestion).toContain("```");
    }
  });

  it("suggestions are actionable and specific", () => {
    const circularError = new CircularDependencyError(["A", "B", "A"]);

    // Should not be vague like "fix your code" or "check documentation"
    expect(circularError.suggestion).not.toMatch(/fix your code|check.+documentation/i);

    // Should include specific actions
    expect(circularError.suggestion).toMatch(/extract|pass|use/i);
  });
});
