import { expectTypeOf, it } from "vitest";
import type { AuditEntry, GxPAuditEntry, ElectronicSignature } from "../src/index.js";

// DoD 7 test 38: GxPAuditEntry is assignable to AuditEntry but not vice versa

it("GxPAuditEntry is a structural subtype of AuditEntry", () => {
  // GxPAuditEntry extends AuditEntry, so it must be assignable to AuditEntry
  expectTypeOf<GxPAuditEntry>().toMatchTypeOf<AuditEntry>();
});

it("AuditEntry is NOT assignable to GxPAuditEntry (lacks required GxP fields)", () => {
  // AuditEntry is missing required fields like integrityHash, so it is NOT a GxPAuditEntry
  expectTypeOf<AuditEntry>().not.toMatchTypeOf<GxPAuditEntry>();
});

it("ElectronicSignature in guard/types has optional signerName field (DoD 7 test 39)", () => {
  expectTypeOf<ElectronicSignature>().toHaveProperty("signerName").toEqualTypeOf<string | undefined>();
});
