#!/usr/bin/env node
/**
 * Builds published presentations and copies their output into
 * website/static/presentations/<id>/ so Docusaurus serves them as-is.
 *
 * Usage: node scripts/build-presentations.mjs
 */

import { readFileSync, rmSync, mkdirSync, cpSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const config = JSON.parse(
  readFileSync(resolve(root, "website/presentations.json"), "utf8")
);

const published = config.filter((p) => p.published);

if (published.length === 0) {
  console.log("No published presentations to build.");
  process.exit(0);
}

const staticDir = resolve(root, "website/static/presentations");

// Clean previous build output
rmSync(staticDir, { recursive: true, force: true });
mkdirSync(staticDir, { recursive: true });

let failed = false;

for (const entry of published) {
  const appDir = resolve(root, entry.appPath);
  const base = `/hex-di/presentations/${entry.id}/`;
  const outDir = resolve(staticDir, entry.id);

  console.log(`\nBuilding "${entry.name}" (${entry.id})...`);
  console.log(`  appDir: ${appDir}`);
  console.log(`  base:   ${base}`);

  try {
    execSync(`pnpm vite build --base ${base}`, {
      cwd: appDir,
      stdio: "inherit",
    });

    const distDir = resolve(appDir, "dist");
    cpSync(distDir, outDir, { recursive: true });
    console.log(`  Copied dist → ${outDir}`);
  } catch (err) {
    console.error(`  Failed to build "${entry.name}":`, err.message);
    failed = true;
  }
}

if (failed) {
  console.error("\nSome presentations failed to build.");
  process.exit(1);
}

console.log(`\nAll ${published.length} presentations built successfully.`);
