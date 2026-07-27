<template>
  <!--
    The card's box, held from the first paint. It carries the height that used to
    be on the card itself, for two reasons: an IntersectionObserver needs a box
    to observe, and a hidden TransitionRoot renders nothing at all — so without
    this there would be no element in the grid to ask about. Reserving it also
    stops the grid growing a row at a time as the entrance runs, which is what it
    did while the stagger was a timer ladder in App.vue.
  -->
  <div ref="slot" class="h-36 sm:h-40">
    <TransitionRoot :show="revealed"
                    class="h-full"
                    enter="transition duration-300 ease-out"
                    :enter-from="cardEnterFrom"
                    enter-to="translate-x-0 translate-y-0 opacity-100"
    >
      <!-- The face is a hair off white on purpose. A white specular highlight over
           #fff composites back to #fff — no headroom, no effect. Dropping to
           #fbfbfc gives the light somewhere to climb while still reading as a
           white card against the page's gray-100. -->
      <a :href="item.link || undefined"
         ref="card"
         class="card relative block h-full rounded-2xl bg-[#fbfbfc] hover:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
         target="_blank"
         @mouseenter="onMouseEnter"
         @mousemove="onMouseMove"
         @mouseleave="onMouseLeave"
      >
        <div class="shade"></div>
        <div v-if="accent" class="slab" :style="{ '--card-accent': accent }"></div>
        <!-- Decorative: the adjacent <h2> already names the project. The
             intrinsic size is stated so the box is reserved before decode. -->
        <TransitionChild as="template"
                         enter="transition duration-500 ease-out"
                         :enter-from="iconEnterFrom"
                         enter-to="rotate-0 scale-100 opacity-100"
        >
          <img class="icon" :src="imageSrc" alt="" width="512" height="512" />
        </TransitionChild>
        <div class="body">
          <TransitionChild as="template"
                           enter="transition duration-500 ease-out"
                           :enter-from="textEnterFrom"
                           enter-to="translate-x-0 translate-y-0 opacity-100"
          >
            <h2 class="font-calistoga text-lg sm:text-xl leading-tight line-clamp-2">{{ item.name }}</h2>
          </TransitionChild>
          <TransitionChild as="template"
                           enter="transition duration-500 ease-out"
                           :enter-from="textEnterFrom"
                           enter-to="translate-x-0 translate-y-0 opacity-100"
          >
            <p class="desc text-xs sm:text-[13px] leading-snug text-gray-600">{{ item.description }}</p>
          </TransitionChild>
          <div class="meta font-mono text-[10px] uppercase tracking-wider text-gray-400">
            <!-- The accent otherwise never leaves the top-left corner. The dot is
                 the one place it reaches the text column, and being decorative it
                 owes no contrast — which the wedge's lightness band could not
                 promise it anyway. -->
            <span v-if="item.kind" class="kind">
              <span v-if="accent" class="dot" :style="{ '--card-accent': accent }"></span>
              {{ item.kind }}
            </span>
            <span v-else></span>
            <span v-if="item.link" class="go">
              {{ goLabel }}
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.4" d="M7 17 17 7M9 7h8v8" />
              </svg>
            </span>
          </div>
        </div>
        <div class="grain"></div>
        <div class="gloss"></div>
        <div class="rim"></div>
      </a>
    </TransitionRoot>
  </div>
</template>

