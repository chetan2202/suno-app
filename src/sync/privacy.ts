// Sync privacy policy (requirements R29, S6). The operation log is shared across modules,
// but not every operation may go to every peer:
//   - grocery / household operations are shared with all family devices;
//   - a to-do task's operations go ONLY to the members it involves (its creator and its
//     assignee). Personal tasks (creator === assignee) therefore never leave the owner's
//     own devices, and a delegated task reaches only the delegator and the assignee.
//
// This is a pure function over the log plus the peer's member id, so it is transport- and
// UI-independent and easy to test.

import type { Operation } from "../domain/types.js";
import type { TodoAddPayload } from "../domain/payloads.js";

/** The operations from `ops` that may be sent to a peer who is member `peerMemberId`. */
export function shareableOperations(ops: readonly Operation[], peerMemberId: string | null): Operation[] {
  // Map each task to the two members it involves, from its TODO_ADD.
  const involved = new Map<string, { creator: string; assignee: string }>();
  for (const op of ops) {
    if (op.operation_type === "TODO_ADD") {
      const p = op.payload as unknown as TodoAddPayload;
      involved.set(op.item_id, { creator: p.created_by_member_id, assignee: p.for_member_id });
    }
  }

  return ops.filter((op) => {
    if (!op.operation_type.startsWith("TODO_")) return true; // shared (grocery/household)
    const info = involved.get(op.item_id);
    if (!info) return false; // no known task -> withhold to be safe
    return info.creator === peerMemberId || info.assignee === peerMemberId;
  });
}
