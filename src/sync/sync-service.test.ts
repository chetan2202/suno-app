import { describe, it, expect } from "vitest";
import { SyncService, type SyncDeps } from "./sync-service.js";
import type { SyncSession } from "./webrtc-session.js";
import type { Operation } from "../domain/types.js";

// A stand-in transport that lets a test drive the channel callbacks by hand and inspect
// what the service sent, without a real WebRTC connection.
class FakeSession implements SyncSession {
  openCb: (() => void) | null = null;
  msgCb: ((t: string) => void) | null = null;
  closeCb: (() => void) | null = null;
  sent: string[] = [];
  async createOffer(): Promise<string> { return "offer"; }
  async applyAnswer(): Promise<void> {}
  async applyOffer(): Promise<string> { return "answer"; }
  send(text: string): void { this.sent.push(text); }
  onOpen(cb: () => void): void { this.openCb = cb; }
  onMessage(cb: (t: string) => void): void { this.msgCb = cb; }
  onClose(cb: () => void): void { this.closeCb = cb; }
  close(): void {}
}

function ops(...ids: string[]): Operation[] {
  return ids.map((id) => ({ operation_id: id } as Operation));
}

function deps(overrides: Partial<SyncDeps> = {}): { deps: SyncDeps; results: number[]; statuses: string[] } {
  const results: number[] = [];
  const statuses: string[] = [];
  const base: SyncDeps = {
    getOperations: () => [],
    myMemberId: () => "mem-a",
    ingest: async (incoming) => incoming.length, // pretend every incoming op is new
    onStatus: (s) => statuses.push(s),
    onResult: (n) => results.push(n),
    onChange: () => {},
    ...overrides,
  };
  return { deps: base, results, statuses };
}

describe("SyncService", () => {
  it("reports the number of new operations after an exchange (green-tick case)", async () => {
    const { deps: d, results, statuses } = deps();
    const session = new FakeSession();
    new SyncService(d).attach(session);

    session.msgCb?.(JSON.stringify({ ops: ops("x", "y") }));
    await Promise.resolve();
    await Promise.resolve();

    expect(results).toEqual([2]);
    expect(statuses).toContain("synced");
  });

  it("reports zero when nothing new arrived (no-new-data case)", async () => {
    const { deps: d, results } = deps({ ingest: async () => 0 });
    const session = new FakeSession();
    new SyncService(d).attach(session);

    session.msgCb?.(JSON.stringify({ ops: ops("dup") }));
    await Promise.resolve();
    await Promise.resolve();

    expect(results).toEqual([0]);
  });

  it("greets with its member id on open and answers a hello with shareable ops", async () => {
    const { deps: d } = deps();
    const session = new FakeSession();
    new SyncService(d).attach(session);

    session.openCb?.();
    expect(JSON.parse(session.sent[0] ?? "{}")).toEqual({ hello: "mem-a" });

    session.msgCb?.(JSON.stringify({ hello: "mem-b" }));
    const reply = JSON.parse(session.sent[1] ?? "{}") as { ops?: unknown };
    expect(Array.isArray(reply.ops)).toBe(true);
  });
});
