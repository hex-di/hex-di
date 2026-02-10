import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ResultAsync } from "@hex-di/result";
import { createQueryPort, createQueryClient, type QueryClient } from "@hex-di/query";
import { QueryClientProvider } from "../src/index.js";
import { createTestContainer } from "./helpers/test-container.js";

afterEach(() => {
  cleanup();
});

// =============================================================================
// Helpers
// =============================================================================

const DummyPort = createQueryPort<string[], unknown>()({ name: "ProviderDummy" });

function createClient(): QueryClient {
  const container = createTestContainer();
  container.register(DummyPort, () => ResultAsync.ok(["data"]));
  return createQueryClient({ container, defaults: { retry: 0 } });
}

// =============================================================================
// QueryClientProvider
// =============================================================================

describe("QueryClientProvider", () => {
  it("renders children without modifications", () => {
    const client = createClient();

    render(
      <QueryClientProvider client={client}>
        <div data-testid="child">Hello World</div>
      </QueryClientProvider>
    );

    expect(screen.getByTestId("child").textContent).toBe("Hello World");
    client.dispose();
  });

  it("renders multiple children", () => {
    const client = createClient();

    render(
      <QueryClientProvider client={client}>
        <span>First</span>
        <span>Second</span>
        <span>Third</span>
      </QueryClientProvider>
    );

    expect(screen.getByText("First")).toBeDefined();
    expect(screen.getByText("Second")).toBeDefined();
    expect(screen.getByText("Third")).toBeDefined();
    client.dispose();
  });

  it("supports nested providers with different clients", () => {
    const client1 = createClient();
    const client2 = createClient();

    render(
      <QueryClientProvider client={client1}>
        <div>Outer</div>
        <QueryClientProvider client={client2}>
          <div>Inner</div>
        </QueryClientProvider>
      </QueryClientProvider>
    );

    expect(screen.getByText("Outer")).toBeDefined();
    expect(screen.getByText("Inner")).toBeDefined();

    client1.dispose();
    client2.dispose();
  });
});
