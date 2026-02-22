#!/usr/bin/env node
/**
 * Validates that every package listed in publish.config.yaml has a README.md.
 *
 * Run by the pre-commit hook and CI lint job so that a publishable package
 * can never reach npm without basic documentation.
 */

import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { resolve, join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// Parse publish.config.yaml — extract the list under `packages:`
// ---------------------------------------------------------------------------
function readPublishablePackages() {
  const yaml = readFileSync(join(root, "publish.config.yaml"), "utf8");
  const names = [];
  let inPackages = false;
  for (const line of yaml.split("\n")) {
    if (/^packages:/.test(line)) { inPackages = true; continue; }
    if (inPackages && /^\S/.test(line) && !/^packages:/.test(line)) { inPackages = false; }
    if (inPackages) {
      const m = line.match(/^\s+-\s+"?([^"#\s]+)"?/);
      if (m) names.push(m[1]);
    }
  }
  return names;
}

// ---------------------------------------------------------------------------
// Expand a glob pattern (only `*` wildcards, no `**`) into real directories
// ---------------------------------------------------------------------------
function expandGlob(base, segments) {
  if (segments.length === 0) return [base];
  const [head, ...rest] = segments;
  if (head === "*") {
    let entries;
    try { entries = readdirSync(base); } catch { return []; }
    return entries
      .filter((name) => {
        try { return statSync(join(base, name)).isDirectory(); } catch { return false; }
      })
      .flatMap((name) => expandGlob(join(base, name), rest));
  }
  return expandGlob(join(base, head), rest);
}

// ---------------------------------------------------------------------------
// Build name → directory map from pnpm-workspace.yaml patterns + root
// ---------------------------------------------------------------------------
function buildPackageMap() {
  const yaml = readFileSync(join(root, "pnpm-workspace.yaml"), "utf8");
  const patterns = [];
  let inPackages = false;
  for (const line of yaml.split("\n")) {
    if (/^packages:/.test(line)) { inPackages = true; continue; }
    if (inPackages && /^\S/.test(line)) { inPackages = false; }
    if (inPackages) {
      const m = line.match(/^\s+-\s+"?([^"#\s]+)"?/);
      if (m) patterns.push(m[1]);
    }
  }

  const dirs = patterns.flatMap((p) => expandGlob(root, p.split("/")));

  // Also include the workspace root itself (e.g. the `hex-di` root package)
  dirs.push(root);

  const map = new Map();
  for (const dir of dirs) {
    const pkgPath = join(dir, "package.json");
    if (!existsSync(pkgPath)) continue;
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
      if (pkg.name) map.set(pkg.name, dir);
    } catch {
      // ignore malformed package.json
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const publishable = readPublishablePackages();
const packageMap = buildPackageMap();

let failed = false;

for (const pkgName of publishable) {
  const dir = packageMap.get(pkgName);
  if (!dir) {
    console.error(`  ✗  ${pkgName}: not found in workspace`);
    failed = true;
    continue;
  }
  const rel = dir.replace(root + "/", "") || "(root)";
  if (!existsSync(join(dir, "README.md"))) {
    console.error(`  ✗  ${pkgName} (${rel}): missing README.md`);
    failed = true;
  } else {
    console.log(`  ✓  ${pkgName}`);
  }
}

if (failed) {
  console.error(
    "\nEvery package listed in publish.config.yaml must have a README.md.\n" +
    "Add the missing file(s) and re-run the commit.\n"
  );
  process.exit(1);
}
