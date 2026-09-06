// Household version gating (pure, testable).
//
// The house admin drives the household's required app version. When the admin moves to
// a newer app version, the household's required version advances to it; every device
// running an older version is then forced to update before it can be used.
//
// In v0.1 there is one device (the admin), so this never blocks locally. The number is
// stored now and, once v0.2 sync propagates it to member devices, their older code will
// see required > running and show the forced-update screen with no rework.

/** True when the running app is older than the household requires. */
export function isUpdateRequired(runningVersion: number, requiredVersion: number): boolean {
  return runningVersion < requiredVersion;
}

/**
 * The household's required version after an admin device reports the version it runs.
 * It only ever moves forward (max), never back.
 */
export function advanceRequiredVersion(currentRequired: number, adminRunningVersion: number): number {
  return Math.max(currentRequired, adminRunningVersion);
}
