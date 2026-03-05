import { describe, it, expectTypeOf } from "vitest";
import type {
  Capability,
  ConstrainedCapability,
  CapabilityConstraints,
  MethodConstraint,
  ServiceOf,
  NameOf,
  IsConstrained,
  ConstraintsOf,
  CapabilitiesAvailable,
} from "../src/capabilities/index.js";

// =============================================================================
// Test Service Interfaces
// =============================================================================

interface PaymentService {
  charge(): void;
  refund(): void;
}

interface LogService {
  log(): void;
}

// =============================================================================
// Test Capability Types
// =============================================================================

type PaymentCap = Capability<"Payment", PaymentService>;
type LogCap = Capability<"Log", LogService>;

type PaymentConstraints = {
  readonly charge: MethodConstraint;
  readonly refund: MethodConstraint;
};

type ConstrainedPaymentCap = ConstrainedCapability<"Payment", PaymentService, PaymentConstraints>;

// =============================================================================
// Tests
// =============================================================================

describe("Capability types", () => {
  it("extracts service type from Capability", () => {
    expectTypeOf<ServiceOf<PaymentCap>>().toEqualTypeOf<PaymentService>();
  });

  it("extracts service type from ConstrainedCapability", () => {
    expectTypeOf<ServiceOf<ConstrainedPaymentCap>>().toEqualTypeOf<PaymentService>();
  });

  it("returns never for non-capability", () => {
    expectTypeOf<ServiceOf<string>>().toEqualTypeOf<never>();
  });

  it("extracts name from Capability", () => {
    expectTypeOf<NameOf<PaymentCap>>().toEqualTypeOf<"Payment">();
  });

  it("extracts name from ConstrainedCapability", () => {
    expectTypeOf<NameOf<ConstrainedPaymentCap>>().toEqualTypeOf<"Payment">();
  });

  it("returns never for non-capability name", () => {
    expectTypeOf<NameOf<number>>().toEqualTypeOf<never>();
  });

  it("detects unconstrained capability", () => {
    expectTypeOf<IsConstrained<PaymentCap>>().toEqualTypeOf<false>();
  });

  it("detects constrained capability", () => {
    expectTypeOf<IsConstrained<ConstrainedPaymentCap>>().toEqualTypeOf<true>();
  });

  it("extracts constraints from constrained capability", () => {
    expectTypeOf<ConstraintsOf<ConstrainedPaymentCap>>().toEqualTypeOf<PaymentConstraints>();
  });

  it("returns never for unconstrained ConstraintsOf", () => {
    expectTypeOf<ConstraintsOf<PaymentCap>>().toEqualTypeOf<never>();
  });
});

describe("CapabilitiesAvailable", () => {
  it("returns true when all required capabilities are provided", () => {
    expectTypeOf<
      CapabilitiesAvailable<readonly [PaymentCap, LogCap], readonly [PaymentCap, LogCap]>
    >().toEqualTypeOf<true>();
  });

  it("returns true when provided is a superset", () => {
    expectTypeOf<
      CapabilitiesAvailable<readonly [PaymentCap], readonly [PaymentCap, LogCap]>
    >().toEqualTypeOf<true>();
  });

  it("returns error type when capability is missing", () => {
    type Result = CapabilitiesAvailable<readonly [PaymentCap, LogCap], readonly [PaymentCap]>;
    expectTypeOf<Result>().toEqualTypeOf<{
      readonly _error: "MISSING_CAPABILITY";
      readonly name: "Log";
    }>();
  });

  it("returns true for empty required list", () => {
    expectTypeOf<CapabilitiesAvailable<readonly [], readonly [PaymentCap]>>().toEqualTypeOf<true>();
  });
});

describe("CapabilityConstraints", () => {
  it("maps service methods to optional constraints", () => {
    type Constraints = CapabilityConstraints<PaymentService>;
    expectTypeOf<Constraints>().toHaveProperty("charge");
    expectTypeOf<Constraints>().toHaveProperty("refund");
  });
});
