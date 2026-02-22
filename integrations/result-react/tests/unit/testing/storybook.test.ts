// @traces BEH-R06-005
import { describe, it, expect } from "vitest";
import { ResultDecorator } from "../../../src/testing/storybook.js";

describe("ResultDecorator (BEH-R06-006)", () => {
  it("returns a valid decorator function", () => {
    const decorator = ResultDecorator();
    expect(typeof decorator).toBe("function");
  });

  it("decorator calls Story function", () => {
    const decorator = ResultDecorator();
    let called = false;
    const Story = () => {
      called = true;
      return null;
    };
    decorator(Story, {} as never, {} as never);
    expect(called).toBe(true);
  });
});
