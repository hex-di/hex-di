import { describe, it, expect } from "vitest";
import {
  createQueryPort,
  isQueryPort,
  QUERY_PORT_SYMBOL,
  createMutationPort,
} from "../src/index.js";

interface User {
  id: string;
  name: string;
}

interface Params {
  role?: string;
}

const UsersPort = createQueryPort<User[], Params>()({ name: "Users" });

const WithDefaultsPort = createQueryPort<User[], void>()({
  name: "WithDefaults",
  defaults: { staleTime: 5000, cacheTime: 60_000 },
});

const DependencyPort = createQueryPort<string[], unknown>()({ name: "Dependency" });
const DependentPort = createQueryPort<User[], unknown>()({
  name: "Dependent",
  dependsOn: [DependencyPort],
});

const NoDepsPort = createQueryPort<string>()({ name: "NoDeps" });

describe("createQueryPort", () => {
  it("returns an object with the correct name", () => {
    expect(UsersPort.__portName).toBe("Users");
  });

  it("has QueryPortSymbol property set to true", () => {
    expect(UsersPort[QUERY_PORT_SYMBOL]).toBe(true);
  });

  it("has config property containing the provided config", () => {
    expect(UsersPort.config.name).toBe("Users");
  });

  it("carries defaults in config.defaults when provided", () => {
    expect(WithDefaultsPort.config.defaults).toEqual({
      staleTime: 5000,
      cacheTime: 60_000,
    });
  });

  it("has config.defaults as undefined when not provided", () => {
    expect(UsersPort.config.defaults).toBeUndefined();
  });

  it("carries dependsOn in config.dependsOn when provided", () => {
    expect(DependentPort.config.dependsOn).toEqual([DependencyPort]);
  });

  it("has config.dependsOn as empty array when not provided", () => {
    expect(NoDepsPort.config.dependsOn).toEqual([]);
  });

  it("port name is the literal string type", () => {
    // This is a runtime check -- the type-level test is in .test-d.ts
    const name: "Users" = UsersPort.__portName;
    expect(name).toBe("Users");
  });

  it("two ports with different names are structurally distinct", () => {
    const port1 = createQueryPort<string>()({ name: "A" });
    const port2 = createQueryPort<string>()({ name: "B" });
    expect(port1.__portName).not.toBe(port2.__portName);
  });
});

describe("isQueryPort", () => {
  it("returns true for a query port", () => {
    expect(isQueryPort(UsersPort)).toBe(true);
  });

  it("returns false for an empty object", () => {
    expect(isQueryPort({})).toBe(false);
  });

  it("returns false for null", () => {
    expect(isQueryPort(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isQueryPort(undefined)).toBe(false);
  });

  it("returns false for a mutation port", () => {
    const mutPort = createMutationPort<User, { name: string }>()({
      name: "CreateUser",
    });
    expect(isQueryPort(mutPort)).toBe(false);
  });

  it("QUERY_PORT_SYMBOL description is '@hex-di/query/QueryPort'", () => {
    expect(QUERY_PORT_SYMBOL.description).toBe("@hex-di/query/QueryPort");
  });

  it("returns false for object with [QUERY_PORT_SYMBOL]: false", () => {
    const fake = { [QUERY_PORT_SYMBOL]: false };
    expect(isQueryPort(fake)).toBe(false);
  });

  it("returns false for a function with the query port symbol", () => {
    const fn = Object.assign(() => {}, { [QUERY_PORT_SYMBOL]: true });
    expect(isQueryPort(fn)).toBe(false);
  });
});

describe("createQueryPort (inline creation — mutation testing)", () => {
  it("symbol is true and passes isQueryPort guard", () => {
    const port = createQueryPort<string>()({ name: "Inline" });
    expect(port[QUERY_PORT_SYMBOL]).toBe(true);
    expect(isQueryPort(port)).toBe(true);
  });

  it("config contains all provided fields after creation", () => {
    const port = createQueryPort<string>()({
      name: "InlineConfig",
      defaults: { staleTime: 1000 },
    });
    expect(port.config.name).toBe("InlineConfig");
    expect(port.config.defaults).toEqual({ staleTime: 1000 });
  });

  it("config.dependsOn defaults to empty array when omitted", () => {
    const port = createQueryPort<string>()({ name: "NoDepsInline" });
    expect(port.config.dependsOn).toEqual([]);
    expect(port.config.dependsOn).toHaveLength(0);
  });

  it("config.dependsOn preserves provided dependencies", () => {
    const dep = createQueryPort<number>()({ name: "Dep" });
    const port = createQueryPort<string>()({ name: "WithDep", dependsOn: [dep] });
    expect(port.config.dependsOn).toEqual([dep]);
    expect(port.config.dependsOn).toHaveLength(1);
  });
});
