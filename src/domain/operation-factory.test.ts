import { describe, it, expect } from "vitest";
import { OperationFactory } from "./operation-factory.js";
import { testEnv } from "./test-helpers.js";

describe("OperationFactory", () => {
  it("stamps device_id and monotonic sequence/logical clock", () => {
    const f = new OperationFactory("dev-A", { sequence: 0, logical_version: 0 }, testEnv());
    const a = f.add({ catalog_item_id: "soap", name: "Soap", for_member_id: "mem-1", quantity: 1, unit: "bar" });
    const b = f.setQuantity(a.item_id, 2);

    expect(a.device_id).toBe("dev-A");
    expect(a.sequence).toBe(1);
    expect(a.logical_version).toBe(1);
    expect(b.sequence).toBe(2);
    expect(b.logical_version).toBe(2);
    expect(a.created_at).toBeLessThan(b.created_at);
  });

  it("produces an ADD with a generated item_id and the given payload", () => {
    const f = new OperationFactory("dev-A", undefined, testEnv());
    const op = f.add({ catalog_item_id: "milk", name: "Milk", for_member_id: null, quantity: 2, unit: "litre" });

    expect(op.operation_type).toBe("ADD");
    expect(op.item_id).toBe("item-1");
    expect(op.operation_id).toBe("op-1");
    expect(op.payload).toEqual({ catalog_item_id: "milk", name: "Milk", for_member_id: null, quantity: 2, unit: "litre" });
  });

  it("builds each mutation type with the right payload", () => {
    const f = new OperationFactory("dev-A", undefined, testEnv());
    expect(f.update("item-1", { name: "Bread" }).operation_type).toBe("UPDATE");
    expect(f.setQuantity("item-1", 3).payload).toEqual({ quantity: 3 });
    expect(f.setStatus("item-1", "purchased").payload).toEqual({ status: "purchased" });
    expect(f.markPurchased("item-1").payload).toEqual({ status: "purchased" });
    expect(f.restore("item-1").operation_type).toBe("RESTORE");
    expect(f.delete("item-1").operation_type).toBe("DELETE");
  });

  it("exposes counters for persistence and resumes from them", () => {
    const f1 = new OperationFactory("dev-A", undefined, testEnv());
    f1.add({ catalog_item_id: null, name: "X", for_member_id: null, quantity: 1, unit: "piece" });
    const saved = f1.counters();
    expect(saved).toEqual({ sequence: 1, logical_version: 1 });

    const f2 = new OperationFactory("dev-A", saved, testEnv());
    const next = f2.add({ catalog_item_id: null, name: "Y", for_member_id: null, quantity: 1, unit: "piece" });
    expect(next.sequence).toBe(2);
    expect(next.logical_version).toBe(2);
  });

  it("observe() advances the Lamport clock past a seen remote version", () => {
    const f = new OperationFactory("dev-A", undefined, testEnv());
    f.observe(41);
    const op = f.add({ catalog_item_id: null, name: "Z", for_member_id: null, quantity: 1, unit: "piece" });
    expect(op.logical_version).toBe(42);
  });
});
