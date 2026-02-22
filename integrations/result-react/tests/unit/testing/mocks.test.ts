// @traces BEH-R06-004
import { describe, it, expect } from "vitest";
import { mockResultAsync } from "../../../src/testing/mocks.js";

describe("mockResultAsync (BEH-R06-002)", () => {
  it("resolve produces Ok", async () => {
    const mock = mockResultAsync<string, string>();
    expect(mock.isSettled()).toBe(false);

    mock.resolve("hello");
    expect(mock.isSettled()).toBe(true);

    const result = await mock.resultAsync;
    expect(result).toBeOk("hello");
  });

  it("reject produces Err", async () => {
    const mock = mockResultAsync<string, string>();
    mock.reject("fail");
    expect(mock.isSettled()).toBe(true);

    const result = await mock.resultAsync;
    expect(result).toBeErr("fail");
  });

  it("double-resolve throws", () => {
    const mock = mockResultAsync<string, string>();
    mock.resolve("first");
    expect(() => mock.resolve("second")).toThrow(
      "MockResultAsync already settled",
    );
  });

  it("resolve then reject throws", () => {
    const mock = mockResultAsync<string, string>();
    mock.resolve("first");
    expect(() => mock.reject("fail")).toThrow(
      "MockResultAsync already settled",
    );
  });
});
