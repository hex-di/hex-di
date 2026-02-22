import { describe, it, expect } from "vitest";
import { createMemorySignatureService } from "../../src/memory/signature-service.js";

describe("createMemorySignatureService()", () => {
  it("capture() returns a signature with the given meaning", async () => {
    const service = createMemorySignatureService({ signerId: "user-1" });
    const sig = await service.capture("approved");
    expect(sig.meaning).toBe("approved");
  });

  it("capture() uses configured signerId", async () => {
    const service = createMemorySignatureService({ signerId: "reviewer-42" });
    const sig = await service.capture("reviewed");
    expect(sig.signerId).toBe("reviewer-42");
  });

  it("capture() includes a valid ISO timestamp", async () => {
    const service = createMemorySignatureService({ signerId: "user-1" });
    const sig = await service.capture("approved");
    expect(() => new Date(sig.signedAt)).not.toThrow();
    expect(new Date(sig.signedAt).getTime()).toBeGreaterThan(0);
  });

  it("capture() defaults validated to true", async () => {
    const service = createMemorySignatureService({ signerId: "user-1" });
    const sig = await service.capture("approved");
    expect(sig.validated).toBe(true);
  });

  it("capture() respects configured validated=false", async () => {
    const service = createMemorySignatureService({ signerId: "user-1", validated: false });
    const sig = await service.capture("approved");
    expect(sig.validated).toBe(false);
  });

  it("capture() defaults reauthenticated to false", async () => {
    const service = createMemorySignatureService({ signerId: "user-1" });
    const sig = await service.capture("approved");
    expect(sig.reauthenticated).toBe(false);
  });

  it("capture() with signerRole includes the role", async () => {
    const service = createMemorySignatureService({ signerId: "user-1" });
    const sig = await service.capture("approved", "quality-reviewer");
    expect(sig.signerRoles).toContain("quality-reviewer");
  });

  it("stores captured signatures in order", async () => {
    const service = createMemorySignatureService({ signerId: "user-1" });
    await service.capture("reviewed");
    await service.capture("approved");
    expect(service.captured).toHaveLength(2);
    expect(service.captured[0]?.meaning).toBe("reviewed");
    expect(service.captured[1]?.meaning).toBe("approved");
  });

  it("validate() returns true for signatures with validated=true", async () => {
    const service = createMemorySignatureService({ signerId: "user-1" });
    const sig = await service.capture("approved");
    expect(service.validate(sig)).toBe(true);
  });

  it("validate() returns false for signatures with validated=false", async () => {
    const service = createMemorySignatureService({ signerId: "user-1", validated: false });
    const sig = await service.capture("approved");
    expect(service.validate(sig)).toBe(false);
  });

  it("configure() changes the signerId for subsequent captures", async () => {
    const service = createMemorySignatureService({ signerId: "original" });
    service.configure({ signerId: "new-signer" });
    const sig = await service.capture("approved");
    expect(sig.signerId).toBe("new-signer");
  });

  it("clear() removes all captured signatures", async () => {
    const service = createMemorySignatureService({ signerId: "user-1" });
    await service.capture("reviewed");
    await service.capture("approved");
    service.clear();
    expect(service.captured).toHaveLength(0);
  });
});
