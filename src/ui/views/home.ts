// The super-app home screen: a grid of module tiles. Each tile opens a module; more
// family modules can be added here over time.

import { el } from "../dom.js";
import type { ModuleId, ViewCtx } from "../context.js";

interface ModuleTile {
  id: ModuleId;
  icon: string;
  name: string;
  sub: string;
}

const MODULES: ModuleTile[] = [
  { id: "grocery", icon: "🛒", name: "Grocery", sub: "Shared family list" },
  { id: "todo", icon: "✅", name: "To-do", sub: "Tasks & reminders" },
];

export function renderHome(ctx: ViewCtx): HTMLElement {
  const tiles = MODULES.map((m) =>
    el("button", { class: "home-tile", onClick: () => ctx.actions.openModule(m.id) }, [
      el("span", { class: "home-tile-icon", text: m.icon }),
      el("span", { class: "home-tile-name", text: m.name }),
      el("span", { class: "home-tile-sub", text: m.sub }),
    ]),
  );
  return el("section", { class: "view" }, [el("div", { class: "home-grid" }, tiles)]);
}
