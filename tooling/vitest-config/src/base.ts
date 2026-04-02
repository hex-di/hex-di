import { defineProject, defineConfig } from "vitest/config";
import type { UserProjectConfigExport, ViteUserConfigExport } from "vitest/config";
import {
  LIB_THRESHOLDS,
  CORE_THRESHOLDS,
  RESULT_THRESHOLDS,
  INTEGRATION_THRESHOLDS,
  TOOLING_THRESHOLDS,
} from "./presets.js";

interface LibConfigOptions {
  readonly typecheck?: boolean;
  readonly tsconfig?: string;
  readonly environment?: "node" | "jsdom";
  readonly testTimeout?: number;
  readonly setupFiles?: ReadonlyArray<string>;
  readonly benchmark?: boolean;
  readonly coverageExclude?: ReadonlyArray<string>;
  readonly coverageReporter?: ReadonlyArray<string>;
  readonly coverageInclude?: ReadonlyArray<string>;
}

interface TestConfig {
  passWithNoTests: boolean;
  include: string[];
  environment?: "node" | "jsdom";
  testTimeout?: number;
  setupFiles?: string[];
  typecheck?: {
    enabled: boolean;
    include: string[];
    tsconfig?: string;
  };
  coverage: {
    provider: "v8";
    reporter: string[];
    include?: string[];
    exclude?: string[];
    thresholds: typeof LIB_THRESHOLDS;
  };
  benchmark?: { include: string[]; reporters: "default"[] };
}

function buildTestConfig(
  options: LibConfigOptions = {},
  thresholds: typeof LIB_THRESHOLDS = LIB_THRESHOLDS
): TestConfig {
  const {
    typecheck = true,
    tsconfig,
    environment,
    testTimeout,
    setupFiles,
    benchmark = false,
    coverageExclude,
    coverageReporter,
    coverageInclude,
  } = options;

  const config: TestConfig = {
    passWithNoTests: true,
    include: ["tests/**/*.test.ts"],
    ...(environment && { environment }),
    ...(testTimeout && { testTimeout }),
    ...(setupFiles && { setupFiles: [...setupFiles] }),
    coverage: {
      provider: "v8",
      reporter: coverageReporter ? [...coverageReporter] : ["text", "json-summary", "lcov"],
      ...(coverageInclude && { include: [...coverageInclude] }),
      ...(coverageExclude && { exclude: [...coverageExclude] }),
      thresholds: { ...thresholds },
    },
  };

  if (typecheck) {
    config.typecheck = {
      enabled: true,
      include: ["tests/**/*.test-d.ts"],
      ...(tsconfig && { tsconfig }),
    };
  }

  if (benchmark) {
    config.benchmark = { include: ["tests/**/*.bench.ts"], reporters: ["default"] };
  }

  return config;
}

export function createLibConfig(options: LibConfigOptions = {}): UserProjectConfigExport {
  return defineProject({ test: buildTestConfig(options) });
}

interface ReactConfigOptions extends LibConfigOptions {
  readonly typecheckTsx?: boolean;
}

export function createReactConfig(options: ReactConfigOptions = {}): UserProjectConfigExport {
  const base = buildTestConfig({ environment: "jsdom", ...options });
  base.include = ["tests/**/*.test.ts", "tests/**/*.test.tsx"];
  if (options.typecheckTsx && base.typecheck) {
    base.typecheck.include = ["tests/**/*.test-d.ts", "tests/**/*.test-d.tsx"];
  }
  return defineProject({ test: base });
}

export function createCoreConfig(options: LibConfigOptions = {}): ViteUserConfigExport {
  const base = buildTestConfig(options);
  base.coverage.thresholds = { ...CORE_THRESHOLDS };
  if (!options.coverageReporter) {
    base.coverage.reporter = ["text", "json-summary", "html", "lcov"];
  }
  if (!options.coverageInclude) {
    base.coverage.include = ["src/**/*.ts"];
  }
  if (!options.coverageExclude) {
    base.coverage.exclude = ["src/**/*.test.ts", "src/**/*.test-d.ts", "src/**/index.ts"];
  }
  return defineConfig({ test: base });
}

export function createResultConfig(options: LibConfigOptions = {}): UserProjectConfigExport {
  const base = buildTestConfig(options);
  base.coverage.thresholds = { ...RESULT_THRESHOLDS };
  return defineProject({ test: base });
}

export function createReactResultConfig(options: ReactConfigOptions = {}): UserProjectConfigExport {
  const base = buildTestConfig({ environment: "jsdom", ...options });
  base.include = ["tests/**/*.test.ts", "tests/**/*.test.tsx"];
  if (options.typecheckTsx && base.typecheck) {
    base.typecheck.include = ["tests/**/*.test-d.ts", "tests/**/*.test-d.tsx"];
  }
  base.coverage.thresholds = { ...RESULT_THRESHOLDS };
  return defineProject({ test: base });
}

export function createIntegrationConfig(options: LibConfigOptions = {}): UserProjectConfigExport {
  return defineProject({ test: buildTestConfig(options, INTEGRATION_THRESHOLDS) });
}

export function createReactIntegrationConfig(
  options: ReactConfigOptions = {}
): UserProjectConfigExport {
  const base = buildTestConfig({ environment: "jsdom", ...options }, INTEGRATION_THRESHOLDS);
  base.include = ["tests/**/*.test.ts", "tests/**/*.test.tsx"];
  if (options.typecheckTsx && base.typecheck) {
    base.typecheck.include = ["tests/**/*.test-d.ts", "tests/**/*.test-d.tsx"];
  }
  return defineProject({ test: base });
}

export function createToolingConfig(options: LibConfigOptions = {}): UserProjectConfigExport {
  return defineProject({ test: buildTestConfig(options, TOOLING_THRESHOLDS) });
}

function buildReactToolingTestConfig(options: LibConfigOptions = {}) {
  const base = buildTestConfig({ environment: "jsdom", ...options }, TOOLING_THRESHOLDS);
  base.include = ["tests/**/*.test.ts", "tests/**/*.test.tsx"];
  return base;
}

export function createReactToolingConfig(options: LibConfigOptions = {}): UserProjectConfigExport {
  return defineProject({ test: buildReactToolingTestConfig(options) });
}

/** Returns raw config object for use with mergeConfig (e.g. when adding resolve.alias). */
export function getReactToolingConfigObject(options: LibConfigOptions = {}): {
  test: TestConfig;
} {
  return { test: buildReactToolingTestConfig(options) };
}
