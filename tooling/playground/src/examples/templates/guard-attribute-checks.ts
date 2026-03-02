/**
 * Guard: Attribute-Based Policies
 *
 * Demonstrates hasAttribute, hasResourceAttribute, and the full matcher DSL
 * for fine-grained ABAC decisions. Covers eq, neq, gte, lt, inArray,
 * exists, contains, and fieldMatch.
 */

import type { ExampleTemplate } from "../types.js";

const MAIN_TS = `import {
  createPermission,
  createAuthSubject,
  hasAttribute,
  hasResourceAttribute,
  allOf,
  anyOf,
  withLabel,
  evaluate,
  eq,
  neq,
  gte,
  lt,
  inArray,
  exists,
  contains,
  literal,
} from "@hex-di/guard";
import type { EvaluationContext } from "@hex-di/guard";

// ---------------------------------------------------------------------------
// Subjects with rich attributes
// ---------------------------------------------------------------------------

const alice = createAuthSubject(
  "alice",
  ["engineer"],
  new Set(["document:read", "document:write"]),
  {
    department: "engineering",
    clearanceLevel: 4,
    location: "US",
    certifications: ["iso-27001", "soc2"],
    manager: "carol",
    yearsOfExperience: 8,
  },
);

const bob = createAuthSubject(
  "bob",
  ["intern"],
  new Set(["document:read"]),
  {
    department: "marketing",
    clearanceLevel: 1,
    location: "FR",
    certifications: [],
    manager: "dave",
    yearsOfExperience: 0.5,
  },
);

// ---------------------------------------------------------------------------
// 1. eq — exact match
// ---------------------------------------------------------------------------

console.log("=== eq: Department must be engineering ===");
const deptPolicy = hasAttribute("department", eq(literal("engineering")));

const aliceDept = evaluate(deptPolicy, { subject: alice });
console.log("Alice (engineering):", aliceDept.isOk() && aliceDept.value.kind);

const bobDept = evaluate(deptPolicy, { subject: bob });
console.log("Bob (marketing):", bobDept.isOk() && bobDept.value.kind);

// ---------------------------------------------------------------------------
// 2. gte / lt — numeric range
// ---------------------------------------------------------------------------

console.log("\\n=== gte/lt: Clearance 2-5 ===");
const clearancePolicy = withLabel("Clearance Range", allOf(
  hasAttribute("clearanceLevel", gte(2)),
  hasAttribute("clearanceLevel", lt(6)),
));

const aliceClear = evaluate(clearancePolicy, { subject: alice });
console.log("Alice (level 4):", aliceClear.isOk() && aliceClear.value.kind);

const bobClear = evaluate(clearancePolicy, { subject: bob });
console.log("Bob (level 1):", bobClear.isOk() && bobClear.value.kind);

// ---------------------------------------------------------------------------
// 3. inArray — value in a set
// ---------------------------------------------------------------------------

console.log("\\n=== inArray: Location must be US, UK, or DE ===");
const locationPolicy = hasAttribute("location", inArray(["US", "UK", "DE"]));

const aliceLoc = evaluate(locationPolicy, { subject: alice });
console.log("Alice (US):", aliceLoc.isOk() && aliceLoc.value.kind);

const bobLoc = evaluate(locationPolicy, { subject: bob });
console.log("Bob (FR):", bobLoc.isOk() && bobLoc.value.kind);

// ---------------------------------------------------------------------------
// 4. contains — array contains value
// ---------------------------------------------------------------------------

console.log("\\n=== contains: Must have ISO-27001 certification ===");
const certPolicy = hasAttribute("certifications", contains("iso-27001"));

const aliceCert = evaluate(certPolicy, { subject: alice });
console.log("Alice (has iso-27001):", aliceCert.isOk() && aliceCert.value.kind);

const bobCert = evaluate(certPolicy, { subject: bob });
console.log("Bob (no certs):", bobCert.isOk() && bobCert.value.kind);

// ---------------------------------------------------------------------------
// 5. exists — attribute must be present
// ---------------------------------------------------------------------------

console.log("\\n=== exists: Must have a manager assigned ===");
const managerPolicy = hasAttribute("manager", exists());

const aliceManager = evaluate(managerPolicy, { subject: alice });
console.log("Alice (has manager):", aliceManager.isOk() && aliceManager.value.kind);

// ---------------------------------------------------------------------------
// 6. neq — not equal
// ---------------------------------------------------------------------------

console.log("\\n=== neq: Must NOT be from marketing ===");
const notMarketing = hasAttribute("department", neq(literal("marketing")));

const aliceNotMkt = evaluate(notMarketing, { subject: alice });
console.log("Alice (engineering):", aliceNotMkt.isOk() && aliceNotMkt.value.kind);

const bobNotMkt = evaluate(notMarketing, { subject: bob });
console.log("Bob (marketing):", bobNotMkt.isOk() && bobNotMkt.value.kind);

// ---------------------------------------------------------------------------
// 7. hasResourceAttribute — check resource properties
// ---------------------------------------------------------------------------

console.log("\\n=== hasResourceAttribute: Document classification ===");

const classifiedPolicy = withLabel("Classified Document Access", allOf(
  hasAttribute("clearanceLevel", gte(3)),
  hasResourceAttribute("classification", eq(literal("confidential"))),
));

// Evaluation with resource context
const confidentialDoc: EvaluationContext = {
  subject: alice,
  resource: { id: "doc-001", classification: "confidential", owner: "carol" },
};

const publicDoc: EvaluationContext = {
  subject: bob,
  resource: { id: "doc-002", classification: "public", owner: "dave" },
};

const aliceConfidential = evaluate(classifiedPolicy, confidentialDoc);
console.log("Alice + confidential doc:", aliceConfidential.isOk() && aliceConfidential.value.kind);

const bobConfidential = evaluate(classifiedPolicy, { ...confidentialDoc, subject: bob });
console.log("Bob + confidential doc:", bobConfidential.isOk() && bobConfidential.value.kind);

// ---------------------------------------------------------------------------
// 8. Complex ABAC: real-world compound policy
// ---------------------------------------------------------------------------

console.log("\\n=== Complex: Senior engineer access ===");
const seniorEngineerAccess = withLabel("Senior Engineer Access", allOf(
  withLabel("Department", hasAttribute("department", eq(literal("engineering")))),
  withLabel("Experience", hasAttribute("yearsOfExperience", gte(5))),
  withLabel("Clearance", hasAttribute("clearanceLevel", gte(3))),
  withLabel("Certified", anyOf(
    hasAttribute("certifications", contains("iso-27001")),
    hasAttribute("certifications", contains("soc2")),
  )),
));

const aliceSenior = evaluate(seniorEngineerAccess, { subject: alice });
console.log("Alice:", aliceSenior.isOk() && aliceSenior.value.kind);

const bobSenior = evaluate(seniorEngineerAccess, { subject: bob });
console.log("Bob:", bobSenior.isOk() && bobSenior.value.kind);
// Bob fails at Department — all subsequent checks are short-circuited

console.log("\\nDone! Check the Guard panel to see attribute evaluation traces.");
`;

export const guardAttributeChecks: ExampleTemplate = {
  id: "guard-attribute-checks",
  title: "Guard: Attribute-Based Policies",
  description:
    "hasAttribute, hasResourceAttribute, matchers: eq, neq, gte, lt, inArray, exists, contains",
  category: "guard",
  files: new Map([["main.ts", MAIN_TS]]),
  entryPoint: "main.ts",
  defaultPanel: "guard",
};
