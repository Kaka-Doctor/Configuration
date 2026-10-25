import type { AppConfig } from '../types/appConfig';

/**
 * Generates real PNG launcher / PWA icons from the user's uploaded logo.
 *
 * Two rendering paths:
 *  1. Browser: <canvas> — renders the uploaded PNG/JPG/SVG (or the app initials)
 *     with proper fonts and image scaling.
 *  2. Any environment without a DOM (tests, CLI): a dependency-free RGBA
 *     rasteriser that draws a branded gradient tile, so exported projects always
 *     contain valid mipmap PNGs instead of missing resources.
 */

export interface GeneratedAsset {
  path: string;
  blob: Blob;
}

const DENSITIES: Array<[string, number]> = [
  ['mdpi', 48],
  ['hdpi', 72],
  ['xhdpi', 96],
  ['xxhdpi', 144],
  ['xxxhdpi', 192],
];

/* --------------------------- pure PNG encoder --------------------------- */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function u32(value: number): Uint8Array {
  return new Uint8Array([(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff]);
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** zlib stream using uncompressed DEFLATE blocks (valid everywhere, no deps). */
function zlibStore(data: Uint8Array): Uint8Array {
  const chunks: Uint8Array[] = [new Uint8Array([0x78, 0x01])];
  const max = 65535;
  for (let offset = 0; offset < data.length; offset += max) {
    const len = Math.min(max, data.length - offset);
    const final = offset + len >= data.length ? 1 : 0;
    const header = new Uint8Array(5);
    header[0] = final;
    header[1] = len & 0xff;
    header[2] = (len >>> 8) & 0xff;
    header[3] = ~len & 0xff;
    header[4] = (~len >>> 8) & 0xff;
    chunks.push(header, data.subarray(offset, offset + len));
  }
  // adler32
  let a = 1;
  let b = 0;
  for (let i = 0; i < data.length; i++) {
    a = (a + data[i]) % 65521;
    b = (b + a) % 65521;
  }
  chunks.push(new Uint8Array([(b >>> 8) & 0xff, b & 0xff, (a >>> 8) & 0xff, a & 0xff]));
  return concat(chunks);
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  return concat([u32(data.length), typeBytes, data, u32(crc32(concat([typeBytes, data])))]);
}

function encodePng(width: number, height: number, rgba: Uint8Array): Blob {
  const stride = width * 4;
  const raw = new Uint8Array((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    raw.set(rgba.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }
  const ihdr = new Uint8Array(13);
  ihdr.set(u32(width), 0);
  ihdr.set(u32(height), 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const signature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const bytes = concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlibStore(raw)),
    pngChunk('IEND', new Uint8Array(0)),
  ]);
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new Blob([buffer], { type: 'image/png' });
}

/* ---------------------------- fallback render ---------------------------- */

function hexToRgb(hex: string): [number, number, number] {
  const clean = (hex || '#4f46e5').replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const value = Number.parseInt(full.slice(0, 6) || '4f46e5', 16);
  if (Number.isNaN(value)) return [79, 70, 229];
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

function insideRoundRect(px: number, py: number, x: number, y: number, w: number, h: number, r: number): boolean {
  if (px < x || py < y || px > x + w || py > y + h) return false;
  const rr = Math.min(r, w / 2, h / 2);
  const cx = Math.min(Math.max(px, x + rr), x + w - rr);
  const cy = Math.min(Math.max(py, y + rr), y + h - rr);
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= rr * rr;
}

/** Gradient tile + white app glyph. Used when no DOM/canvas is available. */
function renderFallbackIcon(size: number, bgColor: string, round: boolean): Blob {
  const [r0, g0, b0] = hexToRgb(bgColor);
  const r1 = Math.min(255, r0 + 50);
  const g1 = Math.min(255, g0 + 30);
  const b1 = Math.min(255, b0 + 80);
  const out = new Uint8Array(size * size * 4);
  const ss = 3;
  const radius = round ? size / 2 : size * 0.22;
  const pad = size * 0.24;
  const ring = size * 0.055;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const px = x + (sx + 0.5) / ss;
          const py = y + (sy + 0.5) / ss;
          if (!insideRoundRect(px, py, 0, 0, size, size, radius)) continue;
          const t = (px + py) / (size * 2);
          let cr = r0 + (r1 - r0) * t;
          let cg = g0 + (g1 - g0) * t;
          let cb = b0 + (b1 - b0) * t;
          const outer = insideRoundRect(px, py, pad, pad, size - pad * 2, size - pad * 2, size * 0.08);
          const inner = insideRoundRect(
            px, py,
            pad + ring, pad + ring,
            size - pad * 2 - ring * 2, size - pad * 2 - ring * 2,
            Math.max(0, size * 0.08 - ring)
          );
          if (outer && !inner) {
            cr = cg = cb = 255;
          } else if (inner && insideRoundRect(px, py, size * 0.42, size * 0.42, size * 0.16, size * 0.16, size * 0.04)) {
            cr = cg = cb = 255;
          }
          r += cr;
          g += cg;
          b += cb;
          a += 255;
        }
      }
      const samples = ss * ss;
      const i = (y * size + x) * 4;
      out[i] = Math.round(r / samples);
      out[i + 1] = Math.round(g / samples);
      out[i + 2] = Math.round(b / samples);
      out[i + 3] = Math.round(a / samples);
    }
  }
  return encodePng(size, size, out);
}

