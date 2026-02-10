import { describe, it, expect } from "vitest";
import {
  queryFetchFailed,
  queryCancelled,
  queryTimeout,
  queryAdapterMissing,
  queryInvalidationCycle,
  queryDisposed,
} from "../src/index.js";

describe("QueryResolutionError constructors", () => {
  it("QueryFetchFailed has correct _tag, portName, retryAttempt, cause", () => {
    const cause = new Error("network");
    const error = queryFetchFailed("Users", { id: 1 }, 3, cause);
    expect(error._tag).toBe("QueryFetchFailed");
    expect(error.portName).toBe("Users");
    expect(error.params).toEqual({ id: 1 });
    expect(error.retryAttempt).toBe(3);
    expect(error.cause).toBe(cause);
  });

  it("QueryCancelled has correct _tag, portName, params", () => {
    const error = queryCancelled("Users", { role: "admin" });
    expect(error._tag).toBe("QueryCancelled");
    expect(error.portName).toBe("Users");
    expect(error.params).toEqual({ role: "admin" });
  });

  it("QueryTimeout has correct _tag, portName, timeoutMs", () => {
    const error = queryTimeout("Users", { id: 1 }, 5000);
    expect(error._tag).toBe("QueryTimeout");
    expect(error.portName).toBe("Users");
    expect(error.params).toEqual({ id: 1 });
    expect(error.timeoutMs).toBe(5000);
  });

  it("QueryAdapterMissing has correct _tag, portName", () => {
    const error = queryAdapterMissing("Users");
    expect(error._tag).toBe("QueryAdapterMissing");
    expect(error.portName).toBe("Users");
  });

  it("QueryInvalidationCycle has correct _tag, chain, depth", () => {
    const chain = ["A", "B", "C", "A"];
    const error = queryInvalidationCycle(chain, 3);
    expect(error._tag).toBe("QueryInvalidationCycle");
    expect(error.chain).toEqual(chain);
    expect(error.depth).toBe(3);
  });

  it("QueryDisposed has correct _tag, portName", () => {
    const error = queryDisposed("Users");
    expect(error._tag).toBe("QueryDisposed");
    expect(error.portName).toBe("Users");
  });
});
