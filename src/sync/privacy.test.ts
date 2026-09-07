import { describe, it, expect } from "vitest";
import { shareableOperations } from "./privacy.js";
import { OperationFactory } from "../domain/operation-factory.js";
import { testEnv } from "../domain/test-helpers.js";

const A = "mem-a";
const B = "mem-b";
const C = "mem-c";

function factory() {
  return new OperationFactory("dev-A", undefined, testEnv());
}

describe("shareableOperations", () => {
  it("always shares grocery operations", () => {
    const f = factory();
    const g = f.add({ catalog_item_id: null, name: "Rice", for_member_id: null, quantity: 1, unit: "kg" });
    expect(shareableOperations([g], A)).toHaveLength(1);
    expect(shareableOperations([g], null)).toHaveLength(1);
  });

  it("never shares A's personal task with a different member", () => {
    const f = factory();
    const personal = f.addTodo({ title: "Private", created_by_member_id: A, for_member_id: A, due_at: null, priority: "normal", delegation_status: null });
    expect(shareableOperations([personal], B)).toHaveLength(0);
    expect(shareableOperations([personal], A)).toHaveLength(1); // A's own other device
  });

  it("shares a delegated task with both parties, but not a bystander", () => {
    const f = factory();
    const add = f.addTodo({ title: "Snacks", created_by_member_id: A, for_member_id: B, due_at: null, priority: "normal", delegation_status: "pending" });
    const status = f.setTodoStatus(add.item_id, "done"); // a follow-up op on the same task
    const log = [add, status];
    expect(shareableOperations(log, A)).toHaveLength(2); // delegator
    expect(shareableOperations(log, B)).toHaveLength(2); // assignee
    expect(shareableOperations(log, C)).toHaveLength(0); // bystander
  });

  it("mixes correctly: grocery shared, personal withheld, delegated targeted", () => {
    const f = factory();
    const g = f.add({ catalog_item_id: null, name: "Milk", for_member_id: null, quantity: 1, unit: "l" });
    const personal = f.addTodo({ title: "Mine", created_by_member_id: A, for_member_id: A, due_at: null, priority: "normal", delegation_status: null });
    const delegated = f.addTodo({ title: "For B", created_by_member_id: A, for_member_id: B, due_at: null, priority: "normal", delegation_status: "pending" });

    const forB = shareableOperations([g, personal, delegated], B);
    expect(forB.map((o) => o.item_id).sort()).toEqual([delegated.item_id, g.item_id].sort());
  });
});
