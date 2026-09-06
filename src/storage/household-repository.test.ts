import { describe, it, expect } from "vitest";
import { HouseholdRepository } from "./household-repository.js";
import type { HouseholdEnv } from "./household-repository.js";
import { MemoryPersistence } from "./memory-persistence.js";

function env(): HouseholdEnv {
  let m = 0;
  let c = 0;
  let t = 1000;
  return {
    now: () => t++,
    memberId: () => `mem-${++m}`,
    customItemId: () => `custom-${++c}`,
  };
}

describe("HouseholdRepository", () => {
  it("defaults to the Regular profile, not yet onboarded", async () => {
    const repo = await HouseholdRepository.open(new MemoryPersistence(), env());
    expect(repo.getSettings()).toEqual({ profile_id: "regular", onboarded: false, required_app_version: 0 });
  });

  it("persists profile choice and onboarding across reopen", async () => {
    const port = new MemoryPersistence();
    const repo = await HouseholdRepository.open(port, env());
    await repo.setProfile("vegetarian");
    await repo.completeOnboarding();

    const reopened = await HouseholdRepository.open(port, env());
    expect(reopened.getSettings()).toEqual({ profile_id: "vegetarian", onboarded: true, required_app_version: 0 });
  });

  it("stores the required app version and keeps it across reopen", async () => {
    const port = new MemoryPersistence();
    const repo = await HouseholdRepository.open(port, env());
    await repo.setRequiredVersion(3);
    const reopened = await HouseholdRepository.open(port, env());
    expect(reopened.getSettings().required_app_version).toBe(3);
  });

  it("adds, renames, removes members and persists them", async () => {
    const port = new MemoryPersistence();
    const repo = await HouseholdRepository.open(port, env());
    const mom = await repo.addMember("Mother");
    await repo.addMember("Daughter");
    expect(repo.getMembers()).toHaveLength(2);

    await repo.renameMember(mom.member_id, "Mom");
    expect(repo.getMembers().find((m) => m.member_id === mom.member_id)?.display_name).toBe("Mom");

    await repo.removeMember(mom.member_id);
    expect(repo.getMembers()).toHaveLength(1);

    const reopened = await HouseholdRepository.open(port, env());
    expect(reopened.getMembers().map((m) => m.display_name)).toEqual(["Daughter"]);
  });

  it("toggles item/category removal and persists customization", async () => {
    const port = new MemoryPersistence();
    const repo = await HouseholdRepository.open(port, env());
    await repo.setItemRemoved("onion", true);
    await repo.setCategoryRemoved("non_veg", true);
    await repo.setItemRemoved("onion", false); // undo

    const reopened = await HouseholdRepository.open(port, env());
    const c = reopened.getCustomization();
    expect(c.removed_item_ids).toEqual([]);
    expect(c.removed_category_ids).toEqual(["non_veg"]);
  });

  it("adds and removes custom items", async () => {
    const port = new MemoryPersistence();
    const repo = await HouseholdRepository.open(port, env());
    const item = await repo.addCustomItem("Sabudana", "kg");
    expect(repo.getCustomization().custom_items).toHaveLength(1);

    await repo.removeCustomItem(item.id);
    const reopened = await HouseholdRepository.open(port, env());
    expect(reopened.getCustomization().custom_items).toHaveLength(0);
  });

  it("defaults a blank custom-item unit to piece", async () => {
    const repo = await HouseholdRepository.open(new MemoryPersistence(), env());
    const item = await repo.addCustomItem("Something", "");
    expect(item.unit).toBe("piece");
  });
});
