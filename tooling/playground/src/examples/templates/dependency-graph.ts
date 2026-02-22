/**
 * Dependency Graph Analysis
 *
 * Multi-port example creating a visible dependency graph with several
 * services depending on each other.
 */

import type { ExampleTemplate } from "../types.js";

const MAIN_TS = `import { port, createAdapter, adapterOrElse } from "@hex-di/core";
import type { FactoryResult } from "@hex-di/core";
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

// Tagged error types for each adapter
interface ConfigFailed { readonly _tag: "ConfigFailed"; }
interface LoggerFailed { readonly _tag: "LoggerFailed"; }
interface DatabaseFailed { readonly _tag: "DatabaseFailed"; }
interface UserRepoFailed { readonly _tag: "UserRepoFailed"; }
interface AuthServiceFailed { readonly _tag: "AuthServiceFailed"; }

// Fallible adapters (return FactoryResult<T, E>)
const configAdapter = createAdapter({
  provides: ConfigPort,
  factory: (): FactoryResult<Config, ConfigFailed> => ({
    _tag: "Ok",
    value: { dbUrl: "postgres://localhost/app" },
  }),
  lifetime: "singleton",
});

const loggerAdapter = createAdapter({
  provides: LoggerPort,
  factory: (): FactoryResult<Logger, LoggerFailed> => ({
    _tag: "Ok",
    value: { log: (msg: string) => console.log(\`[LOG] \${msg}\`) },
  }),
  lifetime: "singleton",
});

const databaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [ConfigPort, LoggerPort],
  factory: ({ Config, Logger }): FactoryResult<Database, DatabaseFailed> => {
    Logger.log(\`Connecting to \${Config.dbUrl}\`);
    return { _tag: "Ok", value: { query: (sql: string) => [\`result for: \${sql}\`] } };
  },
  lifetime: "singleton",
});

const userRepoAdapter = createAdapter({
  provides: UserRepoPort,
  requires: [DatabasePort, LoggerPort],
  factory: ({ Database, Logger }): FactoryResult<UserRepo, UserRepoFailed> => ({
    _tag: "Ok",
    value: {
      findById: (id: string) => {
        Logger.log(\`Finding user \${id}\`);
        return Database.query(\`SELECT * FROM users WHERE id = '\${id}'\`)[0];
      },
    },
  }),
  lifetime: "singleton",
});

const authServiceAdapter = createAdapter({
  provides: AuthServicePort,
  requires: [UserRepoPort, LoggerPort],
  factory: ({ UserRepo, Logger }): FactoryResult<AuthService, AuthServiceFailed> => ({
    _tag: "Ok",
    value: {
      authenticate: (token: string) => {
        Logger.log(\`Authenticating token: \${token}\`);
        const user = UserRepo.findById("user-1");
        return user !== undefined;
      },
    },
  }),
  lifetime: "singleton",
});

// Fallback adapters (infallible — return plain T)
const fallbackConfig = createAdapter({
  provides: ConfigPort,
  factory: () => ({ dbUrl: "sqlite://fallback" }),
  lifetime: "singleton",
});

const fallbackLogger = createAdapter({
  provides: LoggerPort,
  factory: () => ({ log: () => {} }),
  lifetime: "singleton",
});

const fallbackDatabase = createAdapter({
  provides: DatabasePort,
  requires: [ConfigPort, LoggerPort],
  factory: () => ({ query: () => [] }),
  lifetime: "singleton",
});

const fallbackUserRepo = createAdapter({
  provides: UserRepoPort,
  requires: [DatabasePort, LoggerPort],
  factory: () => ({ findById: () => "unknown" }),
  lifetime: "singleton",
});

const fallbackAuthService = createAdapter({
  provides: AuthServicePort,
  requires: [UserRepoPort, LoggerPort],
  factory: () => ({ authenticate: () => false }),
  lifetime: "singleton",
});

// Build graph using adapterOrElse — the dependency graph panel visualizes these connections
const graph = GraphBuilder.create()
  .provide(adapterOrElse(configAdapter, fallbackConfig))
  .provide(adapterOrElse(loggerAdapter, fallbackLogger))
  .provide(adapterOrElse(databaseAdapter, fallbackDatabase))
  .provide(adapterOrElse(userRepoAdapter, fallbackUserRepo))
  .provide(adapterOrElse(authServiceAdapter, fallbackAuthService))
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
