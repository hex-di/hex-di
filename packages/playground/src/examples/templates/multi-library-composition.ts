/**
 * Multi-Library Composition
 *
 * A comprehensive example using multiple hex-di patterns together:
 * logging, caching, and service composition — all in a single container
 * with full inspector visibility.
 *
 * This is a multi-file example.
 */

import type { ExampleTemplate } from "../types.js";

const PORTS_LOGGER_TS = `// Re-export from the logger library (sets category: "logger/logger")
export { LoggerPort, type Logger } from "@hex-di/logger";
`;

const PORTS_CACHE_TS = `import { port } from "@hex-di/core";

export interface Cache {
  get(key: string): unknown | undefined;
  set(key: string, value: unknown, ttlMs?: number): void;
  invalidate(key: string): void;
  size(): number;
}

export const CachePort = port<Cache>()({ name: "Cache" });
`;

const PORTS_USER_SERVICE_TS = `import { port } from "@hex-di/core";

export interface User {
  readonly id: string;
  readonly name: string;
  readonly email: string;
}

export interface UserService {
  getUser(id: string): User | undefined;
  listUsers(): readonly User[];
  createUser(name: string, email: string): User;
}

export const UserServicePort = port<UserService>()({ name: "UserService" });
`;

const ADAPTERS_CONSOLE_LOGGER_TS = `// Re-export the library's console logger implementation
export { createConsoleLogger } from "@hex-di/logger";
`;

const ADAPTERS_MEMORY_CACHE_TS = `import type { Cache } from "../ports/cache";
import type { Logger } from "@hex-di/logger";

interface CacheEntry {
  value: unknown;
  expiresAt: number | undefined;
}

export function createMemoryCache(logger: Logger): Cache {
  const store = new Map<string, CacheEntry>();

  return {
    get: (key: string) => {
      const entry = store.get(key);
      if (!entry) {
        logger.info(\`Cache MISS: \${key}\`);
        return undefined;
      }
      if (entry.expiresAt !== undefined && Date.now() > entry.expiresAt) {
        store.delete(key);
        logger.info(\`Cache EXPIRED: \${key}\`);
        return undefined;
      }
      logger.info(\`Cache HIT: \${key}\`);
      return entry.value;
    },
    set: (key: string, value: unknown, ttlMs?: number) => {
      const expiresAt = ttlMs !== undefined ? Date.now() + ttlMs : undefined;
      store.set(key, { value, expiresAt });
      logger.info(\`Cache SET: \${key}\${ttlMs !== undefined ? \` (ttl: \${ttlMs}ms)\` : ""}\`);
    },
    invalidate: (key: string) => {
      store.delete(key);
      logger.info(\`Cache INVALIDATED: \${key}\`);
    },
    size: () => store.size,
  };
}
`;

const ADAPTERS_USER_SERVICE_IMPL_TS = `import type { UserService, User } from "../ports/user-service";
import type { Logger } from "@hex-di/logger";
import type { Cache } from "../ports/cache";

export function createUserService(logger: Logger, cache: Cache): UserService {
  const users = new Map<string, User>();
  let nextId = 1;

  // Seed some initial data
  const seed = (name: string, email: string) => {
    const id = String(nextId++);
    users.set(id, { id, name, email });
  };
  seed("Alice", "alice@example.com");
  seed("Bob", "bob@example.com");

  return {
    getUser: (id: string) => {
      // Check cache first
      const cached = cache.get(\`user:\${id}\`);
      if (cached) {
        logger.info(\`Returning cached user \${id}\`);
        return cached as User;
      }

      const user = users.get(id);
      if (user) {
        cache.set(\`user:\${id}\`, user, 30000);
        logger.info(\`Found user: \${user.name}\`);
      } else {
        logger.warn(\`User not found: \${id}\`);
      }
      return user;
    },
    listUsers: () => {
      const all = Array.from(users.values());
      logger.info(\`Listing \${all.length} users\`);
      return all;
    },
    createUser: (name: string, email: string) => {
      const id = String(nextId++);
      const user: User = { id, name, email };
      users.set(id, user);
      cache.set(\`user:\${id}\`, user, 30000);
      logger.info(\`Created user: \${name} (id: \${id})\`);
      return user;
    },
  };
}
`;

const MAIN_TS = `import { createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import { LoggerPort } from "./ports/logger";
import { CachePort } from "./ports/cache";
import { UserServicePort } from "./ports/user-service";
import { createConsoleLogger } from "./adapters/console-logger";
import { createMemoryCache } from "./adapters/memory-cache";
import { createUserService } from "./adapters/user-service-impl";

// Create adapters that wire factory functions to ports
const loggerAdapter = createAdapter({
  provides: LoggerPort,
  factory: () => createConsoleLogger(),
  lifetime: "singleton",
});

const cacheAdapter = createAdapter({
  provides: CachePort,
  requires: [LoggerPort],
  factory: ({ Logger }) => createMemoryCache(Logger),
  lifetime: "singleton",
});

const userServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort, CachePort],
  factory: ({ Logger, Cache }) => createUserService(Logger, Cache),
  lifetime: "singleton",
});

// Compose everything into a single graph
const graph = GraphBuilder.create()
  .provide(loggerAdapter)
  .provide(cacheAdapter)
  .provide(userServiceAdapter)
  .build();

const container = createContainer({ graph, name: "MultiLibrary" });

// Resolve and use the composed services
const userService = container.resolve(UserServicePort);

console.log("=== Multi-Library Composition Demo ===\\n");

// List initial users
const users = userService.listUsers();
console.log("Initial users:", users);

// Get a user (cache miss, then cache hit)
console.log("\\n--- Get user 1 (cache miss) ---");
const user1a = userService.getUser("1");
console.log("User 1:", user1a);

console.log("\\n--- Get user 1 again (cache hit) ---");
const user1b = userService.getUser("1");
console.log("User 1 (cached):", user1b);

// Create a new user
console.log("\\n--- Create new user ---");
const newUser = userService.createUser("Charlie", "charlie@example.com");
console.log("Created:", newUser);

// List all users after creation
console.log("\\n--- Final user list ---");
const allUsers = userService.listUsers();
console.log("All users:", allUsers);
`;

export const multiLibraryComposition: ExampleTemplate = {
  id: "multi-library-composition",
  title: "Multi-Library Composition",
  description:
    "Comprehensive example composing logging, caching, and services in a single container",
  category: "advanced",
  files: new Map([
    ["ports/logger.ts", PORTS_LOGGER_TS],
    ["ports/cache.ts", PORTS_CACHE_TS],
    ["ports/user-service.ts", PORTS_USER_SERVICE_TS],
    ["adapters/console-logger.ts", ADAPTERS_CONSOLE_LOGGER_TS],
    ["adapters/memory-cache.ts", ADAPTERS_MEMORY_CACHE_TS],
    ["adapters/user-service-impl.ts", ADAPTERS_USER_SERVICE_IMPL_TS],
    ["main.ts", MAIN_TS],
  ]),
  entryPoint: "main.ts",
  defaultPanel: "graph",
};
