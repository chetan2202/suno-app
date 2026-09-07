import { describe, it, expect } from "vitest";
import {
  reduceTodos,
  selectTasks,
  selectForMember,
  selectDelegatedBy,
  selectIncomingPending,
  isDelegated,
} from "./reducer-todo.js";
import { OperationFactory } from "./operation-factory.js";
import { makeOp, testEnv } from "./test-helpers.js";

const A = "mem-a"; // creator / delegator
const B = "mem-b"; // assignee

function factory() {
  return new OperationFactory("dev-A", undefined, testEnv());
}

function personal(f: OperationFactory, title = "Buy milk") {
  return f.addTodo({ title, created_by_member_id: A, for_member_id: A, due_at: null, priority: "normal", delegation_status: null });
}

function delegated(f: OperationFactory, title = "Drop me at class") {
  return f.addTodo({ title, created_by_member_id: A, for_member_id: B, due_at: null, priority: "normal", delegation_status: "pending" });
}

describe("to-do reducer", () => {
  it("TODO_ADD creates an open personal task on the creator's list", () => {
    const f = factory();
    const add = personal(f);
    const state = reduceTodos([add]);
    const task = state.tasks[add.item_id]!;
    expect(task.title).toBe("Buy milk");
    expect(task.status).toBe("open");
    expect(task.for_member_id).toBe(A);
    expect(isDelegated(task)).toBe(false);
    expect(selectForMember(state, A)).toHaveLength(1);
  });

  it("a delegated task shows on the assignee's list, the delegator's sent list, and as incoming pending", () => {
    const f = factory();
    const add = delegated(f);
    const state = reduceTodos([add]);
    const task = state.tasks[add.item_id]!;
    expect(isDelegated(task)).toBe(true);
    expect(task.delegation_status).toBe("pending");
    expect(selectForMember(state, B)).toHaveLength(1); // on B's list
    expect(selectForMember(state, A)).toHaveLength(0); // not on A's own list
    expect(selectDelegatedBy(state, A)).toHaveLength(1); // A delegated it
    expect(selectIncomingPending(state, B)).toHaveLength(1);
  });

  it("accepting clears the pending state; rejecting drops it from the assignee's list", () => {
    const f = factory();
    const add = delegated(f);

    const accepted = reduceTodos([add, f.respondTodo(add.item_id, "accepted")]);
    expect(accepted.tasks[add.item_id]!.delegation_status).toBe("accepted");
    expect(selectIncomingPending(accepted, B)).toHaveLength(0);
    expect(selectForMember(accepted, B)).toHaveLength(1);

    const rejected = reduceTodos([add, f.respondTodo(add.item_id, "rejected")]);
    expect(rejected.tasks[add.item_id]!.delegation_status).toBe("rejected");
    expect(selectForMember(rejected, B)).toHaveLength(0); // off B's list
    expect(selectDelegatedBy(rejected, A)).toHaveLength(1); // A still sees the rejection
  });

  it("either party marks done via TODO_SET_STATUS", () => {
    const f = factory();
    const add = delegated(f);
    const done = reduceTodos([add, f.setTodoStatus(add.item_id, "done")]);
    expect(done.tasks[add.item_id]!.status).toBe("done");
  });

  it("TODO_SET_DUE sets and clears the due time", () => {
    const f = factory();
    const add = personal(f);
    const set = reduceTodos([add, f.setTodoDue(add.item_id, 1_700_000_000_000)]);
    expect(set.tasks[add.item_id]!.due_at).toBe(1_700_000_000_000);
    const cleared = reduceTodos([add, f.setTodoDue(add.item_id, 1_700_000_000_000), f.setTodoDue(add.item_id, null)]);
    expect(cleared.tasks[add.item_id]!.due_at).toBeNull();
  });

  it("TODO_EDIT changes given fields and leaves others intact", () => {
    const f = factory();
    const add = personal(f, "Old");
    const state = reduceTodos([add, f.editTodo(add.item_id, { title: "New", priority: "high" })]);
    const task = state.tasks[add.item_id]!;
    expect(task.title).toBe("New");
    expect(task.priority).toBe("high");
    expect(task.for_member_id).toBe(A); // untouched
  });

  it("ignores grocery operations in the same log", () => {
    const f = factory();
    const grocery = f.add({ catalog_item_id: null, name: "Rice", for_member_id: null, quantity: 1, unit: "kg" });
    const add = personal(f);
    const state = reduceTodos([grocery, add]);
    expect(selectTasks(state)).toHaveLength(1); // only the task, not the grocery line
  });

  it("TODO_DELETE is terminal: an edit ordered after a delete is ignored", () => {
    const addPayload = { title: "T", created_by_member_id: A, for_member_id: A, due_at: null, priority: "normal", delegation_status: null };
    const add = makeOp({ operation_type: "TODO_ADD", item_id: "task-1", operation_id: "op-add", logical_version: 1, payload: addPayload });
    const del = makeOp({ operation_type: "TODO_DELETE", item_id: "task-1", operation_id: "op-del", logical_version: 2, payload: {} });
    const edit = makeOp({ operation_type: "TODO_EDIT", item_id: "task-1", operation_id: "op-edit", logical_version: 3, payload: { title: "back" } });
    const state = reduceTodos([add, del, edit]);
    expect(state.tasks["task-1"]).toBeUndefined();
  });
});
