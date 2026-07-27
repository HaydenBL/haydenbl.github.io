import { onBeforeUnmount, ref } from "vue";
import { prefersReducedMotion } from "./useReducedMotion";

// Tuning knobs for the hover tilt. Tweak these first if the effect feels off.
// The gloss itself is styled in Item.vue, driven by the custom properties below.
const MAX_TILT_DEG = 4;
const HOVER_SCALE = 1.02;
const PERSPECTIVE_PX = 700;
const ENTER_MS = 220;
const RETURN_MS = 300;

function tiltIsWanted(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(hover: hover)").matches && !prefersReducedMotion();
}

/**
 * Tilts an element toward the pointer. Alongside the transform it publishes the
 * pointer position as --tilt-x / --tilt-y (each -1..1, from the element centre)
 * and --gloss-strength (0..1), which the card's overlays read to place their own
 * lighting — they inherit, so a surface only has to opt in with CSS, no extra
 * wiring here.
 *
 * It also publishes --tilt-transition, the duration the transform should ease
 * over. The element is expected to spend it itself, e.g.
 *
 *     transition: transform var(--tilt-transition, 0s) ease-out, …;
 */
export function useTilt() {
  const card = ref<HTMLElement | null>(null);

  const enabled = tiltIsWanted();
  let frame = 0;
  let settleTimer = 0;
  let pointerX = 0;
  let pointerY = 0;

  const clearSettle = () => {
    if (!settleTimer) return;
    clearTimeout(settleTimer);
    settleTimer = 0;
  };

  const render = () => {
    frame = 0;
    const el = card.value;
    if (!el) return;

    // Read the rect every frame rather than caching on enter: scrolling while
    // hovering would otherwise leave us tilting around a stale centre.
    const rect = el.getBoundingClientRect();
    const halfWidth = rect.width / 2;
    const halfHeight = rect.height / 2;

    // -1 at the left/top edge, 0 at the centre, 1 at the right/bottom edge.
    const offsetX = (pointerX - (rect.left + halfWidth)) / halfWidth;
    const offsetY = (pointerY - (rect.top + halfHeight)) / halfHeight;

    // The edge under the pointer leans away from the viewer, as if pressed.
    el.style.transform = `perspective(${PERSPECTIVE_PX}px)`
        + ` rotateX(${-offsetY * MAX_TILT_DEG}deg)`
        + ` rotateY(${offsetX * MAX_TILT_DEG}deg)`
        + ` scale(${HOVER_SCALE})`;

    el.style.setProperty("--tilt-x", `${offsetX}`);
    el.style.setProperty("--tilt-y", `${offsetY}`);
    el.style.setProperty("--gloss-strength", `${Math.min(Math.hypot(offsetX, offsetY), 1)}`);
  };

  const onMouseEnter = (event: MouseEvent) => {
    if (!enabled || !card.value) return;
    clearSettle();

    // Ease into the tilt rather than snapping to wherever the pointer entered,
    // then drop the duration once we are there so the rest of the hover tracks
    // the pointer without lag.
    //
    // A duration, not a whole transition: writing style.transition here sets an
    // inline value that outranks the stylesheet, which silently cancelled every
    // other transition the element declared for as long as the pointer was over
    // it. Anything else on the card that eases on hover would snap instead.
    card.value.style.setProperty("--tilt-transition", `${ENTER_MS}ms`);
    settleTimer = window.setTimeout(() => {
      settleTimer = 0;
      if (card.value) card.value.style.setProperty("--tilt-transition", "0s");
    }, ENTER_MS);

    // Start from the entry point instead of waiting on the first mousemove, so
    // the ease covers the whole distance from flat to tilted.
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (!frame) frame = requestAnimationFrame(render);
  };

  const onMouseMove = (event: MouseEvent) => {
    if (!enabled) return;
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (!frame) frame = requestAnimationFrame(render);
  };

  const onMouseLeave = () => {
    if (!enabled || !card.value) return;
    if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
    // Otherwise a pending settle would strip the return transition mid-flight.
    clearSettle();
    card.value.style.setProperty("--tilt-transition", `${RETURN_MS}ms`);
    card.value.style.transform = "";
    // Leave --tilt-x/y alone so the gloss fades out in place instead of sliding.
    card.value.style.setProperty("--gloss-strength", "0");
  };

  onBeforeUnmount(() => {
    if (frame) cancelAnimationFrame(frame);
    clearSettle();
  });

  return { card, onMouseEnter, onMouseMove, onMouseLeave };
}
