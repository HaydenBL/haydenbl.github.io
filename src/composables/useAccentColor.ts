import { ref, Ref, watch } from "vue";

// The icon is drawn this small before sampling: enough pixels to find the
// dominant colour, few enough that the whole pass is imperceptible.
const SAMPLE_SIZE = 48;
// Quantisation: 4 bits per channel, so near-identical shades share a bucket.
const BITS = 4;

// The accent gets pushed into this range so every card reads as the same
// family of colour, however muddy or neon the source icon happens to be.
const MIN_SATURATION = 0.35;
const MAX_SATURATION = 0.85;

// Below this there is no hue worth keeping. rgbToHsl reports hue 0 when a colour
// has no chroma at all, and hue 0 is red — so clamping a grey winner up to
// MIN_SATURATION invents a colour the icon does not have. A monochrome icon gets
// a grey wedge.
const NEUTRAL_SATURATION = 0.08;

// Lightness is not clamped to a fixed band like saturation is, because the
// colour is used for the wedge that sits directly behind the icon — and the
// wedge is sampled *from* that icon, so left alone it converges on exactly the
// colour it has to be distinguishable from. Instead it is placed a fixed
// distance above the lightness of the icon's own edge. Always above, never
// below: a light field with a solid mark on it is one relationship, and holding
// to it keeps six cards reading as a set.
const LIGHTNESS_GAP = 0.22;
// The ceiling is the binding one, and it is not about the icon: past ~0.86 the
// wedge stops separating from the card face it is drawn on. Clearing the icon
// and staying off the face pull in opposite directions, so this is the
// compromise, not a safety rail.
//
// Neither bound is a contrast guarantee — HSL lightness is not luminance, and
// the spread across hues at one L dwarfs the spread across this whole band. At
// L 0.55, S 0.85 the wedge runs 2.7:1 against black text at hue 240 and 16.9:1
// at hue 60. So the floor exists only so a dark-edged icon still gets a field
// instead of a near-black slab. It never promised the card text was readable
// over the wedge — and since 2026-07-27 it does not have to: the wedge stops at
// --gutter in every state, so no text is drawn over the accent at any width.
// What the band still owes is separation from the icon and from the card face,
// which is what the two bounds above are for. The six current icons all resolve
// to 0.65-0.86, so nothing sits near the floor today.
const MIN_LIGHTNESS = 0.55;
const MAX_LIGHTNESS = 0.86;

// The annulus, as a fraction of the icon's radius, taken to be "the icon's
// edge" — inside the rounded clip, outside the mark in the middle. Only the
// top-left quadrant is measured, since that is the corner the wedge is behind.
const EDGE_INNER = 0.55;
const EDGE_OUTER = 0.92;

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
 * Mean lightness of the icon's edge in the quadrant the wedge sits behind. This
 * is what the wedge actually has to be told apart from — not the icon's overall
 * colour, and not the accent, but the specific ring of pixels the diagonal runs
 * underneath.
 */
function edgeLightness(pixels: Uint8ClampedArray): number | null {
  const radius = SAMPLE_SIZE / 2;
  const inner = EDGE_INNER * radius;
  const outer = EDGE_OUTER * radius;
  let total = 0;
  let count = 0;

  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) continue;
    const index = i / 4;
    const x = (index % SAMPLE_SIZE) + 0.5;
    const y = Math.floor(index / SAMPLE_SIZE) + 0.5;
    if (x > radius || y > radius) continue;

    const distance = Math.hypot(x - radius, y - radius);
    if (distance < inner || distance > outer) continue;

    total += rgbToHsl(pixels[i], pixels[i + 1], pixels[i + 2])[2];
    count++;
  }

  return count ? total / count : null;
}

/**
 * Picks the colour that carries the icon, which is rarely the most common one:
 * logos sit on flat white or black fields that would otherwise win by volume.
 * Pixels are bucketed by quantised colour and each bucket scored by how much
 * area it covers *and* how much colour it actually has, so a small vivid mark
 * beats a large pale field.
 *
 * The winner supplies the hue and saturation. The lightness comes from
 * edgeLightness() instead, for the reason given on LIGHTNESS_GAP above.
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

  // No measurable edge — a fully transparent border, say. Fall back to the
  // winner's own lightness, which is the pre-wedge behaviour.
  const edge = edgeLightness(pixels);
  const target = edge === null ? lightness : edge + LIGHTNESS_GAP;

  const [r, g, b] = hslToRgb(
      hue,
      saturation < NEUTRAL_SATURATION
          ? 0
          : Math.min(Math.max(saturation, MIN_SATURATION), MAX_SATURATION),
      Math.min(Math.max(target, MIN_LIGHTNESS), MAX_LIGHTNESS),
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
 * null as "no wedge" rather than waiting on it.
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
