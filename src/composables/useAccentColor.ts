import { ref, Ref, watch } from "vue";

// The icon is drawn this small before sampling: enough pixels to find the
// dominant colour, few enough that the whole pass is imperceptible.
const SAMPLE_SIZE = 48;
// Quantisation: 4 bits per channel, so near-identical shades share a bucket.
const BITS = 4;

// The accent gets pushed into this range so every card reads as the same
// family of wash, however muddy or neon the source icon happens to be.
const MIN_SATURATION = 0.35;
const MAX_SATURATION = 0.85;
const MIN_LIGHTNESS = 0.42;
const MAX_LIGHTNESS = 0.62;

type Bucket = { r: number; g: number; b: number; count: number; score: number };

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) return [0, 0, l];

  const s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / delta) % 6;
  else if (max === g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;

  return [(h * 60 + 360) % 360, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
      h < 60 ? [c, x, 0] :
      h < 120 ? [x, c, 0] :
      h < 180 ? [0, c, x] :
      h < 240 ? [0, x, c] :
      h < 300 ? [x, 0, c] :
      [c, 0, x];
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

/**
 * Picks the colour that carries the icon, which is rarely the most common one:
 * logos sit on flat white or black fields that would otherwise win by volume.
 * Pixels are bucketed by quantised colour and each bucket scored by how much
 * area it covers *and* how much colour it actually has, so a small vivid mark
 * beats a large pale field.
 */
function dominantColor(image: HTMLImageElement): string | null {
  const canvas = document.createElement("canvas");
  canvas.width = SAMPLE_SIZE;
  canvas.height = SAMPLE_SIZE;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);

  let pixels: Uint8ClampedArray;
  try {
    pixels = context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data;
  } catch {
    // Tainted canvas (a cross-origin icon): no sample to be had.
    return null;
  }

  const buckets = new Map<number, Bucket>();
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) continue;
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];

    const [, saturation, lightness] = rgbToHsl(r, g, b);
    // Paper and ink: neither says anything about the icon's colour.
    if (lightness > 0.94 || lightness < 0.06) continue;

    // Weight by colourfulness, then by how far the shade is from either
    // extreme — a mid-tone red is a better accent than a near-black one.
    const weight = (0.12 + saturation) * (1 - Math.abs(lightness - 0.5));

    const key = ((r >> (8 - BITS)) << (BITS * 2))
        | ((g >> (8 - BITS)) << BITS)
        | (b >> (8 - BITS));
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.r += r; bucket.g += g; bucket.b += b;
      bucket.count++;
      bucket.score += weight;
    } else {
      buckets.set(key, { r, g, b, count: 1, score: weight });
    }
  }

  let winner: Bucket | null = null;
  for (const bucket of buckets.values()) {
    if (!winner || bucket.score > winner.score) winner = bucket;
  }
  if (!winner) return null;

  const [hue, saturation, lightness] = rgbToHsl(
      winner.r / winner.count,
      winner.g / winner.count,
      winner.b / winner.count,
  );
  const [r, g, b] = hslToRgb(
      hue,
      Math.min(Math.max(saturation, MIN_SATURATION), MAX_SATURATION),
      Math.min(Math.max(lightness, MIN_LIGHTNESS), MAX_LIGHTNESS),
  );
  return `rgb(${r} ${g} ${b})`;
}

// Shared across components: the same icon never gets sampled twice.
const cache = new Map<string, Promise<string | null>>();

function load(src: string): Promise<string | null> {
  const cached = cache.get(src);
  if (cached) return cached;

  const pending = new Promise<string | null>((resolve) => {
    const image = new Image();
    // Deliberately no crossOrigin: the icons are same-origin, and leaving it
    // unset shares a cache entry with the <img> the card already renders. A
    // remote icon would taint the canvas instead, which dominantColor() handles.
    image.onload = () => resolve(dominantColor(image));
    image.onerror = () => resolve(null);
    image.src = src;
  });
  cache.set(src, pending);
  return pending;
}

/**
 * Resolves to the accent colour of the image at `src` as a CSS colour, or null
 * while it is still loading and if it cannot be sampled. Callers should treat
 * null as "no tint" rather than waiting on it.
 */
export function useAccentColor(src: Ref<string>) {
  const accent = ref<string | null>(null);

  watch(src, (value) => {
    accent.value = null;
    load(value).then((color) => {
      // A later src may have won the race while this one was decoding.
      if (src.value === value) accent.value = color;
    });
  }, { immediate: true });

  return accent;
}
