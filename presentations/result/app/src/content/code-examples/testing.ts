import type { CodeExample } from "../../ports/code-examples.port.js";

export const example: CodeExample = {
  id: "testing",
  title: "Testing with Result",
  before: {
    code: `describe("getUser", () => {
  it("returns the user", async () => {
    const user = await getUser("user-123");
    expect(user.id).toBe("user-123");
    expect(user.name).toBe("Alice");
  });
  it("throws on missing user", async () => {
    await expect(
      getUser("nonexistent")
    ).rejects.toThrow("not found");
    // What type is the error? No idea.
    // What fields does it have? Can't check.
  });
  it("throws on forbidden", async () => {
    await expect(
      getUser("admin-only")
    ).rejects.toThrow(); // just "throws something"
  });
});`,
    language: "typescript",
    filename: "get-user.test.ts",
    highlights: [8, 11, 15],
    annotations: [
      { line: 8, text: ".rejects.toThrow() -- matches on string, not type", type: "error" },
      { line: 11, text: "No access to error fields or structure", type: "error" },
      { line: 15, text: "Just asserts 'something was thrown'", type: "error" },
    ],
  },
  after: {
    code: `describe("getUser", () => {
  it("returns Ok with the user", async () => {
    const result = await getUser("user-123");
    expect(result.isOk()).toBe(true);
    expect(result.unwrapOr(null)?.id).toBe("user-123");
  });
  it("returns Err NotFound for missing user", async () => {
    const result = await getUser("nonexistent");
    expect(result.isErr()).toBe(true);
    result.match(
      () => expect.unreachable("should be Err"),
      (error) => {
        expect(error._tag).toBe("NotFound");
        expect(error.id).toBe("nonexistent");
      }
    );
  });
});`,
    language: "typescript",
    filename: "get-user.test.ts",
    highlights: [4, 10, 13],
    annotations: [
      { line: 4, text: "Assert on structure, not string matching", type: "ok" },
      { line: 10, text: "Typed error fields accessible directly", type: "ok" },
      { line: 13, text: "Each error variant tested by _tag", type: "ok" },
    ],
  },
};
