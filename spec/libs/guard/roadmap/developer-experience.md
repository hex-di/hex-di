# 19 - Developer Experience

> **Document Control**
>
> | Property         | Value                                    |
> |------------------|------------------------------------------|
> | Document ID      | GUARD-19                                 |
> | Revision         | 1.1                                      |
> | Effective Date   | 2026-02-14                               |
> | Status           | Effective                                |
> | Author           | HexDI Engineering                        |
> | Reviewer         | GxP Compliance Review                    |
> | Approved By      | Technical Lead, Quality Assurance Manager |
> | Classification   | GxP Functional Specification |
> | DMS Reference    | Git VCS (GPG-signed tag: guard/v0.2.5)   |
> | Change History   | 1.1 (2026-02-14): Added GxP data classification warning for playground (§80) (CCR-GUARD-011) |
> |                  | 1.0 (2026-02-14): Initial draft — CLI tool, policy playground, VS Code extension, policy coverage, policy diff & migration (CCR-GUARD-010) |

_Previous: [18 - Ecosystem Extensions](./ecosystem-extensions.md)_

---

## Motivation

Competitive analysis identified developer experience as the primary adoption multiplier. OPA's CLI and built-in test framework, Casbin's online editor, and OpenFGA's VS Code extension each drove significant adoption in their ecosystems. `@hex-di/guard` has none of these.

This specification addresses the discoverability gap — making guard easy to try, easy to learn, and easy to integrate into existing development workflows.

---

## 79. CLI Tool

**Package:** `@hex-di/guard-cli`

The `guard` CLI provides policy validation, testing, explanation, hash chain verification, and bundle management from the command line. It is the primary entry point for CI/CD integration and developer workflow automation.

### Commands

#### `guard init`

Scaffold a guard configuration in the current project.

```
guard init [--template <template>]

Options:
  --template   Starter template: "basic", "rbac", "abac", "gxp" (default: "basic")

Creates:
  guard/
    permissions.ts    # Permission registry
    roles.ts          # Role definitions
    policies.ts       # Policy compositions
    guard.config.ts   # CLI configuration
```

The `guard.config.ts` file configures the CLI:

```typescript
import { defineGuardConfig } from "@hex-di/guard-cli";

export default defineGuardConfig({
  /** Path to the permission registry file */
  permissionsPath: "./guard/permissions.ts",

  /** Path to the roles file */
  rolesPath: "./guard/roles.ts",

  /** Path to the policies file */
  policiesPath: "./guard/policies.ts",

  /** Enable GxP mode for stricter validation */
  gxp: false,

  /** Output directory for coverage reports */
  coverageDir: "./guard-coverage",

  /** Output directory for policy bundles */
  bundleDir: "./guard-bundles",
});
```

#### `guard check`

Validate serialized policies against the schema and permission registry.

```
guard check <policy-file-or-glob>

Options:
  --registry <path>   Path to permission registry (overrides config)
  --strict            Fail on warnings (unused permissions, unreachable policies)

Examples:
  guard check policies/*.json
  guard check --strict policies/admin.json

Validations:
  - JSON schema compliance (section 35 AuditEntry JSON Schema)
  - Permission references resolve against the registry
  - Role references exist in the role definitions
  - Composite policy depth does not exceed 50 levels
  - No duplicate permission entries in groups
  - Serialization round-trip: deserialize → re-serialize → compare
```

Exit codes:

| Code | Meaning |
|---|---|
| 0 | All checks passed |
| 1 | Validation errors found |
| 2 | Configuration error (missing config, invalid paths) |

#### `guard test`

Run policy assertion tests.

```
guard test <test-file-or-glob>

Options:
  --coverage          Enable policy coverage analysis (see §82)
  --reporter <type>   Output format: "default", "json", "junit" (default: "default")
  --bail              Stop on first failure

Test file format:
  guard/tests/admin-policies.test.ts
```

Test files use the `testPolicy` utility with a declarative API:

