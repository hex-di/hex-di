import { describe, it, expect } from "vitest";
import { evaluate } from "../../src/evaluator/evaluate.js";
import {
  hasAttribute,
  hasResourceAttribute,
} from "../../src/policy/combinators.js";
import { someMatch, eq, literal, subject as subjectRef } from "../../src/policy/matchers.js";
import { createAuthSubject } from "../../src/subject/auth-subject.js";

function makeSubject(attrs: Record<string, unknown> = {}, id = "user-1") {
  return createAuthSubject(id, [], new Set(), attrs);
}

describe("DoD 20 — array matcher integration", () => {
  it("someMatch evaluates nested MatcherExpression recursively", () => {
    // Test someMatch with a nested eq matcher over an array attribute
    const sub = makeSubject({ groups: ["admins", "editors", "viewers"] });

    const adminPolicy = hasAttribute("groups", someMatch(eq(literal("admins"))));
    const result = evaluate(adminPolicy, { subject: sub });

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("allow");

    // With a missing group value
    const otherSubject = makeSubject({ groups: ["editors", "viewers"] });
    const denyResult = evaluate(adminPolicy, { subject: otherSubject });

    expect(denyResult.isOk()).toBe(true);
    if (!denyResult.isOk()) return;
    expect(denyResult.value.kind).toBe("deny");
  });

  it("resource() references inside ObjectMatcher resolve against EvaluationContext.resource", () => {
    // Test subject() reference: hasResourceAttribute compares a resource field
    // against the subject's `id` using a subject() ref.
    // This tests that refs resolve from the correct part of EvaluationContext.
    const sub = makeSubject({}, "user-1");

    // Policy: resource.ownerId must equal subject.id
    const ownerPolicy = hasResourceAttribute("ownerId", eq(subjectRef("id")));

    // Resource owned by the same user — allow
    const ownedContext = { subject: sub, resource: { ownerId: "user-1" } };
    const allowResult = evaluate(ownerPolicy, ownedContext);

    expect(allowResult.isOk()).toBe(true);
    if (!allowResult.isOk()) return;
    expect(allowResult.value.kind).toBe("allow");

    // Resource owned by a different user — deny
    const notOwnedContext = { subject: sub, resource: { ownerId: "user-2" } };
    const denyResult = evaluate(ownerPolicy, notOwnedContext);

    expect(denyResult.isOk()).toBe(true);
    if (!denyResult.isOk()) return;
    expect(denyResult.value.kind).toBe("deny");
  });
});
