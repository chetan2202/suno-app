// Admin catalog customization: choose the diet profile, include/exclude base
// categories and items, and add household custom products. Reused in onboarding
// (step 2) and the Catalog tab.

import { el } from "../dom.js";
import type { ViewCtx } from "../context.js";
import { profileDiets } from "../../domain/catalog.js";

function profilePicker(ctx: ViewCtx): HTMLElement {
  const choose = (id: string) =>
    el("button", {
      class: `chip ${ctx.settings.profile_id === id ? "chip-active" : ""}`,
      text: id === "vegetarian" ? "Vegetarian" : "Regular",
      onClick: () => void ctx.actions.setProfile(id),
    });
  return el("div", { class: "profile-picker" }, [
    el("span", { class: "field-label", text: "Diet profile" }),
    el("div", { class: "chips-row" }, [choose("vegetarian"), choose("regular")]),
  ]);
}

function customItemForm(ctx: ViewCtx): HTMLElement {
  const name = el("input", { class: "field grow", type: "text", placeholder: "Add your own product" });
  const unit = el("input", { class: "field unit", type: "text", placeholder: "unit" });
  return el("form", {
    class: "add-form",
    onSubmit: (e) => {
      e.preventDefault();
      const n = name.value.trim();
      if (!n) return;
      const u = unit.value.trim();
      name.value = "";
      unit.value = "";
      void ctx.actions.addCustomItem(n, u);
    },
  }, [name, unit, el("button", { class: "btn primary", type: "submit", text: "Add" })]);
}

function customItemsBlock(ctx: ViewCtx): HTMLElement | false {
  const items = ctx.customization.custom_items;
  return (
    items.length > 0 &&
    el("div", { class: "cat-block" }, [
      el("h3", { class: "cat-title", text: "My Items" }),
      el("ul", { class: "list" }, items.map((c) =>
        el("li", { class: "row" }, [
          el("div", { class: "row-main" }, [el("span", { class: "row-name", text: `${c.name} (${c.unit})` })]),
          el("div", { class: "row-actions" }, [
            el("button", { class: "btn small danger", text: "Remove", onClick: () => void ctx.actions.removeCustomItem(c.id) }),
          ]),
        ]),
      )),
    ])
  );
}

function categoryBlock(ctx: ViewCtx, categoryId: string, categoryName: string, removedItems: Set<string>, categoryIncluded: boolean, items: { id: string; name: string }[]): HTMLElement {
  const header = el("label", { class: "cat-head" }, [
    el("input", {
      type: "checkbox",
      checked: categoryIncluded,
      onChange: () => void ctx.actions.toggleCategoryRemoved(categoryId, categoryIncluded),
    }),
    el("h3", { class: "cat-title", text: categoryName }),
  ]);

  const itemList = el("ul", { class: `check-list ${categoryIncluded ? "" : "disabled"}` },
    items.map((item) => {
      const included = !removedItems.has(item.id);
      return el("li", { class: "check-row" }, [
        el("label", { class: "check-label" }, [
          el("input", {
            type: "checkbox",
            checked: included,
            disabled: !categoryIncluded,
            onChange: () => void ctx.actions.toggleItemRemoved(item.id, included),
          }),
          el("span", { text: item.name }),
        ]),
      ]);
    }),
  );

  return el("div", { class: "cat-block" }, [header, itemList]);
}

export function renderCatalogEditor(ctx: ViewCtx): HTMLElement {
  const diets = profileDiets(ctx.base, ctx.settings.profile_id);
  const removedItems = new Set(ctx.customization.removed_item_ids);
  const removedCats = new Set(ctx.customization.removed_category_ids);

  const categories = ctx.base.categories
    .filter((c) => diets.includes(c.diet))
    .map((c) => {
      const items = c.subcategories.flatMap((s) => s.items.map((i) => ({ id: i.id, name: i.name })));
      return categoryBlock(ctx, c.id, c.name, removedItems, !removedCats.has(c.id), items);
    });

  return el("section", { class: "view" }, [
    profilePicker(ctx),
    el("p", { class: "hint", text: "Uncheck anything your household never buys. Add your own products below." }),
    customItemForm(ctx),
    customItemsBlock(ctx),
    ...categories,
  ]);
}