```typescript
import { describe, test, expect } from "@hex-di/guard-cli/test";
import { AdminPolicy, ViewerPolicy } from "../policies";
import { adminSubject, viewerSubject } from "../fixtures";

describe("Admin policies", () => {
  test("admin can delete users", () => {
    expect(AdminPolicy).toAllow(adminSubject);
  });

  test("viewer cannot delete users", () => {
    expect(AdminPolicy).toDeny(viewerSubject);
  });

  test("denial reason is descriptive", () => {
    expect(AdminPolicy).toDenyWithReason(viewerSubject, "user:delete");
  });
});
```

#### `guard explain`

Print a human-readable evaluation trace for a policy against a subject.

```
guard explain <policy-file> --subject <subject-json> [--resource <resource-json>]

Options:
  --subject <path>    Path to subject JSON file or inline JSON
  --resource <path>   Path to resource JSON file or inline JSON (optional)
  --format <type>     Output format: "text", "json", "tree" (default: "text")

Example:
  guard explain policies/admin.json --subject '{"id":"user-1","permissions":["user:read"]}'

Output (text format):
  DENY: allOf failed
    ALLOW: hasPermission(user:read) passed
      -- subject 'user-1' has permission 'user:read'
    DENY: hasRole('admin') failed
      -- subject 'user-1' does not have role 'admin'
```

#### `guard hash`

Print the content hash of a serialized policy for change detection.

```
guard hash <policy-file>

Options:
  --algorithm <alg>   Hash algorithm: "sha256" (default), "sha384", "sha512"

Example:
  guard hash policies/admin.json
  sha256:a1b2c3d4e5f6...

Use cases:
  - CI: compare policy hashes across commits to detect changes
  - Audit: record policy hash in deployment manifests
  - Cache: use hash as cache key for EvaluationCachePort
```

#### `guard audit verify`

Verify hash chain integrity of an exported audit trail.

```
guard audit verify <audit-export-file>

Options:
  --scope <id>        Verify only a specific scope's chain (default: all scopes)
  --manifest          Also verify the export manifest checksum

Example:
  guard audit verify audit-export-2026-02-14.json

Output:
  Scope abc-123: 1,247 entries, chain valid ✓
  Scope def-456: 893 entries, chain valid ✓
  Manifest checksum: valid ✓

  2 scopes verified, 2,140 total entries, all chains intact.
```

#### `guard bundle pack`

Create a signed policy bundle for distribution.

```
guard bundle pack [--sign <key-path>] [--output <path>]

Options:
  --sign <path>       Path to private key for signing (PEM format)
  --output <path>     Output path (default: ./guard-bundles/bundle-<hash>.json)
  --include-registry  Include the full permission registry in the bundle

Example:
  guard bundle pack --sign keys/guard-signer.pem
  Bundle created: guard-bundles/bundle-a1b2c3d4.json
  Content hash: sha256:a1b2c3d4e5f6...
  Signature: RSA-SHA256 (valid)
```

#### `guard bundle verify`

Verify a policy bundle's integrity and signature.

```
guard bundle verify <bundle-file> [--public-key <path>]

Options:
  --public-key <path>  Path to public key for signature verification (PEM format)

Example:
  guard bundle verify guard-bundles/bundle-a1b2c3d4.json --public-key keys/guard-signer.pub
  Content hash: valid ✓
  Signature: RSA-SHA256 (valid) ✓
  Permissions: 12 registered
  Policies: 5 for 5 ports
  Roles: 3 defined
```

### CLI Architecture

The CLI is a standalone Node.js binary that uses `@hex-di/guard` as a library dependency. It does NOT start a server or require network access (except for `guard bundle push`/`guard bundle pull` which are deferred to a future version).

```
@hex-di/guard-cli
  ├── @hex-di/guard          (policy evaluation, serialization)
  ├── @hex-di/guard-testing  (testPolicy, matchers, fixtures)
  └── commander / citty      (CLI framework)
```

---

## 80. Policy Playground

**Package:** `@hex-di/guard-playground`

A web-based interactive environment for building, testing, and sharing guard policies. The playground is a standalone SPA (Single Page Application) deployable to any static hosting platform.

