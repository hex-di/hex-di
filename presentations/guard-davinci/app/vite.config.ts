import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4202,
    open: true,
  },
  build: {
    sourcemap: true,
  },
});
