// The hamburger menu: household identity, invite (admin), Wi-Fi sync (admin hosts /
// member joins), catalog + members admin, diet profile, leave/reset, version.

import { el } from "../dom.js";
import type { ViewCtx } from "../context.js";
import { encodeInvite } from "../../domain/invite.js";
import { qrImage, canScan, scanQr } from "../qr.js";
import { renderCatalogEditor } from "./catalog-editor.js";
import { renderMembers } from "./members.js";
import { icon, type IconName } from "../icon.js";

/** A <summary> with a leading flat icon and a label. */
function summaryLabel(name: IconName, text: string): HTMLElement {
  return el("summary", {}, [icon(name, 20), el("span", { class: "summary-text", text })]);
}

// A collapsible menu section whose open/closed state survives re-renders: the key is
// remembered in the controller (ctx.openSections) and re-applied here, and a user toggle
// records the new state without forcing a re-render.
function section(ctx: ViewCtx, key: string, children: (HTMLElement | false)[]): HTMLElement {
  return el(
    "details",
    {
      class: "menu-section",
      open: ctx.openSections.has(key),
      onToggle: (e) => ctx.actions.toggleSection(key, (e.target as HTMLDetailsElement).open),
    },
    children.filter((c): c is HTMLElement => c !== false),
  );
}

function householdCard(ctx: ViewCtx): HTMLElement {
  const name = el("input", {
    class: "field grow",
    type: "text",
    value: ctx.settings.household_name,
    onChange: () => void ctx.actions.renameHousehold((name as HTMLInputElement).value),
  });
  return el("div", { class: "menu-card" }, [
    el("div", { class: "menu-card-head" }, [
      el("span", { class: "field-label", text: "Household" }),
    ]),
    name,
  ]);
}

function inviteSection(ctx: ViewCtx): HTMLElement | false {
  if (!ctx.settings.household_id) return false;
  const code = encodeInvite({
    v: 1,
    hid: ctx.settings.household_id,
    hname: ctx.settings.household_name,
    profile: ctx.settings.profile_id,
  });
  const codeBox = el("textarea", { class: "field code-input", value: code }) as HTMLTextAreaElement;
  codeBox.readOnly = true;
  return section(ctx, "invite", [
    summaryLabel("users", "Invite family"),
    el("p", { class: "hint", text: "Have the family member open Suno → Join a household, then scan this or paste the code." }),
    el("div", { class: "qr-wrap" }, [qrImage(code)]),
    codeBox,
  ]);
}

/** A read-only textarea showing a code the user can copy. */
function codeBox(code: string): HTMLTextAreaElement {
  const box = el("textarea", { class: "field code-input", value: code }) as HTMLTextAreaElement;
  box.readOnly = true;
  return box;
}

/** QR + code the other phone scans or copies. */
function showCode(text: string, code: string): HTMLElement[] {
  return [
    el("p", { class: "hint", text }),
    el("div", { class: "qr-wrap" }, [qrImage(code)]),
    codeBox(code),
  ];
}

// A "scan the other phone's QR" control with a paste fallback. Tapping the button swaps in a
// live camera view; the first QR found is handed to onCode. Where the camera is unavailable
// (or the user prefers), a paste box + button provides the same code path.
function scanOrPaste(scanLabel: string, pastePlaceholder: string, onCode: (code: string) => void): HTMLElement {
  const wrap = el("div", { class: "scan-area" });
  const error = el("p", { class: "form-error", text: "" });

  if (canScan()) {
    const video = el("video", { class: "scan-video" }) as HTMLVideoElement;
    video.setAttribute("playsinline", "");
    const scanBtn = el("button", { class: "btn full", text: scanLabel, onClick: () => {
      scanBtn.replaceWith(video);
      void scanQr(
        video,
        (raw) => onCode(raw.trim()),
        () => { error.textContent = "Camera not available. Paste the code instead."; },
      );
    } });
    wrap.append(scanBtn);
  }

  const paste = el("textarea", { class: "field code-input", placeholder: pastePlaceholder }) as HTMLTextAreaElement;
  const useBtn = el("button", { class: "btn ghost full", text: "Use pasted code", onClick: () => {
    if (paste.value.trim()) onCode(paste.value.trim());
  } });
  wrap.append(paste, useBtn, error);
  return wrap;
}

/** Green tick + count after an exchange, or a plain "no new data" line. */
function syncResult(newOps: number): HTMLElement {
  if (newOps <= 0) return el("p", { class: "sync-status", text: "No new data." });
  return el("p", { class: "sync-ok" }, [
    icon("check", 16, "sync-tick"),
    el("span", { text: `Synced - ${newOps} new update${newOps === 1 ? "" : "s"}.` }),
  ]);
}

