import { onBeforeUnmount, ref } from "vue";

// Tuning knobs for the hover tilt. Tweak these first if the effect feels off.
// The gloss itself is styled in Item.vue, driven by the custom properties below.
const MAX_TILT_DEG = 4;
const HOVER_SCALE = 1.02;
const PERSPECTIVE_PX = 700;
const ENTER_MS = 220;
const RETURN_MS = 300;

function tiltIsWanted(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(hover: hover)").matches
      && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Tilts an element toward the pointer. Alongside the transform it publishes the
 * pointer position as --tilt-x / --tilt-y (each -1..1, from the element centre)
 * and --gloss-strength (0..1), which descendants use to place their own gloss —
 * inheritance means a surface only has to opt in with CSS, no extra wiring here.
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
    // then drop the transition once we are there so the rest of the hover
    // tracks the pointer without lag.
    card.value.style.transition = `transform ${ENTER_MS}ms ease-out`;
    settleTimer = window.setTimeout(() => {
      settleTimer = 0;
      if (card.value) card.value.style.transition = "";
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
    card.value.style.transition = `transform ${RETURN_MS}ms ease-out`;
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
