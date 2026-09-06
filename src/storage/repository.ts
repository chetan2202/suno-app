// Layer 3 repository: the clean API the UI and domain use. It owns the operation log
// and the derived grocery state, and hides persistence behind the port.
//
// Mutations create an operation via the OperationFactory, persist it through the port,
// and re-derive state with the pure reducer. State is never stored directly (it is a
// fold of the log), which keeps a single source of truth and makes v0.2 sync a matter
// of merging operations.

import type { ItemStatus, LocalIdentity, Operation } from "../domain/types.js";
import type { AddPayload, UpdatePayload } from "../domain/payloads.js";
import type { OpCounters, OpEnv } from "../domain/operation-factory.js";
import type { GroceryState } from "../domain/reducer.js";
import type { PersistencePort } from "./port.js";
import { OperationFactory } from "../domain/operation-factory.js";
import { reduce } from "../domain/reducer.js";
import { newDeviceId } from "../domain/ids.js";

/** Rebuild the factory counters from the log: sequence from this device's ops, the
 * Lamport clock from the highest version seen from any device. */
function seedCounters(ops: readonly Operation[], deviceId: string): OpCounters {
  let sequence = 0;
  let logical_version = 0;
  for (const op of ops) {
    if (op.device_id === deviceId && op.sequence > sequence) sequence = op.sequence;
    if (op.logical_version > logical_version) logical_version = op.logical_version;
  }
  return { sequence, logical_version };
}

export class GroceryRepository {
  private state: GroceryState;

  private constructor(
    private readonly port: PersistencePort,
    private readonly factory: OperationFactory,
    private readonly deviceId: string,
    private readonly ops: Operation[],
  ) {
    this.state = reduce(ops);
  }

  /** Open the repository: load or create identity, load the log, seed the factory. */
  static async open(port: PersistencePort, env?: OpEnv): Promise<GroceryRepository> {
    let identity = await port.loadIdentity();
    if (!identity) {
      identity = { device_id: newDeviceId() } satisfies LocalIdentity;
      await port.saveIdentity(identity);
    }
    const ops = await port.loadOperations();
    const factory = new OperationFactory(
      identity.device_id,
      seedCounters(ops, identity.device_id),
      env,
    );
    return new GroceryRepository(port, factory, identity.device_id, ops);
  }

  getDeviceId(): string {
    return this.deviceId;
  }

  getState(): GroceryState {
    return this.state;
  }

  /** The full operation log (used by v0.2 sync). */
  getOperations(): readonly Operation[] {
    return this.ops;
  }

  private async commit(op: Operation): Promise<GroceryState> {
    await this.port.appendOperations([op]);
    this.ops.push(op);
    this.state = reduce(this.ops);
    return this.state;
  }

  addItem(input: AddPayload): Promise<GroceryState> {
    return this.commit(this.factory.add(input));
  }

  updateItem(itemId: string, fields: UpdatePayload): Promise<GroceryState> {
    return this.commit(this.factory.update(itemId, fields));
  }

  setQuantity(itemId: string, quantity: number): Promise<GroceryState> {
    return this.commit(this.factory.setQuantity(itemId, quantity));
  }

  setStatus(itemId: string, status: ItemStatus): Promise<GroceryState> {
    return this.commit(this.factory.setStatus(itemId, status));
  }

  markPurchased(itemId: string): Promise<GroceryState> {
    return this.commit(this.factory.markPurchased(itemId));
  }

  restore(itemId: string): Promise<GroceryState> {
    return this.commit(this.factory.restore(itemId));
  }

  deleteItem(itemId: string): Promise<GroceryState> {
    return this.commit(this.factory.delete(itemId));
  }
}
