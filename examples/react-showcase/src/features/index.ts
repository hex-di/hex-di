/**
 * Features module - re-exports all feature bundles and ports.
 *
 * @packageDocumentation
 */

// Core feature
export {
  coreFeature,
  ConfigPort,
  LoggerPort,
  ConfigAdapter,
  ConsoleLoggerAdapter,
  SilentLoggerAdapter,
  type CorePorts,
} from "./core/index.js";

// User session feature
export {
  userSessionFeature,
  UserSessionPort,
  ModuleStateUserSessionAdapter,
  setCurrentUserSelection,
  getCurrentUserSelection,
  type UserSessionPorts,
} from "./user-session/index.js";

// Chat feature
export {
  chatFeature,
  createChatFeature,
  MessageStorePort,
  ChatServicePort,
  LocalStorageMessageStoreAdapter,
  InMemoryMessageStoreAdapter,
  ChatServiceAdapter,
  type ChatPorts,
} from "./chat/index.js";

// Notifications feature
export {
  notificationFeature,
  NotificationServicePort,
  NotificationServiceAdapter,
  type NotificationsPorts,
} from "./notifications/index.js";

// Types
export type * from "./types.js";
