// The hamburger menu: household identity, invite (admin), Wi-Fi sync (admin hosts /
// member joins), catalog + members admin, diet profile, leave/reset, version.

import { el } from "../dom.js";
import type { ViewCtx } from "../context.js";
import { encodeInvite } from "../../domain/invite.js";
import { qrImage } from "../qr.js";
import { renderCatalogEditor } from "./catalog-editor.js";
import { renderMembers } from "./members.js";

function householdCard(ctx: ViewCtx): HTMLElement {
  const name = el("input", {
    class: "field grow",
    type: "text",
    value: ctx.settings.household_name,
    onChange: () => void ctx.actions.renameHousehold((name as HTMLInputElement).value),
  });
  const roleText = ctx.settings.role === "admin" ? "Admin" : "Member";
  return el("div", { class: "menu-card" }, [
    el("div", { class: "menu-card-head" }, [
      el("span", { class: "field-label", text: "Household" }),
      el("span", { class: "role-badge", text: roleText }),
    ]),
    ctx.settings.role === "admin"
      ? name
      : el("p", { class: "menu-value", text: ctx.settings.household_name }),
  ]);
}

function inviteSection(ctx: ViewCtx): HTMLElement | false {
  if (ctx.settings.role !== "admin" || !ctx.settings.household_id) return false;
  const code = encodeInvite({
    v: 1,
    hid: ctx.settings.household_id,
    hname: ctx.settings.household_name,
    profile: ctx.settings.profile_id,
  });
  const codeBox = el("textarea", { class: "field code-input", value: code }) as HTMLTextAreaElement;
  codeBox.readOnly = true;
  return el("details", { class: "menu-section" }, [
    el("summary", { text: "👨‍👩‍👧 Invite family" }),
    el("p", { class: "hint", text: "Have the family member open Suno → Join a household, then scan this or paste the code." }),
    el("div", { class: "qr-wrap" }, [qrImage(code)]),
    codeBox,
  ]);
}

function syncSection(ctx: ViewCtx): HTMLElement {
  const s = ctx.sync;
  const status = el("p", { class: "sync-status", text: s.status || "Not connected." });
  const children: (HTMLElement | false)[] = [status];

  if (ctx.settings.role === "admin") {
    if (!s.active) {
      children.push(el("button", { class: "btn primary full", text: "Start Wi-Fi sync", onClick: () => void ctx.actions.syncHostStart() }));
    } else {
      if (s.shareCode) {
        children.push(el("p", { class: "hint", text: "1. Show this to the member (their app scans / pastes it):" }));
        children.push(el("div", { class: "qr-wrap" }, [qrImage(s.shareCode)]));
        const box = el("textarea", { class: "field code-input", value: s.shareCode }) as HTMLTextAreaElement;
        box.readOnly = true;
        children.push(box);
      }
      const answer = el("textarea", { class: "field code-input", placeholder: "2. Paste the member's reply code" }) as HTMLTextAreaElement;
      children.push(answer);
      children.push(el("button", { class: "btn primary full", text: "Connect", onClick: () => void ctx.actions.syncHostConnect(answer.value) }));
      children.push(el("button", { class: "btn ghost full", text: "Stop sync", onClick: () => ctx.actions.syncStop() }));
    }
  } else {
    const offer = el("textarea", { class: "field code-input", placeholder: "1. Paste the admin's sync code" }) as HTMLTextAreaElement;
    children.push(offer);
    children.push(el("button", { class: "btn primary full", text: "Generate reply", onClick: () => void ctx.actions.syncGuestAnswer(offer.value) }));
    if (s.shareCode) {
      children.push(el("p", { class: "hint", text: "2. Send this reply back to the admin:" }));
      children.push(el("div", { class: "qr-wrap" }, [qrImage(s.shareCode)]));
      const box = el("textarea", { class: "field code-input", value: s.shareCode }) as HTMLTextAreaElement;
      box.readOnly = true;
      children.push(box);
    }
    if (s.active) children.push(el("button", { class: "btn ghost full", text: "Stop sync", onClick: () => ctx.actions.syncStop() }));
  }

  return el("details", { class: "menu-section" }, [
    el("summary", { text: "🔁 Sync over Wi-Fi" }),
    el("p", { class: "hint", text: "Both devices must be on the same Wi-Fi. The admin hosts and can stop it anytime." }),
    ...children.filter((c): c is HTMLElement => c !== false),
  ]);
}

function adminSections(ctx: ViewCtx): (HTMLElement | false)[] {
  if (ctx.settings.role !== "admin") return [];
  return [
    el("details", { class: "menu-section" }, [
      el("summary", { text: "🧺 Catalog & profile" }),
      renderCatalogEditor(ctx),
    ]),
    el("details", { class: "menu-section" }, [
      el("summary", { text: "👤 Members" }),
      renderMembers(ctx),
    ]),
  ];
}

export function renderMenu(ctx: ViewCtx): HTMLElement {
  const sections: (HTMLElement | false)[] = [
    householdCard(ctx),
    inviteSection(ctx),
    syncSection(ctx),
    ...adminSections(ctx),
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
      el("button", { class: "icon-btn", text: "✕", "aria-label": "Close", onClick: () => ctx.actions.closeMenu() }),
    ]),
    ...sections.filter((c): c is HTMLElement => c !== false),
  ]);
}
