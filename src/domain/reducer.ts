// Deterministic reducer: folds the operation log into grocery state.
//
// State is derived, not stored: reduce(operations) replays the whole log in the
// deterministic order (see order.ts). Because operations are deduped by operation_id
// and ordered by logical time, every device converges to the same state. Field-setting
// operations apply last-write-wins by logical_version.
//
// v0.1 conflict policy: DELETE is terminal for an item_id. Once an item is deleted,
// later UPDATE/SET_* operations referencing it are ignored (the line is gone). This is
// the simple deterministic rule requirement R15 asks for; a single device never hits
// it, and it keeps multi-device behaviour predictable.

import type { GroceryItem } from "./types.js";
import type {
  AddPayload,
  SetQuantityPayload,
  SetStatusPayload,
  UpdatePayload,
} from "./payloads.js";
import type { Operation } from "./types.js";
import { orderOperations } from "./order.js";

export interface GroceryState {
  /** Live grocery list lines by item_id (deleted lines are removed). */
  items: Record<string, GroceryItem>;
}

export function emptyState(): GroceryState {
  return { items: {} };
}

/** Drop keys whose value is undefined so they do not overwrite existing fields. */
function definedFields<T extends object>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** Apply one operation to state. Assumes operations are applied in deterministic order. */
function applyInOrder(state: GroceryState, op: Operation): GroceryState {
  const items = { ...state.items };
  const existing = items[op.item_id];

  switch (op.operation_type) {
    case "ADD": {
      const p = op.payload as unknown as AddPayload;
      items[op.item_id] = {
        item_id: op.item_id,
        catalog_item_id: p.catalog_item_id,
        name: p.name,
        for_member_id: p.for_member_id,
        quantity: p.quantity,
        unit: p.unit,
        status: "needed",
        created_by: op.device_id,
        created_at: op.created_at,
        updated_at: op.created_at,
        done_at: null,
      };
      break;
    }
    case "UPDATE": {
      if (!existing) break;
      const p = op.payload as unknown as UpdatePayload;
      items[op.item_id] = {
        ...existing,
        ...definedFields(p),
        updated_at: op.created_at,
      };
      break;
    }
    case "SET_QUANTITY": {
      if (!existing) break;
      const p = op.payload as unknown as SetQuantityPayload;
      items[op.item_id] = { ...existing, quantity: p.quantity, updated_at: op.created_at };
      break;
    }
    case "SET_STATUS": {
      if (!existing) break;
      const p = op.payload as unknown as SetStatusPayload;
      items[op.item_id] = {
        ...existing,
        status: p.status,
        updated_at: op.created_at,
        // Stamp the done time when marked purchased; clear it when moved back to needed.
        done_at: p.status === "purchased" ? op.created_at : null,
      };
      break;
    }
    case "RESTORE": {
      if (!existing) break;
      items[op.item_id] = { ...existing, status: "needed", updated_at: op.created_at, done_at: null };
      break;
    }
    case "DELETE": {
      delete items[op.item_id];
      break;
    }
  }

  return { items };
}

/** Fold a whole operation log into state (deduped and ordered first). */
export function reduce(ops: readonly Operation[]): GroceryState {
  return orderOperations(ops).reduce(applyInOrder, emptyState());
}

// --- Selectors ---

/** All live lines. */
export function selectItems(state: GroceryState): GroceryItem[] {
  return Object.values(state.items);
}

/** Lines still needed. */
export function selectNeeded(state: GroceryState): GroceryItem[] {
  return selectItems(state).filter((i) => i.status === "needed");
}

/** Lines already purchased (done), including archived ones. */
export function selectPurchased(state: GroceryState): GroceryItem[] {
  return selectItems(state).filter((i) => i.status === "purchased");
}

/** A done item is auto-archived this long after it was marked done. */
export const ARCHIVE_AFTER_MS = 2 * 24 * 60 * 60 * 1000; // 2 days

/** Whether a done item has passed the archive window (relative to `now`). */
export function isArchived(item: GroceryItem, now: number): boolean {
  return item.status === "purchased" && item.done_at !== null && now - item.done_at >= ARCHIVE_AFTER_MS;
}

/**
 * Done lines still worth showing: purchased and not yet auto-archived. Archived items
 * stay in the log (this is a pure view-time filter), they just drop off the list two
 * days after being marked done.
 */
export function selectDone(state: GroceryState, now: number): GroceryItem[] {
  return selectPurchased(state).filter((i) => !isArchived(i, now));
}
