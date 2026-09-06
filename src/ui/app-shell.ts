// Layer 1 — Presentation. Minimal app shell for the v0.1 scaffold.
// Full members + grocery-list UI lands in later v0.1 steps (plan.md). This just
// proves the toolchain builds and renders, and reports the loaded master catalog.

import type { MasterCatalog } from "../domain/types.js";

function countItems(catalog: MasterCatalog): number {
  let n = 0;
  for (const category of catalog.categories) {
    for (const sub of category.subcategories) {
      n += sub.items.length;
    }
  }
  return n;
}

export async function renderAppShell(root: HTMLElement): Promise<void> {
  root.innerHTML = `
    <header class="app-header">
      <h1>Family Grocery</h1>
      <p class="tagline">Local-first &middot; offline &middot; no accounts</p>
    </header>
    <main class="app-main">
      <p id="status">Loading catalog&hellip;</p>
    </main>
  `;

  const status = root.querySelector<HTMLParagraphElement>("#status");
  if (!status) return;

  try {
    const res = await fetch(`${import.meta.env.BASE_URL}catalog/base-catalog.json`);
    const catalog = (await res.json()) as MasterCatalog;
    const profiles = catalog.profiles.map((p) => p.name).join(" / ");
    status.textContent =
      `Master catalog loaded: ${catalog.categories.length} categories, ` +
      `${countItems(catalog)} products. Profiles: ${profiles}.`;
  } catch {
    status.textContent = "Could not load master catalog.";
  }
}
