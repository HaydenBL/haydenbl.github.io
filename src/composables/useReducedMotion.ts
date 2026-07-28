/**
 * Whether the visitor has asked for less motion.
 *
 * Read at call time rather than cached at module load: the OS toggle can flip
 * mid-session, and a stored copy would need a reload to notice. Callers that
 * only ask once — an entrance, a press — are correct by construction; anything
 * that outlives a single gesture should ask again rather than keep the answer.
 */
const QUERY = "(prefers-reduced-motion: reduce)";

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(QUERY).matches;
}

/**
 * Runs `handler` whenever the OS toggle flips. Returns its own teardown, so a
 * caller never has to hold the MediaQueryList — which is the point: the query
 * string stays defined exactly once, here, and long-lived callers get a change
 * signal without re-declaring it.
 */
export function onReducedMotionChange(handler: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", handler);
  return () => mql.removeEventListener("change", handler);
}
