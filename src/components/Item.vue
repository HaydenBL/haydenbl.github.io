<template>
  <TransitionRoot :show="!!item.show"
                  enter="transition duration-300 ease-out"
                  enter-from="translate-x-4 opacity-0"
                  enter-to="translate-x-0 opacity-100"
  >
    <!-- The face is a hair off white on purpose. A white specular highlight over
         #fff composites back to #fff — no headroom, no effect. Dropping to
         #fafbfc gives the light somewhere to climb while still reading as a
         white card against the page's gray-100. -->
    <a :href="item.link || undefined"
       ref="card"
       class="relative flex bg-[#fafbfc] px-4 py-2 rounded-2xl h-40 shadow-md origin-center transform-gpu hover:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
       target="_blank"
       @mouseenter="onMouseEnter"
       @mousemove="onMouseMove"
       @mouseleave="onMouseLeave"
    >
      <div class="shade"></div>
      <div v-if="accent" class="tint" :style="{ '--card-accent': accent }"></div>
      <div class="grain"></div>
      <div class="gloss"></div>
      <div class="rim"></div>
      <TransitionChild as="template"
                       enter="transition duration-500 ease-out"
                       enter-from="rotate-45 scale-70 opacity-0"
                       enter-to="rotate-0 scale-100 opacity-100"
      >
        <div class="absolute w-24 sm:w-44 top-4 sm:-top-6 -left-5 sm:-left-9 rounded-full drop-shadow-xl">
          <!-- Decorative: the adjacent <h2> already names the project. The
               intrinsic size is stated so the box is reserved before decode;
               h-auto keeps the height attribute from fighting w-full. -->
          <img class="w-full h-auto rounded-full" :src="imageSrc" alt="" width="512" height="512" />
          <div class="gloss"></div>
        </div>
      </TransitionChild>
      <div class="ml-16 sm:ml-32 h-full grow flex flex-col">
        <TransitionChild as="template"
                         enter="transition duration-500 ease-out"
                         enter-from="translate-x-12 opacity-0"
                         enter-to="translate-x-0 opacity-100"
        >
          <h2 class="font-calistoga text-lg sm:text-2xl mb-1">{{ item.name }}</h2>
        </TransitionChild>
        <div class="text-sm sm:text-base pl-2 h-full min-h-0 border-l-4 border-gray-300">
          <TransitionChild as="template"
                           enter="transition duration-500 ease-out"
                           enter-from="translate-x-12 opacity-0"
                           enter-to="translate-x-0 opacity-100"
          >
            <div class="h-full overflow-hidden whitespace-pre-wrap">{{ item.description }}</div>
          </TransitionChild>
        </div>
      </div>
      <div v-if="item.link" class="flex items-end">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </div>
    </a>
  </TransitionRoot>
</template>

<script lang="ts">
import ItemInterface from "../types/ItemInterface";
import { TransitionRoot, TransitionChild } from "@headlessui/vue";
import {computed, defineComponent, PropType} from "vue";
import { useTilt } from "../composables/useTilt";
import { useAccentColor } from "../composables/useAccentColor";

export default defineComponent({
  name: "Item",
  components: {
    TransitionRoot,
    TransitionChild
  },
  props: {
    item: {
      type: Object as PropType<ItemInterface>,
      required: true,
    }
  },
  setup(props) {
    const imageSrc = computed(() => `/assets/${props.item.image}`);
    return {
      ...useTilt(),
      imageSrc,
      accent: useAccentColor(imageSrc),
    };
  }
})
</script>

<style scoped>
/*
 * Card tint: a wash in the icon's own accent colour, sampled off the image by
 * useAccentColor() and handed down as --card-accent. It pools at the top-left
 * corner, where the icon sits, and clears well before the description text.
 */
.tint {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: inherit;
  pointer-events: none;
  background:
      radial-gradient(120% 125% at 6% 0%,
          color-mix(in srgb, var(--card-accent) 45%, transparent) 0%,
          color-mix(in srgb, var(--card-accent) 18%, transparent) 45%,
          transparent 78%),
      linear-gradient(135deg,
          color-mix(in srgb, var(--card-accent) 12%, transparent) 0%,
          transparent 70%);
  /* Sampling finishes a beat after the card lands, so ease it in rather than
   * letting the colour pop on. */
  animation: tint-in 450ms ease-out both;
}

@keyframes tint-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

/*
 * Cardstock. A fractalNoise tile from an inline SVG, so there is no network
 * asset to ship and it rasterises at device resolution — the tooth stays the
 * same physical size on a Retina panel as on a 1x one.
 *
 * multiply, not plain alpha: paper doesn't emit light, it only ever subtracts,
 * and multiplying preserves the accent tint's hue where a neutral grey overlay
 * would wash it out.
 *
 * The mask is the whole point. Its centre tracks +tilt — the same side
 * .gloss::after shades — so the receding half goes textured and dark while the
 * lit half stays smooth. That is how matte stock actually reads under a moving
 * light, and putting the texture opposite the highlight widens the gap between
 * the two halves instead of the grain darkening the very area the gloss is
 * trying to brighten. At rest every stop resolves to full alpha, so the grain
 * is even until you hover.
 *
 * Cost: the stop alphas are calc()'d off --gloss-strength, so this repaints per
 * frame like .rim — same mitigation, a childless overlay whose dirty layer is
 * an empty box. --grain-strength is the one knob worth turning.
 */
