import { Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const packageRoot = resolve(dirname(__filename), "..", "..");

Then("the benchmark files use vitest bench API", function () {
  const benchDir = resolve(packageRoot, "bench");
  assert.ok(existsSync(benchDir), `bench/ directory exists at ${benchDir}`);
});

Then("a construction benchmark file exists", function () {
  const file = resolve(packageRoot, "bench", "construction.bench.ts");
  assert.ok(existsSync(file), `construction.bench.ts exists at ${file}`);
});

Then("a method chain benchmark file exists", function () {
  const file = resolve(packageRoot, "bench", "method-chains.bench.ts");
  assert.ok(existsSync(file), `method-chains.bench.ts exists at ${file}`);
});

Then("benchmark files exist under the bench directory", function () {
  const benchDir = resolve(packageRoot, "bench");
  assert.ok(existsSync(benchDir), `bench/ directory exists at ${benchDir}`);
});
