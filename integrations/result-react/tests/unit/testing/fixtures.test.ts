// @traces BEH-R06-003
import { describe, it, expect } from "vitest";
import { createResultFixture } from "../../../src/testing/fixtures.js";

describe("createResultFixture (BEH-R06-001)", () => {
  const fixture = createResultFixture({ id: "1", name: "Alice" });

  it("ok() returns Ok with defaults", () => {
    const result = fixture.ok();
    expect(result).toBeOk({ id: "1", name: "Alice" });
  });

  it("ok() merges overrides into defaults", () => {
    const result = fixture.ok({ name: "Bob" });
    expect(result).toBeOk({ id: "1", name: "Bob" });
  });

  it("err() returns Err", () => {
    const result = fixture.err("fail");
    expect(result).toBeErr("fail");
  });

  it("okAsync() resolves to Ok", async () => {
    const resultAsync = fixture.okAsync({ name: "Carol" });
    const result = await resultAsync;
    expect(result).toBeOk({ id: "1", name: "Carol" });
  });

  it("errAsync() resolves to Err", async () => {
    const resultAsync = fixture.errAsync("async-fail");
    const result = await resultAsync;
    expect(result).toBeErr("async-fail");
  });

  it("okAsync() supports delay", async () => {
    const start = Date.now();
    const resultAsync = fixture.okAsync(undefined, 50);
    const result = await resultAsync;
    const elapsed = Date.now() - start;
    expect(result).toBeOk({ id: "1", name: "Alice" });
    expect(elapsed).toBeGreaterThanOrEqual(40);
  });
});
