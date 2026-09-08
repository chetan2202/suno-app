// Member join screen: scan the admin's invite QR (where the camera supports it) or
// paste the invite code. Joining records the household locally; live data sync happens
// later over Wi-Fi from the Sync menu.

import { el } from "../dom.js";
import type { ViewCtx } from "../context.js";
import { canScan, scanQr } from "../qr.js";
import { icon } from "../icon.js";

export function renderJoin(ctx: ViewCtx): HTMLElement {
  const code = el("textarea", { class: "field code-input", placeholder: "Paste the invite code here" }) as HTMLTextAreaElement;
  const error = el("p", { class: "form-error", text: "" });

  const submit = () => {
    ctx.actions.joinFromCode(code.value).catch(() => {
      error.textContent = "That invite code is not valid.";
    });
  };

  const scanArea = el("div", { class: "scan-area" });
  if (canScan()) {
    const video = el("video", { class: "scan-video" }) as HTMLVideoElement;
    video.setAttribute("playsinline", "");
    const scanBtn = el("button", { class: "btn ghost", text: "Scan QR with camera", onClick: () => {
      scanArea.replaceChildren(video);
      void scanQr(
        video,
        (raw) => ctx.actions.joinFromCode(raw).catch(() => { error.textContent = "That QR is not a valid invite."; }),
        () => { error.textContent = "Camera not available. Paste the code instead."; },
      );
    } });
    scanArea.append(scanBtn);
  }

  return el("div", { class: "sheet-screen" }, [
    el("div", { class: "screen-head" }, [
      el("button", { class: "icon-btn", "aria-label": "Back", onClick: () => ctx.actions.cancelJoin() }, [icon("back", 22)]),
      el("h1", { class: "screen-title", text: "Join a household" }),
    ]),
    scanArea,
    el("p", { class: "hint", text: "Ask your family admin to open Menu → Invite, and share the QR or code." }),
    code,
    error,
    el("button", { class: "btn primary big full", text: "Join", onClick: submit }),
  ]);
}
