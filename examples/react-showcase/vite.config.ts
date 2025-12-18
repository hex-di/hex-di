import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { devToolsPlugin } from "@hex-di/devtools-network/vite";

export default defineConfig({
  plugins: [
    react(),
    devToolsPlugin({ path: "/devtools", verbose: true }),
  ],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    sourcemap: true,
  },
});