<script lang="ts">
import ItemInterface from "../types/ItemInterface";
import { TransitionRoot, TransitionChild } from "@headlessui/vue";
import {computed, defineComponent, PropType} from "vue";
import { useTilt } from "../composables/useTilt";
import { useAccentColor } from "../composables/useAccentColor";
import { useReveal } from "../composables/useReveal";
import { prefersReducedMotion } from "../composables/useReducedMotion";

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

    // Named for where the link goes, not for what it is: the one card that
    // stays on the site reads "Open" rather than claiming a repo.
    const goLabel = computed(() => {
      const link = props.item.link;
      if (!link.startsWith("http")) return "Open";
      return new URL(link).hostname.endsWith("github.com") ? "GitHub" : "Open";
    });

    /*
     * The entrance travels along the site's 45° axis rather than straight across
     * it, so it belongs to the same composition as the banner — and it borrows
     * the banner's structure too: there, the wordmark row and the icon row slide
     * in along that axis in *opposite* directions. Same here. The card arrives
     * from below-left, travelling up and right like the wordmark; its text
     * arrives from above-right, travelling down and left like the icons.
     *
     * The directions are not interchangeable. Text coming from below-left would
     * cross the icon and the wedge on its way in — the body paints above both —
     * and the one thing this card has been careful about is never drawing text
     * over the accent. From above-right it only ever crosses the card's own top
     * edge, which is where the entrance already spent its overflow when this was
     * a flat translate-x.
     *
     * Under Reduce Motion all three collapse to a plain fade. Opacity is not a
     * vestibular trigger, so the entrance still reads — it arrives rather than
     * travels, the same bargain the hover state already makes in CSS below.
     */
    const still = prefersReducedMotion();

    return {
      ...useTilt(),
      ...useReveal(),
      imageSrc,
      goLabel,
      accent: useAccentColor(imageSrc),
      cardEnterFrom: still ? "opacity-0" : "-translate-x-3 translate-y-3 opacity-0",
      textEnterFrom: still ? "opacity-0" : "translate-x-8 -translate-y-8 opacity-0",
      iconEnterFrom: still ? "opacity-0" : "rotate-45 scale-70 opacity-0",
    };
  }
})
</script>

<style scoped>
/*
 * Card geometry. --wedge is the width of the accent wedge at the card's top
 * edge; --gutter is where the text column starts.
 *
 * --gutter is NOT --wedge plus a margin, which is the intuitive reading and is
 * what left a 35px hole between the icon and the text. No text begins at the top
 * of the card: the first line of the title starts --body's 15px of padding down,
 * and the edge has already walked 15px left by then. So the rule is
 *
 *     --gutter  =  hover --wedge  -  15  +  clearance
 *
 * with clearance at 8px. Note *hover*, and note that both widths dropped a step
 * on 2026-07-27: the wedge now rests small and grows on hover to the width it
 * used to rest at, so the gutter numbers themselves are unchanged.
 *
 * The gutter used to be derived from the resting width, which let the hover wipe
 * run past the text and slide under it — the text being a z-index above the slab
 * — and that cost the description a stretch at 2.4:1 against the darkest accent.
 * It no longer does: the widest the wedge ever gets is now the width the gutter
 * was drawn for, so the edge stops at the text column in every state instead of
 * crossing it. That contrast note is retired, and comes back only if the hover
 * width grows past the gutter again.
 *
 * So the gesture is no longer colour sweeping behind the title. It is the
 * triangle growing out of the corner, read against the icon: the edge cuts
 * through the icon at rest and has moved out past it by full hover. Smaller
 * advance in pixels, but it now lands on the icon rather than on the text, which
 * is the thing worth watching when these numbers move.
 *
 * The icon deliberately breaks the diagonal. Its centre sits at
 * (--icon-left + r, --icon-top + r), and the edge runs x + y = --wedge, so the
 * circle stands proud of the colour by r - (--wedge - centre.x - centre.y)/√2.
 * On desktop that runs ~57px at rest (the centre is on the transparent side of
 * the edge, so most of the circle is outside the colour) to ~28px at hover — the
 * latter being exactly what the card used to look like at rest. Sizing --wedge so
 * the circle and the edge land within a pixel or two of each other is the one
 * thing to avoid — that reads as a clipping bug, which is exactly what it looked
 * like before these numbers came down. The two values to stay away from are the
 * tangents, where the edge grazes the circle instead of cutting it: 61px and
 * 191px on desktop, 49px and 153px on the phone card. The four widths in use are
 * all 40px or more clear of one.
 *
 * Note --icon pushes the hang-off twice: a wider circle reaches further past the
 * edge, and its centre also moves down-right, which is toward the edge. Growing
 * the icon without moving --wedge is therefore the cheap way to have it break
 * the diagonal harder.
 *
 * The edge walks left 1px per 1px down and so runs out at y = --wedge; anything
 * below that is card with no diagonal in it. The wedge used to be sized to stay
 * near the card's height for that reason, and at hover it still is — 152 against
 * a 160px card leaves 8px. At rest it deliberately is not: 110 leaves the bottom
 * 50px of a desktop card clear, which is what makes the resting state read as a
 * corner mark rather than a diagonal split. The card growing a full diagonal on
 * hover is most of the effect, so that empty band is the point, not a shortfall.
 *
 * The phone card stays h-36 rather than h-40. It no longer has to be — the
 * resting wedge is nowhere near the bottom either way — but the hover width is
 * still capped by the 311px text column it has to clear, and 132 reaches further
 * down a 144px card than a 160px one.
 *
 * Hover advances the wedge 37px (42 on desktop). That is smaller than the 52/58
 * it was, and it has to be: the top of the range is pinned to the gutter and the
 * bottom is where the resting triangle stops looking like a deliberate mark. If
 * this ever needs to feel faster, the 340ms below is the dial, not the distance.
 */
