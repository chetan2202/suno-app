// Deterministic reducer for the To-do module. Folds the shared operation log into to-do
// state, applying only TODO_* operations and ignoring grocery ones (both modules share one
// log). Same guarantees as the grocery reducer: deduped + ordered by logical time, so every
// device converges; last-write-wins by logical_version; TODO_DELETE is terminal.

import type { Operation, TodoTask } from "./types.js";
import type {
  TodoAddPayload,
  TodoEditPayload,
  TodoRespondPayload,
  TodoSetDuePayload,
  TodoSetStatusPayload,
} from "./payloads.js";
import { orderOperations } from "./order.js";

export interface TodoState {
  /** Live tasks by task_id (deleted tasks are removed). */
  tasks: Record<string, TodoTask>;
}

export function emptyTodoState(): TodoState {
  return { tasks: {} };
}

/** Drop keys whose value is undefined so they do not overwrite existing fields. */
function definedFields<T extends object>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

function applyTodo(state: TodoState, op: Operation): TodoState {
  const tasks = { ...state.tasks };
  const existing = tasks[op.item_id];

  switch (op.operation_type) {
    case "TODO_ADD": {
      const p = op.payload as unknown as TodoAddPayload;
      tasks[op.item_id] = {
        task_id: op.item_id,
        title: p.title,
        created_by_member_id: p.created_by_member_id,
        for_member_id: p.for_member_id,
        due_at: p.due_at,
        priority: p.priority,
        status: "open",
        delegation_status: p.delegation_status,
        created_by: op.device_id,
        created_at: op.created_at,
        updated_at: op.created_at,
      };
      break;
    }
    case "TODO_EDIT": {
      if (!existing) break;
      const p = op.payload as unknown as TodoEditPayload;
      tasks[op.item_id] = { ...existing, ...definedFields(p), updated_at: op.created_at };
      break;
    }
    case "TODO_SET_DUE": {
      if (!existing) break;
      const p = op.payload as unknown as TodoSetDuePayload;
      tasks[op.item_id] = { ...existing, due_at: p.due_at, updated_at: op.created_at };
      break;
    }
    case "TODO_SET_STATUS": {
      if (!existing) break;
      const p = op.payload as unknown as TodoSetStatusPayload;
      tasks[op.item_id] = { ...existing, status: p.status, updated_at: op.created_at };
      break;
    }
    case "TODO_RESPOND": {
      if (!existing) break;
      const p = op.payload as unknown as TodoRespondPayload;
      tasks[op.item_id] = { ...existing, delegation_status: p.delegation_status, updated_at: op.created_at };
      break;
    }
    case "TODO_DELETE": {
      delete tasks[op.item_id];
      break;
    }
    // Grocery op types are ignored here (handled by the grocery reducer).
  }

  return { tasks };
}

/** Fold a whole operation log into to-do state (deduped and ordered first). */
export function reduceTodos(ops: readonly Operation[]): TodoState {
  return orderOperations(ops).reduce(applyTodo, emptyTodoState());
}

// --- Selectors ---

export function selectTasks(state: TodoState): TodoTask[] {
  return Object.values(state.tasks);
}

/** A delegated task was created by one member for another. */
export function isDelegated(task: TodoTask): boolean {
  return task.created_by_member_id !== task.for_member_id;
}

/** Tasks on a member's own list: personal + delegated-to-them, excluding ones they rejected. */
export function selectForMember(state: TodoState, memberId: string): TodoTask[] {
  return selectTasks(state).filter(
    (t) => t.for_member_id === memberId && t.delegation_status !== "rejected",
  );
}

/** Tasks a member delegated to someone else (their "sent" list). */
export function selectDelegatedBy(state: TodoState, memberId: string): TodoTask[] {
  return selectTasks(state).filter((t) => isDelegated(t) && t.created_by_member_id === memberId);
}

/** Delegated tasks assigned to a member that still await their accept/reject. */
export function selectIncomingPending(state: TodoState, memberId: string): TodoTask[] {
  return selectTasks(state).filter(
    (t) => isDelegated(t) && t.for_member_id === memberId && t.delegation_status === "pending",
  );
}