### Features

| Feature | Description |
|---|---|
| **Policy builder** | Visual policy tree builder with drag-and-drop composition of `allOf`, `anyOf`, `not`, `hasPermission`, `hasRole`, `hasAttribute`, `hasSignature`, `hasRelationship` |
| **Subject editor** | JSON editor for constructing test subjects with autocomplete for `authenticationMethod`, roles, and permissions from the registry |
| **Live evaluation** | Real-time evaluation as policy or subject changes, showing the Decision (allow/deny), reason, and full EvaluationTrace tree |
| **Trace visualization** | Collapsible tree view of the EvaluationTrace showing pass/fail status for each sub-policy |
| **Serialization preview** | Side-by-side view of the policy as TypeScript code and as serialized JSON |
| **Share URLs** | Encode policy + subject + resource in the URL hash for sharing (no server required) |
| **Example gallery** | Pre-built examples: "RBAC Blog", "ABAC Healthcare", "ReBAC Document Sharing", "GxP Audit Trail", "Field-Level Security" |
| **Export** | Export policy as TypeScript code, JSON, or CLI test file |

### Architecture

The playground runs entirely in the browser. `@hex-di/guard` is bundled into the SPA — no server-side evaluation.

```
@hex-di/guard-playground (SPA)
  ├── @hex-di/guard          (bundled, tree-shaken)
  ├── React                  (UI framework)
  ├── Monaco Editor          (code editor for JSON/TypeScript)
  └── Static hosting (Vercel, Netlify, GitHub Pages)
```

### URL Encoding

The playground state is encoded in the URL hash using a compressed JSON format:

```
https://guard-playground.hex-di.dev/#eyJwb2xpY3kiOi...
```

The hash contains:

```typescript
interface PlaygroundState {
  readonly policy: string;      // Serialized policy JSON
  readonly subject: string;     // Subject JSON
  readonly resource?: string;   // Optional resource JSON
  readonly version: number;     // Playground schema version
}
```

The state is compressed with `pako` (deflate) and encoded with base64url to minimize URL length.

### GxP Data Classification

```
REQUIREMENT: When the playground loads policies that originate from a gxp:true guard
             configuration (detected via the presence of gxpMode: true in the
             PlaygroundState or via a gxp:true flag in the serialized policy metadata),
             the playground MUST display a prominent, non-dismissible banner:

             "⚠ Development Tool Only — Evaluations performed in this playground are NOT
             audited and do NOT constitute GxP-compliant authorization decisions. Policy
             data from a GxP-configured system is being processed in an unvalidated
             browser environment."

             The banner MUST remain visible for the duration of the session. The banner
             MUST use a visually distinct style (e.g., amber/yellow background with
             contrasting text) that cannot be confused with normal playground content.

             Rationale: The playground processes policy logic in the browser without
             audit trail recording, WAL crash recovery, or access control enforcement.
             Processing GxP policy data outside the controlled GxP environment without
             a clear data classification warning could mislead users into treating
             playground evaluations as compliance-relevant.
             Reference: 21 CFR 11.10(d) (system access controls),
             EU GMP Annex 11 §12 (security).

RECOMMENDED: The playground SHOULD disable the "Share URL" feature when GxP policy
             data is loaded, to prevent GxP policy configurations from being shared
             via uncontrolled URLs. If sharing is permitted, the shared URL SHOULD
             include the gxpMode flag so the banner is displayed for recipients.

RECOMMENDED: The playground SHOULD NOT persist any subject, policy, or evaluation
             data beyond the current browser session. All playground state SHOULD be
             held in memory only and cleared on page unload. When GxP mode is active,
             the warning banner SHOULD include: "Do not enter production subject data
             or real patient identifiers in the playground." This prevents accidental
             exposure of GxP-regulated data in an unvalidated browser environment.
             Reference: 21 CFR 11.10(c) (protection of electronic records),
             MHRA Data Integrity Guidance (2018).
```

