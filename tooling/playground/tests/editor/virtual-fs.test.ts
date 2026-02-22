/**
 * VirtualFS unit tests.
 *
 * Covers spec Section 44.2 — 11 tests:
 * 1. Write and read file
 * 2. Delete file returns undefined on subsequent read
 * 3. Rename moves content, old path undefined
 * 4. listFiles returns alphabetically sorted paths
 * 5. listFiles(directory) returns only files under that directory
 * 6. fileExists returns true/false correctly
 * 7. setAll replaces entire FS, getAll returns full snapshot
 * 8. Subscribe fires on write (file-created or file-updated)
 * 9. Subscribe fires on delete (file-deleted)
 * 10. Subscribe fires on rename (file-renamed)
 * 11. Unsubscribe stops events
 */

import { describe, it, expect, vi } from "vitest";
import { createVirtualFS } from "../../src/editor/virtual-fs.js";
import type { FSEvent } from "../../src/editor/virtual-fs.js";

describe("VirtualFS", () => {
  it("writes and reads a file", () => {
    const fs = createVirtualFS(new Map());

    fs.writeFile("a.ts", "code");

    expect(fs.readFile("a.ts")).toBe("code");
  });

  it("returns undefined after deleting a file", () => {
    const fs = createVirtualFS(new Map([["a.ts", "code"]]));

    fs.deleteFile("a.ts");

    expect(fs.readFile("a.ts")).toBeUndefined();
  });

  it("renames a file, moving content and leaving old path undefined", () => {
    const fs = createVirtualFS(new Map([["a.ts", "original"]]));

    fs.renameFile("a.ts", "b.ts");

    expect(fs.readFile("b.ts")).toBe("original");
    expect(fs.readFile("a.ts")).toBeUndefined();
  });

  it("listFiles returns alphabetically sorted paths", () => {
    const fs = createVirtualFS(
      new Map([
        ["zebra.ts", "z"],
        ["alpha.ts", "a"],
        ["middle.ts", "m"],
      ])
    );

    const result = fs.listFiles();

    expect(result).toEqual(["alpha.ts", "middle.ts", "zebra.ts"]);
  });

  it("listFiles(directory) returns only files under that directory", () => {
    const fs = createVirtualFS(
      new Map([
        ["main.ts", "entry"],
        ["ports/logger.ts", "logger"],
        ["ports/cache.ts", "cache"],
        ["adapters/console.ts", "console"],
      ])
    );

    const result = fs.listFiles("ports");

    expect(result).toEqual(["ports/cache.ts", "ports/logger.ts"]);
  });

  it("fileExists returns true for existing files and false otherwise", () => {
    const fs = createVirtualFS(new Map([["a.ts", "code"]]));

    expect(fs.fileExists("a.ts")).toBe(true);
    expect(fs.fileExists("nonexistent.ts")).toBe(false);
  });

  it("setAll replaces entire FS and getAll returns full snapshot", () => {
    const fs = createVirtualFS(new Map([["old.ts", "old code"]]));

    const replacement = new Map([
      ["new1.ts", "new code 1"],
      ["new2.ts", "new code 2"],
    ]);
    fs.setAll(replacement);

    expect(fs.readFile("old.ts")).toBeUndefined();

    const snapshot = fs.getAll();
    expect(snapshot.size).toBe(2);
    expect(snapshot.get("new1.ts")).toBe("new code 1");
    expect(snapshot.get("new2.ts")).toBe("new code 2");
  });

  it("subscribe fires file-created on new file write and file-updated on overwrite", () => {
    const fs = createVirtualFS(new Map());
    const events: FSEvent[] = [];
    fs.subscribe(event => events.push(event));

    fs.writeFile("a.ts", "first");
    fs.writeFile("a.ts", "second");

    expect(events).toEqual([
      { type: "file-created", path: "a.ts" },
      { type: "file-updated", path: "a.ts" },
    ]);
  });

  it("subscribe fires file-deleted on delete", () => {
    const fs = createVirtualFS(new Map([["a.ts", "code"]]));
    const events: FSEvent[] = [];
    fs.subscribe(event => events.push(event));

    fs.deleteFile("a.ts");

    expect(events).toEqual([{ type: "file-deleted", path: "a.ts" }]);
  });

  it("subscribe fires file-renamed on rename", () => {
    const fs = createVirtualFS(new Map([["a.ts", "code"]]));
    const events: FSEvent[] = [];
    fs.subscribe(event => events.push(event));

    fs.renameFile("a.ts", "b.ts");

    expect(events).toEqual([{ type: "file-renamed", oldPath: "a.ts", newPath: "b.ts" }]);
  });

  it("unsubscribe stops events from being delivered", () => {
    const fs = createVirtualFS(new Map());
    const listener = vi.fn();
    const unsubscribe = fs.subscribe(listener);

    fs.writeFile("a.ts", "code");
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();

    fs.writeFile("b.ts", "code2");
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
