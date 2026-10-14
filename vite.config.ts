import path from "node:path";
import { fileURLToPath } from "node:url";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vite-plus";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@taarikh/core": path.resolve(__dirname, "packages/core/src/index.ts"),
    },
  },
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["packages/core/test/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        test: {
          name: "browser",
          include: ["packages/picker/test/**/*.test.ts"],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
  fmt: {
    ignorePatterns: [
      "dist/**",
      "packages/*/dist/**",
      ".beads/**",
      ".agents/**",
      ".claude/**",
      ".codex/**",
      ".cursor/**",
    ],
  },
  lint: {
    ignorePatterns: ["dist/**", "packages/*/dist/**", ".beads/**", ".agents/**"],
  },
});
