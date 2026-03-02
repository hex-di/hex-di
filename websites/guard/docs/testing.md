---
sidebar_position: 1
title: Testing
---

# Testing

The `@hex-di/guard-testing` package provides comprehensive testing utilities including memory adapters, fixtures, custom matchers, and conformance suites.

## Installation

```bash
npm install --save-dev @hex-di/guard-testing
```

## Memory Adapters

In-memory implementations for testing without external dependencies.

### `createMemoryAuditTrail()`

In-memory audit trail that stores entries in an array.

```typescript
import { createMemoryAuditTrail } from "@hex-di/guard-testing";

const auditTrail = createMemoryAuditTrail();

// Use in tests
const entries = auditTrail.getEntries();
const filtered = auditTrail.getEntriesBySubject("user-123");
auditTrail.clear(); // Reset between tests
```

### `createMemorySubjectProvider()`

Configurable subject provider for testing different scenarios.

```typescript
import { createMemorySubjectProvider } from "@hex-di/guard-testing";

const provider = createMemorySubjectProvider();

// Configure the subject
provider.setSubject(
  createAuthSubject({
    id: "test-user",
    roles: [AdminRole],
    permissions: [],
    attributes: { department: "testing" },
  })
);

// Use in DI container
const graph = GraphBuilder.create()
  .add(
    createAdapter(SubjectProviderPort, {
      factory: () => provider,
    })
  )
  .build();
```

### `createStaticSubjectProvider()`

Returns the same subject every time - useful for deterministic tests.

```typescript
import { createStaticSubjectProvider } from "@hex-di/guard-testing";

const provider = createStaticSubjectProvider({
  id: "static-user",
  roles: [ViewerRole],
  permissions: [],
  attributes: {},
});
```

### `createCyclingSubjectProvider()`

Cycles through multiple subjects - useful for testing multi-user scenarios.

```typescript
import { createCyclingSubjectProvider } from "@hex-di/guard-testing";

const provider = createCyclingSubjectProvider([adminSubject, readerSubject, anonymousSubject]);

// Each call cycles to the next subject
provider.getSubject(); // adminSubject
provider.getSubject(); // readerSubject
provider.getSubject(); // anonymousSubject
provider.getSubject(); // adminSubject (cycles back)
```

### Other Memory Adapters

```typescript
// Signature service for testing electronic signatures
const signatureService = createMemorySignatureService();

// Policy engine for dynamic policy storage
const policyEngine = createMemoryPolicyEngine();

// Event sink for capturing guard events
const eventSink = createMemoryGuardEventSink();

// Span sink for tracing
const spanSink = createMemoryGuardSpanSink();

// Meta-audit trail for audit-of-audits
const metaAudit = createMemoryMetaAuditTrail();
```

## Test Fixtures

Pre-configured objects for common testing scenarios.

### Subjects

```typescript
import {
  createTestSubject,
  adminSubject,
  readerSubject,
  anonymousSubject,
} from "@hex-di/guard-testing";

// Create custom test subject
const subject = createTestSubject({
  id: "custom-id", // optional, auto-generated if not provided
  roles: [EditorRole],
  permissions: [WriteUsers],
  attributes: { team: "platform" },
});

// Use preset subjects
// adminSubject - has admin role and all permissions
// readerSubject - has read-only permissions
// anonymousSubject - no roles or permissions
```

### Permissions and Roles

```typescript
import { createTestPermission, createTestRole } from "@hex-di/guard-testing";

// Creates uniquely named test permissions
const perm1 = createTestPermission(); // "TestPermission_1"
const perm2 = createTestPermission(); // "TestPermission_2"

// Creates test roles with auto-generated names
const role = createTestRole({
  permissions: [perm1, perm2],
});
```

### Preset Policies

```typescript
import { permissionPolicy, rolePolicy } from "@hex-di/guard-testing";

// permissionPolicy - requires a test permission
// rolePolicy - requires a test role
```

## Testing Utilities

### `testPolicy()` - Fluent Testing Builder

A fluent API for testing policies against various subjects and contexts.

```typescript
import { testPolicy } from "@hex-di/guard-testing";

describe("Policy Tests", () => {
  it("should grant access to admin", () => {
    const result = testPolicy(hasRole(AdminRole)).withSubject(adminSubject).evaluate();

    expect(result.granted).toBe(true);
  });

  it("should deny suspended users", () => {
    const result = testPolicy(not(hasAttribute("status", "suspended")))
      .withSubject(
        createTestSubject({
          attributes: { status: "suspended" },
        })
      )
      .evaluate();

    expect(result.granted).toBe(false);
    expect(result.trace).toBeDefined();
  });

  it("should check resource attributes", () => {
    const result = testPolicy(hasResourceAttribute("public", true))
      .withSubject(readerSubject)
      .withResource({
        type: "document",
        attributes: { public: true },
      })
      .evaluate();

    expect(result.granted).toBe(true);
  });
});
```

