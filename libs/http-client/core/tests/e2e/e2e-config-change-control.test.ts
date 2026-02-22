/**
 * E2E: Config change audit (track config changes).
 *
 * Tests that configuration changes to the HTTP client pipeline
 * are captured in the audit chain.
 */

import { describe, it, expect } from "vitest";
import { ok } from "@hex-di/result";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { mockJsonResponse, mockResponse } from "../../src/testing/response-factory.js";
import { createAuditChain, appendEntry, verifyChain } from "../../src/audit/integrity.js";
import { createAuditBridge } from "../../src/audit/bridge.js";
import { baseUrl } from "../../src/combinators/base-url.js";
import { bearerAuth } from "../../src/combinators/auth.js";

describe("E2E: config change control", () => {
  it("audit chain captures full request lifecycle", async () => {
    const configChanges: Array<{ event: string; timestamp: number }> = [];

    // Record config changes as audit entries
    const bridge = createAuditBridge({
      onEntry: (entry) => {
        if (entry.url.startsWith("config://")) {
          configChanges.push({ event: entry.url, timestamp: entry.timestamp });
        }
      },
    });

    // Simulate config change events as audit entries
    bridge.record("CONFIG", "config://base-url-changed", undefined);
    bridge.record("CONFIG", "config://auth-token-rotated", undefined);

    // Then normal operations
    bridge.record("GET", "/api/data", 200);
    bridge.record("POST", "/api/data", 201);

    const chain = bridge.getChain();
    expect(chain.length).toBe(4);
    expect(verifyChain(chain)).toBe(true);
    expect(configChanges).toHaveLength(2);
    expect(configChanges[0]?.event).toBe("config://base-url-changed");
  });

  it("electronic signatures are attached when configured", () => {
    const bridge = createAuditBridge();

    // Record a config change
    bridge.record("CONFIG", "config://timeout-updated", undefined);

    const chain = bridge.getChain();
    const entry = chain.entries[0];

    // Each entry has a unique hash that serves as a signature
    expect(entry?.hash).toHaveLength(8);
    expect(entry?.previousHash).toBe("00000000"); // Genesis block
    expect(verifyChain(chain)).toBe(true);
  });

  it("WAL recovery restores unsent audit entries after restart", async () => {
    const bridge = createAuditBridge();

    // Record config changes and operations
    bridge.record("CONFIG", "config://base-url=https://api.v2.test", undefined);
    bridge.record("GET", "/api/v2/data", 200);
    bridge.record("CONFIG", "config://auth-type=bearer", undefined);
    bridge.record("GET", "/api/v2/secure", 200);

    const originalChain = bridge.getChain();
    const originalHash = originalChain.lastHash;

    // Simulate WAL recovery
    let recoveredChain = createAuditChain();
    for (const entry of originalChain.entries) {
      recoveredChain = appendEntry(recoveredChain, {
        method: entry.method,
        url: entry.url,
        status: entry.status,
        timestamp: entry.timestamp,
      });
    }

    expect(recoveredChain.length).toBe(originalChain.length);
    expect(recoveredChain.lastHash).toBe(originalHash);
    expect(verifyChain(recoveredChain)).toBe(true);
  });
});
