/**
 * The result of a qualification protocol step.
 */
export interface ValidationStepResult {
  readonly id: string;
  readonly description: string;
  readonly passed: boolean;
  readonly evidence?: string;
  readonly errorMessage?: string;
}

/**
 * A complete validation result with evidence.
 */
export interface ValidationResult<TEvidence = unknown> {
  readonly protocol: "IQ" | "OQ" | "PQ";
  readonly passed: boolean;
  readonly steps: readonly ValidationStepResult[];
  readonly evidence?: TEvidence;
  readonly executedAt: string;
  readonly failedSteps: readonly ValidationStepResult[];
}

// ---------------------------------------------------------------------------
// IQ — Installation Qualification
// ---------------------------------------------------------------------------

/**
 * Evidence collected during Installation Qualification.
 */
export interface IQEvidence {
  /** Resolved package name and version. */
  readonly packageName: string;
  readonly packageVersion: string;
  /** Subpath exports that were verified. */
  readonly verifiedExports: readonly string[];
  /** Whether all required peer dependencies were found. */
  readonly peerDependenciesPresent: boolean;
  readonly nodeVersion: string;
}

export type IQResult = ValidationResult<IQEvidence>;

// ---------------------------------------------------------------------------
// OQ — Operational Qualification
// ---------------------------------------------------------------------------

/**
 * Evidence collected during Operational Qualification.
 */
export interface OQEvidence {
  /** Total tests run and passed. */
  readonly totalTests: number;
  readonly passedTests: number;
  readonly failedTests: number;
  /** Whether the mutation score threshold was met. */
  readonly mutationScoreThresholdMet: boolean;
  readonly mutationScore?: number;
  readonly dodItemsVerified: readonly string[];
}

export type OQResult = ValidationResult<OQEvidence>;

// ---------------------------------------------------------------------------
// PQ — Performance Qualification
// ---------------------------------------------------------------------------

/**
 * Evidence collected during Performance Qualification.
 */
export interface PQEvidence {
  /** Evaluation latency statistics (in ms). */
  readonly evaluationLatency: {
    readonly p50: number;
    readonly p95: number;
    readonly p99: number;
  };
  /** Memory overhead in bytes. */
  readonly memoryOverheadBytes?: number;
  readonly integrationTestsPassed: boolean;
}

export type PQResult = ValidationResult<PQEvidence>;

// ---------------------------------------------------------------------------
// Traceability
// ---------------------------------------------------------------------------

/**
 * A row in the requirements traceability matrix.
 */
export interface TraceabilityRow {
  readonly requirementId: string;
  readonly description: string;
  readonly specSection: string;
  readonly sourceModule: string;
  readonly testFile: string;
  readonly testType: "unit" | "type" | "gxp" | "integration" | "mutation";
  readonly status: "covered" | "partial" | "missing";
}

/**
 * A complete traceability matrix report.
 */
export interface TraceabilityMatrix {
  readonly generatedAt: string;
  readonly totalRequirements: number;
  readonly coveredRequirements: number;
  readonly partialRequirements: number;
  readonly missingRequirements: number;
  readonly rows: readonly TraceabilityRow[];
  readonly coveragePercent: number;
}

/**
 * Options for traceability matrix generation.
 */
export interface TraceabilityOptions {
  /** Pattern of requirement IDs to include (regex string). */
  readonly requirementPattern?: string;
  /** Only include rows matching these test types. */
  readonly testTypes?: ReadonlyArray<"unit" | "type" | "gxp" | "integration" | "mutation">;
}
