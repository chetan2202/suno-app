// Google Drive implementation of the CloudSync contract. Orchestrates: sign-in (token),
// find/create the household folder, and one sync cycle = download every ops-*.json in the
// folder, merge them into the op log (idempotent), then upload this device's own log.
//
// Under one shared household Google account, each device writes ops-<device_id>.json and
// sees every other device's file, so the whole household converges to the union of all
// logs. "Near realtime" is a foreground poll (no server => no Drive push).

import type { Operation } from "../domain/types.js";
import type { GroceryRepository } from "../storage/repository.js";
import type { CloudConfigStore } from "../storage/cloud-config.js";
import type { AccessToken } from "./google-identity.js";
import type { CloudStatus, CloudSync, CloudSyncView } from "./cloud-sync.js";
import { DriveClient } from "./drive-client.js";
import { requestAccessToken, fetchAccountEmail } from "./google-identity.js";
import { driveFolderName, isCloudConfigured } from "./google-config.js";

const POLL_MS = 20_000;

export interface DriveSyncDeps {
  grocery: GroceryRepository;
  config: CloudConfigStore;
  deviceId: string;
  /** Current household name (for the folder name). */
  householdName: () => string;
  /** Notify the UI that status changed (re-render the menu). */
  onStatus: () => void;
  /** Notify that the grocery log changed after a merge (re-render the list). */
  onChange: () => void;
}

export class DriveCloudSync implements CloudSync {
  private token: AccessToken | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private status: CloudStatus;
  private message = "";
  private lastSyncAt: number | null = null;
  private readonly client = new DriveClient(() => this.ensureToken(false));

  constructor(private readonly deps: DriveSyncDeps) {
    this.status = deps.config.get().enabled ? "syncing" : "off";
  }

  getView(): CloudSyncView {
    const cfg = this.deps.config.get();
    return {
      configured: isCloudConfigured(),
      enabled: cfg.enabled,
      status: this.status,
      account: cfg.account,
      message: this.message,
      lastSyncAt: this.lastSyncAt,
    };
  }

  private set(status: CloudStatus, message = ""): void {
    this.status = status;
    this.message = message;
    this.deps.onStatus();
  }

  /** Return a valid token, refreshing it. `interactive` allows the account chooser. */
  private async ensureToken(interactive: boolean): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now()) return this.token.token;
    this.token = await requestAccessToken(interactive);
    return this.token.token;
  }

  async connect(): Promise<void> {
    if (!isCloudConfigured()) {
      this.set("error", "Cloud sync is not configured in this build.");
      return;
    }
    this.set("connecting", "Signing in to Google...");
    try {
      const token = await this.ensureToken(true);
      const account = await fetchAccountEmail(token);
      const folderId = await this.client.ensureFolder(driveFolderName(this.deps.householdName()));
      await this.deps.config.patch({ enabled: true, folderId, account });
      await this.syncNow();
      this.startTimer();
    } catch (e) {
      this.set("error", messageOf(e));
    }
  }

  async resume(): Promise<void> {
    const cfg = this.deps.config.get();
    if (!cfg.enabled || !isCloudConfigured()) return;
    this.set("syncing", "Reconnecting cloud sync...");
    try {
      await this.ensureToken(false); // silent; relies on an existing grant
      await this.syncNow();
      this.startTimer();
    } catch {
      // Silent refresh failed (token expired / no active grant): keep it enabled but ask
      // the user to reconnect rather than popping a chooser unprompted.
      this.set("error", "Tap Reconnect to resume cloud sync.");
    }
  }

  async disconnect(): Promise<void> {
    this.stop();
    await this.deps.config.patch({ enabled: false });
    this.token = null;
    this.set("off", "");
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private startTimer(): void {
    this.stop();
    this.timer = setInterval(() => void this.syncNow().catch(() => {}), POLL_MS);
  }

  async syncNow(): Promise<void> {
    const cfg = this.deps.config.get();
    if (!cfg.enabled && this.status !== "connecting") return;
    this.set("syncing", "Syncing...");
    try {
      const folderId =
        cfg.folderId ?? (await this.client.ensureFolder(driveFolderName(this.deps.householdName())));
      if (folderId !== cfg.folderId) await this.deps.config.patch({ folderId });

      const ownName = `ops-${this.deps.deviceId}.json`;
      const files = await this.client.listOpFiles(folderId);

      // Download and merge every peer file (skip our own; it holds nothing new for us).
      const incoming: Operation[] = [];
      for (const file of files) {
        if (file.name === ownName) continue;
        const text = await this.client.download(file.id);
        const ops = parseOps(text);
        if (ops) incoming.push(...ops);
      }
      if (incoming.length > 0) {
        await this.deps.grocery.ingestOperations(incoming);
        this.deps.onChange();
      }

      // Upload our own full log (create the file once, then update in place).
      const content = JSON.stringify(this.deps.grocery.getOperations());
      let fileId = cfg.fileId ?? files.find((f) => f.name === ownName)?.id ?? null;
      if (fileId) {
        await this.client.update(fileId, content);
      } else {
        fileId = await this.client.create(folderId, ownName, content);
      }
      if (fileId !== cfg.fileId) await this.deps.config.patch({ fileId });

      this.lastSyncAt = Date.now();
      this.set("synced", "");
    } catch (e) {
      this.set("error", messageOf(e));
    }
  }
}

function parseOps(text: string): Operation[] | null {
  try {
    const data = JSON.parse(text) as unknown;
    return Array.isArray(data) ? (data as Operation[]) : null;
  } catch {
    return null;
  }
}

function messageOf(e: unknown): string {
  return e instanceof Error ? e.message : "Cloud sync failed.";
}
