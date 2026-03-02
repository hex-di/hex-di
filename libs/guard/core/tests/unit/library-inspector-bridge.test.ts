import { describe, it, expect } from "vitest";
import { getPortMetadata } from "@hex-di/core";
import {
  createGuardLibraryInspector,
  GuardLibraryInspectorPort,
  GuardInspectorPort,
  GuardInspector,
} from "../../src/index.js";
import type { GuardAllowEvent, GuardDenyEvent, GuardErrorEvent } from "../../src/index.js";

const stubTrace = {
  policyKind: "hasPermission",
  result: "allow" as const,
  durationMs: 1,
};

const stubPolicy = { kind: "hasPermission" as const };

function makeAllowEvent(overrides: Partial<GuardAllowEvent> = {}): GuardAllowEvent {
  return {
    kind: "guard.allow",
    evaluationId: "eval-1",
    portName: "TestPort",
    subjectId: "user-1",
    decision: {
      kind: "allow",
      evaluationId: "eval-1",
      evaluatedAt: "2025-01-15T10:00:00.000Z",
      subjectId: "user-1",
      policy: stubPolicy,
      trace: stubTrace,
      durationMs: 1,
    },
    timestamp: "2025-01-15T10:00:00.000Z",
    ...overrides,
  };
}

function makeDenyEvent(overrides: Partial<GuardDenyEvent> = {}): GuardDenyEvent {
  return {
    kind: "guard.deny",
    evaluationId: "eval-2",
    portName: "TestPort",
    subjectId: "user-2",
    decision: {
      kind: "deny",
      evaluationId: "eval-2",
      evaluatedAt: "2025-01-15T10:01:00.000Z",
      subjectId: "user-2",
      policy: stubPolicy,
      trace: { ...stubTrace, result: "deny" },
      durationMs: 2,
      reason: "no-permission",
    },
    timestamp: "2025-01-15T10:01:00.000Z",
    ...overrides,
  };
}

function makeErrorEvent(overrides: Partial<GuardErrorEvent> = {}): GuardErrorEvent {
  return {
    kind: "guard.error",
    evaluationId: "eval-3",
    portName: "TestPort",
    subjectId: "user-3",
    errorCode: "ACL008",
    message: "policy evaluation failed",
    timestamp: "2025-01-15T10:02:00.000Z",
    ...overrides,
  };
}

describe("createGuardLibraryInspector", () => {
  it('returns object with name "guard"', () => {
    const inspector = new GuardInspector();
    const bridge = createGuardLibraryInspector(inspector);

    expect(bridge.name).toBe("guard");
  });

  it("getSnapshot delegates to GuardInspector.getSnapshot()", () => {
    const inspector = new GuardInspector();
    inspector.registerPolicy("MyPort", "hasPermission");

    const bridge = createGuardLibraryInspector(inspector);
    const snapshot = bridge.getSnapshot();

    expect(snapshot.activePolicies).toStrictEqual({ MyPort: "hasPermission" });
  });

  it("getSnapshot returns a frozen copy", () => {
    const inspector = new GuardInspector();
    const bridge = createGuardLibraryInspector(inspector);

    const snapshot = bridge.getSnapshot();

    expect(Object.isFrozen(snapshot)).toBe(true);
  });

  it("subscribe maps GuardEvent.kind to LibraryEvent.type", () => {
    const inspector = new GuardInspector();
    const bridge = createGuardLibraryInspector(inspector);

    const receivedEvents: unknown[] = [];
    bridge.subscribe!(event => receivedEvents.push(event));

    inspector.onEvent(makeAllowEvent());

    expect(receivedEvents).toHaveLength(1);
    const event = receivedEvents[0] as { type: string };
    expect(event.type).toBe("guard.allow");
  });

  it("subscribe converts ISO timestamp string to number via Date.parse()", () => {
    const inspector = new GuardInspector();
    const bridge = createGuardLibraryInspector(inspector);

    const receivedEvents: unknown[] = [];
    bridge.subscribe!(event => receivedEvents.push(event));

    const isoTimestamp = "2025-01-15T10:00:00.000Z";
    inspector.onEvent(makeAllowEvent({ timestamp: isoTimestamp }));

    const event = receivedEvents[0] as { timestamp: number };
    expect(event.timestamp).toBe(Date.parse(isoTimestamp));
  });

  it("subscribe forwards all 3 event kinds (allow, deny, error)", () => {
    const inspector = new GuardInspector();
    const bridge = createGuardLibraryInspector(inspector);

    const receivedEvents: unknown[] = [];
    bridge.subscribe!(event => receivedEvents.push(event));

    inspector.onEvent(makeAllowEvent());
    inspector.onEvent(makeDenyEvent());
    inspector.onEvent(makeErrorEvent());

    expect(receivedEvents).toHaveLength(3);
    expect((receivedEvents[0] as { type: string }).type).toBe("guard.allow");
    expect((receivedEvents[1] as { type: string }).type).toBe("guard.deny");
    expect((receivedEvents[2] as { type: string }).type).toBe("guard.error");
  });

  it("subscribe payload is frozen and contains original event fields", () => {
    const inspector = new GuardInspector();
    const bridge = createGuardLibraryInspector(inspector);

    const receivedEvents: unknown[] = [];
    bridge.subscribe!(event => receivedEvents.push(event));

    inspector.onEvent(makeAllowEvent());

    const event = receivedEvents[0] as { payload: Record<string, unknown> };
    expect(Object.isFrozen(event.payload)).toBe(true);
    expect(event.payload.kind).toBe("guard.allow");
    expect(event.payload.evaluationId).toBe("eval-1");
    expect(event.payload.portName).toBe("TestPort");
    expect(event.payload.subjectId).toBe("user-1");
  });

  it("subscribe returns working unsubscribe function", () => {
    const inspector = new GuardInspector();
    const bridge = createGuardLibraryInspector(inspector);

    const receivedEvents: unknown[] = [];
    const unsub = bridge.subscribe!(event => receivedEvents.push(event));

    inspector.onEvent(makeAllowEvent());
    expect(receivedEvents).toHaveLength(1);

    unsub();

    inspector.onEvent(makeAllowEvent());
    expect(receivedEvents).toHaveLength(1);
  });

  it("no dispose method on bridge", () => {
    const inspector = new GuardInspector();
    const bridge = createGuardLibraryInspector(inspector);

    expect(bridge.dispose).toBeUndefined();
  });

  it("subscribe sets source to 'guard' for all events", () => {
    const inspector = new GuardInspector();
    const bridge = createGuardLibraryInspector(inspector);

    const receivedEvents: unknown[] = [];
    bridge.subscribe!(event => receivedEvents.push(event));

    inspector.onEvent(makeAllowEvent());
    inspector.onEvent(makeErrorEvent());

    for (const event of receivedEvents) {
      expect((event as { source: string }).source).toBe("guard");
    }
  });
});

describe("GuardLibraryInspectorPort", () => {
  it('has name "GuardLibraryInspector"', () => {
    expect(GuardLibraryInspectorPort.__portName).toBe("GuardLibraryInspector");
  });

  it('has category "library-inspector"', () => {
    const meta = getPortMetadata(GuardLibraryInspectorPort);
    expect(meta?.category).toBe("library-inspector");
  });
});

describe("GuardInspectorPort", () => {
  it('has name "GuardInspector"', () => {
    expect(GuardInspectorPort.__portName).toBe("GuardInspector");
  });

  it('has category "guard/inspector"', () => {
    const meta = getPortMetadata(GuardInspectorPort);
    expect(meta?.category).toBe("guard/inspector");
  });
});
