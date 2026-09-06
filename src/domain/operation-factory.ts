// Operation generation. Every grocery mutation becomes an Operation stamped with the
// device id, a per-device monotonic sequence, and a Lamport logical clock. The clock
// and id sources are injected so the factory is fully deterministic under test.

import type { ItemStatus, Operation, OperationType } from "./types.js";
import type {
  AddPayload,
  SetQuantityPayload,
  SetStatusPayload,
  UpdatePayload,
} from "./payloads.js";
import { newItemId, newOperationId } from "./ids.js";

/** Injectable environment: clock and id sources (overridable in tests). */
export interface OpEnv {
  now: () => number;
  operationId: () => string;
  itemId: () => string;
}

const defaultEnv: OpEnv = {
  now: () => Date.now(),
  operationId: newOperationId,
  itemId: newItemId,
};

/** Persisted counters so a device resumes its sequence/clock across sessions. */
export interface OpCounters {
  sequence: number;
  logical_version: number;
}

export class OperationFactory {
  private sequence: number;
  private logical: number;

  constructor(
    private readonly deviceId: string,
    counters: OpCounters = { sequence: 0, logical_version: 0 },
    private readonly env: OpEnv = defaultEnv,
  ) {
    this.sequence = counters.sequence;
    this.logical = counters.logical_version;
  }

  /** Current counters, to persist after generating operations. */
  counters(): OpCounters {
    return { sequence: this.sequence, logical_version: this.logical };
  }

  /**
   * Advance the logical clock on observing a remote operation's version, keeping this
   * device's Lamport clock ahead of anything it has seen (used during v0.2 merge).
   */
  observe(remoteVersion: number): void {
    if (remoteVersion > this.logical) this.logical = remoteVersion;
  }

  private build(
    itemId: string,
    type: OperationType,
    payload: Record<string, unknown>,
  ): Operation {
    this.sequence += 1;
    this.logical += 1;
    return {
      operation_id: this.env.operationId(),
      device_id: this.deviceId,
      sequence: this.sequence,
      item_id: itemId,
      operation_type: type,
      payload,
      logical_version: this.logical,
      created_at: this.env.now(),
    };
  }

  /** Create a new grocery list line; returns the operation (its item_id is generated). */
  add(payload: AddPayload): Operation {
    return this.build(this.env.itemId(), "ADD", { ...payload });
  }

  update(itemId: string, payload: UpdatePayload): Operation {
    return this.build(itemId, "UPDATE", { ...payload });
  }

  setQuantity(itemId: string, quantity: number): Operation {
    const payload: SetQuantityPayload = { quantity };
    return this.build(itemId, "SET_QUANTITY", { ...payload });
  }

  setStatus(itemId: string, status: ItemStatus): Operation {
    const payload: SetStatusPayload = { status };
    return this.build(itemId, "SET_STATUS", { ...payload });
  }

  /** Convenience: mark a line purchased. */
  markPurchased(itemId: string): Operation {
    return this.setStatus(itemId, "purchased");
  }

  /** Restore a line to needed status. */
  restore(itemId: string): Operation {
    return this.build(itemId, "RESTORE", {});
  }

  delete(itemId: string): Operation {
    return this.build(itemId, "DELETE", {});
  }
}
