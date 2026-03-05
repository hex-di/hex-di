import type { LoadContext, Plugin } from "@docusaurus/types";
import * as fs from "fs";
import * as path from "path";

interface PublishedConfig {
  readonly posts: ReadonlyArray<string>;
  readonly authors: Record<string, { name: string; url: string; image_url: string }>;
}

const BLOGS_SOURCE_DIR = path.resolve(__dirname, "../../../blogs/result");
const BLOG_TARGET_DIR = path.resolve(__dirname, "../blog");

function readPublishedConfig(): PublishedConfig {
  const configPath = path.join(BLOGS_SOURCE_DIR, "published.json");
  const raw = fs.readFileSync(configPath, "utf-8");
  return JSON.parse(raw);
}

function generateAuthorsYml(authors: PublishedConfig["authors"]): string {
  const lines: string[] = [];
  for (const [key, author] of Object.entries(authors)) {
    lines.push(`${key}:`);
    lines.push(`  name: ${author.name}`);
    lines.push(`  url: ${author.url}`);
    lines.push(`  image_url: ${author.image_url}`);
  }
  return lines.join("\n") + "\n";
}

function syncPosts(config: PublishedConfig): void {
  // Clean previously synced .md files (top-level only, not directories like 2026-02-27-welcome/)
  const existing = fs.readdirSync(BLOG_TARGET_DIR);
  for (const entry of existing) {
    const entryPath = path.join(BLOG_TARGET_DIR, entry);
    const stat = fs.statSync(entryPath);
    // Only remove top-level .md files (synced posts) and authors.yml
    if (stat.isFile() && entry.endsWith(".md")) {
      fs.unlinkSync(entryPath);
    }
  }

  // Copy published posts
  for (const post of config.posts) {
    const src = path.join(BLOGS_SOURCE_DIR, post);
    const dest = path.join(BLOG_TARGET_DIR, post);
    fs.copyFileSync(src, dest);
  }

  // Generate authors.yml (merge with existing authors from welcome post)
  const authorsYml = generateAuthorsYml(config.authors);
  // Read existing authors.yml to preserve entries not in published.json
  const existingAuthorsPath = path.join(BLOG_TARGET_DIR, "authors.yml");
  let existingContent = "";
  if (fs.existsSync(existingAuthorsPath)) {
    existingContent = fs.readFileSync(existingAuthorsPath, "utf-8");
  }

  // Build merged content: start with generated authors, append existing entries
  // that aren't already in the generated config
  const generatedKeys = new Set(Object.keys(config.authors));
  const existingLines = existingContent.split("\n");
  const extraLines: string[] = [];
  let currentKey: string | null = null;
  let skipBlock = false;

  for (const line of existingLines) {
    const topLevelMatch = line.match(/^(\S+):$/);
    if (topLevelMatch) {
      currentKey = topLevelMatch[1];
      skipBlock = generatedKeys.has(currentKey);
    }
    if (!skipBlock && currentKey !== null) {
      extraLines.push(line);
    }
  }

  const extraContent = extraLines.filter(l => l.trim() !== "").join("\n");
  const finalContent = extraContent ? authorsYml + "\n" + extraContent + "\n" : authorsYml;

  fs.writeFileSync(existingAuthorsPath, finalContent);
}

export default function blogSyncPlugin(_context: LoadContext): Plugin {
  return {
    name: "blog-sync",
    async loadContent() {
      const config = readPublishedConfig();
      syncPosts(config);
    },
  };
}
