/**
 * Type inference tests for generated playground type definitions.
 *
 * Uses the TypeScript compiler API to verify that the generated .d.ts
 * bundles produce correct type inference when used together — specifically
 * that types flow correctly across @hex-di/core, @hex-di/graph, and
 * @hex-di/runtime module boundaries.
 *
 * This catches the real user-facing bug: `container.resolve(GreeterPort)`
 * returning `unknown` instead of `Greeter`.
 */

import { describe, it, expect } from "vitest";
import ts from "typescript";
import { typeDefinitions } from "../../src/editor/type-definitions.js";

/**
 * Compiler options matching the playground's Monaco configuration exactly.
 * @see src/editor/editor-config.ts TS_COMPILER_OPTIONS
 * @see src/editor/language-service.ts configureLanguageService
 */
const COMPILER_OPTIONS: ts.CompilerOptions = {
  strict: true,
  noEmit: true,
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Node10,
  esModuleInterop: true,
  skipLibCheck: true,
  lib: ["lib.es2022.d.ts"],
};

/** Resolve the real TypeScript lib directory using ts.sys (no Node.js imports needed). */
const TS_LIB_DIR = ts.getDefaultLibFilePath(COMPILER_OPTIONS).replace(/[/\\][^/\\]+$/, "");

function readLibFile(fileName: string): string | undefined {
  const libName = fileName.startsWith("/") ? fileName.slice(1) : fileName;
  return ts.sys.readFile(`${TS_LIB_DIR}/${libName}`) ?? undefined;
}

/**
 * Build a CompilerHost that serves virtual files + real TypeScript lib files.
 */
function createCompilerHost(virtualFiles: Map<string, string>): ts.CompilerHost {
  return {
    getSourceFile(fileName, languageVersion) {
      const virtual = virtualFiles.get(fileName);
      if (virtual !== undefined) {
        return ts.createSourceFile(fileName, virtual, languageVersion);
      }
      if (fileName.startsWith("/lib.") || fileName.includes("lib.")) {
        const content = readLibFile(fileName);
        if (content !== undefined) {
          return ts.createSourceFile(fileName, content, languageVersion);
        }
      }
      return undefined;
    },
    getDefaultLibFileName: () => `/lib.es2022.full.d.ts`,
    writeFile: () => {},
    getCurrentDirectory: () => "/",
    getCanonicalFileName: f => f,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => "\n",
    fileExists(f) {
      if (virtualFiles.has(f)) return true;
      if (f.startsWith("/lib.") || f.includes("lib.")) {
        return readLibFile(f) !== undefined;
      }
      return false;
    },
    readFile(f) {
      return (
        virtualFiles.get(f) ??
        (f.startsWith("/lib.") || f.includes("lib.") ? readLibFile(f) : undefined)
      );
    },
  };
}

/** Build the virtual file system from generated type definitions + user code. */
function buildVirtualFiles(
  userCode: string,
  transform?: (dts: string) => string
): Map<string, string> {
  const files = new Map<string, string>();
  for (const [packageName, dts] of typeDefinitions) {
    files.set(`/node_modules/${packageName}/index.d.ts`, transform ? transform(dts) : dts);
  }
  files.set("/main.ts", userCode);
  return files;
}

/** Compile user code against generated type definitions and return diagnostics. */
function compilePlayground(
  userCode: string,
  transform?: (dts: string) => string
): readonly ts.Diagnostic[] {
  const files = buildVirtualFiles(userCode, transform);
  const host = createCompilerHost(files);
  const program = ts.createProgram(["/main.ts"], COMPILER_OPTIONS, host);
  return ts.getPreEmitDiagnostics(program);
}

/** Get the type errors (not warnings) from compilation. */
function getTypeErrors(userCode: string, transform?: (dts: string) => string): string[] {
  const diagnostics = compilePlayground(userCode, transform);
  return diagnostics
    .filter(d => d.category === ts.DiagnosticCategory.Error)
    .map(d => ts.flattenDiagnosticMessageText(d.messageText, "\n"));
}

