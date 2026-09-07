// Layer 3 — Local persistence. IndexedDB repository API, operation-log storage,
// migrations, local device_id. Exposes a clean repository API to the domain/UI so the
// operation log and (v0.2) sync slot in behind it. See architecture.md.

import type { OpEnv } from "../domain/operation-factory.js";
import type { HouseholdEnv } from "./household-repository.js";
import { GroceryRepository } from "./repository.js";
import { TodoRepository } from "./todo-repository.js";
import { HouseholdRepository } from "./household-repository.js";
import { CloudConfigStore } from "./cloud-config.js";
import { OperationStore } from "./operation-store.js";
import { IdbPersistence } from "./idb-persistence.js";

export * from "./port.js";
export * from "./operation-store.js";
export * from "./repository.js";
export * from "./todo-repository.js";
export * from "./household-repository.js";
export * from "./cloud-config.js";
export * from "./idb-persistence.js";
export * from "./memory-persistence.js";

export interface App {
  grocery: GroceryRepository;
  todo: TodoRepository;
  household: HouseholdRepository;
  cloudConfig: CloudConfigStore;
  deviceId: string;
}

/** Open the whole app over one IndexedDB connection (the browser default). Grocery and
 * To-do share ONE operation store so the device keeps a single sequence/clock and log. */
export async function openApp(env?: { op?: OpEnv; household?: HouseholdEnv }): Promise<App> {
  const port = await IdbPersistence.open();
  const store = await OperationStore.open(port, env?.op);
  const grocery = GroceryRepository.fromStore(store);
  const todo = TodoRepository.fromStore(store);
  const household = await HouseholdRepository.open(port, env?.household);
  const cloudConfig = await CloudConfigStore.open(port);
  return { grocery, todo, household, cloudConfig, deviceId: store.deviceId };
}
