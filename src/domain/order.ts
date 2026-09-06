// Deterministic total ordering of operations.
//
// Every device must fold the same set of operations into the same state. Ordering is:
//   1. logical_version  (Lamport clock — logical time)
//   2. device_id        (stable tie-break between devices)
//   3. sequence         (per-device monotonic order)
// This triple is unique per operation (a device never reuses a logical_version), so it
// is a deterministic total order. Applying field-setting ops in this order yields
// last-write-wins by logical time.

import type { Operation } from "./types.js";

export function compareOperations(a: Operation, b: Operation): number {
  if (a.logical_version !== b.logical_version) {
    return a.logical_version - b.logical_version;
  }
  if (a.device_id !== b.device_id) {
    return a.device_id < b.device_id ? -1 : 1;
  }
  return a.sequence - b.sequence;
}

/** Remove duplicate operations by operation_id (keeps the first seen). */
export function dedupeOperations(ops: readonly Operation[]): Operation[] {
  const seen = new Set<string>();
  const out: Operation[] = [];
  for (const op of ops) {
    if (seen.has(op.operation_id)) continue;
    seen.add(op.operation_id);
    out.push(op);
  }
  return out;
}

/** Dedupe then sort into the deterministic total order. Does not mutate the input. */
export function orderOperations(ops: readonly Operation[]): Operation[] {
  return dedupeOperations(ops).sort(compareOperations);
}
