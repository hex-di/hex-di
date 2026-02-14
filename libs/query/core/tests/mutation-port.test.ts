import { describe, it, expect } from "vitest";
import { getPortMetadata } from "@hex-di/core";
import {
  createMutationPort,
  isMutationPort,
  MUTATION_PORT_SYMBOL,
  createQueryPort,
  isQueryPort,
} from "../src/index.js";

interface User {
  id: string;
  name: string;
}

interface CreateUserInput {
  name: string;
}

const UsersPort = createQueryPort<User[], unknown>()({ name: "Users" });
const UserByIdPort = createQueryPort<User, unknown>()({ name: "UserById" });

const CreateUserPort = createMutationPort<User, CreateUserInput>()({
  name: "CreateUser",
});

const WithInvalidatesPort = createMutationPort<User, CreateUserInput>()({
  name: "WithInvalidates",
  effects: { invalidates: [UsersPort] },
});

const WithRemovesPort = createMutationPort<void, string>()({
  name: "WithRemoves",
  effects: { removes: [UserByIdPort] },
});

const WithBothEffectsPort = createMutationPort<void, string>()({
  name: "WithBothEffects",
  effects: { invalidates: [UsersPort], removes: [UserByIdPort] },
});

const NoEffectsPort = createMutationPort<void>()({
  name: "NoEffects",
});

const VoidInputPort = createMutationPort<string>()({
  name: "VoidInput",
});

describe("createMutationPort", () => {
  it("returns object with the correct name", () => {
    expect(CreateUserPort.__portName).toBe("CreateUser");
  });

  it("has MutationPortSymbol property set to true", () => {
    expect(CreateUserPort[MUTATION_PORT_SYMBOL]).toBe(true);
  });

  it("has config property containing the provided config", () => {
    expect(CreateUserPort.config.name).toBe("CreateUser");
  });

  it("carries effects.invalidates in config when provided", () => {
    expect(WithInvalidatesPort.config.effects?.invalidates).toEqual([UsersPort]);
  });

  it("carries effects.removes in config when provided", () => {
    expect(WithRemovesPort.config.effects?.removes).toEqual([UserByIdPort]);
  });

  it("carries both invalidates and removes in config", () => {
    expect(WithBothEffectsPort.config.effects?.invalidates).toEqual([UsersPort]);
    expect(WithBothEffectsPort.config.effects?.removes).toEqual([UserByIdPort]);
  });

  it("has config.effects as undefined when not provided", () => {
    expect(NoEffectsPort.config.effects).toBeUndefined();
  });

  it("default TError is Error when not specified", () => {
    // This is verified at the type level, but at runtime we just check port creation works
    const port = createMutationPort<string>()({ name: "DefaultError" });
    expect(port.__portName).toBe("DefaultError");
  });

  it("default TInput is void when not specified", () => {
    expect(VoidInputPort.__portName).toBe("VoidInput");
  });

  it("default TContext is unknown when not specified", () => {
    // Type-level check; at runtime we verify the port is created
    const port = createMutationPort<string>()({ name: "DefaultContext" });
    expect(port.config.name).toBe("DefaultContext");
  });
});

describe("isMutationPort", () => {
  it("returns true for a mutation port", () => {
    expect(isMutationPort(CreateUserPort)).toBe(true);
  });

  it("returns false for an empty object", () => {
    expect(isMutationPort({})).toBe(false);
  });

  it("returns false for null", () => {
    expect(isMutationPort(null)).toBe(false);
  });

  it("returns false for a query port", () => {
    expect(isMutationPort(UsersPort)).toBe(false);
    // Also verify the reverse
    expect(isQueryPort(CreateUserPort)).toBe(false);
  });

  it("MUTATION_PORT_SYMBOL description is '@hex-di/query/MutationPort'", () => {
    expect(MUTATION_PORT_SYMBOL.description).toBe("@hex-di/query/MutationPort");
  });

  it("returns false for object with [MUTATION_PORT_SYMBOL]: false", () => {
    const fake = { [MUTATION_PORT_SYMBOL]: false };
    expect(isMutationPort(fake)).toBe(false);
  });

  it("returns false for a function with the mutation port symbol", () => {
    const fn = Object.assign(() => {}, { [MUTATION_PORT_SYMBOL]: true });
    expect(isMutationPort(fn)).toBe(false);
  });

  it("returns false for a number", () => {
    expect(isMutationPort(42)).toBe(false);
  });

  it("returns false for a string", () => {
    expect(isMutationPort("not a port")).toBe(false);
  });
});

describe("createMutationPort (inline creation — mutation testing)", () => {
  it("symbol is true and passes isMutationPort guard", () => {
    const port = createMutationPort<string>()({ name: "Inline" });
    expect(port[MUTATION_PORT_SYMBOL]).toBe(true);
    expect(isMutationPort(port)).toBe(true);
  });

  it("config contains all provided fields after creation", () => {
    const port = createMutationPort<string, { x: number }>()({
      name: "InlineConfig",
      effects: { invalidates: [] },
    });
    expect(port.config.name).toBe("InlineConfig");
    expect(port.config.effects).toEqual({ invalidates: [] });
  });
});

describe("mutation port metadata category for library detection", () => {
  it("createMutationPort sets category to query/mutation", () => {
    const port = createMutationPort<string>()({ name: "TestMutation" });
    expect(getPortMetadata(port)?.category).toBe("query/mutation");
  });
});
