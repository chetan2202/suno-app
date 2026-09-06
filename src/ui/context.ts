// Shared context passed to every view. The controller (app.ts) builds this fresh on
// each render from the repositories, so views never hold stale state.

import type { App } from "../storage/index.js";
import type { GroceryItem, MasterCatalog, MasterCategory, Member } from "../domain/types.js";
import type { GroceryState } from "../domain/reducer.js";
import type { AddPayload } from "../domain/payloads.js";
import type { CatalogCustomization, HouseholdSettings } from "../domain/catalog.js";

export type Tab = "list" | "members" | "catalog";

/** Actions wrap repository mutations, then refresh + re-render. */
export interface Actions {
  setTab(tab: Tab): void;

  // onboarding
  setProfile(profileId: string): Promise<void>;
  goToStep(step: 1 | 2): void;
  finishOnboarding(): Promise<void>;

  // members
  addMember(name: string): Promise<void>;
  renameMember(id: string, name: string): Promise<void>;
  removeMember(id: string): Promise<void>;

  // grocery
  addItem(input: AddPayload): Promise<void>;
  setQuantity(itemId: string, quantity: number): Promise<void>;
  togglePurchased(item: GroceryItem): Promise<void>;
  deleteItem(itemId: string): Promise<void>;

  // catalog admin
  toggleItemRemoved(itemId: string, removed: boolean): Promise<void>;
  toggleCategoryRemoved(categoryId: string, removed: boolean): Promise<void>;
  addCustomItem(name: string, unit: string): Promise<void>;
  removeCustomItem(id: string): Promise<void>;
}

export interface ViewCtx {
  app: App;
  base: MasterCatalog;
  deviceId: string;
  tab: Tab;
  onboardingStep: 1 | 2;
  settings: HouseholdSettings;
  members: readonly Member[];
  customization: CatalogCustomization;
  /** Effective catalog for the current profile + customization. */
  resolved: MasterCategory[];
  groceryState: GroceryState;
  actions: Actions;
}

/** Display label for a line's member (or "Shared"). */
export function memberLabel(ctx: ViewCtx, memberId: string | null): string {
  if (!memberId) return "Shared";
  return ctx.members.find((m) => m.member_id === memberId)?.display_name ?? "Unknown";
}
