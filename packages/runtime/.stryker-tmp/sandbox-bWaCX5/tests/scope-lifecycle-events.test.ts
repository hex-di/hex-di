/**
 * Tests for src/scope/lifecycle-events.ts
 */
// @ts-nocheck

import { describe, it, expect, vi } from "vitest";
import { ScopeLifecycleEmitter } from "../src/scope/lifecycle-events.js";

describe("ScopeLifecycleEmitter", () => {
  describe("initial state", () => {
    it("starts with 'active' state", () => {
      const emitter = new ScopeLifecycleEmitter();
      expect(emitter.getState()).toBe("active");
    });
  });

  describe("subscribe", () => {
    it("calls listener when events are emitted", () => {
      const emitter = new ScopeLifecycleEmitter();
      const listener = vi.fn();
      emitter.subscribe(listener);
      emitter.emit("disposing");
      expect(listener).toHaveBeenCalledWith("disposing");
    });

    it("returns unsubscribe function", () => {
      const emitter = new ScopeLifecycleEmitter();
      const listener = vi.fn();
      const unsub = emitter.subscribe(listener);
      unsub();
      emitter.emit("disposing");
      expect(listener).not.toHaveBeenCalled();
    });

    it("supports multiple listeners", () => {
      const emitter = new ScopeLifecycleEmitter();
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      emitter.subscribe(listener1);
      emitter.subscribe(listener2);
      emitter.emit("disposing");
      expect(listener1).toHaveBeenCalledOnce();
      expect(listener2).toHaveBeenCalledOnce();
    });
  });

  describe("emit", () => {
    it("transitions state to 'disposing' on disposing event", () => {
      const emitter = new ScopeLifecycleEmitter();
      emitter.emit("disposing");
      expect(emitter.getState()).toBe("disposing");
    });

    it("transitions state to 'disposed' on disposed event", () => {
      const emitter = new ScopeLifecycleEmitter();
      emitter.emit("disposed");
      expect(emitter.getState()).toBe("disposed");
    });

    it("swallows listener errors", () => {
      const emitter = new ScopeLifecycleEmitter();
      emitter.subscribe(() => {
        throw new Error("listener error");
      });
      // Should not throw
      expect(() => emitter.emit("disposing")).not.toThrow();
    });

    it("calls remaining listeners even if one throws", () => {
      const emitter = new ScopeLifecycleEmitter();
      const listener2 = vi.fn();
      emitter.subscribe(() => {
        throw new Error("first listener error");
      });
      emitter.subscribe(listener2);
      emitter.emit("disposing");
      expect(listener2).toHaveBeenCalledOnce();
    });
  });

  describe("getState", () => {
    it("returns current state", () => {
      const emitter = new ScopeLifecycleEmitter();
      expect(emitter.getState()).toBe("active");
      emitter.emit("disposing");
      expect(emitter.getState()).toBe("disposing");
      emitter.emit("disposed");
      expect(emitter.getState()).toBe("disposed");
    });
  });

  describe("clear", () => {
    it("removes all listeners", () => {
      const emitter = new ScopeLifecycleEmitter();
      const listener = vi.fn();
      emitter.subscribe(listener);
      emitter.clear();
      emitter.emit("disposing");
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
