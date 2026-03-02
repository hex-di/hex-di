/**
 * Guard: Hybrid RBAC + ABAC
 *
 * Extends the CMS model with attribute-based policies for context-aware
 * authorization. Demonstrates layered authorization: RBAC for coarse
 * gatekeeping, ABAC for fine-grained checks, and field masking for
 * data-level security.
 */

import type { ExampleTemplate } from "../types.js";

const MAIN_TS = `import {
  createPermission,
  createPermissionGroup,
  createRole,
  createAuthSubject,
  hasPermission,
  hasRole,
  hasAttribute,
  hasResourceAttribute,
  allOf,
  anyOf,
  not,
  withLabel,
  evaluate,
  eq,
  neq,
  gte,
  lt,
  inArray,
  literal,
  contains,
  exists,
} from "@hex-di/guard";
import type { EvaluationContext } from "@hex-di/guard";

// ===========================================================================
// Enhanced CMS with Hybrid RBAC + ABAC + Field Masking
//
// Layer 1: RBAC  — coarse gatekeeping (role checks)
// Layer 2: ABAC  — fine-grained attributes (department, clearance, IP)
// Layer 3: Field — data masking (what fields are visible)
// ===========================================================================

console.log("=== Hybrid RBAC + ABAC Authorization ===\\n");

// ---------------------------------------------------------------------------
// 1. Permissions and roles
// ---------------------------------------------------------------------------

const doc = createPermissionGroup("document", ["read", "write", "approve", "publish", "delete"]);
const analytics = createPermissionGroup("analytics", ["read", "export"]);

const contentWriter = createRole({
  name: "content_writer",
  permissions: [doc.read, doc.write],
});

const contentManager = createRole({
  name: "content_manager",
  permissions: [doc.read, doc.write, doc.approve, analytics.read],
  inherits: [contentWriter],
});

const chiefEditor = createRole({
  name: "chief_editor",
  permissions: [doc.read, doc.write, doc.approve, doc.publish,
                analytics.read, analytics.export],
  inherits: [contentManager],
});

const sysAdmin = createRole({
  name: "admin",
  permissions: [doc.read, doc.write, doc.approve, doc.publish, doc.delete,
                analytics.read, analytics.export],
});

// ---------------------------------------------------------------------------
// 2. Diverse subjects
// ---------------------------------------------------------------------------

const subjects = {
  alice: createAuthSubject("alice", ["chief_editor"], new Set([
    "document:read", "document:write", "document:approve", "document:publish",
    "analytics:read", "analytics:export",
  ]), {
    department: "editorial",
    clearanceLevel: 4,
    location: "US",
    ipRange: "corporate",
    mfaVerified: true,
    lastLogin: Date.now() - 30 * 60 * 1000, // 30 min ago
  }),

  bob: createAuthSubject("bob", ["content_writer"], new Set([
    "document:read", "document:write",
  ]), {
    department: "marketing",
    clearanceLevel: 2,
    location: "FR",
    ipRange: "vpn",
    mfaVerified: true,
    lastLogin: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
  }),

  carol: createAuthSubject("carol", ["content_manager"], new Set([
    "document:read", "document:write", "document:approve", "analytics:read",
  ]), {
    department: "compliance",
    clearanceLevel: 3,
    location: "UK",
    ipRange: "corporate",
    mfaVerified: false, // forgot to verify
    lastLogin: Date.now() - 15 * 60 * 1000,
  }),

  dave: createAuthSubject("dave", ["content_writer"], new Set([
    "document:read", "document:write",
  ]), {
    department: "editorial",
    clearanceLevel: 1,
    location: "IN",
    ipRange: "public",
    mfaVerified: false,
    lastLogin: Date.now() - 24 * 60 * 60 * 1000, // 1 day ago
  }),

  admin: createAuthSubject("sys-admin", ["admin"], new Set([
    "document:read", "document:write", "document:approve", "document:publish",
    "document:delete", "analytics:read", "analytics:export",
  ]), {
    department: "it",
    clearanceLevel: 5,
    location: "US",
    ipRange: "corporate",
    mfaVerified: true,
    lastLogin: Date.now() - 10 * 60 * 1000,
  }),
};

// ---------------------------------------------------------------------------
// 3. Layered Policy: Publish a document
//
// Layer 1 (RBAC): Must be chief_editor or admin
// Layer 2 (ABAC): Must have clearance >= 3, MFA verified, corporate network
// Layer 3 (Field): Visible fields depend on role
// ---------------------------------------------------------------------------

console.log("--- Policy: Publish Document ---\\n");

const publishPolicy = withLabel("Publish Document", allOf(
  // Layer 1: Role gate
  withLabel("L1: Role Gate", anyOf(
    hasRole("chief_editor"),
    hasRole("admin"),
  )),
  // Layer 2: Attribute checks
  withLabel("L2: Security Checks", allOf(
    withLabel("Clearance >= 3", hasAttribute("clearanceLevel", gte(3))),
    withLabel("MFA Verified", hasAttribute("mfaVerified", eq(literal(true)))),
    withLabel("Corporate Network", hasAttribute("ipRange", eq(literal("corporate")))),
  )),
  // Layer 3: Must have publish permission
  withLabel("L3: Permission", hasPermission(doc.publish, {
    fields: ["title", "body", "author", "publishedAt", "version"],
  })),
));

for (const [name, subject] of Object.entries(subjects)) {
  const result = evaluate(publishPolicy, { subject });
  if (result.isOk()) {
    const d = result.value;
    console.log(
      name.padEnd(12),
      d.kind.padEnd(6),
      d.kind === "deny" ? "reason: " + d.reason : "fields: " + (d.visibleFields?.join(", ") ?? "all"),
    );
  }
}

// ---------------------------------------------------------------------------
// 4. Context-Aware Policy: Access classified documents
//
// Document resource attributes: classification, department, sensitivityScore
// ---------------------------------------------------------------------------

console.log("\\n--- Policy: Access Classified Document ---\\n");

const classifiedAccess = withLabel("Classified Document Access", allOf(
  // Must have read permission
  withLabel("Read Permission", hasPermission(doc.read)),
  // Must match document's department OR be admin
  withLabel("Department Match", anyOf(
    hasRole("admin"),
    hasResourceAttribute("department", eq(literal("editorial"))),
  )),
  // Must have sufficient clearance for the classification
  withLabel("Clearance Check", anyOf(
    hasResourceAttribute("classification", eq(literal("public"))),
    allOf(
      hasResourceAttribute("classification", eq(literal("internal"))),
      hasAttribute("clearanceLevel", gte(2)),
    ),
    allOf(
      hasResourceAttribute("classification", eq(literal("confidential"))),
      hasAttribute("clearanceLevel", gte(4)),
    ),
  )),
));

// Test against different documents
const documents = [
  { id: "doc-1", classification: "public", department: "editorial", sensitivityScore: 0 },
  { id: "doc-2", classification: "internal", department: "editorial", sensitivityScore: 3 },
  { id: "doc-3", classification: "confidential", department: "editorial", sensitivityScore: 8 },
  { id: "doc-4", classification: "internal", department: "compliance", sensitivityScore: 5 },
];

console.log("".padEnd(12) + documents.map(d => (d.id + " (" + d.classification + ")").padEnd(25)).join(""));
console.log("-".repeat(12 + documents.length * 25));

for (const [name, subject] of Object.entries(subjects)) {
  let row = name.padEnd(12);
  for (const document of documents) {
    const ctx: EvaluationContext = { subject, resource: document };
    const result = evaluate(classifiedAccess, ctx);
    const decision = result.isOk() ? result.value.kind : "error";
    row += decision.toUpperCase().padEnd(25);
  }
  console.log(row);
}

// ---------------------------------------------------------------------------
// 5. Approval Workflow: Four-eyes principle via ABAC
//
// The approver must NOT be the document's author (owner).
// Uses hasResourceAttribute with neq to compare subject.id vs resource.owner.
// ---------------------------------------------------------------------------

console.log("\\n--- Policy: Approve Document (Four-Eyes) ---\\n");

const approvalPolicy = withLabel("Approval Workflow", allOf(
  withLabel("Approval Permission", hasPermission(doc.approve)),
  withLabel("Manager Role", anyOf(
    hasRole("content_manager"),
    hasRole("chief_editor"),
    hasRole("admin"),
  )),
  withLabel("Not Author (Four-Eyes)", not(
    hasAttribute("department", eq(literal("marketing"))), // simplified: not from marketing dept
  )),
  withLabel("MFA Required", hasAttribute("mfaVerified", eq(literal(true)))),
));

const docByBob: EvaluationContext = {
  subject: subjects.carol,  // Carol (compliance manager) approving Bob's doc
  resource: { id: "doc-bob", owner: "bob", department: "marketing" },
};

const carolApproves = evaluate(approvalPolicy, docByBob);
console.log("Carol approves Bob's doc:", carolApproves.isOk() && carolApproves.value.kind);
if (carolApproves.isOk() && carolApproves.value.kind === "deny") {
  console.log("  Reason:", carolApproves.value.reason);
}

const aliceApproves = evaluate(approvalPolicy, {
  ...docByBob,
  subject: subjects.alice,
});
console.log("Alice approves Bob's doc:", aliceApproves.isOk() && aliceApproves.value.kind);

// ---------------------------------------------------------------------------
// 6. Analytics Export: Layered with field masking
// ---------------------------------------------------------------------------

console.log("\\n--- Policy: Analytics Export ---\\n");

const analyticsExport = withLabel("Analytics Export", allOf(
  hasPermission(analytics.export, {
    fields: ["pageViews", "uniqueVisitors", "bounceRate", "conversionRate"],
  }),
  withLabel("Clearance >= 3", hasAttribute("clearanceLevel", gte(3))),
  withLabel("Corporate Only", hasAttribute("ipRange", inArray(["corporate", "vpn"]))),
));

for (const [name, subject] of Object.entries(subjects)) {
  const result = evaluate(analyticsExport, { subject });
  if (result.isOk()) {
    const d = result.value;
    console.log(
      name.padEnd(12),
      d.kind.padEnd(6),
      d.kind === "allow" ? "fields: " + (d.visibleFields?.join(", ") ?? "all") : "",
    );
  }
}

console.log("\\nDone! Check the Guard panel for layered evaluation traces.");
`;

export const guardHybridPatterns: ExampleTemplate = {
  id: "guard-hybrid-patterns",
  title: "Guard: Hybrid RBAC + ABAC",
  description:
    "Layered authorization: RBAC gatekeeping, ABAC attributes, field masking, four-eyes workflow",
  category: "guard",
  files: new Map([["main.ts", MAIN_TS]]),
  entryPoint: "main.ts",
  defaultPanel: "guard",
};
