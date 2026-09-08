// Compact, scannable encoding for WebRTC signalling codes.
//
// A raw offer/answer (SDP, wrapped in JSON) is ~1 KB, which makes a QR far too dense to scan
// from another phone's screen. SDP is highly repetitive text, so we gzip it before base64:
// that cuts the payload enough for a single, comfortably scannable QR.
//
// Compression is done with fflate (pure JavaScript, standard gzip) rather than the browser's
// CompressionStream, so the code is identical and interoperable on every phone and browser -
// including iOS, where CompressionStream only exists on very recent versions. A one-character
// tag records the format; a legacy untagged (plain base64-JSON) code is still accepted.

import { gzipSync, gunzipSync, strToU8, strFromU8 } from "fflate";

const TAG_GZIP = "g";

/** Encode an offer/answer description into a compact, scannable code. */
export function encodeSignal(desc: RTCSessionDescription | null): string {
  const json = JSON.stringify(desc);
  return TAG_GZIP + bytesToBase64(gzipSync(strToU8(json)));
}

/** Decode a code produced by encodeSignal (or a legacy untagged base64-JSON code). */
export function decodeSignal(code: string): RTCSessionDescriptionInit {
  const s = code.trim();
  if (s[0] === TAG_GZIP) return JSON.parse(strFromU8(gunzipSync(base64ToBytes(s.slice(1))))) as RTCSessionDescriptionInit;
  return JSON.parse(atob(s)) as RTCSessionDescriptionInit; // legacy untagged base64-JSON
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
