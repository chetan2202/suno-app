// IndexedDB schema and migrations for the grocery database.
//
// Migrations are additive and keyed on oldVersion so an installed app upgrades its
// local database without losing data (requirements.md R21, failure scenario: app
// update). Bump DB_VERSION and add a new `if (oldVersion < N)` block per change.

import type { UpgradeFn } from "./idb.js";

export const DB_NAME = "suno-grocery";
export const DB_VERSION = 1;

export const STORE_OPERATIONS = "operations";
export const STORE_META = "meta";
export const STORE_MEMBERS = "members";

/** Keys for singleton records in the meta store. */
export const META_IDENTITY_KEY = "identity";
export const META_SETTINGS_KEY = "settings";
export const META_CATALOG_KEY = "catalog";

export const upgrade: UpgradeFn = (db, oldVersion) => {
  if (oldVersion < 1) {
    // operation_id is globally unique, so it is the natural key (put is idempotent).
    db.createObjectStore(STORE_OPERATIONS, { keyPath: "operation_id" });
    // Singletons (identity, settings, catalog customization) keyed by a string "key".
    db.createObjectStore(STORE_META, { keyPath: "key" });
    // Household members, keyed by member_id.
    db.createObjectStore(STORE_MEMBERS, { keyPath: "member_id" });
  }
};
