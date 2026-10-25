// Generates the PNG icons used by the studio's own PWA manifest.
// Pure Node (zlib) — no native image dependencies, so it also runs in CI/Netlify.
// Usage: npm run icons
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '..', 'public', 'icons');

/* ---------------------------- PNG encoding ---------------------------- */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([length, typeBuf, data, crc]);
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ----------------------------- Rasteriser ----------------------------- */

const SS = 4; // supersampling factor (anti-aliasing)

function insideRoundRect(px, py, x, y, w, h, r) {
  if (px < x || py < y || px > x + w || py > y + h) return false;
  const rr = Math.min(r, w / 2, h / 2);
  const cx = Math.min(Math.max(px, x + rr), x + w - rr);
  const cy = Math.min(Math.max(py, y + rr), y + h - rr);
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= rr * rr;
}

const lerp = (a, b, t) => a + (b - a) * t;
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const START = hex('#4f46e5');
const END = hex('#ec4899');

/** Renders the AppCraft launcher icon: gradient rounded square + white app glyph. */
function renderIcon(size, { maskable = false } = {}) {
  const S = size;
  const out = Buffer.alloc(S * S * 4);
  const radius = maskable ? 0 : S * 0.22;
  const pad = maskable ? S * 0.20 : S * 0.20; // glyph padding
  const w = S - pad * 2;
  const h = S - pad * 2;
  const ring = S * 0.050;

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x + (sx + 0.5) / SS;
          const py = y + (sy + 0.5) / SS;
          const inBg = insideRoundRect(px, py, 0, 0, S, S, radius);
          if (!inBg) continue;

          // Diagonal gradient background
          const t = Math.min(1, Math.max(0, (px / S) * 0.45 + (py / S) * 0.55));
          let cr = lerp(START[0], END[0], t);
          let cg = lerp(START[1], END[1], t);
          let cb = lerp(START[2], END[2], t);

          // White rounded "phone" outline
          const outer = insideRoundRect(px, py, pad, pad, w, h, S * 0.10);
          const inner = insideRoundRect(
            px, py,
            pad + ring, pad + ring,
            w - ring * 2, h - ring * 2,
            Math.max(0, S * 0.10 - ring)
          );
          if (outer && !inner) {
            cr = cg = cb = 255;
          } else if (inner) {
            // White app tile in the middle of the "screen"
            const tile = insideRoundRect(px, py, S * 0.40, S * 0.40, S * 0.20, S * 0.20, S * 0.05);
            if (tile) cr = cg = cb = 255;
          }

          r += cr;
          g += cg;
          b += cb;
          a += 255;
        }
      }
      const samples = SS * SS;
      const i = (y * S + x) * 4;
      out[i] = Math.round(r / samples);
      out[i + 1] = Math.round(g / samples);
      out[i + 2] = Math.round(b / samples);
      out[i + 3] = Math.round(a / samples);
    }
  }
  return encodePng(S, S, out);
}

mkdirSync(outDir, { recursive: true });
const targets = [
  ['icon-192.png', 192, {}],
  ['icon-512.png', 512, {}],
  ['icon-maskable-512.png', 512, { maskable: true }],
  ['apple-touch-icon.png', 180, {}],
  ['favicon-64.png', 64, {}],
];

for (const [name, size, opts] of targets) {
  writeFileSync(resolve(outDir, name), renderIcon(size, opts));
  console.log(`generated public/icons/${name} (${size}x${size})`);
}
