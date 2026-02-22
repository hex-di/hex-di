import type { TraceabilityMatrix, TraceabilityRow, TraceabilityOptions } from "./types.js";

/**
 * Pre-defined traceability rows for @hex-di/guard.
 *
 * These rows are derived from the guard spec DoD items and map each
 * requirement to the corresponding source module and test file.
 */
const GUARD_TRACEABILITY_ROWS: readonly TraceabilityRow[] = [
  // DoD 1: Permission tokens
  {
    requirementId: "REQ-GUARD-001",
    description: "Permission tokens enforce resource:action uniqueness",
    specSection: "02-permission-types.md",
    sourceModule: "tokens/permission.ts",
    testFile: "tests/unit/permission.test.ts",
    testType: "unit",
    status: "covered",
  },
  // DoD 2: Role types
  {
    requirementId: "REQ-GUARD-002",
    description: "Role types enforce hierarchical DAG structure",
    specSection: "03-role-types.md",
    sourceModule: "tokens/role.ts",
    testFile: "tests/unit/role.test.ts",
    testType: "unit",
    status: "covered",
  },
  // DoD 3: Policy types
  {
    requirementId: "REQ-GUARD-003",
    description: "AllOfPolicy requires all child policies to pass",
    specSection: "04-policy-types.md",
    sourceModule: "policy/combinators.ts",
    testFile: "tests/unit/combinators.test.ts",
    testType: "unit",
    status: "covered",
  },
  {
    requirementId: "REQ-GUARD-004",
    description: "AnyOfPolicy passes when any child policy passes",
    specSection: "04-policy-types.md",
    sourceModule: "policy/combinators.ts",
    testFile: "tests/unit/combinators.test.ts",
    testType: "unit",
    status: "covered",
  },
  // DoD 4: Policy evaluator
  {
    requirementId: "REQ-GUARD-005",
    description: "evaluate() returns Result<Decision, PolicyEvaluationError>",
    specSection: "05-policy-evaluator.md",
    sourceModule: "evaluator/evaluate.ts",
    testFile: "tests/unit/evaluate.test.ts",
    testType: "unit",
    status: "covered",
  },
  // DoD 5: Subject
  {
    requirementId: "REQ-GUARD-006",
    description: "AuthSubject contains roles, permissions, attributes",
    specSection: "06-subject.md",
    sourceModule: "subject/auth-subject.ts",
    testFile: "tests/unit/subject.test.ts",
    testType: "unit",
    status: "covered",
  },
  // DoD 7: Guard adapter
  {
    requirementId: "REQ-GUARD-007",
    description: "enforcePolicy records audit entry on allow",
    specSection: "07-guard-adapter.md",
    sourceModule: "guard/guard.ts",
    testFile: "tests/unit/guard-adapter.test.ts",
    testType: "unit",
    status: "covered",
  },
  {
    requirementId: "REQ-GUARD-008",
    description: "enforcePolicy throws AccessDeniedError on deny",
    specSection: "07-guard-adapter.md",
    sourceModule: "guard/guard.ts",
    testFile: "tests/unit/guard-adapter.test.ts",
    testType: "unit",
    status: "covered",
  },
  // DoD 13: GxP advanced
  {
    requirementId: "REQ-GUARD-009",
    description: "WAL append/commit/rollback/recover are deterministic",
    specSection: "GxP §WAL",
    sourceModule: "guard/wal.ts",
    testFile: "tests/unit/gxp-wal.test.ts",
    testType: "gxp",
    status: "covered",
  },
  {
    requirementId: "REQ-GUARD-010",
    description: "Circuit breaker transitions from closed to open after threshold",
    specSection: "GxP §circuit-breaker",
    sourceModule: "guard/circuit-breaker.ts",
    testFile: "tests/unit/gxp-circuit-breaker.test.ts",
    testType: "gxp",
    status: "covered",
  },
  // DoD 15: Electronic signatures
  {
    requirementId: "REQ-GUARD-011",
    description: "ElectronicSignature contains signerId, signedAt, meaning, validated",
    specSection: "electronic-signatures",
    sourceModule: "signature/types.ts",
    testFile: "tests/unit/signatures.test.ts",
    testType: "unit",
    status: "covered",
  },
  // DoD 23: Meta-audit
  {
    requirementId: "REQ-GUARD-012",
    description: "MetaAuditEntry records who accessed the audit log",
    specSection: "meta-audit",
    sourceModule: "guard/meta-audit.ts",
    testFile: "tests/unit/meta-audit.test.ts",
    testType: "unit",
    status: "covered",
  },
  // DoD 24: Decommissioning
  {
    requirementId: "REQ-GUARD-013",
    description: "archiveAuditTrail verifies chain integrity before archival",
    specSection: "decommissioning",
    sourceModule: "guard/decommission.ts",
    testFile: "tests/unit/decommissioning.test.ts",
    testType: "unit",
    status: "covered",
  },
  // DoD 25: Async evaluation
  {
    requirementId: "REQ-GUARD-014",
    description: "evaluateAsync resolves attribute values before evaluating policies",
    specSection: "async-evaluation",
    sourceModule: "evaluator/async.ts",
    testFile: "tests/unit/async-evaluation.test.ts",
    testType: "unit",
    status: "covered",
  },
  // DoD 26: Field-level union
  {
    requirementId: "REQ-GUARD-015",
    description: "anyOf with fieldStrategy union evaluates all children",
    specSection: "field-union",
    sourceModule: "evaluator/evaluate.ts",
    testFile: "tests/unit/field-union.test.ts",
    testType: "unit",
    status: "covered",
  },
  // DoD 27: ReBAC
  {
    requirementId: "REQ-GUARD-016",
    description: "hasRelationship delegates to RelationshipResolver",
    specSection: "rebac",
    sourceModule: "evaluator/rebac.ts",
    testFile: "tests/unit/rebac.test.ts",
    testType: "unit",
    status: "covered",
  },
];

/**
 * Generates a traceability matrix for the @hex-di/guard ecosystem.
 *
 * The matrix maps each requirement to its source module, test file,
 * test type, and coverage status. It can be filtered by requirement
 * pattern and test type.
 *
 * @example
 * ```ts
 * const matrix = generateTraceabilityMatrix();
 * console.log(`${matrix.coveragePercent}% of requirements covered`);
 * ```
 */
export function generateTraceabilityMatrix(
  options: TraceabilityOptions = {},
): TraceabilityMatrix {
  const generatedAt = new Date().toISOString();

  let rows = [...GUARD_TRACEABILITY_ROWS];

  // Filter by requirement pattern
  if (options.requirementPattern !== undefined) {
    const pattern = new RegExp(options.requirementPattern);
    rows = rows.filter((r) => pattern.test(r.requirementId));
  }

  // Filter by test types
  if (options.testTypes !== undefined && options.testTypes.length > 0) {
    const types = new Set(options.testTypes);
    rows = rows.filter((r) => types.has(r.testType));
  }

  const totalRequirements = rows.length;
  const coveredRequirements = rows.filter((r) => r.status === "covered").length;
  const partialRequirements = rows.filter((r) => r.status === "partial").length;
  const missingRequirements = rows.filter((r) => r.status === "missing").length;
  const coveragePercent =
    totalRequirements > 0
      ? Math.round((coveredRequirements / totalRequirements) * 100)
      : 0;

  return {
    generatedAt,
    totalRequirements,
    coveredRequirements,
    partialRequirements,
    missingRequirements,
    rows,
    coveragePercent,
  };
}
