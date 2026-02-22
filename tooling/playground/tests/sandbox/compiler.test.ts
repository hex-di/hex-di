// @vitest-environment node
import { describe, it, expect } from "vitest";
import { compile, virtualFSPlugin, rewriteExternalImports } from "../../src/sandbox/compiler.js";

describe("compile", () => {
  it("compiles single file to JavaScript", async () => {
    const files = new Map<string, string>([["main.ts", "const x: number = 42;\nconsole.log(x);"]]);

    const result = await compile(files, "main.ts");
    expect(result.success).toBe(true);
    expect(result.code).toBeDefined();
    expect(result.code).toContain("42");
    expect(result.errors).toHaveLength(0);
  });

  it("compiles multi-file resolves cross-file imports", async () => {
    const files = new Map<string, string>([
      ["main.ts", 'import { greet } from "./utils";\nconsole.log(greet("world"));'],
      ["utils.ts", "export function greet(name: string): string {\n  return `Hello, ${name}!`;\n}"],
    ]);

    const result = await compile(files, "main.ts");
    expect(result.success).toBe(true);
    expect(result.code).toBeDefined();
    expect(result.code).toContain("greet");
    expect(result.code).toContain("Hello");
    expect(result.errors).toHaveLength(0);
  });

  it("@hex-di/* imports remain external", async () => {
    const files = new Map<string, string>([
      [
        "main.ts",
        'import { createPort } from "@hex-di/core";\nconst p = createPort({ name: "Test" });\nconsole.log(p);',
      ],
    ]);

    const result = await compile(files, "main.ts");
    expect(result.success).toBe(true);
    expect(result.code).toBeDefined();
    // External imports should remain as import statements
    expect(result.code).toContain("@hex-di/core");
  });

  it("invalid TypeScript returns success: false with errors", async () => {
    const files = new Map<string, string>([
      // Syntax errors that esbuild will catch
      ["main.ts", "const x: number = {\n  unexpected end of input"],
    ]);

    const result = await compile(files, "main.ts");
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.code).toBeUndefined();
  });

  it("resolves .ts then .tsx then /index.ts", async () => {
    // Test .ts resolution
    const filesTs = new Map<string, string>([
      ["main.ts", 'import { a } from "./mod";\nconsole.log(a);'],
      ["mod.ts", "export const a = 1;"],
    ]);
    const resultTs = await compile(filesTs, "main.ts");
    expect(resultTs.success).toBe(true);

    // Test .tsx resolution
    const filesTsx = new Map<string, string>([
      ["main.ts", 'import { b } from "./comp";\nconsole.log(b);'],
      ["comp.tsx", "export const b = 2;"],
    ]);
    const resultTsx = await compile(filesTsx, "main.ts");
    expect(resultTsx.success).toBe(true);

    // Test /index.ts resolution
    const filesIndex = new Map<string, string>([
      ["main.ts", 'import { c } from "./lib";\nconsole.log(c);'],
      ["lib/index.ts", "export const c = 3;"],
    ]);
    const resultIndex = await compile(filesIndex, "main.ts");
    expect(resultIndex.success).toBe(true);
  });

  it("output includes inline source maps", async () => {
    const files = new Map<string, string>([["main.ts", "const x = 1;\nconsole.log(x);"]]);

    const result = await compile(files, "main.ts");
    expect(result.success).toBe(true);
    expect(result.code).toBeDefined();
    expect(result.code).toContain("//# sourceMappingURL=data:");
  });
});

describe("virtualFSPlugin", () => {
  it("creates a valid esbuild plugin", () => {
    const files = new Map<string, string>();
    const plugin = virtualFSPlugin(files);
    expect(plugin.name).toBe("virtual-fs");
    expect(plugin.setup).toBeTypeOf("function");
  });
});

