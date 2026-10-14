import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vite-plus";

export default defineConfig({
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
