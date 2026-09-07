// Core domain types for the Local-First Family Grocery PWA (v0.1).
//
// v0.1 is single-device: a member is a *domain* entity (a named person a list
// line belongs to), NOT yet a cryptographic/security identity. Networking, keys,
// invitations and sync arrive in v0.2. See plan.md.

/** Whether a catalog item ships with the app or was added by the household. */
export type CatalogSource = "BASE" | "HOUSEHOLD";

/** Lifecycle of a grocery list line. */
export type ItemStatus = "needed" | "purchased";

/** Kinds of mutation recorded in the append-only operation log. Grocery and To-do share
 * one log; each module's reducer applies its own op types and ignores the others. */
export type OperationType =
  // grocery
  | "ADD"
  | "UPDATE"
  | "SET_QUANTITY"
  | "SET_STATUS"
  | "DELETE"
  | "RESTORE"
  // to-do
  | "TODO_ADD"
  | "TODO_EDIT"
  | "TODO_SET_DUE"
  | "TODO_SET_STATUS"
  | "TODO_RESPOND"
  | "TODO_DELETE";

/** A to-do task's completion state. */
export type TodoStatus = "open" | "done";

/** For a delegated task, where it stands between delegator and assignee. null = personal. */
export type DelegationStatus = "pending" | "accepted" | "rejected";

export type TodoPriority = "normal" | "high";

/**
 * A to-do task. A personal task has created_by_member_id === for_member_id and
 * delegation_status = null. A delegated task is created by one member for another; both see
 * it, either can mark it done, and the assignee can accept/reject it.
 */
export interface TodoTask {
  task_id: string;
  title: string;
  created_by_member_id: string; // who created the task
  for_member_id: string; // who it is for (the assignee); === creator for a personal task
  due_at: number | null; // epoch ms, or null when no time is set
  priority: TodoPriority;
  status: TodoStatus;
  delegation_status: DelegationStatus | null; // null for a personal task
  created_by: string; // device_id
  created_at: number;
  updated_at: number;
}

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
  done_at: number | null; // when marked done (status -> purchased); null while needed
}

/** A read-only base catalog product, or a household-added product. */
export interface CatalogItem {
  catalog_item_id: string;
  name: string;
  default_unit: string;
  category: string;
  source: CatalogSource;
}

// --- Master catalog (the hierarchical starter list shipped as JSON) ---
//
// The master catalog is category > subcategory > item, region-specific (India for
// v0.1). Diet drives profile filtering: a household picks a profile at entry and only
// sees categories whose diet is included by that profile. The house admin can add or
// remove entries locally; a removed entry is hidden from every family member.

/** Diet classification of a category/item. "none" = non-food, always shown. */
export type Diet = "veg" | "nonveg" | "none";

/** A household diet profile chosen at entry, e.g. Vegetarian or Regular. */
export interface CatalogProfile {
  id: string;
  name: string;
  diets: Diet[]; // which category diets this profile shows
}

/** A leaf product in the master catalog. */
export interface MasterItem {
  id: string;
  name: string;
  unit: string;
}

/** A subcategory grouping items under a category. */
export interface MasterSubcategory {
  id: string;
  name: string;
  items: MasterItem[];
}

/** A top-level category carrying a diet tag. */
export interface MasterCategory {
  id: string;
  name: string;
  diet: Diet;
  subcategories: MasterSubcategory[];
}

/** The whole master catalog document (public/catalog/base-catalog.json). */
export interface MasterCatalog {
  version: number;
  source: CatalogSource;
  region: string;
  profiles: CatalogProfile[];
  categories: MasterCategory[];
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
