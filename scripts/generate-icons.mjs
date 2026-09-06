// Generate PWA icons (dependency-free) into public/icons/.
// A full-bleed brand-green tile with a white shopping-bag glyph, safe for both
// "any" and "maskable" purposes. Encodes PNG using Node's zlib only.

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

function iconPixels(N) {
  const buf = Buffer.alloc(N * N * 4);
  const cx = 0.5 * N;
  const bagTop = 0.46 * N;
  const handleR = 0.13 * N;
  const handleT = 0.05 * N;
  const bx0 = 0.33 * N, by0 = bagTop, bx1 = 0.67 * N, by1 = 0.72 * N, br = 0.055 * N;

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      let col = GREEN;

      // handle: top half of a ring sitting above the bag
      const d = Math.hypot(px - cx, py - bagTop);
      if (py < by0 && Math.abs(d - handleR) <= handleT / 2) col = WHITE;

      // bag body
      if (roundedRectContains(px, py, bx0, by0, bx1, by1, br)) col = WHITE;

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
