// Update UI. The banner lets the admin choose to apply a newly available version.
// The forced screen blocks a device that is older than the household requires.

import { el } from "../dom.js";

/** Dismissible-free banner shown to the admin when a new version is ready. */
export function updateBanner(onUpdate: () => void): HTMLElement {
  return el("div", { class: "update-banner" }, [
    el("span", { class: "update-text", text: "A new version is available." }),
    el("button", { class: "btn small", text: "Update now", onClick: onUpdate }),
  ]);
}

/** Full-screen block for a device running an outdated app the household no longer allows. */
export function renderForcedUpdate(onUpdate: () => void): HTMLElement {
  return el("div", { class: "forced-update" }, [
    el("div", { class: "forced-card" }, [
      el("h1", { class: "forced-title", text: "Update required" }),
      el("p", {
        class: "forced-body",
        text: "Your household has moved to a newer version of the app. Update to keep using it.",
      }),
      el("button", { class: "btn primary big", text: "Update now", onClick: onUpdate }),
    ]),
  ]);
}
