/**
 * E2E tests for dependent query patterns in React.
 *
 * Tests that queries with dependencies properly show loading chains
 * and resolve in order using conditional rendering (mount child
 * component only after parent data is available).
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { ResultAsync } from "@hex-di/result";
import { createQueryPort, createQueryClient, type QueryClient } from "@hex-di/query";
import { QueryClientProvider, useQuery } from "../src/index.js";
import { createTestContainer } from "./helpers/test-container.js";

afterEach(() => {
  cleanup();
});

// =============================================================================
// Test Ports
// =============================================================================

const UserIdPort = createQueryPort<string, void, Error>()({
  name: "E2EDepUserId",
});

const UserProfilePort = createQueryPort<
  { name: string; email: string },
  { userId: string },
  Error
>()({
  name: "E2EDepUserProfile",
});

// =============================================================================
// Tests
// =============================================================================

describe("Dependent queries E2E", () => {
  it("dependent query waits for parent to resolve", async () => {
    const container = createTestContainer();
    container.register(UserIdPort, () =>
      ResultAsync.fromSafePromise(
        new Promise<string>(resolve => setTimeout(() => resolve("user-123"), 50))
      )
    );
    container.register(UserProfilePort, (params: { userId: string }) =>
      ResultAsync.ok({
        name: `Profile-${params.userId}`,
        email: `${params.userId}@test.com`,
      })
    );
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    // Child component only mounts when userId is available
    function ProfileDisplay({ userId }: { userId: string }) {
      const profileQuery = useQuery(UserProfilePort, { userId });
      if (profileQuery.data === undefined) return <div>Loading profile...</div>;
      return (
        <div>
          <span>Name: {profileQuery.data.name}</span>
          <span>Email: {profileQuery.data.email}</span>
        </div>
      );
    }

    function UserProfile() {
      const userIdQuery = useQuery(UserIdPort, undefined);

      if (userIdQuery.isPending) return <div>Loading user ID...</div>;
      if (userIdQuery.data === undefined) return <div>No user ID</div>;

      return <ProfileDisplay userId={userIdQuery.data} />;
    }

    render(
      <QueryClientProvider client={client}>
        <UserProfile />
      </QueryClientProvider>
    );

    // Initially loading user ID
    expect(screen.getByText("Loading user ID...")).toBeDefined();

    // Eventually shows profile data
    await waitFor(
      () => {
        expect(screen.getByText("Name: Profile-user-123")).toBeDefined();
        expect(screen.getByText("Email: user-123@test.com")).toBeDefined();
      },
      { timeout: 3000 }
    );

    client.dispose();
  });

  it("dependent query shows loading chain: parent pending → child pending → both success", async () => {
    const container = createTestContainer();
    container.register(UserIdPort, () =>
      ResultAsync.fromSafePromise(
        new Promise<string>(resolve => setTimeout(() => resolve("user-456"), 100))
      )
    );
    container.register(UserProfilePort, (params: { userId: string }) =>
      ResultAsync.fromSafePromise(
        new Promise<{ name: string; email: string }>(resolve =>
          setTimeout(() => resolve({ name: params.userId, email: "test@test.com" }), 50)
        )
      )
    );
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    function ProfileSection({ userId }: { userId: string }) {
      const profileQuery = useQuery(UserProfilePort, { userId });
      return (
        <div>
          <span>Child: {profileQuery.status}</span>
          {profileQuery.data !== undefined && <span>Profile: {profileQuery.data.name}</span>}
        </div>
      );
    }

    function DependentDisplay() {
      const parentQuery = useQuery(UserIdPort, undefined);

      return (
        <div>
          <span>Parent: {parentQuery.status}</span>
          {parentQuery.data !== undefined ? (
            <ProfileSection userId={parentQuery.data} />
          ) : (
            <span>Child: pending</span>
          )}
        </div>
      );
    }

    render(
      <QueryClientProvider client={client}>
        <DependentDisplay />
      </QueryClientProvider>
    );

    // Parent is pending, child is not mounted yet (shows pending)
    expect(screen.getByText("Parent: pending")).toBeDefined();
    expect(screen.getByText("Child: pending")).toBeDefined();

    // After parent resolves, child mounts and fetches
    await waitFor(
      () => {
        expect(screen.getByText("Parent: success")).toBeDefined();
        expect(screen.getByText("Profile: user-456")).toBeDefined();
      },
      { timeout: 3000 }
    );

    client.dispose();
  });
});
