import "./styles.css";
import type { MasterCatalog } from "./domain/types.js";
import { openApp } from "./storage/index.js";
import { AppController } from "./ui/app.js";

async function boot(): Promise<void> {
  const root = document.querySelector<HTMLDivElement>("#app");
  if (!root) return;
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}catalog/base-catalog.json`);
    const base = (await res.json()) as MasterCatalog;
    const app = await openApp();
    new AppController(root, app, base).mount();
  } catch (err) {
    root.textContent = "Could not start the app.";
    console.error(err);
  }
}

void boot();
