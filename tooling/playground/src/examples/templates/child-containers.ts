/**
 * Child Containers & Inheritance
 *
 * Shows child container creation with inheritance, demonstrating how
 * child containers can override parent registrations while inheriting others.
 */

import type { ExampleTemplate } from "../types.js";

const MAIN_TS = `import { port, createAdapter, adapterOrElse } from "@hex-di/core";
import type { FactoryResult } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";

interface Config { readonly env: string; }
interface Logger { log(msg: string): void; }
interface Service { run(): string; }

const ConfigPort = port<Config>()({ name: "Config" });
const LoggerPort = port<Logger>()({ name: "Logger" });
const ServicePort = port<Service>()({ name: "Service" });

// Tagged error types
interface ConfigCreationFailed { readonly _tag: "ConfigCreationFailed"; }
interface LoggerCreationFailed { readonly _tag: "LoggerCreationFailed"; }
interface ServiceCreationFailed { readonly _tag: "ServiceCreationFailed"; }
interface TestConfigCreationFailed { readonly _tag: "TestConfigCreationFailed"; }

// Parent adapters (fallible — return FactoryResult)
const configAdapter = createAdapter({
  provides: ConfigPort,
  factory: (): FactoryResult<Config, ConfigCreationFailed> => ({
    _tag: "Ok",
    value: { env: "production" },
  }),
  lifetime: "singleton",
});

const fallbackConfig = createAdapter({
  provides: ConfigPort,
  factory: () => ({ env: "unknown" }),
  lifetime: "singleton",
});

const loggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [ConfigPort],
  factory: ({ Config }): FactoryResult<Logger, LoggerCreationFailed> => ({
    _tag: "Ok",
    value: { log: (msg: string) => console.log(\`[\${Config.env}] \${msg}\`) },
  }),
  lifetime: "singleton",
});

const fallbackLogger = createAdapter({
  provides: LoggerPort,
  factory: () => ({ log: () => {} }),
  lifetime: "singleton",
});

const serviceAdapter = createAdapter({
  provides: ServicePort,
  requires: [LoggerPort],
  factory: ({ Logger }): FactoryResult<Service, ServiceCreationFailed> => ({
    _tag: "Ok",
    value: {
      run: () => {
        Logger.log("Service running");
        return "service-result";
      },
    },
  }),
  lifetime: "singleton",
});

const fallbackService = createAdapter({
  provides: ServicePort,
  factory: () => ({ run: () => "fallback" }),
  lifetime: "singleton",
});

// Build parent graph using adapterOrElse
const parentGraph = GraphBuilder.create()
  .provide(adapterOrElse(configAdapter, fallbackConfig))
  .provide(adapterOrElse(loggerAdapter, fallbackLogger))
  .provide(adapterOrElse(serviceAdapter, fallbackService))
  .build();

const parentContainer = createContainer({ graph: parentGraph, name: "Parent" });

// Parent resolves with production config
const parentService = parentContainer.resolve(ServicePort);
console.log("Parent result:", parentService.run());

// Child overrides Config with testing environment
const testConfigAdapter = createAdapter({
  provides: ConfigPort,
  factory: (): FactoryResult<Config, TestConfigCreationFailed> => ({
    _tag: "Ok",
    value: { env: "testing" },
  }),
  lifetime: "singleton",
});

const fallbackTestConfig = createAdapter({
  provides: ConfigPort,
  factory: () => ({ env: "fallback-test" }),
  lifetime: "singleton",
});

const childGraph = GraphBuilder.create()
  .override(adapterOrElse(testConfigAdapter, fallbackTestConfig))
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
