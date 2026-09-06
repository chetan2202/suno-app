// IndexedDB implementation of the persistence port (the real browser storage).

import type { LocalIdentity, Operation } from "../domain/types.js";
import type { PersistencePort } from "./port.js";
import { openDatabase, requestToPromise, transactionDone } from "./idb.js";
import {
  DB_NAME,
  DB_VERSION,
  META_IDENTITY_KEY,
  STORE_META,
  STORE_OPERATIONS,
  upgrade,
} from "./schema.js";

interface MetaRecord {
  key: string;
  value: unknown;
}

export class IdbPersistence implements PersistencePort {
  private constructor(private readonly db: IDBDatabase) {}

  static async open(): Promise<IdbPersistence> {
    const db = await openDatabase(DB_NAME, DB_VERSION, upgrade);
    return new IdbPersistence(db);
  }

  async loadIdentity(): Promise<LocalIdentity | null> {
    const tx = this.db.transaction(STORE_META, "readonly");
    const record = await requestToPromise<MetaRecord | undefined>(
      tx.objectStore(STORE_META).get(META_IDENTITY_KEY),
    );
    return record ? (record.value as LocalIdentity) : null;
  }

  async saveIdentity(identity: LocalIdentity): Promise<void> {
    const tx = this.db.transaction(STORE_META, "readwrite");
    tx.objectStore(STORE_META).put({ key: META_IDENTITY_KEY, value: identity });
    await transactionDone(tx);
  }

  async appendOperations(ops: readonly Operation[]): Promise<void> {
    if (ops.length === 0) return;
    const tx = this.db.transaction(STORE_OPERATIONS, "readwrite");
    const store = tx.objectStore(STORE_OPERATIONS);
    for (const op of ops) store.put(op); // put keyed by operation_id => idempotent
    await transactionDone(tx);
  }

  async loadOperations(): Promise<Operation[]> {
    const tx = this.db.transaction(STORE_OPERATIONS, "readonly");
    return requestToPromise<Operation[]>(tx.objectStore(STORE_OPERATIONS).getAll());
  }
}
