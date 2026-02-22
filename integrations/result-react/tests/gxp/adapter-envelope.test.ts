// @traces BEH-R05-001 BEH-R05-003 BEH-R05-004 INV-R4
import { describe, it, expect } from "vitest";
import { ResultAsync } from "@hex-di/result";
import { toQueryFn, toMutationFn } from "../../src/adapters/tanstack-query.js";
import { toSwrFetcher } from "../../src/adapters/swr.js";

describe("GxP: Adapter envelope unwrap/throw semantics (BEH-R05-001, INV-R4)", () => {
  it("toQueryFn unwraps Ok and throws Err (envelope loss documented)", async () => {
    const okFn = toQueryFn(() => ResultAsync.ok({ id: "1", name: "Alice" }));
    const result = await okFn();
    // Ok value is unwrapped — no longer a Result
    expect(result).toEqual({ id: "1", name: "Alice" });
    expect(typeof result).toBe("object");
    expect("isOk" in result).toBe(false); // Not a Result

    const errFn = toQueryFn(() => ResultAsync.err("not found"));
    await expect(errFn()).rejects.toBe("not found");
  });

  it("toMutationFn unwraps Ok and throws Err", async () => {
    const okFn = toMutationFn((name: string) =>
      ResultAsync.ok(`saved: ${name}`),
    );
    const result = await okFn("Alice");
    expect(result).toBe("saved: Alice");

    const errFn = toMutationFn((_name: string) =>
      ResultAsync.err("write failed"),
    );
    await expect(errFn("Alice")).rejects.toBe("write failed");
  });

  it("toSwrFetcher unwraps Ok and throws Err", async () => {
    const okFetcher = toSwrFetcher((key: string) =>
      ResultAsync.ok(`data for ${key}`),
    );
    const result = await okFetcher("/api/data");
    expect(result).toBe("data for /api/data");

    const errFetcher = toSwrFetcher((_key: string) =>
      ResultAsync.err("fetch failed"),
    );
    await expect(errFetcher("/api/data")).rejects.toBe("fetch failed");
  });
});
