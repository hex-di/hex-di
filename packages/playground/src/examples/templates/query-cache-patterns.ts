/**
 * Query Cache Patterns
 *
 * Demonstrates Query port with cache management and invalidation.
 */

import type { ExampleTemplate } from "../types.js";

const MAIN_TS = `import { createAdapter } from "@hex-di/core";
import { createQueryPort, createMutationPort } from "@hex-di/query";
import { LoggerPort, createConsoleLogger } from "@hex-di/logger";
import { ResultAsync } from "@hex-di/result";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";

// Data types
interface User {
  readonly id: string;
  readonly name: string;
}

// Query port: fetches a list of users (sets category: "query/query")
const UsersQueryPort = createQueryPort<User[], void>()({ name: "UsersQuery" });

// Mutation port: creates a new user (sets category: "query/mutation")
const CreateUserPort = createMutationPort<User, { name: string }>()({ name: "CreateUser" });

// Logger using the actual library port
const loggerAdapter = createAdapter({
  provides: LoggerPort,
  factory: () => createConsoleLogger(),
  lifetime: "singleton",
});

// Simulated user store for the example
const users: User[] = [
  { id: "1", name: "Alice" },
  { id: "2", name: "Bob" },
];

// Query adapter: fetcher returns ResultAsync
const usersQueryAdapter = createAdapter({
  provides: UsersQueryPort,
  factory: () => (_params, _ctx) => {
    console.log("[Query] Fetching users...");
    return ResultAsync.ok([...users]);
  },
  lifetime: "singleton",
});

// Mutation adapter: executor returns ResultAsync
const createUserAdapter = createAdapter({
  provides: CreateUserPort,
  factory: () => (input, _ctx) => {
    const newUser: User = { id: String(users.length + 1), name: input.name };
    users.push(newUser);
    console.log(\`[Mutation] Created user: \${newUser.name} (id: \${newUser.id})\`);
    return ResultAsync.ok(newUser);
  },
  lifetime: "singleton",
});

const graph = GraphBuilder.create()
  .provide(loggerAdapter)
  .provide(usersQueryAdapter)
  .provide(createUserAdapter)
  .build();

const container = createContainer({ graph, name: "QueryExample" });

// Resolve the query fetcher and mutation executor
const fetchUsers = container.resolve(UsersQueryPort);
const createUser = container.resolve(CreateUserPort);

// Execute a query
const result1 = await fetchUsers(undefined, { signal: new AbortController().signal });
result1.match(
  (data) => console.log("Users:", data),
  (err) => console.error("Query failed:", err),
);

// Execute a mutation
const result2 = await createUser({ name: "Charlie" }, { signal: new AbortController().signal });
result2.match(
  (user) => console.log("Created:", user),
  (err) => console.error("Mutation failed:", err),
);

// Query again to see the new user
const result3 = await fetchUsers(undefined, { signal: new AbortController().signal });
result3.match(
  (data) => console.log("Users after mutation:", data),
  (err) => console.error("Query failed:", err),
);
`;

export const queryCachePatterns: ExampleTemplate = {
  id: "query-cache-patterns",
  title: "Query Cache Patterns",
  description: "Query port with cache management and invalidation patterns",
  category: "libraries",
  files: new Map([["main.ts", MAIN_TS]]),
  entryPoint: "main.ts",
  defaultPanel: "overview",
};
