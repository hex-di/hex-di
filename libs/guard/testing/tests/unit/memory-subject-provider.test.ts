import { describe, it, expect } from "vitest";
import { createMemorySubjectProvider } from "../../src/memory/subject-provider.js";
import { createTestSubject } from "../../src/fixtures/subjects.js";

describe("createMemorySubjectProvider()", () => {
  it("returns the initial subject", () => {
    const subject = createTestSubject({ id: "user-1" });
    const provider = createMemorySubjectProvider(subject);
    expect(provider.getSubject().id).toBe("user-1");
  });

  it("starts with callCount 0", () => {
    const subject = createTestSubject();
    const provider = createMemorySubjectProvider(subject);
    expect(provider.callCount).toBe(0);
  });

  it("increments callCount on each getSubject() call", () => {
    const subject = createTestSubject();
    const provider = createMemorySubjectProvider(subject);
    provider.getSubject();
    provider.getSubject();
    expect(provider.callCount).toBe(2);
  });

  it("setSubject() changes the returned subject", () => {
    const original = createTestSubject({ id: "original" });
    const updated = createTestSubject({ id: "updated" });
    const provider = createMemorySubjectProvider(original);

    expect(provider.getSubject().id).toBe("original");

    provider.setSubject(updated);
    expect(provider.getSubject().id).toBe("updated");
  });

  it("returns consistent subject across calls before setSubject()", () => {
    const subject = createTestSubject({ id: "consistent" });
    const provider = createMemorySubjectProvider(subject);
    expect(provider.getSubject().id).toBe("consistent");
    expect(provider.getSubject().id).toBe("consistent");
  });
});
