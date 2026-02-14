/**
 * Compilation Pipeline
 *
 * Converts TypeScript source files into executable JavaScript using esbuild-wasm.
 * Handles virtual filesystem resolution, externalization of @hex-di/* packages,
 * and inline source map generation.
 *
 * @packageDocumentation
 */

import * as esbuild from "esbuild-wasm";
import type { CompilationResult, CompilationError } from "./worker-protocol.js";

// =============================================================================
// Module State
// =============================================================================

let initialized = false;

/**
 * External packages that are pre-bundled in the worker and should not be
 * included in the compilation output.
 */
const HEX_DI_EXTERNALS = [
  "@hex-di/core",
  "@hex-di/graph",
  "@hex-di/runtime",
  "@hex-di/result",
  "@hex-di/flow",
  "@hex-di/store",
  "@hex-di/query",
  "@hex-di/saga",
  "@hex-di/tracing",
  "@hex-di/logger",
] as const;

// =============================================================================
// Environment Detection
// =============================================================================

/**
 * Detect whether we're running in a Node.js-like environment.
 * In Node.js, esbuild-wasm auto-initializes and doesn't need wasmURL.
 *
 * Uses the Function constructor to safely check for process.versions.node
 * without TypeScript errors from the DOM-only type environment.
 */
function isNodeEnvironment(): boolean {
  try {
    const fn = new Function(
      "return typeof process !== 'undefined' && " +
        "typeof process.versions === 'object' && " +
        "typeof process.versions.node === 'string'"
    );
    return fn() === true;
  } catch {
    return false;
  }
}

// =============================================================================
// Initialization
// =============================================================================

/**
 * Initialize esbuild-wasm. Safe to call multiple times; only the first
 * call performs initialization.
 *
 * In Node.js environments, esbuild auto-initializes and this is a no-op.
 * In browser environments, this initializes the WASM module with the provided URL.
 *
 * @param wasmURL - URL to the esbuild.wasm file. Defaults to "/esbuild.wasm".
 */
export async function initializeCompiler(wasmURL = "/esbuild.wasm"): Promise<void> {
  if (initialized) {
    return;
  }

  // In Node.js, esbuild-wasm works without explicit initialization
  if (isNodeEnvironment()) {
    initialized = true;
    return;
  }

  await esbuild.initialize({
    wasmURL,
    worker: true,
  });
  initialized = true;
}

/**
 * Check whether the compiler has been initialized.
 */
export function isCompilerInitialized(): boolean {
  return initialized;
}

/**
 * Reset the initialization state. For testing purposes only.
 */
export function resetCompilerState(): void {
  initialized = false;
}

// =============================================================================
// Compilation
// =============================================================================

/**
 * Compile user TypeScript files into a single bundled JavaScript string.
 *
 * @param files - Map of file paths to their source content
 * @param entryPoint - The entry point file path (must exist in `files`)
 * @returns CompilationResult with bundled code or error details
 */
export async function compile(
  files: ReadonlyMap<string, string>,
  entryPoint: string
): Promise<CompilationResult> {
  if (!initialized) {
    await initializeCompiler();
  }

  try {
    const result = await esbuild.build({
      entryPoints: [entryPoint],
      bundle: true,
      write: false,
      format: "esm",
      target: "es2022",
      platform: "browser",
      sourcemap: "inline",
      loader: {
        ".ts": "ts",
        ".tsx": "tsx",
      },
      plugins: [virtualFSPlugin(files)],
      external: [...HEX_DI_EXTERNALS],
      logLevel: "silent",
    });

    if (result.errors.length > 0) {
      return {
        success: false,
        errors: result.errors.map(mapEsbuildError),
        code: undefined,
      };
    }

    const outputFile = result.outputFiles?.[0];
    if (outputFile === undefined) {
      return {
        success: false,
        errors: [{ file: entryPoint, line: 0, column: 0, message: "No output produced" }],
        code: undefined,
      };
    }

    return {
      success: true,
      errors: [],
      code: rewriteExternalImports(outputFile.text),
    };
  } catch (error: unknown) {
    // esbuild throws BuildFailure with .errors array
    const errors = extractBuildErrors(error);
    if (errors !== undefined) {
      return {
        success: false,
        errors: errors.map(mapEsbuildError),
        code: undefined,
      };
    }
    return {
      success: false,
      errors: [
        {
          file: entryPoint,
          line: 0,
          column: 0,
          message: error instanceof Error ? error.message : String(error),
        },
      ],
      code: undefined,
    };
  }
}

// =============================================================================
// External Import Rewriting
// =============================================================================

/**
 * Rewrite `@hex-di/*` import statements in compiled ESM output to use
 * a global module registry (`globalThis.__hexModules`).
 *
 * This allows the compiled code to execute in a Web Worker where bare
 * specifiers cannot be resolved. The worker pre-loads hex-di packages
 * and makes them available via `globalThis.__hexModules`.
 *
 * Handles both single-line and multi-line esbuild output patterns:
 * - Named:    `import { X, Y } from "@hex-di/core";`
 * - Namespace: `import * as X from "@hex-di/core";`
 * - Default:  `import X from "@hex-di/core";`
 * - Side-effect: `import "@hex-di/core";`
 */
