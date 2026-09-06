import { describe, it, expect } from "vitest";
import { GroceryRepository } from "./repository.js";
import { MemoryPersistence } from "./memory-persistence.js";
import { selectNeeded, selectPurchased, selectItems } from "../domain/reducer.js";
import { testEnv } from "../domain/test-helpers.js";

const SOAP = { catalog_item_id: "soap", name: "Soap", for_member_id: "mem-mom", quantity: 1, unit: "bar" };

describe("GroceryRepository", () => {
  it("creates and persists a device_id on first run", async () => {
    const port = new MemoryPersistence();
    const repo = await GroceryRepository.open(port, testEnv());
    const id = repo.getDeviceId();
    expect(id).toMatch(/^dev-/);

    const identity = await port.loadIdentity();
    expect(identity?.device_id).toBe(id);
  });

  it("reuses the existing device_id when reopened", async () => {
    const port = new MemoryPersistence();
    const first = await GroceryRepository.open(port, testEnv());
    const reopened = await GroceryRepository.open(port, testEnv());
    expect(reopened.getDeviceId()).toBe(first.getDeviceId());
  });

  it("adds a needed line and derives state", async () => {
    const repo = await GroceryRepository.open(new MemoryPersistence(), testEnv());
    const state = await repo.addItem(SOAP);
    expect(selectNeeded(state)).toHaveLength(1);
    expect(selectItems(state)[0]!.name).toBe("Soap");
  });

  it("marks purchased and deletes", async () => {
    const repo = await GroceryRepository.open(new MemoryPersistence(), testEnv());
    await repo.addItem(SOAP);
    const itemId = selectItems(repo.getState())[0]!.item_id;

    await repo.markPurchased(itemId);
    expect(selectPurchased(repo.getState())).toHaveLength(1);

    await repo.deleteItem(itemId);
    expect(selectItems(repo.getState())).toHaveLength(0);
  });

  it("persists operations: a reopened repository rebuilds identical state", async () => {
    const port = new MemoryPersistence();
    const repo = await GroceryRepository.open(port, testEnv());
    await repo.addItem(SOAP);
    await repo.addItem({ catalog_item_id: "milk", name: "Milk", for_member_id: null, quantity: 2, unit: "litre" });

    const reopened = await GroceryRepository.open(port, testEnv());
    expect(selectItems(reopened.getState())).toHaveLength(2);
    expect(reopened.getOperations()).toHaveLength(2);
  });

  it("reconstructs counters from the log so a reopened device keeps a monotonic sequence", async () => {
    const port = new MemoryPersistence();
    const repo = await GroceryRepository.open(port, testEnv());
    await repo.addItem(SOAP); // sequence 1
    await repo.addItem(SOAP); // sequence 2

    const reopened = await GroceryRepository.open(port, testEnv());
    await reopened.addItem(SOAP); // must continue at sequence 3
    const ops = reopened.getOperations();
    const deviceId = reopened.getDeviceId();
    const mySequences = ops.filter((o) => o.device_id === deviceId).map((o) => o.sequence);
    expect(mySequences).toEqual([1, 2, 3]);
  });
});
