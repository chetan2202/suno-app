// Google sign-in for a static browser app, via Google Identity Services (GIS). Vendor
// code, isolated here: it loads the GIS script on demand and hands back a short-lived
// OAuth access token for the Drive + email scopes. No client secret, no backend.
//
// The token lasts ~1 hour and there is no refresh token in the pure-browser flow, so the
// caller re-requests when it nears expiry (requestToken with no prompt is silent once the
// user has consented in the session).

import { GOOGLE_CLIENT_ID, GOOGLE_SCOPES } from "./google-config.js";

const GIS_SRC = "https://accounts.google.com/gsi/client";

/** Minimal shape of the GIS token-client we use (avoids pulling in @types/google). */
interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
}
interface TokenClient {
  requestAccessToken(overrides?: { prompt?: string }): void;
  callback: (resp: TokenResponse) => void;
}
interface Gsi {
  accounts: {
    oauth2: {
      initTokenClient(config: {
        client_id: string;
        scope: string;
        callback: (resp: TokenResponse) => void;
      }): TokenClient;
    };
  };
}

let gisLoading: Promise<Gsi> | null = null;

/** Load the GIS client script once. */
function loadGis(): Promise<Gsi> {
  const existing = (globalThis as { google?: Gsi }).google;
  if (existing?.accounts?.oauth2) return Promise.resolve(existing);
  if (gisLoading) return gisLoading;
  gisLoading = new Promise<Gsi>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => {
      const g = (globalThis as { google?: Gsi }).google;
      if (g?.accounts?.oauth2) resolve(g);
      else reject(new Error("Google sign-in failed to initialise."));
    };
    s.onerror = () => reject(new Error("Could not reach Google sign-in (offline?)."));
    document.head.append(s);
  });
  return gisLoading;
}

export interface AccessToken {
  token: string;
  /** Epoch ms at which the token expires (with a safety margin already applied). */
  expiresAt: number;
}

/**
 * Request an access token, prompting the user to choose/consent to their Google account
 * the first time. Resolves with the token or rejects if the user cancels or an error
 * occurs. `interactive: false` attempts a silent refresh (no account chooser).
 */
export async function requestAccessToken(interactive = true): Promise<AccessToken> {
  const gis = await loadGis();
  return new Promise<AccessToken>((resolve, reject) => {
    const client = gis.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GOOGLE_SCOPES,
      callback: (resp) => {
        if (resp.error || !resp.access_token) {
          reject(new Error(resp.error || "Google sign-in was cancelled."));
          return;
        }
        const ttl = (resp.expires_in ?? 3600) * 1000;
        resolve({ token: resp.access_token, expiresAt: Date.now() + ttl - 60_000 });
      },
    });
    client.requestAccessToken({ prompt: interactive ? "" : "none" });
  });
}

/** Fetch the signed-in account's email for display (uses the same token). */
export async function fetchAccountEmail(token: string): Promise<string> {
  const resp = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) return "";
  const data = (await resp.json()) as { email?: string };
  return data.email ?? "";
}
