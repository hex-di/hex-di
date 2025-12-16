/**
 * Re-exports all feature types for convenience.
 *
 * @packageDocumentation
 */

// Core feature types
export type { Config, Logger } from "./core/types.js";

// Chat feature types
export type {
  Message,
  MessageListener,
  Unsubscribe,
  MessageStore,
  ChatService,
} from "./chat/types.js";

// User session feature types
export type { User, UserSession, UserType } from "./user-session/types.js";

// Notifications feature types
export type { NotificationService } from "./notifications/types.js";
