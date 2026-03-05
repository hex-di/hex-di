/**
 * Integration tests for contract checking in the resolution pipeline.
 *
 * Verifies that:
 * - contractChecks: "off" (default) performs no checking
 * - contractChecks: "warn" logs violations but resolves
 * - contractChecks: "strict" throws ContractViolationError on violations
 * - Ports without methods metadata skip contract checking
 * - Conforming adapters pass all modes
 *
 * NOTE: The GraphBuilder already validates operation completeness at build time
 * by invoking each factory with empty deps. These tests simulate the case where
 * factory behavior is dynamic and produces non-conforming results at runtime
 * (e.g., due to dependency-driven conditional logic).
 *
 * @see BEH-CO-10
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { port, createAdapter, ContractViolationError } from "@hex-di/core";
import { ok } from "@hex-di/result";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Mailer {
  send(to: string, body: string): void;
  validate(email: string): boolean;
}

// Port WITH methods metadata
const MailerPort = port<Mailer>()({
  name: "Mailer",
  direction: "outbound",
  category: "infra/mailer",
  methods: ["send", "validate"],
});

// Port WITHOUT methods metadata (should always skip checking)
interface Logger {
  log(msg: string): void;
}
const LoggerPort = port<Logger>()({ name: "Logger" });

/**
 * Flag to control factory behavior at runtime.
 * When true, the factory returns a conforming object.
 * When false, the factory returns a non-conforming object.
 *
 * This simulates dynamic factory behavior where the result depends
 * on runtime conditions (e.g., dependency state, config, etc.).
 */
let shouldConform = true;

// Dynamic adapter: passes build-time check, but behavior is runtime-controlled
const dynamicMailerAdapter = createAdapter({
  provides: MailerPort,
  requires: [],
  lifetime: "transient",
  factory: () => {
    if (shouldConform) {
      return {
        send: (_to: string, _body: string) => {},
        validate: (_email: string) => true,
      };
    }
    // Non-conforming: missing validate
    return { send: (_to: string, _body: string) => {} } as unknown as Mailer;
  },
});

// Dynamic adapter for type mismatch: passes build-time check
let shouldTypeMismatch = false;
const typeMismatchMailerAdapter = createAdapter({
  provides: MailerPort,
  requires: [],
  lifetime: "transient",
  factory: () => {
    if (shouldTypeMismatch) {
      return {
        send: "not-a-function",
        validate: (_e: string) => true,
      } as unknown as Mailer;
    }
    return {
      send: (_to: string, _body: string) => {},
      validate: (_email: string) => true,
    };
  },
});

// Conforming adapter (always conforms)
const conformingMailerAdapter = createAdapter({
  provides: MailerPort,
  requires: [],
  lifetime: "transient",
  factory: () => ({
    send: (_to: string, _body: string) => {},
    validate: (_email: string) => true,
  }),
});

const loggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ log: (_msg: string) => {} }),
});

// =============================================================================
// Console.warn interception helper
// =============================================================================

// Access console via globalThis as a generic record to avoid TS type issues
// when DOM lib is not included.
const g = globalThis as unknown as Record<string, Record<string, unknown>>;

/**
 * Captures console.warn calls without triggering TS type issues.
 */
