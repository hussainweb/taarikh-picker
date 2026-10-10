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
  fmt: {
    ignorePatterns: ["dist/**", ".beads/**", ".agents/**", ".claude/**", ".codex/**", ".cursor/**"],
  },
  lint: {
    ignorePatterns: ["dist/**", ".beads/**", ".agents/**"],
  },
});
