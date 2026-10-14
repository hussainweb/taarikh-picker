import path from "node:path";
import { fileURLToPath } from "node:url";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vite-plus";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@taarikh/core": path.resolve(__dirname, "../core/src/index.ts"),
    },
  },
  pack: [
    {
      entry: ["src/index.ts"],
      format: ["esm"],
      target: "es2022",
      platform: "browser",
      dts: true,
      clean: true,
      sourcemap: true,
    },
    {
      entry: ["src/index.ts"],
      format: ["iife"],
      globalName: "TaarikhPicker",
      target: "es2022",
      platform: "browser",
      dts: false,
      clean: false,
      sourcemap: true,
      deps: {
        alwaysBundle: [/^@taarikh\/core/],
      },
    },
  ],
  test: {
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [{ browser: "chromium" }],
    },
    include: ["test/ui/**/*.test.ts"],
  },
});
