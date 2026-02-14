/**
 * In-memory virtual filesystem for the playground editor.
 *
 * Provides file operations (read, write, delete, rename), directory listing,
 * bulk operations, and change notification via subscriptions.
 *
 * @see spec/playground/03-code-editor.md Section 13
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Events emitted when the filesystem changes. */
export type FSEvent =
  | { readonly type: "file-created"; readonly path: string }
  | { readonly type: "file-updated"; readonly path: string }
  | { readonly type: "file-deleted"; readonly path: string }
  | { readonly type: "file-renamed"; readonly oldPath: string; readonly newPath: string }
  | { readonly type: "bulk-update" };

/** Listener callback type for filesystem events. */
export type FSEventListener = (event: FSEvent) => void;

/** The public VirtualFS interface. */
export interface VirtualFS {
  readFile(path: string): string | undefined;
  writeFile(path: string, content: string): void;
  deleteFile(path: string): void;
  renameFile(oldPath: string, newPath: string): void;
  fileExists(path: string): boolean;
  listFiles(): readonly string[];
  listFiles(directory: string): readonly string[];
  getAll(): ReadonlyMap<string, string>;
  setAll(files: ReadonlyMap<string, string>): void;
  subscribe(listener: FSEventListener): () => void;
}

// ---------------------------------------------------------------------------
// Default workspace
// ---------------------------------------------------------------------------

const DEFAULT_MAIN_TS = `import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";

// 1. Define a port (interface contract)
interface Greeter {
  greet(name: string): string;
}

const GreeterPort = port<Greeter>()({ name: "Greeter" });

// 2. Create an adapter (implementation)
const greeterAdapter = createAdapter({
  provides: GreeterPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({
    greet: (name: string) => \`Hello, \${name}! Welcome to HexDI.\`,
  }),
});

// 3. Build the dependency graph
const graph = GraphBuilder.create()
  .provide(greeterAdapter)
  .build();

// 4. Create a container and resolve
const container = createContainer({ graph, name: "Playground" });
const greeter = container.resolve(GreeterPort);

console.log(greeter.greet("World"));
`;

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Creates a new VirtualFS instance, optionally pre-populated with files.
 * If no initial files are provided, the filesystem is populated with a
 * single `main.ts` containing a starter template.
 */
export function createVirtualFS(initialFiles?: ReadonlyMap<string, string>): VirtualFS {
  const files = new Map<string, string>(initialFiles ?? new Map([["main.ts", DEFAULT_MAIN_TS]]));

  const listeners = new Set<FSEventListener>();

  function notify(event: FSEvent): void {
    for (const listener of listeners) {
      listener(event);
    }
  }

  function readFile(path: string): string | undefined {
    return files.get(path);
  }

  function writeFile(path: string, content: string): void {
    const existed = files.has(path);
    files.set(path, content);
    notify(existed ? { type: "file-updated", path } : { type: "file-created", path });
  }

  function deleteFile(path: string): void {
    if (files.delete(path)) {
      notify({ type: "file-deleted", path });
    }
  }

  function renameFile(oldPath: string, newPath: string): void {
    const content = files.get(oldPath);
    if (content === undefined) {
      return;
    }
    files.delete(oldPath);
    files.set(newPath, content);
    notify({ type: "file-renamed", oldPath, newPath });
  }

  function fileExists(path: string): boolean {
    return files.has(path);
  }

  function listFiles(directory?: string): readonly string[] {
    const allPaths = [...files.keys()].sort();
    if (directory === undefined) {
      return allPaths;
    }
    const prefix = directory.endsWith("/") ? directory : `${directory}/`;
    return allPaths.filter(p => p.startsWith(prefix));
  }

  function getAll(): ReadonlyMap<string, string> {
    return new Map(files);
  }

  function setAll(newFiles: ReadonlyMap<string, string>): void {
    files.clear();
    for (const [path, content] of newFiles) {
      files.set(path, content);
    }
    notify({ type: "bulk-update" });
  }

  function subscribe(listener: FSEventListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  return {
    readFile,
    writeFile,
    deleteFile,
    renameFile,
    fileExists,
    listFiles,
    getAll,
    setAll,
    subscribe,
  };
}
