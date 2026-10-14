import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vite-plus";

export default defineConfig({
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
