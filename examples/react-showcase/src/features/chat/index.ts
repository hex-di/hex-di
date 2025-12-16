/**
 * Chat feature public API.
 *
 * @packageDocumentation
 */

// Types
export type {
  Message,
  MessageListener,
  Unsubscribe,
  MessageStore,
  ChatService,
} from "./types.js";

// Ports
export { MessageStorePort, ChatServicePort, type ChatPorts } from "./di/ports.js";

// Adapters
export {
  LocalStorageMessageStoreAdapter,
  InMemoryMessageStoreAdapter,
  ChatServiceAdapter,
  getMessageStoreAdapter,
  messageStoreAdapters,
} from "./di/adapters/index.js";

// Feature bundle
export { chatFeature, createChatFeature } from "./di/bundle.js";
