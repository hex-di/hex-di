/**
 * Adapter implementations for the React Showcase Chat Dashboard.
 *
 * This file defines all 6 adapters that implement the port contracts.
 * Each adapter specifies its lifetime, dependencies, and factory function.
 *
 * Demonstrates async factory support with:
 * - ConfigAdapter: Simulates loading config from API
 * - MessageStoreAdapter: Loads/persists messages to localStorage
 *
 * @packageDocumentation
 */

import { createAdapter, createAsyncAdapter } from "@hex-di/graph";
import {
  ConfigPort,
  LoggerPort,
  MessageStorePort,
  UserSessionPort,
  ChatServicePort,
  NotificationServicePort,
} from "./ports.js";
import type {
  Config,
  Message,
  MessageStore,
  MessageListener,
  Unsubscribe,
  UserSession,
  ChatService,
  NotificationService,
} from "../types.js";

// =============================================================================
// Constants
// =============================================================================

/**
 * Storage key for persisted messages in localStorage.
 */
const MESSAGES_STORAGE_KEY = "hex-di-chat-messages";

// =============================================================================
// User Selection State
// =============================================================================

/**
 * Type for supported users in the chat application.
 */
type UserType = "alice" | "bob";

/**
 * Module-level state tracking the currently selected user.
 * Read by UserSessionAdapter factory when creating scoped sessions.
 */
let currentUserSelection: UserType = "alice";

/**
 * Sets the current user selection.
 *
 * Call this BEFORE scope recreation to ensure the new scope gets the correct user.
 * This function should be called when login buttons are clicked, before the
 * React state change that triggers scope recreation.
 *
 * @param user - The user to set as current ("alice" or "bob")
 *
 * @example
 * ```tsx
 * import { setCurrentUserSelection } from "../di/adapters.js";
 *
 * function handleLoginAsBob() {
 *   setCurrentUserSelection("bob");  // Set before state change
 *   setCurrentUser("bob");           // Triggers scope recreation
 * }
 * ```
 */
export function setCurrentUserSelection(user: UserType): void {
  currentUserSelection = user;
}

// =============================================================================
// Instance Counter for NotificationService
// =============================================================================

/**
 * Counter for generating unique instance IDs for NotificationService.
 * Each resolution increments this counter.
 */
let notificationInstanceCounter = 0;

// =============================================================================
// Singleton Adapters
// =============================================================================

/**
 * Adapter for the application configuration service.
 *
 * Simulates loading configuration from an API endpoint.
 * This demonstrates async factory support - the config is loaded
 * asynchronously at container initialization time.
 *
 * @remarks
 * - Lifetime: singleton - one instance for the entire application
 * - Dependencies: none
 * - Async: Simulates API call with delay
 */
export const ConfigAdapter = createAsyncAdapter({
  provides: ConfigPort,
  requires: [],
  lifetime: "singleton",
  factory: async (): Promise<Config> => {
    // Simulate loading config from API
    await new Promise((resolve) => setTimeout(resolve, 100));
    return {
      notificationDuration: 3000,
      maxMessages: 100,
    };
  },
});

/**
 * Adapter for the logging service.
 *
 * Creates a logger that prefixes all messages with "[ChatApp]".
 * This is a singleton with no dependencies.
 *
 * @remarks
 * - Lifetime: singleton - one instance for the entire application
 * - Dependencies: none
 */
export const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({
    log: (message: string): void => {
      console.log(`[ChatApp] ${message}`);
    },
    warn: (message: string): void => {
      console.warn(`[ChatApp] ${message}`);
    },
    error: (message: string): void => {
      console.error(`[ChatApp] ${message}`);
    },
  }),
});