### Policy Comparison

```typescript
import { createPolicyDiffReport, policiesAreEquivalent } from "@hex-di/guard-testing";

// Check if two policies are structurally equivalent
const equivalent = policiesAreEquivalent(policy1, policy2);

// Get detailed diff report
const report = createPolicyDiffReport(policy1, policy2);
report.differences.forEach(diff => {
  console.log(`${diff.path}: ${diff.type}`);
  console.log(`  Left: ${diff.left}`);
  console.log(`  Right: ${diff.right}`);
});
```

### Test Audit Entries

```typescript
import { createTestAuditEntry, createTestPolicyChangeAuditEntry } from "@hex-di/guard-testing";

// Create audit entry for testing
const entry = createTestAuditEntry({
  subjectId: "user-123",
  decision: "allow",
  portName: "UserPort",
});

// Create policy change audit entry
const changeEntry = createTestPolicyChangeAuditEntry({
  oldPolicy: hasRole(ViewerRole),
  newPolicy: hasRole(EditorRole),
  changedBy: "admin-456",
});
```

## Custom Matchers

Vitest custom matchers for more expressive assertions.

```typescript
import { setupGuardMatchers } from "@hex-di/guard-testing";
import { expect } from "vitest";

// Setup in your test file or setup file
setupGuardMatchers();

// Now use custom matchers
expect(decision).toBeAllowed();
expect(decision).toBeDenied();
expect(subject).toHavePermission(ReadUsers);
expect(subject).toHaveRole(AdminRole);
expect(policy).toBeEquivalentTo(otherPolicy);
```

## Conformance Suites

Verify that your custom implementations conform to the expected interfaces.

### Audit Trail Conformance

```typescript
import { createAuditTrailConformanceSuite } from "@hex-di/guard-testing";

describe("Custom Audit Trail", () => {
  const suite = createAuditTrailConformanceSuite(() => new MyCustomAuditTrail());

  // Runs all conformance tests
  suite.runAll();

  // Or run individual test groups
  suite.testWriting();
  suite.testReading();
  suite.testQuerying();
  suite.testRetention();
});
```

### Subject Provider Conformance

```typescript
import { createSubjectProviderConformanceSuite } from "@hex-di/guard-testing";

describe("Custom Subject Provider", () => {
  const suite = createSubjectProviderConformanceSuite(() => new MyCustomSubjectProvider());

  suite.runAll();
});
```

### Other Conformance Suites

```typescript
// Signature service conformance
const signatureSuite = createSignatureServiceConformanceSuite(() => new MySignatureService());

// Admin guard conformance
const adminSuite = createAdminGuardConformanceSuite(() => new MyAdminGuard());
```

## Example Test Setup

Here's a complete test setup example:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import {
  createMemoryAuditTrail,
  createMemorySubjectProvider,
  createTestSubject,
  testPolicy,
  setupGuardMatchers,
} from "@hex-di/guard-testing";
import { hasPermission, enforcePolicy } from "@hex-di/guard";

setupGuardMatchers();

describe("Authorization Tests", () => {
  let auditTrail: MemoryAuditTrail;
  let subjectProvider: MemorySubjectProvider;

  beforeEach(() => {
    auditTrail = createMemoryAuditTrail();
    subjectProvider = createMemorySubjectProvider();
  });

  it("should enforce policy on adapter", async () => {
    const subject = createTestSubject({
      permissions: [ReadUsers],
    });
    subjectProvider.setSubject(subject);

    const GuardedAdapter = enforcePolicy(UserAdapter, {
      policy: hasPermission(ReadUsers),
      subjectPort: SubjectProviderPort,
    });

    // Set up DI container with test dependencies
    const graph = GraphBuilder.create()
      .add(GuardedAdapter)
      .add(
        createAdapter(SubjectProviderPort, {
          factory: () => subjectProvider,
        })
      )
      .add(
        createAdapter(AuditTrailPort, {
          factory: () => auditTrail,
        })
      )
      .build();

    const container = createContainer(graph);
    const result = await container.resolve(UserPort);

    expect(result).toBeOk();
    expect(auditTrail.getEntries()).toHaveLength(1);
    expect(auditTrail.getEntries()[0].decision).toBe("allow");
  });
});
```
