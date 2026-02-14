/**
 * Child Containers & Inheritance
 *
 * Shows child container creation with inheritance, demonstrating how
 * child containers can override parent registrations while inheriting others.
 */

import type { ExampleTemplate } from "../types.js";

const MAIN_TS = `import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";

interface Config { readonly env: string; }
interface Logger { log(msg: string): void; }
interface Service { run(): string; }

const ConfigPort = port<Config>()({ name: "Config" });
const LoggerPort = port<Logger>()({ name: "Logger" });
const ServicePort = port<Service>()({ name: "Service" });

// Parent adapters
const configAdapter = createAdapter({
  provides: ConfigPort,
  factory: () => ({ env: "production" }),
  lifetime: "singleton",
});

const loggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [ConfigPort],
  factory: ({ Config }) => ({
    log: (msg: string) => console.log(\`[\${Config.env}] \${msg}\`),
  }),
  lifetime: "singleton",
});

const serviceAdapter = createAdapter({
  provides: ServicePort,
  requires: [LoggerPort],
  factory: ({ Logger }) => ({
    run: () => {
      Logger.log("Service running");
      return "service-result";
    },
  }),
  lifetime: "singleton",
});

// Build parent graph
const parentGraph = GraphBuilder.create()
  .provide(configAdapter)
  .provide(loggerAdapter)
  .provide(serviceAdapter)
  .build();

const parentContainer = createContainer({ graph: parentGraph, name: "Parent" });

// Parent resolves with production config
const parentService = parentContainer.resolve(ServicePort);
console.log("Parent result:", parentService.run());

// Child overrides Config with testing environment
const testConfigAdapter = createAdapter({
  provides: ConfigPort,
  factory: () => ({ env: "testing" }),
  lifetime: "singleton",
});

const childGraph = GraphBuilder.create()
  .override(testConfigAdapter)
  .buildFragment();

const childContainer = parentContainer.createChild(childGraph, { name: "TestChild" });

// Child inherits Logger and Service but uses overridden Config
const childService = childContainer.resolve(ServicePort);
console.log("Child result:", childService.run());

// Parent Config is unchanged
const parentConfig = parentContainer.resolve(ConfigPort);
console.log("Parent env:", parentConfig.env);
`;

export const childContainers: ExampleTemplate = {
  id: "child-containers",
  title: "Child Containers & Inheritance",
  description: "Child container creation with parent inheritance and overrides",
  category: "basics",
  files: new Map([["main.ts", MAIN_TS]]),
  entryPoint: "main.ts",
  defaultPanel: "container",
};
