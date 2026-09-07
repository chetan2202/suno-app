// Deterministic helpers for domain unit tests (no browser, no randomness).

import type { Operation, OperationType } from "./types.js";
import type { OpEnv } from "./operation-factory.js";

/** A deterministic OpEnv: counter-based ids and a monotonic clock. */
export function testEnv(startTime = 1000): OpEnv {
  let opN = 0;
  let itemN = 0;
  let taskN = 0;
  let t = startTime;
  return {
    now: () => t++,
    operationId: () => `op-${++opN}`,
    itemId: () => `item-${++itemN}`,
    taskId: () => `task-${++taskN}`,
  };
}

/** Build a raw Operation for edge-case tests where exact fields matter. */
export function makeOp(partial: Partial<Operation> & Pick<Operation, "operation_type">): Operation {
  return {
    operation_id: partial.operation_id ?? `op-${Math.random()}`,
    device_id: partial.device_id ?? "dev-A",
    sequence: partial.sequence ?? 1,
    item_id: partial.item_id ?? "item-1",
    operation_type: partial.operation_type as OperationType,
    payload: partial.payload ?? {},
    logical_version: partial.logical_version ?? 1,
    created_at: partial.created_at ?? 1000,
  };
}
