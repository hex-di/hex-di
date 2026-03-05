import { describe, it, expect } from "vitest";
import {
  methodConstraint,
  constrainCapability,
  getConstrainedMethods,
} from "../src/capabilities/index.js";

// =============================================================================
// Test Service Interface
// =============================================================================

interface PaymentService {
  charge(): void;
  refund(): void;
}

// =============================================================================
// methodConstraint
// =============================================================================

describe("methodConstraint", () => {
  it("creates a constraint with tag and description", () => {
    const c = methodConstraint("permission", "billing:charge");
    expect(c._tag).toBe("permission");
    expect(c.description).toBe("billing:charge");
  });

  it("creates a frozen constraint", () => {
    const c = methodConstraint("role", "admin");
    expect(Object.isFrozen(c)).toBe(true);
  });
});

// =============================================================================
// constrainCapability
// =============================================================================

describe("constrainCapability", () => {
  it("creates a constrained capability with correct brand", () => {
    const cap = constrainCapability<"Payment", PaymentService>("Payment", {
      charge: methodConstraint("permission", "billing:charge"),
      refund: methodConstraint("permission", "billing:refund"),
    });
    expect(cap._brand).toBe("ConstrainedCapability");
    expect(cap.name).toBe("Payment");
  });

  it("creates a frozen constrained capability", () => {
    const cap = constrainCapability<"Payment", PaymentService>("Payment", {
      charge: methodConstraint("permission", "billing:charge"),
    });
    expect(Object.isFrozen(cap)).toBe(true);
  });

  it("preserves constraint references", () => {
    const chargeConstraint = methodConstraint("permission", "billing:charge");
    const refundConstraint = methodConstraint("permission", "billing:refund");

    const cap = constrainCapability<"Payment", PaymentService>("Payment", {
      charge: chargeConstraint,
      refund: refundConstraint,
    });

    expect(cap._constraints.charge).toBe(chargeConstraint);
    expect(cap._constraints.refund).toBe(refundConstraint);
  });
});

// =============================================================================
// getConstrainedMethods
// =============================================================================

describe("getConstrainedMethods", () => {
  it("lists constrained methods", () => {
    const cap = constrainCapability<"Payment", PaymentService>("Payment", {
      charge: methodConstraint("permission", "billing:charge"),
    });
    const methods = getConstrainedMethods(cap);
    expect(methods).toHaveLength(1);
    expect(methods[0].method).toBe("charge");
    expect(methods[0].constraint._tag).toBe("permission");
    expect(methods[0].constraint.description).toBe("billing:charge");
  });

  it("returns empty array for capability with no constraints", () => {
    const cap = constrainCapability<"Payment", PaymentService>("Payment", {});
    const methods = getConstrainedMethods(cap);
    expect(methods).toHaveLength(0);
  });

  it("returns a frozen array", () => {
    const cap = constrainCapability<"Payment", PaymentService>("Payment", {
      charge: methodConstraint("permission", "billing:charge"),
    });
    const methods = getConstrainedMethods(cap);
    expect(Object.isFrozen(methods)).toBe(true);
  });

  it("lists multiple constrained methods", () => {
    const cap = constrainCapability<"Payment", PaymentService>("Payment", {
      charge: methodConstraint("permission", "billing:charge"),
      refund: methodConstraint("role", "admin"),
    });
    const methods = getConstrainedMethods(cap);
    expect(methods).toHaveLength(2);

    const methodNames = methods.map(m => m.method);
    expect(methodNames).toContain("charge");
    expect(methodNames).toContain("refund");
  });
});
