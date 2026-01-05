/**
 * Tests for the DI layer graph configuration.
 *
 * These tests verify that the dependency graphs are correctly configured,
 * all adapters are properly registered, and the graphs validate successfully.
 *
 * With the new unified container architecture:
 * - rootGraph: Logger, Config (shared infrastructure)
 * - chatGraphFragment: MessageStore, UserSession, ChatService, NotificationService
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import { assertGraphComplete, serializeGraph } from "@hex-di/testing";
import { rootGraph } from "../src/di/root-graph.js";
import { chatGraphFragment } from "../src/di/chat-graph.js";
import {
  ConfigPort,
  LoggerPort,
  MessageStorePort,
  UserSessionPort,
  ChatServicePort,
  NotificationServicePort,
} from "../src/di/ports.js";

describe("DI Graph", () => {
  describe("Root Graph Construction", () => {
    it("should build root graph successfully with 2 adapters", () => {
      expect(rootGraph).toBeDefined();
      expect(rootGraph.adapters).toBeDefined();
      expect(rootGraph.adapters).toHaveLength(2);
    });

    it("should register root adapters", () => {
      const adapterPorts = rootGraph.adapters.map(a => a.provides.__portName);
      expect(adapterPorts).toContain("Config");
      expect(adapterPorts).toContain("Logger");
    });
  });

  describe("Chat Graph Fragment Construction", () => {
    it("should build chat graph fragment with 4 adapters", () => {
      expect(chatGraphFragment).toBeDefined();
      expect(chatGraphFragment.adapters).toBeDefined();
      expect(chatGraphFragment.adapters).toHaveLength(4);
    });

    it("should register chat adapters", () => {
      const adapterPorts = chatGraphFragment.adapters.map(a => a.provides.__portName);
      expect(adapterPorts).toContain("MessageStore");
      expect(adapterPorts).toContain("UserSession");
      expect(adapterPorts).toContain("ChatService");
      expect(adapterPorts).toContain("NotificationService");
    });
  });

  describe("Root Graph Validation", () => {
    it("should pass assertGraphComplete() for root graph", () => {
      expect(() => assertGraphComplete(rootGraph)).not.toThrow();
    });

    it("should validate root adapter relationships", () => {
      const adapters = rootGraph.adapters;
      const findAdapter = (portName: string) =>
        adapters.find(a => a.provides.__portName === portName);

      // ConfigAdapter should have no dependencies
      const configAdapter = findAdapter("Config");
      expect(configAdapter?.requires).toHaveLength(0);
      expect(configAdapter?.lifetime).toBe("singleton");

      // LoggerAdapter should have no dependencies
      const loggerAdapter = findAdapter("Logger");
      expect(loggerAdapter?.requires).toHaveLength(0);
      expect(loggerAdapter?.lifetime).toBe("singleton");
    });
  });

  describe("Chat Graph Fragment Validation", () => {
    it("should validate chat adapter relationships", () => {
      const adapters = chatGraphFragment.adapters;
      const findAdapter = (portName: string) =>
        adapters.find(a => a.provides.__portName === portName);

      // MessageStoreAdapter should require Logger
      const messageStoreAdapter = findAdapter("MessageStore");
      expect(messageStoreAdapter?.requires).toHaveLength(1);
      expect(messageStoreAdapter?.requires[0]?.__portName).toBe("Logger");
      expect(messageStoreAdapter?.lifetime).toBe("singleton");

      // UserSessionAdapter should have no dependencies
      const userSessionAdapter = findAdapter("UserSession");
      expect(userSessionAdapter?.requires).toHaveLength(0);
      expect(userSessionAdapter?.lifetime).toBe("scoped");

      // ChatServiceAdapter should require Logger, UserSession, MessageStore, Config
      const chatServiceAdapter = findAdapter("ChatService");
      expect(chatServiceAdapter?.requires).toHaveLength(4);
      const chatDeps = chatServiceAdapter?.requires.map(r => r.__portName);
      expect(chatDeps).toContain("Logger");
      expect(chatDeps).toContain("UserSession");
      expect(chatDeps).toContain("MessageStore");
      expect(chatDeps).toContain("Config");
      expect(chatServiceAdapter?.lifetime).toBe("scoped");

      // NotificationServiceAdapter should require Logger and Config
      const notificationAdapter = findAdapter("NotificationService");
      expect(notificationAdapter?.requires).toHaveLength(2);
      const notificationDeps = notificationAdapter?.requires.map(r => r.__portName);
      expect(notificationDeps).toContain("Logger");
      expect(notificationDeps).toContain("Config");
      expect(notificationAdapter?.lifetime).toBe("transient");
    });
  });

  describe("Graph Serialization", () => {
    it("should produce expected structure for root graph", () => {
      const snapshot = serializeGraph(rootGraph);

      expect(snapshot.adapters).toHaveLength(2);

      const findAdapter = (portName: string) => snapshot.adapters.find(a => a.port === portName);

      expect(findAdapter("Config")).toEqual({
        port: "Config",
        lifetime: "singleton",
        requires: [],
      });

      expect(findAdapter("Logger")).toEqual({
        port: "Logger",
        lifetime: "singleton",
        requires: [],
      });
    });

    it("should produce expected structure for chat graph fragment", () => {
      const snapshot = serializeGraph(chatGraphFragment);

      expect(snapshot.adapters).toHaveLength(4);

      const findAdapter = (portName: string) => snapshot.adapters.find(a => a.port === portName);

      expect(findAdapter("MessageStore")).toEqual({
        port: "MessageStore",
        lifetime: "singleton",
        requires: ["Logger"],
      });

      const chatServiceSnapshot = findAdapter("ChatService");
      expect(chatServiceSnapshot?.port).toBe("ChatService");
      expect(chatServiceSnapshot?.lifetime).toBe("scoped");
      expect(chatServiceSnapshot?.requires).toContain("Logger");
      expect(chatServiceSnapshot?.requires).toContain("UserSession");
      expect(chatServiceSnapshot?.requires).toContain("MessageStore");
    });
  });

  describe("Port Token Correctness", () => {
    it("should have all ports with correct names", () => {
      expect(ConfigPort.__portName).toBe("Config");
      expect(LoggerPort.__portName).toBe("Logger");
      expect(MessageStorePort.__portName).toBe("MessageStore");
      expect(UserSessionPort.__portName).toBe("UserSession");
      expect(ChatServicePort.__portName).toBe("ChatService");
      expect(NotificationServicePort.__portName).toBe("NotificationService");
    });
  });
});
