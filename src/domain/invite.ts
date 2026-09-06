// Household invite: what the admin shares (as a QR and a short code) so a member can
// join. It carries the household identity and profile. Note: joining records the
// linkage locally; the actual device-to-device data transfer is the sync engine
// (WebRTC over local Wi-Fi / native adapter) and lands with v0.2 — see architecture.md.

export interface HouseholdInvite {
  v: 1;
  hid: string; // household_id
  hname: string; // household_name
  profile: string; // profile_id
}

const PREFIX = "suno:"; // marks a Suno invite string

/** Encode an invite as a compact, copy-pasteable string (also used as the QR payload). */
export function encodeInvite(invite: HouseholdInvite): string {
  const json = JSON.stringify(invite);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return PREFIX + b64;
}

/** Decode an invite string; returns null if it is not a valid Suno invite. */
export function decodeInvite(text: string): HouseholdInvite | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith(PREFIX)) return null;
  try {
    const json = decodeURIComponent(escape(atob(trimmed.slice(PREFIX.length))));
    const parsed = JSON.parse(json) as HouseholdInvite;
    if (parsed.v !== 1 || !parsed.hid) return null;
    return parsed;
  } catch {
    return null;
  }
}
