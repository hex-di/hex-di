import { describe, it, expectTypeOf } from "vitest";
import type {
  MakeCapabilityError,
  CapabilitiesExercised,
  ErrorsByCapability,
  ExercisesCapability,
  IsPureComputation,
  CapabilityProfile,
  VerifyCapabilityUsage,
} from "../src/effects/index.js";

type InsufficientFunds = MakeCapabilityError<"InsufficientFunds", "billing", { amount: number }>;
type CardDeclined = MakeCapabilityError<"CardDeclined", "billing", { reason: string }>;
type NetworkTimeout = MakeCapabilityError<"NetworkTimeout", "network", { endpoint: string }>;

type PaymentError = InsufficientFunds | CardDeclined | NetworkTimeout;

describe("MakeCapabilityError", () => {
  it("creates error type with fields", () => {
    expectTypeOf<InsufficientFunds>().toMatchTypeOf<{
      readonly _tag: "InsufficientFunds";
      readonly _capability: "billing";
      readonly amount: number;
    }>();
  });

  it("creates error type without fields", () => {
    type Simple = MakeCapabilityError<"Simple", "cap">;
    expectTypeOf<Simple>().toEqualTypeOf<Readonly<{ _tag: "Simple"; _capability: "cap" }>>();
  });
});

describe("CapabilitiesExercised", () => {
  it("extracts all capability names", () => {
    expectTypeOf<CapabilitiesExercised<PaymentError>>().toEqualTypeOf<"billing" | "network">();
  });

  it("returns never for pure computation", () => {
    expectTypeOf<CapabilitiesExercised<never>>().toEqualTypeOf<never>();
  });
});

describe("ErrorsByCapability", () => {
  it("extracts errors for a specific capability", () => {
    type BillingErrors = ErrorsByCapability<PaymentError, "billing">;
    expectTypeOf<BillingErrors>().toEqualTypeOf<InsufficientFunds | CardDeclined>();
  });

  it("returns never for non-existent capability", () => {
    type NoErrors = ErrorsByCapability<PaymentError, "storage">;
    expectTypeOf<NoErrors>().toEqualTypeOf<never>();
  });
});

describe("ExercisesCapability", () => {
  it("returns true for exercised capability", () => {
    expectTypeOf<ExercisesCapability<PaymentError, "billing">>().toEqualTypeOf<true>();
  });

  it("returns false for non-exercised capability", () => {
    expectTypeOf<ExercisesCapability<PaymentError, "storage">>().toEqualTypeOf<false>();
  });
});

describe("IsPureComputation", () => {
  it("returns true for never", () => {
    expectTypeOf<IsPureComputation<never>>().toEqualTypeOf<true>();
  });

  it("returns false for non-never", () => {
    expectTypeOf<IsPureComputation<PaymentError>>().toEqualTypeOf<false>();
  });
});

describe("CapabilityProfile", () => {
  it("creates a profile mapping capabilities to errors", () => {
    type Profile = CapabilityProfile<PaymentError>;
    expectTypeOf<Profile>().toHaveProperty("billing");
    expectTypeOf<Profile>().toHaveProperty("network");
  });
});

describe("VerifyCapabilityUsage", () => {
  it("returns true when all capabilities are granted", () => {
    expectTypeOf<
      VerifyCapabilityUsage<PaymentError, "billing" | "network">
    >().toEqualTypeOf<true>();
  });

  it("returns error when unauthorized capability is used", () => {
    type Result = VerifyCapabilityUsage<PaymentError, "billing">;
    expectTypeOf<Result>().toHaveProperty("_error");
  });

  it("returns true for pure computations with any grants", () => {
    expectTypeOf<VerifyCapabilityUsage<never, "anything">>().toEqualTypeOf<true>();
  });
});
