/**
 * Dependency Graph Analysis
 *
 * Multi-port example creating a visible dependency graph with several
 * services depending on each other.
 */

import type { ExampleTemplate } from "../types.js";

const MAIN_TS = `import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";

// Define ports
interface Config { readonly dbUrl: string; }
interface Logger { log(msg: string): void; }
interface Database { query(sql: string): string[]; }
interface UserRepo { findById(id: string): string; }
interface AuthService { authenticate(token: string): boolean; }

const ConfigPort = port<Config>()({ name: "Config" });
const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });
const UserRepoPort = port<UserRepo>()({ name: "UserRepo" });
const AuthServicePort = port<AuthService>()({ name: "AuthService" });

// Create adapters with dependency declarations
const configAdapter = createAdapter({
  provides: ConfigPort,
  factory: () => ({ dbUrl: "postgres://localhost/app" }),
  lifetime: "singleton",
});

const loggerAdapter = createAdapter({
  provides: LoggerPort,
  factory: () => ({ log: (msg: string) => console.log(\`[LOG] \${msg}\`) }),
  lifetime: "singleton",
});

const databaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [ConfigPort, LoggerPort],
  factory: ({ Config, Logger }) => {
    Logger.log(\`Connecting to \${Config.dbUrl}\`);
    return { query: (sql: string) => [\`result for: \${sql}\`] };
  },
  lifetime: "singleton",
});

const userRepoAdapter = createAdapter({
  provides: UserRepoPort,
  requires: [DatabasePort, LoggerPort],
  factory: ({ Database, Logger }) => ({
    findById: (id: string) => {
      Logger.log(\`Finding user \${id}\`);
      return Database.query(\`SELECT * FROM users WHERE id = '\${id}'\`)[0];
    },
  }),
  lifetime: "singleton",
});

const authServiceAdapter = createAdapter({
  provides: AuthServicePort,
  requires: [UserRepoPort, LoggerPort],
  factory: ({ UserRepo, Logger }) => ({
    authenticate: (token: string) => {
      Logger.log(\`Authenticating token: \${token}\`);
      const user = UserRepo.findById("user-1");
      return user !== undefined;
    },
  }),
  lifetime: "singleton",
});

// Build graph — the dependency graph panel visualizes these connections
const graph = GraphBuilder.create()
  .provide(configAdapter)
  .provide(loggerAdapter)
  .provide(databaseAdapter)
  .provide(userRepoAdapter)
  .provide(authServiceAdapter)
  .build();

const container = createContainer({ graph, name: "DependencyGraphExample" });
const auth = container.resolve(AuthServicePort);
console.log("Authenticated:", auth.authenticate("abc123"));
`;

export const dependencyGraph: ExampleTemplate = {
  id: "dependency-graph",
  title: "Dependency Graph Analysis",
  description: "Multi-port dependency graph with several interconnected services",
  category: "basics",
  files: new Map([["main.ts", MAIN_TS]]),
  entryPoint: "main.ts",
  defaultPanel: "graph",
};
