// Household config repository: members, diet/onboarding settings, and admin catalog
// customization. These are simple local records in v0.1 (not operations); v0.2 folds
// them into the sync model. Grocery lines live in GroceryRepository / the op log.

import type { Member } from "../domain/types.js";
import type {
  CatalogCustomization,
  CustomCatalogItem,
  HouseholdRole,
  HouseholdSettings,
} from "../domain/catalog.js";
import type { HouseholdInvite } from "../domain/invite.js";
import type { PersistencePort } from "./port.js";
import { defaultSettings, emptyCustomization } from "../domain/catalog.js";
import { newHouseholdId, newMemberId } from "../domain/ids.js";
import { META_CATALOG_KEY, META_SETTINGS_KEY } from "./schema.js";

/** Injectable id/clock sources for deterministic tests. */
export interface HouseholdEnv {
  now: () => number;
  memberId: () => string;
  customItemId: () => string;
}

const defaultEnv: HouseholdEnv = {
  now: () => Date.now(),
  memberId: newMemberId,
  customItemId: () => `custom-${globalThis.crypto.randomUUID()}`,
};

export class HouseholdRepository {
  private constructor(
    private readonly port: PersistencePort,
    private readonly env: HouseholdEnv,
    private settings: HouseholdSettings,
    private customization: CatalogCustomization,
    private members: Member[],
  ) {}

  static async open(port: PersistencePort, env: HouseholdEnv = defaultEnv): Promise<HouseholdRepository> {
    const stored = await port.loadMeta<Partial<HouseholdSettings>>(META_SETTINGS_KEY);
    // Backfill any fields missing from an older stored shape.
    const settings: HouseholdSettings = { ...defaultSettings(), ...(stored ?? {}) };
    // Legacy migration: a device already onboarded before roles existed was the admin.
    if (settings.onboarded && settings.role === null) {
      settings.role = "admin";
      if (!settings.household_id) settings.household_id = newHouseholdId();
    }
    if (stored) await port.saveMeta(META_SETTINGS_KEY, settings); // persist normalization
    const customization =
      (await port.loadMeta<CatalogCustomization>(META_CATALOG_KEY)) ?? emptyCustomization();
    const members = await port.loadMembers();
    return new HouseholdRepository(port, env, settings, customization, members);
  }

  // --- Role / household identity ---

  getRole(): HouseholdRole {
    return this.settings.role;
  }

  private async patchSettings(patch: Partial<HouseholdSettings>): Promise<void> {
    this.settings = { ...this.settings, ...patch };
    await this.port.saveMeta(META_SETTINGS_KEY, this.settings);
  }

  /** Start a new household on this device (this device becomes the admin). */
  async startAsAdmin(householdName: string): Promise<void> {
    await this.patchSettings({
      role: "admin",
      household_id: newHouseholdId(),
      household_name: householdName.trim() || "Home",
    });
  }

  /** Join an existing household from a scanned/entered invite (this device is a member). */
  async joinAsMember(invite: HouseholdInvite): Promise<void> {
    await this.patchSettings({
      role: "member",
      household_id: invite.hid,
      household_name: invite.hname,
      profile_id: invite.profile,
      onboarded: true,
    });
  }

  async renameHousehold(name: string): Promise<void> {
    await this.patchSettings({ household_name: name.trim() || "Home" });
  }

  /** Reset this device to the first-run state (e.g. wrong role chosen). Keeps device id. */
  async resetHousehold(): Promise<void> {
    await this.patchSettings({
      role: null,
      onboarded: false,
      household_id: null,
      household_name: "Home",
    });
  }

  // --- Settings / onboarding ---

  getSettings(): HouseholdSettings {
    return this.settings;
  }

  async setProfile(profileId: string): Promise<void> {
    this.settings = { ...this.settings, profile_id: profileId };
    await this.port.saveMeta(META_SETTINGS_KEY, this.settings);
  }

  async completeOnboarding(): Promise<void> {
    this.settings = { ...this.settings, onboarded: true };
    await this.port.saveMeta(META_SETTINGS_KEY, this.settings);
  }

  /** Set the app version the household requires all devices to run. */
  async setRequiredVersion(version: number): Promise<void> {
    this.settings = { ...this.settings, required_app_version: version };
    await this.port.saveMeta(META_SETTINGS_KEY, this.settings);
  }

  // --- Members ---

  getMembers(): readonly Member[] {
    return this.members;
  }

  async addMember(displayName: string): Promise<Member> {
    const member: Member = {
      member_id: this.env.memberId(),
      display_name: displayName.trim(),
      created_at: this.env.now(),
    };
    await this.port.putMember(member);
    this.members = [...this.members, member];
    return member;
  }

  async renameMember(memberId: string, displayName: string): Promise<void> {
    const existing = this.members.find((m) => m.member_id === memberId);
    if (!existing) return;
    const updated: Member = { ...existing, display_name: displayName.trim() };
    await this.port.putMember(updated);
    this.members = this.members.map((m) => (m.member_id === memberId ? updated : m));
  }

  async removeMember(memberId: string): Promise<void> {
    await this.port.deleteMember(memberId);
    this.members = this.members.filter((m) => m.member_id !== memberId);
  }

  // --- Catalog customization (admin) ---

  getCustomization(): CatalogCustomization {
    return this.customization;
  }

  private async saveCustomization(next: CatalogCustomization): Promise<void> {
    this.customization = next;
    await this.port.saveMeta(META_CATALOG_KEY, next);
  }

  async setItemRemoved(itemId: string, removed: boolean): Promise<void> {
    const set = new Set(this.customization.removed_item_ids);
    if (removed) set.add(itemId);
    else set.delete(itemId);
    await this.saveCustomization({ ...this.customization, removed_item_ids: [...set] });
  }

  async setCategoryRemoved(categoryId: string, removed: boolean): Promise<void> {
    const set = new Set(this.customization.removed_category_ids);
    if (removed) set.add(categoryId);
    else set.delete(categoryId);
    await this.saveCustomization({ ...this.customization, removed_category_ids: [...set] });
  }

  async addCustomItem(name: string, unit: string): Promise<CustomCatalogItem> {
    const item: CustomCatalogItem = {
      id: this.env.customItemId(),
      name: name.trim(),
      unit: unit.trim() || "piece",
    };
    await this.saveCustomization({
      ...this.customization,
      custom_items: [...this.customization.custom_items, item],
    });
    return item;
  }

  async removeCustomItem(id: string): Promise<void> {
    await this.saveCustomization({
      ...this.customization,
      custom_items: this.customization.custom_items.filter((c) => c.id !== id),
    });
  }
}
