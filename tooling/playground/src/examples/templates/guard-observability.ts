/**
 * Guard: Events & Observability
 *
 * Demonstrates the automatic event flow from enforcePolicy() through
 * the event sink to the inspector — the "nervous system" pattern.
 * Events are NOT manually constructed; they flow automatically from
 * createGuardGraph({ eventSink }) enforcement calls.
 */

import type { ExampleTemplate } from "../types.js";

const MAIN_TS = `import {
  createPermission,
  createAuthSubject,
  hasPermission,
  hasRole,
  createGuardGraph,
  GuardInspector,
  createGuardLibraryInspector,
} from "@hex-di/guard";
import type {
  GuardEvent,
  GuardEventSink,
} from "@hex-di/guard";

// ---------------------------------------------------------------------------
// 1. Wire the nervous system: Inspector + EventSink + GuardGraph
// ---------------------------------------------------------------------------

console.log("=== Events & Observability (Automatic Event Flow) ===\\n");

const inspector = new GuardInspector();

// The event sink bridges enforcePolicy() to the inspector.
// Every enforce() call automatically emits events through this sink.
const collectedEvents: GuardEvent[] = [];

const eventSink: GuardEventSink = {
  emit(event: GuardEvent): void {
    collectedEvents.push(event);
    inspector.onEvent(event);
    const icon = event.kind === "guard.allow" ? "+" : event.kind === "guard.deny" ? "-" : "!";
    console.log("  [" + icon + "] " + event.kind + " | " + event.portName + " | " + event.subjectId);
  },
};

// Create the guard graph WITH the event sink — this is the critical wiring.
// All enforce() calls on this graph will automatically emit events.
const guard = createGuardGraph({ eventSink });

console.log("Wiring complete:");
console.log("  enforce() -> eventSink -> inspector.onEvent()");
console.log("  (Events flow AUTOMATICALLY — no manual construction needed)\\n");

// ---------------------------------------------------------------------------
// 2. Register policies with the inspector
// ---------------------------------------------------------------------------

inspector.registerPolicy("ArticleService.read", "hasPermission");
inspector.registerPolicy("ArticleService.write", "hasPermission");
inspector.registerPolicy("ArticleService.delete", "hasRole");
inspector.registerPolicy("UserService.manage", "hasPermission");

console.log("Inspector: 4 policies registered");

// Subscribe a live listener
const liveLog: string[] = [];
const unsubscribeLive = inspector.subscribe((event) => {
  liveLog.push(event.kind + ":" + event.subjectId);
});

// ---------------------------------------------------------------------------
// 3. Subjects and policies
// ---------------------------------------------------------------------------

const readArticle = createPermission({ resource: "article", action: "read" });
const writeArticle = createPermission({ resource: "article", action: "write" });
const manageUsers = createPermission({ resource: "user", action: "manage" });

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

// ---------------------------------------------------------------------------
// 4. Run enforce() calls — events flow AUTOMATICALLY
// ---------------------------------------------------------------------------

console.log("\\n--- Running Enforcement (events auto-emitted) ---\\n");

const enforcements = [
  { subject: alice, policy: hasPermission(readArticle), portName: "ArticleService.read" },
  { subject: alice, policy: hasPermission(writeArticle), portName: "ArticleService.write" },
  { subject: bob, policy: hasPermission(readArticle), portName: "ArticleService.read" },
  { subject: bob, policy: hasPermission(writeArticle), portName: "ArticleService.write" },
  { subject: admin, policy: hasRole("admin"), portName: "ArticleService.delete" },
  { subject: admin, policy: hasPermission(manageUsers), portName: "UserService.manage" },
];

for (const { subject, policy, portName } of enforcements) {
  guard.enforce({ policy, subject, portName, scopeId: "demo" });
}

console.log("\\n" + collectedEvents.length + " events emitted automatically");
console.log("  (Events were NOT manually constructed — they flowed from enforcePolicy()");
console.log("   through the event sink to the inspector.)");

// ---------------------------------------------------------------------------
// 5. Inspector snapshot — populated by automatic event flow
// ---------------------------------------------------------------------------

console.log("\\n--- Inspector Snapshot ---\\n");

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
// 6. Library inspector bridge — unified format
// ---------------------------------------------------------------------------

console.log("\\n--- Library Inspector Bridge ---\\n");

const libraryInspector = createGuardLibraryInspector(inspector);
console.log("Library inspector name:", libraryInspector.name);

const libSnapshot = libraryInspector.getSnapshot();
console.log("Library snapshot keys:", Object.keys(libSnapshot).join(", "));
console.log("  activePolicies:", Object.keys(libSnapshot.activePolicies).length);
console.log("  recentDecisions:", libSnapshot.recentDecisions.length);

// ---------------------------------------------------------------------------
// 7. Subscription management — subscribe, unsubscribe, verify
// ---------------------------------------------------------------------------

console.log("\\n--- Subscription Management ---\\n");
console.log("Live listener received", liveLog.length, "events");

// Subscribe second listener
const secondLog: string[] = [];
const unsubscribeSecond = inspector.subscribe((event) => {
  secondLog.push(event.kind);
});

// Fire one more enforce — both listeners should see it
guard.enforce({
  policy: hasPermission(readArticle),
  subject: alice,
  portName: "ArticleService.read",
  scopeId: "demo",
});

console.log("After extra enforce: live=" + liveLog.length + ", second=" + secondLog.length);

// Unsubscribe second listener
unsubscribeSecond();

// Fire another enforce — only live listener should see it
guard.enforce({
  policy: hasPermission(writeArticle),
  subject: admin,
  portName: "ArticleService.write",
  scopeId: "demo",
});

console.log("After unsubscribe: live=" + liveLog.length + ", second=" + secondLog.length);
console.log("  (second listener stopped receiving events)");

// Cleanup first listener
unsubscribeLive();

// ---------------------------------------------------------------------------
// 8. Inspector reset — clear all state
// ---------------------------------------------------------------------------

console.log("\\n--- Inspector Reset ---\\n");

inspector.reset();
const emptySnapshot = inspector.getSnapshot();
console.log("After reset:");
console.log("  Active policies:", Object.keys(emptySnapshot.activePolicies).length);
console.log("  Recent decisions:", emptySnapshot.recentDecisions.length);
console.log("  Permission stats:", Object.keys(emptySnapshot.permissionStats).length);

console.log("\\nDone! Switch to the Guard panel to see evaluation data.");
`;

export const guardObservability: ExampleTemplate = {
  id: "guard-observability",
  title: "Guard: Events & Observability",
  description:
    "Automatic event flow: createGuardGraph({ eventSink }), GuardInspector, library inspector bridge, subscription management",
  category: "guard",
  files: new Map([["main.ts", MAIN_TS]]),
  entryPoint: "main.ts",
  defaultPanel: "guard",
};
