// Typed payloads for each operation type. The stored Operation keeps payload as a
// generic object (see types.ts); these interfaces describe the shape the factory
// writes and the reducer reads for each operation_type.

import type { DelegationStatus, ItemStatus, TodoPriority, TodoStatus } from "./types.js";

/** ADD: create a new grocery list line (a product for a member). */
export interface AddPayload {
  catalog_item_id: string | null;
  name: string;
  for_member_id: string | null;
  quantity: number;
  unit: string;
}

/** UPDATE: change one or more descriptive fields of an existing line. */
export interface UpdatePayload {
  catalog_item_id?: string | null;
  name?: string;
  for_member_id?: string | null;
  unit?: string;
}

/** SET_QUANTITY: change only the quantity. */
export interface SetQuantityPayload {
  quantity: number;
}

/** SET_STATUS: set the status (e.g. mark purchased). */
export interface SetStatusPayload {
  status: ItemStatus;
}

// DELETE and RESTORE carry no payload fields.
export type EmptyPayload = Record<string, never>;

// --- To-do payloads ---

/** TODO_ADD: create a task. Personal when for_member_id === created_by_member_id. */
export interface TodoAddPayload {
  title: string;
  created_by_member_id: string;
  for_member_id: string;
  due_at: number | null;
  priority: TodoPriority;
  /** "pending" when delegated to another member; null for a personal task. */
  delegation_status: DelegationStatus | null;
}

/** TODO_EDIT: change descriptive fields of a task. */
export interface TodoEditPayload {
  title?: string;
  priority?: TodoPriority;
}

/** TODO_SET_DUE: set or clear the due date/time. */
export interface TodoSetDuePayload {
  due_at: number | null;
}

/** TODO_SET_STATUS: mark done or reopen (either party on a delegated task). */
export interface TodoSetStatusPayload {
  status: TodoStatus;
}

/** TODO_RESPOND: the assignee accepts or rejects a delegated task. */
export interface TodoRespondPayload {
  delegation_status: Extract<DelegationStatus, "accepted" | "rejected">;
}