```
RECOMMENDED: The playground SHOULD include a "Copy as TypeScript" button
             that generates importable TypeScript code for the current
             policy. The generated code SHOULD use the guard builder API
             (hasPermission, allOf, etc.) rather than the serialized JSON.

RECOMMENDED: The playground SHOULD include a "Copy as CLI test" button
             that generates a guard test file for the current policy/subject
             combination.
```

---

## 81. VS Code Extension

**Package:** `hex-di-guard-vscode` (VS Code Marketplace)

A VS Code extension providing inline policy visualization, evaluation, and autocomplete for guard policies.

### Features

#### Policy JSON Schema

Register the guard policy JSON schema for `.guard.json` files:

```json
{
  "json.schemas": [
    {
      "fileMatch": ["*.guard.json"],
      "url": "https://hex-di.dev/schemas/guard/policy/v1.json"
    }
  ]
}
```

Provides:
- Syntax validation for serialized policies
- Autocomplete for `kind` values (`hasPermission`, `hasRole`, etc.)
- Inline documentation for each policy variant
- Error highlighting for invalid permission formats

#### Inline Evaluation Code Lens

Show evaluation results inline above `guard()` calls:

```typescript
// ▶ Evaluate (admin: ALLOW, viewer: DENY, guest: DENY)
const GuardedUserRepo = guard(UserRepoAdapter, {
  resolve: allOf(hasPermission(UserPerms.read), hasRole("editor")),
});
```

The code lens:
1. Discovers `guard()` calls via AST analysis
2. Loads test subjects from `guard.config.ts` or `*.fixture.ts` files
3. Evaluates the policy against each subject
4. Shows results inline as a clickable code lens

#### Permission/Role Autocomplete

Provide autocomplete for `hasPermission()` and `hasRole()` arguments:

```typescript
hasPermission(UserPerms.█)
//                       ↑ autocomplete: read, write, delete
```

```typescript
hasRole("█")
//      ↑ autocomplete: admin, editor, viewer
```

The extension discovers permissions and roles by:
1. Scanning `guard.config.ts` for configured paths
2. Parsing the permission registry and role definitions
3. Providing IntelliSense with descriptions and metadata

#### Trace Tree Panel

A sidebar panel that visualizes the EvaluationTrace as an interactive tree:

```
Guard Trace: UserRepoPort
├─ allOf [DENY]
│  ├─ hasPermission(user:read) [ALLOW] 0.01ms
│  └─ hasRole('editor') [DENY] 0.00ms
│     reason: subject 'viewer-1' does not have role 'editor'
```

The panel updates in real-time when:
- The policy code changes
- The selected test subject changes
- The code lens "Evaluate" action is triggered

#### Policy Diff View

Compare two policy versions side-by-side with structural diff highlighting:

- Added policies highlighted in green
- Removed policies highlighted in red
- Changed matchers/permissions/roles highlighted in yellow
- Unchanged sub-trees collapsed

Triggered via:
- Command palette: "Guard: Compare Policy Versions"
- Git gutter: click on a changed `guard()` call to see the policy diff

### Extension Architecture

```
hex-di-guard-vscode
  ├── Language Server (Node.js)
  │   ├── @hex-di/guard     (policy evaluation)
  │   ├── TypeScript AST    (guard() call discovery)
  │   └── JSON Schema       (policy validation)
  └── Extension Client (VS Code API)
      ├── Code Lens Provider
      ├── Completion Provider
      ├── Tree View Provider (trace panel)
      └── Diff View Provider
```

---

## 82. Policy Coverage Analysis

**Package:** `@hex-di/guard-coverage` (ships in `@hex-di/guard-cli`)

Policy coverage tracks which policy nodes were exercised during testing, identifying untested branches, unreachable policies, and permission gaps.

### Coverage Metrics

| Metric | Description |
|---|---|
| **Node coverage** | Percentage of policy tree nodes that were evaluated at least once |
| **Branch coverage** | Percentage of allOf/anyOf branches that were evaluated in both allow and deny outcomes |
| **Permission coverage** | Percentage of registered permissions tested as both allow AND deny |
| **Role coverage** | Percentage of defined roles tested as both allow AND deny |
| **Decision coverage** | Percentage of guarded ports tested with at least one allow and one deny decision |

