import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";

// The app is served from a GitHub Pages project path:
//   https://chetan2202.github.io/suno-app/
// so asset URLs must be relative to that base.
const BASE = "/suno-app/";

export default defineConfig({
  base: BASE,
  plugins: [
    VitePWA({
      // 'prompt' so the app controls when to update (admin chooses), rather than
      // reloading silently. See src/main.ts and the update-gate mechanism.
      registerType: "prompt",
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png", "catalog/base-catalog.json"],
      manifest: {
        name: "Family Grocery",
        short_name: "Grocery",
        description: "Local-first family grocery list. Offline, no accounts.",
        start_url: BASE,
        scope: BASE,
        display: "standalone",
        orientation: "portrait",
        background_color: "#f4f5f3",
        theme_color: "#1f7a53",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,json,png,svg,ico,webmanifest}"],
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    outDir: "dist",
    target: "es2022",
  },
  test: {
    environment: "node",
  },
});
