/**
 * GxP enhanced redaction tests.
 *
 * Verifies message-level redaction via regex patterns.
 */

import { describe, it, expect } from "vitest";
import { createMemoryLogger, withRedaction } from "../../src/index.js";

describe("withRedaction - messagePatterns", () => {
  it("should redact SSN pattern in messages", () => {
    const mem = createMemoryLogger();
    const logger = withRedaction(mem, {
      paths: [],
      messagePatterns: [/\d{3}-\d{2}-\d{4}/g],
    });

    logger.info("User SSN is 123-45-6789 for reference");

    const entries = mem.getEntries();
    expect(entries[0].message).toBe("User SSN is [REDACTED] for reference");
  });

  it("should apply multiple message patterns", () => {
    const mem = createMemoryLogger();
    const logger = withRedaction(mem, {
      paths: [],
      messagePatterns: [
        /\d{3}-\d{2}-\d{4}/g, // SSN
        /[\w.]+@[\w.]+\.\w+/g, // Email
      ],
    });

    logger.info("User test@example.com has SSN 123-45-6789");

    const entries = mem.getEntries();
    expect(entries[0].message).toBe("User [REDACTED] has SSN [REDACTED]");
  });

  it("should not modify messages when no patterns configured", () => {
    const mem = createMemoryLogger();
    const logger = withRedaction(mem, { paths: ["password"] });

    logger.info("SSN is 123-45-6789");

    const entries = mem.getEntries();
    expect(entries[0].message).toBe("SSN is 123-45-6789");
  });

  it("should use custom censor for message patterns", () => {
    const mem = createMemoryLogger();
    const logger = withRedaction(mem, {
      paths: [],
      censor: "***",
      messagePatterns: [/\d{3}-\d{2}-\d{4}/g],
    });

    logger.info("SSN: 123-45-6789");

    const entries = mem.getEntries();
    expect(entries[0].message).toBe("SSN: ***");
  });

  it("should redact in deeply nested annotations alongside message redaction", () => {
    const mem = createMemoryLogger();
    const logger = withRedaction(mem, {
      paths: ["*.secret"],
      messagePatterns: [/\d{3}-\d{2}-\d{4}/g],
    });

    logger.info("SSN is 123-45-6789", {
      user: { secret: "hidden", name: "test" },
    });

    const entries = mem.getEntries();
    expect(entries[0].message).toBe("SSN is [REDACTED]");
    const user = entries[0].annotations.user as Record<string, unknown>;
    expect(user.secret).toBe("[REDACTED]");
    expect(user.name).toBe("test");
  });
});
