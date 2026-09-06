// Catalog resolution: turn the shipped master catalog + the household's profile and
// admin customization into the "effective" catalog a family member picks products from.
//
// Rules:
//   - Profile filters categories by diet (Vegetarian sees veg + non-food; Regular
//     sees everything).
//   - The admin can remove base items or whole categories; removed entries are hidden
//     from everyone.
//   - The admin can add custom products when the master is missing something; these
//     appear together under a synthetic "My Items" category.
//
// All functions are pure and browser-free (testable).

import type { Diet, MasterCatalog, MasterCategory } from "./types.js";

/** This device's role in the household. null until the first-run choice is made. */
export type HouseholdRole = "admin" | "member" | null;

/** Household diet/onboarding settings (admin-managed, local config in v0.1). */
export interface HouseholdSettings {
  profile_id: string;
  onboarded: boolean;
  /** App version the household requires all devices to run (see version-gate.ts). */
  required_app_version: number;
  /** This device's role; null until the user chooses start-as-admin or join-as-member. */
  role: HouseholdRole;
  /** Household identity (created by the admin, carried to members via the invite). */
  household_id: string | null;
  household_name: string;
}

/** A product the household added because the master catalog lacked it. */
export interface CustomCatalogItem {
  id: string;
  name: string;
  unit: string;
}

/** The admin's edits layered over the master catalog. */
export interface CatalogCustomization {
  removed_item_ids: string[];
  removed_category_ids: string[];
  custom_items: CustomCatalogItem[];
}

/** Synthetic category id/name that holds household-added products. */
export const CUSTOM_CATEGORY_ID = "my_items";
export const CUSTOM_CATEGORY_NAME = "My Items";

export function defaultSettings(): HouseholdSettings {
  return {
    profile_id: "regular",
    onboarded: false,
    required_app_version: 0,
    role: null,
    household_id: null,
    household_name: "Home",
  };
}

export function emptyCustomization(): CatalogCustomization {
  return { removed_item_ids: [], removed_category_ids: [], custom_items: [] };
}

/** The diets a profile is allowed to see (defaults to Regular's if unknown). */
export function profileDiets(base: MasterCatalog, profileId: string): Diet[] {
  const profile = base.profiles.find((p) => p.id === profileId);
  return profile ? profile.diets : ["veg", "nonveg", "none"];
}

/**
 * The effective catalog: master categories filtered by profile and admin removals,
 * plus a "My Items" category for household-added products. Empty subcategories and
 * categories are dropped.
 */
export function resolveCatalog(
  base: MasterCatalog,
  settings: HouseholdSettings,
  custom: CatalogCustomization,
): MasterCategory[] {
  const diets = profileDiets(base, settings.profile_id);
  const removedItems = new Set(custom.removed_item_ids);
  const removedCategories = new Set(custom.removed_category_ids);

  const categories: MasterCategory[] = [];

  for (const category of base.categories) {
    if (!diets.includes(category.diet)) continue;
    if (removedCategories.has(category.id)) continue;

    const subcategories = category.subcategories
      .map((sub) => ({
        ...sub,
        items: sub.items.filter((item) => !removedItems.has(item.id)),
      }))
      .filter((sub) => sub.items.length > 0);

    if (subcategories.length > 0) {
      categories.push({ ...category, subcategories });
    }
  }

  if (custom.custom_items.length > 0) {
    categories.push({
      id: CUSTOM_CATEGORY_ID,
      name: CUSTOM_CATEGORY_NAME,
      diet: "none",
      subcategories: [
        {
          id: `${CUSTOM_CATEGORY_ID}_all`,
          name: CUSTOM_CATEGORY_NAME,
          items: custom.custom_items.map((c) => ({ id: c.id, name: c.name, unit: c.unit })),
        },
      ],
    });
  }

  return categories;
}

/** A pickable product flattened out of the resolved catalog, with its labels. */
export interface ResolvedItem {
  id: string;
  name: string;
  unit: string;
  category_id: string;
  category_name: string;
  subcategory_name: string;
}

/** Flatten resolved categories into a single pickable list. */
export function flattenCatalog(categories: MasterCategory[]): ResolvedItem[] {
  const out: ResolvedItem[] = [];
  for (const category of categories) {
    for (const sub of category.subcategories) {
      for (const item of sub.items) {
        out.push({
          id: item.id,
          name: item.name,
          unit: item.unit,
          category_id: category.id,
          category_name: category.name,
          subcategory_name: sub.name,
        });
      }
    }
  }
  return out;
}