describe("compile — result example templates", () => {
  it("compiles constructors-guards template with multi-import and rewrites correctly", async () => {
    const files = new Map<string, string>([
      [
        "main.ts",
        [
          "import {",
          "  ok, err,",
          "  fromNullable, fromPredicate, fromThrowable, tryCatch,",
          "  isResult, isResultAsync,",
          '} from "@hex-di/result";',
          'import type { Result } from "@hex-di/result";',
          "",
          'const nameResult = fromNullable("Alice", () => "missing");',
          "console.log(nameResult);",
        ].join("\n"),
      ],
    ]);

    const result = await compile(files, "main.ts");
    expect(result.success).toBe(true);
    expect(result.code).toBeDefined();
    // Verify imports were rewritten (no bare @hex-di imports remain)
    expect(result.code).not.toMatch(/import\s.*from\s*["']@hex-di/);
    // Verify the module registry lookup is present
    expect(result.code).toContain('globalThis.__hexModules["@hex-di/result"]');
    // Verify type-only import was stripped by esbuild
    expect(result.code).not.toContain("import type");
  });

  it("compiles multi-file example with re-exports and produces valid JS (no 'as' in destructuring)", async () => {
    // Reproduce the multi-library-composition scenario where ports/logger.ts
    // re-exports from @hex-di/logger, causing esbuild to emit aliased imports
    const files = new Map<string, string>([
      ["ports/logger.ts", `export { LoggerPort, type Logger } from "@hex-di/logger";`],
      ["ports/cache.ts", [
        `import { port } from "@hex-di/core";`,
        `export interface Cache { get(key: string): unknown; }`,
        `export const CachePort = port<Cache>()({ name: "Cache" });`,
      ].join("\n")],
      ["main.ts", [
        `import { createAdapter } from "@hex-di/core";`,
        `import { LoggerPort } from "./ports/logger";`,
        `import { CachePort } from "./ports/cache";`,
        `const a = createAdapter({ provides: CachePort, requires: [LoggerPort], factory: (d) => d, lifetime: "singleton" });`,
        `console.log(a);`,
      ].join("\n")],
    ]);

    const result = await compile(files, "main.ts");
    expect(result.success).toBe(true);
    expect(result.code).toBeDefined();
    // Must not contain 'as' in destructuring (would cause SyntaxError at runtime)
    expect(result.code).not.toMatch(/const\s*\{[^}]*\bas\b[^}]*\}/);
    // Must not contain bare import statements for @hex-di
    expect(result.code).not.toMatch(/import\s.*from\s*["']@hex-di/);
  });
});

describe("rewriteExternalImports", () => {
  it("rewrites single-line named import", () => {
    const code = `import { ok, err } from "@hex-di/result";\nconsole.log(ok(1));`;
    const result = rewriteExternalImports(code);
    expect(result).toContain(`const { ok, err } = globalThis.__hexModules["@hex-di/result"];`);
    expect(result).not.toContain(`import`);
  });

  it("rewrites multi-line named import", () => {
    const code = [
      "import {",
      "  ok,",
      "  err,",
      "  fromNullable,",
      "  fromPredicate",
      '} from "@hex-di/result";',
      "console.log(ok(1));",
    ].join("\n");
    const result = rewriteExternalImports(code);
    expect(result).toContain(`globalThis.__hexModules["@hex-di/result"]`);
    expect(result).toContain("ok");
    expect(result).toContain("err");
    expect(result).toContain("fromNullable");
    expect(result).toContain("fromPredicate");
    expect(result).not.toContain("import");
  });

  it("rewrites namespace import", () => {
    const code = `import * as Result from "@hex-di/result";\nconsole.log(Result);`;
    const result = rewriteExternalImports(code);
    expect(result).toContain(`const Result = globalThis.__hexModules["@hex-di/result"];`);
  });

  it("rewrites default import", () => {
    const code = `import Foo from "@hex-di/core";\nconsole.log(Foo);`;
    const result = rewriteExternalImports(code);
    expect(result).toContain(`globalThis.__hexModules["@hex-di/core"]`);
  });

  it("rewrites side-effect import", () => {
    const code = `import "@hex-di/core";\nconsole.log(1);`;
    const result = rewriteExternalImports(code);
    expect(result).toContain("side-effect import");
    expect(result).not.toMatch(/^import\s/m);
  });

  it("does not modify non-hex-di imports", () => {
    const code = `import { foo } from "some-lib";\nconsole.log(foo);`;
    const result = rewriteExternalImports(code);
    expect(result).toBe(code);
  });

  it("handles multiple hex-di imports in one file", () => {
    const code = [
      'import { ok } from "@hex-di/result";',
      'import { createPort } from "@hex-di/core";',
      "console.log(ok(1), createPort);",
    ].join("\n");
    const result = rewriteExternalImports(code);
    expect(result).toContain(`globalThis.__hexModules["@hex-di/result"]`);
    expect(result).toContain(`globalThis.__hexModules["@hex-di/core"]`);
    expect(result).not.toContain("import");
  });

  it("converts 'as' aliases to destructuring colons in named imports", () => {
    // esbuild renames bindings to avoid collisions in multi-file bundles:
    //   import { port as port2 } from "@hex-di/core";
    // The rewriter must convert `as` (import syntax) to `:` (destructuring syntax)
    const code = `import { port as port2, createAdapter } from "@hex-di/core";\nconsole.log(port2);`;
    const result = rewriteExternalImports(code);
    expect(result).toContain(`const { port: port2, createAdapter } = globalThis.__hexModules["@hex-di/core"];`);
    expect(result).not.toContain(" as ");
  });

  it("converts 'as' aliases in multi-line imports", () => {
    const code = [
      "import {",
      "  LoggerPort as LoggerPort2,",
      "  createConsoleLogger",
      '} from "@hex-di/logger";',
      "console.log(LoggerPort2);",
    ].join("\n");
    const result = rewriteExternalImports(code);
    expect(result).toContain("LoggerPort: LoggerPort2");
    expect(result).not.toContain(" as ");
  });

  it("handles real esbuild multi-line output with many imports", () => {
    // Simulate what esbuild produces for the constructors-guards example
    const code = [
      "import {",
      "  ok,",
      "  err,",
      "  fromNullable,",
      "  fromPredicate,",
      "  fromThrowable,",
      "  tryCatch,",
      "  isResult,",
      "  isResultAsync",
      '} from "@hex-di/result";',
      "",
      "// main.ts",
      "var rawData = new Map();",
    ].join("\n");
    const result = rewriteExternalImports(code);
    expect(result).toContain(`globalThis.__hexModules["@hex-di/result"]`);
    expect(result).not.toMatch(/^import\s/m);
    // Should have all the named exports
    expect(result).toContain("ok");
    expect(result).toContain("isResultAsync");
  });
});
