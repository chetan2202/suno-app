// The grocery list: add a product-for-member line, then needed and purchased sections.

import { el } from "../dom.js";
import type { ViewCtx } from "../context.js";
import { memberLabel } from "../context.js";
import type { GroceryItem } from "../../domain/types.js";
import { selectNeeded, selectPurchased } from "../../domain/reducer.js";

interface Pickable {
  name: string;
  unit: string;
}

function buildProductSelect(ctx: ViewCtx): { select: HTMLSelectElement; byId: Map<string, Pickable> } {
  const select = document.createElement("select");
  select.className = "field";
  const byId = new Map<string, Pickable>();
  for (const category of ctx.resolved) {
    const group = document.createElement("optgroup");
    group.label = category.name;
    for (const sub of category.subcategories) {
      for (const item of sub.items) {
        const opt = document.createElement("option");
        opt.value = item.id;
        opt.textContent = item.name;
        group.append(opt);
        byId.set(item.id, { name: item.name, unit: item.unit });
      }
    }
    if (group.childElementCount > 0) select.append(group);
  }
  return { select, byId };
}

function buildMemberSelect(ctx: ViewCtx): HTMLSelectElement {
  const select = document.createElement("select");
  select.className = "field";
  const shared = document.createElement("option");
  shared.value = "";
  shared.textContent = "Shared (whole house)";
  select.append(shared);
  for (const m of ctx.members) {
    const opt = document.createElement("option");
    opt.value = m.member_id;
    opt.textContent = m.display_name;
    select.append(opt);
  }
  return select;
}

function addForm(ctx: ViewCtx): HTMLElement {
  const { select: product, byId } = buildProductSelect(ctx);
  const member = buildMemberSelect(ctx);
  const qty = el("input", { class: "field qty", type: "number", value: 1, min: 1 });

  const form = el("form", {
    class: "add-form",
    onSubmit: (e) => {
      e.preventDefault();
      const id = product.value;
      const pick = byId.get(id);
      if (!pick) return;
      const quantity = Math.max(1, Number(qty.value) || 1);
      void ctx.actions.addItem({
        catalog_item_id: id,
        name: pick.name,
        for_member_id: member.value || null,
        quantity,
        unit: pick.unit,
      });
    },
  }, [
    product,
    member,
    qty,
    el("button", { class: "btn primary", type: "submit", text: "Add" }),
  ]);
  return form;
}

function memberTag(ctx: ViewCtx, item: GroceryItem): HTMLElement {
  const shared = item.for_member_id === null;
  return el("span", { class: shared ? "tag tag-shared" : "tag tag-member", text: memberLabel(ctx, item.for_member_id) });
}

function neededRow(ctx: ViewCtx, item: GroceryItem): HTMLElement {
  return el("li", { class: "row" }, [
    el("div", { class: "row-main" }, [
      el("span", { class: "row-name", text: item.name }),
      memberTag(ctx, item),
    ]),
    el("div", { class: "row-actions" }, [
      el("button", { class: "step", text: "-", "aria-label": "Decrease", onClick: () => void ctx.actions.setQuantity(item.item_id, Math.max(1, item.quantity - 1)) }),
      el("span", { class: "qty-label", text: `${item.quantity} ${item.unit}` }),
      el("button", { class: "step", text: "+", "aria-label": "Increase", onClick: () => void ctx.actions.setQuantity(item.item_id, item.quantity + 1) }),
      el("button", { class: "btn small ok", text: "Bought", onClick: () => void ctx.actions.togglePurchased(item) }),
      el("button", { class: "btn small danger", text: "x", "aria-label": "Delete", onClick: () => void ctx.actions.deleteItem(item.item_id) }),
    ]),
  ]);
}

function purchasedRow(ctx: ViewCtx, item: GroceryItem): HTMLElement {
  return el("li", { class: "row done" }, [
    el("div", { class: "row-main" }, [
      el("span", { class: "row-name", text: item.name }),
      memberTag(ctx, item),
      el("span", { class: "qty-label muted", text: `${item.quantity} ${item.unit}` }),
    ]),
    el("div", { class: "row-actions" }, [
      el("button", { class: "btn small", text: "Undo", onClick: () => void ctx.actions.togglePurchased(item) }),
      el("button", { class: "btn small danger", text: "x", "aria-label": "Delete", onClick: () => void ctx.actions.deleteItem(item.item_id) }),
    ]),
  ]);
}

export function renderList(ctx: ViewCtx): HTMLElement {
  const needed = selectNeeded(ctx.groceryState).sort((a, b) => a.name.localeCompare(b.name));
  const purchased = selectPurchased(ctx.groceryState).sort((a, b) => a.name.localeCompare(b.name));

  const hasProducts = ctx.resolved.some((c) => c.subcategories.some((s) => s.items.length > 0));

  return el("section", { class: "view" }, [
    hasProducts
      ? addForm(ctx)
      : el("p", { class: "empty", text: "No products yet. Add some in the Catalog tab." }),

    el("h2", { class: "section-title", text: `Needed (${needed.length})` }),
    needed.length === 0
      ? el("p", { class: "empty", text: "Nothing needed right now." })
      : el("ul", { class: "list" }, needed.map((i) => neededRow(ctx, i))),

    purchased.length > 0 && el("h2", { class: "section-title", text: `Purchased (${purchased.length})` }),
    purchased.length > 0 && el("ul", { class: "list" }, purchased.map((i) => purchasedRow(ctx, i))),
  ]);
}
