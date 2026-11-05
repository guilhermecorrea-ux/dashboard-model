import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  build: { assetsInlineLimit: 32768 },
  // O CSS dos componentes vem direto de ../design-system (fonte única do visual).
  server: { host: true, port: 5173, fs: { allow: [".."] } },
});
