// @traces BEH-R07-001 BEH-R07-002 BEH-R07-003 BEH-R07-004 BEH-R07-005 INV-R10
import { describe, it, expect } from "vitest";
import { ResultAsync } from "@hex-di/result";
import { matchResult, matchResultAsync, resultAction } from "../../src/server/index.js";

describe("Integration: Server utilities boundary (BEH-R07-001, BEH-R07-004)", () => {
  it("resultAction → matchResult pipeline", async () => {
    const saveUser = resultAction(
      async (name: string) => ({ id: "1", name }),
      e => `save failed: ${String(e)}`
    );

    const result = await saveUser("Alice");
    const message = matchResult(result, {
      ok: user => `Saved ${user.name}`,
      err: e => `Failed: ${e}`,
    });

    expect(message).toBe("Saved Alice");
  });

  it("resultAction error → matchResult err branch", async () => {
    const failingAction = resultAction(
      async () => {
        throw new Error("db down");
      },
      e => (e as Error).message
    );

    const result = await failingAction();
    const message = matchResult(result, {
      ok: () => "success",
      err: e => `Error: ${e}`,
    });

    expect(message).toBe("Error: db down");
  });

  it("matchResultAsync pipeline", async () => {
    const resultAsync = ResultAsync.ok("data");
    const message = await matchResultAsync(resultAsync, {
      ok: val => `Got: ${val}`,
      err: () => "failed",
    });

    expect(message).toBe("Got: data");
  });
});
