// @traces BEH-R05-003
import { describe, it, expect } from "vitest";
import { ResultAsync } from "@hex-di/result";
import { toSwrFetcher } from "../../../src/adapters/swr.js";

describe("toSwrFetcher (BEH-R05-003)", () => {
  it("resolves with Ok value", async () => {
    const fetcher = toSwrFetcher((key: string) =>
      ResultAsync.ok(`data for ${key}`),
    );
    await expect(fetcher("/api/users")).resolves.toBe("data for /api/users");
  });

  it("throws Err value", async () => {
    const fetcher = toSwrFetcher((_key: string) => ResultAsync.err("not found"));
    await expect(fetcher("/api/users")).rejects.toBe("not found");
  });
});
