import "./styles.css";
import { registerSW } from "virtual:pwa-register";
import type { MasterCatalog } from "./domain/types.js";
import { openApp } from "./storage/index.js";
import { AppController } from "./ui/app.js";
import { APP_VERSION } from "./version.js";
import { advanceRequiredVersion, isUpdateRequired } from "./domain/version-gate.js";
import { renderForcedUpdate } from "./ui/views/update.js";

async function boot(): Promise<void> {
  const root = document.querySelector<HTMLDivElement>("#app");
  if (!root) return;

  // Register the service worker (offline + updates). registerType is 'prompt', so a new
  // version waits until applied. Capture updateSW to apply on demand.
  let controller: AppController | undefined;
  const updateSW = registerSW({
    onNeedRefresh() {
      controller?.showUpdateAvailable(() => void updateSW(true));
    },
  });

  try {
    const res = await fetch(`${import.meta.env.BASE_URL}catalog/base-catalog.json`);
    const base = (await res.json()) as MasterCatalog;
    const app = await openApp();

    // The admin device advances the household's required version to what it runs.
    // (v0.1: the sole device is the admin. v0.2 gates this to the owner role.)
    const settings = app.household.getSettings();
    const required = advanceRequiredVersion(settings.required_app_version, APP_VERSION);
    if (required !== settings.required_app_version) {
      await app.household.setRequiredVersion(required);
    }

    // Forced gate: a device older than the household requires cannot be used.
    if (isUpdateRequired(APP_VERSION, app.household.getSettings().required_app_version)) {
      root.replaceChildren(renderForcedUpdate(() => void updateSW(true)));
      return;
    }

    controller = new AppController(root, app, base);
    controller.mount();
  } catch (err) {
    root.textContent = "Could not start the app.";
    console.error(err);
  }
}

void boot();
