/**
 * User Switching Tests - TDD test to verify messages are sent as the logged-in user.
 *
 * This test exposes the bug where UserSessionAdapter is hardcoded to return Alice,
 * causing messages to always be sent as Alice even when logged in as Bob.
 *
 * @packageDocumentation
 */

import {
  describe,
  it,
  expect,
  vi,
  screen,
  fireEvent,
  waitFor,
  render,
  TestGraphBuilder,
  createMockAdapter,
  beforeEach,
} from "./setup.js";
import { createContainer } from "@hex-di/runtime";
import { appGraph } from "../src/di/graph.js";
import {
  MessageStorePort,
  UserSessionPort,
  LoggerPort,
  ConfigPort,
  NotificationServicePort,
} from "../src/di/ports.js";
import { AsyncContainerProvider } from "../src/di/hooks.js";
import { setCurrentUserSelection } from "../src/di/adapters.js";
import type { Message, MessageListener, Unsubscribe } from "../src/types.js";
import { ChatRoom } from "../src/components/ChatRoom.js";

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Creates a mock message store that records all messages for inspection.
 */
function createInspectableMessageStore() {
  const messages: Message[] = [];
  const listeners = new Set<MessageListener>();

  return {
    messages,
    listeners,
    store: {
      getMessages: vi.fn(() => Object.freeze([...messages]) as readonly Message[]),
      addMessage: vi.fn((msg: Message) => {
        messages.push(msg);
        const frozen = Object.freeze([...messages]) as readonly Message[];
        listeners.forEach((listener) => listener(frozen));
      }),
      subscribe: vi.fn((listener: MessageListener): Unsubscribe => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      }),
    },
  };
}

// =============================================================================
// User Switching Tests
// =============================================================================

describe("User Switching", () => {
  // Reset user selection to alice before each test
  beforeEach(() => {
    setCurrentUserSelection("alice");
  });

  /**
   * Simple test to verify the module state mechanism works.
   * Creates a fresh container for each user selection and verifies
   * the UserSession is correctly created.
   */
  it("setCurrentUserSelection changes which user is created in new scopes", () => {
    const mockLogger = createMockAdapter(LoggerPort, {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    });

    const mockConfig = createMockAdapter(ConfigPort, {
      notificationDuration: 3000,
      maxMessages: 100,
    });

    // Test 1: Default is Alice
    setCurrentUserSelection("alice");
    const aliceGraph = TestGraphBuilder.from(appGraph)
      .override(mockLogger)
      .override(mockConfig)
      .build();
    const aliceContainer = createContainer(aliceGraph);
    const aliceScope = aliceContainer.createScope();
    const aliceSession = aliceScope.resolve(UserSessionPort);
    expect(aliceSession.user.name).toBe("Alice");
    void aliceScope.dispose();
    void aliceContainer.dispose();

    // Test 2: Switch to Bob
    setCurrentUserSelection("bob");
    const bobGraph = TestGraphBuilder.from(appGraph)
      .override(mockLogger)
      .override(mockConfig)
      .build();
    const bobContainer = createContainer(bobGraph);
    const bobScope = bobContainer.createScope();
    const bobSession = bobScope.resolve(UserSessionPort);
    expect(bobSession.user.name).toBe("Bob");
    void bobScope.dispose();
    void bobContainer.dispose();
  });

  /**
   * This test verifies that when a user switches from Alice to Bob,
   * subsequent messages are sent as Bob, not Alice.
   *
   * Uses AsyncContainerProvider to properly initialize all async adapters
   * before React components render. The real ChatServiceAdapter runs and
   * correctly captures the UserSession from each scope.
   */
  it("should send messages as the currently logged-in user", async () => {
    // Create an inspectable message store to verify sender names
    const mockMessageStore = createInspectableMessageStore();
    const mockMessageStoreAdapter = createMockAdapter(
      MessageStorePort,
      mockMessageStore.store
    );

    // Use silent logger for tests
    const mockLogger = createMockAdapter(LoggerPort, {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    });

    const mockConfig = createMockAdapter(ConfigPort, {
      notificationDuration: 3000,
      maxMessages: 100,
    });

    const mockNotificationService = createMockAdapter(NotificationServicePort, {
      instanceId: 1,
      createdAt: new Date(),
      notify: vi.fn(),
    });

    // Build test graph - use real ChatServiceAdapter to test user switching
    // With AsyncContainerProvider, all async adapters are initialized before render
    const testGraph = TestGraphBuilder.from(appGraph)
      .override(mockMessageStoreAdapter)
      .override(mockLogger)
      .override(mockConfig)
      .override(mockNotificationService)
      .build();

    const container = createContainer(testGraph);

    render(
      <AsyncContainerProvider
        container={container}
        loadingFallback={<div data-testid="loading">Initializing...</div>}
      >
        <ChatRoom />
      </AsyncContainerProvider>
    );

    // Wait for async container initialization to complete
    await waitFor(
      () => {
        expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // =========================================================================
    // Step 1: Send message as Alice (default user)
    // =========================================================================
    const input = screen.getByPlaceholderText(/type a message/i);
    const sendButton = screen.getByRole("button", { name: /send message/i });

    fireEvent.change(input, { target: { value: "Hello from Alice" } });
    fireEvent.click(sendButton);

    // Wait for message to appear
    await waitFor(() => {
      expect(screen.getByText("Hello from Alice")).toBeInTheDocument();
    });

    // Verify first message is from Alice
    expect(mockMessageStore.messages).toHaveLength(1);
    const firstMessage = mockMessageStore.messages[0];
    expect(firstMessage).toBeDefined();
    expect(firstMessage!.senderName).toBe("Alice");

    // =========================================================================
    // Step 2: Switch to Bob
    // =========================================================================
    const bobButton = screen.getByRole("button", { name: /login as bob/i });
    fireEvent.click(bobButton);

    // Wait for Bob button to become active
    await waitFor(() => {
      expect(bobButton).toHaveClass("bg-blue-500");
    });

    // =========================================================================
    // Step 3: Send message as Bob
    // =========================================================================
    const inputAfterSwitch = screen.getByPlaceholderText(/type a message/i);
    fireEvent.change(inputAfterSwitch, { target: { value: "Hello from Bob" } });

    const sendButtonAfterSwitch = screen.getByRole("button", { name: /send message/i });
    fireEvent.click(sendButtonAfterSwitch);

    // Wait for message to appear
    await waitFor(() => {
      expect(screen.getByText("Hello from Bob")).toBeInTheDocument();
    });

    // =========================================================================
    // ASSERTION: Second message should be from Bob
    // This will FAIL with the bug - message is sent as Alice instead
    // =========================================================================
    expect(mockMessageStore.messages).toHaveLength(2);
    const secondMessage = mockMessageStore.messages[1];
    expect(secondMessage).toBeDefined();
    expect(secondMessage!.senderName).toBe("Bob");
  });
});
