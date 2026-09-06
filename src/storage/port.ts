// The persistence boundary. The repository depends only on this port, so the same
// logic runs over IndexedDB in the browser and over an in-memory store in tests.
//
// Note there is no counters store: a device's sequence and Lamport clock are
// reconstructed from the operation log on open (see repository.ts). The log is the
// single source of truth.

import type { LocalIdentity, Operation } from "../domain/types.js";

export interface PersistencePort {
  /** The local identity, or null on first run. */
  loadIdentity(): Promise<LocalIdentity | null>;
  /** Persist the local identity (device_id), created once on first run. */
  saveIdentity(identity: LocalIdentity): Promise<void>;
  /** Append operations. Must be idempotent by operation_id (put, not insert). */
  appendOperations(ops: readonly Operation[]): Promise<void>;
  /** Load the whole operation log. */
  loadOperations(): Promise<Operation[]>;
}
