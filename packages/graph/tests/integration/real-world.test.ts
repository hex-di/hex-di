/**
 * Real-world usage pattern integration tests.
 *
 * Tests complete application patterns with Logger, Database, UserService, etc.
 */

import { describe, expect, expectTypeOf, it } from "vitest";
import { createAdapter } from "@hex-di/core";
import { GraphBuilder } from "../../src/index.js";
import {
  LoggerPort,
  ConfigPort,
  DatabasePort,
  CachePort,
  UserRepositoryPort,
  UserServicePort,
  EmailServicePort,
  NotificationServicePort,
} from "./shared-fixtures.js";

describe("Integration: Real-world usage pattern", () => {
  it("models a complete application with Logger, Database, UserService, EmailService, NotificationService", () => {
    // Infrastructure layer
    const loggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({
        log: () => {
          // In real app: console.log(`[LOG] ${msg}`)
        },
        error: () => {
          // In real app: console.error(`[ERROR] ${msg}`, err)
        },
      }),
    });

    const configAdapter = createAdapter({
      provides: ConfigPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({
        get: () => "config-value",
        getNumber: () => 0,
      }),
    });

    // Data layer
    const databaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [LoggerPort, ConfigPort],
      lifetime: "singleton",
      factory: deps => ({
        query: sql => {
          deps.Logger.log(`Query: ${sql}`);
          return Promise.resolve([]);
        },
        execute: sql => {
          deps.Logger.log(`Execute: ${sql}`);
          return Promise.resolve();
        },
      }),
    });

    const cacheAdapter = createAdapter({
      provides: CachePort,
      requires: [ConfigPort],
      lifetime: "singleton",
      factory: () => ({
        get: () => undefined,
        set: () => {},
        invalidate: () => {},
      }),
    });

    // Repository layer
    const userRepositoryAdapter = createAdapter({
      provides: UserRepositoryPort,
      requires: [DatabasePort, CachePort, LoggerPort],
      lifetime: "scoped",
      factory: deps => ({
        findById: async id => {
          const cached = deps.Cache.get<{ id: string; name: string; email: string }>(`user:${id}`);
          if (cached) return cached;
          const [user] = await deps.Database.query<{ id: string; name: string; email: string }>(
            "SELECT * FROM users WHERE id = ?",
            [id]
          );
          if (user) deps.Cache.set(`user:${id}`, user, 3600);
          return user || null;
        },
        save: async user => {
          await deps.Database.execute("INSERT INTO users (name, email) VALUES (?, ?)", [
            user.name,
            user.email,
          ]);
          return { id: "generated-id" };
        },
      }),
    });

    // Service layer
    const userServiceAdapter = createAdapter({
      provides: UserServicePort,
      requires: [UserRepositoryPort, LoggerPort],
      lifetime: "scoped",
      factory: deps => ({
        getUser: async id => {
          deps.Logger.log(`UserService.getUser(${id})`);
          return deps.UserRepository.findById(id);
        },
        createUser: async (name, email) => {
          deps.Logger.log(`UserService.createUser(${name}, ${email})`);
          return deps.UserRepository.save({ name, email });
        },
      }),
    });

    const emailServiceAdapter = createAdapter({
      provides: EmailServicePort,
      requires: [ConfigPort, LoggerPort],
      lifetime: "transient",
      factory: deps => ({
        send: (to, subject) => {
          deps.Logger.log(`Sending email to ${to}: ${subject}`);
          // Would use deps.Config to get SMTP settings
          return Promise.resolve();
        },
      }),
    });

    const notificationServiceAdapter = createAdapter({
      provides: NotificationServicePort,
      requires: [UserServicePort, EmailServicePort, LoggerPort],
      lifetime: "transient",
      factory: deps => ({
        notify: async (userId, message) => {
          deps.Logger.log(`Notifying user ${userId}`);
          const user = await deps.UserService.getUser(userId);
          if (user) {
            await deps.Email.send(user.email, "Notification", message);
          }
        },
      }),
    });

    // Build complete application graph
    const graph = GraphBuilder.create()
      .provide(loggerAdapter)
      .provide(configAdapter)
      .provide(databaseAdapter)
      .provide(cacheAdapter)
      .provide(userRepositoryAdapter)
      .provide(userServiceAdapter)
      .provide(emailServiceAdapter)
      .provide(notificationServiceAdapter)
      .build();

    // Verify graph contains all adapters
    expect(graph.adapters.length).toBe(8);
    expect(Object.isFrozen(graph)).toBe(true);

    // Verify type correctness - use conditional inference since __provides is optional
    type ProvidedPorts = typeof graph extends { __provides: infer P } ? P : never;
    expectTypeOf<ProvidedPorts>().toEqualTypeOf<
      | typeof LoggerPort
      | typeof ConfigPort
      | typeof DatabasePort
      | typeof CachePort
      | typeof UserRepositoryPort
      | typeof UserServicePort
      | typeof EmailServicePort
      | typeof NotificationServicePort
    >();
  });
});
