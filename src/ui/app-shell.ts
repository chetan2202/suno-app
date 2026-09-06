// Layer 1 — Presentation. Minimal app shell for the v0.1 scaffold.
// Full members + grocery-list UI lands in later v0.1 steps (plan.md). This just
// proves the toolchain builds and renders, and shows the loaded base catalog size.

interface BaseCatalog {
  version: number;
  source: string;
  items: Array<{ catalog_item_id: string; name: string }>;
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
    const catalog = (await res.json()) as BaseCatalog;
    status.textContent = `Base catalog loaded: ${catalog.items.length} products ready.`;
  } catch {
    status.textContent = "Could not load base catalog.";
  }
}
