// The grocery list: needed and done lines. Adding happens in the Browse tab.

import { el } from "../dom.js";
import type { ViewCtx } from "../context.js";
import { memberLabel } from "../context.js";
import type { GroceryItem, MasterCatalog } from "../../domain/types.js";
import { selectNeeded, selectDone } from "../../domain/reducer.js";
import { categoryIcon } from "../../domain/icons.js";
import { icon, type IconName } from "../icon.js";

/** Map a catalog product id to its category id, so a list row can show a category icon. */
function productCategoryMap(base: MasterCatalog): Map<string, string> {
  const map = new Map<string, string>();
  for (const c of base.categories) for (const s of c.subcategories) for (const i of s.items) map.set(i.id, c.id);
  return map;
}

function rowIcon(item: GroceryItem, catOf: Map<string, string>): SVGSVGElement {
  const categoryId = item.catalog_item_id ? catOf.get(item.catalog_item_id) ?? "" : "";
  return icon(categoryIcon(categoryId) as IconName, 22);
}

function memberTag(ctx: ViewCtx, item: GroceryItem): HTMLElement {
  const shared = item.for_member_id === null;
  return el("span", { class: shared ? "tag tag-shared" : "tag tag-member", text: memberLabel(ctx, item.for_member_id) });
}

function neededRow(ctx: ViewCtx, item: GroceryItem, catOf: Map<string, string>): HTMLElement {
  const isAdmin = ctx.settings.role === "admin";
  return el("li", { class: "row" }, [
    el("span", { class: "row-icon" }, [rowIcon(item, catOf)]),
    el("div", { class: "row-main" }, [
      el("span", { class: "row-name", text: item.name }),
      memberTag(ctx, item),
    ]),
    el("div", { class: "row-actions" }, [
      el("button", { class: "step", "aria-label": "Decrease", onClick: () => void ctx.actions.setQuantity(item.item_id, Math.max(1, item.quantity - 1)) }, [icon("minus", 18)]),
      el("span", { class: "qty-label", text: `${item.quantity} ${item.unit}` }),
      el("button", { class: "step", "aria-label": "Increase", onClick: () => void ctx.actions.setQuantity(item.item_id, item.quantity + 1) }, [icon("plus", 18)]),
      isAdmin && el("button", { class: "icon-btn ok", "aria-label": "Mark done", onClick: () => void ctx.actions.togglePurchased(item) }, [icon("check", 20)]),
      el("button", { class: "icon-btn danger", "aria-label": "Delete", onClick: () => void ctx.actions.deleteItem(item.item_id) }, [icon("trash", 20)]),
    ].filter((c): c is HTMLElement => c !== false)),
  ]);
}

function doneRow(ctx: ViewCtx, item: GroceryItem, catOf: Map<string, string>): HTMLElement {
  const isAdmin = ctx.settings.role === "admin";
  return el("li", { class: "row done" }, [
    el("span", { class: "row-icon" }, [rowIcon(item, catOf)]),
    el("div", { class: "row-main" }, [
      el("span", { class: "row-name", text: item.name }),
      memberTag(ctx, item),
      el("span", { class: "qty-label muted", text: `${item.quantity} ${item.unit}` }),
    ]),
    isAdmin && el("div", { class: "row-actions" }, [
      el("button", { class: "icon-btn", "aria-label": "Undo", onClick: () => void ctx.actions.togglePurchased(item) }, [icon("undo", 20)]),
      el("button", { class: "icon-btn danger", "aria-label": "Delete", onClick: () => void ctx.actions.deleteItem(item.item_id) }, [icon("trash", 20)]),
    ]),
  ]);
}

export function renderList(ctx: ViewCtx): HTMLElement {
  const catOf = productCategoryMap(ctx.base);
  const needed = selectNeeded(ctx.groceryState).sort((a, b) => a.name.localeCompare(b.name));
  const done = selectDone(ctx.groceryState, Date.now()).sort((a, b) => a.name.localeCompare(b.name));

  if (needed.length === 0 && done.length === 0) {
    return el("section", { class: "view" }, [
      el("div", { class: "empty-state" }, [
        el("span", { class: "empty-emoji" }, [icon("checklist", 40)]),
        el("p", { class: "empty-title", text: "Your list is empty" }),
        el("p", { class: "empty-sub", text: "Tap Browse to add what you need." }),
      ]),
    ]);
  }

  return el("section", { class: "view" }, [
    el("h2", { class: "section-title", text: `Needed (${needed.length})` }),
    needed.length === 0
      ? el("p", { class: "empty", text: "Nothing needed right now." })
      : el("ul", { class: "list" }, needed.map((i) => neededRow(ctx, i, catOf))),
    done.length > 0 && el("h2", { class: "section-title", text: `Done (${done.length})` }),
    done.length > 0 && el("ul", { class: "list" }, done.map((i) => doneRow(ctx, i, catOf))),
  ]);
}
