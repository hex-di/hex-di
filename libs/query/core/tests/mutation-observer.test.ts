import { describe, it, expect, vi } from "vitest";
import { ResultAsync } from "@hex-di/result";
import { createMutationPort, createMutationObserver } from "../src/index.js";

// =============================================================================
// Test Port
// =============================================================================

interface CreateResult {
  readonly id: string;
  readonly name: string;
}

interface CreateInput {
  readonly name: string;
}

interface TestError {
  readonly _tag: string;
  readonly message: string;
}

const TestMutationPort = createMutationPort<CreateResult, CreateInput, TestError>()({
  name: "TestMutation",
});

// =============================================================================
// Mock Client Factory
// =============================================================================

function createMockMutationClient(opts?: { mutateResult?: ResultAsync<any, any> }) {
  let mutateResult = opts?.mutateResult ?? ResultAsync.ok({ id: "1", name: "test" });

  const client = {
    mutate: vi.fn(() => mutateResult),
  };

  return {
    client,
    setMutateResult(result: ResultAsync<any, any>) {
      mutateResult = result;
      client.mutate.mockReturnValue(result);
    },
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("MutationObserver", () => {
  // ===========================================================================
  // 1. Initial State
  // ===========================================================================

  describe("initial state", () => {
    it("returns idle state initially", () => {
      const { client } = createMockMutationClient();
      const observer = createMutationObserver(client, TestMutationPort);
      const state = observer.getState();

      expect(state.status).toBe("idle");
      expect(state.isIdle).toBe(true);
      expect(state.isPending).toBe(false);
      expect(state.isSuccess).toBe(false);
      expect(state.isError).toBe(false);
      expect(state.data).toBeUndefined();
      expect(state.error).toBeNull();
      expect(state.result).toBeUndefined();
    });
  });

  // ===========================================================================
  // 2. Success Flow
  // ===========================================================================

  describe("success flow", () => {
    it("transitions pending → success on successful mutation", async () => {
      const { client } = createMockMutationClient({
        mutateResult: ResultAsync.ok({ id: "1", name: "Alice" }),
      });
      const observer = createMutationObserver(client, TestMutationPort);

      const states: string[] = [];
      observer.subscribe(state => {
        states.push(state.status);
      });

      const result = await observer.mutateAsync({ name: "Alice" });

      expect(result.isOk()).toBe(true);
      expect(states).toContain("pending");
      expect(states).toContain("success");

      const finalState = observer.getState();
      expect(finalState.status).toBe("success");
      expect(finalState.isSuccess).toBe(true);
      expect(finalState.data).toEqual({ id: "1", name: "Alice" });
    });
  });

  // ===========================================================================
  // 3. Error Flow
  // ===========================================================================

  describe("error flow", () => {
    it("transitions pending → error on failed mutation", async () => {
      const testError: TestError = { _tag: "ValidationError", message: "Invalid" };
      const { client } = createMockMutationClient({
        mutateResult: ResultAsync.err(testError),
      });
      const observer = createMutationObserver(client, TestMutationPort);

      const states: string[] = [];
      observer.subscribe(state => {
        states.push(state.status);
      });

      const result = await observer.mutateAsync({ name: "" });

      expect(result.isErr()).toBe(true);
      expect(states).toContain("pending");
      expect(states).toContain("error");

      const finalState = observer.getState();
      expect(finalState.status).toBe("error");
      expect(finalState.isError).toBe(true);
      expect(finalState.error).toBe(testError);
    });
  });

  // ===========================================================================
  // 4. Subscribers
  // ===========================================================================

  describe("subscribers", () => {
    it("subscribers receive state transitions", async () => {
      const { client } = createMockMutationClient({
        mutateResult: ResultAsync.ok({ id: "1", name: "Alice" }),
      });
      const observer = createMutationObserver(client, TestMutationPort);

      const listener = vi.fn();
      observer.subscribe(listener);

      await observer.mutateAsync({ name: "Alice" });

      // Should have been called at least twice: pending + success
      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener.mock.calls[0][0].status).toBe("pending");
      expect(listener.mock.calls[1][0].status).toBe("success");
    });

    it("unsubscribe removes listener", async () => {
      const { client } = createMockMutationClient({
        mutateResult: ResultAsync.ok({ id: "1", name: "Alice" }),
      });
      const observer = createMutationObserver(client, TestMutationPort);

      const listener = vi.fn();
      const unsub = observer.subscribe(listener);
      unsub();

      await observer.mutateAsync({ name: "Alice" });

      expect(listener).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // 5. Reset
  // ===========================================================================

  describe("reset", () => {
    it("returns to idle state and notifies", async () => {
      const { client } = createMockMutationClient({
        mutateResult: ResultAsync.ok({ id: "1", name: "Alice" }),
      });
      const observer = createMutationObserver(client, TestMutationPort);

      await observer.mutateAsync({ name: "Alice" });
      expect(observer.getState().status).toBe("success");

      const listener = vi.fn();
      observer.subscribe(listener);

      observer.reset();

      expect(observer.getState().status).toBe("idle");
      expect(observer.getState().isIdle).toBe(true);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener.mock.calls[0][0].status).toBe("idle");
    });
  });

  // ===========================================================================
  // 6. Destroy
  // ===========================================================================

  describe("destroy", () => {
    it("prevents further notifications", async () => {
      const { client } = createMockMutationClient({
        mutateResult: ResultAsync.ok({ id: "1", name: "Alice" }),
      });
      const observer = createMutationObserver(client, TestMutationPort);

      const listener = vi.fn();
      observer.subscribe(listener);

      observer.destroy();
      expect(observer.isDestroyed).toBe(true);

      // Mutate after destroy — should not notify listener
      await observer.mutateAsync({ name: "Alice" });
      expect(listener).not.toHaveBeenCalled();
    });

    it("double-destroy is a no-op", () => {
      const { client } = createMockMutationClient();
      const observer = createMutationObserver(client, TestMutationPort);

      observer.destroy();
      expect(observer.isDestroyed).toBe(true);

      // No error on second destroy
      observer.destroy();
      expect(observer.isDestroyed).toBe(true);
    });
  });

  // ===========================================================================
  // 7. Lifecycle callbacks
  // ===========================================================================

  describe("lifecycle callbacks", () => {
    it("onSuccess is called on successful mutation", async () => {
      const onSuccess = vi.fn();
      const { client } = createMockMutationClient({
        mutateResult: ResultAsync.ok({ id: "1", name: "Alice" }),
      });
      const observer = createMutationObserver(client, TestMutationPort, {
        onSuccess,
      });

      await observer.mutateAsync({ name: "Alice" });

      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledWith(
        { id: "1", name: "Alice" },
        { name: "Alice" },
        undefined
      );
    });

    it("onError is called on failed mutation", async () => {
      const onError = vi.fn();
      const testError: TestError = { _tag: "Error", message: "fail" };
      const { client } = createMockMutationClient({
        mutateResult: ResultAsync.err(testError),
      });
      const observer = createMutationObserver(client, TestMutationPort, {
        onError,
      });

      await observer.mutateAsync({ name: "" });

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(testError, { name: "" }, undefined);
    });

    it("onSettled is called on success", async () => {
      const onSettled = vi.fn();
      const { client } = createMockMutationClient({
        mutateResult: ResultAsync.ok({ id: "1", name: "Alice" }),
      });
      const observer = createMutationObserver(client, TestMutationPort, {
        onSettled,
      });

      await observer.mutateAsync({ name: "Alice" });

      expect(onSettled).toHaveBeenCalledTimes(1);
      expect(onSettled).toHaveBeenCalledWith(
        { id: "1", name: "Alice" },
        undefined,
        { name: "Alice" },
        undefined
      );
    });

    it("onSettled is called on error", async () => {
      const onSettled = vi.fn();
      const testError: TestError = { _tag: "Error", message: "fail" };
      const { client } = createMockMutationClient({
        mutateResult: ResultAsync.err(testError),
      });
      const observer = createMutationObserver(client, TestMutationPort, {
        onSettled,
      });

      await observer.mutateAsync({ name: "" });

      expect(onSettled).toHaveBeenCalledTimes(1);
      expect(onSettled).toHaveBeenCalledWith(undefined, testError, { name: "" }, undefined);
    });
  });

  // ===========================================================================
  // 8. Fire-and-forget
  // ===========================================================================

  describe("mutate (fire-and-forget)", () => {
    it("triggers mutation without returning a result", async () => {
      const { client } = createMockMutationClient({
        mutateResult: ResultAsync.ok({ id: "1", name: "Alice" }),
      });
      const observer = createMutationObserver(client, TestMutationPort);

      observer.mutate({ name: "Alice" });

      // Wait for the async operation to complete
      await vi.waitFor(() => {
        expect(observer.getState().status).toBe("success");
      });

      expect(client.mutate).toHaveBeenCalled();
    });
  });
});
