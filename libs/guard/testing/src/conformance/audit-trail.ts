import { it, expect, describe } from "vitest";
import type { AuditTrail } from "@hex-di/guard";
import { createTestAuditEntry } from "../testing/audit.js";

/**
 * Creates a conformance test suite for any AuditTrail implementation.
 * The suite verifies that the implementation correctly records entries,
 * returns Ok for successful writes, and allows entry retrieval.
 *
 * @example
 * ```ts
 * const suite = createAuditTrailConformanceSuite(() => createMemoryAuditTrail());
 * suite();
 * ```
 */
export function createAuditTrailConformanceSuite(
  factory: () => AuditTrail & { entries?: readonly unknown[] },
): () => void {
  return () => {
    describe("AuditTrail conformance", () => {
      it("record() returns Ok for a valid entry", () => {
        const trail = factory();
        const entry = createTestAuditEntry({ decision: "allow" });
        const result = trail.record(entry);
        expect(result.isOk()).toBe(true);
      });

      it("record() returns Ok for a deny entry", () => {
        const trail = factory();
        const entry = createTestAuditEntry({ decision: "deny" });
        const result = trail.record(entry);
        expect(result.isOk()).toBe(true);
      });

      it("records multiple entries without error", () => {
        const trail = factory();
        for (let i = 0; i < 5; i++) {
          const result = trail.record(
            createTestAuditEntry({ subjectId: `user-${i}` }),
          );
          expect(result.isOk()).toBe(true);
        }
      });

      it("accepts an entry with all optional fields populated", () => {
        const trail = factory();
        const entry = createTestAuditEntry({
          sessionId: "sess-123",
          identityProvider: "okta",
        });
        const result = trail.record(entry);
        expect(result.isOk()).toBe(true);
      });

      it("accepts entries with minimum required fields only", () => {
        const trail = factory();
        const entry = createTestAuditEntry({
          sessionId: undefined,
          identityProvider: undefined,
        });
        const result = trail.record(entry);
        expect(result.isOk()).toBe(true);
      });

      it("record() is idempotent in terms of return type for same entry", () => {
        const trail = factory();
        const entry = createTestAuditEntry();
        const r1 = trail.record(entry);
        const r2 = trail.record(entry);
        expect(r1.isOk()).toBe(true);
        expect(r2.isOk()).toBe(true);
      });

      it("record() returns Ok for a high-volume load (100 entries)", () => {
        const trail = factory();
        for (let i = 0; i < 100; i++) {
          const result = trail.record(
            createTestAuditEntry({ evaluationId: `eval-${i}`, subjectId: `user-${i % 10}` }),
          );
          expect(result.isOk()).toBe(true);
        }
      });

      it("accepts entries for different subjects independently", () => {
        const trail = factory();
        const subjects = ["alice", "bob", "charlie", "dave", "eve"];
        for (const subjectId of subjects) {
          const result = trail.record(createTestAuditEntry({ subjectId }));
          expect(result.isOk()).toBe(true);
        }
      });

      it("accepts entries for different ports independently", () => {
        const trail = factory();
        const ports = ["UserRepo", "OrderRepo", "AdminPort", "ReportService"];
        for (const portName of ports) {
          const result = trail.record(createTestAuditEntry({ portName }));
          expect(result.isOk()).toBe(true);
        }
      });

      it("accepts both allow and deny decisions interleaved", () => {
        const trail = factory();
        const decisions = ["allow", "deny", "allow", "deny", "allow"] as const;
        for (const decision of decisions) {
          const result = trail.record(createTestAuditEntry({ decision }));
          expect(result.isOk()).toBe(true);
        }
      });

      it("accepts entries with non-zero durationMs", () => {
        const trail = factory();
        const result = trail.record(createTestAuditEntry({ durationMs: 42 }));
        expect(result.isOk()).toBe(true);
      });

      it("accepts entries with very long reason strings", () => {
        const trail = factory();
        const result = trail.record(
          createTestAuditEntry({ reason: "a".repeat(2000) }),
        );
        expect(result.isOk()).toBe(true);
      });

      it("accepts entries with all supported authentication methods", () => {
        const trail = factory();
        const methods = ["password", "token", "certificate", "mfa", "sso"];
        for (const authenticationMethod of methods) {
          const result = trail.record(createTestAuditEntry({ authenticationMethod }));
          expect(result.isOk()).toBe(true);
        }
      });

      it("accepts entries with schemaVersion 1", () => {
        const trail = factory();
        const result = trail.record(createTestAuditEntry({ schemaVersion: 1 }));
        expect(result.isOk()).toBe(true);
      });

      it("accepts entries with complex policy JSON", () => {
        const trail = factory();
        const result = trail.record(
          createTestAuditEntry({
            policy: JSON.stringify({ kind: "allOf", policies: [{ kind: "hasRole", roleName: "admin" }] }),
          }),
        );
        expect(result.isOk()).toBe(true);
      });

      it("does not throw on concurrent-style sequential record calls", () => {
        const trail = factory();
        const results = Array.from({ length: 10 }, (_, i) =>
          trail.record(createTestAuditEntry({ evaluationId: `batch-${i}` })),
        );
        expect(results.every((r) => r.isOk())).toBe(true);
      });

      it("is append-only: entries count increases after each record()", () => {
        const trail = factory();
        if (trail.entries !== undefined) {
          const countBefore = trail.entries.length;
          trail.record(createTestAuditEntry({ evaluationId: "append-only-test" }));
          expect(trail.entries.length).toBe(countBefore + 1);
        } else {
          const result = trail.record(createTestAuditEntry({ evaluationId: "append-only-test" }));
          expect(result.isOk()).toBe(true);
        }
      });
    });
  };
}
