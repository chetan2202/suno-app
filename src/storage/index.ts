// Layer 3 — Local persistence. IndexedDB repository API, operation-log storage,
// migrations, local device_id. Exposes a clean repository API to the domain/UI so the
// operation log and (v0.2) sync slot in behind it. See architecture.md.

import type { OpEnv } from "../domain/operation-factory.js";
import { GroceryRepository } from "./repository.js";
import { IdbPersistence } from "./idb-persistence.js";

export * from "./port.js";
export * from "./repository.js";
export * from "./idb-persistence.js";
export * from "./memory-persistence.js";

/** Open the grocery repository backed by IndexedDB (the browser default). */
export async function openGroceryRepository(env?: OpEnv): Promise<GroceryRepository> {
  const port = await IdbPersistence.open();
  return GroceryRepository.open(port, env);
}
