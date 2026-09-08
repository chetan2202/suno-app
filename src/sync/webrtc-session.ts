// Serverless local-network sync via WebRTC data channels with manual signalling.
//
// A browser cannot host a classic always-on LAN server (that is the native adapter's
// job, architecture.md section 10). WebRTC is the browser-native equivalent: two
// devices on the same Wi-Fi connect peer-to-peer. Signalling is manual — the admin
// (host) produces an offer code, the member (guest) returns an answer code — so no
// signalling server is needed. ICE uses local host candidates only (iceServers: []),
// keeping traffic on the local network.
//
// The codes are compressed (see codec.ts) so their QR is sparse enough to scan from another
// phone's screen; a raw SDP makes a QR too dense for a camera to read.

import { encodeSignal, decodeSignal } from "./codec.js";

type Cb0 = () => void;
type Cb1 = (text: string) => void;

export interface SyncSession {
  /** Host: create the offer code to share with a member. */
  createOffer(): Promise<string>;
  /** Host: apply the answer code returned by the member. */
  applyAnswer(code: string): Promise<void>;
  /** Guest: apply the host's offer code and return an answer code. */
  applyOffer(code: string): Promise<string>;
  send(text: string): void;
  onOpen(cb: Cb0): void;
  onMessage(cb: Cb1): void;
  onClose(cb: Cb0): void;
  close(): void;
}

/** Resolve once ICE candidate gathering is complete (candidates are then in the SDP). */
function waitForIce(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    const check = () => {
      if (pc.iceGatheringState === "complete") {
        pc.removeEventListener("icegatheringstatechange", check);
        resolve();
      }
    };
    pc.addEventListener("icegatheringstatechange", check);
    setTimeout(resolve, 2500); // fallback if gathering stalls
  });
}

export class WebRtcSession implements SyncSession {
  private readonly pc = new RTCPeerConnection({ iceServers: [] });
  private channel: RTCDataChannel | null = null;
  private readonly openCbs: Cb0[] = [];
  private readonly msgCbs: Cb1[] = [];
  private readonly closeCbs: Cb0[] = [];

  private wire(channel: RTCDataChannel): void {
    this.channel = channel;
    channel.onopen = () => this.openCbs.forEach((cb) => cb());
    channel.onmessage = (e) => this.msgCbs.forEach((cb) => cb(String(e.data)));
    channel.onclose = () => this.closeCbs.forEach((cb) => cb());
  }

  async createOffer(): Promise<string> {
    this.wire(this.pc.createDataChannel("ops"));
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    await waitForIce(this.pc);
    return encodeSignal(this.pc.localDescription);
  }

  async applyAnswer(code: string): Promise<void> {
    await this.pc.setRemoteDescription(await decodeSignal(code));
  }

  async applyOffer(code: string): Promise<string> {
    this.pc.ondatachannel = (e) => this.wire(e.channel);
    await this.pc.setRemoteDescription(await decodeSignal(code));
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    await waitForIce(this.pc);
    return encodeSignal(this.pc.localDescription);
  }

  send(text: string): void {
    if (this.channel?.readyState === "open") this.channel.send(text);
  }

  onOpen(cb: Cb0): void {
    this.openCbs.push(cb);
  }
  onMessage(cb: Cb1): void {
    this.msgCbs.push(cb);
  }
  onClose(cb: Cb0): void {
    this.closeCbs.push(cb);
  }

  close(): void {
    this.channel?.close();
    this.pc.close();
  }
}
