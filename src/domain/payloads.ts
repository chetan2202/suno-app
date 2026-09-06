// Typed payloads for each operation type. The stored Operation keeps payload as a
// generic object (see types.ts); these interfaces describe the shape the factory
// writes and the reducer reads for each operation_type.

import type { ItemStatus } from "./types.js";

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
