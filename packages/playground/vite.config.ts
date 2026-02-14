import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { createReadStream, statSync } from "node:fs";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "serve-esbuild-wasm",
      configureServer(server) {
        server.middlewares.use("/esbuild.wasm", (_req, res) => {
          const wasmPath = resolve(import.meta.dirname, "node_modules/esbuild-wasm/esbuild.wasm");
          try {
            const stat = statSync(wasmPath);
            res.setHeader("Content-Type", "application/wasm");
            res.setHeader("Content-Length", stat.size);
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
            createReadStream(wasmPath).pipe(res);
          } catch {
            res.statusCode = 404;
            res.end("esbuild.wasm not found");
          }
        });
      },
    },
  ],
  root: ".",
  server: {
    port: 3001,
    open: true,
  },
  build: {
    sourcemap: true,
  },
  worker: {
    format: "es",
  },
});
