/**
 * Property-based tests for context type preservation.
 *
 * Feature: zero-cast-typescript, Property 2: Context Variable Type Preservation
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4
 *
 * For any context variable key and value pair, storing and retrieving the value
 * through the context API SHALL preserve the type information without requiring
 * unsafe casts.
 */

import { describe, test, expect } from "vitest";
import { Hono } from "hono";
import type { Context } from "hono";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import {
  createContextVariableKey,
  getContextVariable,
  setContextVariable,
  type TypeSafeContext,
  type ContextVariableKey,
} from "@hex-di/runtime";
import { createScopeMiddleware, getContainer, getScope, type HexHonoEnv } from "../src/index.js";

/**
 * Creates a mock context that implements TypeSafeContext interface.
 * Uses the key's toString() method to store/retrieve values.
 */
function createMockContext(): TypeSafeContext {
  const variables = new Map<string, unknown>();
  return {
    get<T>(key: ContextVariableKey<T>): T | undefined {
      return variables.get(key.toString()) as T | undefined;
    },
    set<T>(key: ContextVariableKey<T>, value: T): void {
      variables.set(key.toString(), value);
    },
  };
}

// =============================================================================
// Test Fixtures
// =============================================================================

interface TestService {
  id: string;
  value: number;
}

const TestServicePort = port<TestService>()({ name: "TestService" });

type AppPorts = typeof TestServicePort;
type DefaultEnv = HexHonoEnv<AppPorts>;

function buildTestContainer() {
  let counter = 0;

  const testServiceAdapter = createAdapter({
    provides: TestServicePort,
    requires: [],
    lifetime: "scoped",
    factory: () => ({ id: `service-${++counter}`, value: counter * 10 }),
  });

  const graph = GraphBuilder.create().provide(testServiceAdapter).build();
  return createContainer(graph, { name: "TestContainer" });
}

// =============================================================================
// Property-Based Tests
// =============================================================================

describe("Context Type Preservation", () => {
  test("storing and retrieving string values preserves type", () => {
    const mockContext = createMockContext();

    const stringValue = "test-string";
    const key = createContextVariableKey<string>("testString");
    setContextVariable(mockContext, key, stringValue);
    const retrieved = getContextVariable(mockContext, key);

    expect(retrieved).toBe(stringValue);
    expect(typeof retrieved).toBe("string");
  });

  test("storing and retrieving number values preserves type", () => {
    const mockContext = createMockContext();

    const numberValue = 42;
    const key = createContextVariableKey<number>("testNumber");
    setContextVariable(mockContext, key, numberValue);
    const retrieved = getContextVariable(mockContext, key);

    expect(retrieved).toBe(numberValue);
    expect(typeof retrieved).toBe("number");
  });

  test("storing and retrieving boolean values preserves type", () => {
    const mockContext = createMockContext();

    const boolValue = true;
    const key = createContextVariableKey<boolean>("testBool");
    setContextVariable(mockContext, key, boolValue);
    const retrieved = getContextVariable(mockContext, key);

    expect(retrieved).toBe(boolValue);
    expect(typeof retrieved).toBe("boolean");
  });

  test("storing and retrieving object values preserves type", () => {
    const mockContext = createMockContext();

    const objectValue = { foo: "bar", baz: 123 };
    const key = createContextVariableKey<Record<string, unknown>>("testObject");
    setContextVariable(mockContext, key, objectValue);
    const retrieved = getContextVariable(mockContext, key);

    expect(retrieved).toEqual(objectValue);
    expect(typeof retrieved).toBe("object");
  });

  test("storing and retrieving array values preserves type", () => {
    const mockContext = createMockContext();

    const arrayValue = ["a", "b", "c"];
    const key = createContextVariableKey<string[]>("testArray");
    setContextVariable(mockContext, key, arrayValue);
    const retrieved = getContextVariable(mockContext, key);

    expect(retrieved).toEqual(arrayValue);
    expect(Array.isArray(retrieved)).toBe(true);
  });

  test("middleware stores and retrieves scope with correct type", async () => {
    const container = buildTestContainer();
    const app = new Hono<DefaultEnv>();

    app.use("*", createScopeMiddleware(container));

    app.get("/", (context: Context<DefaultEnv>) => {
      // getScope uses type-safe context variable access internally
      const scope = getScope(context);
      expect(scope).toBeDefined();
      expect(typeof scope.resolve).toBe("function");

      // Verify we can resolve ports through the scope
      const service = scope.resolve(TestServicePort);
      expect(service).toBeDefined();
      expect(typeof service.id).toBe("string");
      expect(typeof service.value).toBe("number");

      return context.json({ success: true });
    });

    const response = await app.request("/");
    expect(response.status).toBe(200);
  });

  test("middleware stores and retrieves container with correct type", async () => {
    const container = buildTestContainer();
    const app = new Hono<DefaultEnv>();

    app.use("*", createScopeMiddleware(container));

    app.get("/", (context: Context<DefaultEnv>) => {
      // getContainer uses type-safe context variable access internally
      const retrievedContainer = getContainer(context);
      expect(retrievedContainer).toBe(container);
      expect(typeof retrievedContainer.createScope).toBe("function");

      return context.json({ success: true });
    });

    const response = await app.request("/");
    expect(response.status).toBe(200);
  });

  test("multiple context variables maintain separate types", () => {
    const mockContext = createMockContext();

    const stringValue = "test";
    const stringKey = createContextVariableKey<string>("string");
    const numberKey = createContextVariableKey<number>("number");

    setContextVariable(mockContext, stringKey, stringValue);
    setContextVariable(mockContext, numberKey, 42);

    const retrievedString = getContextVariable(mockContext, stringKey);
    const retrievedNumber = getContextVariable(mockContext, numberKey);

    expect(retrievedString).toBe(stringValue);
    expect(typeof retrievedString).toBe("string");
    expect(retrievedNumber).toBe(42);
    expect(typeof retrievedNumber).toBe("number");
  });

  test("context variables can be updated and type is preserved", async () => {
    const container = buildTestContainer();
    const app = new Hono<DefaultEnv>();

    app.use("*", createScopeMiddleware(container));

    app.get("/first", (context: Context<DefaultEnv>) => {
      const scope1 = getScope(context);
      const service1 = scope1.resolve(TestServicePort);
      return context.json({ id: service1.id });
    });

    app.get("/second", (context: Context<DefaultEnv>) => {
      const scope2 = getScope(context);
      const service2 = scope2.resolve(TestServicePort);
      return context.json({ id: service2.id });
    });

    const response1 = await app.request("/first");
    const response2 = await app.request("/second");

    const data1 = (await response1.json()) as { id: string };
    const data2 = (await response2.json()) as { id: string };

    // Each request should have its own scope with different service instances
    expect(data1.id).toBe("service-1");
    expect(data2.id).toBe("service-2");
  });
});
