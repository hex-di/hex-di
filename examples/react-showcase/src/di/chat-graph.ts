/**
 * Chat Dashboard dependency graph fragment.
 *
 * This graph fragment contains services specific to the Chat Dashboard feature.
 * It's designed to be used as a child of the root graph, inheriting shared
 * infrastructure services (Logger, Config) from the parent.
 *
 * Chat-specific services:
 * - MessageStore: localStorage-persisted message history (singleton)
 * - UserSession: Current user context (scoped)
 * - ChatService: Message sending with user identity (scoped)
 * - NotificationService: Toast notifications (transient)
 *
 * @packageDocumentation
 */

import { GraphBuilder, type Graph } from "@hex-di/graph";
import {
  MessageStoreAdapter,
  UserSessionAdapter,
  ChatServiceAdapter,
  NotificationServiceAdapter,
} from "./adapters.js";

// =============================================================================
// Chat Graph Fragment
// =============================================================================

/**
 * Graph fragment for the Chat Dashboard feature.
 *
 * This fragment extends the root graph with chat-specific services.
 * Dependencies on LoggerPort and ConfigPort are satisfied by the root graph.
 *
 * Contains:
 * 1. MessageStoreAdapter (singleton) - localStorage message persistence
 * 2. UserSessionAdapter (scoped) - Current user context
 * 3. ChatServiceAdapter (scoped) - Message sending
 * 4. NotificationServiceAdapter (transient) - Toast notifications
 *
 * @example Creating a chat child container
 * ```typescript
 * import { chatGraphFragment } from "./di/chat-graph";
 *
 * // rootContainer already has Logger and Config
 * const chatContainer = rootContainer.createChild(chatGraphFragment);
 * ```
 */
export const chatGraphFragment = GraphBuilder.create()
  .provide(MessageStoreAdapter) // Singleton - localStorage persistence
  .provide(UserSessionAdapter) // Scoped - per-user session
  .provide(ChatServiceAdapter) // Scoped - depends on UserSession
  .provide(NotificationServiceAdapter) // Transient - unique per resolution
  .buildFragment();

/**
 * Type representing ports provided by the chat graph fragment.
 */
export type ChatPorts = typeof chatGraphFragment extends Graph<infer P, infer _A> ? P : never;

/**
 * Type representing async ports in the chat graph fragment.
 */
export type ChatAsyncPorts = typeof chatGraphFragment extends Graph<infer _P, infer A> ? A : never;
