import { expectTypeOf, describe, it } from "vitest";
import { createRoleGate, RoleGateError, type RoleResolutionHook } from "../src/hook/role-gate.js";
import { withAttributes, getAttribute } from "../src/subject/auth-subject.js";
import { evaluateBatch, type PoliciesMap } from "../src/evaluator/evaluate.js";
import type { AuthSubject } from "../src/subject/auth-subject.js";
import type { Decision } from "../src/evaluator/decision.js";
import type { PolicyEvaluationError } from "../src/errors/types.js";
import type { Result } from "@hex-di/result";
import type { EvaluationContext } from "../src/evaluator/evaluate.js";

describe("createRoleGate — type-level tests", () => {
  it("createRoleGate accepts a string and returns a RoleResolutionHook", () => {
    expectTypeOf(createRoleGate).parameter(0).toEqualTypeOf<string>();
    expectTypeOf(createRoleGate).returns.toEqualTypeOf<RoleResolutionHook>();
  });

  it("RoleResolutionHook has beforeResolve method", () => {
    expectTypeOf<RoleResolutionHook>().toHaveProperty("beforeResolve");
  });

  it("RoleGateError is an Error subclass", () => {
    expectTypeOf<RoleGateError>().toMatchTypeOf<Error>();
  });

  it("RoleGateError has roleName and subjectId string fields", () => {
    expectTypeOf<RoleGateError["roleName"]>().toEqualTypeOf<string>();
    expectTypeOf<RoleGateError["subjectId"]>().toEqualTypeOf<string>();
  });
});

describe("withAttributes / getAttribute — type-level tests", () => {
  it("withAttributes accepts a subject and attribute map, returns AuthSubject", () => {
    expectTypeOf(withAttributes)
      .parameter(0)
      .toMatchTypeOf<AuthSubject>();
    expectTypeOf(withAttributes)
      .parameter(1)
      .toMatchTypeOf<Readonly<Record<string, unknown>>>();
    expectTypeOf(withAttributes).returns.toEqualTypeOf<AuthSubject>();
  });

  it("getAttribute returns unknown", () => {
    expectTypeOf(getAttribute).returns.toEqualTypeOf<unknown>();
  });
});

describe("evaluateBatch — type-level tests", () => {
  it("evaluateBatch accepts a PoliciesMap and returns a mapped result record", () => {
    expectTypeOf(evaluateBatch)
      .parameter(0)
      .toMatchTypeOf<PoliciesMap>();
    expectTypeOf(evaluateBatch)
      .parameter(1)
      .toMatchTypeOf<EvaluationContext>();
  });

  it("evaluateBatch return type is a Record of Results", () => {
    type R = ReturnType<typeof evaluateBatch>;
    expectTypeOf<R>().toMatchTypeOf<Readonly<Record<string, Result<Decision, PolicyEvaluationError>>>>();
  });
});
