import { describe, it, expect } from "vitest";
import {
  createAuditChain,
  appendEntry,
  verifyChain,
} from "../../src/audit/integrity.js";

describe("audit integrity", () => {
  it("audit entries capture request method and URL", () => {
    let chain = createAuditChain();
    chain = appendEntry(chain, { method: "GET", url: "https://api.example.com/users", status: 200 });

    const entry = chain.entries[0];
    expect(entry).toBeDefined();
    expect(entry!.method).toBe("GET");
    expect(entry!.url).toBe("https://api.example.com/users");
    expect(entry!.status).toBe(200);
  });

  it("audit entries are immutable after creation", () => {
    let chain = createAuditChain();
    chain = appendEntry(chain, { method: "POST", url: "/api/data", status: 201 });

    const entry = chain.entries[0];
    expect(entry).toBeDefined();

    // Frozen objects throw in strict mode or silently ignore assignment
    expect(Object.isFrozen(entry)).toBe(true);
    expect(Object.isFrozen(chain)).toBe(true);
    expect(Object.isFrozen(chain.entries)).toBe(true);
  });

  it("audit entries include a monotonic timestamp", () => {
    const before = Date.now();
    let chain = createAuditChain();
    chain = appendEntry(chain, { method: "GET", url: "/api/test", status: 200 });
    const after = Date.now();

    const entry = chain.entries[0];
    expect(entry).toBeDefined();
    expect(entry!.timestamp).toBeGreaterThanOrEqual(before);
    expect(entry!.timestamp).toBeLessThanOrEqual(after);
  });

  it("audit entries reference the originating request", () => {
    let chain = createAuditChain();
    chain = appendEntry(chain, { method: "DELETE", url: "/api/items/42", status: 204 });
    chain = appendEntry(chain, { method: "GET", url: "/api/items", status: 200 });

    expect(chain.entries).toHaveLength(2);
    expect(chain.entries[0]!.method).toBe("DELETE");
    expect(chain.entries[0]!.url).toBe("/api/items/42");
    expect(chain.entries[1]!.method).toBe("GET");
    expect(chain.entries[1]!.url).toBe("/api/items");

    // Each entry links to the previous via hash chain
    expect(chain.entries[1]!.previousHash).toBe(chain.entries[0]!.hash);
  });

  it("audit log cannot be cleared once entries are recorded", () => {
    let chain = createAuditChain();
    chain = appendEntry(chain, { method: "GET", url: "/api/first", status: 200 });
    chain = appendEntry(chain, { method: "POST", url: "/api/second", status: 201 });

    // The chain is frozen and cannot be mutated
    expect(Object.isFrozen(chain.entries)).toBe(true);
    expect(chain.length).toBe(2);

    // Verify chain integrity is preserved
    expect(verifyChain(chain)).toBe(true);

    // Even after appending, the original chain is unchanged (immutable)
    const originalLength = chain.length;
    const newChain = appendEntry(chain, { method: "PUT", url: "/api/third", status: 200 });
    expect(chain.length).toBe(originalLength);
    expect(newChain.length).toBe(originalLength + 1);
  });
});
