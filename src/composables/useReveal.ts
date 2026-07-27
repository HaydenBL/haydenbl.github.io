import { onBeforeUnmount, onMounted, ref } from "vue";
import { prefersReducedMotion } from "./useReducedMotion";

// How much of the card has to be on screen before it counts as seen. Low enough
// that a card poking over the fold reveals as it arrives rather than waiting for
// the scroll to settle, high enough that a one-pixel sliver doesn't spend its
// whole entrance off-screen.
const THRESHOLD = 0.15;

// Cards that come into view *together* are staggered against each other. On load
// that is the two or three above the fold; further down it is usually one, which
// gets no delay at all, and two at a time once the grid has a second column.
const ITEM_DELAY = 70;

// Only the first batch waits for the header to land. A card revealed by a scroll
// has no reason to hold.
const INITIAL_DELAY = 350;

type Reveal = () => void;

// One observer for every card on the page. Cards unobserve themselves the moment
// they reveal, so this holds nothing once the grid has been seen — which is why
// it is never disconnected.
let observer: IntersectionObserver | null = null;
const waiting = new Map<Element, Reveal>();
let firstBatch = true;

function onIntersect(entries: IntersectionObserverEntry[], self: IntersectionObserver) {
  const still = prefersReducedMotion();
  const step = still ? 0 : ITEM_DELAY;
  const base = firstBatch && !still ? INITIAL_DELAY : 0;
  let count = 0;

  // Entries arrive in the order the elements were observed, which for a v-for is
  // mount order and so document order — the stagger runs down the grid.
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    const reveal = waiting.get(entry.target);
    if (!reveal) continue;

    waiting.delete(entry.target);
    self.unobserve(entry.target);

    const delay = base + count++ * step;
    if (delay) window.setTimeout(reveal, delay);
    else reveal();
  }

  if (count) firstBatch = false;
}

/**
 * Holds an element hidden until it is scrolled into view, then reveals it.
 *
 * Returns the ref to put on the element that reserves the space — not on the
 * thing being revealed, which by definition isn't rendered yet and so has no box
 * to observe.
 */
export function useReveal() {
  const slot = ref<HTMLElement | null>(null);
  const revealed = ref(false);
  let live = true;

  onMounted(() => {
    const el = slot.value;
    // No element, or no observer to be had: show it. The failure mode of this
    // composable has to be a visible card, never a permanently hidden one.
    if (!el || typeof IntersectionObserver === "undefined") {
      revealed.value = true;
      return;
    }

    if (!observer) {
      observer = new IntersectionObserver(onIntersect, { threshold: THRESHOLD });
    }
    // `live` rather than a cancellable timer: the stagger's setTimeout is owned
    // by the shared callback above, so the reveal is made inert here instead of
    // being reached into and cleared from there.
    waiting.set(el, () => {
      if (live) revealed.value = true;
    });
    observer.observe(el);
  });

  onBeforeUnmount(() => {
    live = false;
    const el = slot.value;
    if (!el) return;
    waiting.delete(el);
    observer?.unobserve(el);
  });

  return { slot, revealed };
}
