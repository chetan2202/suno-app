// Device-local cloud-sync configuration, persisted in the generic meta store. This layer
// knows nothing about Google specifically - it stores an opaque record the sync backend
// fills in (whether cloud sync is on, the folder/file ids it uses, the connected account
// label). Keeping it vendor-agnostic keeps Google code out of the storage layer.

import type { PersistencePort } from "./port.js";
import { META_CLOUD_KEY } from "./schema.js";

export interface CloudConfig {
  /** Whether the user turned cloud sync on for this device. */
  enabled: boolean;
  /** Backend-specific id of the household's sync folder (cached to skip re-lookup). */
  folderId: string | null;
  /** Backend-specific id of this device's own op-log file. */
  fileId: string | null;
  /** Display label of the connected account (e.g. an email), for the UI. */
  account: string;
}

export function defaultCloudConfig(): CloudConfig {
  return { enabled: false, folderId: null, fileId: null, account: "" };
}

export class CloudConfigStore {
  private constructor(
    private readonly port: PersistencePort,
    private config: CloudConfig,
  ) {}

  static async open(port: PersistencePort): Promise<CloudConfigStore> {
    const stored = await port.loadMeta<Partial<CloudConfig>>(META_CLOUD_KEY);
    return new CloudConfigStore(port, { ...defaultCloudConfig(), ...(stored ?? {}) });
  }

  get(): CloudConfig {
    return this.config;
  }

  async patch(patch: Partial<CloudConfig>): Promise<void> {
    this.config = { ...this.config, ...patch };
    await this.port.saveMeta(META_CLOUD_KEY, this.config);
  }
}
