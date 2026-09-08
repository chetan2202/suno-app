// The welcome / what's-new panel. Shown on first open and again after every release
// (tracked per-device in localStorage against APP_VERSION), dismissed with the corner X.
// It says what Suno does and what changed in this release. A guided tutorial will slot
// into this same panel in a later release.

import { el } from "../dom.js";
import type { ViewCtx } from "../context.js";
import { icon } from "../icon.js";

const SEEN_KEY = "suno.whatsnew.seen";

/** True if this device has not yet seen the panel for the current app version. */
export function shouldShowWhatsNew(appVersion: number): boolean {
  try {
    const seen = Number(localStorage.getItem(SEEN_KEY));
    return !(seen >= appVersion); // absent/NaN -> show
  } catch {
    return true; // storage blocked: still show it
  }
}

/** Remember that this device has seen the panel for the current app version. */
export function markWhatsNewSeen(appVersion: number): void {
  try {
    localStorage.setItem(SEEN_KEY, String(appVersion));
  } catch {
    /* storage blocked: the panel simply shows again next launch */
  }
}

// What Suno is, for a first-time reader.
const ABOUT =
  "Suno keeps your family in sync - a shared grocery list and your own to-dos, all kept " +
  "on your phone. No account, no cloud: your phones sync directly to each other over Wi-Fi.";

// Highlights of the current release. Update this list when APP_VERSION is bumped.
const NEW_POINTS = [
  "Sync works from any phone: tap Start sync, or scan another phone's QR - no admin needed.",
  "After a sync you see a green tick with how many new items arrived, or \"No new data\".",
  "Grocery is the same for everyone now - anyone can add items, tick them off, and manage the list.",
];

export function renderWhatsNew(ctx: ViewCtx): HTMLElement {
  const points = el("ul", { class: "wn-list" }, NEW_POINTS.map((p) => el("li", { text: p })));

  const card = el("div", { class: "wn-card" }, [
    el("button", { class: "wn-close", "aria-label": "Close", onClick: () => ctx.actions.dismissWhatsNew() }, [icon("close", 22)]),
    el("div", { class: "wn-brand" }, [
      el("span", { class: "wn-mark" }, [icon("users", 34)]),
      el("h1", { class: "wn-title", text: "Welcome to Suno" }),
    ]),
    el("p", { class: "wn-about", text: ABOUT }),
    el("h2", { class: "wn-sub", text: "What's new" }),
    points,
    el("button", { class: "btn primary big full", text: "Got it", onClick: () => ctx.actions.dismissWhatsNew() }),
  ]);

  return el("div", { class: "wn-overlay" }, [card]);
}