/**
 * Adapter for the message store service.
 *
 * Implements localStorage persistence with async initialization:
 * - Loads message history from localStorage asynchronously on initialization
 * - Persists messages to localStorage on every add
 * - Messages survive page reloads!
 *
 * This demonstrates async factory support - the message store is loaded
 * asynchronously at container initialization time.
 *
 * @remarks
 * - Lifetime: singleton - messages persist for the entire application
 * - Dependencies: LoggerPort - for logging message operations
 * - Async: Simulates async storage access with delay
 */
export const MessageStoreAdapter = createAsyncAdapter({
  provides: MessageStorePort,
  requires: [LoggerPort],
  lifetime: "singleton",
  initPriority: 2, // Initialize after Logger (default is 100)
  factory: async (deps): Promise<MessageStore> => {
    // Simulate async storage access
    await new Promise((resolve) => setTimeout(resolve, 150));

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
        messages = parsed.map((m) => ({
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
      listeners.forEach((listener) => listener(frozenMessages));
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
  },
});

// =============================================================================
// Scoped Adapters
// =============================================================================

/**
 * Adapter for the user session service.
 *
 * Creates a user session for the current scope based on the current
 * user selection. Call `setCurrentUserSelection()` before scope
 * recreation to set which user session should be created.
 *
 * @remarks
 * - Lifetime: scoped - each scope gets its own user session
 * - Dependencies: none
 * - Reads `currentUserSelection` module state at factory time
 */
export const UserSessionAdapter = createAdapter({
  provides: UserSessionPort,
  requires: [],
  lifetime: "scoped",
  factory: (): UserSession => {
    const userData =
      currentUserSelection === "alice"
        ? { id: "alice-001", name: "Alice", avatar: "A" }
        : { id: "bob-002", name: "Bob", avatar: "B" };
    return { user: userData };
  },
});

/**
 * Adapter for the chat service.
 *
 * Sends messages as the current user by combining the user session
 * with the message store. Automatically attaches sender information.
 *
 * @remarks
 * - Lifetime: scoped - tied to the current user session scope
 * - Dependencies: LoggerPort, UserSessionPort, MessageStorePort
 */
export const ChatServiceAdapter = createAdapter({
  provides: ChatServicePort,
  requires: [LoggerPort, UserSessionPort, MessageStorePort],
  lifetime: "scoped",
  factory: (deps): ChatService => {
    const { user } = deps.UserSession;
    deps.Logger.log(`ChatService initialized for user: ${user.name}`);

    return {
      sendMessage: (content: string): void => {
        const message: Message = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          senderId: user.id,
          senderName: user.name,
          content,
          timestamp: new Date(),
        };
        deps.Logger.log(`${user.name} sending message: "${content}"`);
        deps.MessageStore.addMessage(message);
      },
    };
  },
});

// =============================================================================
// Request-Scoped Adapters
// =============================================================================

/**
 * Adapter for the notification service.
 *
 * Creates a new instance with a unique ID each time it is resolved.
 * This demonstrates the request lifetime where every resolution
 * gets a fresh instance.
 *
 * This is a sync adapter that depends on ConfigPort (async).
 * This works because all async adapters are initialized before
 * the container is used, making their instances available synchronously.
 *
 * @remarks
 * - Lifetime: request - new instance for every resolution
 * - Dependencies: LoggerPort, ConfigPort (async - requires container.initialize())
 */
export const NotificationServiceAdapter = createAdapter({
  provides: NotificationServicePort,
  requires: [LoggerPort, ConfigPort],
  lifetime: "request",
  factory: (deps): NotificationService => {
    notificationInstanceCounter += 1;
    const instanceId = notificationInstanceCounter;
    const createdAt = new Date();

    deps.Logger.log(
      `NotificationService instance #${instanceId} created at ${createdAt.toLocaleTimeString()}`
    );

    return {
      instanceId,
      createdAt,
      notify: (message: string): void => {
        deps.Logger.log(
          `[Notification #${instanceId}] ${message} (duration: ${deps.Config.notificationDuration}ms)`
        );
      },
    };
  },
});
