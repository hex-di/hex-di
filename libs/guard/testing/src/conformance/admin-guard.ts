import { it, expect, describe } from "vitest";
import {
  enforcePolicy,
  hasRole,
  hasPermission,
  allOf,
  createPermission,
  AccessDeniedError,
} from "@hex-di/guard";
import { createMemoryAuditTrail } from "../memory/audit-trail.js";
import { createTestSubject } from "../fixtures/subjects.js";

/**
 * Creates a conformance test suite for administrative guard scenarios.
 * Verifies that the guard correctly enforces admin-level access policies
 * with audit trail integration.
 *
 * @example
 * ```ts
 * const suite = createAdminGuardConformanceSuite();
 * suite();
 * ```
 */
export function createAdminGuardConformanceSuite(): () => void {
  return () => {
    describe("Admin guard conformance", () => {
      const ManageUsers = createPermission({ resource: "user", action: "manage" });
      const ReadUsers = createPermission({ resource: "user", action: "read" });
      const AdminPolicy = allOf(hasRole("admin"), hasPermission(ManageUsers));

      function makeAdmin() {
        return createTestSubject({
          roles: ["admin"],
          permissions: ["user:manage", "user:read"],
        });
      }

      function makeViewer() {
        return createTestSubject({
          roles: ["viewer"],
          permissions: ["user:read"],
        });
      }

      function makeAnonymous() {
        return createTestSubject({ roles: [], permissions: [] });
      }

      it("allows admin subject with required role and permission", () => {
        const subject = makeAdmin();
        const trail = createMemoryAuditTrail();
        const result = enforcePolicy({
          policy: AdminPolicy,
          subject,
          portName: "AdminPort",
          scopeId: "scope-1",
          auditTrail: trail,
          failOnAuditError: true,
        });
        expect(result.isOk()).toBe(true);
      });

      it("denies viewer subject (lacks role)", () => {
        const subject = makeViewer();
        const trail = createMemoryAuditTrail();
        const result = enforcePolicy({
          policy: AdminPolicy,
          subject,
          portName: "AdminPort",
          scopeId: "scope-1",
          auditTrail: trail,
          failOnAuditError: true,
        });
        expect(result.isErr()).toBe(true);
        if (result.isErr()) expect(result.error).toBeInstanceOf(AccessDeniedError);
      });

      it("denies anonymous subject (no roles or permissions)", () => {
        const subject = makeAnonymous();
        const trail = createMemoryAuditTrail();
        const result = enforcePolicy({
          policy: hasRole("admin"),
          subject,
          portName: "AdminPort",
          scopeId: "scope-1",
          auditTrail: trail,
          failOnAuditError: true,
        });
        expect(result.isErr()).toBe(true);
        if (result.isErr()) expect(result.error).toBeInstanceOf(AccessDeniedError);
      });

      it("audit trail records allow decision for admin", () => {
        const subject = makeAdmin();
        const trail = createMemoryAuditTrail();
        const result = enforcePolicy({
          policy: AdminPolicy,
          subject,
          portName: "AdminPort",
          scopeId: "scope-1",
          auditTrail: trail,
          failOnAuditError: true,
        });
        expect(result.isOk()).toBe(true);
        expect(trail.entries).toHaveLength(1);
        expect(trail.entries[0]?.decision).toBe("allow");
      });

      it("audit trail records deny decision for viewer", () => {
        const subject = makeViewer();
        const trail = createMemoryAuditTrail();
        const result = enforcePolicy({
          policy: AdminPolicy,
          subject,
          portName: "AdminPort",
          scopeId: "scope-1",
          auditTrail: trail,
          failOnAuditError: true,
        });
        expect(result.isErr()).toBe(true);
        if (result.isErr()) expect(result.error).toBeInstanceOf(AccessDeniedError);
        expect(trail.entries).toHaveLength(1);
        expect(trail.entries[0]?.decision).toBe("deny");
      });

      it("audit trail entries are valid for admin allow", () => {
        const subject = makeAdmin();
        const trail = createMemoryAuditTrail();
        const result = enforcePolicy({
          policy: AdminPolicy,
          subject,
          portName: "AdminPort",
          scopeId: "scope-1",
          auditTrail: trail,
          failOnAuditError: true,
        });
        expect(result.isOk()).toBe(true);
        expect(() => trail.assertAllEntriesValid()).not.toThrow();
      });

      it("getBySubject filters by subject id", () => {
        const admin = makeAdmin();
        const viewer = makeViewer();
        const trail = createMemoryAuditTrail();
        enforcePolicy({ policy: AdminPolicy, subject: admin, portName: "P1", scopeId: "s1", auditTrail: trail, failOnAuditError: false });
        const denyResult = enforcePolicy({ policy: AdminPolicy, subject: viewer, portName: "P1", scopeId: "s1", auditTrail: trail, failOnAuditError: false });
        expect(denyResult.isErr()).toBe(true);
        if (denyResult.isErr()) expect(denyResult.error).toBeInstanceOf(AccessDeniedError);
        expect(trail.getBySubject(admin.id)).toHaveLength(1);
        expect(trail.getBySubject(viewer.id)).toHaveLength(1);
      });

      it("getByDecision returns only allow entries", () => {
        const admin = makeAdmin();
        const viewer = makeViewer();
        const trail = createMemoryAuditTrail();
        enforcePolicy({ policy: AdminPolicy, subject: admin, portName: "P1", scopeId: "s1", auditTrail: trail, failOnAuditError: false });
        const denyResult = enforcePolicy({ policy: AdminPolicy, subject: viewer, portName: "P1", scopeId: "s1", auditTrail: trail, failOnAuditError: false });
        expect(denyResult.isErr()).toBe(true);
        if (denyResult.isErr()) expect(denyResult.error).toBeInstanceOf(AccessDeniedError);
        const allows = trail.getByDecision("allow");
        expect(allows.every((e) => e.decision === "allow")).toBe(true);
      });

      it("allows subject with only read permission for read policy", () => {
        const subject = makeViewer();
        const trail = createMemoryAuditTrail();
        const result = enforcePolicy({
          policy: hasPermission(ReadUsers),
          subject,
          portName: "ReadPort",
          scopeId: "scope-1",
          auditTrail: trail,
          failOnAuditError: true,
        });
        expect(result.isOk()).toBe(true);
      });

      it("multiple access checks accumulate in audit trail", () => {
        const admin = makeAdmin();
        const trail = createMemoryAuditTrail();
        for (let i = 0; i < 3; i++) {
          enforcePolicy({
            policy: hasRole("admin"),
            subject: admin,
            portName: `Port${i}`,
            scopeId: "scope-1",
            auditTrail: trail,
            failOnAuditError: true,
          });
        }
        expect(trail.entries).toHaveLength(3);
      });

      it("audit trail can be cleared between tests", () => {
        const admin = makeAdmin();
        const trail = createMemoryAuditTrail();
        enforcePolicy({
          policy: hasRole("admin"),
          subject: admin,
          portName: "Port",
          scopeId: "s1",
          auditTrail: trail,
          failOnAuditError: true,
        });
        expect(trail.entries).toHaveLength(1);
        trail.clear();
        expect(trail.entries).toHaveLength(0);
      });

      it("AccessDeniedError has correct portName and subjectId", () => {
        const viewer = makeViewer();
        const trail = createMemoryAuditTrail();
        const result = enforcePolicy({
          policy: hasRole("admin"),
          subject: viewer,
          portName: "SecureAdminPort",
          scopeId: "scope-1",
          auditTrail: trail,
          failOnAuditError: false,
        });
        expect(result.isErr()).toBe(true);
        if (result.isErr() && result.error instanceof AccessDeniedError) {
          expect(result.error.portName).toBe("SecureAdminPort");
          expect(result.error.subjectId).toBe(viewer.id);
        } else {
          expect.unreachable("Expected AccessDeniedError");
        }
      });

      it("allows with null audit trail", () => {
        const admin = makeAdmin();
        const result = enforcePolicy({
          policy: hasRole("admin"),
          subject: admin,
          portName: "Port",
          scopeId: "s1",
          auditTrail: null,
          failOnAuditError: false,
        });
        expect(result.isOk()).toBe(true);
      });

      it("denies subject with admin role but lacking required permission (allOf least-privilege)", () => {
        const roleOnlyAdmin = createTestSubject({
          roles: ["admin"],
          permissions: [],
        });
        const trail = createMemoryAuditTrail();
        const result = enforcePolicy({
          policy: AdminPolicy,
          subject: roleOnlyAdmin,
          portName: "AdminPort",
          scopeId: "scope-1",
          auditTrail: trail,
          failOnAuditError: true,
        });
        expect(result.isErr()).toBe(true);
        if (result.isErr()) expect(result.error).toBeInstanceOf(AccessDeniedError);
        expect(trail.entries[0]?.decision).toBe("deny");
      });
    });
  };
}
