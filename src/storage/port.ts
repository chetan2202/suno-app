// The persistence boundary. The repository depends only on this port, so the same
// logic runs over IndexedDB in the browser and over an in-memory store in tests.
//
// Note there is no counters store: a device's sequence and Lamport clock are
// reconstructed from the operation log on open (see repository.ts). The log is the
// single source of truth.
//
// Members and singleton config (household settings, catalog customization) are simple
// local records in v0.1 (admin-managed), not operations. v0.2 will fold them into the
// sync model.

import type { LocalIdentity, Member, Operation } from "../domain/types.js";

export interface PersistencePort {
  /** The local identity, or null on first run. */
  loadIdentity(): Promise<LocalIdentity | null>;
  /** Persist the local identity (device_id), created once on first run. */
  saveIdentity(identity: LocalIdentity): Promise<void>;
  /** Append operations. Must be idempotent by operation_id (put, not insert). */
  appendOperations(ops: readonly Operation[]): Promise<void>;
  /** Load the whole operation log. */
  loadOperations(): Promise<Operation[]>;

  /** Read a singleton config value by key (settings, catalog customization). */
  loadMeta<T>(key: string): Promise<T | null>;
  /** Write a singleton config value by key. */
  saveMeta<T>(key: string, value: T): Promise<void>;

  /** Load all household members. */
  loadMembers(): Promise<Member[]>;
  /** Insert or update a member (keyed by member_id). */
  putMember(member: Member): Promise<void>;
  /** Remove a member by id. */
  deleteMember(memberId: string): Promise<void>;

  /** Erase everything on this device: identity, operation log, members, and config. Used by
   * "Leave & reset" to return the device to a first-run state. */
  clearAll(): Promise<void>;
}
