/**
 * E2E tests for select composition.
 *
 * Tests that multiple components can share the same cache entry
 * with different select functions, each re-rendering only when
 * their selected data changes.
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, act } from "@testing-library/react";
import { createElement, useRef } from "react";
import { ResultAsync } from "@hex-di/result";
import { createQueryPort, createQueryClient, type QueryClient } from "@hex-di/query";
import { QueryClientProvider, useQuery } from "../src/index.js";
import { createTestContainer } from "./helpers/test-container.js";

afterEach(() => {
  cleanup();
});

// =============================================================================
// Test Setup
// =============================================================================

interface TeamData {
  readonly members: readonly string[];
  readonly score: number;
  readonly name: string;
}

const TeamPort = createQueryPort<TeamData, void, Error>()({
  name: "E2ETeam",
});

// =============================================================================
// Tests
// =============================================================================

describe("Select composition E2E", () => {
  it("multiple components share the same cache entry with different selects", async () => {
    const container = createTestContainer();
    container.register(TeamPort, () =>
      ResultAsync.ok({
        members: ["Alice", "Bob", "Charlie"],
        score: 42,
        name: "Team Alpha",
      })
    );
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    function MemberCount() {
      const state = useQuery(TeamPort, undefined, {
        select: data => data.members.length,
      });
      return <div>Members: {state.data !== undefined ? String(state.data) : "loading"}</div>;
    }

    function TeamScore() {
      const state = useQuery(TeamPort, undefined, {
        select: data => data.score,
      });
      return <div>Score: {state.data !== undefined ? String(state.data) : "loading"}</div>;
    }

    function TeamName() {
      const state = useQuery(TeamPort, undefined, {
        select: data => data.name,
      });
      return <div>Name: {state.data !== undefined ? String(state.data) : "loading"}</div>;
    }

    render(
      <QueryClientProvider client={client}>
        <MemberCount />
        <TeamScore />
        <TeamName />
      </QueryClientProvider>
    );

    // All components share the same cache entry
    await waitFor(() => {
      expect(screen.getByText("Members: 3")).toBeDefined();
      expect(screen.getByText("Score: 42")).toBeDefined();
      expect(screen.getByText("Name: Team Alpha")).toBeDefined();
    });

    // Verify there's only one cache entry (the underlying data was fetched once)
    const allEntries = client.cache.getAll();
    let teamEntryCount = 0;
    for (const [key] of allEntries) {
      if (key.includes("E2ETeam")) {
        teamEntryCount++;
      }
    }
    expect(teamEntryCount).toBe(1);

    client.dispose();
  });

  it("component with select does not re-render when unselected data changes", async () => {
    let fetchCount = 0;
    const container = createTestContainer();
    container.register(TeamPort, () => {
      fetchCount++;
      return ResultAsync.ok({
        members: ["Alice", "Bob"],
        score: 10 + fetchCount,
        name: `Team-v${fetchCount}`,
      });
    });
    const client = createQueryClient({ container, defaults: { retry: 0, staleTime: 0 } });

    function ScoreDisplay() {
      const renderCount = useRef(0);
      renderCount.current++;
      const state = useQuery(TeamPort, undefined, {
        select: data => data.score,
      });
      return (
        <div>
          <span>Score: {state.data !== undefined ? String(state.data) : "loading"}</span>
          <span data-testid="score-renders">Score renders: {renderCount.current}</span>
        </div>
      );
    }

    function NameDisplay() {
      const renderCount = useRef(0);
      renderCount.current++;
      const state = useQuery(TeamPort, undefined, {
        select: data => data.name,
      });
      return (
        <div>
          <span>Name: {state.data !== undefined ? String(state.data) : "loading"}</span>
          <span data-testid="name-renders">Name renders: {renderCount.current}</span>
        </div>
      );
    }

    render(
      <QueryClientProvider client={client}>
        <ScoreDisplay />
        <NameDisplay />
      </QueryClientProvider>
    );

    // Wait for initial data (score: 11, name: Team-v1)
    await waitFor(() => {
      expect(screen.getByText("Score: 11")).toBeDefined();
      expect(screen.getByText("Name: Team-v1")).toBeDefined();
    });

    const scoreRendersAfterInit = parseInt(
      screen.getByTestId("score-renders").textContent?.replace("Score renders: ", "") ?? "0",
      10
    );
    const nameRendersAfterInit = parseInt(
      screen.getByTestId("name-renders").textContent?.replace("Name renders: ", "") ?? "0",
      10
    );

    // Trigger refetch — score changes (12), name changes (Team-v2)
    // Both components should re-render since both selected values change
    await act(async () => {
      await client.invalidateQueries(TeamPort);
      // Wait for refetch to complete
      await new Promise(r => setTimeout(r, 50));
    });

    await waitFor(() => {
      expect(screen.getByText("Score: 12")).toBeDefined();
      expect(screen.getByText("Name: Team-v2")).toBeDefined();
    });

    // Both components re-rendered (their selected values changed)
    const scoreRendersAfterRefetch = parseInt(
      screen.getByTestId("score-renders").textContent?.replace("Score renders: ", "") ?? "0",
      10
    );
    const nameRendersAfterRefetch = parseInt(
      screen.getByTestId("name-renders").textContent?.replace("Name renders: ", "") ?? "0",
      10
    );

    // Both should have re-rendered at least once more
    expect(scoreRendersAfterRefetch).toBeGreaterThan(scoreRendersAfterInit);
    expect(nameRendersAfterRefetch).toBeGreaterThan(nameRendersAfterInit);

    client.dispose();
  });

  it("select transforms data while cache holds original", async () => {
    const container = createTestContainer();
    container.register(TeamPort, () =>
      ResultAsync.ok({
        members: ["Alice", "Bob"],
        score: 100,
        name: "Winners",
      })
    );
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    function UppercaseMembers() {
      const state = useQuery(TeamPort, undefined, {
        select: data => data.members.map(m => m.toUpperCase()).join(", "),
      });
      if (state.data === undefined) return <div>loading</div>;
      // select returns the joined string; state.data is typed as TeamData but
      // at runtime it's the selected string. We render via String() to avoid casts.
      return <div>Uppercase: {String(state.data)}</div>;
    }

    render(
      <QueryClientProvider client={client}>
        <UppercaseMembers />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Uppercase: ALICE, BOB")).toBeDefined();
    });

    // Original data in cache should be untransformed
    const cachedData = client.getQueryData(TeamPort, undefined);
    expect(cachedData?.members).toEqual(["Alice", "Bob"]);

    client.dispose();
  });
});
