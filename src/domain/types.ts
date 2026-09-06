// Core domain types for the Local-First Family Grocery PWA (v0.1).
//
// v0.1 is single-device: a member is a *domain* entity (a named person a list
// line belongs to), NOT yet a cryptographic/security identity. Networking, keys,
// invitations and sync arrive in v0.2. See plan.md.

/** Whether a catalog item ships with the app or was added by the household. */
export type CatalogSource = "BASE" | "HOUSEHOLD";

/** Lifecycle of a grocery list line. */
export type ItemStatus = "needed" | "purchased";

/** Kinds of mutation recorded in the append-only operation log. */
export type OperationType =
  | "ADD"
  | "UPDATE"
  | "SET_QUANTITY"
  | "SET_STATUS"
  | "DELETE"
  | "RESTORE";

/** A named person in the household. Name is free text the user chooses. */
export interface Member {
  member_id: string;
  display_name: string;
  created_at: number;
}

/**
 * A grocery list line: a product for a member.
 * e.g. product "Soap" for member "Mother". A shared item has for_member_id = null.
 */
export interface GroceryItem {
  item_id: string;
  catalog_item_id: string | null; // null when the product name was free-typed
  name: string;
  for_member_id: string | null; // null = shared / whole household
  quantity: number;
  unit: string;
  status: ItemStatus;
  created_by: string; // device_id
  created_at: number;
  updated_at: number;
}

/** A read-only base catalog product, or a household-added product. */
export interface CatalogItem {
  catalog_item_id: string;
  name: string;
  default_unit: string;
  category: string;
  source: CatalogSource;
}

/** One entry in the append-only operation log. */
export interface Operation {
  operation_id: string; // globally unique
  device_id: string;
  sequence: number; // per-device monotonic
  item_id: string;
  operation_type: OperationType;
  payload: Record<string, unknown>;
  logical_version: number;
  created_at: number;
}

/** Local per-install identity. Just a device_id in v0.1. */
export interface LocalIdentity {
  device_id: string;
}
