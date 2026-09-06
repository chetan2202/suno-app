// In-memory implementation of the persistence port. Used by unit tests (no browser
// needed) and available as an ephemeral fallback. Mirrors IndexedDB semantics:
// operations are keyed by operation_id, so appending the same operation twice is a
// no-op.

import type { LocalIdentity, Operation } from "../domain/types.js";
import type { PersistencePort } from "./port.js";

export class MemoryPersistence implements PersistencePort {
  private identity: LocalIdentity | null = null;
  private readonly ops = new Map<string, Operation>();

  async loadIdentity(): Promise<LocalIdentity | null> {
    return this.identity;
  }

  async saveIdentity(identity: LocalIdentity): Promise<void> {
    this.identity = identity;
  }

  async appendOperations(ops: readonly Operation[]): Promise<void> {
    for (const op of ops) this.ops.set(op.operation_id, op);
  }

  async loadOperations(): Promise<Operation[]> {
    return [...this.ops.values()];
  }
}
