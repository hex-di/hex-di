/**
 * Guard: Relationship-Based Access (ReBAC)
 *
 * Demonstrates hasRelationship policy with a custom RelationshipResolver
 * for graph-based authorization, combined with RBAC policies.
 */

import type { ExampleTemplate } from "../types.js";

const MAIN_TS = `import {
  createPermission,
  createAuthSubject,
  hasRelationship,
  hasRole,
  allOf,
  anyOf,
  withLabel,
  evaluate,
} from "@hex-di/guard";
import type { RelationshipResolver } from "@hex-di/guard";

// ---------------------------------------------------------------------------
// 1. In-memory relationship graph
// ---------------------------------------------------------------------------

console.log("=== Relationship-Based Access Control (ReBAC) ===\\n");

class InMemoryRelationshipResolver implements RelationshipResolver {
  private readonly relations = new Set<string>();

  addRelation(subjectId: string, relation: string, resourceId: string): void {
    this.relations.add(subjectId + ":" + relation + ":" + resourceId);
  }

  check(subjectId: string, relation: string, resourceId: string): boolean {
    return this.relations.has(subjectId + ":" + relation + ":" + resourceId);
  }

  async checkAsync(subjectId: string, relation: string, resourceId: string): Promise<boolean> {
    return this.check(subjectId, relation, resourceId);
  }
}

const resolver = new InMemoryRelationshipResolver();

// Populate relationships
resolver.addRelation("alice", "owner", "doc-1");
resolver.addRelation("alice", "owner", "doc-2");
resolver.addRelation("bob", "viewer", "doc-1");
resolver.addRelation("carol", "viewer", "doc-3");

console.log("Relationship graph:");
console.log("  alice  -> owner  -> doc-1, doc-2");
console.log("  bob    -> viewer -> doc-1");
console.log("  carol  -> viewer -> doc-3");

// ---------------------------------------------------------------------------
// 2. Subjects
// ---------------------------------------------------------------------------

const readDoc = createPermission({ resource: "doc", action: "read" });
const writeDoc = createPermission({ resource: "doc", action: "write" });

const alice = createAuthSubject(
  "alice",
  ["admin"],
  new Set(["doc:read", "doc:write"]),
  { department: "engineering" },
);

const bob = createAuthSubject(
  "bob",
  ["editor"],
  new Set(["doc:read", "doc:write"]),
  { department: "content" },
);

const carol = createAuthSubject(
  "carol",
  ["viewer"],
  new Set(["doc:read"]),
  { department: "marketing" },
);

console.log("\\nSubjects: Alice (admin), Bob (editor), Carol (viewer)");

// ---------------------------------------------------------------------------
// 3. Direct ownership check
// ---------------------------------------------------------------------------

console.log("\\n--- Ownership Check ---");

const ownerPolicy = hasRelationship("owner");

const aliceOwnsDoc1 = evaluate(ownerPolicy, {
  subject: alice,
  resource: { id: "doc-1" },
  relationshipResolver: resolver,
});
console.log("Alice owns doc-1?", aliceOwnsDoc1.isOk() && aliceOwnsDoc1.value.kind);

const bobOwnsDoc1 = evaluate(ownerPolicy, {
  subject: bob,
  resource: { id: "doc-1" },
  relationshipResolver: resolver,
});
console.log("Bob owns doc-1?", bobOwnsDoc1.isOk() && bobOwnsDoc1.value.kind);

// ---------------------------------------------------------------------------
// 4. Viewer relationship check
// ---------------------------------------------------------------------------

console.log("\\n--- Viewer Relationship ---");

const viewerPolicy = hasRelationship("viewer");

const bobViewsDoc1 = evaluate(viewerPolicy, {
  subject: bob,
  resource: { id: "doc-1" },
  relationshipResolver: resolver,
});
console.log("Bob can view doc-1?", bobViewsDoc1.isOk() && bobViewsDoc1.value.kind);

const carolViewsDoc3 = evaluate(viewerPolicy, {
  subject: carol,
  resource: { id: "doc-3" },
  relationshipResolver: resolver,
});
console.log("Carol can view doc-3?", carolViewsDoc3.isOk() && carolViewsDoc3.value.kind);

const carolViewsDoc1 = evaluate(viewerPolicy, {
  subject: carol,
  resource: { id: "doc-1" },
  relationshipResolver: resolver,
});
console.log("Carol can view doc-1?", carolViewsDoc1.isOk() && carolViewsDoc1.value.kind);

// ---------------------------------------------------------------------------
// 5. Combined RBAC + ReBAC — must be editor AND owner
// ---------------------------------------------------------------------------

console.log("\\n--- Combined RBAC + ReBAC ---");

const editorOwnerPolicy = withLabel(
  "Editor & Owner",
  allOf(hasRole("editor"), hasRelationship("owner")),
);

const aliceEditorOwner = evaluate(editorOwnerPolicy, {
  subject: alice,
  resource: { id: "doc-1" },
  relationshipResolver: resolver,
});
console.log("Alice (admin, owner) as editor+owner?",
  aliceEditorOwner.isOk() && aliceEditorOwner.value.kind,
  aliceEditorOwner.isOk() && aliceEditorOwner.value.kind === "deny"
    ? "- " + aliceEditorOwner.value.reason : "");

const bobEditorOwner = evaluate(editorOwnerPolicy, {
  subject: bob,
  resource: { id: "doc-1" },
  relationshipResolver: resolver,
});
console.log("Bob (editor, viewer) as editor+owner?",
  bobEditorOwner.isOk() && bobEditorOwner.value.kind,
  bobEditorOwner.isOk() && bobEditorOwner.value.kind === "deny"
    ? "- " + bobEditorOwner.value.reason : "");

// Flexible: editor OR owner
const flexiblePolicy = withLabel(
  "Editor OR Owner",
  anyOf(hasRole("editor"), hasRelationship("owner")),
);

const aliceFlexible = evaluate(flexiblePolicy, {
  subject: alice,
  resource: { id: "doc-1" },
  relationshipResolver: resolver,
});
console.log("\\nAlice (admin, owner) as editor|owner?",
  aliceFlexible.isOk() && aliceFlexible.value.kind);

const bobFlexible = evaluate(flexiblePolicy, {
  subject: bob,
  resource: { id: "doc-1" },
  relationshipResolver: resolver,
});
console.log("Bob (editor, viewer) as editor|owner?",
  bobFlexible.isOk() && bobFlexible.value.kind);

// ---------------------------------------------------------------------------
// 6. Error: missing resolver
// ---------------------------------------------------------------------------

console.log("\\n--- Error: Missing Resolver ---");

const noResolverResult = evaluate(ownerPolicy, {
  subject: alice,
  resource: { id: "doc-1" },
  // No relationshipResolver provided!
});
if (noResolverResult.isOk()) {
  const d = noResolverResult.value;
  console.log("Decision:", d.kind);
  console.log("Reason:", d.kind === "deny" ? d.reason : "n/a");
}

// ---------------------------------------------------------------------------
// 7. Error: missing resource.id
// ---------------------------------------------------------------------------

console.log("\\n--- Error: Missing Resource ID ---");

const noResourceResult = evaluate(ownerPolicy, {
  subject: alice,
  // No resource at all!
  relationshipResolver: resolver,
});
if (noResourceResult.isOk()) {
  const d = noResourceResult.value;
  console.log("Decision:", d.kind);
  console.log("Reason:", d.kind === "deny" ? d.reason : "n/a");
}

console.log("\\nDone! Switch to the Guard panel to see evaluation traces.");
`;

export const guardRebacRelationships: ExampleTemplate = {
  id: "guard-rebac-relationships",
  title: "Guard: Relationship-Based Access (ReBAC)",
  description:
    "hasRelationship, RelationshipResolver, graph-based authorization combined with RBAC",
  category: "guard",
  files: new Map([["main.ts", MAIN_TS]]),
  entryPoint: "main.ts",
  defaultPanel: "guard",
};
