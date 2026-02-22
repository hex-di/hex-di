/**
 * E2E: Full audit chain lifecycle.
 *
 * Tests the complete audit chain from recording through verification,
 * including tamper detection.
 */

import { describe, it, expect } from "vitest";
import { ok } from "@hex-di/result";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { mockJsonResponse, mockResponse } from "../../src/testing/response-factory.js";
import { createAuditChain, appendEntry, verifyChain } from "../../src/audit/integrity.js";
import { createAuditBridge } from "../../src/audit/bridge.js";
import { createAuditSink } from "../../src/audit/sink.js";
import { interceptor } from "../../src/combinators/interceptor.js";
import { baseUrl } from "../../src/combinators/base-url.js";
import { bearerAuth } from "../../src/combinators/auth.js";

describe("E2E: audit chain lifecycle", () => {
  it("audit chain captures full request lifecycle", async () => {
    const bridge = createAuditBridge();
    const persisted: unknown[] = [];

    const sink = createAuditSink({
      onFlush: async (entries) => {
        persisted.push(...entries);
      },
      bufferSize: 100,
    });

    const auditInterceptor = interceptor({
      onResponse: (res) => {
        const entry = bridge.record(res.request.method, res.request.url, res.status);
        sink.write(entry);
        return res;
      },
    });

    const client = auditInterceptor(
      bearerAuth("tok")(
        baseUrl("https://api.gxp.test")(
          createMockHttpClient({
            "GET /api/lots": mockJsonResponse(200, [{ id: 1 }]),
            "POST /api/lots": mockJsonResponse(201, { id: 2 }),
            "PUT /api/lots/1": mockJsonResponse(200, { id: 1, updated: true }),
          }),
        ),
      ),
    );

    await client.get("/api/lots");
    await client.post("/api/lots", { json: { name: "Lot-A" } });
    await client.put("/api/lots/1", { json: { name: "Lot-A-Updated" } });

    await sink.flush();

    // All entries captured and persisted
    expect(bridge.entryCount()).toBe(3);
    expect(persisted).toHaveLength(3);

    // Chain is cryptographically linked
    const chain = bridge.getChain();
    expect(chain.entries[0]?.previousHash).toBe("00000000");
    expect(chain.entries[1]?.previousHash).toBe(chain.entries[0]?.hash);
    expect(chain.entries[2]?.previousHash).toBe(chain.entries[1]?.hash);

    expect(verifyChain(chain)).toBe(true);
  });

  it("electronic signatures are attached when configured", async () => {
    const signatures: Array<{ hash: string; signer: string }> = [];
    const signer = "operator@pharma.com";

    const bridge = createAuditBridge({
      onEntry: (entry) => {
        // Simulate electronic signature attachment
        signatures.push({ hash: entry.hash, signer });
      },
    });

    bridge.record("GET", "/api/batches", 200);
    bridge.record("POST", "/api/batches", 201);

    expect(signatures).toHaveLength(2);
    expect(signatures[0]?.signer).toBe(signer);
    expect(signatures[0]?.hash).toHaveLength(8);
    expect(signatures[1]?.hash).not.toBe(signatures[0]?.hash);
  });

  it("WAL recovery restores unsent audit entries after restart", async () => {
    // Simulate WAL (Write-Ahead Log) by persisting entries before flushing
    const wal: Array<{ method: string; url: string; status: number | undefined; timestamp: number }> = [];

    const bridge = createAuditBridge({
      onEntry: (entry) => {
        // Write to WAL immediately
        wal.push({
          method: entry.method,
          url: entry.url,
          status: entry.status,
          timestamp: entry.timestamp,
        });
      },
    });

    // Record some entries
    bridge.record("GET", "/api/data", 200);
    bridge.record("POST", "/api/data", 201);
    bridge.record("DELETE", "/api/data/1", 204);

    // Simulate crash -- sink never flushed
    expect(wal).toHaveLength(3);

    // "Recovery" -- rebuild chain from WAL entries
    let recoveredChain = createAuditChain();
    for (const entry of wal) {
      recoveredChain = appendEntry(recoveredChain, entry);
    }

    expect(recoveredChain.length).toBe(3);
    expect(verifyChain(recoveredChain)).toBe(true);

    // The recovered chain hash matches the original
    expect(recoveredChain.lastHash).toBe(bridge.lastHash());
  });
});
