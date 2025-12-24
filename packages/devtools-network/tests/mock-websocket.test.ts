/**
 * Tests for MockWebSocket.
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { MockWebSocket, createMockWebSocketPair, createMockWebSocket } from "./mock-websocket.js";
import { WebSocket } from "ws";

describe("MockWebSocket", () => {
  describe("creation", () => {
    it("should create a mock WebSocket with default URL", () => {
      const ws = new MockWebSocket();
      expect(ws).toBeDefined();
      expect(ws.url).toBe("ws://localhost");
    });

    it("should create a mock WebSocket with custom URL", () => {
      const ws = new MockWebSocket("ws://example.com/socket");
      expect(ws.url).toBe("ws://example.com/socket");
    });

    it("should have OPEN ready state by default", () => {
      const ws = new MockWebSocket();
      expect(ws.readyState).toBe(WebSocket.OPEN);
    });

    it("should have correct initial properties", () => {
      const ws = new MockWebSocket();
      expect(ws.binaryType).toBe("arraybuffer");
      expect(ws.bufferedAmount).toBe(0);
      expect(ws.extensions).toBe("");
      expect(ws.protocol).toBe("");
      expect(ws.onopen).toBeNull();
      expect(ws.onclose).toBeNull();
      expect(ws.onerror).toBeNull();
      expect(ws.onmessage).toBeNull();
    });
  });

  describe("send and receive", () => {
    let client: MockWebSocket;
    let server: MockWebSocket;

    beforeEach(() => {
      const pair = createMockWebSocketPair();
      client = pair.client;
      server = pair.server;
    });

    it("should send string data to peer", () => {
      const receivedMessages: string[] = [];

      server.onmessage = event => {
        receivedMessages.push(String(event.data));
      };

      client.send("Hello, Server!");

      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0]).toBe("Hello, Server!");
    });

    it("should send ArrayBuffer data to peer", () => {
      const receivedMessages: string[] = [];

      server.onmessage = event => {
        receivedMessages.push(String(event.data));
      };

      const buffer = new TextEncoder().encode("Hello, Buffer!").buffer;
      client.send(buffer);

      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0]).toBe("Hello, Buffer!");
    });

    it("should not send data when socket is closed", () => {
      const receivedMessages: string[] = [];

      server.onmessage = event => {
        receivedMessages.push(String(event.data));
      };

      client.close();
      client.send("This should not be received");

      expect(receivedMessages).toHaveLength(0);
    });

    it("should not send data when peer is closed", () => {
      const receivedMessages: string[] = [];

      server.onmessage = event => {
        receivedMessages.push(String(event.data));
      };

      server.close();
      client.send("This should not be received");

      expect(receivedMessages).toHaveLength(0);
    });
  });

  describe("event handlers", () => {
    let client: MockWebSocket;
    let server: MockWebSocket;

    beforeEach(() => {
      const pair = createMockWebSocketPair();
      client = pair.client;
      server = pair.server;
    });

    it("should call onmessage handler when message is received", () => {
      const handler = vi.fn();
      server.onmessage = handler;

      client.send("test message");

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ data: "test message" }));
    });

    it("should call onclose handler when socket is closed", () => {
      const handler = vi.fn();
      client.onclose = handler;

      client.close();

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "close",
          code: 1000,
          wasClean: true,
        })
      );
    });

    it("should close peer when one socket closes", () => {
      const peerCloseHandler = vi.fn();
      server.onclose = peerCloseHandler;

      client.close();

      expect(server.readyState).toBe(WebSocket.CLOSED);
      expect(peerCloseHandler).toHaveBeenCalledOnce();
    });

    it("should not close peer twice", () => {
      const peerCloseHandler = vi.fn();
      server.onclose = peerCloseHandler;

      client.close();
      server.close();

      // Should only be called once (from client.close())
      expect(peerCloseHandler).toHaveBeenCalledOnce();
    });
  });

  describe("addEventListener and removeEventListener", () => {
    let ws: MockWebSocket;

    beforeEach(() => {
      ws = new MockWebSocket();
    });

    it("should add event listener", () => {
      const listener = vi.fn();
      ws.addEventListener("message", listener);

      const event = new MessageEvent("message", { data: "test" });
      ws.dispatchEvent(event);

      expect(listener).toHaveBeenCalledOnce();
    });

    it("should remove event listener", () => {
      const listener = vi.fn();
      ws.addEventListener("message", listener);
      ws.removeEventListener("message", listener);

      const event = new MessageEvent("message", { data: "test" });
      ws.dispatchEvent(event);

      expect(listener).not.toHaveBeenCalled();
    });

    it("should support multiple listeners for same event", () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      ws.addEventListener("message", listener1);
      ws.addEventListener("message", listener2);

      const event = new MessageEvent("message", { data: "test" });
      ws.dispatchEvent(event);

      expect(listener1).toHaveBeenCalledOnce();
      expect(listener2).toHaveBeenCalledOnce();
    });

    it("should support different event types", () => {
      const messageListener = vi.fn();
      const closeListener = vi.fn();

      ws.addEventListener("message", messageListener);
      ws.addEventListener("close", closeListener);

      const messageEvent = new MessageEvent("message", { data: "test" });
      const closeEvent = new Event("close");

      ws.dispatchEvent(messageEvent);
      ws.dispatchEvent(closeEvent);

      expect(messageListener).toHaveBeenCalledOnce();
      expect(closeListener).toHaveBeenCalledOnce();
    });
  });

  describe("type compatibility", () => {
    it("should have compatible structure with WebSocket", () => {
      const mock = new MockWebSocket();
      // Verify the mock has all required WebSocket properties and methods
      // We don't assign directly as the generic signatures differ intentionally
      expect(mock).toHaveProperty("readyState");
      expect(mock).toHaveProperty("send");
      expect(mock).toHaveProperty("close");
      expect(mock).toHaveProperty("addEventListener");
      expect(mock).toHaveProperty("removeEventListener");
      expect(mock).toHaveProperty("dispatchEvent");
    });

    it("should implement all required WebSocket properties", () => {
      const ws = new MockWebSocket();

      // Check all required properties exist
      expect(typeof ws.readyState).toBe("number");
      expect(typeof ws.binaryType).toBe("string");
      expect(typeof ws.bufferedAmount).toBe("number");
      expect(typeof ws.extensions).toBe("string");
      expect(typeof ws.protocol).toBe("string");
      expect(typeof ws.url).toBe("string");
    });

    it("should implement all required WebSocket methods", () => {
      const ws = new MockWebSocket();

      // Check all required methods exist
      expect(typeof ws.send).toBe("function");
      expect(typeof ws.close).toBe("function");
      expect(typeof ws.addEventListener).toBe("function");
      expect(typeof ws.removeEventListener).toBe("function");
      expect(typeof ws.dispatchEvent).toBe("function");
    });
  });

  describe("factory functions", () => {
    it("should create a pair with createMockWebSocketPair", () => {
      const { client, server } = createMockWebSocketPair();

      expect(client).toBeInstanceOf(MockWebSocket);
      expect(server).toBeInstanceOf(MockWebSocket);
      expect(client.peer).toBe(server);
      expect(server.peer).toBe(client);
    });

    it("should create a pair with custom URLs", () => {
      const { client, server } = createMockWebSocketPair("ws://client", "ws://server");

      expect(client.url).toBe("ws://client");
      expect(server.url).toBe("ws://server");
    });

    it("should create a single socket with createMockWebSocket", () => {
      const ws = createMockWebSocket("ws://test");

      expect(ws).toBeInstanceOf(MockWebSocket);
      expect(ws.url).toBe("ws://test");
      expect(ws.peer).toBeNull();
    });

    it("should create a single socket with default URL", () => {
      const ws = createMockWebSocket();

      expect(ws.url).toBe("ws://localhost");
    });
  });

  describe("close with code and reason", () => {
    it("should close with custom code and reason", () => {
      const ws = new MockWebSocket();
      const closeHandler = vi.fn();
      ws.onclose = closeHandler;

      ws.close(4000, "Custom reason");

      expect(ws.readyState).toBe(WebSocket.CLOSED);
      expect(closeHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 4000,
          reason: "Custom reason",
        })
      );
    });

    it("should use default code and reason if not provided", () => {
      const ws = new MockWebSocket();
      const closeHandler = vi.fn();
      ws.onclose = closeHandler;

      ws.close();

      expect(closeHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 1000,
          reason: "",
        })
      );
    });
  });

  describe("bidirectional communication", () => {
    it("should support bidirectional message exchange", () => {
      const { client, server } = createMockWebSocketPair();

      const clientMessages: string[] = [];
      const serverMessages: string[] = [];

      client.onmessage = event => {
        clientMessages.push(String(event.data));
      };

      server.onmessage = event => {
        serverMessages.push(String(event.data));
      };

      client.send("Hello from client");
      server.send("Hello from server");

      expect(clientMessages).toEqual(["Hello from server"]);
      expect(serverMessages).toEqual(["Hello from client"]);
    });

    it("should handle multiple messages in sequence", () => {
      const { client, server } = createMockWebSocketPair();

      const messages: string[] = [];
      server.onmessage = event => {
        messages.push(String(event.data));
      };

      client.send("Message 1");
      client.send("Message 2");
      client.send("Message 3");

      expect(messages).toEqual(["Message 1", "Message 2", "Message 3"]);
    });
  });
});
