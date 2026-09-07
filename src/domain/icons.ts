// Icon names for categories and products. Values are flat-icon keys (see ui/icon.ts),
// not emoji. Products default to their category's icon; per-product art can be added later
// if a family wants it, but the minimalist default is the category glyph.

import { CUSTOM_CATEGORY_ID } from "./catalog.js";

const CATEGORY_ICONS: Record<string, string> = {
  vegetables: "leaf",
  fruits: "apple",
  staples: "grain",
  spices: "spice",
  dairy: "milk",
  oils: "drop",
  bakery_breakfast: "bread",
  beverages: "cup",
  condiments: "jar",
  sweeteners_dryfruits: "candy",
  personal_care: "soap",
  household: "broom",
  non_vegetarian: "drumstick",
  [CUSTOM_CATEGORY_ID]: "star",
};

/** Icon name for a category (falls back to a generic tag). */
export function categoryIcon(categoryId: string): string {
  return CATEGORY_ICONS[categoryId] ?? "tag";
}

/** Icon name for a product line: its category's icon (or a generic tag if unknown). */
export function itemIcon(_itemId: string, categoryId: string): string {
  return categoryIcon(categoryId);
}
