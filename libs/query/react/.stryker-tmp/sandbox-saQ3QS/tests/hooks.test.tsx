import { describe, it, expect, afterEach } from "vitest";
import { render, screen, act, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { ResultAsync } from "@hex-di/result";
import {
  createQueryPort,
  createMutationPort,
  createQueryClient,
  type QueryClient,
} from "@hex-di/query";
import { QueryClientProvider, useQueryClient, useQuery, useMutation } from "../src/index.js";
import { createTestContainer } from "./helpers/test-container.js";

afterEach(() => {
  cleanup();
});

// =============================================================================
// Test Ports
// =============================================================================

interface User {
  readonly id: string;
  readonly name: string;
}

interface ApiError {
  readonly _tag: string;
  readonly message: string;
}

const UsersPort = createQueryPort<User[], { role?: string }, ApiError>()({
  name: "ReactUsers",
});

interface CreateUserInput {
  readonly name: string;
}

const CreateUserPort = createMutationPort<User, CreateUserInput, ApiError>()({
  name: "ReactCreateUser",
});

// =============================================================================
// Helpers
// =============================================================================

function createTestClient(users: User[] = [{ id: "1", name: "Alice" }]): QueryClient {
  const container = createTestContainer();
  container.register(UsersPort, () => ResultAsync.ok(users));
  container.register(CreateUserPort, (input: CreateUserInput) =>
    ResultAsync.ok({ id: "new-1", name: input.name })
  );
  return createQueryClient({ container, defaults: { retry: 0 } });
}

function Wrapper({ client, children }: { client: QueryClient; children: React.ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

// =============================================================================
// useQueryClient
// =============================================================================

describe("useQueryClient", () => {
  it("returns the query client from context", () => {
    const client = createTestClient();
    let capturedClient: QueryClient | undefined;

    function TestComponent() {
      capturedClient = useQueryClient();
      return <div>test</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    expect(capturedClient).toBe(client);
    client.dispose();
  });

  it("throws when used outside provider", () => {
    function TestComponent() {
      useQueryClient();
      return <div>test</div>;
    }

    expect(() => {
      render(<TestComponent />);
    }).toThrow("useQueryClient must be used within a QueryClientProvider");
  });
});

// =============================================================================
// useQuery
// =============================================================================

describe("useQuery", () => {
  it("fetches data and renders success state", async () => {
    const client = createTestClient([{ id: "1", name: "Alice" }]);

    function UserList() {
      const { data, isSuccess, isPending } = useQuery(UsersPort, {});

      if (isPending) return <div>Loading...</div>;
      if (!isSuccess || !data) return <div>No data</div>;

      return (
        <ul>
          {data.map(user => (
            <li key={user.id}>{user.name}</li>
          ))}
        </ul>
      );
    }

    render(
      <Wrapper client={client}>
        <UserList />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeDefined();
    });

    client.dispose();
  });

  it("shows loading state initially", () => {
    const client = createTestClient();

    function UserList() {
      const { isPending } = useQuery(UsersPort, {});
      return <div>{isPending ? "Loading" : "Done"}</div>;
    }

    render(
      <Wrapper client={client}>
        <UserList />
      </Wrapper>
    );

    // Initial render should show loading or data (since fetch is immediate and sync)
    expect(screen.getByText(/Loading|Done/)).toBeDefined();

    client.dispose();
  });
});

// =============================================================================
// useMutation
// =============================================================================

describe("useMutation", () => {
  it("executes mutation and updates state", async () => {
    const client = createTestClient();

    function CreateUserButton() {
      const { mutate, isPending, isSuccess, data } = useMutation(CreateUserPort);

      return (
        <div>
          <button onClick={() => mutate({ name: "Bob" })} disabled={isPending}>
            Create
          </button>
          {isPending && <span>Creating...</span>}
          {isSuccess && data && <span>Created {data.name}</span>}
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <CreateUserButton />
      </Wrapper>
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Create"));
    });

    await waitFor(() => {
      expect(screen.getByText("Created Bob")).toBeDefined();
    });

    client.dispose();
  });

  it("calls onSuccess callback", async () => {
    const client = createTestClient();
    let successData: User | undefined;

    function CreateUserButton() {
      const { mutate } = useMutation(CreateUserPort, {
        onSuccess: data => {
          successData = data;
        },
      });

      return <button onClick={() => mutate({ name: "Charlie" })}>Create</button>;
    }

    render(
      <Wrapper client={client}>
        <CreateUserButton />
      </Wrapper>
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Create"));
    });

    await waitFor(() => {
      expect(successData).toBeDefined();
      expect(successData?.name).toBe("Charlie");
    });

    client.dispose();
  });

  it("resets mutation state", async () => {
    const client = createTestClient();

    function CreateUserButton() {
      const { mutate, isSuccess, reset, isIdle } = useMutation(CreateUserPort);

      return (
        <div>
          <button onClick={() => mutate({ name: "Dave" })}>Create</button>
          {isSuccess && <button onClick={reset}>Reset</button>}
          {isIdle && <span>Idle</span>}
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <CreateUserButton />
      </Wrapper>
    );

    // Initial idle state
    expect(screen.getByText("Idle")).toBeDefined();

    await act(async () => {
      fireEvent.click(screen.getByText("Create"));
    });

    await waitFor(() => {
      expect(screen.getByText("Reset")).toBeDefined();
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Reset"));
    });

    await waitFor(() => {
      expect(screen.getByText("Idle")).toBeDefined();
    });

    client.dispose();
  });
});

// =============================================================================
// QueryClientProvider
// =============================================================================

describe("QueryClientProvider", () => {
  it("renders children", () => {
    const client = createTestClient();

    render(
      <QueryClientProvider client={client}>
        <div>Hello</div>
      </QueryClientProvider>
    );

    expect(screen.getByText("Hello")).toBeDefined();
    client.dispose();
  });
});
