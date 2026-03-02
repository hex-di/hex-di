/**
 * Guard: Async Evaluation
 *
 * Demonstrates evaluateAsync with a custom AttributeResolver for dynamic
 * attribute resolution, including timeout and error handling.
 */

import type { ExampleTemplate } from "../types.js";

const MAIN_TS = `import {
  createAuthSubject,
  hasAttribute,
  allOf,
  withLabel,
  evaluateAsync,
  eq,
  gte,
  literal,
} from "@hex-di/guard";
import type { AttributeResolver } from "@hex-di/guard";

// ---------------------------------------------------------------------------
// 1. Mock AttributeResolver — in-memory user directory with simulated delay
// ---------------------------------------------------------------------------

const userDirectory: Record<string, Record<string, unknown>> = {
  alice: { department: "engineering", clearanceLevel: 4, trainingComplete: true },
  bob:   { department: "marketing",   clearanceLevel: 2, trainingComplete: false },
};

function createResolver(delayMs = 10): AttributeResolver {
  return {
    async resolve(subjectId: string, attribute: string): Promise<unknown> {
      // Simulate async lookup (e.g., database, LDAP, external API)
      await new Promise((r) => setTimeout(r, delayMs));
      const user = userDirectory[subjectId];
      if (!user) throw new Error("User not found: " + subjectId);
      return user[attribute];
    },
  };
}

console.log("=== Async Evaluation ===\\n");
console.log("User directory:");
console.log("  alice: engineering, clearance 4, training complete");
console.log("  bob:   marketing,   clearance 2, training incomplete");

// ---------------------------------------------------------------------------
// 2. Subjects with minimal static attributes (resolved dynamically)
// ---------------------------------------------------------------------------

const alice = createAuthSubject(
  "alice",
  ["engineer"],
  new Set(["doc:read", "doc:write"]),
);

const bob = createAuthSubject(
  "bob",
  ["marketer"],
  new Set(["doc:read"]),
);

console.log("\\nSubjects created with NO department/clearance attributes");
console.log("  (these will be resolved dynamically by the AttributeResolver)");

// ---------------------------------------------------------------------------
// 3. Attribute-based policies
// ---------------------------------------------------------------------------

const engineeringPolicy = withLabel(
  "Engineering Access",
  allOf(
    hasAttribute("department", eq(literal("engineering"))),
    hasAttribute("clearanceLevel", gte(3)),
  ),
);

console.log("\\nPolicy: must be in engineering AND have clearance >= 3");

// ---------------------------------------------------------------------------
// 4. Successful async evaluation — resolver fills in attributes
// ---------------------------------------------------------------------------

console.log("\\n--- Successful Async Evaluation ---");

const resolver = createResolver(10);

const aliceResult = await evaluateAsync(engineeringPolicy, { subject: alice }, resolver);
if (aliceResult.isOk()) {
  const d = aliceResult.value;
  console.log("Alice:", d.kind.toUpperCase());
  console.log("  Duration:", d.durationMs.toFixed(3), "ms");
  console.log("  Trace:", d.trace.result, "-", d.trace.policyKind);
} else {
  console.log("Alice error:", aliceResult.error);
}

const bobResult = await evaluateAsync(engineeringPolicy, { subject: bob }, resolver);
if (bobResult.isOk()) {
  const d = bobResult.value;
  console.log("\\nBob:", d.kind.toUpperCase());
  console.log("  Reason:", d.kind === "deny" ? d.reason : "n/a");
  console.log("  Trace:", d.trace.result, "-", d.trace.policyKind);
} else {
  console.log("\\nBob error:", bobResult.error);
}

// ---------------------------------------------------------------------------
// 5. Timeout handling — slow resolver exceeds deadline
// ---------------------------------------------------------------------------

console.log("\\n--- Timeout Handling ---");

const slowResolver = createResolver(200);

const timeoutResult = await evaluateAsync(
  engineeringPolicy,
  { subject: alice },
  slowResolver,
  { resolverTimeoutMs: 100 },
);

if (timeoutResult.isErr()) {
  const e = timeoutResult.error;
  console.log("Timeout error (expected):");
  console.log("  Code:", e.code);
  console.log("  Message:", e.message);
} else {
  console.log("Unexpected success:", timeoutResult.value.kind);
}

// ---------------------------------------------------------------------------
// 6. Resolver error handling — failing resolver
// ---------------------------------------------------------------------------

console.log("\\n--- Resolver Error Handling ---");

const failingResolver: AttributeResolver = {
  async resolve(_subjectId: string, attribute: string): Promise<unknown> {
    throw new Error("Connection refused: LDAP server unreachable");
  },
};

const errorResult = await evaluateAsync(
  engineeringPolicy,
  { subject: alice },
  failingResolver,
);

if (errorResult.isErr()) {
  const e = errorResult.error;
  console.log("Resolver error (expected):");
  console.log("  Code:", e.code);
  console.log("  Message:", e.message);
} else {
  console.log("Unexpected success:", errorResult.value.kind);
}

console.log("\\nDone! Switch to the Guard panel to see evaluation details.");
`;

export const guardAsyncEvaluation: ExampleTemplate = {
  id: "guard-async-evaluation",
  title: "Guard: Async Evaluation",
  description: "evaluateAsync, AttributeResolver, dynamic attribute resolution, timeout handling",
  category: "guard",
  files: new Map([["main.ts", MAIN_TS]]),
  entryPoint: "main.ts",
  defaultPanel: "guard",
};
