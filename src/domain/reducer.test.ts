import { describe, it, expect } from "vitest";
import { reduce, selectNeeded, selectPurchased, selectItems } from "./reducer.js";
import { OperationFactory } from "./operation-factory.js";
import { makeOp, testEnv } from "./test-helpers.js";

function factory() {
  return new OperationFactory("dev-A", undefined, testEnv());
}

describe("reducer — grocery state from the operation log", () => {
  it("ADD creates a needed line with the payload fields", () => {
    const f = factory();
    const add = f.add({ catalog_item_id: "soap", name: "Soap", for_member_id: "mem-mom", quantity: 1, unit: "bar" });
    const state = reduce([add]);
    const item = state.items[add.item_id]!;

    expect(item.name).toBe("Soap");
    expect(item.for_member_id).toBe("mem-mom");
    expect(item.quantity).toBe(1);
    expect(item.status).toBe("needed");
    expect(item.created_by).toBe("dev-A");
  });

  it("represents product-plus-member lines: same product, different members", () => {
    const f = factory();
    const mom = f.add({ catalog_item_id: "soap", name: "Soap", for_member_id: "mem-mom", quantity: 1, unit: "bar" });
    const daughter = f.add({ catalog_item_id: "soap", name: "Soap", for_member_id: "mem-daughter", quantity: 1, unit: "bar" });
    const state = reduce([mom, daughter]);

    expect(selectItems(state)).toHaveLength(2);
    const members = selectItems(state).map((i) => i.for_member_id).sort();
    expect(members).toEqual(["mem-daughter", "mem-mom"]);
  });

  it("SET_QUANTITY changes only the quantity", () => {
    const f = factory();
    const add = f.add({ catalog_item_id: null, name: "Rice", for_member_id: null, quantity: 1, unit: "kg" });
    const state = reduce([add, f.setQuantity(add.item_id, 5)]);
    expect(state.items[add.item_id]!.quantity).toBe(5);
  });

  it("mark purchased then restore moves a line between buckets", () => {
    const f = factory();
    const add = f.add({ catalog_item_id: null, name: "Milk", for_member_id: null, quantity: 1, unit: "litre" });

    const purchased = reduce([add, f.markPurchased(add.item_id)]);
    expect(selectPurchased(purchased)).toHaveLength(1);
    expect(selectNeeded(purchased)).toHaveLength(0);

    const restored = reduce([add, f.markPurchased(add.item_id), f.restore(add.item_id)]);
    expect(selectNeeded(restored)).toHaveLength(1);
    expect(selectPurchased(restored)).toHaveLength(0);
  });

  it("UPDATE changes given fields and leaves others intact", () => {
    const f = factory();
    const add = f.add({ catalog_item_id: "soap", name: "Soap", for_member_id: "mem-mom", quantity: 2, unit: "bar" });
    const state = reduce([add, f.update(add.item_id, { name: "Bathing Soap" })]);
    const item = state.items[add.item_id]!;
    expect(item.name).toBe("Bathing Soap");
    expect(item.quantity).toBe(2); // untouched
    expect(item.for_member_id).toBe("mem-mom"); // untouched
  });

  it("DELETE removes the line", () => {
    const f = factory();
    const add = f.add({ catalog_item_id: null, name: "Bread", for_member_id: null, quantity: 1, unit: "loaf" });
    const state = reduce([add, f.delete(add.item_id)]);
    expect(state.items[add.item_id]).toBeUndefined();
    expect(selectItems(state)).toHaveLength(0);
  });

  it("is idempotent — a duplicated operation applies once", () => {
    const f = factory();
    const add = f.add({ catalog_item_id: null, name: "Eggs", for_member_id: null, quantity: 1, unit: "dozen" });
    const once = reduce([add]);
    const twice = reduce([add, add]);
    expect(twice).toEqual(once);
  });

  it("is deterministic regardless of input order (last-write-wins by logical_version)", () => {
    // Two quantity ops on the same item; the higher logical_version must win.
    const base = makeOp({ operation_type: "ADD", item_id: "item-1", operation_id: "op-add", logical_version: 1,
      payload: { catalog_item_id: null, name: "Onion", for_member_id: null, quantity: 1, unit: "kg" } });
    const q5 = makeOp({ operation_type: "SET_QUANTITY", item_id: "item-1", operation_id: "op-q5", logical_version: 2, payload: { quantity: 5 } });
    const q9 = makeOp({ operation_type: "SET_QUANTITY", item_id: "item-1", operation_id: "op-q9", logical_version: 3, payload: { quantity: 9 } });

    const forward = reduce([base, q5, q9]);
    const shuffled = reduce([q9, base, q5]);
    expect(forward).toEqual(shuffled);
    expect(forward.items["item-1"]!.quantity).toBe(9);
  });

  it("DELETE is terminal: an update ordered after a delete is ignored", () => {
    const add = makeOp({ operation_type: "ADD", item_id: "item-1", operation_id: "op-add", logical_version: 1,
      payload: { catalog_item_id: null, name: "Salt", for_member_id: null, quantity: 1, unit: "kg" } });
    const del = makeOp({ operation_type: "DELETE", item_id: "item-1", operation_id: "op-del", logical_version: 2, payload: {} });
    const update = makeOp({ operation_type: "UPDATE", item_id: "item-1", operation_id: "op-upd", logical_version: 3, payload: { name: "Rock Salt" } });

    const state = reduce([add, del, update]);
    expect(state.items["item-1"]).toBeUndefined();
  });

  it("ignores mutations to unknown items (missing ADD)", () => {
    const orphan = makeOp({ operation_type: "SET_QUANTITY", item_id: "ghost", operation_id: "op-x", payload: { quantity: 3 } });
    const state = reduce([orphan]);
    expect(selectItems(state)).toHaveLength(0);
  });
});