// Wi-Fi sync is symmetric: any phone (admin or member) can start a sync or scan another
// phone to join. It runs peer-to-peer over WebRTC; the two devices swap a QR/code once to
// connect, then exchange operation logs and converge.
function syncSection(ctx: ViewCtx): HTMLElement {
  const s = ctx.sync;
  const children: (HTMLElement | false)[] = [];

  if (s.status) children.push(el("p", { class: "sync-status", text: s.status }));
  if (s.result) children.push(syncResult(s.result.newOps));

  if (!s.active) {
    children.push(el("button", { class: "btn primary full", text: "Start sync", onClick: () => void ctx.actions.syncStart() }));
    children.push(el("p", { class: "hint", text: "or scan a phone that already started:" }));
    children.push(scanOrPaste("Scan a phone", "Paste the other phone's sync code", (code) => void ctx.actions.syncJoin(code)));
  } else if (s.role === "host") {
    if (s.shareCode) children.push(...showCode("1. Let the other phone scan this (or copy the code):", s.shareCode));
    children.push(el("p", { class: "hint", text: "2. Then scan their reply:" }));
    children.push(scanOrPaste("Scan reply", "Paste the reply code", (code) => void ctx.actions.syncApplyReply(code)));
    children.push(el("button", { class: "btn ghost full", text: "Stop sync", onClick: () => ctx.actions.syncStop() }));
  } else {
    if (s.shareCode) children.push(...showCode("Show this reply to the other phone (scan or copy):", s.shareCode));
    children.push(el("button", { class: "btn ghost full", text: "Stop sync", onClick: () => ctx.actions.syncStop() }));
  }

  return section(ctx, "sync", [
    summaryLabel("sync", "Sync over Wi-Fi"),
    el("p", { class: "hint", text: "Both phones must be on the same Wi-Fi. Any phone can start; the other scans the code." }),
    ...children,
  ]);
}

function cloudStatusText(ctx: ViewCtx): string {
  const c = ctx.cloud;
  if (c.message) return c.message;
  switch (c.status) {
    case "connecting": return "Signing in...";
    case "syncing": return "Syncing...";
    case "synced": return c.lastSyncAt ? `Synced ${timeAgo(c.lastSyncAt)}.` : "Synced.";
    case "error": return "Sync error.";
    default: return c.enabled ? "Connected." : "Off.";
  }
}

function timeAgo(ts: number): string {
  const secs = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  return `${Math.round(mins / 60)} h ago`;
}

function cloudSection(ctx: ViewCtx): HTMLElement {
  const c = ctx.cloud;
  const children: (HTMLElement | false)[] = [
    summaryLabel("sync", "Cloud sync (Google Drive)"),
    el("p", { class: "hint", text: "Everyone signs into the same household Google account. Lists sync automatically, no Wi-Fi pairing." }),
  ];

  if (!c.configured) {
    children.push(el("p", { class: "sync-status", text: "Not set up in this build yet." }));
    return section(ctx, "cloud", children);
  }

  children.push(el("p", { class: "sync-status", text: cloudStatusText(ctx) }));

  if (!c.enabled) {
    children.push(el("button", { class: "btn primary full", text: "Connect Google Drive", onClick: () => void ctx.actions.cloudConnect() }));
  } else {
    if (c.account) children.push(el("p", { class: "hint", text: `Signed in as ${c.account}` }));
    const busy = c.status === "syncing" || c.status === "connecting";
    if (c.status === "error") {
      // A background token expiry lands here: re-consent, do not just retry the API.
      children.push(el("button", { class: "btn primary full", text: "Reconnect", onClick: () => void ctx.actions.cloudConnect() }));
    } else {
      children.push(el("button", { class: "btn primary full", text: "Sync now", disabled: busy, onClick: () => void ctx.actions.cloudSyncNow() }));
    }
    children.push(el("button", { class: "btn ghost full", text: "Disconnect", onClick: () => void ctx.actions.cloudDisconnect() }));
  }

  return section(ctx, "cloud", children);
}

// Catalog and members management - available to everyone now (no admin).
function manageSections(ctx: ViewCtx): (HTMLElement | false)[] {
  if (!ctx.settings.household_id) return [];
  return [
    section(ctx, "catalog", [
      summaryLabel("grid", "Catalog & profile"),
      renderCatalogEditor(ctx),
    ]),
    section(ctx, "members", [
      summaryLabel("user", "Members"),
      renderMembers(ctx),
    ]),
  ];
}

export function renderMenu(ctx: ViewCtx): HTMLElement {
  const sections: (HTMLElement | false)[] = [
    householdCard(ctx),
    inviteSection(ctx),
    syncSection(ctx), // Wi-Fi (WebRTC) sync - the core feature.
    // Google Drive cloud sync stays hidden until an OAuth client id is configured
    // (owner disabled the Drive button; backend decision still open).
    ctx.cloud.configured && cloudSection(ctx),
    ...manageSections(ctx),
    el("button", { class: "btn danger full", text: "Leave & reset household", onClick: () => {
      if (confirm("Leave this household on this device? Your local list stays until you set up again.")) {
        void ctx.actions.resetHousehold();
      }
    } }),
    el("p", { class: "menu-foot", text: `Suno v${ctx.appVersion} · works offline · data stays on your phone` }),
  ];

  return el("div", { class: "menu-screen" }, [
    el("div", { class: "menu-head" }, [
      el("h1", { class: "screen-title", text: "Menu" }),
      el("button", { class: "icon-btn", "aria-label": "Close", onClick: () => ctx.actions.closeMenu() }, [icon("close", 22)]),
    ]),
    ...sections.filter((c): c is HTMLElement => c !== false),
  ]);
}
