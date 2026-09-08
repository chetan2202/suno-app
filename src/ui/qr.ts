// QR helpers: generate a QR image for any string, and (where the browser supports it)
// scan one from the camera.

import QRCode from "qrcode";
import { el } from "./dom.js";

/** An <img> whose src is filled asynchronously with a QR of the text. */
export function qrImage(text: string, size = 200): HTMLImageElement {
  const img = el("img", { class: "qr", "aria-label": "QR code" });
  img.width = size;
  img.height = size;
  QRCode.toDataURL(text, { margin: 1, width: size })
    .then((url) => {
      img.src = url;
    })
    .catch(() => {
      img.alt = "QR unavailable";
    });
  return img;
}

/** True if this browser can scan QR codes from the camera. */
export function canScan(): boolean {
  return "BarcodeDetector" in globalThis && !!navigator.mediaDevices?.getUserMedia;
}

/**
 * Scan a single QR code from the camera into the given <video>. Calls onCode with the first
 * code found (then stops), or onError if the camera/detector is unavailable. Returns a stop
 * function that releases the camera. Used by both the invite-join and Wi-Fi-sync flows.
 */
export async function scanQr(
  video: HTMLVideoElement,
  onCode: (code: string) => void,
  onError: () => void,
): Promise<() => void> {
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
