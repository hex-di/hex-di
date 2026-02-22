/**
 * Type-level tests for ResultStepTrace and SerializedValue.
 *
 * Spec: 01-overview.md Section 1.4.4, 1.4.5
 */

import { describe, it, expectTypeOf } from "vitest";
import type { ResultStepTrace, SerializedValue } from "../../../../src/panels/result/types.js";

describe("ResultStepTrace — Type Level", () => {
  it("step.inputTrack is 'ok' | 'err'", () => {
    expectTypeOf<ResultStepTrace["inputTrack"]>().toEqualTypeOf<"ok" | "err">();
  });

  it("step.outputTrack is 'ok' | 'err'", () => {
    expectTypeOf<ResultStepTrace["outputTrack"]>().toEqualTypeOf<"ok" | "err">();
  });

  it("step.switched is boolean", () => {
    expectTypeOf<ResultStepTrace["switched"]>().toEqualTypeOf<boolean>();
  });

  it("step.inputValue is SerializedValue | undefined", () => {
    expectTypeOf<ResultStepTrace["inputValue"]>().toEqualTypeOf<SerializedValue | undefined>();
  });

  it("step.outputValue is SerializedValue | undefined", () => {
    expectTypeOf<ResultStepTrace["outputValue"]>().toEqualTypeOf<SerializedValue | undefined>();
  });

  it("step.durationMicros is number", () => {
    expectTypeOf<ResultStepTrace["durationMicros"]>().toEqualTypeOf<number>();
  });

  it("step.callbackThrew is boolean", () => {
    expectTypeOf<ResultStepTrace["callbackThrew"]>().toEqualTypeOf<boolean>();
  });
});

describe("SerializedValue — Type Level", () => {
  it("sv.data is unknown", () => {
    expectTypeOf<SerializedValue["data"]>().toEqualTypeOf<unknown>();
  });

  it("sv.typeName is string", () => {
    expectTypeOf<SerializedValue["typeName"]>().toEqualTypeOf<string>();
  });

  it("sv.truncated is boolean", () => {
    expectTypeOf<SerializedValue["truncated"]>().toEqualTypeOf<boolean>();
  });
});