.grain {
  --grain-strength: 0.18;
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  opacity: var(--grain-strength);
  mix-blend-mode: multiply;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='c'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23c)'/%3E%3C/svg%3E");
  mask-image: radial-gradient(circle farthest-side at
      calc(50% + var(--tilt-x, 0) * 30%) calc(50% + var(--tilt-y, 0) * 30%),
      rgb(0 0 0 / 1) 0%,
      rgb(0 0 0 / calc(1 - var(--gloss-strength, 0) * 0.5)) 55%,
      rgb(0 0 0 / calc(1 - var(--gloss-strength, 0) * 0.75)) 100%);
}

/*
 * A glossy surface: a broad specular highlight riding opposite the pointer and
 * a matching falloff behind it. Both are placed from --tilt-x/--tilt-y, which
 * useTilt() sets on the card and every gloss inherits, so the icon picks up the
 * same light as the card it sits on. Clips to whatever it is dropped into.
 */
.gloss {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: inherit;
  pointer-events: none;
  opacity: var(--gloss-strength, 0);
  transition: opacity 250ms ease-out;
}

.gloss::before,
.gloss::after {
  content: "";
  position: absolute;
  inset: -50%;
}

/* Specular highlight — reads on the icon; a no-op on the white card face. */
.gloss::before {
  background: radial-gradient(circle farthest-side,
      rgb(255 255 255 / 0.45),
      rgb(255 255 255 / 0.08) 45%,
      rgb(255 255 255 / 0) 75%);
  transform: translate(calc(var(--tilt-x, 0) * -18%), calc(var(--tilt-y, 0) * -18%));
}

/*
 * Falloff over the receding half, wide enough to shade rather than spot. This
 * is the half of the gloss that actually reads on the card face: white can only
 * add ~5 levels over #fafbfc, whereas darkening has the full range to work in.
 */
.gloss::after {
  background: radial-gradient(circle farthest-side,
      rgb(15 23 42 / 0.13),
      rgb(15 23 42 / 0.05) 55%,
      rgb(15 23 42 / 0) 88%);
  transform: translate(calc(var(--tilt-x, 0) * 26%), calc(var(--tilt-y, 0) * 26%));
}

/*
 * Edge light. The card face has almost no room for a white highlight, but its
 * border sits against the darker page, so a lit hairline there is the one place
 * white-on-white becomes legible. The lit arc rides opposite the pointer and
 * the shaded arc trails it, matching the light .gloss uses.
 *
 * The offsets are box-shadow lengths, so this repaints per frame rather than
 * compositing — which is why it lives on its own childless overlay instead of
 * on the card, where it would re-rasterise the icon and text every move.
 */
.rim {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  box-shadow:
      /* Always on, including touch: defines the card against the page. */
      inset 0 0 0 1px rgb(15 23 42 / 0.04),
      /* Blur well past the offset so both arcs feather into the face. At 1px of
       * blur the lit side was a crisp white stripe against the page, which read
       * as a seam between the card and its shadow rather than a lit edge. */
      inset calc(var(--tilt-x, 0) * -2px) calc(var(--tilt-y, 0) * -2px) 4px -1px
        rgb(255 255 255 / calc(var(--gloss-strength, 0) * 0.7)),
      inset calc(var(--tilt-x, 0) * 2px) calc(var(--tilt-y, 0) * 2px) 4px -1px
        rgb(15 23 42 / calc(var(--gloss-strength, 0) * 0.14));
}

/*
 * The depth the card picks up on hover: a soft halo fading in over the resting
 * shadow-md. Contrast against the page rather than against the card face, so it
 * lands at any amplitude.
 *
 * Deliberately not offset or translated. A tilt-driven swing was tried and read
 * as a second rounded rectangle sliding out from under the static shadow-md —
 * two shadows at different offsets look like a detached ghost, not one deeper
 * shadow, and 4° of tilt doesn't move a real cast shadow anyway. The direction
 * of the light is already carried by .rim and .gloss::after. Wide blur with a
 * large negative spread keeps this a gradient, never an edge.
 *
 * Outer shadows are clipped to outside their own border-box, so this inset-0
 * transparent layer paints nothing over the card itself.
 */
.shade {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  box-shadow: 0 10px 34px -12px rgb(15 23 42 / 0.18);
  opacity: var(--gloss-strength, 0);
  transition: opacity 250ms ease-out;
}
</style>
