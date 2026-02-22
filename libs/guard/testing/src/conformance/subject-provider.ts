import { it, expect, describe } from "vitest";
import type { AuthSubject } from "@hex-di/guard";
import { createTestSubject } from "../fixtures/subjects.js";

/**
 * Interface for any subject provider that exposes a getSubject() method.
 */
export interface SubjectProvider {
  getSubject(): AuthSubject;
}

/**
 * Creates a conformance test suite for any SubjectProvider implementation.
 *
 * Validates the 12 structural, immutability, and idempotency requirements
 * that every SubjectProvider adapter must satisfy per spec §22-24.
 *
 * @example
 * ```ts
 * const suite = createSubjectProviderConformanceSuite(() => {
 *   const subject = createTestSubject({ id: "user-1" });
 *   return createMemorySubjectProvider(subject);
 * });
 * suite();
 * ```
 */
export function createSubjectProviderConformanceSuite(
  factory: () => SubjectProvider,
): () => void {
  return () => {
    describe("SubjectProvider conformance", () => {
      // ── Structure (6 tests) ──────────────────────────────────────────────

      it("getSubject() returns a subject with a non-empty id", () => {
        const provider = factory();
        const subject = provider.getSubject();
        expect(typeof subject.id).toBe("string");
        expect(subject.id.length).toBeGreaterThan(0);
      });

      it("getSubject() returns a subject with a roles array", () => {
        const provider = factory();
        const subject = provider.getSubject();
        expect(Array.isArray(subject.roles)).toBe(true);
      });

      it("getSubject() returns a subject with a permissions Set", () => {
        const provider = factory();
        const subject = provider.getSubject();
        expect(subject.permissions instanceof Set).toBe(true);
      });

      it("getSubject() returns a subject with a non-empty authenticationMethod", () => {
        const provider = factory();
        const subject = provider.getSubject();
        expect(typeof subject.authenticationMethod).toBe("string");
        expect(subject.authenticationMethod.length).toBeGreaterThan(0);
      });

      it("getSubject() returns a subject with an authenticatedAt ISO 8601 timestamp", () => {
        const provider = factory();
        const subject = provider.getSubject();
        expect(typeof subject.authenticatedAt).toBe("string");
        expect(subject.authenticatedAt.length).toBeGreaterThan(0);
        // Must be a parseable date
        expect(Number.isNaN(new Date(subject.authenticatedAt).getTime())).toBe(false);
      });

      it("getSubject() returns a subject with an attributes object", () => {
        const provider = factory();
        const subject = provider.getSubject();
        expect(typeof subject.attributes).toBe("object");
        expect(subject.attributes).not.toBeNull();
      });

      // ── Immutability (3 tests) ───────────────────────────────────────────

      it("returned subject is frozen (immutable)", () => {
        const provider = factory();
        const subject = provider.getSubject();
        expect(Object.isFrozen(subject)).toBe(true);
      });

      it("subject.roles is a frozen array", () => {
        const provider = factory();
        const subject = provider.getSubject();
        expect(Object.isFrozen(subject.roles)).toBe(true);
      });

      it("subject.attributes is frozen", () => {
        const provider = factory();
        const subject = provider.getSubject();
        expect(Object.isFrozen(subject.attributes)).toBe(true);
      });

      // ── Idempotency / consistency (3 tests) ─────────────────────────────

      it("getSubject() returns the configured subject consistently (same id)", () => {
        const provider = factory();
        const first = provider.getSubject();
        const second = provider.getSubject();
        expect(first.id).toBe(second.id);
      });

      it("getSubject() returns the same authenticationMethod on repeated calls", () => {
        const provider = factory();
        const first = provider.getSubject();
        const second = provider.getSubject();
        expect(first.authenticationMethod).toBe(second.authenticationMethod);
      });

      it("permissions.has() returns false for an unknown permission string", () => {
        const provider = factory();
        const subject = provider.getSubject();
        expect(subject.permissions.has("__nonexistent_permission_xyz__")).toBe(false);
      });
    });
  };
}

export { createTestSubject };
