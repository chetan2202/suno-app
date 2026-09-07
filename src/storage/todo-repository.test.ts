import { describe, it, expect } from "vitest";
import { MemoryPersistence } from "./memory-persistence.js";
import { OperationStore } from "./operation-store.js";
import { GroceryRepository } from "./repository.js";
import { TodoRepository } from "./todo-repository.js";
import { selectNeeded } from "../domain/reducer.js";
import { selectForMember } from "../domain/reducer-todo.js";
import { testEnv } from "../domain/test-helpers.js";

const task = (title: string, member = "mem-a") => ({
  title,
  created_by_member_id: member,
  for_member_id: member,
  due_at: null,
  priority: "normal" as const,
  delegation_status: null,
});

describe("TodoRepository over a shared operation store", () => {
  it("grocery and to-do share one log; each derives only its own state", async () => {
    const store = await OperationStore.open(new MemoryPersistence(), testEnv());
    const grocery = GroceryRepository.fromStore(store);
    const todo = TodoRepository.fromStore(store);

    await grocery.addItem({ catalog_item_id: null, name: "Rice", for_member_id: null, quantity: 1, unit: "kg" });
    await todo.addTask(task("Call plumber"));

    expect(selectNeeded(grocery.getState())).toHaveLength(1);
    expect(selectForMember(todo.getState(), "mem-a")).toHaveLength(1);
    expect(store.getOperations()).toHaveLength(2); // a single shared log
  });

  it("uses one monotonic sequence across both modules (no collisions)", async () => {
    const store = await OperationStore.open(new MemoryPersistence(), testEnv());
    const grocery = GroceryRepository.fromStore(store);
    const todo = TodoRepository.fromStore(store);

    await grocery.addItem({ catalog_item_id: null, name: "A", for_member_id: null, quantity: 1, unit: "x" });
    await todo.addTask(task("B"));
    await grocery.addItem({ catalog_item_id: null, name: "C", for_member_id: null, quantity: 1, unit: "x" });

    expect(store.getOperations().map((o) => o.sequence)).toEqual([1, 2, 3]);
  });

  it("persists tasks across reopen", async () => {
    const port = new MemoryPersistence();
    const first = TodoRepository.fromStore(await OperationStore.open(port));
    await first.addTask(task("Water plants", "m"));

    const reopened = TodoRepository.fromStore(await OperationStore.open(port));
    expect(selectForMember(reopened.getState(), "m")).toHaveLength(1);
  });
});
