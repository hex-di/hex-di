/**
 * Guard: Roles & Permissions
 *
 * Introduces the fundamentals of @hex-di/guard: creating permissions,
 * roles, and subjects, then evaluating simple policies.
 */

import type { ExampleTemplate } from "../types.js";

const MAIN_TS = `import {
  createPermission,
  createRole,
  createAuthSubject,
  hasPermission,
  hasRole,
  evaluate,
} from "@hex-di/guard";

// ---------------------------------------------------------------------------
// 1. Define permissions — typed tokens with resource:action pairs
// ---------------------------------------------------------------------------

const readArticle  = createPermission({ resource: "article", action: "read" });
const writeArticle = createPermission({ resource: "article", action: "write" });
const deleteArticle = createPermission({ resource: "article", action: "delete" });
const manageUsers  = createPermission({ resource: "user", action: "manage" });

console.log("Permissions defined:");
console.log("  article:read, article:write, article:delete, user:manage");

// ---------------------------------------------------------------------------
// 2. Define roles — bundles of permissions with optional inheritance
// ---------------------------------------------------------------------------

const viewer = createRole({
  name: "viewer",
  permissions: [readArticle],
});

const editor = createRole({
  name: "editor",
  permissions: [readArticle, writeArticle],
});

const admin = createRole({
  name: "admin",
  permissions: [readArticle, writeArticle, deleteArticle, manageUsers],
});

console.log("\\nRoles defined: viewer, editor, admin");

// ---------------------------------------------------------------------------
// 3. Create subjects — the entities being authorized
// ---------------------------------------------------------------------------

const alice = createAuthSubject(
  "alice",
  ["editor"],
  new Set(["article:read", "article:write"]),
  { department: "engineering" },
);

const bob = createAuthSubject(
  "bob",
  ["viewer"],
  new Set(["article:read"]),
  { department: "marketing" },
);

const charlie = createAuthSubject(
  "charlie",
  ["admin"],
  new Set(["article:read", "article:write", "article:delete", "user:manage"]),
  { department: "engineering" },
);

console.log("\\nSubjects: Alice (editor), Bob (viewer), Charlie (admin)");

// ---------------------------------------------------------------------------
// 4. Define policies — what is required to access a resource
// ---------------------------------------------------------------------------

const canReadPolicy = hasPermission(readArticle);
const canWritePolicy = hasPermission(writeArticle);
const canDeletePolicy = hasPermission(deleteArticle);
const mustBeAdmin = hasRole("admin");

// ---------------------------------------------------------------------------
// 5. Evaluate policies against subjects
// ---------------------------------------------------------------------------

console.log("\\n--- Permission Checks ---");

// Alice: editor with read + write
const aliceRead = evaluate(canReadPolicy, { subject: alice });
console.log("Alice can read?", aliceRead.isOk() && aliceRead.value.kind);

const aliceWrite = evaluate(canWritePolicy, { subject: alice });
console.log("Alice can write?", aliceWrite.isOk() && aliceWrite.value.kind);

const aliceDelete = evaluate(canDeletePolicy, { subject: alice });
console.log("Alice can delete?", aliceDelete.isOk() && aliceDelete.value.kind);

// Bob: viewer with read only
console.log("\\n--- Bob (viewer) ---");
const bobRead = evaluate(canReadPolicy, { subject: bob });
console.log("Bob can read?", bobRead.isOk() && bobRead.value.kind);

const bobWrite = evaluate(canWritePolicy, { subject: bob });
console.log("Bob can write?", bobWrite.isOk() && bobWrite.value.kind);

// Charlie: admin
console.log("\\n--- Charlie (admin) ---");
const charlieAdmin = evaluate(mustBeAdmin, { subject: charlie });
console.log("Charlie is admin?", charlieAdmin.isOk() && charlieAdmin.value.kind);

const aliceAdmin = evaluate(mustBeAdmin, { subject: alice });
console.log("Alice is admin?", aliceAdmin.isOk() && aliceAdmin.value.kind);

// ---------------------------------------------------------------------------
// 6. Inspect the decision trace
// ---------------------------------------------------------------------------

console.log("\\n--- Decision Trace (Alice write) ---");
if (aliceWrite.isOk()) {
  const decision = aliceWrite.value;
  console.log("Decision:", decision.kind);
  console.log("Duration:", decision.durationMs.toFixed(3), "ms");
  console.log("Trace:", JSON.stringify(decision.trace, null, 2));
}

console.log("\\n--- Decision Trace (Bob write - denied) ---");
if (bobWrite.isOk()) {
  const decision = bobWrite.value;
  console.log("Decision:", decision.kind);
  console.log("Reason:", decision.kind === "deny" ? decision.reason : "n/a");
  console.log("Trace:", JSON.stringify(decision.trace, null, 2));
}

console.log("\\nDone! Switch to the Guard panel to see the evaluation tree.");
`;

export const guardBasicRoles: ExampleTemplate = {
  id: "guard-basic-roles",
  title: "Guard: Roles & Permissions",
  description: "createPermission, createRole, createAuthSubject, hasPermission, hasRole, evaluate",
  category: "guard",
  files: new Map([["main.ts", MAIN_TS]]),
  entryPoint: "main.ts",
  defaultPanel: "guard",
};
