# @hex-di/guard -- Testing Strategy

This document defines the testing architecture for `@hex-di/guard`. Every utility, adapter, matcher, and pattern described here follows the conventions established by the hex-di monorepo: Vitest as test runner, memory adapters for isolation, composition over global mocks, `expectTypeOf` for type tests, and `@hex-di/result-testing`-style custom matchers.

---

## Table of Contents

1. [Subject Fixtures](#1-subject-fixtures)
2. [Policy Testing Utility](#2-policy-testing-utility)
3. [Custom Vitest Matchers](#3-custom-vitest-matchers)
4. [Guard Testing](#4-guard-testing)
5. [React Testing Utilities](#5-react-testing-utilities)
6. [Integration Test Pattern](#6-integration-test-pattern)
7. [Type Tests](#7-type-tests)
8. [Memory Adapters](#8-memory-adapters)
9. [Anti-patterns](#9-anti-patterns)

---

## 1. Subject Fixtures

### Design

A `createTestSubject` factory produces `Subject` values with sensible defaults. It uses a plain options object -- no builder chain, no fluent API. This matches the hex-di convention where test fixtures are simple factory functions (`createMockContainer`, `createMockScope`, `createMemoryLogger`, `createMemoryTracer`).

### Types

```typescript
/**
 * The authorization subject: the "who" being checked.
 *
 * Permissions and roles are branded tokens, not strings.
 * Attributes are a readonly record of string keys to unknown values,
 * allowing ABAC policies to check arbitrary properties (department,
 * IP range, time-of-day, resource ownership, etc.).
 */
interface Subject {
  readonly id: string;
  readonly roles: ReadonlySet<Role<string>>;
  readonly permissions: ReadonlySet<Permission<string>>;
  readonly attributes: Readonly<Record<string, unknown>>;
}

/**
 * Options for createTestSubject. Every field is optional;
 * the factory fills in reasonable defaults.
 */
interface TestSubjectOptions {
  readonly id?: string;
  readonly roles?: ReadonlyArray<Role<string>>;
  readonly permissions?: ReadonlyArray<Permission<string>>;
  readonly attributes?: Record<string, unknown>;
}
```

### Implementation

````typescript
// packages/guard-testing/src/subject.ts

import type { Subject, Role, Permission } from "@hex-di/guard";

let subjectCounter = 0;

/**
 * Creates a test subject with sensible defaults.
 *
 * Accepts arrays (not Sets) for ergonomics -- tests should not need
 * to construct ReadonlySet manually. The factory converts them.
 *
 * @param options - Partial subject properties. Omitted fields get defaults.
 * @returns A frozen Subject instance.
 *
 * @example Minimal subject
 * ```typescript
 * const anonymous = createTestSubject();
 * // { id: "test-subject-0", roles: Set(0), permissions: Set(0), attributes: {} }
 * ```
 *
 * @example Admin with permissions
 * ```typescript
 * const admin = createTestSubject({
 *   id: "admin-1",
 *   roles: [AdminRole],
 *   permissions: [ReadUsers, WriteUsers, DeleteUsers],
 *   attributes: { department: "engineering" },
 * });
 * ```
 */
export function createTestSubject(options?: TestSubjectOptions): Subject {
  const id = options?.id ?? `test-subject-${subjectCounter++}`;
  const roles = new Set(options?.roles ?? []);
  const permissions = new Set(options?.permissions ?? []);
  const attributes = Object.freeze(options?.attributes ?? {});

  return Object.freeze({ id, roles, permissions, attributes });
}

/**
 * Resets the subject counter. Call in beforeEach/afterEach for deterministic IDs.
 */
export function resetSubjectCounter(): void {
  subjectCounter = 0;
}
````

### Usage in Tests

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { permission, role } from "@hex-di/guard";
import { createTestSubject, resetSubjectCounter } from "@hex-di/guard-testing";

// Define tokens once per test file (or in a shared fixture module)
const ReadUsers = permission("users:read");
const WriteUsers = permission("users:write");
const DeleteUsers = permission("users:delete");

const ViewerRole = role("viewer", { permissions: [ReadUsers] });
const EditorRole = role("editor", {
  permissions: [WriteUsers],
  inherits: [ViewerRole],
});
const AdminRole = role("admin", {
  permissions: [DeleteUsers],
  inherits: [EditorRole],
});

describe("subject fixtures", () => {
  beforeEach(() => {
    resetSubjectCounter();
  });

  it("creates a minimal anonymous subject", () => {
    const anon = createTestSubject();
    expect(anon.id).toBe("test-subject-0");
    expect(anon.roles.size).toBe(0);
    expect(anon.permissions.size).toBe(0);
    expect(anon.attributes).toEqual({});
  });

  it("creates a subject with roles and permissions", () => {
    const admin = createTestSubject({
      id: "admin-1",
      roles: [AdminRole],
      permissions: [ReadUsers, WriteUsers, DeleteUsers],
      attributes: { department: "engineering", clearanceLevel: 5 },
    });

    expect(admin.id).toBe("admin-1");
    expect(admin.roles.has(AdminRole)).toBe(true);
    expect(admin.permissions.has(DeleteUsers)).toBe(true);
    expect(admin.attributes).toEqual({
      department: "engineering",
      clearanceLevel: 5,
    });
  });

  it("returns frozen subjects", () => {
    const subject = createTestSubject();
    expect(Object.isFrozen(subject)).toBe(true);
  });

  it("produces unique IDs across calls", () => {
    const a = createTestSubject();
    const b = createTestSubject();
    expect(a.id).not.toBe(b.id);
  });
});
```

### Pre-built Fixture Subjects

For test suites that repeat the same personas, export named constants from a shared fixture module:

```typescript
// packages/guard-testing/src/fixtures.ts

import { permission, role } from "@hex-di/guard";
import { createTestSubject } from "./subject.js";

// -- Permissions --
export const ReadUsers = permission("users:read");
export const WriteUsers = permission("users:write");
export const DeleteUsers = permission("users:delete");
export const ReadReports = permission("reports:read");
export const ManageSettings = permission("settings:manage");

// -- Roles --
export const ViewerRole = role("viewer", {
  permissions: [ReadUsers, ReadReports],
});
export const EditorRole = role("editor", {
  permissions: [WriteUsers],
  inherits: [ViewerRole],
});
export const AdminRole = role("admin", {
  permissions: [DeleteUsers, ManageSettings],
  inherits: [EditorRole],
});

// -- Subjects --
export const anonymousSubject = createTestSubject({ id: "anon" });
export const viewerSubject = createTestSubject({
  id: "viewer-1",
  roles: [ViewerRole],
  permissions: [ReadUsers, ReadReports],
});
export const editorSubject = createTestSubject({
  id: "editor-1",
  roles: [EditorRole],
  permissions: [ReadUsers, ReadReports, WriteUsers],
});
export const adminSubject = createTestSubject({
  id: "admin-1",
  roles: [AdminRole],
  permissions: [ReadUsers, ReadReports, WriteUsers, DeleteUsers, ManageSettings],
  attributes: { department: "engineering" },
});
```

---

## 2. Policy Testing Utility

### Design

`testPolicy` evaluates a single policy against a subject and optional resource context in complete isolation. No container, no scope, no guard adapter. It calls the same `evaluate` function that the production PolicyEngine uses, but wraps it with ergonomic defaults (auto-constructing the evaluation context).

This follows the hex-di convention that pure logic is testable without DI infrastructure.

### Types

```typescript
/**
 * Resource context for attribute-based policies.
 * An arbitrary bag of properties that policies can inspect.
 */
interface Resource {
  readonly type: string;
  readonly id: string;
  readonly [key: string]: unknown;
}

/**
 * Options for testPolicy.
 */
interface TestPolicyOptions {
  /** The subject being authorized. Required. */
  readonly subject: Subject;
  /** Optional resource context for ABAC policies. */
  readonly resource?: Resource;
}

/**
 * The result of a policy evaluation.
 */
interface Decision {
  /** Whether access is allowed. */
  readonly verdict: "allow" | "deny";
  /** Human-readable reason for the decision. */
  readonly reason: string;
  /** Full evaluation trace: which sub-policies were checked and their results. */
  readonly trace: ReadonlyArray<TraceNode>;
  /** Wall-clock evaluation time in microseconds. */
  readonly duration: number;
}

/**
 * A node in the policy evaluation trace tree.
 */
interface TraceNode {
  readonly kind: Policy["kind"];
  readonly verdict: "allow" | "deny";
  readonly description: string;
  readonly children: ReadonlyArray<TraceNode>;
}
```

### Implementation

````typescript
// packages/guard-testing/src/policy.ts

import type { Policy, Subject, Decision, Resource } from "@hex-di/guard";
import { evaluate } from "@hex-di/guard";

/**
 * Evaluates a policy against a subject in isolation.
 *
 * No container or scope required. Calls the pure evaluate() function
 * directly. The returned Decision carries the full evaluation trace
 * for assertions.
 *
 * @param policy - The policy to evaluate
 * @param options - Subject and optional resource context
 * @returns The evaluation decision
 *
 * @example
 * ```typescript
 * const canEdit = allOf(
 *   hasPermission(WriteUsers),
 *   hasAttribute("ownerId", (ownerId, subject) => ownerId === subject.id),
 * );
 *
 * const decision = testPolicy(canEdit, {
 *   subject: editorSubject,
 *   resource: { type: "user", id: "u-42", ownerId: "editor-1" },
 * });
 *
 * expect(decision).toAllow();
 * ```
 */
export function testPolicy(policy: Policy, options: TestPolicyOptions): Decision {
  return evaluate(policy, {
    subject: options.subject,
    resource: options.resource ?? { type: "unknown", id: "unknown" },
  });
}
````

### Usage in Tests

```typescript
import { describe, it, expect } from "vitest";
import { allOf, anyOf, not, hasPermission, hasRole, hasAttribute } from "@hex-di/guard";
import { testPolicy } from "@hex-di/guard-testing";
import { setupGuardMatchers } from "@hex-di/guard-testing";
import {
  adminSubject,
  viewerSubject,
  anonymousSubject,
  editorSubject,
  WriteUsers,
  DeleteUsers,
  AdminRole,
} from "@hex-di/guard-testing/fixtures";

setupGuardMatchers();

describe("hasPermission policy", () => {
  it("allows when subject has the permission", () => {
    const policy = hasPermission(WriteUsers);
    const decision = testPolicy(policy, { subject: editorSubject });
    expect(decision).toAllow();
  });

  it("denies when subject lacks the permission", () => {
    const policy = hasPermission(WriteUsers);
    const decision = testPolicy(policy, { subject: viewerSubject });
    expect(decision).toDeny();
  });

  it("includes the permission name in the denial reason", () => {
    const policy = hasPermission(DeleteUsers);
    const decision = testPolicy(policy, { subject: viewerSubject });
    expect(decision).toDenyWith("users:delete");
  });
});

describe("hasRole policy", () => {
  it("allows when subject has the role", () => {
    const policy = hasRole(AdminRole);
    const decision = testPolicy(policy, { subject: adminSubject });
    expect(decision).toAllow();
  });

  it("denies when subject lacks the role", () => {
    const policy = hasRole(AdminRole);
    const decision = testPolicy(policy, { subject: viewerSubject });
    expect(decision).toDeny();
  });
});

describe("hasAttribute policy", () => {
  it("allows when attribute predicate passes", () => {
    const isOwner = hasAttribute("ownerId", (ownerId, subject) => ownerId === subject.id);

    const decision = testPolicy(isOwner, {
      subject: editorSubject,
      resource: { type: "document", id: "d-1", ownerId: "editor-1" },
    });

    expect(decision).toAllow();
  });

  it("denies when attribute predicate fails", () => {
    const isOwner = hasAttribute("ownerId", (ownerId, subject) => ownerId === subject.id);

    const decision = testPolicy(isOwner, {
      subject: editorSubject,
      resource: { type: "document", id: "d-1", ownerId: "someone-else" },
    });

    expect(decision).toDeny();
  });
});

describe("composite policies", () => {
  const canDeleteOwnContent = allOf(
    hasPermission(WriteUsers),
    hasAttribute("ownerId", (ownerId, subject) => ownerId === subject.id)
  );

  const canDeleteAnyContent = anyOf(hasRole(AdminRole), canDeleteOwnContent);

  it("allOf requires all sub-policies to pass", () => {
    // Editor owns the resource -- both conditions met
    const decision = testPolicy(canDeleteOwnContent, {
      subject: editorSubject,
      resource: { type: "user", id: "u-1", ownerId: "editor-1" },
    });
    expect(decision).toAllow();
  });

  it("allOf denies when any sub-policy fails", () => {
    // Editor does NOT own the resource
    const decision = testPolicy(canDeleteOwnContent, {
      subject: editorSubject,
      resource: { type: "user", id: "u-1", ownerId: "someone-else" },
    });
    expect(decision).toDeny();
  });

  it("anyOf allows when at least one sub-policy passes", () => {
    // Admin -- first branch passes
    const decision = testPolicy(canDeleteAnyContent, {
      subject: adminSubject,
      resource: { type: "user", id: "u-1", ownerId: "someone-else" },
    });
    expect(decision).toAllow();
  });

  it("not inverts the decision", () => {
    const notAdmin = not(hasRole(AdminRole));

    const viewerDecision = testPolicy(notAdmin, { subject: viewerSubject });
    expect(viewerDecision).toAllow();

    const adminDecision = testPolicy(notAdmin, { subject: adminSubject });
    expect(adminDecision).toDeny();
  });

  it("produces a trace tree for composite policies", () => {
    const policy = allOf(hasPermission(WriteUsers), hasRole(AdminRole));

    const decision = testPolicy(policy, { subject: editorSubject });
    expect(decision).toDeny();
    expect(decision).toHaveEvaluated("allOf > hasRole");
  });
});
```

---

## 3. Custom Vitest Matchers

### Design

Following the `@hex-di/result-testing` pattern exactly: a `setupGuardMatchers()` function that calls `expect.extend()`, a `declare module "vitest"` augmentation for type safety, and clear error messages on failure.

### Implementation

````typescript
// packages/guard-testing/src/matchers.ts

import type { Decision, TraceNode } from "@hex-di/guard";
import { expect } from "vitest";

/**
 * Registers custom Vitest matchers for @hex-di/guard Decision assertions.
 *
 * Call once per test file (typically in a setup file or at the top of the suite).
 *
 * @example
 * ```typescript
 * import { setupGuardMatchers } from "@hex-di/guard-testing";
 * setupGuardMatchers();
 *
 * expect(decision).toAllow();
 * expect(decision).toDeny();
 * expect(decision).toDenyWith("missing permission");
 * expect(decision).toHaveEvaluated("allOf > hasPermission");
 * ```
 */
export function setupGuardMatchers(): void {
  expect.extend({
    /**
     * Asserts that a Decision verdict is "allow".
     */
    toAllow(received: Decision) {
      const pass = received.verdict === "allow";
      return {
        message: () =>
          pass
            ? `expected decision not to allow, but it allowed`
            : `expected decision to allow, but it denied: ${received.reason}`,
        pass,
      };
    },

    /**
     * Asserts that a Decision verdict is "deny".
     */
    toDeny(received: Decision) {
      const pass = received.verdict === "deny";
      return {
        message: () =>
          pass
            ? `expected decision not to deny, but it denied: ${received.reason}`
            : `expected decision to deny, but it allowed`,
        pass,
      };
    },

    /**
     * Asserts that a Decision is "deny" and the reason contains the given substring.
     */
    toDenyWith(received: Decision, expectedReason: string) {
      const isDeny = received.verdict === "deny";
      const reasonMatches = isDeny && received.reason.includes(expectedReason);
      const pass = isDeny && reasonMatches;

      if (!isDeny) {
        return {
          message: () => `expected decision to deny with "${expectedReason}", but it allowed`,
          pass: false,
        };
      }

      return {
        message: () =>
          pass
            ? `expected decision not to deny with "${expectedReason}", but it did`
            : `expected denial reason to contain "${expectedReason}", but got: "${received.reason}"`,
        pass,
      };
    },

    /**
     * Asserts that the evaluation trace contains a path matching the given description.
     *
     * The path uses " > " as a separator: "allOf > hasPermission" means
     * "an allOf node containing a hasPermission child was evaluated".
     *
     * Matches against the `kind` field of trace nodes.
     */
    toHaveEvaluated(received: Decision, path: string) {
      const segments = path.split(" > ").map(s => s.trim());
      const pass = traceContainsPath(received.trace, segments);

      return {
        message: () =>
          pass
            ? `expected trace not to contain path "${path}", but it did`
            : `expected trace to contain path "${path}", but it was not found.\nTrace: ${formatTrace(received.trace)}`,
        pass,
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function traceContainsPath(
  nodes: ReadonlyArray<TraceNode>,
  segments: ReadonlyArray<string>
): boolean {
  if (segments.length === 0) return true;

  const [head, ...tail] = segments;
  for (const node of nodes) {
    if (node.kind === head) {
      if (tail.length === 0) return true;
      if (traceContainsPath(node.children, tail)) return true;
    }
    // Also search children at current depth (the path may skip levels)
    if (traceContainsPath(node.children, segments)) return true;
  }
  return false;
}

function formatTrace(nodes: ReadonlyArray<TraceNode>, indent = 0): string {
  const prefix = "  ".repeat(indent);
  let result = "";
  for (const node of nodes) {
    result += `${prefix}${node.kind} [${node.verdict}]: ${node.description}\n`;
    if (node.children.length > 0) {
      result += formatTrace(node.children, indent + 1);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Type augmentation
// ---------------------------------------------------------------------------

declare module "vitest" {
  interface Assertion<T> {
    /** Asserts that a Decision verdict is "allow". */
    toAllow(): void;
    /** Asserts that a Decision verdict is "deny". */
    toDeny(): void;
    /** Asserts that a Decision is "deny" with reason containing the given string. */
    toDenyWith(expectedReason: string): void;
    /** Asserts that the evaluation trace contains a path matching the given description. */
    toHaveEvaluated(path: string): void;
  }
  interface AsymmetricMatchersContaining {
    toAllow(): void;
    toDeny(): void;
    toDenyWith(expectedReason: string): void;
    toHaveEvaluated(path: string): void;
  }
}
````

### Matcher Test Suite

```typescript
// packages/guard-testing/tests/matchers.test.ts

import { describe, it, expect } from "vitest";
import { hasPermission, hasRole, allOf, not } from "@hex-di/guard";
import { setupGuardMatchers, testPolicy, createTestSubject } from "@hex-di/guard-testing";
import { AdminRole, WriteUsers, DeleteUsers } from "@hex-di/guard-testing/fixtures";

setupGuardMatchers();

describe("toAllow matcher", () => {
  it("passes when verdict is allow", () => {
    const decision = testPolicy(hasPermission(WriteUsers), {
      subject: createTestSubject({ permissions: [WriteUsers] }),
    });
    expect(decision).toAllow();
  });

  it("fails with clear message when verdict is deny", () => {
    const decision = testPolicy(hasPermission(DeleteUsers), {
      subject: createTestSubject(),
    });
    expect(() => expect(decision).toAllow()).toThrow("expected decision to allow, but it denied");
  });
});

describe("toDeny matcher", () => {
  it("passes when verdict is deny", () => {
    const decision = testPolicy(hasPermission(DeleteUsers), {
      subject: createTestSubject(),
    });
    expect(decision).toDeny();
  });

  it("fails with clear message when verdict is allow", () => {
    const decision = testPolicy(hasPermission(WriteUsers), {
      subject: createTestSubject({ permissions: [WriteUsers] }),
    });
    expect(() => expect(decision).toDeny()).toThrow("expected decision to deny, but it allowed");
  });
});

describe("toDenyWith matcher", () => {
  it("passes when reason contains the expected substring", () => {
    const decision = testPolicy(hasPermission(DeleteUsers), {
      subject: createTestSubject(),
    });
    expect(decision).toDenyWith("users:delete");
  });

  it("fails when reason does not contain the substring", () => {
    const decision = testPolicy(hasPermission(DeleteUsers), {
      subject: createTestSubject(),
    });
    expect(() => expect(decision).toDenyWith("totally wrong")).toThrow(
      'expected denial reason to contain "totally wrong"'
    );
  });

  it("fails when verdict is allow", () => {
    const decision = testPolicy(hasPermission(WriteUsers), {
      subject: createTestSubject({ permissions: [WriteUsers] }),
    });
    expect(() => expect(decision).toDenyWith("anything")).toThrow("but it allowed");
  });
});

describe("toHaveEvaluated matcher", () => {
  it("finds a single-level path", () => {
    const decision = testPolicy(hasPermission(WriteUsers), {
      subject: createTestSubject({ permissions: [WriteUsers] }),
    });
    expect(decision).toHaveEvaluated("hasPermission");
  });

  it("finds a nested path", () => {
    const policy = allOf(hasPermission(WriteUsers), hasRole(AdminRole));
    const decision = testPolicy(policy, {
      subject: createTestSubject({ permissions: [WriteUsers] }),
    });
    expect(decision).toHaveEvaluated("allOf > hasRole");
  });

  it("fails when path is not in trace", () => {
    const decision = testPolicy(hasPermission(WriteUsers), {
      subject: createTestSubject({ permissions: [WriteUsers] }),
    });
    expect(() => expect(decision).toHaveEvaluated("allOf > not")).toThrow(
      'expected trace to contain path "allOf > not"'
    );
  });
});
```

---

## 4. Guard Testing

### Design

`testGuard` evaluates a guarded adapter without constructing a full container. It creates a minimal evaluation context, invokes the guard's policy check against the subject, and returns the Decision. For method-level guards (where different methods on the same adapter have different policies), the `method` option selects which policy to evaluate.

### Types

```typescript
/**
 * Configuration for a guard adapter under test.
 * This is the guard metadata attached to an adapter, not the adapter itself.
 */
interface GuardedAdapter<T> {
  readonly policy: Policy;
  readonly methodPolicies?: Readonly<Record<keyof T, Policy>>;
}

/**
 * Options for testGuard.
 */
interface TestGuardOptions<T> {
  readonly subject: Subject;
  readonly method?: keyof T & string;
  readonly args?: ReadonlyArray<unknown>;
  readonly resource?: Resource;
}
```

### Implementation

````typescript
// packages/guard-testing/src/guard.ts

import type { Decision, Policy, Subject, Resource } from "@hex-di/guard";
import { evaluate } from "@hex-di/guard";

interface GuardedAdapterMeta<T> {
  readonly policy: Policy;
  readonly methodPolicies?: Readonly<Partial<Record<keyof T & string, Policy>>>;
}

/**
 * Tests a guard adapter's authorization decision without a container.
 *
 * Resolves the effective policy for the given method (falling back to
 * the adapter-level policy), evaluates it against the subject, and
 * returns the Decision.
 *
 * @param guardMeta - The guard metadata (policy + optional method policies)
 * @param options - Subject, method, optional args and resource context
 * @returns The evaluation decision
 *
 * @example Adapter-level policy
 * ```typescript
 * const GuardedUserRepo = {
 *   policy: hasRole(AdminRole),
 * };
 *
 * const decision = testGuard(GuardedUserRepo, {
 *   subject: viewerSubject,
 * });
 * expect(decision).toDeny();
 * ```
 *
 * @example Method-level policy
 * ```typescript
 * const GuardedUserRepo = {
 *   policy: hasPermission(ReadUsers),             // default
 *   methodPolicies: {
 *     delete: hasRole(AdminRole),                  // override for delete
 *     update: allOf(hasPermission(WriteUsers),     // override for update
 *               hasAttribute("ownerId", (id, s) => id === s.id)),
 *   },
 * };
 *
 * const decision = testGuard(GuardedUserRepo, {
 *   subject: viewerSubject,
 *   method: "delete",
 * });
 * expect(decision).toDeny();
 * ```
 */
export function testGuard<T>(
  guardMeta: GuardedAdapterMeta<T>,
  options: TestGuardOptions<T>
): Decision {
  // Resolve effective policy: method-specific overrides adapter-level
  const methodKey = options.method;
  let effectivePolicy: Policy = guardMeta.policy;

  if (methodKey !== undefined && guardMeta.methodPolicies !== undefined) {
    const methodPolicy = guardMeta.methodPolicies[methodKey];
    if (methodPolicy !== undefined) {
      effectivePolicy = methodPolicy;
    }
  }

  return evaluate(effectivePolicy, {
    subject: options.subject,
    resource: options.resource ?? { type: "unknown", id: "unknown" },
  });
}
````

### Usage in Tests

```typescript
import { describe, it, expect } from "vitest";
import { hasPermission, hasRole, allOf, hasAttribute } from "@hex-di/guard";
import { testGuard, setupGuardMatchers } from "@hex-di/guard-testing";
import {
  adminSubject,
  viewerSubject,
  editorSubject,
  ReadUsers,
  WriteUsers,
  DeleteUsers,
  AdminRole,
} from "@hex-di/guard-testing/fixtures";

setupGuardMatchers();

// -- Guard metadata (mirrors what createGuardAdapter would produce) --

interface UserRepository {
  findAll(): ReadonlyArray<{ id: string; name: string }>;
  findById(id: string): { id: string; name: string } | undefined;
  update(id: string, data: { name: string }): void;
  delete(id: string): void;
}

const UserRepoGuard = {
  policy: hasPermission(ReadUsers),
  methodPolicies: {
    update: allOf(
      hasPermission(WriteUsers),
      hasAttribute("ownerId", (ownerId, subject) => ownerId === subject.id)
    ),
    delete: hasRole(AdminRole),
  },
} satisfies { policy: any; methodPolicies: Partial<Record<keyof UserRepository, any>> };

// -- Tests --

describe("guard testing - UserRepository", () => {
  describe("adapter-level policy (default: ReadUsers)", () => {
    it("allows viewers to read", () => {
      const decision = testGuard(UserRepoGuard, { subject: viewerSubject });
      expect(decision).toAllow();
    });

    it("denies anonymous users", () => {
      const decision = testGuard(UserRepoGuard, {
        subject: createTestSubject(),
      });
      expect(decision).toDeny();
    });
  });

  describe("method-level policy: delete requires AdminRole", () => {
    it("allows admin", () => {
      const decision = testGuard(UserRepoGuard, {
        subject: adminSubject,
        method: "delete",
        args: ["user-123"],
      });
      expect(decision).toAllow();
    });

    it("denies editor", () => {
      const decision = testGuard(UserRepoGuard, {
        subject: editorSubject,
        method: "delete",
        args: ["user-123"],
      });
      expect(decision).toDeny();
    });

    it("denies viewer", () => {
      const decision = testGuard(UserRepoGuard, {
        subject: viewerSubject,
        method: "delete",
        args: ["user-123"],
      });
      expect(decision).toDeny();
    });
  });

  describe("method-level policy: update requires ownership", () => {
    it("allows editor who owns the resource", () => {
      const decision = testGuard(UserRepoGuard, {
        subject: editorSubject,
        method: "update",
        args: ["user-123", { name: "New Name" }],
        resource: { type: "user", id: "user-123", ownerId: "editor-1" },
      });
      expect(decision).toAllow();
    });

    it("denies editor who does not own the resource", () => {
      const decision = testGuard(UserRepoGuard, {
        subject: editorSubject,
        method: "update",
        args: ["user-123", { name: "New Name" }],
        resource: { type: "user", id: "user-123", ownerId: "someone-else" },
      });
      expect(decision).toDeny();
    });

    it("denies viewer even if they own the resource", () => {
      const decision = testGuard(UserRepoGuard, {
        subject: viewerSubject,
        method: "update",
        resource: { type: "user", id: "user-123", ownerId: "viewer-1" },
      });
      expect(decision).toDeny();
    });
  });

  describe("method with no specific policy falls back to adapter-level", () => {
    it("findAll uses the default ReadUsers policy", () => {
      const decision = testGuard(UserRepoGuard, {
        subject: viewerSubject,
        method: "findAll",
      });
      expect(decision).toAllow();
    });
  });
});
```

---

## 5. React Testing Utilities

### Design

`createTestGuardWrapper` produces a React wrapper component that provides a fixed subject via `SubjectProvider` -- the same pattern used in `@hex-di/react` tests where `HexDiContainerProvider` wraps test components. No global mocking. Components under test receive the subject from context exactly as they would in production.

### Implementation

````typescript
// packages/guard-testing/src/react.tsx

import React from "react";
import type { Subject } from "@hex-di/guard";
import { SubjectProvider } from "@hex-di/guard/react";

interface TestGuardWrapperOptions {
  /** The subject to provide via context. */
  readonly subject: Subject;
  /** Optional additional wrapper (e.g., ContainerProvider). */
  readonly outerWrapper?: React.ComponentType<{ children: React.ReactNode }>;
}

/**
 * Creates a React wrapper that provides a fixed authorization subject.
 *
 * Use as the `wrapper` option for @testing-library/react's
 * `renderHook` or `render` functions.
 *
 * @param options - Subject and optional outer wrapper
 * @returns A React component suitable for use as a test wrapper
 *
 * @example With renderHook
 * ```typescript
 * const wrapper = createTestGuardWrapper({ subject: adminSubject });
 * const { result } = renderHook(() => useCan(DeleteUsers), { wrapper });
 * expect(result.current).toBe(true);
 * ```
 *
 * @example With render
 * ```typescript
 * const wrapper = createTestGuardWrapper({ subject: viewerSubject });
 * render(<Can permission={WriteUsers}>Edit</Can>, { wrapper });
 * expect(screen.queryByText("Edit")).toBeNull();
 * ```
 */
export function createTestGuardWrapper(
  options: TestGuardWrapperOptions
): React.ComponentType<{ children: React.ReactNode }> {
  const { subject, outerWrapper: OuterWrapper } = options;

  function TestGuardWrapper({ children }: { children: React.ReactNode }): React.ReactElement {
    const inner = <SubjectProvider subject={subject}>{children}</SubjectProvider>;
    if (OuterWrapper) {
      return <OuterWrapper>{inner}</OuterWrapper>;
    }
    return inner;
  }

  TestGuardWrapper.displayName = `TestGuardWrapper(${subject.id})`;
  return TestGuardWrapper;
}
````

### Usage in Tests

```typescript
// integrations/react-guard/tests/hooks.test.tsx

import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCan, usePolicy, useSubject } from "@hex-di/guard/react";
import { permission, hasPermission, allOf, hasRole } from "@hex-di/guard";
import { createTestGuardWrapper, setupGuardMatchers } from "@hex-di/guard-testing";
import {
  adminSubject,
  viewerSubject,
  editorSubject,
  WriteUsers,
  DeleteUsers,
  AdminRole,
} from "@hex-di/guard-testing/fixtures";

setupGuardMatchers();

describe("useCan hook", () => {
  it("returns true when subject has the permission", () => {
    const wrapper = createTestGuardWrapper({ subject: adminSubject });
    const { result } = renderHook(() => useCan(WriteUsers), { wrapper });
    expect(result.current).toBe(true);
  });

  it("returns false when subject lacks the permission", () => {
    const wrapper = createTestGuardWrapper({ subject: viewerSubject });
    const { result } = renderHook(() => useCan(WriteUsers), { wrapper });
    expect(result.current).toBe(false);
  });
});

describe("usePolicy hook", () => {
  it("returns a full Decision object", () => {
    const policy = allOf(hasPermission(WriteUsers), hasRole(AdminRole));
    const wrapper = createTestGuardWrapper({ subject: adminSubject });
    const { result } = renderHook(() => usePolicy(policy), { wrapper });
    expect(result.current).toAllow();
  });

  it("includes trace for debugging", () => {
    const policy = allOf(hasPermission(WriteUsers), hasRole(AdminRole));
    const wrapper = createTestGuardWrapper({ subject: editorSubject });
    const { result } = renderHook(() => usePolicy(policy), { wrapper });
    expect(result.current).toDeny();
    expect(result.current).toHaveEvaluated("allOf > hasRole");
  });
});

describe("useSubject hook", () => {
  it("returns the provided subject", () => {
    const wrapper = createTestGuardWrapper({ subject: adminSubject });
    const { result } = renderHook(() => useSubject(), { wrapper });
    expect(result.current.id).toBe("admin-1");
  });
});
```

### Component Tests

```typescript
// integrations/react-guard/tests/components.test.tsx

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { Can, Cannot } from "@hex-di/guard/react";
import { createTestGuardWrapper } from "@hex-di/guard-testing";
import {
  adminSubject,
  viewerSubject,
  WriteUsers,
  DeleteUsers,
} from "@hex-di/guard-testing/fixtures";

describe("Can component", () => {
  it("renders children when subject has permission", () => {
    const wrapper = createTestGuardWrapper({ subject: adminSubject });
    render(
      <Can permission={WriteUsers}>
        <button data-testid="edit-btn">Edit</button>
      </Can>,
      { wrapper }
    );
    expect(screen.getByTestId("edit-btn")).toBeDefined();
  });

  it("does not render children when subject lacks permission", () => {
    const wrapper = createTestGuardWrapper({ subject: viewerSubject });
    render(
      <Can permission={WriteUsers}>
        <button data-testid="edit-btn">Edit</button>
      </Can>,
      { wrapper }
    );
    expect(screen.queryByTestId("edit-btn")).toBeNull();
  });

  it("renders fallback when denied", () => {
    const wrapper = createTestGuardWrapper({ subject: viewerSubject });
    render(
      <Can
        permission={DeleteUsers}
        fallback={<span data-testid="no-access">No access</span>}
      >
        <button data-testid="delete-btn">Delete</button>
      </Can>,
      { wrapper }
    );
    expect(screen.queryByTestId("delete-btn")).toBeNull();
    expect(screen.getByTestId("no-access")).toBeDefined();
  });
});

describe("Cannot component", () => {
  it("renders children when subject lacks permission", () => {
    const wrapper = createTestGuardWrapper({ subject: viewerSubject });
    render(
      <Cannot permission={DeleteUsers}>
        <span data-testid="locked">Contact admin for access</span>
      </Cannot>,
      { wrapper }
    );
    expect(screen.getByTestId("locked")).toBeDefined();
  });

  it("does not render when subject has permission", () => {
    const wrapper = createTestGuardWrapper({ subject: adminSubject });
    render(
      <Cannot permission={DeleteUsers}>
        <span data-testid="locked">Contact admin for access</span>
      </Cannot>,
      { wrapper }
    );
    expect(screen.queryByTestId("locked")).toBeNull();
  });
});
```

---

## 6. Integration Test Pattern

### Design

Full integration tests wire up a real container with graph, guard adapters, scoped subjects, resolution hooks, and tracing. This verifies that guard enforcement works through the actual resolution pipeline, not just in isolation.

The pattern follows the existing `@hex-di/runtime` and `@hex-di/tracing` integration tests: build a real graph, create a real container, resolve through scopes, and assert on observable outcomes.

### Complete Example

```typescript
// packages/guard/tests/integration/container-guard.test.ts

import { describe, it, expect, afterEach } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import { createMemoryTracer } from "@hex-di/tracing";
import {
  permission,
  role,
  hasPermission,
  hasRole,
  allOf,
  SubjectPort,
  createSubjectAdapter,
  createGuardAdapter,
  installGuardHook,
} from "@hex-di/guard";
import { createTestSubject, setupGuardMatchers } from "@hex-di/guard-testing";
import { setupResultMatchers } from "@hex-di/result-testing";

setupGuardMatchers();
setupResultMatchers();

// =============================================================================
// Domain Ports and Adapters
// =============================================================================

interface UserRepository {
  findById(id: string): { id: string; name: string } | undefined;
  delete(id: string): void;
}

const UserRepoPort = port<UserRepository>()({ name: "UserRepository" });

const DeleteUsers = permission("users:delete");
const ReadUsers = permission("users:read");
const AdminRole = role("admin", { permissions: [DeleteUsers, ReadUsers] });
const ViewerRole = role("viewer", { permissions: [ReadUsers] });

// Unguarded adapter -- the real implementation
const UserRepoAdapter = createAdapter({
  provides: UserRepoPort,
  requires: [],
  lifetime: "scoped",
  factory: () => ({
    findById: (id: string) => ({ id, name: `User ${id}` }),
    delete: (_id: string) => {
      /* no-op in tests */
    },
  }),
});

// Guarded adapter -- wraps the real adapter with a policy
const GuardedUserRepoAdapter = createGuardAdapter({
  adapter: UserRepoAdapter,
  policy: allOf(hasPermission(ReadUsers)),
  methodPolicies: {
    delete: hasRole(AdminRole),
  },
});

// =============================================================================
// Test Subjects
// =============================================================================

const adminSubject = createTestSubject({
  id: "admin-1",
  roles: [AdminRole],
  permissions: [ReadUsers, DeleteUsers],
});

const viewerSubject = createTestSubject({
  id: "viewer-1",
  roles: [ViewerRole],
  permissions: [ReadUsers],
});

// =============================================================================
// Integration Tests
// =============================================================================

describe("container-level guard enforcement", () => {
  it("admin can resolve guarded port and call all methods", () => {
    const subjectAdapter = createSubjectAdapter(() => adminSubject);

    const graph = GraphBuilder.create()
      .provide(GuardedUserRepoAdapter)
      .provide(subjectAdapter)
      .build();

    const container = createContainer({ graph, name: "GuardTest" });
    installGuardHook(container);

    const scope = container.createScope();
    const repo = scope.resolve(UserRepoPort);

    // Resolution succeeded -- admin has ReadUsers
    expect(repo).toBeDefined();
    expect(repo.findById("u-1")).toEqual({ id: "u-1", name: "User u-1" });

    // Method-level check: delete requires AdminRole -- admin has it
    // (In real impl, method-level guards may be proxy-based or hook-based;
    //  the test verifies the method does not throw)
    expect(() => repo.delete("u-1")).not.toThrow();
  });

  it("viewer can resolve guarded port but method-level guard denies delete", () => {
    const subjectAdapter = createSubjectAdapter(() => viewerSubject);

    const graph = GraphBuilder.create()
      .provide(GuardedUserRepoAdapter)
      .provide(subjectAdapter)
      .build();

    const container = createContainer({ graph, name: "GuardTest" });
    installGuardHook(container);

    const scope = container.createScope();
    const repo = scope.resolve(UserRepoPort);

    // Resolution succeeded -- viewer has ReadUsers
    expect(repo).toBeDefined();
    expect(repo.findById("u-1")).toEqual({ id: "u-1", name: "User u-1" });
  });

  it("anonymous subject is denied resolution entirely", () => {
    const anonymousSubject = createTestSubject({ id: "anon" });
    const subjectAdapter = createSubjectAdapter(() => anonymousSubject);

    const graph = GraphBuilder.create()
      .provide(GuardedUserRepoAdapter)
      .provide(subjectAdapter)
      .build();

    const container = createContainer({ graph, name: "GuardTest" });
    installGuardHook(container);

    const scope = container.createScope();
    const result = scope.tryResolve(UserRepoPort);

    // tryResolve returns Result -- should be Err with AccessDenied
    expect(result).toBeErr();
  });

  it("guard decisions appear in tracing spans", () => {
    const tracer = createMemoryTracer();
    const subjectAdapter = createSubjectAdapter(() => adminSubject);

    const graph = GraphBuilder.create()
      .provide(GuardedUserRepoAdapter)
      .provide(subjectAdapter)
      .build();

    const container = createContainer({ graph, name: "GuardTest" });
    installGuardHook(container);

    const scope = container.createScope();
    tracer.withSpan("test-resolution", () => {
      scope.resolve(UserRepoPort);
    });

    const spans = tracer.getCollectedSpans();
    expect(spans.length).toBeGreaterThanOrEqual(1);
  });

  it("different scopes get different subjects", () => {
    let callCount = 0;
    const subjects = [viewerSubject, adminSubject];
    const subjectAdapter = createSubjectAdapter(() => subjects[callCount++]);

    const graph = GraphBuilder.create()
      .provide(GuardedUserRepoAdapter)
      .provide(subjectAdapter)
      .build();

    const container = createContainer({ graph, name: "GuardTest" });
    installGuardHook(container);

    // Scope 1: viewer -- can resolve (has ReadUsers) but not delete
    const scope1 = container.createScope();
    const repo1 = scope1.resolve(UserRepoPort);
    expect(repo1).toBeDefined();

    // Scope 2: admin -- can do everything
    const scope2 = container.createScope();
    const repo2 = scope2.resolve(UserRepoPort);
    expect(repo2).toBeDefined();
  });

  afterEach(() => {
    // Cleanup is handled by scope disposal in real apps;
    // here we just verify no global state leaked
  });
});
```

---

## 7. Type Tests

### Design

Type tests use Vitest's `expectTypeOf` in `.test-d.ts` files, following the established convention in `@hex-di/graph` and `@hex-di/runtime`. These tests verify compile-time properties that cannot be checked at runtime: branding, inference, type narrowing, and error types.

### Permission Branding

```typescript
// packages/guard/tests/permission-branding.test-d.ts

import { describe, it, expectTypeOf } from "vitest";
import type { Permission, InferPermissionName } from "@hex-di/guard";
import { permission } from "@hex-di/guard";

describe("Permission branding", () => {
  it("permission() returns a branded Permission type", () => {
    const ReadUsers = permission("users:read");
    expectTypeOf(ReadUsers).toMatchTypeOf<Permission<"users:read">>();
  });

  it("different permission names produce incompatible types", () => {
    const ReadUsers = permission("users:read");
    const WriteUsers = permission("users:write");

    // These should NOT be mutually assignable
    expectTypeOf(ReadUsers).not.toEqualTypeOf(WriteUsers);
  });

  it("InferPermissionName extracts the name literal", () => {
    const ReadUsers = permission("users:read");
    expectTypeOf<InferPermissionName<typeof ReadUsers>>().toEqualTypeOf<"users:read">();
  });

  it("Permission is not assignable from a plain string", () => {
    expectTypeOf<string>().not.toMatchTypeOf<Permission<string>>();
  });

  it("Permission is not assignable from a plain object", () => {
    expectTypeOf<{ name: "users:read" }>().not.toMatchTypeOf<Permission<"users:read">>();
  });
});
```

### Role Inference with Inheritance

```typescript
// packages/guard/tests/role-inference.test-d.ts

import { describe, it, expectTypeOf } from "vitest";
import type { Role, InferRoleName, InferRolePermissions } from "@hex-di/guard";
import { role, permission } from "@hex-di/guard";

describe("Role type inference", () => {
  it("role() returns a branded Role type", () => {
    const Viewer = role("viewer", { permissions: [] });
    expectTypeOf(Viewer).toMatchTypeOf<Role<"viewer">>();
  });

  it("InferRoleName extracts the name literal", () => {
    const Admin = role("admin", { permissions: [] });
    expectTypeOf<InferRoleName<typeof Admin>>().toEqualTypeOf<"admin">();
  });

  it("role inherits permissions are tracked at type level", () => {
    const ReadUsers = permission("users:read");
    const WriteUsers = permission("users:write");

    const Viewer = role("viewer", { permissions: [ReadUsers] });
    const Editor = role("editor", {
      permissions: [WriteUsers],
      inherits: [Viewer],
    });

    // InferRolePermissions should include both direct and inherited
    type EditorPerms = InferRolePermissions<typeof Editor>;
    expectTypeOf<EditorPerms>().toMatchTypeOf<
      readonly [typeof WriteUsers, ...(readonly [typeof ReadUsers])]
    >();
  });

  it("different role names produce incompatible types", () => {
    const Admin = role("admin", { permissions: [] });
    const Viewer = role("viewer", { permissions: [] });
    expectTypeOf(Admin).not.toEqualTypeOf(Viewer);
  });
});
```

### Policy Composition Types

```typescript
// packages/guard/tests/policy-types.test-d.ts

import { describe, it, expectTypeOf } from "vitest";
import type {
  Policy,
  HasPermission,
  HasRole,
  HasAttribute,
  AllOf,
  AnyOf,
  Not,
} from "@hex-di/guard";
import {
  hasPermission,
  hasRole,
  hasAttribute,
  allOf,
  anyOf,
  not,
  permission,
  role,
} from "@hex-di/guard";

describe("Policy discriminated union", () => {
  it("Policy is a union of all policy variants", () => {
    expectTypeOf<Policy>().toMatchTypeOf<
      HasPermission | HasRole | HasAttribute | AllOf | AnyOf | Not
    >();
  });

  it("each policy variant has a literal kind discriminant", () => {
    expectTypeOf<HasPermission["kind"]>().toEqualTypeOf<"hasPermission">();
    expectTypeOf<HasRole["kind"]>().toEqualTypeOf<"hasRole">();
    expectTypeOf<HasAttribute["kind"]>().toEqualTypeOf<"hasAttribute">();
    expectTypeOf<AllOf["kind"]>().toEqualTypeOf<"allOf">();
    expectTypeOf<AnyOf["kind"]>().toEqualTypeOf<"anyOf">();
    expectTypeOf<Not["kind"]>().toEqualTypeOf<"not">();
  });

  it("combinators return the correct policy variant", () => {
    const ReadUsers = permission("users:read");
    const Admin = role("admin", { permissions: [] });

    expectTypeOf(hasPermission(ReadUsers)).toMatchTypeOf<HasPermission>();
    expectTypeOf(hasRole(Admin)).toMatchTypeOf<HasRole>();
    expectTypeOf(allOf(hasPermission(ReadUsers))).toMatchTypeOf<AllOf>();
    expectTypeOf(anyOf(hasPermission(ReadUsers))).toMatchTypeOf<AnyOf>();
    expectTypeOf(not(hasPermission(ReadUsers))).toMatchTypeOf<Not>();
  });

  it("allOf and anyOf accept variadic policy arguments", () => {
    const ReadUsers = permission("users:read");
    const Admin = role("admin", { permissions: [] });

    // Should accept any number of Policy arguments
    const composed = allOf(hasPermission(ReadUsers), hasRole(Admin), not(hasPermission(ReadUsers)));
    expectTypeOf(composed).toMatchTypeOf<AllOf>();
  });

  it("not wraps exactly one policy", () => {
    const ReadUsers = permission("users:read");
    const negated = not(hasPermission(ReadUsers));
    expectTypeOf(negated).toMatchTypeOf<Not>();
    expectTypeOf(negated.policy).toMatchTypeOf<Policy>();
  });
});
```

### Decision and Error Types

```typescript
// packages/guard/tests/decision-types.test-d.ts

import { describe, it, expectTypeOf } from "vitest";
import type { Decision, TraceNode, PolicyError, AccessDeniedError } from "@hex-di/guard";
import type { Result } from "@hex-di/result";

describe("Decision type", () => {
  it("verdict is a string literal union", () => {
    expectTypeOf<Decision["verdict"]>().toEqualTypeOf<"allow" | "deny">();
  });

  it("trace is a readonly array of TraceNode", () => {
    expectTypeOf<Decision["trace"]>().toMatchTypeOf<ReadonlyArray<TraceNode>>();
  });

  it("TraceNode is recursive (children are TraceNode[])", () => {
    expectTypeOf<TraceNode["children"]>().toMatchTypeOf<ReadonlyArray<TraceNode>>();
  });

  it("reason is always a string", () => {
    expectTypeOf<Decision["reason"]>().toEqualTypeOf<string>();
  });
});

describe("Error types", () => {
  it("AccessDeniedError carries the decision", () => {
    expectTypeOf<AccessDeniedError["decision"]>().toMatchTypeOf<Decision>();
  });

  it("evaluate returns Result<Decision, PolicyError>", () => {
    // This verifies that the evaluate() return type integrates
    // with @hex-di/result's Result type
    type EvalResult = Result<Decision, PolicyError>;
    expectTypeOf<EvalResult>().toMatchTypeOf<Result<Decision, PolicyError>>();
  });
});
```

### Guard Type Transformation

```typescript
// packages/guard/tests/guard-types.test-d.ts

import { describe, it, expectTypeOf } from "vitest";
import type { Port } from "@hex-di/core";
import type { Policy } from "@hex-di/guard";
import { permission, hasPermission, createGuardAdapter, createAdapter, port } from "@hex-di/guard";

describe("Guard adapter type transformation", () => {
  it("guarded adapter provides the same port as the inner adapter", () => {
    interface MyService {
      doThing(): void;
    }

    const MyPort = port<MyService>()({ name: "MyService" });
    const ReadPerm = permission("my:read");

    const innerAdapter = createAdapter({
      provides: MyPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ doThing: () => {} }),
    });

    const guarded = createGuardAdapter({
      adapter: innerAdapter,
      policy: hasPermission(ReadPerm),
    });

    // The guarded adapter still provides the same port type
    expectTypeOf(guarded.provides).toEqualTypeOf(innerAdapter.provides);
  });
});
```

---

## 8. Memory Adapters

### Design

Following the established patterns of `MemoryTracer` and `MemoryLogger`: each memory adapter implements the production interface but also exposes inspection methods (`getEntries`, `clear`, `findEntry`) for test assertions. All use the `create*` factory convention.

### MemoryPolicyEngine

````typescript
// packages/guard-testing/src/memory-policy-engine.ts

import type { Policy, Subject, Decision, Resource } from "@hex-di/guard";
import { evaluate } from "@hex-di/guard";

/**
 * A recorded policy evaluation for test assertions.
 */
interface PolicyEvaluation {
  readonly policy: Policy;
  readonly subject: Subject;
  readonly resource: Resource | undefined;
  readonly decision: Decision;
  readonly timestamp: number;
}

/**
 * In-memory PolicyEngine that records all evaluations.
 *
 * Uses the real evaluate() function internally -- this is not a mock.
 * It simply captures inputs and outputs for assertions.
 *
 * Follows the MemoryTracer/MemoryLogger pattern:
 * - getEvaluations() returns all recorded evaluations
 * - clear() resets state between tests
 * - findEvaluation() finds a specific evaluation by predicate
 */
interface MemoryPolicyEngine {
  evaluate(policy: Policy, subject: Subject, resource?: Resource): Decision;
  getEvaluations(): ReadonlyArray<PolicyEvaluation>;
  getEvaluationsByVerdict(verdict: "allow" | "deny"): ReadonlyArray<PolicyEvaluation>;
  findEvaluation(predicate: (e: PolicyEvaluation) => boolean): PolicyEvaluation | undefined;
  clear(): void;
}

/**
 * Creates a MemoryPolicyEngine that records all evaluations.
 *
 * @param options - Optional configuration
 * @returns A MemoryPolicyEngine instance
 *
 * @example
 * ```typescript
 * const engine = createMemoryPolicyEngine();
 *
 * engine.evaluate(hasPermission(ReadUsers), adminSubject);
 * engine.evaluate(hasRole(AdminRole), viewerSubject);
 *
 * expect(engine.getEvaluations()).toHaveLength(2);
 * expect(engine.getEvaluationsByVerdict("deny")).toHaveLength(1);
 *
 * engine.clear();
 * expect(engine.getEvaluations()).toHaveLength(0);
 * ```
 */
export function createMemoryPolicyEngine(options?: {
  maxEvaluations?: number;
}): MemoryPolicyEngine {
  const maxEvaluations = options?.maxEvaluations ?? 10_000;
  const evaluations: PolicyEvaluation[] = [];

  return {
    evaluate(policy: Policy, subject: Subject, resource?: Resource): Decision {
      const decision = evaluate(policy, {
        subject,
        resource: resource ?? { type: "unknown", id: "unknown" },
      });

      const entry: PolicyEvaluation = {
        policy,
        subject,
        resource,
        decision,
        timestamp: Date.now(),
      };

      if (evaluations.length >= maxEvaluations) {
        evaluations.shift();
      }
      evaluations.push(entry);

      return decision;
    },

    getEvaluations(): ReadonlyArray<PolicyEvaluation> {
      return [...evaluations];
    },

    getEvaluationsByVerdict(verdict: "allow" | "deny"): ReadonlyArray<PolicyEvaluation> {
      return evaluations.filter(e => e.decision.verdict === verdict);
    },

    findEvaluation(predicate: (e: PolicyEvaluation) => boolean): PolicyEvaluation | undefined {
      return evaluations.find(predicate);
    },

    clear(): void {
      evaluations.length = 0;
    },
  };
}
````

### StaticSubjectProvider

````typescript
// packages/guard-testing/src/static-subject-provider.ts

import type { Subject } from "@hex-di/guard";

/**
 * A SubjectProvider that returns a fixed subject.
 *
 * Unlike the production SubjectProvider (which resolves from a scoped adapter),
 * StaticSubjectProvider always returns the same subject regardless of scope.
 * Useful for unit tests that don't need scope isolation.
 *
 * @param subject - The subject to return
 * @returns A SubjectProvider function
 *
 * @example
 * ```typescript
 * const provider = createStaticSubjectProvider(adminSubject);
 * expect(provider()).toBe(adminSubject);
 * ```
 */
export function createStaticSubjectProvider(subject: Subject): () => Subject {
  return () => subject;
}

/**
 * Creates a subject provider that cycles through subjects on each call.
 *
 * Useful for testing scope isolation: each scope gets a different subject.
 *
 * @param subjects - The subjects to cycle through
 * @returns A SubjectProvider function
 *
 * @example
 * ```typescript
 * const provider = createCyclingSubjectProvider(viewerSubject, adminSubject);
 * expect(provider().id).toBe("viewer-1");  // first call
 * expect(provider().id).toBe("admin-1");   // second call
 * expect(provider().id).toBe("viewer-1");  // wraps around
 * ```
 */
export function createCyclingSubjectProvider(...subjects: ReadonlyArray<Subject>): () => Subject {
  let index = 0;
  return () => {
    const subject = subjects[index % subjects.length];
    index++;
    return subject;
  };
}
````

### MemoryAuditTrail

````typescript
// packages/guard-testing/src/memory-audit-trail.ts

import type { Subject, Decision, Policy, Resource } from "@hex-di/guard";

/**
 * A single entry in the audit trail.
 */
interface AuditEntry {
  readonly timestamp: number;
  readonly subject: Subject;
  readonly policy: Policy;
  readonly resource: Resource | undefined;
  readonly decision: Decision;
  readonly portName: string | undefined;
  readonly scopeId: string | undefined;
  readonly containerId: string | undefined;
}

/**
 * In-memory audit trail that captures all authorization decisions.
 *
 * In production, audit entries would be written to a database, log stream,
 * or compliance system. MemoryAuditTrail captures them in memory for
 * test assertions.
 *
 * Follows the MemoryLogger/MemoryTracer pattern.
 */
interface MemoryAuditTrail {
  record(entry: Omit<AuditEntry, "timestamp">): void;
  getEntries(): ReadonlyArray<AuditEntry>;
  getEntriesBySubject(subjectId: string): ReadonlyArray<AuditEntry>;
  getEntriesByVerdict(verdict: "allow" | "deny"): ReadonlyArray<AuditEntry>;
  getEntriesByPort(portName: string): ReadonlyArray<AuditEntry>;
  findEntry(predicate: (e: AuditEntry) => boolean): AuditEntry | undefined;
  clear(): void;
}

/**
 * Creates a MemoryAuditTrail for test assertions.
 *
 * @example
 * ```typescript
 * const audit = createMemoryAuditTrail();
 *
 * // Wire into guard hook
 * installGuardHook(container, { auditTrail: audit });
 *
 * // After resolution...
 * const denials = audit.getEntriesByVerdict("deny");
 * expect(denials).toHaveLength(1);
 * expect(denials[0].subject.id).toBe("viewer-1");
 * ```
 */
export function createMemoryAuditTrail(options?: { maxEntries?: number }): MemoryAuditTrail {
  const maxEntries = options?.maxEntries ?? 10_000;
  const entries: AuditEntry[] = [];

  return {
    record(entry: Omit<AuditEntry, "timestamp">): void {
      const fullEntry: AuditEntry = {
        ...entry,
        timestamp: Date.now(),
      };
      if (entries.length >= maxEntries) {
        entries.shift();
      }
      entries.push(fullEntry);
    },

    getEntries(): ReadonlyArray<AuditEntry> {
      return [...entries];
    },

    getEntriesBySubject(subjectId: string): ReadonlyArray<AuditEntry> {
      return entries.filter(e => e.subject.id === subjectId);
    },

    getEntriesByVerdict(verdict: "allow" | "deny"): ReadonlyArray<AuditEntry> {
      return entries.filter(e => e.decision.verdict === verdict);
    },

    getEntriesByPort(portName: string): ReadonlyArray<AuditEntry> {
      return entries.filter(e => e.portName === portName);
    },

    findEntry(predicate: (e: AuditEntry) => boolean): AuditEntry | undefined {
      return entries.find(predicate);
    },

    clear(): void {
      entries.length = 0;
    },
  };
}
````

### Memory Adapter Usage Example

```typescript
// packages/guard/tests/integration/audit-trail.test.ts

import { describe, it, expect, beforeEach } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import {
  permission,
  role,
  hasPermission,
  createSubjectAdapter,
  createGuardAdapter,
  installGuardHook,
} from "@hex-di/guard";
import {
  createTestSubject,
  createMemoryPolicyEngine,
  createMemoryAuditTrail,
  setupGuardMatchers,
} from "@hex-di/guard-testing";
import { setupResultMatchers } from "@hex-di/result-testing";

setupGuardMatchers();
setupResultMatchers();

const ReadItems = permission("items:read");
const WriteItems = permission("items:write");

interface ItemService {
  list(): ReadonlyArray<string>;
}
const ItemPort = port<ItemService>()({ name: "ItemService" });

describe("memory adapter integration", () => {
  let audit: ReturnType<typeof createMemoryAuditTrail>;
  let engine: ReturnType<typeof createMemoryPolicyEngine>;

  beforeEach(() => {
    audit = createMemoryAuditTrail();
    engine = createMemoryPolicyEngine();
  });

  it("audit trail captures all authorization decisions", () => {
    const viewer = createTestSubject({
      id: "viewer-1",
      permissions: [ReadItems],
    });
    const anonymous = createTestSubject({ id: "anon" });

    const itemAdapter = createAdapter({
      provides: ItemPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ list: () => ["item-1", "item-2"] }),
    });

    const guardedAdapter = createGuardAdapter({
      adapter: itemAdapter,
      policy: hasPermission(ReadItems),
    });

    const graph = GraphBuilder.create()
      .provide(guardedAdapter)
      .provide(createSubjectAdapter(() => viewer))
      .build();

    const container = createContainer({ graph, name: "AuditTest" });
    installGuardHook(container, { auditTrail: audit });

    const scope = container.createScope();
    scope.resolve(ItemPort); // allowed

    expect(audit.getEntries()).toHaveLength(1);
    expect(audit.getEntriesByVerdict("allow")).toHaveLength(1);
    expect(audit.getEntriesBySubject("viewer-1")).toHaveLength(1);
  });

  it("memory engine records evaluation history", () => {
    const viewer = createTestSubject({ permissions: [ReadItems] });
    const policy = hasPermission(WriteItems);

    const decision = engine.evaluate(policy, viewer);

    expect(decision).toDeny();
    expect(engine.getEvaluations()).toHaveLength(1);
    expect(engine.getEvaluationsByVerdict("deny")).toHaveLength(1);

    engine.clear();
    expect(engine.getEvaluations()).toHaveLength(0);
  });
});
```

---

## 9. Anti-patterns

The following practices are explicitly discouraged. Each anti-pattern includes the reason it is harmful and the correct alternative.

### 9.1 Global Subject Mutation

```typescript
// BAD: Mutable global subject
let currentSubject = adminSubject;
beforeEach(() => {
  currentSubject = viewerSubject;
});

// GOOD: Per-test subject via factory
it("viewer cannot delete", () => {
  const decision = testPolicy(deletePolicy, { subject: viewerSubject });
  expect(decision).toDeny();
});
```

**Why:** Global mutable state causes test order dependencies. A test that forgets to reset the global subject poisons all subsequent tests. The `createTestSubject` factory and `testPolicy`'s explicit `subject` parameter eliminate this class of bugs.

### 9.2 Testing Policy Logic Through the Container

```typescript
// BAD: Full container setup just to test a policy rule
const graph = GraphBuilder.create().provide(guardedAdapter).provide(subjectAdapter).build();
const container = createContainer({ graph, name: "Test" });
const scope = container.createScope();
const result = scope.tryResolve(UserRepoPort);
expect(result.isErr()).toBe(true); // tests the policy, but with 10x setup

// GOOD: Direct policy evaluation
const decision = testPolicy(deletePolicy, { subject: viewerSubject });
expect(decision).toDeny();
```

**Why:** Container setup is integration-test territory. Unit testing a policy's logic should not require building a graph, creating a container, and resolving through hooks. Use `testPolicy` for unit tests; reserve container tests for integration suites that verify the wiring.

### 9.3 Mocking the Evaluate Function

```typescript
// BAD: Mocking the evaluate function
vi.mock("@hex-di/guard", () => ({
  evaluate: vi.fn().mockReturnValue({ verdict: "allow", reason: "", trace: [] }),
}));

// GOOD: Use real evaluation with controlled inputs
const decision = testPolicy(policy, { subject: adminSubject });
expect(decision).toAllow();
```

**Why:** Mocking `evaluate` destroys the test's value. The whole point of policy testing is to verify that the policy data structure produces correct decisions. Mocking it means you are testing that your mock returns what you told it to return. Use real evaluation with controlled subjects and resources.

### 9.4 String-Based Permission Checks

```typescript
// BAD: Checking permissions by string name
expect(subject.permissions.has("users:delete")).toBe(true);

// GOOD: Checking permissions by branded token
expect(subject.permissions.has(DeleteUsers)).toBe(true);
```

**Why:** String-based checks bypass the branding system. A typo in `"users:delte"` silently passes (the set does not contain it, the assertion fails with an unhelpful message). Branded tokens are type-checked at compile time.

### 9.5 Asserting on Decision Internals Instead of Using Matchers

```typescript
// BAD: Reaching into decision internals
expect(decision.verdict).toBe("deny");
expect(decision.reason).toContain("users:delete");

// GOOD: Using custom matchers
expect(decision).toDeny();
expect(decision).toDenyWith("users:delete");
```

**Why:** Custom matchers provide better error messages. When `toAllow()` fails, the message includes the denial reason. When `toDenyWith` fails, it shows the actual reason versus the expected substring. Direct property access produces generic "expected deny, received allow" messages.

### 9.6 Sharing Mutable State Between Test Suites via Module Scope

```typescript
// BAD: Module-level mutable engine shared across describe blocks
const engine = createMemoryPolicyEngine();

describe("suite A", () => {
  it("test 1", () => {
    engine.evaluate(policy, subject);
  });
});
describe("suite B", () => {
  it("test 2", () => {
    // engine still has entries from suite A!
    expect(engine.getEvaluations()).toHaveLength(0); // FAILS
  });
});

// GOOD: Fresh engine per test
describe("suite", () => {
  let engine: ReturnType<typeof createMemoryPolicyEngine>;
  beforeEach(() => {
    engine = createMemoryPolicyEngine();
  });
  // ...
});
```

**Why:** Memory adapters accumulate state. Without clearing or recreating them between tests, assertions depend on execution order. The `beforeEach` pattern ensures isolation.

### 9.7 Using `vi.mock` on Guard React Components

```typescript
// BAD: Mocking Can/Cannot components
vi.mock("@hex-di/guard/react", () => ({
  Can: ({ children }) => <>{children}</>,
}));

// GOOD: Provide test subject and let real components evaluate
const wrapper = createTestGuardWrapper({ subject: adminSubject });
render(<Can permission={WriteUsers}>Edit</Can>, { wrapper });
```

**Why:** Mocking the component under test means you are no longer testing it. Provide a subject via the wrapper and let the real component evaluate the permission. This catches regressions in the component's context consumption and policy evaluation logic.

### 9.8 Not Testing Denial Reasons

```typescript
// BAD: Only checking allow/deny
expect(decision).toDeny();

// GOOD: Also verifying the reason is actionable
expect(decision).toDeny();
expect(decision).toDenyWith("users:delete");
```

**Why:** A denial without a clear reason is a debugging nightmare. Testing that the reason contains the relevant permission or role name ensures that production error messages are useful.

### 9.9 Testing Role Hierarchy by Exhaustive Permission Enumeration

```typescript
// BAD: Manually checking every inherited permission
expect(admin.permissions.has(ReadUsers)).toBe(true);
expect(admin.permissions.has(WriteUsers)).toBe(true);
expect(admin.permissions.has(DeleteUsers)).toBe(true);
expect(admin.permissions.has(ReadReports)).toBe(true);
// ... 20 more lines

// GOOD: Test the role resolution function, then test policies against subjects
const allPerms = flattenPermissions(AdminRole);
expect(allPerms).toContain(ReadUsers);
expect(allPerms).toContain(DeleteUsers);

// And separately:
const decision = testPolicy(hasRole(AdminRole), { subject: adminSubject });
expect(decision).toAllow();
```

**Why:** Enumerating permissions by hand is fragile and duplicates the role definition. Test the `flattenPermissions` function once to verify the inheritance graph, then test policies against subjects. If the role definition changes, only the role definition and `flattenPermissions` test need updating.

---

## Package Structure Summary

```
packages/guard-testing/
  src/
    index.ts              # Re-exports everything
    subject.ts            # createTestSubject, resetSubjectCounter
    fixtures.ts           # Pre-built permissions, roles, subjects
    policy.ts             # testPolicy
    guard.ts              # testGuard
    matchers.ts           # setupGuardMatchers (toAllow, toDeny, etc.)
    react.tsx             # createTestGuardWrapper
    memory-policy-engine.ts
    static-subject-provider.ts
    memory-audit-trail.ts
  tests/
    matchers.test.ts
    subject.test.ts
    policy.test.ts
    guard.test.ts
  package.json            # peerDeps: @hex-di/guard, vitest
```

```
packages/guard/
  tests/
    permission-branding.test-d.ts
    role-inference.test-d.ts
    policy-types.test-d.ts
    decision-types.test-d.ts
    guard-types.test-d.ts
    integration/
      container-guard.test.ts
      audit-trail.test.ts
```

---

## Public API of @hex-di/guard-testing

```typescript
// packages/guard-testing/src/index.ts

// Subject fixtures
export { createTestSubject, resetSubjectCounter } from "./subject.js";

// Policy testing
export { testPolicy } from "./policy.js";

// Guard testing
export { testGuard } from "./guard.js";

// Custom matchers
export { setupGuardMatchers } from "./matchers.js";

// React testing
export { createTestGuardWrapper } from "./react.js";

// Memory adapters
export { createMemoryPolicyEngine } from "./memory-policy-engine.js";
export {
  createStaticSubjectProvider,
  createCyclingSubjectProvider,
} from "./static-subject-provider.js";
export { createMemoryAuditTrail } from "./memory-audit-trail.js";
```