function captureConsoleWarn(): {
  messages: string[];
  restore: () => void;
} {
  const messages: string[] = [];
  const consoleObj = g["console"];
  const originalWarn = consoleObj["warn"];
  const mockWarn = vi.fn((...args: unknown[]) => {
    messages.push(String(args[0]));
  });
  consoleObj["warn"] = mockWarn;
  return {
    messages,
    restore: () => {
      consoleObj["warn"] = originalWarn;
    },
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("Contract checking integration", () => {
  afterEach(() => {
    shouldConform = true;
    shouldTypeMismatch = false;
  });

  describe('contractChecks: "off" (default)', () => {
    it("resolves non-conforming adapter without error", () => {
      shouldConform = true;
      const graph = GraphBuilder.create().provide(dynamicMailerAdapter).build();

      // Switch to non-conforming after build
      shouldConform = false;

      const container = createContainer({
        graph,
        name: "Test",
        performance: { disableTracingWarnings: true },
      });

      // Should not throw - contract checking is off
      const mailer = container.resolve(MailerPort);
      expect(mailer).toBeDefined();
      expect(typeof mailer.send).toBe("function");
    });
  });

  describe('contractChecks: "warn"', () => {
    it("resolves non-conforming adapter but logs warning", () => {
      shouldConform = true;
      const graph = GraphBuilder.create().provide(dynamicMailerAdapter).build();

      shouldConform = false;

      const capture = captureConsoleWarn();

      try {
        const container = createContainer({
          graph,
          name: "Test",
          safety: { contractChecks: "warn" },
          performance: { disableTracingWarnings: true },
        });

        const mailer = container.resolve(MailerPort);
        expect(mailer).toBeDefined();

        expect(capture.messages).toHaveLength(1);
        expect(capture.messages[0]).toContain("Mailer");
        expect(capture.messages[0]).toContain("validate");
      } finally {
        capture.restore();
      }
    });

    it("does not warn for conforming adapter", () => {
      const graph = GraphBuilder.create().provide(conformingMailerAdapter).build();

      const capture = captureConsoleWarn();

      try {
        const container = createContainer({
          graph,
          name: "Test",
          safety: { contractChecks: "warn" },
          performance: { disableTracingWarnings: true },
        });

        container.resolve(MailerPort);

        expect(capture.messages).toHaveLength(0);
      } finally {
        capture.restore();
      }
    });

    it("does not warn for port without methods metadata", () => {
      const graph = GraphBuilder.create().provide(loggerAdapter).build();

      const capture = captureConsoleWarn();

      try {
        const container = createContainer({
          graph,
          name: "Test",
          safety: { contractChecks: "warn" },
          performance: { disableTracingWarnings: true },
        });

        container.resolve(LoggerPort);

        expect(capture.messages).toHaveLength(0);
      } finally {
        capture.restore();
      }
    });
  });

  describe('contractChecks: "strict"', () => {
    it("throws ContractViolationError for non-conforming adapter", () => {
      shouldConform = true;
      const graph = GraphBuilder.create().provide(dynamicMailerAdapter).build();

      shouldConform = false;

      const container = createContainer({
        graph,
        name: "Test",
        safety: { contractChecks: "strict" },
        performance: { disableTracingWarnings: true },
      });

      expect(() => container.resolve(MailerPort)).toThrow(ContractViolationError);
    });

    it("thrown error has correct portName and violations", () => {
      shouldConform = true;
      const graph = GraphBuilder.create().provide(dynamicMailerAdapter).build();

      shouldConform = false;

      const container = createContainer({
        graph,
        name: "Test",
        safety: { contractChecks: "strict" },
        performance: { disableTracingWarnings: true },
      });

      try {
        container.resolve(MailerPort);
        expect.fail("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(ContractViolationError);
        const err = e as InstanceType<typeof ContractViolationError>;
        expect(err.portName).toBe("Mailer");
        expect(err.violations).toHaveLength(1);
        expect(err.violations[0]._tag).toBe("MissingMethod");
        expect(err.violations[0].memberName).toBe("validate");
      }
    });

    it("thrown error carries blame context", () => {
      shouldConform = true;
      const graph = GraphBuilder.create().provide(dynamicMailerAdapter).build();

      shouldConform = false;

      const container = createContainer({
        graph,
        name: "Test",
        safety: { contractChecks: "strict" },
        performance: { disableTracingWarnings: true },
      });

      try {
        container.resolve(MailerPort);
        expect.fail("should have thrown");
      } catch (e) {
        const err = e as InstanceType<typeof ContractViolationError>;
        expect(err.blame).toBeDefined();
        if (err.blame) {
          expect(err.blame.adapterFactory.name).toBe("Mailer");
        }
      }
    });

    it("resolves conforming adapter without error", () => {
      const graph = GraphBuilder.create().provide(conformingMailerAdapter).build();

      const container = createContainer({
        graph,
        name: "Test",
        safety: { contractChecks: "strict" },
        performance: { disableTracingWarnings: true },
      });

      const mailer = container.resolve(MailerPort);
      expect(mailer).toBeDefined();
      expect(typeof mailer.send).toBe("function");
      expect(typeof mailer.validate).toBe("function");
    });

    it("skips checking for port without methods metadata", () => {
      const graph = GraphBuilder.create().provide(loggerAdapter).build();

      const container = createContainer({
        graph,
        name: "Test",
        safety: { contractChecks: "strict" },
        performance: { disableTracingWarnings: true },
      });

      // Should resolve fine - no methods to check
      const logger = container.resolve(LoggerPort);
      expect(logger).toBeDefined();
    });
  });

  describe("async resolution", () => {
    it('throws ContractViolationError in "strict" mode for async resolution', async () => {
      let asyncShouldConform = true;
      const AsyncMailerPort = port<Mailer>()({
        name: "AsyncMailer",
        direction: "outbound",
        category: "infra/mailer",
        methods: ["send", "validate"],
      });

      const asyncDynamicAdapter = createAdapter({
        provides: AsyncMailerPort,
        requires: [],
        lifetime: "singleton",
        factory: async () => {
          if (asyncShouldConform) {
            return ok({
              send: (_to: string, _body: string) => {},
              validate: (_email: string) => true,
            });
          }
          return ok({ send: () => {} } as unknown as Mailer);
        },
      });

      asyncShouldConform = true;
      const graph = GraphBuilder.create().provide(asyncDynamicAdapter).build();

      asyncShouldConform = false;

      const container = createContainer({
        graph,
        name: "Test",
        safety: { contractChecks: "strict" },
        performance: { disableTracingWarnings: true },
      });

      await expect(container.resolveAsync(AsyncMailerPort)).rejects.toThrow(ContractViolationError);
      asyncShouldConform = true;
    });
  });

  describe("type mismatch detection", () => {
    it("detects type mismatch in strict mode", () => {
      shouldTypeMismatch = false;
      const graph = GraphBuilder.create().provide(typeMismatchMailerAdapter).build();

      shouldTypeMismatch = true;

      const container = createContainer({
        graph,
        name: "Test",
        safety: { contractChecks: "strict" },
        performance: { disableTracingWarnings: true },
      });

      try {
        container.resolve(MailerPort);
        expect.fail("should have thrown");
      } catch (e) {
        const err = e as InstanceType<typeof ContractViolationError>;
        expect(err.violations).toHaveLength(1);
        expect(err.violations[0]._tag).toBe("TypeMismatch");
        expect(err.violations[0].memberName).toBe("send");
      }
    });
  });
});
