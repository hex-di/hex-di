/**
 * Chat feature bundle definition.
 *
 * @packageDocumentation
 */

import { createFeature } from "../../../plugins/types.js";
import { LoggerPort } from "../../core/di/ports.js";
import { UserSessionPort } from "../../user-session/di/ports.js";
import {
  ChatServiceAdapter,
  getMessageStoreAdapter,
  isMessageStoreAsync,
} from "./adapters/index.js";

/**
 * Chat feature bundle.
 *
 * Provides: MessageStorePort, ChatServicePort
 * Requires: LoggerPort, UserSessionPort
 *
 * This feature provides real-time chat messaging with:
 * - Persistent message storage (localStorage or in-memory)
 * - User-scoped chat service for sending messages
 *
 * The message store variant is selected based on the active profile.
 *
 * @example
 * ```typescript
 * const graph = withFeature(
 *   withFeature(GraphBuilder.create(), coreFeature),
 *   chatFeature
 * ).build();
 * ```
 */
export function createChatFeature() {
  const messageStoreAdapter = getMessageStoreAdapter();
  const isAsync = isMessageStoreAsync();

  return createFeature({
    name: "chat",
    description: "Real-time chat messaging with persistence",
    adapters: isAsync ? [ChatServiceAdapter] : [ChatServiceAdapter, messageStoreAdapter as any],
    asyncAdapters: isAsync ? [messageStoreAdapter as any] : [],
    requires: [LoggerPort, UserSessionPort],
  });
}

/**
 * Chat feature bundle with default configuration.
 */
export const chatFeature = createChatFeature();
