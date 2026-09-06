// App and protocol versions.
//
// APP_VERSION is an integer bumped on a release that every household device must run.
// The household stores a required_app_version; a device running an older APP_VERSION
// than the household requires is blocked until it updates (see domain/version-gate.ts).
// Bump this when shipping a release the whole household must move to together.
//
// PROTOCOL_VERSION gates sync compatibility between devices (used from v0.2).

export const APP_VERSION = 1;
export const PROTOCOL_VERSION = 1;
