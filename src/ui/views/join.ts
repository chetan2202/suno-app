// Member join screen: scan the admin's invite QR (where the camera supports it) or
// paste the invite code. Joining records the household locally; live data sync happens
// later over Wi-Fi from the Sync menu.

import { el } from "../dom.js";
import type { ViewCtx } from "../context.js";
import { canScan } from "../qr.js";
import { icon } from "../icon.js";

async function scanOnce(video: HTMLVideoElement, onCode: (code: string) => void, onError: () => void): Promise<() => void> {
  let stream: MediaStream | null = null;
  let stop = false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Detector = (globalThis as any).BarcodeDetector;
    const detector = new Detector({ formats: ["qr_code"] });
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    video.srcObject = stream;
    await video.play();
    const tick = async () => {
      if (stop) return;
      try {
        const codes = await detector.detect(video);
        if (codes[0]?.rawValue) {
          onCode(String(codes[0].rawValue));
          return;
        }
      } catch {
        /* keep polling */
      }
      requestAnimationFrame(tick);
    };
    void tick();
  } catch {
    onError();
  }
  return () => {
    stop = true;
    stream?.getTracks().forEach((t) => t.stop());
  };
}

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
      void scanOnce(
        video,
        (raw) => ctx.actions.joinFromCode(raw).catch(() => { error.textContent = "That QR is not a valid invite."; }),
        () => { error.textContent = "Camera not available. Paste the code instead."; },
      );
    } });
    scanArea.append(scanBtn);
  }

  return el("div", { class: "sheet-screen" }, [
    el("div", { class: "screen-head" }, [
      el("button", { class: "icon-btn", "aria-label": "Back", onClick: () => ctx.actions.resetHousehold() }, [icon("back", 22)]),
      el("h1", { class: "screen-title", text: "Join a household" }),
    ]),
    scanArea,
    el("p", { class: "hint", text: "Ask your family admin to open Menu → Invite, and share the QR or code." }),
    code,
    error,
    el("button", { class: "btn primary big full", text: "Join", onClick: submit }),
  ]);
}