.card {
  --wedge: 95px;
  --gutter: 125px;
  --icon: 74px;
  --icon-top: 14px;
  --icon-left: 13px;
  box-shadow: 0 1px 0 rgb(15 23 42 / 0.05);
  /*
   * Deliberately flat, and deliberately not clipping either.
   *
   * The icon and the text were briefly lifted onto their own planes with
   * preserve-3d, which parallaxed them against the wedge. It was reverted: in a
   * 3D context paint order is by depth rather than z-index, so anything on a
   * raised plane comes out in front of .gloss and .grain and takes itself out of
   * the lighting. Putting the overlays higher still does not work — a layer at a
   * different Z parallaxes against the card face and slides off its edges under
   * rotation. One light over one surface means one plane.
   *
   * The card still does not set overflow, though. That was only ever there to
   * round the wedge's corners, which .slab now does itself with border-radius,
   * and .shade needs to paint an outer shadow that a clip would eat.
   */
  /* --wedge animates here rather than on .slab: it is set here, so the slab
   * simply inherits a value that is already moving. Transitioning it on the
   * child would work, but only by way of the child re-interpolating a value its
   * parent had already snapped.
   *
   * The transform duration comes from useTilt via --tilt-transition. It has to
   * be part of this list rather than an inline style, or it would replace the
   * list outright and the wipe would stop easing — which is the whole reason
   * useTilt publishes a duration instead of writing style.transition itself.
   *
   * The fallback is for the press state at the bottom of this file, and only
   * ever for it. useTilt writes --tilt-transition on mouseenter and never clears
   * it, so on a pointer device the fallback applies solely before the first
   * hover — when nothing is moving the transform anyway. On touch the variable
   * is never written at all, and 0s there would have made the press snap.
   *
   * Nothing else on the card is worth listing here. The resting box-shadow never
   * changes (the hover depth is .shade's opacity, and focus-visible is an
   * outline), so an entry for it would only ever be dead weight. */
  transition:
      transform var(--tilt-transition, 120ms) ease-out,
      --wedge 340ms cubic-bezier(0.22, 1, 0.36, 1);
}

.card:hover {
  --wedge: 132px;
}

/*
 * The depth the card picks up on hover: a soft halo over the resting hairline,
 * its opacity driven by --gloss-strength, so it answers to where the pointer is
 * rather than switching on at the card's edge. That continuity is most of what
 * makes the tilt read as a tilt.
 *
 * It has to be its own layer rather than a box-shadow on .card, because
 * --gloss-strength changes every frame and transitioning a box-shadow repaints;
 * transitioning opacity on a childless overlay composites. Outer shadows are
 * clipped to outside their own border-box, so this inset-0 transparent layer
 * paints nothing over the card itself.
 */
.shade {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  box-shadow: 0 12px 34px -14px rgb(15 23 42 / 0.5);
  opacity: var(--gloss-strength, 0);
  transition: opacity 250ms ease-out;
}

/* Matches Tailwind v4's sm breakpoint. Below it the card is 311px at a 375px
 * viewport — main's px-6 and the inner div's px-2 take 32px a side — so the
 * 125px gutter leaves 172px of text. That gutter is now what caps the hover
 * wedge at 132 rather than the other way round: the phone card cannot afford a
 * wider one, so the resting width is set down from there.
 * Both rules have to sit after the base :hover above, or the narrow hover value
 * would win at every width. */
@media (width >= 40rem) {
  .card {
    --wedge: 110px;
    --gutter: 145px;
    --icon: 92px;
    --icon-top: 18px;
    --icon-left: 16px;
  }

  .card:hover { --wedge: 152px; }
}

/*
 * The wedge: the header's 45° red slab, brought down into the grid in each
 * card's own sampled accent.
 *
 * 135deg is a true 45° edge running "/", the same direction as the header. The
 * stop is a *perpendicular* distance, so a stop at d puts the edge at d*sqrt(2)
 * along the top edge — hence the 1/sqrt(2). From there the edge walks left 1px
 * for every 1px down, which is what makes --wedge a plain width in px rather
 * than something that changes shape with the card.
 *
 * Two stops of the same accent then a hard cut at the second one: the pair is
 * what holds the field flat all the way to the edge, and the repeated position
 * is what keeps the cut a line rather than a ramp.
 */
