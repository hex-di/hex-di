/**
 * Guard: Composite Policies
 *
 * Demonstrates allOf, anyOf, not, and withLabel combinators.
 * Shows how policies compose into trees with short-circuit evaluation.
 */

import type { ExampleTemplate } from "../types.js";

const MAIN_TS = `import {
  createPermission,
  createAuthSubject,
  hasPermission,
  hasRole,
  hasAttribute,
  allOf,
  anyOf,
  not,
  withLabel,
  evaluate,
  eq,
  literal,
  gte,
} from "@hex-di/guard";

// ---------------------------------------------------------------------------
// Setup: permissions and subjects
// ---------------------------------------------------------------------------

const readDoc  = createPermission({ resource: "document", action: "read" });
const writeDoc = createPermission({ resource: "document", action: "write" });
const approveDoc = createPermission({ resource: "document", action: "approve" });

const seniorEditor = createAuthSubject(
  "senior-editor",
  ["editor", "reviewer"],
  new Set(["document:read", "document:write", "document:approve"]),
  { clearanceLevel: 3, department: "engineering" },
);

const juniorWriter = createAuthSubject(
  "junior-writer",
  ["writer"],
  new Set(["document:read", "document:write"]),
  { clearanceLevel: 1, department: "engineering" },
);

const externalViewer = createAuthSubject(
  "external-viewer",
  ["guest"],
  new Set(["document:read"]),
  { clearanceLevel: 0, department: "external" },
);

// ---------------------------------------------------------------------------
// 1. allOf — ALL children must allow (short-circuits on first deny)
// ---------------------------------------------------------------------------

console.log("=== allOf: Require read AND write AND approve ===");

const requireAll = withLabel("Full Document Access", allOf(
  hasPermission(readDoc),
  hasPermission(writeDoc),
  hasPermission(approveDoc),
));

const seniorAll = evaluate(requireAll, { subject: seniorEditor });
console.log("Senior editor:", seniorAll.isOk() && seniorAll.value.kind);

const juniorAll = evaluate(requireAll, { subject: juniorWriter });
console.log("Junior writer:", juniorAll.isOk() && juniorAll.value.kind);
// Junior fails at approve — read and write pass, approve is denied
// The tree shows short-circuit: approve node is the first deny

// ---------------------------------------------------------------------------
// 2. anyOf — ANY child must allow (short-circuits on first allow)
// ---------------------------------------------------------------------------

console.log("\\n=== anyOf: Editor OR Reviewer role ===");

const editorOrReviewer = withLabel("Content Team", anyOf(
  hasRole("editor"),
  hasRole("reviewer"),
));

const seniorAny = evaluate(editorOrReviewer, { subject: seniorEditor });
console.log("Senior editor:", seniorAny.isOk() && seniorAny.value.kind);
// Short-circuits after "editor" passes — "reviewer" is never evaluated

const externalAny = evaluate(editorOrReviewer, { subject: externalViewer });
console.log("External viewer:", externalAny.isOk() && externalAny.value.kind);
// Both fail — guest is neither editor nor reviewer

// ---------------------------------------------------------------------------
// 3. not — Negate a policy
// ---------------------------------------------------------------------------

console.log("\\n=== not: Must NOT be a guest ===");

const notGuest = withLabel("No Guests", not(hasRole("guest")));

const seniorNotGuest = evaluate(notGuest, { subject: seniorEditor });
console.log("Senior editor (not guest):", seniorNotGuest.isOk() && seniorNotGuest.value.kind);

const externalNotGuest = evaluate(notGuest, { subject: externalViewer });
console.log("External viewer (not guest):", externalNotGuest.isOk() && externalNotGuest.value.kind);

// ---------------------------------------------------------------------------
// 4. Nested composition — real-world policy tree
// ---------------------------------------------------------------------------

console.log("\\n=== Nested: (read AND clearance >= 2) OR admin ===");

const advancedPolicy = withLabel("Advanced Document Access", anyOf(
  withLabel("Cleared Reader", allOf(
    hasPermission(readDoc),
    hasAttribute("clearanceLevel", gte(2)),
  )),
  withLabel("Admin Override", hasRole("admin")),
));

const seniorAdvanced = evaluate(advancedPolicy, { subject: seniorEditor });
console.log("Senior editor (clearance 3):", seniorAdvanced.isOk() && seniorAdvanced.value.kind);

const juniorAdvanced = evaluate(advancedPolicy, { subject: juniorWriter });
console.log("Junior writer (clearance 1):", juniorAdvanced.isOk() && juniorAdvanced.value.kind);

const externalAdvanced = evaluate(advancedPolicy, { subject: externalViewer });
console.log("External viewer (clearance 0):", externalAdvanced.isOk() && externalAdvanced.value.kind);

// ---------------------------------------------------------------------------
// 5. Deep tree — multiple levels
// ---------------------------------------------------------------------------

console.log("\\n=== Deep Tree: Engineering access control ===");

const engineeringAccess = withLabel("Engineering Portal", allOf(
  withLabel("Authentication", anyOf(
    hasRole("editor"),
    hasRole("reviewer"),
    hasRole("admin"),
  )),
  withLabel("Department Check", hasAttribute("department", eq(literal("engineering")))),
  withLabel("Write Capability", anyOf(
    hasPermission(writeDoc),
    hasPermission(approveDoc),
  )),
));

const seniorEng = evaluate(engineeringAccess, { subject: seniorEditor });
console.log("Senior editor:", seniorEng.isOk() && seniorEng.value.kind);

const externalEng = evaluate(engineeringAccess, { subject: externalViewer });
console.log("External viewer:", externalEng.isOk() && externalEng.value.kind);
// Fails at Authentication (first allOf child) — department and write checks are short-circuited

console.log("\\nDone! Check the Guard panel to see the policy tree structure.");
`;

export const guardCompositePolicies: ExampleTemplate = {
  id: "guard-composite-policies",
  title: "Guard: Composite Policies",
  description: "allOf, anyOf, not, withLabel — tree composition with short-circuit evaluation",
  category: "guard",
  files: new Map([["main.ts", MAIN_TS]]),
  entryPoint: "main.ts",
  defaultPanel: "guard",
};