### Coverage Collection

Coverage is collected by wrapping the `evaluate()` function with an instrumented version that records evaluation events:

```typescript
import { createCoverageCollector } from "@hex-di/guard-coverage";

/**
 * Creates a coverage collector that instruments evaluate() calls.
 *
 * @param options.permissionRegistry - All known permissions (for coverage denominator)
 * @param options.roleRegistry - All known roles (for coverage denominator)
 * @param options.policyRegistry - All policies keyed by port name (for node coverage)
 */
function createCoverageCollector(options: {
  readonly permissionRegistry: ReadonlyArray<string>;
  readonly roleRegistry: ReadonlyArray<string>;
  readonly policyRegistry: Readonly<Record<string, PolicyConstraint>>;
}): CoverageCollector;

interface CoverageCollector {
  /** Wrap evaluate() to collect coverage data. */
  readonly instrument: (
    evaluateFn: typeof evaluate
  ) => typeof evaluate;

  /** Get the current coverage report. */
  readonly getReport: () => CoverageReport;

  /** Reset all coverage data. */
  readonly reset: () => void;
}
```

### Coverage Report

```typescript
interface CoverageReport {
  /** Overall coverage percentage (0-100). */
  readonly totalCoverage: number;

  /** Per-metric breakdown. */
  readonly nodeCoverage: CoverageMetric;
  readonly branchCoverage: CoverageMetric;
  readonly permissionCoverage: CoverageMetric;
  readonly roleCoverage: CoverageMetric;
  readonly decisionCoverage: CoverageMetric;

  /** Uncovered items for diagnostic output. */
  readonly uncoveredNodes: ReadonlyArray<UncoveredNode>;
  readonly uncoveredPermissions: ReadonlyArray<string>;
  readonly uncoveredRoles: ReadonlyArray<string>;
  readonly uncoveredPorts: ReadonlyArray<string>;
}

interface CoverageMetric {
  readonly covered: number;
  readonly total: number;
  readonly percentage: number;
}

interface UncoveredNode {
  readonly portName: string;
  readonly policyPath: string; // e.g., "allOf > [1] > anyOf > [0]"
  readonly kind: string;
  readonly description: string;
}
```

### CLI Integration

```
guard test --coverage

Output:
  Policy Coverage Report
  ──────────────────────
  Node coverage:       87.5% (42/48 nodes)
  Branch coverage:     75.0% (18/24 branches)
  Permission coverage: 91.7% (11/12 permissions)
  Role coverage:       100%  (3/3 roles)
  Decision coverage:   80.0% (4/5 ports)
  ──────────────────────
  Total:               86.8%

  Uncovered nodes:
    UserRepoPort > allOf > [1] > anyOf > [2] > hasAttribute('isOwner')
      Never evaluated — no test subject triggers this branch

  Uncovered permissions:
    audit:export — never tested as deny

  Uncovered ports:
    SettingsPort — no deny test cases

guard test --coverage --reporter json > coverage.json
guard test --coverage --reporter html  # generates coverage/index.html
```

### CI Integration

```
guard test --coverage --min-coverage 80

Exit code 1 if total coverage is below 80%.
```

```
RECOMMENDED: GxP environments SHOULD require 100% permission coverage and
             100% decision coverage. These metrics provide OQ evidence that
             every authorization path has been verified in both the allow
             and deny directions.
             Reference: GAMP 5 Category 5 (comprehensive testing).
```

---

## 83. Policy Diff & Migration

**Package:** `@hex-di/guard-diff` (ships in `@hex-di/guard-cli`)

Policy diff provides structural comparison between policy versions. Policy migration provides schema migration for serialized policies across guard versions.

### Policy Diff

