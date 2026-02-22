/**
 * Signature validation type-level tests — DoD 8a/11
 */

import { describe, it, expectTypeOf } from "vitest";
import { validateSignableTemporalContext } from "../src/signature-validation.js";
import type { SignatureValidationError } from "../src/signature-validation.js";
import type { SignableTemporalContext, TemporalContext } from "../src/temporal-context.js";
import type { Result } from "@hex-di/result";

describe("Signature validation type shape", () => {
  it("validateSignableTemporalContext accepts SignableTemporalContext and returns Result", () => {
    expectTypeOf(validateSignableTemporalContext).parameters.toEqualTypeOf<
      [SignableTemporalContext]
    >();
    expectTypeOf(validateSignableTemporalContext).returns.toEqualTypeOf<
      Result<SignableTemporalContext, SignatureValidationError>
    >();
  });

  it("SignatureValidationError has readonly _tag, field, message", () => {
    expectTypeOf<SignatureValidationError["_tag"]>().toEqualTypeOf<"SignatureValidationError">();
    expectTypeOf<SignatureValidationError["field"]>().toEqualTypeOf<string>();
    expectTypeOf<SignatureValidationError["message"]>().toEqualTypeOf<string>();
  });

  it("SignableTemporalContext extends TemporalContext (assignable from TemporalContext with signature)", () => {
    expectTypeOf<SignableTemporalContext>().toMatchTypeOf<TemporalContext>();
  });

  it("SignableTemporalContext.signature has readonly signerName, signerId, signedAt, meaning, method when present", () => {
    type Sig = NonNullable<SignableTemporalContext["signature"]>;
    expectTypeOf<Sig["signerName"]>().toEqualTypeOf<string>();
    expectTypeOf<Sig["signerId"]>().toEqualTypeOf<string>();
    expectTypeOf<Sig["signedAt"]>().toEqualTypeOf<string>();
    expectTypeOf<Sig["meaning"]>().toEqualTypeOf<string>();
    expectTypeOf<Sig["method"]>().toEqualTypeOf<string>();
  });
});
