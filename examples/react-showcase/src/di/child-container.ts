/**
 * Child container example demonstrating plug-and-play overrides.
 *
 * This module builds a child container that:
 * - Overrides MessageStore to be in-memory only (no localStorage)
 * - Overrides ChatService to tag messages as coming from the plugin space
 *
 * The rest of the graph is inherited from the parent container,
 * showcasing how feature modules can customize behavior without
 * touching the root container.
 */

import type { ChildContainer, Container, ContainerPhase } from "@hex-di/runtime";
import { createAdapter } from "@hex-di/graph";
import type { Message, MessageListener, MessageStore, ChatService } from "../types.js";
import {
  ChatServicePort,
  LoggerPort,
  MessageStorePort,
  UserSessionPort,
  type AppPorts,
} from "./ports.js";
import type { AppAsyncPorts } from "./graph.js";

/**
 * In-memory message store used only inside the child container.
 * Does not touch localStorage so it stays isolated from the root container.
 */
const PluginMessageStoreAdapter = createAdapter({
  provides: MessageStorePort,
  requires: [LoggerPort],
  lifetime: "singleton",
  factory: (deps): MessageStore => {
    const listeners = new Set<MessageListener>();
    const messages: Message[] = [
      {
        id: "plugin-intro",
        senderId: "plugin",
        senderName: "PluginBot",
        content: "Child container active — this chat is isolated from the main store.",
        timestamp: new Date(),
      },
    ];

    const notify = (): void => {
      const snapshot = Object.freeze([...messages]) as readonly Message[];
      listeners.forEach((listener) => listener(snapshot));
    };

    deps.Logger.log("[Plugin] Ephemeral MessageStore initialized");

    return {
      getMessages: (): readonly Message[] => Object.freeze([...messages]),
      addMessage: (message: Message): void => {
        messages.push(message);
        deps.Logger.log(`[Plugin] Message added from ${message.senderName}`);
        notify();
      },
      subscribe: (listener: MessageListener): (() => void) => {
        listeners.add(listener);
        deps.Logger.log("[Plugin] Subscriber added to MessageStore");
        // Emit current messages immediately for convenience
        listener(Object.freeze([...messages]));
        return () => {
          listeners.delete(listener);
          deps.Logger.log("[Plugin] Subscriber removed from MessageStore");
        };
      },
    };
  },
});

/**
 * ChatService override that tags messages to make the child container obvious in the UI.
 */
const PluginChatServiceAdapter = createAdapter({
  provides: ChatServicePort,
  requires: [LoggerPort, UserSessionPort, MessageStorePort],
  lifetime: "scoped",
  factory: (deps): ChatService => {
    const { user } = deps.UserSession;
    deps.Logger.log(`[Plugin] ChatService initialized for ${user.name}`);

    return {
      sendMessage: (content: string): void => {
        const message: Message = {
          id: `plugin-msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          senderId: user.id,
          senderName: `${user.name} • Plugin`,
          content: `🔌 ${content} (child container)`,
          timestamp: new Date(),
        };
        deps.Logger.log(`[Plugin] ${user.name} sending message: "${content}"`);
        deps.MessageStore.addMessage(message);
      },
    };
  },
});

/**
 * Builds the child container used in the React showcase.
 *
 * @param parent - The root/tracing container created from the app graph
 */
export function createPluginChildContainer(
  parent: Container<AppPorts, AppAsyncPorts, ContainerPhase>
): ChildContainer<AppPorts, never, AppAsyncPorts> {
  return parent
    .createChild()
    .override(PluginMessageStoreAdapter)
    .override(PluginChatServiceAdapter)
    .build();
}
