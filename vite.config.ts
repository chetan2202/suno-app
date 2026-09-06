import { defineConfig } from "vitest/config";

// The app is served from a GitHub Pages project path:
//   https://chetan2202.github.io/suno-app/
// so asset URLs must be relative to that base.
export default defineConfig({
  base: "/suno-app/",
  build: {
    outDir: "dist",
    target: "es2022",
  },
  test: {
    environment: "node",
  },
});
