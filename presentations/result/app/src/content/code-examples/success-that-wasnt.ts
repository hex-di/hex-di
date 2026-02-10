import type { CodeExample } from "../../ports/code-examples.port.js";

export const example: CodeExample = {
  id: "success-that-wasnt",
  title: "The Success That Wasn't",
  before: {
    code: `async function downloadAllAssets(ids: string[]) {
  const results = await Promise.allSettled(
    ids.map((id) => downloadAsset(id))
  );

  // How many actually succeeded?
  const downloaded = results.filter(
    (r) => r.status === "fulfilled"
  );

  // We show success even if half failed:
  toast.success(
    \`Downloaded \${downloaded.length} assets!\`
  );

  // Failures? Silently ignored:
  const failed = results.filter(
    (r) => r.status === "rejected"
  );
  if (failed.length > 0) {
    console.error("Some downloads failed:", failed);
    // User never sees this
  }
}`,
    language: "typescript",
    filename: "download-assets.ts",
    highlights: [2, 12, 21],
    annotations: [
      { line: 2, text: "Promise.allSettled: errors are 'settled', not handled", type: "error" },
      { line: 12, text: "Success toast even when 3 of 5 failed", type: "error" },
      { line: 21, text: "console.error -- user never knows", type: "error" },
    ],
  },
  after: {
    code: `async function downloadAllAssets(ids: string[]) {
  const results = await Promise.all(
    ids.map((id) => downloadAssetResult(id))
  );
  return allSettled(...results).match(
    (paths) => ok(paths),
    (errors) => err(PartialSuccess({
      downloadedCount: ids.length - errors.length,
      failed: errors.map((e) => e.id),
    }))
  );
}
result.match(
  (paths) => toast.success(\`All \${paths.length} downloaded!\`),
  (error) => {
    if (error._tag === "PartialSuccess")
      toast.warn(\`\${error.downloadedCount} ok, \${error.failed.length} failed\`);
    else toast.error("Download failed completely");
  }
);`,
    language: "typescript",
    filename: "download-assets.ts",
    highlights: [1, 5, 13],
    annotations: [
      { line: 1, text: "Return type signals: all or partial", type: "ok" },
      { line: 5, text: "allSettled collects ALL errors, no short-circuit", type: "ok" },
      { line: 13, text: "match() gates the toast on real outcome", type: "ok" },
    ],
  },
};
