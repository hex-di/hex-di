/**
 * Chat service adapter implementation.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/graph";
import { ChatServicePort, MessageStorePort } from "../ports.js";
import { LoggerPort } from "../../../core/di/ports.js";
import { UserSessionPort } from "../../../user-session/di/ports.js";
import type { Message, ChatService } from "../../types.js";

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