/* ---------------------------- canvas rendering --------------------------- */

function canUseCanvas(): boolean {
  return typeof document !== 'undefined' && typeof document.createElement === 'function';
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

async function renderCanvasIcon(
  config: AppConfig,
  size: number,
  options: { round?: boolean; maskable?: boolean } = {}
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return renderFallbackIcon(size, config.appLogo.bgColor || config.themeColor, !!options.round);

  const bg = config.appLogo.bgColor || config.themeColor || '#4f46e5';
  const fg = config.appLogo.iconColor || '#ffffff';

  // Background
  ctx.save();
  if (options.round) {
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
  } else if (!options.maskable) {
    roundedRectPath(ctx, 0, 0, size, size, size * 0.22);
    ctx.clip();
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);
  ctx.restore();

  const logo = config.appLogo.customImageUrl;
  if (logo) {
    const img = await loadImage(logo);
    if (img) {
      const pad = options.maskable ? size * 0.18 : size * 0.1;
      const box = size - pad * 2;
      const ratio = Math.min(box / img.width, box / img.height);
      const w = Math.max(1, img.width * ratio);
      const h = Math.max(1, img.height * ratio);
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      return toPngBlob(canvas, config, size);
    }
  }

  // Initials fallback (branded tile)
  const initials = (config.shortName || config.appName || 'App').trim().slice(0, 2).toUpperCase();
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.round(size * 0.4)}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  ctx.fillText(initials, size / 2, size / 2 + size * 0.02);
  return toPngBlob(canvas, config, size);
}

function toPngBlob(canvas: HTMLCanvasElement, config: AppConfig, size: number): Promise<Blob> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob ?? renderFallbackIcon(size, config.appLogo.bgColor || config.themeColor, false));
    }, 'image/png');
  });
}

/* ------------------------------- public API ------------------------------ */

export async function buildAndroidIconAssets(config: AppConfig): Promise<GeneratedAsset[]> {
  const assets: GeneratedAsset[] = [];
  for (const [density, size] of DENSITIES) {
    assets.push({
      path: `app/src/main/res/mipmap-${density}/ic_launcher.png`,
      blob: await renderIcon(config, size, { round: false }),
    });
    assets.push({
      path: `app/src/main/res/mipmap-${density}/ic_launcher_round.png`,
      blob: await renderIcon(config, size, { round: true }),
    });
  }
  return assets;
}

export async function buildPwaIconAssets(config: AppConfig): Promise<GeneratedAsset[]> {
  return [
    { path: 'icons/icon-192.png', blob: await renderIcon(config, 192, {}) },
    { path: 'icons/icon-512.png', blob: await renderIcon(config, 512, {}) },
    { path: 'icons/icon-maskable-512.png', blob: await renderIcon(config, 512, { maskable: true }) },
  ];
}

async function renderIcon(
  config: AppConfig,
  size: number,
  options: { round?: boolean; maskable?: boolean }
): Promise<Blob> {
  if (canUseCanvas()) {
    return renderCanvasIcon(config, size, options);
  }
  return renderFallbackIcon(size, config.appLogo.bgColor || config.themeColor, !!options.round);
}
