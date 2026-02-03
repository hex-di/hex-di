/**
 * Chat feature port definitions.
 *
 * @packageDocumentation
 */

import { port } from "@hex-di/core";
import type { MessageStore, ChatService } from "../types.js";

/**
 * Port for the message store service.
 *
 * Provides message persistence and subscription.
 * Uses async factory for localStorage initialization.
 */
export const MessageStorePort = port<MessageStore>()({ name: "MessageStore" });

/**
 * Port for the chat service.
 *
 * Provides message sending functionality tied to current user session.
 */
export const ChatServicePort = port<ChatService>()({ name: "ChatService" });

/**
 * Union of all ports in the chat feature.
 */
export type ChatPorts = typeof MessageStorePort | typeof ChatServicePort;
