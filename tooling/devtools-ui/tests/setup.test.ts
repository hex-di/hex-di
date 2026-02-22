import { describe, it, expect } from "vitest";

describe("@hex-di/devtools-ui", () => {
  it("package is scaffolded correctly", () => {
    expect(true).toBe(true);
  });

  it("jsdom environment is available", () => {
    expect(typeof document).toBe("object");
    expect(typeof window).toBe("object");
  });
});
