import { describe, it, expect, beforeEach } from "vitest";
import {
  createInMemoryStateAdapter,
  createInMemoryAtomAdapter,
  createFakeQueryAdapter,
  createFakeMutationAdapter,
  createFakeQueryClientAdapter,
  createMockFlowService,
  createMockFlowAdapter,
  createFakeSagaAdapter,
  createFakeSagaManagementAdapter,
} from "../src/index.js";

// ---------------------------------------------------------------------------
// InMemoryStateAdapter
// ---------------------------------------------------------------------------

describe("createInMemoryStateAdapter", () => {
  interface CounterState {
    count: number;
    label: string;
  }

  const createCounter = () =>
    createInMemoryStateAdapter({
      name: "Counter",
      initial: { count: 0, label: "default" },
      actions: {
        increment: (state: CounterState) => ({ ...state, count: state.count + 1 }),
        decrement: (state: CounterState) => ({ ...state, count: state.count - 1 }),
        incrementBy: (state: CounterState, amount: number) => ({
          ...state,
          count: state.count + amount,
        }),
        setLabel: (state: CounterState, label: string) => ({ ...state, label }),
      },
    });

  it("creates with correct initial state", () => {
    const counter = createCounter();
    expect(counter.state).toEqual({ count: 0, label: "default" });
  });

  it("dispatches actions and updates state", () => {
    const counter = createCounter();
    counter.actions.increment();
    expect(counter.state.count).toBe(1);

    counter.actions.incrementBy(5);
    expect(counter.state.count).toBe(6);

    counter.actions.decrement();
    expect(counter.state.count).toBe(5);

    counter.actions.setLabel("test");
    expect(counter.state.label).toBe("test");
  });

  it("tracks dispatched actions via spy", () => {
    const counter = createCounter();
    counter.actions.increment();
    counter.actions.incrementBy(3);

    expect(counter.spy.count).toBe(2);
    expect(counter.spy.dispatched).toHaveLength(2);
    expect(counter.spy.dispatched[0].actionName).toBe("increment");
    expect(counter.spy.dispatched[1].actionName).toBe("incrementBy");
    expect(counter.spy.dispatched[1].payload).toBe(3);
  });

  it("filters actions by name via spy", () => {
    const counter = createCounter();
    counter.actions.increment();
    counter.actions.incrementBy(2);
    counter.actions.increment();

    const increments = counter.spy.getByAction("increment");
    expect(increments).toHaveLength(2);

    const incrementBys = counter.spy.getByAction("incrementBy");
    expect(incrementBys).toHaveLength(1);
  });

  it("tracks last dispatched action", () => {
    const counter = createCounter();
    expect(counter.spy.last).toBeUndefined();

    counter.actions.increment();
    expect(counter.spy.last?.actionName).toBe("increment");

    counter.actions.setLabel("hello");
    expect(counter.spy.last?.actionName).toBe("setLabel");
  });

  it("records prevState and nextState in spy", () => {
    const counter = createCounter();
    counter.actions.increment();

    const record = counter.spy.dispatched[0];
    expect(record.prevState).toEqual({ count: 0, label: "default" });
    expect(record.nextState).toEqual({ count: 1, label: "default" });
  });

  it("supports subscriptions", () => {
    const counter = createCounter();
    const states: Array<{ count: number }> = [];

    const unsubscribe = counter.subscribe(state => {
      states.push({ count: state.count });
    });

    counter.actions.increment();
    counter.actions.increment();

    expect(states).toEqual([{ count: 1 }, { count: 2 }]);

    unsubscribe();
    counter.actions.increment();

    // No more notifications after unsubscribe
    expect(states).toHaveLength(2);
  });

  it("resets to initial state and clears history", () => {
    const counter = createCounter();
    counter.actions.increment();
    counter.actions.increment();

    counter.reset();

    expect(counter.state).toEqual({ count: 0, label: "default" });
    expect(counter.spy.count).toBe(0);
  });

  it("clears spy without resetting state", () => {
    const counter = createCounter();
    counter.actions.increment();
    counter.spy.clear();

    expect(counter.state.count).toBe(1);
    expect(counter.spy.count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// InMemoryAtomAdapter
// ---------------------------------------------------------------------------

describe("createInMemoryAtomAdapter", () => {
  it("creates with correct initial value", () => {
    const theme = createInMemoryAtomAdapter({
      name: "Theme",
      initial: "light" as "light" | "dark",
    });
    expect(theme.value).toBe("light");
  });

  it("sets new values", () => {
    const theme = createInMemoryAtomAdapter({
      name: "Theme",
      initial: "light" as "light" | "dark",
    });
    theme.set("dark");
    expect(theme.value).toBe("dark");
  });

  it("updates values using a function", () => {
    const counter = createInMemoryAtomAdapter({
      name: "Counter",
      initial: 0,
    });
    counter.update(v => v + 1);
    counter.update(v => v + 5);
    expect(counter.value).toBe(6);
  });

  it("tracks value history", () => {
    const counter = createInMemoryAtomAdapter({
      name: "Counter",
      initial: 0,
    });
    counter.set(1);
    counter.set(2);

    expect(counter.history).toHaveLength(3); // initial + 2 sets
    expect(counter.history[0].value).toBe(0);
    expect(counter.history[1].value).toBe(1);
    expect(counter.history[2].value).toBe(2);
  });

  it("supports subscriptions", () => {
    const theme = createInMemoryAtomAdapter({
      name: "Theme",
      initial: "light" as "light" | "dark",
    });
    const changes: Array<{ value: string; prev: string }> = [];

    const unsub = theme.subscribe((value, prev) => {
      changes.push({ value, prev });
    });

    theme.set("dark");
    theme.set("light");

    expect(changes).toEqual([
      { value: "dark", prev: "light" },
      { value: "light", prev: "dark" },
    ]);

    unsub();
    theme.set("dark");
    expect(changes).toHaveLength(2);
  });

  it("resets to initial value and clears history", () => {
    const counter = createInMemoryAtomAdapter({
      name: "Counter",
      initial: 0,
    });
    counter.set(5);
    counter.set(10);
    counter.reset();

    expect(counter.value).toBe(0);
    expect(counter.history).toHaveLength(1); // Just the reset initial
    expect(counter.history[0].value).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// FakeQueryAdapter
// ---------------------------------------------------------------------------

describe("createFakeQueryAdapter", () => {
  it("returns fixed data on fetch", async () => {
    const users = createFakeQueryAdapter({
      name: "Users",
      data: [{ id: "1", name: "Alice" }],
    });

    const result = await users.fetch(undefined);
    expect(result).toEqual([{ id: "1", name: "Alice" }]);
  });

  it("tracks fetch calls", async () => {
    const users = createFakeQueryAdapter<string[], { role: string }>({
      name: "Users",
      data: [],
    });

    await users.fetch({ role: "admin" });
    await users.fetch({ role: "user" });

    expect(users.fetchCalls).toHaveLength(2);
    expect(users.fetchCalls[0].params).toEqual({ role: "admin" });
    expect(users.fetchCalls[1].params).toEqual({ role: "user" });
  });

  it("throws on error configuration", async () => {
    const failing = createFakeQueryAdapter({
      name: "Failing",
      error: new Error("fetch failed"),
    });

    await expect(failing.fetch(undefined)).rejects.toThrow("fetch failed");
  });

  it("returns sequence of results", async () => {
    const query = createFakeQueryAdapter<number>({
      name: "Sequence",
      sequence: [{ data: 1 }, { data: 2 }, { data: 3 }],
    });

    expect(await query.fetch(undefined)).toBe(1);
    expect(await query.fetch(undefined)).toBe(2);
    expect(await query.fetch(undefined)).toBe(3);
    // Stays on last
    expect(await query.fetch(undefined)).toBe(3);
  });

  it("updates state through lifecycle", async () => {
    const query = createFakeQueryAdapter({
      name: "Test",
      data: "hello",
    });

    expect(query.state.status).toBe("idle");

    await query.fetch(undefined);

    expect(query.state.status).toBe("success");
    expect(query.state.data).toBe("hello");
    expect(query.state.isLoading).toBe(false);
  });

  it("supports subscriptions", async () => {
    const query = createFakeQueryAdapter({
      name: "Test",
      data: "hello",
    });

    const statuses: string[] = [];
    query.subscribe(state => {
      statuses.push(state.status);
    });

    await query.fetch(undefined);

    expect(statuses).toContain("loading");
    expect(statuses).toContain("success");
  });

  it("supports one-shot override", async () => {
    const query = createFakeQueryAdapter({
      name: "Test",
      data: "default",
    });

    query.setNextResult({ data: "override" });
    expect(await query.fetch(undefined)).toBe("override");
    // Next call returns default
    expect(await query.fetch(undefined)).toBe("default");
  });

  it("resets state and history", async () => {
    const query = createFakeQueryAdapter({
      name: "Test",
      data: "hello",
    });

    await query.fetch(undefined);
    query.reset();

    expect(query.state.status).toBe("idle");
    expect(query.fetchCalls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// FakeMutationAdapter
// ---------------------------------------------------------------------------

describe("createFakeMutationAdapter", () => {
  it("returns configured data on execute", async () => {
    const mutation = createFakeMutationAdapter({
      name: "CreateUser",
      data: { id: "1", name: "Alice" },
    });

    const result = await mutation.execute(undefined);
    expect(result).toEqual({ id: "1", name: "Alice" });
  });

  it("tracks mutation calls", async () => {
    const mutation = createFakeMutationAdapter<{ id: string }, { name: string }>({
      name: "CreateUser",
      data: { id: "1" },
    });

    await mutation.execute({ name: "Alice" });
    await mutation.execute({ name: "Bob" });

    expect(mutation.calls).toHaveLength(2);
    expect(mutation.calls[0].input).toEqual({ name: "Alice" });
  });

  it("throws on error configuration", async () => {
    const mutation = createFakeMutationAdapter({
      name: "Failing",
      error: new Error("mutation failed"),
    });

    await expect(mutation.execute(undefined)).rejects.toThrow("mutation failed");
  });

  it("supports one-shot override", async () => {
    const mutation = createFakeMutationAdapter({
      name: "Test",
      data: "default",
    });

    mutation.setNextResult({ data: "override" });
    expect(await mutation.execute(undefined)).toBe("override");
    expect(await mutation.execute(undefined)).toBe("default");
  });

  it("switches between success and failure modes", async () => {
    const mutation = createFakeMutationAdapter({
      name: "Test",
      data: "ok",
    });

    expect(await mutation.execute(undefined)).toBe("ok");

    mutation.setShouldFail(new Error("now failing"));
    await expect(mutation.execute(undefined)).rejects.toThrow("now failing");

    mutation.setShouldSucceed("back to ok");
    expect(await mutation.execute(undefined)).toBe("back to ok");
  });

  it("resets to original configuration", async () => {
    const mutation = createFakeMutationAdapter({
      name: "Test",
      data: "original",
    });

    mutation.setShouldFail(new Error("fail"));
    mutation.reset();

    expect(await mutation.execute(undefined)).toBe("original");
    expect(mutation.calls).toHaveLength(1); // Only post-reset call
  });
});

// ---------------------------------------------------------------------------
// FakeQueryClientAdapter
// ---------------------------------------------------------------------------

describe("createFakeQueryClientAdapter", () => {
  it("tracks invalidation calls", async () => {
    const client = createFakeQueryClientAdapter();

    await client.invalidate("Users");
    await client.invalidate("Users", { role: "admin" });

    expect(client.invalidations).toHaveLength(2);
  });

  it("filters invalidations by port name", async () => {
    const client = createFakeQueryClientAdapter();

    await client.invalidate("Users");
    await client.invalidate("Products");
    await client.invalidate("Users");

    expect(client.getInvalidationsFor("Users")).toHaveLength(2);
    expect(client.getInvalidationsFor("Products")).toHaveLength(1);
  });

  it("tracks invalidateAll", async () => {
    const client = createFakeQueryClientAdapter();

    await client.invalidateAll();

    expect(client.invalidations).toHaveLength(1);
    expect(client.invalidations[0].portName).toBe("*");
  });

  it("resets all tracked calls", async () => {
    const client = createFakeQueryClientAdapter();

    await client.invalidate("Users");
    await client.invalidateAll();
    client.reset();

    expect(client.invalidations).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// MockFlowService
// ---------------------------------------------------------------------------

describe("createMockFlowService", () => {
  const createOrderFlow = () =>
    createMockFlowService({
      machine: {
        id: "order",
        initial: "idle" as const,
        context: { orderId: null as string | null },
        states: {
          idle: { on: { START: "processing" as const } },
          processing: { on: { COMPLETE: "done" as const, FAIL: "failed" as const } },
          done: { type: "final" },
          failed: { type: "final" },
        },
      },
    });

  it("starts in initial state", () => {
    const flow = createOrderFlow();
    expect(flow.state()).toBe("idle");
    expect(flow.context()).toEqual({ orderId: null });
  });

  it("transitions on valid events", () => {
    const flow = createOrderFlow();
    const result = flow.send("START");

    expect(result.success).toBe(true);
    expect(result.state).toBe("processing");
    expect(flow.state()).toBe("processing");
  });

  it("ignores invalid events", () => {
    const flow = createOrderFlow();
    const result = flow.send("COMPLETE"); // Not valid in idle

    expect(result.success).toBe(false);
    expect(flow.state()).toBe("idle");
  });

  it("does not transition from final states", () => {
    const flow = createOrderFlow();
    flow.send("START");
    flow.send("COMPLETE");

    const result = flow.send("START"); // done is final, no transitions
    expect(result.success).toBe(false);
    expect(flow.state()).toBe("done");
  });

  it("tracks sent events", () => {
    const flow = createOrderFlow();
    flow.send("START");
    flow.send("COMPLETE");

    expect(flow.sentEvents).toHaveLength(2);
    expect(flow.sentEvents[0].event).toBe("START");
    expect(flow.sentEvents[0].transitioned).toBe(true);
    expect(flow.sentEvents[1].event).toBe("COMPLETE");
  });

  it("tracks failed transitions in event log", () => {
    const flow = createOrderFlow();
    flow.send("COMPLETE"); // Invalid in idle

    expect(flow.sentEvents).toHaveLength(1);
    expect(flow.sentEvents[0].transitioned).toBe(false);
    expect(flow.sentEvents[0].prevState).toBe("idle");
    expect(flow.sentEvents[0].nextState).toBe("idle");
  });

  it("provides snapshot", () => {
    const flow = createOrderFlow();
    const snap = flow.snapshot();

    expect(snap.state).toBe("idle");
    expect(snap.context).toEqual({ orderId: null });
  });

  it("supports subscriptions", () => {
    const flow = createOrderFlow();
    const snapshots: Array<{ state: string }> = [];

    const unsub = flow.subscribe(snap => {
      snapshots.push({ state: snap.state });
    });

    flow.send("START");
    flow.send("COMPLETE");

    expect(snapshots).toEqual([{ state: "processing" }, { state: "done" }]);

    unsub();
    flow.send("FAIL"); // Won't transition (done is final), won't notify
    expect(snapshots).toHaveLength(2);
  });

  it("supports sendAndExecute (async)", async () => {
    const flow = createOrderFlow();
    const result = await flow.sendAndExecute("START");

    expect(result.success).toBe(true);
    expect(flow.state()).toBe("processing");
  });

  it("supports context updates via setContext", () => {
    const flow = createOrderFlow();
    flow.setContext(ctx => ({ ...ctx, orderId: "order-123" }));

    expect(flow.context().orderId).toBe("order-123");
  });

  it("supports forced state transitions", () => {
    const flow = createOrderFlow();
    flow.forceState("done");

    expect(flow.state()).toBe("done");
  });

  it("supports guards on transitions", () => {
    let allowed = false;
    const flow = createMockFlowService({
      machine: {
        id: "guarded",
        initial: "a" as const,
        context: {},
        states: {
          a: {
            on: {
              GO: {
                target: "b" as const,
                guard: () => allowed,
              },
            },
          },
          b: {},
        },
      },
    });

    expect(flow.send("GO").success).toBe(false);
    expect(flow.state()).toBe("a");

    allowed = true;
    expect(flow.send("GO").success).toBe(true);
    expect(flow.state()).toBe("b");
  });

  it("dispose prevents further transitions", async () => {
    const flow = createOrderFlow();
    await flow.dispose();

    expect(flow.isDisposed).toBe(true);
    const result = flow.send("START");
    expect(result.success).toBe(false);
  });

  it("resets to initial state", () => {
    const flow = createOrderFlow();
    flow.send("START");
    flow.send("COMPLETE");
    flow.reset();

    expect(flow.state()).toBe("idle");
    expect(flow.sentEvents).toHaveLength(0);
    expect(flow.isDisposed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// MockFlowAdapter
// ---------------------------------------------------------------------------

describe("createMockFlowAdapter", () => {
  it("creates adapter with service and metadata", () => {
    const adapter = createMockFlowAdapter({
      portName: "OrderFlow",
      machine: {
        id: "order",
        initial: "idle" as const,
        context: {},
        states: {
          idle: { on: { START: "active" as const } },
          active: { type: "final" },
        },
      },
    });

    expect(adapter.portName).toBe("OrderFlow");
    expect(adapter.metadata.machineId).toBe("order");
    expect(adapter.metadata.stateNames).toContain("idle");
    expect(adapter.metadata.stateNames).toContain("active");
    expect(adapter.metadata.initialState).toBe("idle");
    expect(adapter.service.state()).toBe("idle");
  });
});

// ---------------------------------------------------------------------------
// FakeSagaAdapter
// ---------------------------------------------------------------------------

describe("createFakeSagaAdapter", () => {
  const createOrderSaga = () =>
    createFakeSagaAdapter<{ orderId: string }, { trackingNumber: string }>({
      name: "OrderSaga",
      steps: [{ name: "validateOrder" }, { name: "processPayment" }, { name: "fulfillOrder" }],
      output: { trackingNumber: "TRACK-123" },
    });

  it("executes all steps and returns output", async () => {
    const saga = createOrderSaga();
    const result = await saga.execute({ orderId: "order-1" });

    expect(result.output).toEqual({ trackingNumber: "TRACK-123" });
    expect(result.completedSteps).toEqual(["validateOrder", "processPayment", "fulfillOrder"]);
    expect(result.executionId).toBeTruthy();
  });

  it("tracks executions", async () => {
    const saga = createOrderSaga();
    await saga.execute({ orderId: "order-1" });
    await saga.execute({ orderId: "order-2" });

    expect(saga.executions).toHaveLength(2);
    expect(saga.executions[0].input).toEqual({ orderId: "order-1" });
    expect(saga.executions[0].status).toBe("completed");
  });

  it("fails at configured step and compensates", async () => {
    const saga = createFakeSagaAdapter<{ orderId: string }, { trackingNumber: string }>({
      name: "OrderSaga",
      steps: [{ name: "validateOrder" }, { name: "processPayment" }, { name: "fulfillOrder" }],
      output: { trackingNumber: "TRACK-123" },
      failAtStep: 1, // Fail at processPayment
    });

    await expect(saga.execute({ orderId: "order-1" })).rejects.toEqual(
      expect.objectContaining({
        _tag: "StepFailed",
        stepName: "processPayment",
        compensatedSteps: ["validateOrder"],
      })
    );

    expect(saga.executions[0].status).toBe("failed");
    expect(saga.executions[0].completedSteps).toEqual(["validateOrder"]);
    expect(saga.executions[0].compensatedSteps).toEqual(["validateOrder"]);
  });

  it("fails at step configured with shouldFail", async () => {
    const saga = createFakeSagaAdapter({
      name: "Test",
      steps: [{ name: "step1" }, { name: "step2", shouldFail: true }, { name: "step3" }],
    });

    await expect(saga.execute(undefined)).rejects.toEqual(
      expect.objectContaining({
        _tag: "StepFailed",
        stepName: "step2",
      })
    );
  });

  it("supports dynamic failure point via setFailAtStep", async () => {
    const saga = createOrderSaga();

    // First execution succeeds
    await saga.execute({ orderId: "order-1" });
    expect(saga.executions[0].status).toBe("completed");

    // Set failure point
    saga.setFailAtStep(2);

    await expect(saga.execute({ orderId: "order-2" })).rejects.toEqual(
      expect.objectContaining({
        _tag: "StepFailed",
        stepName: "fulfillOrder",
      })
    );

    // Clear failure point
    saga.setFailAtStep(undefined);
    await saga.execute({ orderId: "order-3" });
    expect(saga.executions[2].status).toBe("completed");
  });

  it("supports output override", async () => {
    const saga = createOrderSaga();
    saga.setOutput({ trackingNumber: "NEW-456" });

    const result = await saga.execute({ orderId: "order-1" });
    expect(result.output).toEqual({ trackingNumber: "NEW-456" });
  });

  it("resets to original configuration", async () => {
    const saga = createOrderSaga();
    saga.setFailAtStep(0);
    saga.reset();

    const result = await saga.execute({ orderId: "order-1" });
    expect(result.output).toEqual({ trackingNumber: "TRACK-123" });
    expect(saga.executions).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// FakeSagaManagementAdapter
// ---------------------------------------------------------------------------

describe("createFakeSagaManagementAdapter", () => {
  let management: ReturnType<typeof createFakeSagaManagementAdapter>;

  beforeEach(() => {
    management = createFakeSagaManagementAdapter({ name: "OrderSagaManagement" });
  });

  it("tracks getStatus calls", async () => {
    management.addExecution({
      executionId: "exec-1",
      status: "running",
      completedSteps: ["validate"],
      compensatedSteps: [],
      startedAt: new Date(),
      updatedAt: new Date(),
    });

    const status = await management.getStatus("exec-1");
    expect(status.status).toBe("running");
    expect(management.statusCalls).toHaveLength(1);
  });

  it("throws ExecutionNotFound for unknown execution", async () => {
    await expect(management.getStatus("unknown")).rejects.toEqual({
      _tag: "ExecutionNotFound",
      executionId: "unknown",
    });
  });

  it("resumes an execution", async () => {
    management.addExecution({
      executionId: "exec-1",
      status: "failed",
      completedSteps: ["validate"],
      compensatedSteps: [],
      startedAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await management.resume("exec-1");
    expect(result.executionId).toBe("exec-1");
    expect(management.resumeCalls).toHaveLength(1);

    // Status should now be completed
    const status = await management.getStatus("exec-1");
    expect(status.status).toBe("completed");
  });

  it("cancels an execution", async () => {
    management.addExecution({
      executionId: "exec-1",
      status: "running",
      completedSteps: [],
      compensatedSteps: [],
      startedAt: new Date(),
      updatedAt: new Date(),
    });

    await management.cancel("exec-1");
    expect(management.cancelCalls).toHaveLength(1);

    const status = await management.getStatus("exec-1");
    expect(status.status).toBe("cancelled");
  });

  it("lists executions with filters", async () => {
    management.addExecution({
      executionId: "exec-1",
      status: "completed",
      completedSteps: [],
      compensatedSteps: [],
      startedAt: new Date("2024-01-01"),
      updatedAt: new Date(),
    });
    management.addExecution({
      executionId: "exec-2",
      status: "failed",
      completedSteps: [],
      compensatedSteps: [],
      startedAt: new Date("2024-01-02"),
      updatedAt: new Date(),
    });
    management.addExecution({
      executionId: "exec-3",
      status: "failed",
      completedSteps: [],
      compensatedSteps: [],
      startedAt: new Date("2024-01-03"),
      updatedAt: new Date(),
    });

    const allFailed = await management.listExecutions({ status: "failed" });
    expect(allFailed).toHaveLength(2);

    const limited = await management.listExecutions({ limit: 1 });
    expect(limited).toHaveLength(1);
  });

  it("resets all state", async () => {
    management.addExecution({
      executionId: "exec-1",
      status: "running",
      completedSteps: [],
      compensatedSteps: [],
      startedAt: new Date(),
      updatedAt: new Date(),
    });

    await management.getStatus("exec-1");
    management.reset();

    expect(management.statusCalls).toHaveLength(0);
    expect(management.resumeCalls).toHaveLength(0);
    expect(management.cancelCalls).toHaveLength(0);

    await expect(management.getStatus("exec-1")).rejects.toEqual(
      expect.objectContaining({ _tag: "ExecutionNotFound" })
    );
  });
});
