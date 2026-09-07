// Identifier generation for the domain layer.
//
// Uses the Web Crypto API's randomUUID, available in modern browsers and in Node 22
// (globalThis.crypto), so the domain stays testable without a browser.

function uuid(): string {
  return globalThis.crypto.randomUUID();
}

/** A globally unique operation id (ensures idempotent application). */
export function newOperationId(): string {
  return uuid();
}

/** A unique grocery list line id. */
export function newItemId(): string {
  return `item-${uuid()}`;
}

/** A unique to-do task id. */
export function newTaskId(): string {
  return `task-${uuid()}`;
}

/** A unique member id. */
export function newMemberId(): string {
  return `mem-${uuid()}`;
}

/** A unique per-install device id (generated once on first run). */
export function newDeviceId(): string {
  return `dev-${uuid()}`;
}

/** A unique household id (created by the admin on first run). */
export function newHouseholdId(): string {
  return `hh-${uuid()}`;
}
