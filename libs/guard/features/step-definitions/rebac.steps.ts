import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { evaluate, hasRelationship } from "@hex-di/guard";
import type { RelationshipResolver } from "@hex-di/guard";
import type { GuardCucumberWorld } from "./world.js";

// ---------------------------------------------------------------------------
// ReBAC world extension
// ---------------------------------------------------------------------------

type RebacWorld = GuardCucumberWorld;

// ---------------------------------------------------------------------------
// Relationship setup steps
// ---------------------------------------------------------------------------

Given(
  "a relationship {string} exists between {string} and resource {string}",
  function (this: RebacWorld, relation: string, subjectId: string, resourceId: string) {
    const key = `${subjectId}:${relation}:${resourceId}`;
    if (!this.relationships.has(key)) {
      this.relationships.set(key, new Set([resourceId]));
    }
  },
);

// ---------------------------------------------------------------------------
// ReBAC evaluation steps
// ---------------------------------------------------------------------------

When(
  "they check relationship {string} to resource {string}",
  function (this: RebacWorld, relation: string, resourceId: string) {
    if (!this.currentSubject) throw new Error("No subject set");

    // Build an in-memory resolver from the scenario's registered relationships
    const relationships = this.relationships;

    const syncResolver: RelationshipResolver = {
      check(sid: string, rel: string, resId: string): boolean {
        const key = `${sid}:${rel}:${resId}`;
        return relationships.has(key);
      },
      async checkAsync(sid: string, rel: string, resId: string): Promise<boolean> {
        const key = `${sid}:${rel}:${resId}`;
        return relationships.has(key);
      },
    };

    const policy = hasRelationship(relation);
    const result = evaluate(policy, {
      subject: this.currentSubject,
      resource: { id: resourceId },
      relationshipResolver: syncResolver,
    });

    if (result.isErr()) throw result.error;
    this.lastResult = {
      allowed: result.value.kind === "allow",
      denied: result.value.kind === "deny",
      error: null,
    };
  },
);

// ---------------------------------------------------------------------------
// ReBAC assertion steps
// ---------------------------------------------------------------------------

Then("relationship access should be granted", function (this: RebacWorld) {
  assert.strictEqual(
    this.lastResult.allowed,
    true,
    "Expected relationship access to be granted but it was denied",
  );
});

Then("relationship access should be denied", function (this: RebacWorld) {
  assert.strictEqual(
    this.lastResult.denied,
    true,
    "Expected relationship access to be denied but it was granted",
  );
});
