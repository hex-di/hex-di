#!/usr/bin/env node
/**
 * Runs a turbo task scoped to packages listed in publish.config.yaml.
 *
 * Usage: node scripts/turbo-publishable.mjs <task> [extra turbo flags...]
 *
 * Example:
 *   node scripts/turbo-publishable.mjs typecheck
 *   node scripts/turbo-publishable.mjs lint
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const yaml = readFileSync(resolve(root, "publish.config.yaml"), "utf8");
const packages = [];
let inPackages = false;
for (const line of yaml.split("\n")) {
  if (/^packages:/.test(line)) {
    inPackages = true;
    continue;
  }
  if (inPackages && /^\S/.test(line) && !/^packages:/.test(line)) {
    inPackages = false;
  }
  if (inPackages) {
    const m = line.match(/^\s+-\s+"?([^"#\s]+)"?/);
    if (m) packages.push(m[1]);
  }
}

const [task, ...extra] = process.argv.slice(2);
if (!task) {
  console.error("Usage: turbo-publishable.mjs <task> [extra flags...]");
  process.exit(1);
}

const filters = packages.map((p) => `--filter=${p}`).join(" ");
const cmd = `npx turbo ${task} ${filters} ${extra.join(" ")}`.trim();

try {
  execSync(cmd, { stdio: "inherit", cwd: root });
} catch {
  process.exit(1);
}
