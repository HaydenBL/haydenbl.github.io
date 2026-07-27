<template>
  <TransitionRoot :show="!!item.show"
                  enter="transition duration-300 ease-out"
                  enter-from="translate-x-4 opacity-0"
                  enter-to="translate-x-0 opacity-100"
  >
    <a :href="item.link || 'javascript:void(0);'"
       ref="card"
       class="relative flex bg-white px-4 py-2 rounded-2xl h-40 shadow-md origin-center transform-gpu hover:z-10"
       target="_blank"
       @mouseenter="onMouseEnter"
       @mousemove="onMouseMove"
       @mouseleave="onMouseLeave"
    >
      <div v-if="accent" class="tint" :style="{ '--card-accent': accent }"></div>
      <div class="gloss"></div>
      <TransitionChild as="template"
                       enter="transition duration-500 ease-out"
                       enter-from="rotate-45 scale-70 opacity-0"
                       enter-to="rotate-0 scale-100 opacity-100"
      >
        <div class="absolute w-24 sm:w-44 top-4 sm:-top-6 -left-5 sm:-left-9 rounded-full drop-shadow-xl">
          <img class="w-full rounded-full" :src="imageSrc" alt="Icon" />
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
  will-change: transform;
}

/* Specular highlight — reads on the icon; a no-op on the white card face. */
.gloss::before {
  background: radial-gradient(circle farthest-side,
      rgb(255 255 255 / 0.45),
      rgb(255 255 255 / 0.08) 45%,
      rgb(255 255 255 / 0) 75%);
  transform: translate(calc(var(--tilt-x, 0) * -18%), calc(var(--tilt-y, 0) * -18%));
}

/* Falloff over the receding half, wide enough to shade rather than spot. */
.gloss::after {
  background: radial-gradient(circle farthest-side,
      rgb(15 23 42 / 0.06),
      rgb(15 23 42 / 0.02) 55%,
      rgb(15 23 42 / 0) 85%);
  transform: translate(calc(var(--tilt-x, 0) * 26%), calc(var(--tilt-y, 0) * 26%));
}
</style>
