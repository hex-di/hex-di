/**
 * Chat feature type definitions.
 *
 * @packageDocumentation
 */

/**
 * A chat message.
 */
export interface Message {
  readonly id: string;
  readonly senderId: string;
  readonly senderName: string;
  readonly content: string;
  readonly timestamp: Date;
}

/**
 * Listener callback for message updates.
 */
export type MessageListener = (messages: readonly Message[]) => void;

/**
 * Unsubscribe function returned by subscribe.
 */
export type Unsubscribe = () => void;

/**
 * Message store service interface.
 */
export interface MessageStore {
  /** Get all messages */
  getMessages(): readonly Message[];
  /** Add a new message */
  addMessage(message: Message): void;
  /** Subscribe to message updates */
  subscribe(listener: MessageListener): Unsubscribe;
}

/**
 * Chat service interface.
 */
export interface ChatService {
  /** Send a message as the current user */
  sendMessage(content: string): void;
}