export function rewriteExternalImports(code: string): string {
  // Named imports (single-line or multi-line):
  // import { X, Y as Z } from "@hex-di/core";
  // import {\n  X,\n  Y\n} from "@hex-di/core";
  let result = code.replace(
    /import\s*\{([\s\S]*?)\}\s*from\s*["'](@hex-di\/[^"']+)["']\s*;?/g,
    (_match, names: string, pkg: string) => {
      // Normalize whitespace: collapse multi-line names to single-line
      const cleaned = names.replace(/\s+/g, " ").trim();
      return `const { ${cleaned} } = globalThis.__hexModules["${pkg}"];`;
    }
  );

  // Namespace import: import * as X from "@hex-di/core";
  result = result.replace(
    /import\s*\*\s*as\s+(\w+)\s+from\s*["'](@hex-di\/[^"']+)["']\s*;?/g,
    (_match, name: string, pkg: string) => `const ${name} = globalThis.__hexModules["${pkg}"];`
  );

  // Default import: import X from "@hex-di/core";
  result = result.replace(
    /import\s+(\w+)\s+from\s*["'](@hex-di\/[^"']+)["']\s*;?/g,
    (_match, name: string, pkg: string) =>
      `const ${name} = globalThis.__hexModules["${pkg}"]?.default ?? globalThis.__hexModules["${pkg}"];`
  );

  // Side-effect import: import "@hex-di/core";
  result = result.replace(
    /import\s*["'](@hex-di\/[^"']+)["']\s*;?/g,
    (_match, pkg: string) => `/* side-effect import: ${pkg} */`
  );

  return result;
}

// =============================================================================
// Virtual Filesystem Plugin
// =============================================================================

/**
 * esbuild plugin that resolves imports against a virtual filesystem.
 *
 * Resolution order for relative imports:
 * 1. Exact path match
 * 2. Path with `.ts` extension
 * 3. Path with `.tsx` extension
 * 4. Path with `/index.ts` appended
 */
export function virtualFSPlugin(files: ReadonlyMap<string, string>): esbuild.Plugin {
  return {
    name: "virtual-fs",
    setup(build) {
      // Entry point resolution (non-relative, non-package imports)
      build.onResolve({ filter: /^[^.]/ }, args => {
        // Check if it's in the virtual FS (entry point)
        if (files.has(args.path)) {
          return { path: args.path, namespace: "virtual" };
        }
        // Let esbuild handle external packages
        return undefined;
      });

      // Resolve relative imports to virtual files
      build.onResolve({ filter: /^\./ }, args => {
        const resolved = resolveRelativePath(args.importer, args.path);
        const candidates = [resolved, `${resolved}.ts`, `${resolved}.tsx`, `${resolved}/index.ts`];
        for (const candidate of candidates) {
          if (files.has(candidate)) {
            return { path: candidate, namespace: "virtual" };
          }
        }
        return {
          errors: [{ text: `Cannot resolve "${args.path}" from "${args.importer}"` }],
        };
      });

      // Load virtual file contents
      build.onLoad({ filter: /.*/, namespace: "virtual" }, args => {
        const content = files.get(args.path);
        if (content === undefined) {
          return { errors: [{ text: `File not found: ${args.path}` }] };
        }
        const loader: esbuild.Loader = args.path.endsWith(".tsx") ? "tsx" : "ts";
        return { contents: content, loader };
      });
    },
  };
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Resolve a relative path against an importer path.
 */
function resolveRelativePath(importer: string, relativePath: string): string {
  // Get the directory of the importer
  const lastSlash = importer.lastIndexOf("/");
  const dir = lastSlash >= 0 ? importer.slice(0, lastSlash) : "";

  // Split the relative path into segments
  const segments = relativePath.split("/");
  const dirSegments = dir ? dir.split("/") : [];

  for (const segment of segments) {
    if (segment === ".") {
      continue;
    }
    if (segment === "..") {
      dirSegments.pop();
    } else {
      dirSegments.push(segment);
    }
  }

  return dirSegments.join("/");
}

/**
 * Map an esbuild message to our CompilationError type.
 */
function mapEsbuildError(msg: esbuild.Message): CompilationError {
  return {
    file: msg.location?.file ?? "",
    line: msg.location?.line ?? 0,
    column: msg.location?.column ?? 0,
    message: msg.text,
  };
}

/**
 * Extract esbuild Message array from a BuildFailure error, or return undefined.
 */
function extractBuildErrors(error: unknown): esbuild.Message[] | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }
  if (!("errors" in error)) {
    return undefined;
  }
  // After the 'in' check, TypeScript knows 'errors' is on the object
  const { errors } = error;
  if (!Array.isArray(errors)) {
    return undefined;
  }
  return errors;
}
