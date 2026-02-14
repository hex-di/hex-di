/**
 * Regression test: Chained dependency satisfaction in playground TypeScript environment.
 *
 * This test uses the same TypeScript compiler setup as the playground's Monaco
 * editor (generated type bundles + Node10 module resolution). It reproduces
 * the HEX008 false positive where adapters with transitive dependencies cause
 * "Missing adapters for UserRepo, Database" even when all adapters are provided.
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import ts from "typescript";
import { typeDefinitions } from "../../src/editor/type-definitions.js";

// ---------------------------------------------------------------------------
// Compiler setup (matching playground's Monaco config)
// ---------------------------------------------------------------------------

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

const TS_LIB_DIR = ts.getDefaultLibFilePath(COMPILER_OPTIONS).replace(/[/\\][^/\\]+$/, "");

function readLibFile(fileName: string): string | undefined {
  const libName = fileName.startsWith("/") ? fileName.slice(1) : fileName;
  return ts.sys.readFile(`${TS_LIB_DIR}/${libName}`) ?? undefined;
}

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

function buildVirtualFiles(userCode: string): Map<string, string> {
  const files = new Map<string, string>();
  for (const [packageName, dts] of typeDefinitions) {
    files.set(`/node_modules/${packageName}/index.d.ts`, dts);
  }
  files.set("/main.ts", userCode);
  return files;
}

function getTypeErrors(userCode: string): string[] {
  const files = buildVirtualFiles(userCode);
  const host = createCompilerHost(files);
  const program = ts.createProgram(["/main.ts"], COMPILER_OPTIONS, host);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  return diagnostics
    .filter(d => d.category === ts.DiagnosticCategory.Error)
    .map(d => ts.flattenDiagnosticMessageText(d.messageText, "\n"));
}

function getInferredType(userCode: string, variableName: string): string {
  const files = buildVirtualFiles(userCode);
  const host = createCompilerHost(files);
  const program = ts.createProgram(["/main.ts"], COMPILER_OPTIONS, host);
  const checker = program.getTypeChecker();
  const sourceFile = program.getSourceFile("/main.ts");
  if (!sourceFile) return "<source not found>";

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
// The exact user code from the playground dependency-graph example
// ---------------------------------------------------------------------------

const DEPENDENCY_GRAPH_EXAMPLE = `
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";

interface Config { readonly dbUrl: string; }
interface Logger { log(msg: string): void; }
interface Database { query(sql: string): string[]; }
interface UserRepo { findById(id: string): string; }
interface AuthService { authenticate(token: string): boolean; }

const ConfigPort = port<Config>()({ name: "Config" });
const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });
const UserRepoPort = port<UserRepo>()({ name: "UserRepo" });
const AuthServicePort = port<AuthService>()({ name: "AuthService" });

const configAdapter = createAdapter({
  provides: ConfigPort,
  factory: () => ({ dbUrl: "postgres://localhost/app" }),
  lifetime: "singleton",
});

const loggerAdapter = createAdapter({
  provides: LoggerPort,
  factory: () => ({ log: (_msg: string) => {} }),
  lifetime: "singleton",
});

const databaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [ConfigPort, LoggerPort],
  factory: ({ Config, Logger }) => {
    Logger.log(\`Connecting to \${Config.dbUrl}\`);
    return { query: (sql: string) => [\`result for: \${sql}\`] };
  },
  lifetime: "singleton",
});

const userRepoAdapter = createAdapter({
  provides: UserRepoPort,
  requires: [DatabasePort, LoggerPort],
  factory: ({ Database, Logger }) => ({
    findById: (id: string) => {
      Logger.log(\`Finding user \${id}\`);
      return Database.query(\`SELECT * FROM users WHERE id = '\${id}'\`)[0];
    },
  }),
  lifetime: "singleton",
});

const authServiceAdapter = createAdapter({
  provides: AuthServicePort,
  requires: [UserRepoPort, LoggerPort],
  factory: ({ UserRepo, Logger }) => ({
    authenticate: (token: string) => {
      Logger.log(\`Authenticating token: \${token}\`);
      const user = UserRepo.findById("user-1");
      return user !== undefined;
    },
  }),
  lifetime: "singleton",
});

const graph = GraphBuilder.create()
  .provide(configAdapter)
  .provide(loggerAdapter)
  .provide(databaseAdapter)
  .provide(userRepoAdapter)
  .provide(authServiceAdapter)
  .build();

const container = createContainer({ graph, name: "DependencyGraphExample" });
const auth = container.resolve(AuthServicePort);
const _result = auth.authenticate("abc123");
`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("chained dependency satisfaction in playground compiler", () => {
  it("dependency-graph example compiles without type errors", () => {
    const errors = getTypeErrors(DEPENDENCY_GRAPH_EXAMPLE);
    expect(errors).toEqual([]);
  });

  it("graph variable is inferred as Graph, not error string", () => {
    const graphType = getInferredType(DEPENDENCY_GRAPH_EXAMPLE, "graph");
    expect(graphType).not.toContain("ERROR");
    expect(graphType).not.toContain("Missing adapters");
  });

  it("auth variable is inferred as AuthService, not unknown", () => {
    const authType = getInferredType(DEPENDENCY_GRAPH_EXAMPLE, "auth");
    expect(authType).not.toBe("unknown");
    expect(authType).toContain("AuthService");
  });
});
