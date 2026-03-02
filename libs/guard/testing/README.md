# @hex-di/guard-testing

Testing utilities for `@hex-di/guard` -- memory adapters, test fixtures, policy testing helpers, custom Vitest matchers, and conformance suites for validating custom adapter implementations.

## Features

- **Memory adapters** -- in-memory implementations of every guard port (audit trail, subject provider, signature service, policy engine, event/span sinks)
- **Test fixtures** -- pre-built subjects (`adminSubject`, `readerSubject`, `anonymousSubject`), permissions, and roles for fast test authoring
- **Policy testing** -- fluent `testPolicy()` builder, `policiesAreEquivalent()` comparison, and `createPolicyDiffReport()` for debugging
- **Custom matchers** -- `setupGuardMatchers()` extends Vitest with guard-specific assertions
- **Conformance suites** -- plug-in test suites that validate custom adapter implementations against the guard port contracts

## Installation

```bash
pnpm add -D @hex-di/guard-testing
```

Dependencies: `@hex-di/guard`, `@hex-di/result`

Peer dependency (optional): `vitest >= 2.0.0` (required for custom matchers and conformance suites)

## Quick Start

```typescript
import {
  createTestSubject,
  createTestPermission,
  testPolicy,
  adminSubject,
} from "@hex-di/guard-testing";
import { hasPermission } from "@hex-di/guard";

// Create a permission and test it
const ReadDocs = createTestPermission("ReadDocs");
const policy = hasPermission(ReadDocs);

// Fluent policy testing
const result = testPolicy(policy).withSubject(adminSubject);
// result.granted === true
```

## Memory Adapters

In-memory implementations of guard ports for unit and integration tests. Each adapter stores state in plain arrays/maps for easy inspection.

```typescript
import {
  createMemoryAuditTrail,
  createMemorySubjectProvider,
  createMemorySignatureService,
  createMemoryPolicyEngine,
  createMemoryGuardEventSink,
  createMemoryGuardSpanSink,
  createMemoryMetaAuditTrail,
} from "@hex-di/guard-testing";

// Audit trail that stores entries in memory
const auditTrail = createMemoryAuditTrail();

// Subject providers with different strategies
const staticProvider = createStaticSubjectProvider(adminSubject);
const cyclingProvider = createCyclingSubjectProvider([adminSubject, readerSubject]);

// Signature service for electronic signature tests
const signatureService = createMemorySignatureService();

// Observability sinks
const eventSink = createMemoryGuardEventSink();
const spanSink = createMemoryGuardSpanSink();
```

## Test Fixtures

Pre-built subjects, permissions, and roles for common testing scenarios.

```typescript
import {
  adminSubject,
  readerSubject,
  anonymousSubject,
  createTestSubject,
  createTestPermission,
  createTestRole,
  permissionPolicy,
  rolePolicy,
} from "@hex-di/guard-testing";

// Pre-built subjects
adminSubject; // Full permissions
readerSubject; // Read-only permissions
anonymousSubject; // No permissions or roles

// Custom subject
const customSubject = createTestSubject({
  permissions: ["docs:read", "docs:write"],
  roles: ["Editor"],
});

// Quick policy fixtures
permissionPolicy; // A hasPermission policy for testing
rolePolicy; // A hasRole policy for testing
```

## Policy Testing

Fluent API for testing policy evaluation outcomes and comparing policies.

```typescript
import { testPolicy, policiesAreEquivalent, createPolicyDiffReport } from "@hex-di/guard-testing";
import { hasPermission, allOf } from "@hex-di/guard";

// Test a policy against a subject
const result = testPolicy(hasPermission(ReadDocs)).withSubject(adminSubject);

// Compare two policies for behavioral equivalence
const equivalent = policiesAreEquivalent(policyA, policyB);

// Generate a detailed diff report
const report = createPolicyDiffReport(policyA, policyB);
```

## Custom Matchers

Extends Vitest with guard-specific assertions. Call `setupGuardMatchers()` in your test setup file.

```typescript
// vitest.setup.ts
import { setupGuardMatchers } from "@hex-di/guard-testing";

setupGuardMatchers();
```

## Conformance Suites

