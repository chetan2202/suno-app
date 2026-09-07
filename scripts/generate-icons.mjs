// Generate PWA icons (dependency-free) into public/icons/.
// Suno is a family super-app (not a grocery app), so the icon is a white speech bubble
// with a check inside on a brand-green tile: "Suno" (listen/say) + things getting done.
// Full-bleed, safe for both "any" and "maskable" purposes. PNG encoded with Node zlib only.

import zlib from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");

const GREEN = [31, 122, 83];
const WHITE = [255, 255, 255];

function roundedRectContains(px, py, x0, y0, x1, y1, r) {
  if (px < x0 || px > x1 || py < y0 || py > y1) return false;
  const nx = px < x0 + r ? x0 + r : px > x1 - r ? x1 - r : px;
  const ny = py < y0 + r ? y0 + r : py > y1 - r ? y1 - r : py;
  return Math.hypot(px - nx, py - ny) <= r;
}

function pointInTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by);
  const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy);
  const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
  const neg = d1 < 0 || d2 < 0 || d3 < 0;
  const pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function iconPixels(N) {
  const buf = Buffer.alloc(N * N * 4);

  // Speech bubble body + a small tail at the bottom-left.
  const bx0 = 0.20 * N, by0 = 0.22 * N, bx1 = 0.80 * N, by1 = 0.60 * N, br = 0.11 * N;
  const tail = [0.32 * N, 0.58 * N, 0.32 * N, 0.75 * N, 0.49 * N, 0.585 * N];

  // Checkmark inside the bubble.
  const c = [0.335 * N, 0.41 * N, 0.44 * N, 0.515 * N, 0.665 * N, 0.30 * N];
  const stroke = 0.055 * N;

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const px = x + 0.5, py = y + 0.5;
      let col = GREEN;

      const inBubble =
        roundedRectContains(px, py, bx0, by0, bx1, by1, br) ||
        pointInTriangle(px, py, tail[0], tail[1], tail[2], tail[3], tail[4], tail[5]);
      if (inBubble) col = WHITE;

      // Check drawn in green, but only where it falls on the white bubble.
      if (inBubble) {
        const onCheck =
          distToSegment(px, py, c[0], c[1], c[2], c[3]) <= stroke / 2 ||
          distToSegment(px, py, c[2], c[3], c[4], c[5]) <= stroke / 2;
        if (onCheck) col = GREEN;
      }

      const i = (y * N + x) * 4;
      buf[i] = col[0];
      buf[i + 1] = col[1];
      buf[i + 2] = col[2];
      buf[i + 3] = 255;
    }
  }
  return buf;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(body) >>> 0, 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(N, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(N, 0);
  ihdr.writeUInt32BE(N, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  const stride = N * 4;
  const raw = Buffer.alloc(N * (stride + 1));
  for (let y = 0; y < N; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

mkdirSync(OUT, { recursive: true });
for (const size of [192, 512]) {
  const png = encodePng(size, iconPixels(size));
  writeFileSync(join(OUT, `icon-${size}.png`), png);
  console.log(`wrote icon-${size}.png (${png.length} bytes)`);
}
