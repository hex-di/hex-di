/**
 * ChatRoom component demonstrates AutoScopeProvider lifecycle.
 *
 * Wraps children in AutoScopeProvider to create isolated scopes for
 * each user session. User switch buttons trigger scope recreation.
 *
 * @packageDocumentation
 */

import { useState } from "react";
import { AutoScopeProvider } from "../di/hooks.js";
import { setCurrentUserSelection } from "../di/adapters.js";
import { UserInfo } from "./UserInfo.js";
import { MessageList } from "./MessageList.js";
import { MessageInput } from "./MessageInput.js";
import { NotificationButton } from "./NotificationButton.js";

// =============================================================================
// Types
// =============================================================================

type UserType = "alice" | "bob";

/**
 * Props for the ChatRoom component.
 */
interface ChatRoomProps {
  /**
   * Optional prefix for the scope name to distinguish ChatRooms across containers.
   * When provided, scope names will be formatted as "{scopePrefix}-{user}-session".
   */
  readonly scopePrefix?: string;
}

// =============================================================================
// ChatRoom Component
// =============================================================================

/**
 * Main chat room container with AutoScopeProvider for scope lifecycle.
 *
 * Features:
 * - AutoScopeProvider wraps children for isolated scopes
 * - User switch buttons trigger scope recreation via key change
 * - Composes UserInfo, MessageList, MessageInput, NotificationButton
 *
 * @example
 * ```tsx
 * import { ChatRoom } from "./components/ChatRoom";
 *
 * function App() {
 *   return (
 *     <ContainerProvider container={container}>
 *       <ChatRoom />
 *     </ContainerProvider>
 *   );
 * }
 * ```
 */
export function ChatRoom({ scopePrefix }: ChatRoomProps) {
  // Track current user - changing this changes scopeName which triggers scope recreation
  const [currentUser, setCurrentUser] = useState<UserType>("alice");

  // Scope name includes user - changing name triggers scope recreation in AutoScopeProvider
  const scopeName = scopePrefix
    ? `${scopePrefix}-${currentUser}-session`
    : `${currentUser}-session`;

  return (
    <div className="mx-auto max-w-2xl rounded-xl bg-white shadow-lg">
      {/* Header with user switch buttons */}
      <div className="flex items-center justify-between border-b border-gray-200 p-4">
        <h1 className="text-lg font-semibold text-gray-800">Chat Dashboard</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setCurrentUserSelection("alice");
              setCurrentUser("alice");
            }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              currentUser === "alice"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Login as Alice
          </button>
          <button
            type="button"
            onClick={() => {
              setCurrentUserSelection("bob");
              setCurrentUser("bob");
            }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              currentUser === "bob"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Login as Bob
          </button>
        </div>
      </div>

      {/* AutoScopeProvider creates scope from closest container - name changes trigger scope recreation */}
      <AutoScopeProvider name={scopeName}>
        {/* User info section */}
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <UserInfo />
            <NotificationButton />
          </div>
        </div>

        {/* Messages area */}
        <div className="h-80 overflow-y-auto bg-gray-50">
          <MessageList />
        </div>

        {/* Input footer */}
        <div className="border-t border-gray-200 p-4">
          <MessageInput />
        </div>
      </AutoScopeProvider>
    </div>
  );
}
