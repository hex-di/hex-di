/**
 * User session feature type definitions.
 *
 * @packageDocumentation
 */

/**
 * User information.
 */
export interface User {
  readonly id: string;
  readonly name: string;
  readonly avatar: string;
}

/**
 * User session service interface.
 */
export interface UserSession {
  readonly user: User;
}

/**
 * Supported user types in the chat application.
 */
export type UserType = "alice" | "bob";
