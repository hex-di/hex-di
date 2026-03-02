/**
 * Guard: Full-Stack Authorization
 *
 * Demonstrates the complete guard nervous system — from policy enforcement
 * through automatic event emission to inspector snapshots, health checks,
 * and completeness monitoring. This is the "OBD-II diagnostic port" pattern:
 * the guard subsystem reports its own state without external instrumentation.
 */

import type { ExampleTemplate } from "../types.js";

const MAIN_TS = `import {
  createPermission,
  createAuthSubject,
  hasPermission,
  hasRole,
  allOf,
  withLabel,
  createGuardGraph,
  createNoopAuditTrailAdapter,
  createGuardHealthCheck,
  createCompletenessMonitor,
  GuardInspector,
  createGuardLibraryInspector,
} from "@hex-di/guard";
import type {
  GuardEvent,
  GuardEventSink,
} from "@hex-di/guard";

console.log("=== Guard: Full-Stack Authorization ===");
console.log("The guard subsystem reports its own state — no external instrumentation needed.\\n");

// ---------------------------------------------------------------------------
// 1. Build infrastructure — the nervous system wiring
// ---------------------------------------------------------------------------

console.log("--- 1. Infrastructure Wiring ---\\n");

const inspector = new GuardInspector();
const auditTrail = createNoopAuditTrailAdapter();
const completeness = createCompletenessMonitor();

// Event sink bridges enforce() -> inspector, automatically
const eventSink: GuardEventSink = {
  emit(event: GuardEvent): void {
    inspector.onEvent(event);
    completeness.recordAuditEntry(event.portName);
  },
};

const guard = createGuardGraph({ eventSink });
const healthCheck = createGuardHealthCheck(auditTrail);

console.log("Components wired:");
console.log("  GuardInspector .............. runtime state aggregator");
console.log("  GuardEventSink .............. enforce() -> inspector bridge");
console.log("  createGuardGraph({ eventSink }) automatic event emission");
console.log("  createGuardHealthCheck ....... audit trail reachability probe");
console.log("  createCompletenessMonitor .... resolution vs audit parity");

// ---------------------------------------------------------------------------
// 2. Policy map — 4 port policies using mixed combinators
// ---------------------------------------------------------------------------

console.log("\\n--- 2. Policy Map ---\\n");

const readArticle = createPermission({ resource: "article", action: "read" });
const writeArticle = createPermission({ resource: "article", action: "write" });
const deleteArticle = createPermission({ resource: "article", action: "delete" });
const manageUsers = createPermission({ resource: "user", action: "manage" });

const policies = {
  "ArticleService.read": withLabel("Article Read Access", hasPermission(readArticle)),
  "ArticleService.write": withLabel("Article Write Access", hasPermission(writeArticle)),
  "ArticleService.delete": withLabel(
    "Article Delete (Admin Only)",
    allOf(hasRole("admin"), hasPermission(deleteArticle)),
  ),
  "UserService.manage": withLabel("User Management", hasPermission(manageUsers)),
};

// Register each policy with the inspector
for (const [portName, policy] of Object.entries(policies)) {
  inspector.registerPolicy(portName, policy.policy.kind);
  console.log("  " + portName + " -> " + policy.label);
}

// ---------------------------------------------------------------------------
// 3. Subjects — 3 users with varying roles/permissions
// ---------------------------------------------------------------------------

console.log("\\n--- 3. Subjects ---\\n");

const alice = createAuthSubject(
  "alice",
  ["editor"],
  new Set(["article:read", "article:write"]),
  { department: "content" },
);

const bob = createAuthSubject(
  "bob",
  ["viewer"],
  new Set(["article:read"]),
  { department: "marketing" },
);

const admin = createAuthSubject(
  "admin",
  ["admin"],
  new Set(["article:read", "article:write", "article:delete", "user:manage"]),
  { department: "engineering" },
);

console.log("  alice  -> editor  [article:read, article:write]");
console.log("  bob    -> viewer  [article:read]");
console.log("  admin  -> admin   [article:read, article:write, article:delete, user:manage]");

// ---------------------------------------------------------------------------
// 4. Enforcement simulation — events emitted AUTOMATICALLY
// ---------------------------------------------------------------------------

console.log("\\n--- 4. Enforcement Simulation ---\\n");

interface EnforceSpec {
  readonly subject: typeof alice;
  readonly portName: keyof typeof policies;
  readonly label: string;
}

const enforcements: readonly EnforceSpec[] = [
  { subject: alice, portName: "ArticleService.read", label: "alice reads article" },
  { subject: alice, portName: "ArticleService.write", label: "alice writes article" },
  { subject: alice, portName: "ArticleService.delete", label: "alice deletes article" },
  { subject: bob, portName: "ArticleService.read", label: "bob reads article" },
  { subject: bob, portName: "ArticleService.write", label: "bob writes article" },
  { subject: admin, portName: "ArticleService.read", label: "admin reads article" },
  { subject: admin, portName: "ArticleService.write", label: "admin writes article" },
  { subject: admin, portName: "ArticleService.delete", label: "admin deletes article" },
  { subject: admin, portName: "UserService.manage", label: "admin manages users" },
  { subject: bob, portName: "UserService.manage", label: "bob manages users" },
];

for (const { subject, portName, label } of enforcements) {
  completeness.recordResolution(portName);
  const result = guard.enforce({
    policy: policies[portName],
    subject,
    portName,
    scopeId: "demo-scope",
    auditTrail,
  });
  const icon = result.isOk() ? "ALLOW" : "DENY ";
  console.log("  [" + icon + "] " + label);
}

console.log("\\n  10 enforce() calls completed — events flowed automatically");

// ---------------------------------------------------------------------------
// 5. Inspector snapshot — the nervous system, populated
// ---------------------------------------------------------------------------

console.log("\\n--- 5. Inspector Snapshot (Auto-Populated) ---\\n");

const snapshot = inspector.getSnapshot();

console.log("Active policies:");
for (const [port, kind] of Object.entries(snapshot.activePolicies)) {
  console.log("  " + port + " -> " + kind);
}

console.log("\\nRecent decisions:");
console.log("  " + "Port".padEnd(26) + "Subject".padEnd(12) + "Decision");
console.log("  " + "-".repeat(50));
for (const d of snapshot.recentDecisions) {
  console.log("  " + d.portName.padEnd(26) + d.subjectId.padEnd(12) + d.decision);
}

console.log("\\nPermission stats:");
console.log("  " + "Port".padEnd(26) + "Allow".padEnd(8) + "Deny");
console.log("  " + "-".repeat(42));
for (const [port, stats] of Object.entries(snapshot.permissionStats)) {
  console.log("  " + port.padEnd(26) + String(stats.allow).padEnd(8) + stats.deny);
}

// ---------------------------------------------------------------------------
// 6. Health check — audit trail reachability
// ---------------------------------------------------------------------------

console.log("\\n--- 6. Health Check ---\\n");

const health = healthCheck();
console.log("  healthy:             " + health.healthy);
console.log("  auditTrailReachable: " + health.auditTrailReachable);
console.log("  latencyMs:           " + health.latencyMs.toFixed(3));
console.log("  errors:              " + (health.errors.length === 0 ? "none" : health.errors.join(", ")));

// ---------------------------------------------------------------------------
// 7. Completeness monitor — resolution vs audit parity
// ---------------------------------------------------------------------------

console.log("\\n--- 7. Completeness Monitor ---\\n");

console.log("  " + "Port".padEnd(26) + "Resolutions".padEnd(14) + "Audits".padEnd(10) + "Discrepancy");
console.log("  " + "-".repeat(62));
for (const portName of completeness.portNames) {
  const c = completeness.queryCompleteness(portName);
  console.log(
    "  " +
    portName.padEnd(26) +
    String(c.resolutions).padEnd(14) +
    String(c.auditEntries).padEnd(10) +
    c.discrepancy,
  );
}

// ---------------------------------------------------------------------------
// 8. Library inspector bridge — unified DevTools format
// ---------------------------------------------------------------------------

console.log("\\n--- 8. Library Inspector Bridge ---\\n");

const libraryInspector = createGuardLibraryInspector(inspector);
console.log("  name: " + libraryInspector.name);

const libSnapshot = libraryInspector.getSnapshot();
console.log("  snapshot keys: " + Object.keys(libSnapshot).join(", "));
console.log("  activePolicies: " + Object.keys(libSnapshot.activePolicies).length + " registered");
console.log("  recentDecisions: " + libSnapshot.recentDecisions.length + " recorded");
console.log("  permissionStats: " + Object.keys(libSnapshot.permissionStats).length + " tracked");

// Subscribe to unified events
const libEvents: string[] = [];
const unsubLib = libraryInspector.subscribe((event) => {
  libEvents.push(event.type);
});

// One more enforce to verify subscription works
guard.enforce({
  policy: policies["ArticleService.read"],
  subject: alice,
  portName: "ArticleService.read",
  scopeId: "demo-scope",
  auditTrail,
});

console.log("  subscription test: " + libEvents.length + " event(s) received via library inspector");
unsubLib();

console.log("\\n=== Full-Stack Authorization Demo Complete ===");
console.log("The guard reported its own state through the nervous system:");
console.log("  enforce() -> eventSink -> inspector -> snapshot");
console.log("  No manual event construction. No external instrumentation.");
`;

export const guardFullStack: ExampleTemplate = {
  id: "guard-full-stack",
  title: "Guard: Full-Stack Authorization",
  description:
    "createGuardGraph, enforcePolicy event emission, GuardInspector, health check, completeness monitor",
  category: "guard",
  files: new Map([["main.ts", MAIN_TS]]),
  entryPoint: "main.ts",
  defaultPanel: "guard",
};
