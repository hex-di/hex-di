import { describe, it, expect } from "vitest";
import { encodeShareableState } from "../../src/sharing/url-encoder.js";
import { decodeShareableState } from "../../src/sharing/url-decoder.js";
import type { ShareableState } from "../../src/sharing/types.js";

describe("URL sharing roundtrip", () => {
  it("encode -> decode preserves all fields (single file)", () => {
    const state: ShareableState = {
      files: [["main.ts", 'console.log("roundtrip");']],
      activeFile: "main.ts",
    };

    const encoded = encodeShareableState(state);
    expect(encoded.success).toBe(true);
    if (!encoded.success) return;

    const decoded = decodeShareableState(encoded.encoded);
    expect(decoded.success).toBe(true);
    if (!decoded.success) return;

    expect(decoded.state.files).toEqual(state.files);
    expect(decoded.state.activeFile).toBe(state.activeFile);
    expect(decoded.state.activePanel).toBeUndefined();
  });

  it("encode -> decode preserves all fields (multi file)", () => {
    const state: ShareableState = {
      files: [
        ["main.ts", 'import { x } from "./utils";\nconsole.log(x);'],
        ["utils.ts", "export const x = 42;"],
        ["config.ts", "export default { debug: true };"],
      ],
      activeFile: "utils.ts",
    };

    const encoded = encodeShareableState(state);
    expect(encoded.success).toBe(true);
    if (!encoded.success) return;

    const decoded = decodeShareableState(encoded.encoded);
    expect(decoded.success).toBe(true);
    if (!decoded.success) return;

    expect(decoded.state.files).toEqual(state.files);
    expect(decoded.state.activeFile).toBe("utils.ts");
  });

  it("roundtrip with optional activePanel field", () => {
    const state: ShareableState = {
      files: [["main.ts", "console.log(1);"]],
      activeFile: "main.ts",
      activePanel: "graph",
    };

    const encoded = encodeShareableState(state);
    expect(encoded.success).toBe(true);
    if (!encoded.success) return;

    const decoded = decodeShareableState(encoded.encoded);
    expect(decoded.success).toBe(true);
    if (!decoded.success) return;

    expect(decoded.state.activePanel).toBe("graph");
    expect(decoded.state.files).toEqual(state.files);
    expect(decoded.state.activeFile).toBe(state.activeFile);
  });

  it("roundtrip preserves special characters in file content", () => {
    const state: ShareableState = {
      files: [
        [
          "main.ts",
          'const msg = `Hello, ${name}!`;\nconst re = /[a-z]+/g;\nconst url = "https://example.com?foo=bar&baz=qux";',
        ],
      ],
      activeFile: "main.ts",
    };

    const encoded = encodeShareableState(state);
    expect(encoded.success).toBe(true);
    if (!encoded.success) return;

    const decoded = decodeShareableState(encoded.encoded);
    expect(decoded.success).toBe(true);
    if (!decoded.success) return;

    expect(decoded.state.files).toEqual(state.files);
  });

  it("roundtrip preserves unicode content", () => {
    const state: ShareableState = {
      files: [["main.ts", 'console.log("Hello World");']],
      activeFile: "main.ts",
    };

    const encoded = encodeShareableState(state);
    expect(encoded.success).toBe(true);
    if (!encoded.success) return;

    const decoded = decodeShareableState(encoded.encoded);
    expect(decoded.success).toBe(true);
    if (!decoded.success) return;

    expect(decoded.state.files).toEqual(state.files);
  });

  it("base64url encoded output contains no +, /, or = padding", () => {
    // Use a state that is likely to produce base64 characters like + / =
    const state: ShareableState = {
      files: [
        ["main.ts", "const a = 1 + 2 / 3;\nconst b = [1,2,3].map(x => x * 2);\nconsole.log(a, b);"],
        ["helper.ts", "export function add(a: number, b: number) { return a + b; }"],
      ],
      activeFile: "main.ts",
      activePanel: "container",
    };

    const encoded = encodeShareableState(state);
    expect(encoded.success).toBe(true);
    if (!encoded.success) return;

    const encodedPart = encoded.encoded.replace(/^code\//, "");
    expect(encodedPart).not.toMatch(/\+/);
    expect(encodedPart).not.toMatch(/\//);
    expect(encodedPart).not.toMatch(/=$/);
    // Only valid base64url characters: A-Z, a-z, 0-9, -, _
    expect(encodedPart).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
