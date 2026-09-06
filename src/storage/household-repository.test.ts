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
  it("defaults to the Regular profile, not yet onboarded, no role", async () => {
    const repo = await HouseholdRepository.open(new MemoryPersistence(), env());
    expect(repo.getSettings()).toEqual({
      profile_id: "regular",
      onboarded: false,
      required_app_version: 0,
      role: null,
      household_id: null,
      household_name: "Home",
    });
  });

  it("persists profile choice and onboarding across reopen", async () => {
    const port = new MemoryPersistence();
    const repo = await HouseholdRepository.open(port, env());
    await repo.setProfile("vegetarian");
    await repo.completeOnboarding();

    const reopened = await HouseholdRepository.open(port, env());
    expect(reopened.getSettings().profile_id).toBe("vegetarian");
    expect(reopened.getSettings().onboarded).toBe(true);
  });

  it("starts as admin, joins as member from an invite, and resets", async () => {
    const port = new MemoryPersistence();
    const repo = await HouseholdRepository.open(port, env());

    await repo.startAsAdmin("Sharma Family");
    expect(repo.getRole()).toBe("admin");
    expect(repo.getSettings().household_name).toBe("Sharma Family");
    expect(repo.getSettings().household_id).toMatch(/^hh-/);

    await repo.joinAsMember({ v: 1, hid: "hh-x", hname: "Other Home", profile: "vegetarian" });
    expect(repo.getRole()).toBe("member");
    expect(repo.getSettings().household_id).toBe("hh-x");
    expect(repo.getSettings().profile_id).toBe("vegetarian");
    expect(repo.getSettings().onboarded).toBe(true);

    await repo.resetHousehold();
    expect(repo.getRole()).toBeNull();
    expect(repo.getSettings().onboarded).toBe(false);
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
