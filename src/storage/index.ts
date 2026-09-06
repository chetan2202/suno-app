// Layer 3 — Local persistence. IndexedDB repository API, operation-log storage,
// migrations, local device_id. Exposes a clean repository API to the domain/UI so the
// operation log and (v0.2) sync slot in behind it. See architecture.md.

import type { OpEnv } from "../domain/operation-factory.js";
import type { HouseholdEnv } from "./household-repository.js";
import { GroceryRepository } from "./repository.js";
import { HouseholdRepository } from "./household-repository.js";
import { IdbPersistence } from "./idb-persistence.js";

export * from "./port.js";
export * from "./repository.js";
export * from "./household-repository.js";
export * from "./idb-persistence.js";
export * from "./memory-persistence.js";

export interface App {
  grocery: GroceryRepository;
  household: HouseholdRepository;
  deviceId: string;
}

/** Open the whole app over one IndexedDB connection (the browser default). */
export async function openApp(env?: { op?: OpEnv; household?: HouseholdEnv }): Promise<App> {
  const port = await IdbPersistence.open();
  const grocery = await GroceryRepository.open(port, env?.op);
  const household = await HouseholdRepository.open(port, env?.household);
  return { grocery, household, deviceId: grocery.getDeviceId() };
}
