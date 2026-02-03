/**
 * Type-level tests for createComponent function.
 *
 * These tests verify compile-time type safety for:
 * 1. Deps object is correctly typed based on requires array
 * 2. Props type is correctly passed through
 * 3. Return type is FC<TProps>
 * 4. Empty requires works correctly
 * 5. Error cases (invalid deps access causes compile error)
 */

import { describe, expectTypeOf, it } from "vitest";
import { port } from "@hex-di/core";
import type { FC } from "react";
import { createComponent } from "../src/factories/create-component.js";

// =============================================================================
// Test Service Interfaces
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): Promise<unknown>;
}

interface UserService {
  getUser(id: string): Promise<{ id: string; name: string }>;
}

// =============================================================================
// Test Port Tokens
// =============================================================================

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });
const UserServicePort = port<UserService>()({ name: "UserService" });
void LoggerPort;
void DatabasePort;
void UserServicePort;

// =============================================================================
// Deps Object Type Tests
// =============================================================================

describe("createComponent deps typing", () => {
  it("deps object has correct types based on requires", () => {
    const Component = createComponent({
      requires: [LoggerPort, DatabasePort],
      render: deps => {
        // Type assertions for deps object
        expectTypeOf(deps.Logger).toEqualTypeOf<Logger>();
        expectTypeOf(deps.Database).toEqualTypeOf<Database>();
        return null;
      },
    });

    void Component;
  });

  it("deps is typed correctly for single port", () => {
    const Component = createComponent({
      requires: [LoggerPort],
      render: deps => {
        expectTypeOf(deps.Logger).toEqualTypeOf<Logger>();
        return null;
      },
    });

    void Component;
  });

  it("deps is Record<string, never> for empty requires", () => {
    const Component = createComponent({
      requires: [],
      render: deps => {
        // For empty requires, deps should be Record<string, never>
        expectTypeOf(deps).toEqualTypeOf<Record<string, never>>();
        return null;
      },
    });

    void Component;
  });
});

// =============================================================================
// Props Type Tests
// =============================================================================

describe("createComponent props typing", () => {
  it("props type is correctly passed through", () => {
    type MyProps = { userId: string; count: number };

    const Component = createComponent({
      requires: [LoggerPort],
      render: (deps, props: MyProps) => {
        expectTypeOf(props.userId).toEqualTypeOf<string>();
        expectTypeOf(props.count).toEqualTypeOf<number>();
        void deps;
        return null;
      },
    });

    // The component should be FC<MyProps>
    expectTypeOf(Component).toMatchTypeOf<FC<MyProps>>();
  });

  it("props defaults to Record<string, never>", () => {
    const Component = createComponent({
      requires: [LoggerPort],
      render: () => {
        return null;
      },
    });

    // The component should be FC with no required props
    expectTypeOf(Component).toMatchTypeOf<FC<Record<string, never>>>();
  });

  it("component with optional props", () => {
    type OptionalProps = { name?: string };

    const Component = createComponent({
      requires: [LoggerPort],
      render: (deps, props: OptionalProps) => {
        expectTypeOf(props.name).toEqualTypeOf<string | undefined>();
        void deps;
        return null;
      },
    });

    expectTypeOf(Component).toMatchTypeOf<FC<OptionalProps>>();
  });
});

// =============================================================================
// Return Type Tests
// =============================================================================

describe("createComponent return type", () => {
  it("returns FC<TProps>", () => {
    type Props = { name: string };

    const Component = createComponent({
      requires: [LoggerPort],
      render: (_, props: Props) => {
        void props;
        return null;
      },
    });

    expectTypeOf(Component).toMatchTypeOf<FC<Props>>();
  });

  it("returns FC<{}> for no props", () => {
    const Component = createComponent({
      requires: [LoggerPort],
      render: () => null,
    });

    // FC<{}> matches FC with empty props object
    expectTypeOf(Component).toBeFunction();
  });
});

// =============================================================================
// Error Cases
// =============================================================================

describe("createComponent error cases", () => {
  it("accessing non-existent dep causes compile error", () => {
    createComponent({
      requires: [LoggerPort],
      render: deps => {
        // @ts-expect-error - Database is not in requires
        void deps.Database;
        return null;
      },
    });
  });

  it("accessing wrong dep name causes compile error", () => {
    createComponent({
      requires: [LoggerPort, DatabasePort],
      render: deps => {
        // @ts-expect-error - Wrong name (lowercase)
        void deps.logger;
        return null;
      },
    });
  });
});

// =============================================================================
// Tuple Inference Tests
// =============================================================================

describe("createComponent tuple inference", () => {
  it("infers exact tuple type with const modifier", () => {
    // The requires array should be inferred as a tuple, not Port[]
    const Component = createComponent({
      requires: [LoggerPort, DatabasePort, UserServicePort],
      render: deps => {
        // All three ports should be available with correct types
        expectTypeOf(deps.Logger).toEqualTypeOf<Logger>();
        expectTypeOf(deps.Database).toEqualTypeOf<Database>();
        expectTypeOf(deps.UserService).toEqualTypeOf<UserService>();
        return null;
      },
    });

    void Component;
  });
});
