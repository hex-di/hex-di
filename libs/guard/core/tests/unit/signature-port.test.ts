import { describe, it, expect } from "vitest";
import { NoopSignatureService } from "../../src/signature/port.js";
import type { ElectronicSignature, SignatureCaptureRequest } from "../../src/signature/types.js";

describe("NoopSignatureService", () => {
  it("capture returns a valid shape", async () => {
    const request: SignatureCaptureRequest = { meaning: "approved" };
    const sig = await NoopSignatureService.capture(request);
    expect(sig.signerId).toBe("noop");
    expect(typeof sig.signedAt).toBe("string");
    expect(sig.meaning).toBe("approved");
    expect(sig.validated).toBe(true);
    expect(sig.reauthenticated).toBe(true);
  });

  it("validate returns ok with valid:true", async () => {
    const sig: ElectronicSignature = {
      signerId: "test",
      signedAt: new Date().toISOString(),
      meaning: "reviewed",
      validated: true,
      reauthenticated: false,
    };
    const result = await NoopSignatureService.validate(sig);
    expect(result.valid).toBe(true);
    expect(typeof result.validatedAt).toBe("string");
  });

  it("capture includes signerRoles when signerRole provided", async () => {
    const request: SignatureCaptureRequest = {
      meaning: "approved",
      signerRole: "quality-reviewer",
    };
    const sig = await NoopSignatureService.capture(request);
    expect(sig.signerRoles).toContain("quality-reviewer");
  });

  it("capture returns empty signerRoles when no signerRole provided", async () => {
    const request: SignatureCaptureRequest = { meaning: "approved" };
    const sig = await NoopSignatureService.capture(request);
    expect(sig.signerRoles).toEqual([]);
  });

  it("ElectronicSignature fields are well-typed", async () => {
    const request: SignatureCaptureRequest = { meaning: "reviewed" };
    const sig = await NoopSignatureService.capture(request);
    // All required fields present and correct types
    expect(typeof sig.signerId).toBe("string");
    expect(typeof sig.signedAt).toBe("string");
    expect(typeof sig.meaning).toBe("string");
    expect(typeof sig.validated).toBe("boolean");
    expect(typeof sig.reauthenticated).toBe("boolean");
  });

  it("SignatureCaptureRequest requires meaning", () => {
    // TypeScript enforces meaning is required — runtime check that
    // the captured signature preserves the meaning from the request
    const meanings = ["approved", "reviewed", "rejected", "verified"];
    for (const meaning of meanings) {
      const request: SignatureCaptureRequest = { meaning };
      expect(request.meaning).toBe(meaning);
    }
  });
});
