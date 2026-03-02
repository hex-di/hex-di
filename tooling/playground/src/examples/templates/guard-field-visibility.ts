/**
 * Guard: Field-Level Visibility
 *
 * Demonstrates how policies can control which data fields a subject
 * can see. Shows intersection, union, and first field strategies
 * for composite policies.
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
  withLabel,
  evaluate,
  gte,
  eq,
  literal,
} from "@hex-di/guard";

// ---------------------------------------------------------------------------
// Scenario: Patient health record with field-level access control
//
// Different roles see different fields of the same record:
//   - Receptionist: name, dateOfBirth, insuranceId
//   - Nurse: name, dateOfBirth, vitals, medications, allergies
//   - Doctor: name, dateOfBirth, vitals, medications, allergies, diagnosis, labResults
//   - Admin: all fields
// ---------------------------------------------------------------------------

console.log("=== Field-Level Visibility: Patient Record ===");

// Permissions with field annotations
const viewPatient = createPermission({ resource: "patient", action: "read" });

const viewBasicInfo = hasPermission(viewPatient, {
  fields: ["name", "dateOfBirth", "insuranceId"],
});

const viewClinicalInfo = hasPermission(viewPatient, {
  fields: ["name", "dateOfBirth", "vitals", "medications", "allergies"],
});

const viewFullRecord = hasPermission(viewPatient, {
  fields: ["name", "dateOfBirth", "vitals", "medications", "allergies",
           "diagnosis", "labResults", "notes", "insuranceId"],
});

// ---------------------------------------------------------------------------
// 1. Simple field visibility — single policy
// ---------------------------------------------------------------------------

const receptionist = createAuthSubject(
  "jane-reception",
  ["receptionist"],
  new Set(["patient:read"]),
);

const nurse = createAuthSubject(
  "sarah-nurse",
  ["nurse"],
  new Set(["patient:read"]),
);

const doctor = createAuthSubject(
  "dr-smith",
  ["doctor"],
  new Set(["patient:read"]),
);

console.log("\\n--- Single Policy Field Visibility ---");

const receptionistAccess = evaluate(viewBasicInfo, { subject: receptionist });
if (receptionistAccess.isOk() && receptionistAccess.value.kind === "allow") {
  console.log("Receptionist sees:", receptionistAccess.value.visibleFields?.join(", "));
}

const doctorAccess = evaluate(viewFullRecord, { subject: doctor });
if (doctorAccess.isOk() && doctorAccess.value.kind === "allow") {
  console.log("Doctor sees:", doctorAccess.value.visibleFields?.join(", "));
}

// ---------------------------------------------------------------------------
// 2. allOf with intersection strategy (default) — least privilege
// ---------------------------------------------------------------------------

console.log("\\n--- allOf + intersection: Least Privilege ---");
console.log("Both policies must pass; visible fields = intersection of both sets");

const intersectionPolicy = withLabel("Intersection Access", allOf(
  hasPermission(viewPatient, {
    fields: ["name", "dateOfBirth", "vitals", "medications"],
  }),
  hasPermission(viewPatient, {
    fields: ["name", "dateOfBirth", "allergies", "medications"],
  }),
  // Default fieldStrategy for allOf is "intersection"
));

const intersectionResult = evaluate(intersectionPolicy, { subject: nurse });
if (intersectionResult.isOk() && intersectionResult.value.kind === "allow") {
  console.log("Intersection fields:", intersectionResult.value.visibleFields?.join(", "));
  // name, dateOfBirth, medications (common to both sets)
}

// ---------------------------------------------------------------------------
// 3. anyOf with first strategy (default) — first allow wins
// ---------------------------------------------------------------------------

console.log("\\n--- anyOf + first: First Allow Wins ---");
console.log("First matching policy determines visible fields");

const firstPolicy = withLabel("First Match Access", anyOf(
  withLabel("Clinical View", hasPermission(viewPatient, {
    fields: ["vitals", "medications", "allergies"],
  })),
  withLabel("Full View", hasPermission(viewPatient, {
    fields: ["name", "dateOfBirth", "vitals", "medications", "allergies",
             "diagnosis", "labResults"],
  })),
  // Default fieldStrategy for anyOf is "first"
));

const firstResult = evaluate(firstPolicy, { subject: nurse });
if (firstResult.isOk() && firstResult.value.kind === "allow") {
  console.log("First-match fields:", firstResult.value.visibleFields?.join(", "));
  // vitals, medications, allergies (from the first matching policy)
}

// ---------------------------------------------------------------------------
// 4. anyOf with union strategy — maximum visibility
// ---------------------------------------------------------------------------

console.log("\\n--- anyOf + union: Maximum Visibility ---");
console.log("Union of all allowing policies' fields (evaluates ALL children)");

const unionPolicy = withLabel("Union Access", anyOf(
  withLabel("Basic View", hasPermission(viewPatient, {
    fields: ["name", "dateOfBirth"],
  })),
  withLabel("Clinical View", hasPermission(viewPatient, {
    fields: ["vitals", "medications"],
  })),
  withLabel("Insurance View", hasPermission(viewPatient, {
    fields: ["insuranceId"],
  })),
  { fieldStrategy: "union" },
));

const unionResult = evaluate(unionPolicy, { subject: nurse });
if (unionResult.isOk() && unionResult.value.kind === "allow") {
  console.log("Union fields:", unionResult.value.visibleFields?.join(", "));
  // All fields from all three policies combined
}

// ---------------------------------------------------------------------------
// 5. Real-world: Role-based field masking
// ---------------------------------------------------------------------------

console.log("\\n--- Role-Based Field Masking ---");

const patientRecordPolicy = withLabel("Patient Record Policy", anyOf(
  withLabel("Admin: Full Access", allOf(
    hasRole("admin"),
    hasPermission(viewPatient, {
      fields: ["name", "dateOfBirth", "vitals", "medications", "allergies",
               "diagnosis", "labResults", "notes", "insuranceId", "ssn"],
    }),
  )),
  withLabel("Doctor: Clinical", allOf(
    hasRole("doctor"),
    hasPermission(viewPatient, {
      fields: ["name", "dateOfBirth", "vitals", "medications", "allergies",
               "diagnosis", "labResults", "notes"],
    }),
  )),
  withLabel("Nurse: Care", allOf(
    hasRole("nurse"),
    hasPermission(viewPatient, {
      fields: ["name", "dateOfBirth", "vitals", "medications", "allergies"],
    }),
  )),
  withLabel("Receptionist: Basic", allOf(
    hasRole("receptionist"),
    hasPermission(viewPatient, {
      fields: ["name", "dateOfBirth", "insuranceId"],
    }),
  )),
));

for (const subject of [receptionist, nurse, doctor]) {
  const result = evaluate(patientRecordPolicy, { subject });
  if (result.isOk() && result.value.kind === "allow") {
    console.log(subject.id + ":", result.value.visibleFields?.join(", "));
  } else if (result.isOk()) {
    console.log(subject.id + ": DENIED");
  }
}

console.log("\\nDone! Check the Guard panel to see field visibility in traces.");
`;

export const guardFieldVisibility: ExampleTemplate = {
  id: "guard-field-visibility",
  title: "Guard: Field-Level Visibility",
  description: "Field masking with intersection, union, first strategies on composite policies",
  category: "guard",
  files: new Map([["main.ts", MAIN_TS]]),
  entryPoint: "main.ts",
  defaultPanel: "guard",
};
