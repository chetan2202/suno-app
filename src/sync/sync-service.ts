// Sync engine on top of a SyncSession. Because state is an idempotent fold of the
// operation log, sync is just: on connect, each side sends its full log; each side
// ingests the other's (dedup by operation_id, re-reduce). After one exchange both
// devices hold the union and converge. Re-running is safe.

import type { Operation } from "../domain/types.js";
import type { GroceryRepository } from "../storage/repository.js";
import type { SyncSession } from "./webrtc-session.js";

export type SyncStatus = "idle" | "waiting" | "connected" | "synced" | "closed";

export class SyncService {
  constructor(
    private readonly grocery: GroceryRepository,
    private readonly onStatus: (status: SyncStatus) => void,
    private readonly onChange: () => void,
  ) {}

  /** Wire a session so it exchanges and merges operation logs once connected. */
  attach(session: SyncSession): void {
    session.onOpen(() => {
      this.onStatus("connected");
      session.send(JSON.stringify(this.grocery.getOperations()));
    });
    session.onMessage((text) => {
      void this.ingest(text);
    });
    session.onClose(() => this.onStatus("closed"));
  }

  private async ingest(text: string): Promise<void> {
    let ops: Operation[];
    try {
      ops = JSON.parse(text) as Operation[];
    } catch {
      return;
    }
    if (!Array.isArray(ops)) return;
    await this.grocery.ingestOperations(ops);
    this.onStatus("synced");
    this.onChange();
  }
}
