/**
 * Chat feature adapter exports.
 *
 * This module provides profile-aware adapter selection.
 *
 * @packageDocumentation
 */

import { loadAdapterConfig } from "../../../../profiles/index.js";
import { LocalStorageMessageStoreAdapter } from "./local-storage-store.js";
import { InMemoryMessageStoreAdapter } from "./in-memory-store.js";

// Re-export all adapter variants for direct access
export { LocalStorageMessageStoreAdapter } from "./local-storage-store.js";
export { InMemoryMessageStoreAdapter } from "./in-memory-store.js";
export { ChatServiceAdapter } from "./chat-service.js";

/**
 * Message store adapter registry mapping variant names to implementations.
 */
export const messageStoreAdapters = {
  localStorage: LocalStorageMessageStoreAdapter,
  memory: InMemoryMessageStoreAdapter,
} as const;

/**
 * Gets the message store adapter based on current configuration.
 *
 * @returns The message store adapter for the current profile
 */
export function getMessageStoreAdapter() {
  const config = loadAdapterConfig();
  return messageStoreAdapters[config.messageStore];
}

/**
 * Checks if the message store adapter is async.
 */
export function isMessageStoreAsync(): boolean {
  const adapter = getMessageStoreAdapter();
  return adapter.factoryKind === "async";
}
