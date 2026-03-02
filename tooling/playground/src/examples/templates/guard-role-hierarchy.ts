/**
 * Guard: Role Hierarchy
 *
 * Demonstrates createRole with inheritance, permission flattening,
 * Separation of Duties (SoD) constraints, and circular inheritance
 * detection.
 */

import type { ExampleTemplate } from "../types.js";

const MAIN_TS = `import {
  createPermission,
  createRole,
  createAuthSubject,
  flattenPermissions,
  hasPermission,
  hasRole,
  allOf,
  anyOf,
  withLabel,
  evaluate,
  createMutuallyExclusiveRoles,
  validateSoDConstraints,
} from "@hex-di/guard";

// ---------------------------------------------------------------------------
// 1. Permission tokens for a document management system
// ---------------------------------------------------------------------------

const docRead     = createPermission({ resource: "document", action: "read" });
const docWrite    = createPermission({ resource: "document", action: "write" });
const docDelete   = createPermission({ resource: "document", action: "delete" });
const docApprove  = createPermission({ resource: "document", action: "approve" });
const docPublish  = createPermission({ resource: "document", action: "publish" });
const userManage  = createPermission({ resource: "user", action: "manage" });
const systemAdmin = createPermission({ resource: "system", action: "admin" });

console.log("=== Role Hierarchy ===");

// ---------------------------------------------------------------------------
// 2. Role hierarchy with inheritance
// ---------------------------------------------------------------------------

// Base role: viewer (read-only)
const viewer = createRole({
  name: "viewer",
  permissions: [docRead],
});
console.log("viewer:", viewer.name, "— direct:", viewer.permissions.length, "perm(s)");

// Writer inherits from viewer, adds write
const writer = createRole({
  name: "writer",
  permissions: [docWrite],
  inherits: [viewer],
});
console.log("writer:", writer.name, "— inherits: viewer, adds write");

// Reviewer inherits from viewer, adds approve
const reviewer = createRole({
  name: "reviewer",
  permissions: [docApprove],
  inherits: [viewer],
});
console.log("reviewer:", reviewer.name, "— inherits: viewer, adds approve");

// Editor inherits from both writer and reviewer, adds publish
const editor = createRole({
  name: "editor",
  permissions: [docPublish],
  inherits: [writer, reviewer],
});
console.log("editor:", editor.name, "— inherits: writer + reviewer, adds publish");

// Admin inherits from editor, adds delete + user management + system admin
const admin = createRole({
  name: "admin",
  permissions: [docDelete, userManage, systemAdmin],
  inherits: [editor],
});
console.log("admin:", admin.name, "— inherits: editor, adds delete + manage + admin");

// ---------------------------------------------------------------------------
// 3. Permission flattening — collect all inherited permissions
// ---------------------------------------------------------------------------

console.log("\\n=== Permission Flattening ===");

const viewerPerms = flattenPermissions(viewer);
if (viewerPerms.isOk()) {
  console.log("viewer total:", viewerPerms.value.length, "permission(s)");
  console.log("  ", viewerPerms.value.map(p => p.resource + ":" + p.action).join(", "));
}

const editorPerms = flattenPermissions(editor);
if (editorPerms.isOk()) {
  console.log("editor total:", editorPerms.value.length, "permission(s)");
  console.log("  ", editorPerms.value.map(p => p.resource + ":" + p.action).join(", "));
}

const adminPerms = flattenPermissions(admin);
if (adminPerms.isOk()) {
  console.log("admin total:", adminPerms.value.length, "permission(s)");
  console.log("  ", adminPerms.value.map(p => p.resource + ":" + p.action).join(", "));
}

// ---------------------------------------------------------------------------
// 4. Build subjects from roles
// ---------------------------------------------------------------------------

console.log("\\n=== Subject Evaluation ===");

function buildPermissionSet(perms: readonly { resource: string; action: string }[]): Set<string> {
  return new Set(perms.map(p => p.resource + ":" + p.action));
}

const editorSubject = createAuthSubject(
  "alice-editor",
  ["editor", "writer", "reviewer", "viewer"],
  editorPerms.isOk() ? buildPermissionSet(editorPerms.value) : new Set(),
);

const adminSubject = createAuthSubject(
  "charlie-admin",
  ["admin", "editor", "writer", "reviewer", "viewer"],
  adminPerms.isOk() ? buildPermissionSet(adminPerms.value) : new Set(),
);

const viewerSubject = createAuthSubject(
  "bob-viewer",
  ["viewer"],
  viewerPerms.isOk() ? buildPermissionSet(viewerPerms.value) : new Set(),
);

// Publish requires editor or admin
const publishPolicy = withLabel("Publish Access", anyOf(
  hasRole("editor"),
  hasRole("admin"),
));

const alicePublish = evaluate(publishPolicy, { subject: editorSubject });
console.log("Alice (editor) can publish:", alicePublish.isOk() && alicePublish.value.kind);

const bobPublish = evaluate(publishPolicy, { subject: viewerSubject });
console.log("Bob (viewer) can publish:", bobPublish.isOk() && bobPublish.value.kind);

// System administration requires admin role AND system:admin permission
const sysAdminPolicy = withLabel("System Admin", allOf(
  hasRole("admin"),
  hasPermission(systemAdmin),
));

const charlieAdmin = evaluate(sysAdminPolicy, { subject: adminSubject });
console.log("Charlie (admin) sys admin:", charlieAdmin.isOk() && charlieAdmin.value.kind);

const aliceAdmin = evaluate(sysAdminPolicy, { subject: editorSubject });
console.log("Alice (editor) sys admin:", aliceAdmin.isOk() && aliceAdmin.value.kind);

// ---------------------------------------------------------------------------
// 5. Separation of Duties (SoD) constraints
// ---------------------------------------------------------------------------

console.log("\\n=== Separation of Duties ===");

// Four-eyes principle: approver and requester must be different people
const fourEyes = createMutuallyExclusiveRoles(
  ["requester", "approver"],
  "Four-eyes principle: same person cannot request and approve",
);

// Audit independence: auditors cannot also be operators
const auditIndependence = createMutuallyExclusiveRoles(
  ["auditor", "operator"],
  "Auditors must be independent from operations",
);

const constraints = [fourEyes, auditIndependence];

// Check a user who is both requester and approver (violation!)
const conflictingRoles = ["requester", "approver", "viewer"];
const conflicts = validateSoDConstraints(conflictingRoles, constraints);

console.log("User with roles:", conflictingRoles.join(", "));
console.log("SoD conflicts:", conflicts.length);
for (const c of conflicts) {
  console.log("  VIOLATION:", c.constraint.reason);
  console.log("  Conflicting:", c.conflictingRoles.join(", "));
}

// Check a compliant user
const compliantRoles = ["requester", "viewer"];
const noConflicts = validateSoDConstraints(compliantRoles, constraints);
console.log("\\nUser with roles:", compliantRoles.join(", "));
console.log("SoD conflicts:", noConflicts.length, "(compliant)");

console.log("\\nDone! Check the Guard panel Roles view to see the hierarchy.");
`;

export const guardRoleHierarchy: ExampleTemplate = {
  id: "guard-role-hierarchy",
  title: "Guard: Role Hierarchy",
  description:
    "createRole with inheritance, flattenPermissions, SoD constraints, circular detection",
  category: "guard",
  files: new Map([["main.ts", MAIN_TS]]),
  entryPoint: "main.ts",
  defaultPanel: "guard",
};
