// Real IndexedDB round-trip using fake-indexeddb (registers a global indexedDB).
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { IdbPersistence } from "./idb-persistence.js";
import { GroceryRepository } from "./repository.js";
import { DB_NAME } from "./schema.js";
import { requestToPromise } from "./idb.js";
import { selectItems } from "../domain/reducer.js";
import { testEnv } from "../domain/test-helpers.js";

async function deleteDb(): Promise<void> {
  await requestToPromise(globalThis.indexedDB.deleteDatabase(DB_NAME));
}

describe("IdbPersistence (real IndexedDB via fake-indexeddb)", () => {
  beforeEach(deleteDb);

  it("persists identity and operations across reopen", async () => {
    const p1 = await IdbPersistence.open();
    await p1.saveIdentity({ device_id: "dev-fixed" });
    await p1.appendOperations([
      { operation_id: "op-1", device_id: "dev-fixed", sequence: 1, item_id: "item-1",
        operation_type: "ADD", payload: { catalog_item_id: null, name: "Rice", for_member_id: null, quantity: 1, unit: "kg" },
        logical_version: 1, created_at: 1000 },
    ]);

    const p2 = await IdbPersistence.open();
    expect((await p2.loadIdentity())?.device_id).toBe("dev-fixed");
    expect(await p2.loadOperations()).toHaveLength(1);
  });

  it("append is idempotent by operation_id", async () => {
    const p = await IdbPersistence.open();
    const op = { operation_id: "op-dup", device_id: "dev-A", sequence: 1, item_id: "item-1",
      operation_type: "ADD" as const, payload: {}, logical_version: 1, created_at: 1 };
    await p.appendOperations([op]);
    await p.appendOperations([op]);
    expect(await p.loadOperations()).toHaveLength(1);
  });

  it("clearAll erases identity, operations, members and meta", async () => {
    const p = await IdbPersistence.open();
    await p.saveIdentity({ device_id: "dev-X" });
    await p.appendOperations([
      { operation_id: "op-1", device_id: "dev-X", sequence: 1, item_id: "item-1",
        operation_type: "ADD", payload: {}, logical_version: 1, created_at: 1 },
    ]);
    await p.putMember({ member_id: "m1", display_name: "Mom", created_at: 1 });
    await p.saveMeta("settings", { household_name: "Home" });

    await p.clearAll();

    expect(await p.loadIdentity()).toBeNull();
    expect(await p.loadOperations()).toHaveLength(0);
    expect(await p.loadMembers()).toHaveLength(0);
    expect(await p.loadMeta("settings")).toBeNull();

    // A reopen (as after a reload) stays empty - a true first-run state.
    const reopened = await IdbPersistence.open();
    expect(await reopened.loadIdentity()).toBeNull();
    expect(await reopened.loadOperations()).toHaveLength(0);
  });

  it("a repository over IndexedDB survives a reopen with identical state", async () => {
    const repo = await GroceryRepository.open(await IdbPersistence.open(), testEnv());
    await repo.addItem({ catalog_item_id: "soap", name: "Soap", for_member_id: "mem-mom", quantity: 1, unit: "bar" });
    const deviceId = repo.getDeviceId();

    const reopened = await GroceryRepository.open(await IdbPersistence.open(), testEnv());
    expect(reopened.getDeviceId()).toBe(deviceId);
    expect(selectItems(reopened.getState())).toHaveLength(1);
    expect(selectItems(reopened.getState())[0]!.name).toBe("Soap");
  });
});
