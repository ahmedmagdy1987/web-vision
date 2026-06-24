import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/unit/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // The `server-only` marker throws when imported outside the react-server
      // condition; stub it so server modules can be unit-tested in node.
      "server-only": path.resolve(__dirname, "./tests/stubs/empty-module.ts"),
    },
  },
});
