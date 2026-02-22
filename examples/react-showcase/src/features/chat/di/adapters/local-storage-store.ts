/**
 * LocalStorage message store adapter implementation.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import { ResultAsync } from "@hex-di/result";
import { MessageStorePort } from "../ports.js";
import { LoggerPort } from "../../../core/di/ports.js";
import type { Message, MessageListener, Unsubscribe } from "../../types.js";

/**
 * Storage key for persisted messages in localStorage.
 */
const MESSAGES_STORAGE_KEY = "hex-di-chat-messages";

/**
 * LocalStorage-based message store adapter.
 *
 * Variant: "localStorage"
 * Use case: Development, offline-capable apps
 *
 * Implements localStorage persistence with async initialization:
 * - Loads message history from localStorage asynchronously on initialization
 * - Persists messages to localStorage on every add
 * - Messages survive page reloads!
 *
 * @remarks
 * - Lifetime: singleton (async adapters are always singletons)
 * - Dependencies: LoggerPort - for logging message operations
 * - Async: Simulates async storage access with delay
 */
export const LocalStorageMessageStoreAdapter = createAdapter({
  provides: MessageStorePort,
  requires: [LoggerPort],
  // No lifetime - async adapters are always singletons
  // Initialization order is automatic via topological sort based on dependencies
  factory: deps =>
    ResultAsync.fromSafePromise(new Promise<void>(resolve => setTimeout(resolve, 150))).map(() => {
      // Load persisted messages from localStorage
      let messages: Message[] = [];
      try {
        const stored = localStorage.getItem(MESSAGES_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Array<{
            id: string;
            senderId: string;
            senderName: string;
            content: string;
            timestamp: string;
          }>;
          // Convert timestamp strings back to Date objects
          messages = parsed.map(m => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }));
          deps.Logger.log(`Loaded ${messages.length} messages from storage`);
        }
      } catch (e) {
        deps.Logger.warn("Failed to load messages from storage, starting fresh");
      }

      const listeners = new Set<MessageListener>();

      const notifyListeners = (): void => {
        const frozenMessages = Object.freeze([...messages]) as readonly Message[];
        listeners.forEach(listener => listener(frozenMessages));
      };

      const persistMessages = (): void => {
        try {
          localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(messages));
        } catch (e) {
          deps.Logger.warn("Failed to persist messages to storage");
        }
      };

      deps.Logger.log("MessageStore initialized with localStorage persistence (async)");

      return {
        getMessages: (): readonly Message[] => {
          return Object.freeze([...messages]) as readonly Message[];
        },
        addMessage: (message: Message): void => {
          messages.push(message);
          deps.Logger.log(`Message added from ${message.senderName}`);
          persistMessages();
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
    }),
});
