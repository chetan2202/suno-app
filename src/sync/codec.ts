// Compact, scannable encoding for WebRTC signalling codes.
//
// A raw offer/answer (SDP, wrapped in JSON) is ~1 KB. Rendered as a QR that is far too
// dense to scan from another phone's screen - the camera cannot resolve the tiny modules,
// so the pairing "just doesn't catch". SDP is highly repetitive text, so we gzip it before
// base64: that cuts the payload enough to make a single, comfortably scannable QR.
//
// Both peers run this same codec. A one-character tag records the format so decoding stays
// unambiguous, and an untagged (legacy plain base64-JSON) code from an older build is still
// accepted.

const TAG_GZIP = "g";
const TAG_PLAIN = "j"; // used only where CompressionStream is unavailable

/** Encode an offer/answer description into a compact code (compressed where possible). */
export async function encodeSignal(desc: RTCSessionDescription | null): Promise<string> {
  const json = JSON.stringify(desc);
  if (typeof CompressionStream === "undefined") return TAG_PLAIN + btoa(json);
  return TAG_GZIP + bytesToBase64(await gzip(json));
}

/** Decode a code produced by encodeSignal (or a legacy untagged base64-JSON code). */
export async function decodeSignal(code: string): Promise<RTCSessionDescriptionInit> {
  const s = code.trim();
  const body = s.slice(1);
  if (s[0] === TAG_GZIP) return JSON.parse(await gunzip(base64ToBytes(body))) as RTCSessionDescriptionInit;
  if (s[0] === TAG_PLAIN) return JSON.parse(atob(body)) as RTCSessionDescriptionInit;
  return JSON.parse(atob(s)) as RTCSessionDescriptionInit; // legacy untagged
}

async function gzip(text: string): Promise<Uint8Array> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function gunzip(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).text();
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
