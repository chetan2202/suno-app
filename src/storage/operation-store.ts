// The shared operation log for all modules. Grocery and To-do both append to and read
// from one log through this store, so a device keeps a single monotonic sequence and
// Lamport clock (one OperationFactory) across modules, and sync exchanges one stream.
//
// Each module derives its own state by reducing the log with its own reducer (which
// ignores the other module's operation types).

import type { LocalIdentity, Operation } from "../domain/types.js";
import type { OpEnv } from "../domain/operation-factory.js";
import type { PersistencePort } from "./port.js";
import { OperationFactory } from "../domain/operation-factory.js";
import { newDeviceId } from "../domain/ids.js";

/** Rebuild the factory counters from the log: this device's max sequence, and the highest
 * logical version seen from any device (the Lamport clock). */
function seedCounters(ops: readonly Operation[], deviceId: string) {
  let sequence = 0;
  let logical_version = 0;
  for (const op of ops) {
    if (op.device_id === deviceId && op.sequence > sequence) sequence = op.sequence;
    if (op.logical_version > logical_version) logical_version = op.logical_version;
  }
  return { sequence, logical_version };
}

export class OperationStore {
  private constructor(
    private readonly port: PersistencePort,
    readonly factory: OperationFactory,
    readonly deviceId: string,
    private readonly ops: Operation[],
  ) {}

  /** Open the store: load or create the device identity, load the log, seed the factory. */
  static async open(port: PersistencePort, env?: OpEnv): Promise<OperationStore> {
    let identity = await port.loadIdentity();
    if (!identity) {
      identity = { device_id: newDeviceId() } satisfies LocalIdentity;
      await port.saveIdentity(identity);
    }
    const ops = await port.loadOperations();
    const factory = new OperationFactory(identity.device_id, seedCounters(ops, identity.device_id), env);
    return new OperationStore(port, factory, identity.device_id, ops);
  }

  /** The full operation log (shared across modules; used by sync). */
  getOperations(): readonly Operation[] {
    return this.ops;
  }

  /** Append a locally generated operation. */
  async append(op: Operation): Promise<void> {
    await this.port.appendOperations([op]);
    this.ops.push(op);
  }

  /**
   * Merge operations received from a peer. Deduplicated by operation_id, persisted, and the
   * Lamport clock advanced past anything seen. Returns the fresh (previously-unknown) ops so
   * callers can decide whether to re-reduce.
   */
  async ingest(incoming: readonly Operation[]): Promise<Operation[]> {
    const known = new Set(this.ops.map((o) => o.operation_id));
    const fresh = incoming.filter((o) => !known.has(o.operation_id));
    if (fresh.length > 0) {
      await this.port.appendOperations(fresh);
      for (const op of fresh) {
        this.ops.push(op);
        this.factory.observe(op.logical_version);
      }
    }
    return fresh;
  }
}