```typescript
import { diffPolicies } from "@hex-di/guard-diff";

/**
 * Computes a structural diff between two policy trees.
 *
 * @param oldPolicy - The previous policy version
 * @param newPolicy - The new policy version
 * @returns A diff tree showing additions, removals, and changes
 */
function diffPolicies(
  oldPolicy: PolicyConstraint,
  newPolicy: PolicyConstraint
): PolicyDiff;

type PolicyDiff =
  | { readonly kind: "unchanged"; readonly policy: PolicyConstraint }
  | { readonly kind: "added"; readonly policy: PolicyConstraint }
  | { readonly kind: "removed"; readonly policy: PolicyConstraint }
  | {
      readonly kind: "changed";
      readonly oldPolicy: PolicyConstraint;
      readonly newPolicy: PolicyConstraint;
      readonly changes: ReadonlyArray<PolicyChange>;
    }
  | {
      readonly kind: "composite";
      readonly combinator: "allOf" | "anyOf" | "not";
      readonly children: ReadonlyArray<PolicyDiff>;
    };

interface PolicyChange {
  readonly field: string;
  readonly oldValue: unknown;
  readonly newValue: unknown;
}
```

### CLI Integration

```
guard diff <old-policy-file> <new-policy-file>

Options:
  --format <type>   Output format: "text", "json", "markdown" (default: "text")

Example:
  guard diff policies/v1/admin.json policies/v2/admin.json

Output (text format):
  Policy Diff: admin
  ─────────────
  ~ allOf (2 children → 3 children)
    = hasPermission(user:read)           [unchanged]
    = hasRole('admin')                   [unchanged]
    + hasAttribute('department', eq(subject('department')))  [added]

  Impact: 1 permission unchanged, 1 role unchanged, 1 attribute check added.
  Affected ports: UserRepoPort, SettingsPort
```

### Impact Analysis

```typescript
import { analyzePolicyImpact } from "@hex-di/guard-diff";

/**
 * Analyzes the impact of a policy change on roles and permissions.
 *
 * @param diff - The policy diff
 * @param roles - All defined roles
 * @returns Impact analysis showing which roles/permissions are affected
 */
function analyzePolicyImpact(
  diff: PolicyDiff,
  roles: ReadonlyArray<Role>
): PolicyImpact;

interface PolicyImpact {
  /** Roles that may see different authorization outcomes after the change. */
  readonly affectedRoles: ReadonlyArray<string>;

  /** Permissions referenced in added or changed policies. */
  readonly addedPermissionRefs: ReadonlyArray<string>;

  /** Permissions no longer referenced after the change. */
  readonly removedPermissionRefs: ReadonlyArray<string>;

  /** Summary counts. */
  readonly addedNodes: number;
  readonly removedNodes: number;
  readonly changedNodes: number;
  readonly unchangedNodes: number;
}
```

### Policy Migration

```typescript
import { migratePolicy } from "@hex-di/guard-diff";

/**
 * Migrates a serialized policy from one schema version to another.
 *
 * @param json - The serialized policy JSON
 * @param fromVersion - Source schema version
 * @param toVersion - Target schema version
 * @returns The migrated policy JSON, or an error if migration is not possible
 */
function migratePolicy(
  json: string,
  fromVersion: number,
  toVersion: number
): Result<string, PolicyMigrationError>;

interface PolicyMigrationError {
  readonly code: "ACL032";
  readonly message: string;
  readonly fromVersion: number;
  readonly toVersion: number;
  readonly breakingChanges: ReadonlyArray<string>;
}
```

### CLI Integration

```
guard migrate <policy-file-or-glob> --to <version>

Options:
  --to <version>    Target schema version
  --dry-run         Show what would change without modifying files
  --backup          Create .bak files before migrating

Example:
  guard migrate policies/*.json --to 2 --dry-run

Output:
  policies/admin.json: 3 changes required
    - hasSignature: add "signerRole" field (default: undefined)
    - allOf: add "fieldStrategy" field (default: "intersection")
    - version: 1 → 2

  policies/viewer.json: no changes required

  Dry run complete. 1 of 2 files would be modified.
```

### Audit Trail Integration

Policy changes detected by `guard diff` are recorded in the audit trail when policies are deployed:

