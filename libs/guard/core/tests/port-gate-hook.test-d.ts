import { expectTypeOf, describe, it } from "vitest";
import {
  createPortGateHook,
  PortGatedError,
  type PortGateConfig,
  type PortGateRule,
  type ResolutionHook,
} from "../src/hook/port-gate.js";

describe("createPortGateHook — type-level tests", () => {
  it("createPortGateHook accepts a PortGateConfig and returns a ResolutionHook", () => {
    expectTypeOf(createPortGateHook).parameter(0).toEqualTypeOf<PortGateConfig>();
    expectTypeOf(createPortGateHook).returns.toEqualTypeOf<ResolutionHook>();
  });

  it("ResolutionHook has beforeResolve method", () => {
    expectTypeOf<ResolutionHook>().toHaveProperty("beforeResolve");
  });

  it("PortGatedError is an Error subclass", () => {
    expectTypeOf<PortGatedError>().toMatchTypeOf<Error>();
  });

  it("PortGatedError has portName and reason string fields", () => {
    expectTypeOf<PortGatedError["portName"]>().toEqualTypeOf<string>();
    expectTypeOf<PortGatedError["reason"]>().toEqualTypeOf<string>();
  });

  it("PortGateRule is a discriminated union on action", () => {
    expectTypeOf<PortGateRule>().extract<{ action: "deny" }>().toHaveProperty("reason");
    expectTypeOf<PortGateRule>().extract<{ action: "allow" }>().not.toHaveProperty("reason");
  });
});
