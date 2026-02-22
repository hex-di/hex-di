// Memory adapters
export {
  createMemoryAuditTrail,
  createMemorySubjectProvider,
  createMemorySignatureService,
  createMemoryPolicyEngine,
  createStaticSubjectProvider,
  createCyclingSubjectProvider,
  createMemoryGuardEventSink,
  createMemoryGuardSpanSink,
  createMemoryMetaAuditTrail,
} from "./memory/index.js";
export type {
  MemoryAuditTrail,
  MemorySubjectProvider,
  MemorySignatureService,
  SignatureConfig,
  MemoryPolicyEngine,
  AuditEntryValidationResult,
  MemoryGuardEventSink,
  MemoryGuardSpanSink,
  RecordedSpan,
  MemoryMetaAuditTrail,
} from "./memory/index.js";

// Test fixtures
export {
  createTestSubject,
  resetSubjectCounter,
  createTestPermission,
  createTestRole,
  permissionPolicy,
  rolePolicy,
  adminSubject,
  readerSubject,
  anonymousSubject,
} from "./fixtures/index.js";
export type { TestSubjectOptions } from "./fixtures/index.js";

// Testing utilities
export {
  testPolicy,
  createPolicyDiffReport,
  policiesAreEquivalent,
  createTestAuditEntry,
  createTestPolicyChangeAuditEntry,
} from "./testing/index.js";
export type {
  PolicyTestResult,
  PolicyTestBuilder,
  PolicyTestAssertions,
  PolicyDiffEntry,
  PolicyDiffReport,
} from "./testing/index.js";

// Custom matchers
export { setupGuardMatchers } from "./matchers/index.js";

// Conformance suites
export {
  createAuditTrailConformanceSuite,
  createSubjectProviderConformanceSuite,
  createSignatureServiceConformanceSuite,
  createAdminGuardConformanceSuite,
} from "./conformance/index.js";
export type {
  SubjectProvider,
  SignatureService,
} from "./conformance/index.js";