```typescript
interface PolicyChangeAuditEntry {
  readonly kind: "policy_change";
  readonly timestamp: string;
  readonly changedBy: string;
  readonly portName: string;
  readonly oldPolicyHash: string;
  readonly newPolicyHash: string;
  readonly diff: PolicyDiff;
  readonly changeControlReference: string; // CCR number
}
```

```
REQUIREMENT: In GxP environments, all policy changes MUST be recorded
             as PolicyChangeAuditEntry instances in the audit trail.
             The entry MUST include the old and new policy hashes,
             the structural diff, and the change control reference (CCR).
             Policy changes without a CCR reference MUST be rejected.
             Reference: EU GMP Annex 11 §10 (change management),
             21 CFR 11.10(e).

RECOMMENDED: CI/CD pipelines SHOULD run `guard diff` on policy changes
             and include the diff output in pull request descriptions.
             This provides reviewers with a clear summary of authorization
             changes.
```

---

## Developer Experience Packages

| Package | Description | Distribution |
|---|---|---|
| `@hex-di/guard-cli` | CLI tool: init, check, test, explain, hash, audit verify, bundle pack/verify, diff, migrate, coverage | npm binary |
| `@hex-di/guard-playground` | Web-based interactive policy builder and evaluator | Static SPA |
| `hex-di-guard-vscode` | VS Code extension: schema, code lens, autocomplete, trace panel, diff view | VS Code Marketplace |
| `@hex-di/guard-coverage` | Policy coverage analysis (bundled in CLI) | npm library |
| `@hex-di/guard-diff` | Policy diff and migration (bundled in CLI) | npm library |

---

## Integration Test Scenarios

### CLI (CL)

| ID | Scenario | Setup | Assert |
|---|---|---|---|
| CL-1 | guard init creates scaffold | Run `guard init --template rbac` in empty directory | Creates guard/ directory with permissions.ts, roles.ts, policies.ts, guard.config.ts |
| CL-2 | guard check validates policy | Create valid and invalid policy JSON files | Valid: exit code 0. Invalid: exit code 1 with error message |
| CL-3 | guard test runs assertions | Create test file with allow/deny assertions | All assertions pass; exit code 0 |
| CL-4 | guard explain outputs trace | Run explain with policy and subject JSON | Output contains ALLOW/DENY verdict and indented trace tree |
| CL-5 | guard hash is deterministic | Hash same policy twice | Identical hash output |
| CL-6 | guard audit verify validates chain | Create export with valid chain; create export with tampered entry | Valid: pass. Tampered: fail with chain break location |
| CL-7 | guard bundle pack and verify round-trip | Pack a bundle with signing; verify with public key | Verification passes; content hash and signature valid |

### Coverage (CV)

| ID | Scenario | Setup | Assert |
|---|---|---|---|
| CV-1 | Full coverage report | Run tests with coverage against a policy tree with 6 nodes | All 6 nodes covered; 100% node coverage |
| CV-2 | Uncovered branch detection | Run tests that only test allow path for an anyOf branch | Branch coverage < 100%; uncovered node listed in report |
| CV-3 | CI threshold enforcement | Run with --min-coverage 90 against 80% coverage | Exit code 1 |

### Diff (DF)

| ID | Scenario | Setup | Assert |
|---|---|---|---|
| DF-1 | Unchanged policy diff | Diff identical policies | All nodes "unchanged" |
| DF-2 | Added node detection | Diff policy with 2 children vs 3 children | Third child marked as "added" |
| DF-3 | Impact analysis | Diff policy adding hasAttribute check | affectedRoles includes roles that have the permission but may lack the attribute |
| DF-4 | Migration v1 to v2 | Migrate a v1 policy to v2 format | Output is valid v2 JSON; round-trip through deserializePolicy succeeds |

```
REQUIREMENT: The 14 integration test scenarios defined above (CL-1 through CL-7,
             CV-1 through CV-3, DF-1 through DF-4) MUST be implemented in the
             @hex-di/guard-cli test suite. All scenarios MUST pass before the
             CLI package is published.
```

---

_Previous: [18 - Ecosystem Extensions](./ecosystem-extensions.md)_
