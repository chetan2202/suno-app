import { describe, it, expect } from "vitest";
import { encodeSignal, decodeSignal } from "./codec.js";

// A representative offer: a realistic (repetitive) SDP wrapped like a session description.
const sample: RTCSessionDescriptionInit = {
  type: "offer",
  sdp:
    "v=0\r\no=- 4611731400430051336 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n" +
    "a=group:BUNDLE 0\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\n" +
    "c=IN IP4 0.0.0.0\r\na=ice-ufrag:abcd\r\na=ice-pwd:0123456789abcdef0123456789\r\n" +
    "a=candidate:1 1 udp 2113937151 192.168.1.5 54321 typ host\r\n".repeat(6) +
    "a=fingerprint:sha-256 AB:CD:EF:00:11:22:33:44:55:66:77:88:99\r\na=setup:actpass\r\n",
};

describe("signalling codec", () => {
  it("round-trips a description and compresses it well", async () => {
    const code = await encodeSignal(sample as unknown as RTCSessionDescription);
    expect(code[0]).toBe("g"); // gzip path in the node test env
    expect(code.length).toBeLessThan(JSON.stringify(sample).length); // smaller than raw base64 would be
    expect(await decodeSignal(code)).toEqual(sample);
  });

  it("accepts a legacy untagged base64-JSON code", async () => {
    const legacy = btoa(JSON.stringify(sample));
    expect(await decodeSignal(legacy)).toEqual(sample);
  });

  it("tolerates surrounding whitespace (e.g. a pasted code)", async () => {
    const code = await encodeSignal(sample as unknown as RTCSessionDescription);
    expect(await decodeSignal(`  ${code}\n`)).toEqual(sample);
  });
});