.slab {
  position: absolute;
  inset: 0;
  z-index: 0;
  /* Sampling finishes a beat after the card lands — later still on a cold load —
   * so ease the colour in rather than letting it pop on at full strength. This
   * is mount-time only; the hover wipe is --wedge on .card. */
  animation: wedge-in 450ms ease-out both;
  /* The card no longer clips its children, so the wedge rounds its own corners.
   * A background is painted to the border box, so the radius alone is enough —
   * no overflow needed. */
  border-radius: inherit;
  background: linear-gradient(135deg,
      /* Flat, not graduated. The wedge is now a light field, so any lift toward
       * white lands hardest right at the cut — exactly where the edge has to
       * hold against the card face — and softens the one line carrying the
       * shape. It is also the colour useAccentColor measured its contrast at, so
       * keeping it flat means the measurement describes what ships. Depth comes
       * from .gloss and .grain, which have a whole surface to play over. */
      var(--card-accent) 0,
      var(--card-accent) calc(var(--wedge) * 0.70711),
      transparent calc(var(--wedge) * 0.70711));
}

@keyframes wedge-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.icon {
  position: absolute;
  top: var(--icon-top);
  left: var(--icon-left);
  z-index: 1;
  width: var(--icon);
  height: var(--icon);
  border-radius: 9999px;
  box-shadow: 0 4px 12px rgb(15 23 42 / 0.26);
}

/*
 * The icon deliberately does not move on hover. It had a 4px nudge, which
 * couldn't ease in both directions without a base transition on this element —
 * and a base transition here fights headlessui, which drives this same element's
 * transform and opacity during the entrance. The wedge already carries the
 * hover; the icon staying put is what the wedge slides against.
 */

/*
 * The press. Touch gets no tilt (useTilt gates on hover), no gloss and no rim
 * light (both key off --gloss-strength, which nothing ever raises there), so
 * until now a phone got the entrance and then a completely inert card. This is
 * the one piece of feedback the surface can give back to a finger.
 *
 * Gated to hover:none rather than left global because on a pointer device
 * useTilt owns the inline transform, which outranks this rule for as long as the
 * pointer is over the card — so a global version would be dead on desktop
 * anyway, and would only mislead whoever read it next. The ease comes from the
 * fallback in .card's transition list.
 *
 * Deliberately not the wedge as well: iOS already latches :hover on tap, so a
 * pressed card there widens its wedge without any help from here.
 */
@media (hover: none) {
  .card:active {
    transform: scale(0.985);
  }
}

/*
 * useTilt already refuses to run under Reduce Motion, but the wedge wipe and the
 * shadow are pure CSS and would keep moving without this. The hover state still
 * changes — it just arrives rather than travels.
 */
@media (prefers-reduced-motion: reduce) {
  .card,
  .go {
    transition: none;
  }
}

/*
 * Above the slab so the wedge can never paint over the text, below the gloss so
 * the light still passes across it.
 */
