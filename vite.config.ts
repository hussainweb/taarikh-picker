import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: ["src/index.ts"],
    format: ["esm", "iife"],
    globalName: "TaarikhPicker",
    target: "es2022",
    platform: "browser",
    dts: true,
    clean: true,
    sourcemap: true,
  },
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["test/{engine,format}/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        test: {
          name: "browser",
          include: ["test/ui/**/*.test.ts"],
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
    ignorePatterns: ["dist/**", ".beads/**", ".agents/**", ".claude/**", ".codex/**", ".cursor/**"],
  },
  lint: {
    ignorePatterns: ["dist/**", ".beads/**", ".agents/**"],
  },
});
