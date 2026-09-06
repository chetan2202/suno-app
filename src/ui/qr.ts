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