Plug-in test suites that validate custom adapter implementations against the guard port contracts. Use these when implementing your own adapters (e.g., a Postgres-backed audit trail).

```typescript
import {
  createAuditTrailConformanceSuite,
  createSubjectProviderConformanceSuite,
  createSignatureServiceConformanceSuite,
  createAdminGuardConformanceSuite,
} from "@hex-di/guard-testing";

// Run the audit trail conformance suite against your custom adapter
describe("PostgresAuditTrail", () => {
  createAuditTrailConformanceSuite(() => createPostgresAuditTrail());
});

// Run the subject provider conformance suite
describe("JwtSubjectProvider", () => {
  createSubjectProviderConformanceSuite(() => createJwtSubjectProvider());
});
```

## API Reference

### Memory Adapters

| Export                                   | Kind     | Description                            |
| ---------------------------------------- | -------- | -------------------------------------- |
| `createMemoryAuditTrail()`               | function | In-memory audit trail adapter          |
| `createMemorySubjectProvider()`          | function | In-memory subject provider             |
| `createStaticSubjectProvider(subject)`   | function | Always returns the same subject        |
| `createCyclingSubjectProvider(subjects)` | function | Cycles through subjects on each call   |
| `createMemorySignatureService()`         | function | In-memory electronic signature service |
| `createMemoryPolicyEngine()`             | function | In-memory policy engine                |
| `createMemoryGuardEventSink()`           | function | In-memory event sink for observability |
| `createMemoryGuardSpanSink()`            | function | In-memory span sink for tracing        |
| `createMemoryMetaAuditTrail()`           | function | In-memory meta-audit trail             |

### Test Fixtures

| Export                        | Kind     | Description                                         |
| ----------------------------- | -------- | --------------------------------------------------- |
| `createTestSubject(options?)` | function | Create a test subject with custom permissions/roles |
| `createTestPermission(name)`  | function | Create a test permission token                      |
| `createTestRole(name)`        | function | Create a test role token                            |
| `adminSubject`                | constant | Pre-built subject with full permissions             |
| `readerSubject`               | constant | Pre-built subject with read-only permissions        |
| `anonymousSubject`            | constant | Pre-built subject with no permissions               |
| `permissionPolicy`            | constant | Pre-built hasPermission policy                      |
| `rolePolicy`                  | constant | Pre-built hasRole policy                            |
| `resetSubjectCounter()`       | function | Reset the auto-incrementing subject ID counter      |

### Policy Testing

| Export                                  | Kind     | Description                                     |
| --------------------------------------- | -------- | ----------------------------------------------- |
| `testPolicy(policy)`                    | function | Fluent policy test builder                      |
| `policiesAreEquivalent(a, b)`           | function | Compare two policies for behavioral equivalence |
| `createPolicyDiffReport(a, b)`          | function | Generate a detailed diff between two policies   |
| `createTestAuditEntry(...)`             | function | Create a test audit trail entry                 |
| `createTestPolicyChangeAuditEntry(...)` | function | Create a test policy-change audit entry         |

### Custom Matchers

| Export                 | Kind     | Description                             |
| ---------------------- | -------- | --------------------------------------- |
| `setupGuardMatchers()` | function | Register guard-specific Vitest matchers |

### Conformance Suites

| Export                                            | Kind     | Description                          |
| ------------------------------------------------- | -------- | ------------------------------------ |
| `createAuditTrailConformanceSuite(factory)`       | function | Validate an audit trail adapter      |
| `createSubjectProviderConformanceSuite(factory)`  | function | Validate a subject provider adapter  |
| `createSignatureServiceConformanceSuite(factory)` | function | Validate a signature service adapter |
| `createAdminGuardConformanceSuite(factory)`       | function | Validate an admin guard adapter      |

## Related Packages

| Package                    | Description                                                  |
| -------------------------- | ------------------------------------------------------------ |
| `@hex-di/guard`            | Core guard library: permissions, roles, policies, evaluation |
| `@hex-di/guard-react`      | React integration: `SubjectProvider`, `Can`/`Cannot`, hooks  |
| `@hex-di/guard-validation` | GxP validation protocols (IQ/OQ/PQ) and traceability matrix  |

## License

MIT
