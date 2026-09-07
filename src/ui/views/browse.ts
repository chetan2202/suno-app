// Browse to add: a grid of category tiles, then product tiles with an Add button that
// opens a bottom sheet to pick the member and quantity.

import { el } from "../dom.js";
import type { ViewCtx } from "../context.js";
import { categoryIcon, itemIcon } from "../../domain/icons.js";
import { icon, type IconName } from "../icon.js";

function categoryGrid(ctx: ViewCtx): HTMLElement {
  const tiles = ctx.resolved.map((c) =>
    el("button", { class: "tile", onClick: () => ctx.actions.selectCategory(c.id) }, [
      el("span", { class: "tile-icon" }, [icon(categoryIcon(c.id) as IconName, 28)]),
      el("span", { class: "tile-name", text: c.name }),
    ]),
  );
  return el("section", { class: "view" }, [
    ctx.resolved.length === 0
      ? el("p", { class: "empty", text: "No products. Add some in Menu → Catalog." })
      : el("div", { class: "grid" }, tiles),
  ]);
}

function productGrid(ctx: ViewCtx, categoryId: string): HTMLElement {
  const category = ctx.resolved.find((c) => c.id === categoryId);
  if (!category) return categoryGrid(ctx);

  const tiles = category.subcategories.flatMap((sub) =>
    sub.items.map((item) =>
      el("button", {
        class: "tile",
        onClick: () => ctx.actions.openAddSheet({ id: item.id, name: item.name, unit: item.unit, categoryId }),
      }, [
        el("span", { class: "tile-icon" }, [icon(itemIcon(item.id, categoryId) as IconName, 28)]),
        el("span", { class: "tile-name", text: item.name }),
        el("span", { class: "tile-add", text: "Add" }),
      ]),
    ),
  );

  return el("section", { class: "view" }, [
    el("div", { class: "screen-head" }, [
      el("button", { class: "icon-btn", "aria-label": "Back", onClick: () => ctx.actions.selectCategory(null) }, [icon("back", 22)]),
      el("span", { class: "screen-head-icon" }, [icon(categoryIcon(categoryId) as IconName, 24)]),
      el("h2", { class: "screen-title", text: category.name }),
    ]),
    el("div", { class: "grid" }, tiles),
  ]);
}

export function renderBrowse(ctx: ViewCtx): HTMLElement {
  return ctx.browseCategoryId ? productGrid(ctx, ctx.browseCategoryId) : categoryGrid(ctx);
}

/** Bottom sheet to add the chosen product for a member + quantity. */
export function renderAddSheet(ctx: ViewCtx): HTMLElement | null {
  const item = ctx.addSheetItem;
  if (!item) return null;

  let memberId: string | null = null;
  let quantity = 1;

  const chip = (id: string | null, label: string) => {
    const b = el("button", { class: `chip ${memberId === id ? "chip-active" : ""}`, text: label, onClick: () => {
      memberId = id;
      sheet.querySelectorAll(".chip").forEach((c) => c.classList.remove("chip-active"));
      b.classList.add("chip-active");
    } });
    return b;
  };

  const qtyLabel = el("span", { class: "qty-label", text: `1 ${item.unit}` });
  const dec = el("button", { class: "step", "aria-label": "Decrease", onClick: () => { quantity = Math.max(1, quantity - 1); qtyLabel.textContent = `${quantity} ${item.unit}`; } }, [icon("minus", 18)]);
  const inc = el("button", { class: "step", "aria-label": "Increase", onClick: () => { quantity += 1; qtyLabel.textContent = `${quantity} ${item.unit}`; } }, [icon("plus", 18)]);

  const chips = [chip(null, "Shared"), ...ctx.members.map((m) => chip(m.member_id, m.display_name))];

  const sheet = el("div", { class: "sheet" }, [
    el("div", { class: "sheet-grab" }),
    el("div", { class: "sheet-title" }, [
      el("span", { class: "row-icon" }, [icon(itemIcon(item.id, item.categoryId) as IconName, 22)]),
      el("span", { text: item.name }),
    ]),
    el("span", { class: "field-label", text: "For whom?" }),
    el("div", { class: "chips-wrap" }, chips),
    el("span", { class: "field-label", text: "Quantity" }),
    el("div", { class: "qty-row" }, [dec, qtyLabel, inc]),
    el("div", { class: "sheet-actions" }, [
      el("button", { class: "btn ghost", text: "Cancel", onClick: () => ctx.actions.closeAddSheet() }),
      el("button", { class: "btn primary", text: "Add to list", onClick: () => void ctx.actions.addItem({
        catalog_item_id: item.id,
        name: item.name,
        for_member_id: memberId,
        quantity,
        unit: item.unit,
      }) }),
    ]),
  ]);

  return el("div", { class: "sheet-backdrop", onClick: (e) => { if (e.target === e.currentTarget) ctx.actions.closeAddSheet(); } }, [sheet]);
}
