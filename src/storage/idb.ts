// Minimal promise wrapper over IndexedDB. Kept tiny and dependency-free on purpose:
// we only need open, request-to-promise, and transaction-complete. See CLAUDE.md
// (prefer simple solutions; justify every dependency).

/** Resolve an IDBRequest to its result. */
export function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Resolve when a transaction commits (or reject if it aborts/errors). */
export function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/** Upgrade callback: create/alter stores based on the version being upgraded from. */
export type UpgradeFn = (
  db: IDBDatabase,
  oldVersion: number,
  tx: IDBTransaction,
) => void;

/** Open (and migrate) a database. */
export function openDatabase(
  name: string,
  version: number,
  upgrade: UpgradeFn,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = globalThis.indexedDB.open(name, version);
    request.onupgradeneeded = (event) => {
      const tx = request.transaction;
      if (tx) upgrade(request.result, event.oldVersion, tx);
    };
    request.onsuccess = () => {
      const db = request.result;
      // If another connection (e.g. an upgrade or delete in another tab) needs a
      // version change, step aside by closing so it is not blocked.
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error(`IndexedDB open blocked for "${name}"`));
  });
}
