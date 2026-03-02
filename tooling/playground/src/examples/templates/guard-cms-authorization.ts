/**
 * Guard: CMS Authorization (DaVinci)
 *
 * Models a real-world Content Management System authorization scheme
 * inspired by a production pharmaceutical CMS. Features 7 roles with
 * global/local/CPH scoping, compound permissions, and brand-level
 * access filtering.
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
  allOf,
  anyOf,
  withLabel,
  evaluate,
  eq,
  gte,
  inArray,
  literal,
  contains,
} from "@hex-di/guard";

// ===========================================================================
// CMS Permission Model
//
// A pharmaceutical content management system with 7 roles spanning
// three scopes: global, local (country-specific), and CPH (central
// product hub). Compound permissions derive from role membership.
// ===========================================================================

console.log("=== CMS Authorization System ===\\n");

// ---------------------------------------------------------------------------
// 1. Permission tokens — resource:action pairs
// ---------------------------------------------------------------------------

const brand = createPermissionGroup("brand", ["read", "write", "delete", "sync"]);
const content = createPermissionGroup("content", ["read", "write", "approve", "publish"]);
const user = createPermissionGroup("user", ["read", "manage"]);
const run = createPermissionGroup("run", ["read", "readAll"]);
const memory = createPermissionGroup("memory", ["read", "write", "delete", "toggle"]);

console.log("Permission groups: brand, content, user, run, memory");

// ---------------------------------------------------------------------------
// 2. Role hierarchy — 7 roles across 3 scopes
// ---------------------------------------------------------------------------

// Scope 1: Global (all brands, all countries)
const globalWriter = createRole({
  name: "global_content_writer",
  permissions: [brand.read, content.read, content.write, run.read, memory.read],
});

const globalManager = createRole({
  name: "global_content_manager",
  permissions: [brand.read, brand.write, content.read, content.write,
                content.approve, user.read, user.manage, run.read,
                memory.read, memory.write, memory.delete, memory.toggle],
  inherits: [globalWriter],
});

// Scope 2: Local (specific brands, specific countries)
const localWriter = createRole({
  name: "local_content_writer",
  permissions: [brand.read, content.read, content.write, run.read, memory.read],
});

const localManager = createRole({
  name: "local_content_manager",
  permissions: [brand.read, brand.write, content.read, content.write,
                content.approve, user.read, user.manage, run.read,
                memory.read, memory.write, memory.delete, memory.toggle],
  inherits: [localWriter],
});

// Scope 3: CPH (central product hub — specific product lines)
const cphWriter = createRole({
  name: "cph_content_writer",
  permissions: [brand.read, content.read, content.write, run.read, memory.read],
});

const cphManager = createRole({
  name: "cph_content_manager",
  permissions: [brand.read, brand.write, content.read, content.write,
                content.approve, user.read, user.manage, run.read,
                memory.read, memory.write, memory.delete, memory.toggle],
  inherits: [cphWriter],
});

// Admin: unrestricted access
const adminRole = createRole({
  name: "admin",
  permissions: [brand.read, brand.write, brand.delete, brand.sync,
                content.read, content.write, content.approve, content.publish,
                user.read, user.manage, run.read, run.readAll,
                memory.read, memory.write, memory.delete, memory.toggle],
});

console.log("Roles: admin, global_content_manager, global_content_writer,");
console.log("       local_content_manager, local_content_writer,");
console.log("       cph_content_manager, cph_content_writer");

// ---------------------------------------------------------------------------
// 3. Subjects — users with roles and brand scoping
// ---------------------------------------------------------------------------

const adminUser = createAuthSubject(
  "admin-user",
  ["admin"],
  new Set([
    "brand:read", "brand:write", "brand:delete", "brand:sync",
    "content:read", "content:write", "content:approve", "content:publish",
    "user:read", "user:manage", "run:read", "run:readAll",
    "memory:read", "memory:write", "memory:delete", "memory:toggle",
  ]),
  { scope: "global", allowedBrandIds: null }, // null = unrestricted
);

const globalMgr = createAuthSubject(
  "global-manager",
  ["global_content_manager"],
  new Set([
    "brand:read", "brand:write",
    "content:read", "content:write", "content:approve",
    "user:read", "user:manage", "run:read",
    "memory:read", "memory:write", "memory:delete", "memory:toggle",
  ]),
  { scope: "global", allowedBrandIds: null },
);

const localMgr = createAuthSubject(
  "local-manager",
  ["local_content_manager"],
  new Set([
    "brand:read", "brand:write",
    "content:read", "content:write", "content:approve",
    "user:read", "user:manage", "run:read",
    "memory:read", "memory:write", "memory:delete", "memory:toggle",
  ]),
  { scope: "local", allowedBrandIds: ["brand-123", "brand-456"] },
);

const localWriter2 = createAuthSubject(
  "local-writer",
  ["local_content_writer"],
  new Set(["brand:read", "content:read", "content:write", "run:read", "memory:read"]),
  { scope: "local", allowedBrandIds: ["brand-123"] },
);

console.log("\\nSubjects: admin-user, global-manager, local-manager, local-writer");

// ---------------------------------------------------------------------------
// 4. Compound Permission Policies
//
// These mirror the derived permissions from the real CMS:
//   canManageUsers    = admin OR any manager
//   canManageBrands   = admin OR any manager
//   canDeleteBrand    = admin only
//   canSyncPromoMats  = admin only
//   canManageMemory   = any manager
//   canViewAllRuns    = admin only
//   canApproveContent = any manager
//   canAddBrand       = admin only
// ---------------------------------------------------------------------------

console.log("\\n--- Compound Permission Policies ---\\n");

const canManageUsers = withLabel("Can Manage Users", anyOf(
  hasRole("admin"),
  hasRole("global_content_manager"),
  hasRole("local_content_manager"),
  hasRole("cph_content_manager"),
));

const canDeleteBrand = withLabel("Can Delete Brand", hasRole("admin"));

const canSyncPromoMats = withLabel("Can Sync PromoMats", hasRole("admin"));

const canManageMemory = withLabel("Can Manage Memory Items", anyOf(
  hasRole("admin"),
  hasRole("global_content_manager"),
  hasRole("local_content_manager"),
  hasRole("cph_content_manager"),
));

const canViewAllRuns = withLabel("Can View All Runs", hasRole("admin"));

const canApproveContent = withLabel("Can Approve Content", allOf(
  hasPermission(content.approve),
  anyOf(
    hasRole("admin"),
    hasRole("global_content_manager"),
    hasRole("local_content_manager"),
    hasRole("cph_content_manager"),
  ),
));

// ---------------------------------------------------------------------------
// 5. Evaluate all subjects against all policies
// ---------------------------------------------------------------------------

const policies = [
  { name: "canManageUsers", policy: canManageUsers },
  { name: "canDeleteBrand", policy: canDeleteBrand },
  { name: "canSyncPromoMats", policy: canSyncPromoMats },
  { name: "canManageMemory", policy: canManageMemory },
  { name: "canViewAllRuns", policy: canViewAllRuns },
  { name: "canApproveContent", policy: canApproveContent },
];

const subjects = [
  { name: "admin-user", subject: adminUser },
  { name: "global-mgr", subject: globalMgr },
  { name: "local-mgr", subject: localMgr },
  { name: "local-writer", subject: localWriter2 },
];

// Print permission matrix
console.log("Permission Matrix:");
console.log("".padEnd(18) + policies.map(p => p.name.padEnd(18)).join(""));
console.log("-".repeat(18 + policies.length * 18));

for (const s of subjects) {
  let row = s.name.padEnd(18);
  for (const p of policies) {
    const result = evaluate(p.policy, { subject: s.subject });
    const decision = result.isOk() ? result.value.kind : "error";
    row += (decision === "allow" ? "ALLOW" : "DENY").padEnd(18);
  }
  console.log(row);
}

// ---------------------------------------------------------------------------
// 6. Brand-scoped access: check if user can access a specific brand
// ---------------------------------------------------------------------------

console.log("\\n--- Brand Scoping ---");

const canAccessBrand = withLabel("Brand Access", anyOf(
  withLabel("Admin: All Brands", hasRole("admin")),
  withLabel("Global: All Brands", hasAttribute("scope", eq(literal("global")))),
  withLabel("Scoped: Allowed Brand", hasAttribute("allowedBrandIds", contains("brand-123"))),
));

for (const s of subjects) {
  const result = evaluate(canAccessBrand, { subject: s.subject });
  const decision = result.isOk() ? result.value.kind : "error";
  const brandIds = s.subject.attributes.allowedBrandIds;
  const scope = s.subject.attributes.scope;
  console.log(
    s.name.padEnd(18),
    "brand-123:",
    decision.padEnd(8),
    "(scope:", scope + ",",
    "brands:", brandIds === null ? "ALL" : JSON.stringify(brandIds) + ")",
  );
}

console.log("\\nDone! Check the Guard panel to see all evaluation trees.");
`;

export const guardCmsAuthorization: ExampleTemplate = {
  id: "guard-cms-authorization",
  title: "Guard: CMS Authorization (DaVinci)",
  description:
    "Real-world CMS with 7 roles, compound permissions, brand scoping — inspired by production pharma CMS",
  category: "guard",
  files: new Map([["main.ts", MAIN_TS]]),
  entryPoint: "main.ts",
  defaultPanel: "guard",
};