.body {
  position: relative;
  z-index: 1;
  margin-left: var(--gutter);
  /* The 15px top is load-bearing — --gutter is derived from it, see above. The
   * bottom and the gaps are not, and every pixel trimmed here is spare between
   * the last line of the description and the fade band below it. */
  padding: 15px 14px 11px 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

/*
 * Fades into the clip instead of guillotining a line mid-stroke, so a
 * description longer than the card degrades rather than looking broken.
 *
 * A shape-outside float was tried here, letting the description wrap along the
 * diagonal and reclaim ~30 characters a card. It was reverted: the title cannot
 * follow it — the title sits where the wedge is widest, and matching the
 * description's clearance would push it right, not left — so the block ended up
 * with three different left edges. One straight column beats a ragged one, even
 * a ragged one that fits more words. --gutter is that column, for all three.
 */
.desc {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  /*
   * A 6px band, not a percentage. At 74% the fade began 61px into an 83px box —
   * precisely where the fourth line starts — so a description that fitted in
   * full was washed out across a whole line for no reason. The band has to be
   * shorter than one line for the fade to mean "there is more below this" rather
   * than "this line is the last one". leading-snug above is part of the same
   * fix: it puts four lines inside the box with room to spare, so the band lands
   * in the gap under them instead of over them.
   */
  mask-image: linear-gradient(#000 calc(100% - 6px), transparent 100%);
}

.meta {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.kind {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

/*
 * The accent, brought down into the text column. Mixed toward slate rather than
 * used neat: useAccentColor's band tops out at L 0.86 (see MAX_LIGHTNESS), which
 * is chosen to hold a 100px field against the card face and is far too pale to
 * read as a 6px mark on it. 22% is enough to land every hue in the band on the
 * legible side without pulling it off its own colour.
 */
.dot {
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background: color-mix(in oklab, var(--card-accent), rgb(15 23 42) 22%);
}

.go {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  /* Literal rather than var(--color-gray-500): v4 prunes theme variables that
   * no utility references, and nothing else in the app asks for these two. */
  color: rgb(107 114 128);
  transition: transform 220ms ease-out, color 220ms ease-out;
}

.card:hover .go {
  transform: translateX(3px);
  color: rgb(17 24 39);
}

/*
 * Cardstock. The tile itself is --grain-tile in index.css, shared with the
 * banner, which is on the same stock since 2026-07-27; the strength stays local,
 * because a white card and 800px of red need different amounts of it.
 *
 * multiply, not plain alpha: paper doesn't emit light, it only ever subtracts,
 * and multiplying preserves the accent wedge's hue where a neutral grey overlay
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
  z-index: 2;
  border-radius: inherit;
  pointer-events: none;
  opacity: var(--grain-strength);
  mix-blend-mode: multiply;
  background-image: var(--grain-tile);
  mask-image: radial-gradient(circle farthest-side at
      calc(50% + var(--tilt-x, 0) * 30%) calc(50% + var(--tilt-y, 0) * 30%),
      rgb(0 0 0 / 1) 0%,
      rgb(0 0 0 / calc(1 - var(--gloss-strength, 0) * 0.5)) 55%,
      rgb(0 0 0 / calc(1 - var(--gloss-strength, 0) * 0.75)) 100%);
}

/*
 * A glossy surface: a broad specular highlight riding opposite the pointer and
 * a matching falloff behind it. Both are placed from --tilt-x/--tilt-y, which
 * useTilt() sets on the card.
 */
.gloss {
  position: absolute;
  inset: 0;
  z-index: 2;
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

/*
 * Specular highlight — reads on the wedge; a no-op on the white card face.
 *
 * Dialled back from 0.45 once the wedge arrived. The original number was tuned
 * against a card that was white nearly edge to edge, where white-on-white had
 * almost nowhere to go; over a saturated field the same alpha has the full range
 * to work in and stops reading as light on a surface.
 */
.gloss::before {
  background: radial-gradient(circle farthest-side,
      rgb(255 255 255 / 0.24),
      rgb(255 255 255 / 0.04) 45%,
      rgb(255 255 255 / 0) 75%);
  transform: translate(calc(var(--tilt-x, 0) * -18%), calc(var(--tilt-y, 0) * -18%));
}

/*
 * Falloff over the receding half, wide enough to shade rather than spot. This
 * is the half of the gloss that actually reads on the card face: white can only
 * add ~5 levels over #fbfbfc, whereas darkening has the full range to work in.
 */
.gloss::after {
  background: radial-gradient(circle farthest-side,
      rgb(15 23 42 / 0.12),
      rgb(15 23 42 / 0.04) 55%,
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
  z-index: 2;
  border-radius: inherit;
  pointer-events: none;
  box-shadow:
      /* Always on, including touch: defines the card against the page, and is
       * the only thing holding the white half of the face off the background
       * now that the resting drop shadow is a hairline. */
      inset 0 0 0 1px rgb(15 23 42 / 0.08),
      /* Blur well past the offset so both arcs feather into the face. At 1px of
       * blur the lit side was a crisp white stripe against the page, which read
       * as a seam between the card and its shadow rather than a lit edge. */
      inset calc(var(--tilt-x, 0) * -2px) calc(var(--tilt-y, 0) * -2px) 4px -1px
        rgb(255 255 255 / calc(var(--gloss-strength, 0) * 0.7)),
      inset calc(var(--tilt-x, 0) * 2px) calc(var(--tilt-y, 0) * 2px) 4px -1px
        rgb(15 23 42 / calc(var(--gloss-strength, 0) * 0.14));
}
</style>
