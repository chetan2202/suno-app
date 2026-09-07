// The cloud-sync contract the UI depends on, kept vendor-neutral so the controller never
// imports Google code directly. The only implementation today is DriveCloudSync
// (drive-sync-service.ts); another backend could satisfy the same interface later.

export type CloudStatus = "off" | "connecting" | "syncing" | "synced" | "error";

/** Cloud-sync state the menu renders. */
export interface CloudSyncView {
  /** Available at all only when the build has an OAuth client id configured. */
  configured: boolean;
  enabled: boolean;
  status: CloudStatus;
  /** Connected account label (email), when known. */
  account: string;
  /** Human-readable status/error line. */
  message: string;
  /** Epoch ms of the last successful sync, or null. */
  lastSyncAt: number | null;
}

export interface CloudSync {
  getView(): CloudSyncView;
  /** Turn cloud sync on (prompts Google sign-in the first time). */
  connect(): Promise<void>;
  /** Turn cloud sync off on this device (does not delete the Drive folder). */
  disconnect(): Promise<void>;
  /** Resume a previously-enabled session on app start (silent; no account chooser). */
  resume(): Promise<void>;
  /** Run one sync cycle now (download peers, merge, upload own log). */
  syncNow(): Promise<void>;
  /** Stop any background timer (e.g. on reset). */
  stop(): void;
}
