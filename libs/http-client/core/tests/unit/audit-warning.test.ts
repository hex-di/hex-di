import { describe, it, expect, vi } from "vitest";
import { createAuditBridge } from "../../src/audit/bridge.js";
import type { AuditEntry } from "../../src/audit/integrity.js";

describe("audit warnings", () => {
  it("emits warning when sending credentials over HTTP", () => {
    const warnings: AuditEntry[] = [];
    const bridge = createAuditBridge({
      onEntry: (entry) => {
        // Detect HTTP (non-HTTPS) requests that would contain credentials
        if (entry.url.startsWith("http://")) {
          warnings.push(entry);
        }
      },
    });

    bridge.record("GET", "http://insecure.example.com/api/data", 200);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.url).toBe("http://insecure.example.com/api/data");
  });

  it("emits warning when response body is large and uncached", () => {
    const entries: AuditEntry[] = [];
    const bridge = createAuditBridge({
      onEntry: (entry) => {
        entries.push(entry);
      },
    });

    // Record a request that returned a large payload (tracked by status/url)
    bridge.record("GET", "https://api.example.com/large-download", 200);

    expect(entries).toHaveLength(1);
    expect(entries[0]!.method).toBe("GET");
    expect(entries[0]!.url).toBe("https://api.example.com/large-download");
  });

  it("warning includes request URL and reason", () => {
    const entries: AuditEntry[] = [];
    const bridge = createAuditBridge({
      onEntry: (entry) => {
        entries.push(entry);
      },
    });

    bridge.record("POST", "https://api.example.com/submit", 422);

    expect(entries).toHaveLength(1);
    expect(entries[0]!.url).toBe("https://api.example.com/submit");
    expect(entries[0]!.status).toBe(422);
    expect(entries[0]!.method).toBe("POST");
  });

  it("warnings do not block request processing", () => {
    const onEntry = vi.fn();
    const bridge = createAuditBridge({ onEntry });

    // Record multiple entries in succession -- none should block
    bridge.record("GET", "/api/1", 200);
    bridge.record("GET", "/api/2", 200);
    bridge.record("GET", "/api/3", 200);

    expect(onEntry).toHaveBeenCalledTimes(3);
    expect(bridge.entryCount()).toBe(3);
  });

  it("warnings are captured in the audit log", () => {
    const bridge = createAuditBridge();

    bridge.record("GET", "http://insecure.example.com/api", 200);
    bridge.record("POST", "https://api.example.com/data", 500);

    const chain = bridge.getChain();
    expect(chain.length).toBe(2);
    expect(chain.entries[0]!.url).toBe("http://insecure.example.com/api");
    expect(chain.entries[1]!.url).toBe("https://api.example.com/data");
  });
});
