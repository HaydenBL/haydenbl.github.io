/**
 * Whether the visitor has asked for less motion.
 *
 * Read at call time rather than cached at module load: the OS toggle can flip
 * mid-session, and a stored copy would need a reload to notice. Callers that
 * only ask once — an entrance, a press — are correct by construction; anything
 * that outlives a single gesture should ask again rather than keep the answer.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
