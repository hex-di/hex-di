import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ResultAsync } from "@hex-di/result";
import { createQueryPort, createQueryClient, type QueryClient } from "@hex-di/query";
import { QueryClientProvider, useQueryClient } from "../src/index.js";
import { createTestContainer } from "./helpers/test-container.js";

afterEach(() => {
  cleanup();
});

// =============================================================================
// Helpers
// =============================================================================

const DummyPort = createQueryPort<string[], unknown>()({ name: "DummyPort" });

function createClient(): QueryClient {
  const container = createTestContainer();
  container.register(DummyPort, () => ResultAsync.ok(["data"]));
  return createQueryClient({ container, defaults: { retry: 0 } });
}

// =============================================================================
// useQueryClient
// =============================================================================

describe("useQueryClient", () => {
  it("returns the provided QueryClient instance", () => {
    const client = createClient();
    let capturedClient: QueryClient | undefined;

    function TestComponent() {
      capturedClient = useQueryClient();
      return <div>test</div>;
    }

    render(
      <QueryClientProvider client={client}>
        <TestComponent />
      </QueryClientProvider>
    );

    expect(capturedClient).toBe(client);
    client.dispose();
  });

  it("throws when used outside QueryClientProvider", () => {
    function TestComponent() {
      useQueryClient();
      return <div>test</div>;
    }

    expect(() => {
      render(<TestComponent />);
    }).toThrow("useQueryClient must be used within a QueryClientProvider");
  });

  it("provides same client to deeply nested components", () => {
    const client = createClient();
    let innerClient: QueryClient | undefined;

    function Inner() {
      innerClient = useQueryClient();
      return <div>inner</div>;
    }

    function Middle({ children }: { children: React.ReactNode }) {
      return <div>{children}</div>;
    }

    render(
      <QueryClientProvider client={client}>
        <Middle>
          <Middle>
            <Inner />
          </Middle>
        </Middle>
      </QueryClientProvider>
    );

    expect(innerClient).toBe(client);
    client.dispose();
  });

  it("closest provider wins when nested", () => {
    const outerClient = createClient();
    const innerClient = createClient();
    let capturedClient: QueryClient | undefined;

    function TestComponent() {
      capturedClient = useQueryClient();
      return <div>test</div>;
    }

    render(
      <QueryClientProvider client={outerClient}>
        <QueryClientProvider client={innerClient}>
          <TestComponent />
        </QueryClientProvider>
      </QueryClientProvider>
    );

    expect(capturedClient).toBe(innerClient);
    outerClient.dispose();
    innerClient.dispose();
  });
});
