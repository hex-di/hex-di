/**
 * In-memory message store adapter implementation.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import { MessageStorePort } from "../ports.js";
import { LoggerPort } from "../../../core/di/ports.js";
import type { Message, MessageStore, MessageListener, Unsubscribe } from "../../types.js";

/**
 * In-memory message store adapter.
 *
 * Variant: "memory"
 * Use case: Tests, ephemeral sessions
 *
 * Messages are stored only in memory - no persistence.
 * Useful for:
 * - Fast unit tests without localStorage side effects
 * - Temporary/demo sessions
 *
 * @remarks
 * - Lifetime: singleton - one instance for the application
 * - Dependencies: LoggerPort - for logging message operations
 * - Sync: No async initialization needed
 */
export const InMemoryMessageStoreAdapter = createAdapter({
  provides: MessageStorePort,
  requires: [LoggerPort],
  lifetime: "singleton",
  factory: (deps): MessageStore => {
    let messages: Message[] = [];
    const listeners = new Set<MessageListener>();

    const notifyListeners = (): void => {
      const frozenMessages = Object.freeze([...messages]) as readonly Message[];
      listeners.forEach(listener => listener(frozenMessages));
    };

    deps.Logger.log("MessageStore initialized with in-memory storage (no persistence)");

    return {
      getMessages: (): readonly Message[] => {
        return Object.freeze([...messages]) as readonly Message[];
      },
      addMessage: (message: Message): void => {
        messages.push(message);
        deps.Logger.log(`Message added from ${message.senderName}`);
        notifyListeners();
      },
      subscribe: (listener: MessageListener): Unsubscribe => {
        listeners.add(listener);
        deps.Logger.log("New subscriber added to MessageStore");
        return () => {
          listeners.delete(listener);
          deps.Logger.log("Subscriber removed from MessageStore");
        };
      },
    };
  },
});
