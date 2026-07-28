import { onBeforeUnmount, onMounted, ref } from "vue";
import { onReducedMotionChange, prefersReducedMotion } from "./useReducedMotion";

// Tuning knobs for the hover tilt. Tweak these first if the effect feels off.
// The gloss itself is styled in Item.vue, driven by the custom properties below.
const MAX_TILT_DEG = 4;
const HOVER_SCALE = 1.02;
const PERSPECTIVE_PX = 700;
const ENTER_MS = 220;
const RETURN_MS = 300;

// `any-hover`, not `hover`: WebKit on iPadOS answers `hover` for the primary
// pointer, which is the touchscreen even with a Magic Keyboard attached, so
// `(hover: hover)` locked the tilt off on every iPad. Tailwind's `hover:`
// variant is overridden to the same query in index.css — change one and you
// have to change the other, or the CSS and JS halves of the hover treatment
// disagree about what device they are on.
const HOVER_QUERY = "(any-hover: hover)";

function tiltIsWanted(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(HOVER_QUERY).matches && !prefersReducedMotion();
}

/** Mirrors onReducedMotionChange for the other half of the answer. */
function onHoverCapabilityChange(handler: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mql = window.matchMedia(HOVER_QUERY);
  mql.addEventListener("change", handler);
  return () => mql.removeEventListener("change", handler);
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

  // Not a constant: both inputs can flip under a running page. The OS Reduce
  // Motion toggle is the obvious one, and `any-hover` moves too when a trackpad
  // is attached to or detached from a tablet. Latched at setup(), either change
  // needed a reload before it took effect. Kept a plain `let` rather than a ref
  // because nothing renders from it — the handlers below are its only readers.
  let enabled = tiltIsWanted();
  let frame = 0;
  let settleTimer = 0;
  let pointerX = 0;
  let pointerY = 0;
  let hovered = false;

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

    // Centre from the rect, extents from the layout box. The rect is the
    // *post-transform* box, which scale(1.02) and the rotation both inflate, so
    // normalizing against its width left the offsets ~2% short of ±1 at the
    // edges — the tilt could never quite reach MAX_TILT_DEG. Its centre is
    // honest either way, since the transform is symmetric about it.
    const halfWidth = el.offsetWidth / 2;
    const halfHeight = el.offsetHeight / 2;

    // -1 at the left/top edge, 0 at the centre, 1 at the right/bottom edge.
    const offsetX = (pointerX - (rect.left + rect.width / 2)) / halfWidth;
    const offsetY = (pointerY - (rect.top + rect.height / 2)) / halfHeight;

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
    hovered = true;
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

  // The unwind, with no `enabled` guard of its own — the one caller that has to
  // run *because* the tilt was just disabled would be refused by it.
  const settle = () => {
    const el = card.value;
    if (!el) return;
    hovered = false;
    if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
    // Otherwise a pending settle would strip the return transition mid-flight.
    clearSettle();
    el.style.setProperty("--tilt-transition", `${RETURN_MS}ms`);
    el.style.transform = "";
    // Leave --tilt-x/y alone so the gloss fades out in place instead of sliding.
    el.style.setProperty("--gloss-strength", "0");
  };

  const onMouseLeave = () => {
    if (!enabled) return;
    settle();
  };

  // mouseleave is not guaranteed when the pointer stops being over the card for
  // a reason other than moving it — Cmd-Tab, a space switch or hiding the tab
  // can all leave the last hovered card frozen mid-tilt until it is hovered
  // again. Unwind it by hand on the way out.
  //
  // Both events are needed and neither is redundant: switching tabs fires
  // visibilitychange, while moving to another app or window fires only blur.
  // The reset is idempotent, so the overlap where both fire costs nothing.
  const resetIfHovered = () => {
    if (hovered) settle();
  };

  // Guarded on `hidden` because visibilitychange also fires on the way *back*,
  // where there is nothing to unwind.
  const onVisibilityChange = () => {
    if (document.hidden) resetIfHovered();
  };

  // Re-ask both queries instead of trusting the answer from setup().
  const syncEnabled = () => {
    const next = tiltIsWanted();
    if (next === enabled) return;
    enabled = next;
    // Switching off mid-hover would otherwise strand the card tilted: from here
    // on onMouseLeave refuses to run, and mouseleave is the only thing that was
    // ever going to flatten it. Unwound through the normal return rather than
    // snapped — it is the same 4° the card is already showing, and one path
    // through the exit is worth more than saving 300ms of it.
    if (!enabled) settle();
  };

  let stopHoverWatch = () => {};
  let stopMotionWatch = () => {};

  onMounted(() => {
    // Attached unconditionally, where they used to be gated on `enabled`: the
    // gate is now free to open later, and these have nothing to do when it is
    // shut anyway — `hovered` can only be set by onMouseEnter, which is gated.
    window.addEventListener("blur", resetIfHovered);
    document.addEventListener("visibilitychange", onVisibilityChange);

    stopHoverWatch = onHoverCapabilityChange(syncEnabled);
    stopMotionWatch = onReducedMotionChange(syncEnabled);
    // setup() and mount are not the same instant; catch a flip in between.
    syncEnabled();
  });

  onBeforeUnmount(() => {
    window.removeEventListener("blur", resetIfHovered);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    stopHoverWatch();
    stopMotionWatch();
    if (frame) cancelAnimationFrame(frame);
    clearSettle();
  });

  return { card, onMouseEnter, onMouseMove, onMouseLeave };
}
