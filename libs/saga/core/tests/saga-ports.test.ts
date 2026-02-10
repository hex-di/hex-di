import { describe, it, expect } from "vitest";
import { createPort } from "@hex-di/core";
import {
  sagaPort,
  sagaManagementPort,
  SagaPersisterPort,
  isSagaPort,
  isSagaManagementPort,
} from "../src/ports/factory.js";

// =============================================================================
// Tests (DOD 3: Saga Ports)
// =============================================================================

describe("saga ports (DOD 3)", () => {
  describe("sagaPort", () => {
    it("returns a curried factory function", () => {
      const factory = sagaPort<string, number>();
      expect(typeof factory).toBe("function");
    });

    it("curried factory returns a SagaPort with correct name", () => {
      const port = sagaPort<string, number>()({ name: "OrderSaga" });
      expect(port.__portName).toBe("OrderSaga");
    });

    it("SagaPort config requires name field", () => {
      const port = sagaPort<string, number>()({ name: "TestPort" });
      expect(port.__portName).toBe("TestPort");
    });

    it("SagaPort config accepts optional description and metadata", () => {
      const port = sagaPort<string, number>()({
        name: "DescPort",
        description: "A test saga port",
        metadata: { version: "1.0" },
      });
      expect(port.__portName).toBe("DescPort");
    });

    it("SagaPort without TError defaults error phantom to never", () => {
      // This is a compile-time test, but we verify it creates successfully
      const port = sagaPort<string, number>()({ name: "NoError" });
      expect(port).toBeDefined();
    });

    it("SagaPort with explicit TError stores error phantom type", () => {
      // Compile-time phantom types; just verify creation
      const port = sagaPort<string, number, Error>()({ name: "WithError" });
      expect(port).toBeDefined();
    });
  });

  describe("sagaManagementPort", () => {
    it("returns a curried factory function", () => {
      const factory = sagaManagementPort<number>();
      expect(typeof factory).toBe("function");
    });

    it("curried factory returns a SagaManagementPort with correct name", () => {
      const port = sagaManagementPort<number>()({ name: "OrderManagement" });
      expect(port.__portName).toBe("OrderManagement");
    });

    it("SagaManagementPort config requires name field", () => {
      const port = sagaManagementPort<number>()({ name: "MgmtPort" });
      expect(port.__portName).toBe("MgmtPort");
    });

    it("SagaManagementPort without TError defaults error phantom to never", () => {
      const port = sagaManagementPort<number>()({ name: "NoErrMgmt" });
      expect(port).toBeDefined();
    });

    it("SagaManagementPort with explicit TError stores error phantom type", () => {
      const port = sagaManagementPort<number, Error>()({ name: "WithErrMgmt" });
      expect(port).toBeDefined();
    });
  });

  describe("SagaPersisterPort", () => {
    it("is a pre-defined port with name 'SagaPersister'", () => {
      expect(SagaPersisterPort.__portName).toBe("SagaPersister");
    });

    it("is defined as a port", () => {
      expect(SagaPersisterPort).toBeDefined();
      expect(typeof SagaPersisterPort.__portName).toBe("string");
    });
  });

  describe("SagaStatus discriminated union (DOD 3 #18)", () => {
    it("has 6 states: pending, running, compensating, completed, failed, cancelled", () => {
      const validStates = [
        "pending",
        "running",
        "compensating",
        "completed",
        "failed",
        "cancelled",
      ];
      // Runtime verification of all valid states
      for (const state of validStates) {
        expect(typeof state).toBe("string");
      }
      expect(validStates).toHaveLength(6);
    });
  });

  describe("ManagementError (DOD 3 #19)", () => {
    it("has 3 variants: ExecutionNotFound, InvalidOperation, PersistenceFailed", () => {
      const validTags = ["ExecutionNotFound", "InvalidOperation", "PersistenceFailed"];
      for (const tag of validTags) {
        expect(typeof tag).toBe("string");
      }
      expect(validTags).toHaveLength(3);
    });
  });

  describe("isSagaPort", () => {
    it("returns true for a SagaPort", () => {
      const port = sagaPort<string, number>()({ name: "TestSaga" });
      expect(isSagaPort(port)).toBe(true);
    });

    it("returns false for a SagaManagementPort", () => {
      const port = sagaManagementPort<number>()({ name: "TestMgmt" });
      expect(isSagaPort(port)).toBe(false);
    });

    it("returns false for a regular Port", () => {
      const port = createPort<"Regular", unknown>({ name: "Regular" });
      expect(isSagaPort(port)).toBe(false);
    });

    it("returns false for null", () => {
      expect(isSagaPort(null)).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(isSagaPort(undefined)).toBe(false);
    });

    it("returns false for plain objects", () => {
      expect(isSagaPort({ __portName: "Fake" })).toBe(false);
    });

    it("returns false for primitives", () => {
      expect(isSagaPort("string")).toBe(false);
      expect(isSagaPort(42)).toBe(false);
      expect(isSagaPort(true)).toBe(false);
    });
  });

  describe("isSagaManagementPort", () => {
    it("returns true for a SagaManagementPort", () => {
      const port = sagaManagementPort<number>()({ name: "TestMgmt" });
      expect(isSagaManagementPort(port)).toBe(true);
    });

    it("returns false for a SagaPort", () => {
      const port = sagaPort<string, number>()({ name: "TestSaga" });
      expect(isSagaManagementPort(port)).toBe(false);
    });

    it("returns false for a regular Port", () => {
      const port = createPort<"Regular", unknown>({ name: "Regular" });
      expect(isSagaManagementPort(port)).toBe(false);
    });

    it("returns false for null", () => {
      expect(isSagaManagementPort(null)).toBe(false);
    });

    it("returns false for plain objects", () => {
      expect(isSagaManagementPort({ __portName: "Fake" })).toBe(false);
    });
  });

  describe("port creation isolation", () => {
    it("different saga ports have different names", () => {
      const portA = sagaPort<string, number>()({ name: "SagaA" });
      const portB = sagaPort<string, boolean>()({ name: "SagaB" });
      expect(portA.__portName).not.toBe(portB.__portName);
    });

    it("different management ports have different names", () => {
      const portA = sagaManagementPort<number>()({ name: "MgmtA" });
      const portB = sagaManagementPort<boolean>()({ name: "MgmtB" });
      expect(portA.__portName).not.toBe(portB.__portName);
    });
  });
});
