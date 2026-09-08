// QR helpers: generate a QR image for any string, and (where the browser supports it)
// scan one from the camera.

import QRCode from "qrcode";
import jsQR from "jsqr";
import { el } from "./dom.js";

/** Error-correction level: L (most data capacity, sparsest) ... H (most robust, densest). */
export type QrLevel = "L" | "M" | "Q" | "H";

/** An <img> whose src is filled asynchronously with a QR of the text. A larger size and a
 * lower error-correction level make a big payload (e.g. a sync code) sparse enough to scan. */
export function qrImage(text: string, size = 200, level: QrLevel = "M"): HTMLImageElement {
  const img = el("img", { class: "qr", "aria-label": "QR code" });
  img.width = size;
  img.height = size;
  QRCode.toDataURL(text, { margin: 1, width: size, errorCorrectionLevel: level })
    .then((url) => {
      img.src = url;
    })
    .catch(() => {
      img.alt = "QR unavailable";
    });
  return img;
}

/** True if this browser can open the camera (all we need - decoding is pure JS via jsQR).
 * getUserMedia requires a secure context (https/localhost), so this is false on plain http. */
export function canScan(): boolean {
  return !!navigator.mediaDevices?.getUserMedia;
}

/**
 * Scan a single QR code from the camera into the given <video>. Decoding uses jsQR (pure
 * JavaScript), so it works identically on every phone and browser - including iOS Safari,
 * which lacks the BarcodeDetector API. Calls onCode with the first code found (then stops),
 * or onError if the camera is unavailable. Returns a stop function that releases the camera.
 * Used by both the invite-join and Wi-Fi-sync flows.
 */
export async function scanQr(
  video: HTMLVideoElement,
  onCode: (code: string) => void,
  onError: () => void,
): Promise<() => void> {
  let stream: MediaStream | null = null;
  let stop = false;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    video.srcObject = stream;
    await video.play();
    const tick = () => {
      if (stop) return;
      if (ctx && video.videoWidth > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const found = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: "dontInvert" });
        if (found?.data) {
          onCode(found.data);
          return;
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  } catch {
    onError();
  }
  return () => {
    stop = true;
    stream?.getTracks().forEach((t) => t.stop());
  };
}