/** Get the inferred type of a variable in user code. */
function getInferredType(userCode: string, variableName: string): string {
  const files = buildVirtualFiles(userCode);
  const host = createCompilerHost(files);
  const program = ts.createProgram(["/main.ts"], COMPILER_OPTIONS, host);
  const checker = program.getTypeChecker();
  const sourceFile = program.getSourceFile("/main.ts")!;

  let inferredType = "<not found>";
  ts.forEachChild(sourceFile, function visit(node) {
    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.name.text === variableName) {
          const type = checker.getTypeAtLocation(decl);
          inferredType = checker.typeToString(type);
        }
      }
    }
    ts.forEachChild(node, visit);
  });

  return inferredType;
}

// ---------------------------------------------------------------------------
// Shared test code snippets
// ---------------------------------------------------------------------------

const BASIC_EXAMPLE = `
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";

interface Greeter {
  greet(name: string): string;
}

const GreeterPort = port<Greeter>()({ name: "Greeter" });

const greeterAdapter = createAdapter({
  provides: GreeterPort,
  factory: () => ({
    greet: (name: string) => \`Hello, \${name}!\`,
  }),
  lifetime: "singleton",
});

const graph = GraphBuilder.create()
  .provide(greeterAdapter)
  .build();

const container = createContainer({ graph, name: "BasicExample" });
const greeter = container.resolve(GreeterPort);
greeter.greet("World");
`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("playground type inference", () => {
  it("container.resolve(GreeterPort) infers Greeter, not unknown", () => {
    const greeterType = getInferredType(BASIC_EXAMPLE, "greeter");
    expect(greeterType).not.toBe("unknown");
    expect(greeterType).not.toBe("never");
    expect(greeterType).toContain("Greeter");
  });

  it("port<Greeter>() produces DirectedPort with Greeter, not unknown", () => {
    const code = `
import { port } from "@hex-di/core";

interface Greeter {
  greet(name: string): string;
}

const GreeterPort = port<Greeter>()({ name: "Greeter" });
`;

    const portType = getInferredType(code, "GreeterPort");
    expect(portType).not.toContain("unknown");
    expect(portType).toContain("Greeter");
  });

  it("basic playground example compiles without type errors", () => {
    expect(getTypeErrors(BASIC_EXAMPLE)).toEqual([]);
  });

  it("createAdapter and GraphBuilder.provide() are type-compatible across modules", () => {
    const code = `
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";

interface Logger {
  log(msg: string): void;
}

const LoggerPort = port<Logger>()({ name: "Logger" });

const loggerAdapter = createAdapter({
  provides: LoggerPort,
  factory: () => ({ log: (msg: string) => {} }),
  lifetime: "singleton",
});

const graph = GraphBuilder.create().provide(loggerAdapter).build();
`;

    expect(getTypeErrors(code)).toEqual([]);
  });

  it("InferService extracts correct type from cross-module port in resolve", () => {
    const code = `
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";

interface MyService {
  execute(): number;
}

const MyPort = port<MyService>()({ name: "MyService" });

const adapter = createAdapter({
  provides: MyPort,
  factory: () => ({ execute: () => 42 }),
  lifetime: "singleton",
});

const graph = GraphBuilder.create().provide(adapter).build();
const container = createContainer({ graph, name: "Test" });
const svc = container.resolve(MyPort);

// If svc is correctly typed as MyService, this compiles.
// If svc is unknown, this fails.
const result: number = svc.execute();
`;

    expect(getTypeErrors(code)).toEqual([]);
  });

  it("regression: computed symbol brand keys break cross-module inference", () => {
    // Revert the normalization: re-introduce `declare const __brand: unique symbol;`
    // and convert string brand properties back to computed symbol properties.
    // This proves the normalization is necessary for cross-module inference.
    const restoreComputedBrands = (dts: string): string => {
      // Add a unique symbol declaration at the start of the module body
      let result = dts.replace(
        /^(declare module "[^"]+" \{)\n/m,
        "$1\ndeclare const __brand: unique symbol;\n"
      );
      // Convert `readonly __brand:` back to `readonly [__brand]:`
      result = result.replace(/readonly __brand([:?])/g, "readonly [__brand]$1");
      return result;
    };

    const errors = getTypeErrors(BASIC_EXAMPLE, restoreComputedBrands);
    expect(errors.length).toBeGreaterThan(0);
  });
});
