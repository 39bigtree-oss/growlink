import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.{test,spec}.ts", "src/**/*.{test,spec}.ts"],
    exclude: ["tests/e2e/**", "node_modules/**", ".next/**"],
  },
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      // server-only ガードはテストでは不要なので空モジュールに差し替える。
      { find: "server-only", replacement: path.resolve(__dirname, "./tests/shims/server-only.ts") },
    ],
  },
});
