// The grocery list: needed and purchased lines. Adding happens in the Browse tab.

import { el } from "../dom.js";
import type { ViewCtx } from "../context.js";
import { memberLabel } from "../context.js";
import type { GroceryItem } from "../../domain/types.js";
import { selectNeeded, selectPurchased } from "../../domain/reducer.js";
import { itemIcon } from "../../domain/icons.js";

function iconFor(item: GroceryItem): string {
  return itemIcon(item.catalog_item_id ?? "", "");
}

function memberTag(ctx: ViewCtx, item: GroceryItem): HTMLElement {
  const shared = item.for_member_id === null;
  return el("span", { class: shared ? "tag tag-shared" : "tag tag-member", text: memberLabel(ctx, item.for_member_id) });
}

function neededRow(ctx: ViewCtx, item: GroceryItem): HTMLElement {
  return el("li", { class: "row" }, [
    el("span", { class: "row-icon", text: iconFor(item) }),
    el("div", { class: "row-main" }, [
      el("span", { class: "row-name", text: item.name }),
      memberTag(ctx, item),
    ]),
    el("div", { class: "row-actions" }, [
      el("button", { class: "step", text: "−", "aria-label": "Decrease", onClick: () => void ctx.actions.setQuantity(item.item_id, Math.max(1, item.quantity - 1)) }),
      el("span", { class: "qty-label", text: `${item.quantity} ${item.unit}` }),
      el("button", { class: "step", text: "+", "aria-label": "Increase", onClick: () => void ctx.actions.setQuantity(item.item_id, item.quantity + 1) }),
      el("button", { class: "icon-btn ok", text: "✓", "aria-label": "Bought", onClick: () => void ctx.actions.togglePurchased(item) }),
      el("button", { class: "icon-btn danger", text: "🗑", "aria-label": "Delete", onClick: () => void ctx.actions.deleteItem(item.item_id) }),
    ]),
  ]);
}

function purchasedRow(ctx: ViewCtx, item: GroceryItem): HTMLElement {
  return el("li", { class: "row done" }, [
    el("span", { class: "row-icon", text: iconFor(item) }),
    el("div", { class: "row-main" }, [
      el("span", { class: "row-name", text: item.name }),
      memberTag(ctx, item),
      el("span", { class: "qty-label muted", text: `${item.quantity} ${item.unit}` }),
    ]),
    el("div", { class: "row-actions" }, [
      el("button", { class: "icon-btn", text: "↺", "aria-label": "Undo", onClick: () => void ctx.actions.togglePurchased(item) }),
      el("button", { class: "icon-btn danger", text: "🗑", "aria-label": "Delete", onClick: () => void ctx.actions.deleteItem(item.item_id) }),
    ]),
  ]);
}

export function renderList(ctx: ViewCtx): HTMLElement {
  const needed = selectNeeded(ctx.groceryState).sort((a, b) => a.name.localeCompare(b.name));
  const purchased = selectPurchased(ctx.groceryState).sort((a, b) => a.name.localeCompare(b.name));

  if (needed.length === 0 && purchased.length === 0) {
    return el("section", { class: "view" }, [
      el("div", { class: "empty-state" }, [
        el("span", { class: "empty-emoji", text: "🧾" }),
        el("p", { class: "empty-title", text: "Your list is empty" }),
        el("p", { class: "empty-sub", text: "Tap Browse to add what you need." }),
      ]),
    ]);
  }

  return el("section", { class: "view" }, [
    el("h2", { class: "section-title", text: `Needed (${needed.length})` }),
    needed.length === 0
      ? el("p", { class: "empty", text: "Nothing needed right now." })
      : el("ul", { class: "list" }, needed.map((i) => neededRow(ctx, i))),
    purchased.length > 0 && el("h2", { class: "section-title", text: `In the cart (${purchased.length})` }),
    purchased.length > 0 && el("ul", { class: "list" }, purchased.map((i) => purchasedRow(ctx, i))),
  ]);
}
