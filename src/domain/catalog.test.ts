import { describe, it, expect } from "vitest";
import type { MasterCatalog } from "./types.js";
import {
  CUSTOM_CATEGORY_ID,
  emptyCustomization,
  flattenCatalog,
  resolveCatalog,
} from "./catalog.js";

const base: MasterCatalog = {
  version: 1,
  source: "BASE",
  region: "IN",
  profiles: [
    { id: "vegetarian", name: "Vegetarian", diets: ["veg", "none"] },
    { id: "regular", name: "Regular", diets: ["veg", "nonveg", "none"] },
  ],
  categories: [
    { id: "vegetables", name: "Vegetables", diet: "veg", subcategories: [
      { id: "veg_a", name: "Roots", items: [
        { id: "onion", name: "Onion", unit: "kg" },
        { id: "potato", name: "Potato", unit: "kg" },
      ] } ] },
    { id: "non_veg", name: "Non-Vegetarian", diet: "nonveg", subcategories: [
      { id: "nv_a", name: "Meat", items: [{ id: "chicken", name: "Chicken", unit: "kg" }] } ] },
    { id: "care", name: "Personal Care", diet: "none", subcategories: [
      { id: "care_a", name: "Bath", items: [{ id: "soap", name: "Soap", unit: "bar" }] } ] },
  ],
};

const settings = (profile_id: string) => ({ profile_id, onboarded: true });

describe("resolveCatalog", () => {
  it("Vegetarian profile hides the non-veg category but keeps non-food", () => {
    const cats = resolveCatalog(base, settings("vegetarian"), emptyCustomization());
    expect(cats.map((c) => c.id)).toEqual(["vegetables", "care"]);
  });

  it("Regular profile includes everything", () => {
    const cats = resolveCatalog(base, settings("regular"), emptyCustomization());
    expect(cats.map((c) => c.id)).toEqual(["vegetables", "non_veg", "care"]);
  });

  it("removes individual items and drops now-empty categories", () => {
    const cats = resolveCatalog(base, settings("regular"), {
      removed_item_ids: ["onion", "chicken"],
      removed_category_ids: [],
      custom_items: [],
    });
    const veg = cats.find((c) => c.id === "vegetables")!;
    expect(veg.subcategories[0]!.items.map((i) => i.id)).toEqual(["potato"]);
    expect(cats.find((c) => c.id === "non_veg")).toBeUndefined(); // emptied out
  });

  it("removes a whole category", () => {
    const cats = resolveCatalog(base, settings("regular"), {
      removed_item_ids: [],
      removed_category_ids: ["care"],
      custom_items: [],
    });
    expect(cats.find((c) => c.id === "care")).toBeUndefined();
  });

  it("appends household custom items under a My Items category", () => {
    const cats = resolveCatalog(base, settings("vegetarian"), {
      removed_item_ids: [],
      removed_category_ids: [],
      custom_items: [{ id: "custom-1", name: "Sabudana", unit: "kg" }],
    });
    const mine = cats.find((c) => c.id === CUSTOM_CATEGORY_ID)!;
    expect(mine.subcategories[0]!.items[0]!.name).toBe("Sabudana");
  });
});

describe("flattenCatalog", () => {
  it("flattens items with category labels", () => {
    const cats = resolveCatalog(base, settings("regular"), emptyCustomization());
    const flat = flattenCatalog(cats);
    expect(flat).toHaveLength(4); // onion, potato, chicken, soap
    const onion = flat.find((i) => i.id === "onion")!;
    expect(onion.category_name).toBe("Vegetables");
    expect(onion.subcategory_name).toBe("Roots");
  });
});
