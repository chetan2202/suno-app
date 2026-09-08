// Layer 3 repository for the grocery module: the clean API the grocery UI/domain use. It
// owns the derived grocery state and hides the operation log behind a shared OperationStore
// (see operation-store.ts). State is never stored directly - it is a fold of the log - so a
// single source of truth remains and sync is just merging operations.

import type { ItemStatus, Operation } from "../domain/types.js";
import type { AddPayload, UpdatePayload } from "../domain/payloads.js";
import type { OpEnv } from "../domain/operation-factory.js";
import type { GroceryState } from "../domain/reducer.js";
import type { PersistencePort } from "./port.js";
import { reduce } from "../domain/reducer.js";
import { OperationStore } from "./operation-store.js";

export class GroceryRepository {
  private state: GroceryState;

  private constructor(private readonly store: OperationStore) {
    this.state = reduce(store.getOperations());
  }

  /** Build on an existing shared store (used by openApp so modules share one log). */
  static fromStore(store: OperationStore): GroceryRepository {
    return new GroceryRepository(store);
  }

  /** Open standalone over a port (own store) - convenient for tests. */
  static async open(port: PersistencePort, env?: OpEnv): Promise<GroceryRepository> {
    return new GroceryRepository(await OperationStore.open(port, env));
  }

  getDeviceId(): string {
    return this.store.deviceId;
  }

  getState(): GroceryState {
    return this.state;
  }

  /** The full operation log (used by sync). */
  getOperations(): readonly Operation[] {
    return this.store.getOperations();
  }

  private async commit(op: Operation): Promise<GroceryState> {
    await this.store.append(op);
    this.state = reduce(this.store.getOperations());
    return this.state;
  }

  /**
   * Merge operations received from a peer during sync (idempotent). Re-derives grocery state
   * only when something new arrived. Returns the number of previously-unknown operations
   * merged, so the UI can tell "synced, N new" from "no new data".
   */
  async ingestOperations(incoming: readonly Operation[]): Promise<number> {
    const fresh = await this.store.ingest(incoming);
    if (fresh.length > 0) this.state = reduce(this.store.getOperations());
    return fresh.length;
  }

  addItem(input: AddPayload): Promise<GroceryState> {
    return this.commit(this.store.factory.add(input));
  }

  updateItem(itemId: string, fields: UpdatePayload): Promise<GroceryState> {
    return this.commit(this.store.factory.update(itemId, fields));
  }

  setQuantity(itemId: string, quantity: number): Promise<GroceryState> {
    return this.commit(this.store.factory.setQuantity(itemId, quantity));
  }

  setStatus(itemId: string, status: ItemStatus): Promise<GroceryState> {
    return this.commit(this.store.factory.setStatus(itemId, status));
  }

  markPurchased(itemId: string): Promise<GroceryState> {
    return this.commit(this.store.factory.markPurchased(itemId));
  }

  restore(itemId: string): Promise<GroceryState> {
    return this.commit(this.store.factory.restore(itemId));
  }

  deleteItem(itemId: string): Promise<GroceryState> {
    return this.commit(this.store.factory.delete(itemId));
  }
}
