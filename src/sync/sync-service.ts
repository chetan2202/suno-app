// Sync engine on top of a SyncSession. Because state is an idempotent fold of the
// operation log, sync is: on connect, exchange logs; each side ingests the other's
// (dedup by operation_id, re-reduce) and converges. Re-running is safe.
//
// Privacy: the two peers first exchange their member ids, then each sends only the
// operations the OTHER peer is entitled to (shareableOperations) - grocery to everyone,
// to-do only to the members a task involves. Personal tasks never go on the wire.

import type { Operation } from "../domain/types.js";
import type { SyncSession } from "./webrtc-session.js";
import { shareableOperations } from "./privacy.js";

export type SyncStatus = "idle" | "waiting" | "connected" | "synced" | "closed";

export interface SyncDeps {
  /** The full local operation log. */
  getOperations: () => readonly Operation[];
  /** This device's member id (or null if not identified). */
  myMemberId: () => string | null;
  /** Merge received operations into the shared store; returns how many were new. */
  ingest: (ops: Operation[]) => Promise<number>;
  onStatus: (status: SyncStatus) => void;
  /** Report the outcome of an exchange: how many previously-unknown ops we merged. */
  onResult: (newOps: number) => void;
  onChange: () => void;
}

interface Hello { hello: string | null; }
interface OpsMsg { ops: Operation[]; }

export class SyncService {
  constructor(private readonly deps: SyncDeps) {}

  /** Wire a session so it exchanges member ids then filtered operation logs. */
  attach(session: SyncSession): void {
    session.onOpen(() => {
      this.deps.onStatus("connected");
      session.send(JSON.stringify({ hello: this.deps.myMemberId() } satisfies Hello));
    });
    session.onMessage((text) => {
      const msg = parse(text);
      if (!msg) return;
      if ("hello" in msg) {
        // Learned the peer's member id: send only what they may receive.
        const ops = shareableOperations(this.deps.getOperations(), msg.hello);
        session.send(JSON.stringify({ ops } satisfies OpsMsg));
      } else {
        void this.ingest(msg.ops);
      }
    });
    session.onClose(() => this.deps.onStatus("closed"));
  }

  private async ingest(ops: Operation[]): Promise<void> {
    if (!Array.isArray(ops)) return;
    const newOps = await this.deps.ingest(ops);
    this.deps.onStatus("synced");
    this.deps.onResult(newOps);
    this.deps.onChange();
  }
}

function parse(text: string): Hello | OpsMsg | null {
  try {
    const data = JSON.parse(text) as unknown;
    if (data && typeof data === "object" && ("hello" in data || "ops" in data)) return data as Hello | OpsMsg;
    return null;
  } catch {
    return null;
  }
}
