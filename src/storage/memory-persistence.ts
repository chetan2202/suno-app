// In-memory implementation of the persistence port. Used by unit tests (no browser
// needed) and available as an ephemeral fallback. Mirrors IndexedDB semantics:
// operations are keyed by operation_id, so appending the same operation twice is a
// no-op.

import type { LocalIdentity, Member, Operation } from "../domain/types.js";
import type { PersistencePort } from "./port.js";

export class MemoryPersistence implements PersistencePort {
  private identity: LocalIdentity | null = null;
  private readonly ops = new Map<string, Operation>();
  private readonly meta = new Map<string, unknown>();
  private readonly members = new Map<string, Member>();

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

  async loadMeta<T>(key: string): Promise<T | null> {
    return this.meta.has(key) ? (this.meta.get(key) as T) : null;
  }

  async saveMeta<T>(key: string, value: T): Promise<void> {
    this.meta.set(key, value);
  }

  async loadMembers(): Promise<Member[]> {
    return [...this.members.values()];
  }

  async putMember(member: Member): Promise<void> {
    this.members.set(member.member_id, member);
  }

  async deleteMember(memberId: string): Promise<void> {
    this.members.delete(memberId);
  }

  async clearAll(): Promise<void> {
    this.identity = null;
    this.ops.clear();
    this.meta.clear();
    this.members.clear();
  }
}
