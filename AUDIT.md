# Audit backlog — haydenblai.se

Findings from a five-agent audit (vue, tailwind, web-platform, build, content) run 2026-07-26 against commit `886744b`. Working doc, meant to be picked up across sessions.

**All six phases are closed as of 2026-07-27.** Every item is either fixed, or reviewed and deliberately declined with the reasoning recorded in place — the declines are decisions, not leftovers, and are marked *don't re-raise*. Note that the card was substantially redesigned after the audit was written — see **Card redesign** below before trusting any `Item.vue` line reference in Phase 6.

**What that means for the release:** Phase 6 was the merge gate, so `updates` → `master` is now unblocked. Nothing in this backlog is waiting on anything. Two things are worth doing before or with that merge, neither of them audit findings:
- The screen-reader / keyboard Tab-through pass Phase 5 never got — that phase was verified structurally, against the built bundle rather than with assistive tech.
- Decide whether `AUDIT.md` should stay tracked in the repo now that it is a closed record rather than a working doc (see the staging note below).

Status key: `[ ]` todo · `[x]` done · `[?]` needs Hayden's judgement, not a code fix

---

## Start here

1. Read **Repo context** below — the branch topology changes what "urgent" means.
2. Work the phases in order. They're sequenced by dependency and verification cost, not by topic.
3. Verify with `source ~/.nvm/nvm.sh && nvm use 22.23.1 && yarn build`. **Default Node 18 fails** with a wall of vue-tsc noise.
4. Tick boxes as things land. Leave `[?]` items for Hayden.
5. Don't leave a dev server running past a turn — Hayden runs `yarn dev` / `yarn serve` himself.

---

## Repo context (read before prioritizing)

**`updates` is 6 commits ahead of `master` and unmerged.** `master` has no `src/composables/` — no `useTilt`, no `useAccentColor`, no `.gloss`, no `will-change`. The whole tilt / gloss / card-accent system is **unreleased**.

**Pushing to `master` deploys.** `.github/workflows/master_deploy.yml` triggers on push to `master`, builds, and publishes `dist/` to `gh-pages`. There is no staging environment. Merging `updates` ships 6 commits of visual work in one go.

This splits the backlog into two tracks:

- **Live now** — defects confirmed present on `master`, affecting real visitors today: the relative `og:image` and the mobile icon clipping (both verified via `git show master:`), plus the missing `<h1>`, the manifest, and the dead images.
- **Not yet shipped** — defects that exist only on `updates`: the 24 `will-change` layers, the iPad hover gate, the latched `enabled`, the Tailwind-scanning-`.claude/` leak. These have never reached a visitor. **Phase 6 is therefore a merge gate, not cleanup** — it's the last chance to not ship them.

Everything lands on `updates` and reaches production through one `updates` → `master` merge. Sequence the phases so that merge is clean.

**Decision (2026-07-26): Hayden is doing all phases on `updates`, then merging to `master` as a single release.** He considered and declined applying Phase 1 to `master` separately to fix the two live bugs sooner. So: no partial deploys, nothing reaches production until every phase is done, and the merge is the release. Don't push to `master` piecemeal.

**Note:** `AUDIT.md` is currently *staged* in git (`git status` shows `A AUDIT.md`), so it will ride along with the next commit unless you unstage it. Decide whether you want it tracked.

---

## Phase 1 — ship-blind fixes + the live mobile bug

Highest impact per unit of risk. No behaviour change; verified by `yarn build` plus one look at 375px. Ships as a single commit.

- [x] **`og:image` is relative → every link preview is broken.** `index.html:20` is `content="/assets/hero_img.jpg"`. OG crawlers fetch from their own servers, so a path-relative value resolves to nothing on Slack, Discord, iMessage, LinkedIn, X. Change to `https://haydenblai.se/assets/hero_img.jpg`. The image is already a correct 1200×630. **Verified, and live on master.**
- [x] **Card icons are clipped on every phone.** `App.vue:5` `p-2` + `App.vue:7` `px-2` = 16px inset, vs. `Item.vue:23` `-left-5` = 20px outside the card → net **−4px**. A slice is shaved off all six circular icons and the drop shadow is cut square. Resolves at `sm`. Fixed via `p-2` → `px-6 py-2` on `App.vue:5`. **Verified by measurement, and live on master** (master's `Item.vue:17` has the same `-left-5`).
  - **Tradeoff checked and accepted (Hayden, 2026-07-26, devtools responsive mode @ 375px — looks fine).** `px-6` widens the base inset to 32px, clearing the icon by 12px, but narrows cards by 32px (375px viewport → 311px of content). The alternative was `-left-5` → `-left-3` on `Item.vue:23`, preserving card width at only 4px icon clearance. **Settled — don't re-raise.** Note the narrower card slightly reduces the room the Phase 3 description-clipping item has to work with.
- [x] **No `twitter:card`** → X renders a bare link, not a card. Add `twitter:card = summary_large_image`. Also missing: `og:url`, `og:type = website`, `og:image:alt`, `<link rel="canonical">`.
- [x] **Manifest is not installable.** `public/site.webmanifest` has no `start_url` — a hard Chrome installability criterion. Add `"start_url": "/"`. Also missing `short_name` (Android truncates the 19-char `name`), `description`, `id`, and `"purpose": "maskable"` on the 512px icon. **Verified.**
- [x] **Font preconnect is on the wrong host and missing `crossorigin`.** `index.html:6-7`. Fonts fetch in CORS mode, so a `fonts.gstatic.com` preconnect without `crossorigin` opens a socket the fetch can't reuse. `fonts.googleapis.com` — the render-blocking stylesheet host actually on the critical path — has no preconnect at all.
- [x] **No `color-scheme` declared.** Chrome's Auto Dark Theme on Android targets pages that don't opt out, and its inversion mangles the `.tint`/`.gloss` overlays that paint on top of text. Light-only is a fine choice; it just needs stating: `:root { color-scheme: light; }` in `src/index.css`.
- [x] Removed `<meta name="keywords">` (ignored by Google since 2009).
- [x] ~~**Deferred to Phase 4:** `mask-icon` and `msapplication-TileColor` in `index.html`~~ **Done in Phase 4, 2026-07-26.** Both tags gone, along with `public/safari-pinned-tab.svg`, `public/browserconfig.xml` and `public/mstile-150x150.png` (the last was reachable only through `browserconfig.xml`, so it fell out with it).
- [x] ~~`theme-color` is `#ffffff` while the body is `bg-gray-100` (`#f3f4f6`), a faint seam on iOS 15–18.7.~~ **Done 2026-07-26.** `theme-color` and the manifest's `theme_color` are now `#f3f4f6`. Safari 26 ignores `theme-color` and samples `<body>`'s background instead, so it lands on the same gray there by default — nothing to do for it.
  - **Red chrome was tried and rejected (Hayden, 2026-07-26). Don't re-raise.** Matching the header's red-500 works via `theme-color` on iOS 15–18.7 and Chrome/Android, but Safari 26 only samples fixed/sticky elements at the viewport edge — and the header is `absolute`, so the only way to feed it red is a dedicated fixed sliver. That's a hack for a browser that's deliberately deriving the tint from the page; not worth it.

## Phase 2 — type safety (do before Phase 3)

Purely mechanical; `vue-tsc` is the whole test. **This gates Phase 3** — it makes the content edits compiler-checked instead of silently breakable.

- [x] **`as ItemInterface[]` defeats type-checking on the most common edit.** `App.vue:75`. A type assertion uses the *comparability* relation, so it tolerates both missing and extra properties. Tested: renaming `image:` → `img:` on a card **type-checks clean and builds clean**, then silently renders the site logo via the `|| 'site_logo.jpg'` fallback at `Item.vue:75`. Adding a project is the routine task this repo exists for, and it has a silent-wrong-output failure mode.
  - Fix: make `show` optional in `ItemInterface`, drop the cast, annotate instead — `data(): { projects: ItemInterface[] }`. The typo then becomes `TS2353`.
  - **TRAP:** `satisfies` does *not* work here — it preserves the literal type, and `created()`'s `this.projects[i].show = true` fails with `TS2339`.
- [x] Make the `item` prop `required: true` (`Item.vue:69-72`) and drop the `|| 'site_logo.jpg'` fallback that turns a missing field into a plausible-looking wrong image. Removes the `v-if="item"` / `item?.` guards too.

**Phase 2 done 2026-07-26.** `show` is now optional in `ItemInterface`, the cast is gone in favour of `data(): { projects: ItemInterface[] }`, and the `item` prop is required with no image fallback. The prescribed fix worked as written — no trap encountered. **Re-verified the failure mode by hand:** renaming `image:` → `img:` on the midi2smw card now fails the build with `TS2353: Object literal may only specify known properties, and 'img' does not exist in type 'ItemInterface'`, where before it built clean and silently rendered the site logo. Bundle hashes are byte-identical to before the change, so nothing shipped differently.

## Phase 3 — content

Hayden's judgement, protected by Phase 2. Reordering/rewording cards is the task `ItemInterface` exists to guard.

- [x] ~~**VSCO card revives a trademark problem already resolved once.**~~ **Reviewed and declined (Hayden, 2026-07-26). Don't re-raise.** The finding stands on the facts — `App.vue:52-56` does use the exact retired product name, repeat "VSCO" in the description, and present a taken-down tool present-tense as a live "online tool," and the repo README does record that VSCO's contact previously forced a branding removal. Hayden was shown a rename to `vsco-dler` and a fully generic option, and chose to keep the card as-is. **This is a judgement call about his own legal exposure, and it has been made — leave the card alone.**
- [x] ~~**QuiQuote reads present-tense but the app was delisted.**~~ **Reviewed and declined (Hayden, 2026-07-26). Don't re-raise.** `App.vue:58-62` keeps the present-tense description. Offered both a past-tense-plus-open-source rewrite and a lighter tense-only fix; both declined.
- [x] ~~**`public/junteo/` is live but wired to nothing.**~~ **Resolved 2026-07-26: it is an intentional placeholder.** A privacy page published ahead of an app-store submission, deliberately live while referenced from nowhere and cardless. **Now documented in `CLAUDE.md`** so the next audit stops flagging it. It gets a card if and when the app ships.
- [x] ~~Euclidean Calculator description is clipping.~~ **Did not reproduce — checked at 375px, renders fine.** Two agents predicted this from the character count (123 chars in a fixed `h-40 overflow-hidden` card) and both were wrong. **Don't re-raise for this card.** The underlying constraint is still real, though: `Item.vue:42` hard-clips with no ellipsis or fade, so a *longer* description on a future card can still silently truncate. Treat ~120 characters as the practical ceiling when adding a project.
- [x] ~~Quora Clone description (`App.vue:69-74`) breaks tone with the rest ("It's very bad!") and repeats the word "project."~~ **Reviewed and declined (Hayden, 2026-07-26). Don't re-raise.** Shown a drier-but-still-funny rewrite and a neutral one; kept as-is. The tone break is deliberate personality, not an oversight.

**Phase 3 closed 2026-07-26.** Every item is settled. All three content rewrites were offered with concrete replacement text and declined; `junteo/` is documented. **No card copy changed.** Treat the `projects` array as content Hayden owns — future audits should stop proposing rewrites to these four cards.
- [x] All 5 GitHub links and both sub-sites return 200 — **no dead links.** Re-check periodically.

## Phase 4 — zero-risk cleanup

No visual change. Do it before Phase 5/6 so you're eyeballing a settled bundle.

- [x] **Delete ~1.84 MB of unreferenced images** — 68% of the deploy, since `public/` ships verbatim with no tree-shaking:
  `hero_img_old.png` (973 KB) · `my_face.png` (604 KB) · `my_face_2.png` (98 KB) · `design.png` (93 KB) · `quiquote-comingsoon.png` (27 KB) · `my_face_old.png` (19 KB) · `quotr.png` (10 KB) · `logo.png` (7 KB) · `site_logo_old.png` (5 KB)
  - **TRAP: do NOT delete `hero_img.jpg`.** One agent listed it as an orphan because it only grepped `src/` — it is the `og:image` at `index.html:20`. Deleting it re-breaks the exact thing Phase 1 fixes. Verified by direct grep.
  - Must stay: `site_logo.jpg`, `midi2smw.jpg`, `vsco-dler.jpg`, `quiquote.jpg`, `eucal.jpg`, `quora.jpg`, `hero_img.jpg`.
  - **Done 2026-07-26.** Re-verified every filename with an independent repo-wide grep before deleting; the audit's list was exactly right, and the `hero_img.jpg` trap was real (it came back referenced by `index.html`, and was kept). `public/assets/` is now 92 KB, all 7 survivors present.
  - **Also deleted:** `public/new-favicon.png`, unreferenced anywhere in the repo. Not on the original list; flagged to Hayden and deleted with his go-ahead 2026-07-26.
- [x] **Tailwind is scanning `.claude/`, `.idea/`, and now `AUDIT.md` itself.** ⚠️ **Promoted in priority — this file made it worse.** After Phase 1, `p-2` is no longer used anywhere in `src/` or `index.html`, yet `.p-2` still ships in `dist/` — because *this document* mentions it in prose. Writing the audit added ~550 bytes of phantom CSS to the bundle. Every finding recorded here that names a class name feeds the problem it describes. Worth doing early, not in sequence. `src/index.css:1`. v4 auto source detection covers everything not gitignored, so class names appearing *in prose* in agent docs and shelved patches become real CSS. Confirmed in the bundle: `.shadow-sm`, `.max-w-screen-2xl`, `.invisible`, `.resize` are present in `dist/` but nowhere in `src/` or `index.html` — ~1,223 of 19,293 bytes (~6%). Fix: `@import 'tailwindcss' source(none);` then `@source '../src'; @source '../index.html';`
  - **Done 2026-07-26.** The prescribed fix worked verbatim. CSS went 19.98 kB → 17.43 kB (−2.55 kB, ~13%). Confirmed all five named phantom classes are gone from the bundle and that the real utilities, all six breakpoints and the `hover:` variant survived.
  - **Gotcha for whoever verifies this next:** grepping the bundle for a class name lies twice. Variants are escaped (`.lg\:grid-cols-2`), and classes starting with a digit are escaped *with a trailing space* — `2xl:grid-cols-3` ships as `.\32 xl\:grid-cols-3`. A naive grep reports both as missing. Check for the `@media (width>=96rem)` block instead; note v4 emits `width>=` range syntax, not `min-width`.
- [x] **Dead v4 border-compat block.** `src/index.css:7-23`. The only bordered element in the app (`Item.vue:36`) names its color explicitly, and Preflight zeroes `border-width` on `*`. The condition its own comment describes is met — safe to delete. **Deleted; re-grepped first and `border-l-4 border-gray-300` is still the only border in `src/`. `border-gray-300` verified present in the built bundle.**
- [x] Add `"engines": { "node": ">=20.12" }` to `package.json` so the Node-18 footgun gives a clear error.
- [x] Add `permissions: { contents: write }` to `.github/workflows/master_deploy.yml`. Works today via the default token; breaks silently with a 403 if that default ever flips.
- [x] Five safe patch bumps: `tailwindcss` + `@tailwindcss/vite` 4.3.2→4.3.3, `vite` 8.1.4→8.1.5, `vue` 3.5.39→3.5.40, `vue-tsc` 3.3.7→3.3.8. **Hold TypeScript at `~5.9.3`** — latest is 7.x, two majors past what vue-tsc 3.3 targets. **All five landed on the intended versions; TypeScript confirmed still 5.9.3 in `yarn.lock`. Clean build after.**
- [x] Delete six stale Vite-2-era Dependabot branches on the remote: `json5-1.0.2`, `loader-utils-1.4.2`, `minimatch-3.1.2`, `minimist-1.2.6`, `nanoid-3.2.0`, `vite-2.9.13`. **Deleted 2026-07-26 with Hayden's go-ahead.** The remote now holds only `master` and `gh-pages` — note `updates` is local-only and has never been pushed.
- [x] `tsconfig.json:5` uses legacy `moduleResolution: "node"` (`"bundler"` is the Vite-era match); no `skipLibCheck`, no `isolatedModules`, and `include` omits `vite.config.ts` so the config is never type-checked. **All four applied; `vue-tsc` passes with `vite.config.ts` now in scope.**

## Phase 5 — accessibility

The site currently does not state whose it is in any machine-readable way. Needs a tab-order and screen-reader pass to verify.

- [x] **No `<h1>` anywhere.** The wordmarks at `Header.vue:42-50` are raw `<path>` geometry with no text alternative; the only headings are the six `<h2>` project titles (`Item.vue:34`). Since `index.html:29` ships an empty `<div id="app">`, a crawler that doesn't run JS sees only the `<noscript>` string. For a portfolio meant to rank for its owner's name, that's the whole game. Add a visually-hidden `<h1>Hayden Blaise Lueck</h1>`; `aria-hidden="true"` on the wordmark SVGs.
  - **Done 2026-07-26.** `<h1 class="sr-only">` is the first node in `App.vue`'s template — deliberately *outside* `Header.vue`, because the header lives in a `TransitionRoot` whose `show` is false for the first 100ms, so an `<h1>` placed inside it would be unmounted at first paint. Both wordmark SVGs got `aria-hidden="true"`.
  - **Unchanged by this fix:** `index.html` still ships an empty `<div id="app">`, so a crawler that doesn't execute JS still sees only the `<noscript>` string. This helps screen readers and JS-executing crawlers (Google) — it does not make the page meaningful without JS. Pre-rendering is the fix for that, and it's out of scope here.
- [x] **Social links have no accessible name.** `Header.vue:22` and `:28` contain only `<svg role="img">` with no `<title>`/`aria-label` — an unlabelled `role="img"` announces as nothing, so the links read as bare URLs. Add `aria-label="Instagram"` / `aria-label="GitHub"` to the anchors, `aria-hidden="true"` to the SVGs. **Done — `role="img"` dropped from both SVGs at the same time, since it's meaningless once the element is `aria-hidden`.**
- [x] **`alt="Icon"` six times.** `Item.vue:24`. The adjacent `<h2>` already names the project — decorative, so `alt=""`. **Done.**
- [x] **No `width`/`height` on card images.** `Item.vue:24`. All sources are 512×512; adding them removes first-paint layout shift at zero cost.
  - **Done — but it needs `h-auto` alongside, which the finding didn't mention.** The `height` attribute maps to a presentational hint (`height: 512px`). `w-full` overrides the width hint, but nothing was overriding the height, so `width`/`height` alone would have rendered every icon 100%-wide × 512px-tall — squashed. `class="w-full h-auto"` restores `height: auto` and lets the attributes serve their actual purpose: an `aspect-ratio` that reserves the box before decode. **Re-verified all six card images really are 512×512** rather than trusting the number (`hero_img.jpg` is 1200×630, but it's the `og:image`, not a card).
- [x] No `<main>` landmark around the card grid (`App.vue:5-11`). **Done — the existing wrapper `<div>` became `<main>`, no extra element.**
- [x] No explicit `:focus-visible` treatment on cards (`Item.vue:10`). The UA default ring does show (nothing sets `outline: none`), but it's untested against the accent wash.
  - **Done: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900`.** The `outline-offset` is what defuses the original concern — it puts the ring *outside* the card, on the `bg-gray-100` page background, so it never has to contrast against the per-card accent wash at all. gray-900 on gray-100 rather than brand red, precisely because a red ring could land against a red-tinted card.
  - **Not yet eyeballed in a browser** — verified structurally (the utilities compile into the bundle) but not visually. Worth a Tab-through when Hayden next has `yarn dev` up.
- [x] `javascript:void(0);` href at `Item.vue:8` is unreachable today (all six projects have a `link`) but produces a focusable link-that-does-nothing if a linkless card is ever added, and any future CSP blocks `javascript:` URLs. Prefer `:href="item.link || undefined"`. **Done — confirmed `javascript:void` no longer appears anywhere in the built bundle.** A linkless card now renders an `<a>` with no `href`, which is correctly non-focusable.

**Phase 5 done 2026-07-26.** All seven items applied and verified against the *built* bundle, not just the source: `h1`/`main` present in the compiled render function, `aria-label` on both social anchors, `alt=""`, `width`/`height`/`h-auto` on the icon, all five new utilities compiled in. **One caveat: none of it has been checked with an actual screen reader or a keyboard Tab-through** — the verification was structural.
  - **Trap for whoever verifies this in `dist/`:** the minifier emits tag names in backticks, so grepping for `"h1"` or `"main"` reports them missing. They ship as `` Y(`h1`,{class:`sr-only`},…) ``. Search with backticks or you'll conclude the fix didn't land.

## Card redesign (2026-07-26) — not an audit item, but read it first

Done on `updates` after the audit was written, so several Phase 6 line references below point at code that has moved. Reviewed 2026-07-26; findings applied. What changed:

- **`.tint` → `.slab`.** The soft radial wash is gone, replaced by a hard 45° wedge in the sampled accent, echoing the header's red slab. Its width is `--wedge`, a plain px length, animated on hover.
- **`ItemInterface.kind`** added (optional) and a `.meta` footer row renders it opposite a `GitHub`/`Open` label.
- **Card interior rebuilt.** No more flex row with the icon hanging outside at `-left-5`; the icon is absolutely positioned *inside* the card, and title/description/meta are one straight column at `--gutter`.
- **`useTilt` publishes `--tilt-transition`** instead of writing `style.transition`. This was a real bug fix: the inline shorthand outranked the stylesheet and cancelled every other transition on the card while hovered.

**Load-bearing things a future edit can silently break:**

- `--gutter = hover --wedge − 15 + 8`. The 15 is `.body`'s top padding. Change one, recompute the other, or the wedge collides with the title. **Was `resting --wedge` until 2026-07-27** — see the wedge-resize note below.
- `@property --wedge` in `src/index.css` is what makes the wipe animate. Delete it and the hover snaps — with no error anywhere. It needs Firefox 128+; below that it degrades to a snap.
- `--wedge` must *not* land within a pixel or two of the icon's circle, which reads as a clipping bug; the tangent widths to avoid are 61/191 desktop and 49/153 phone. It no longer has to stay close to the card height — the resting wedge deliberately stops around two-thirds of the way down. Both are derived in `Item.vue`'s geometry comment with the arithmetic shown.
- The `sm` `:hover` rule must stay *after* the base `:hover`, or the narrow hover value wins at every width.

**Verified, don't redo:** `yarn build` clean on Node 22.23.1; `@property`, `line-clamp-2`, `scale-70` and the scoped `@keyframes` rename all confirmed present in `dist/`; accent algorithm re-run offline against all six real icons.

**Deliberate, don't re-flag:** the resting wedge stops well short of the card's bottom edge; the icon does not move on hover; `.card` sets no `overflow`; the reduced-motion block covers hover CSS only, because the entrance is a separate open item below.

### Wedge resize (2026-07-27)

All four `--wedge` values dropped a step: rest 132→95 / 152→110, hover 184→132 / 210→152. Hover now lands on the width the card used to *rest* at, and the resting state is a small corner triangle. `--gutter`, `--icon` and the icon offsets are untouched.

Two earlier notes are inverted by this and should not be restored:

- The wedge no longer runs under the text on hover. The old hover width overran `--gutter` on purpose; the new one *is* the width the gutter was drawn for, so the edge stops at the text column in every state. The gutter numbers didn't move — only which width they're derived from.
- **The AA finding at line 169 below is closed by this.** No text sits over the accent at any point in any state now, so the description's 2.4:1 worst case can't occur. `Item.vue`'s geometry comment no longer carries per-icon text-contrast figures, because there is no text-over-accent to measure.

Still true: the accent must separate from the card face and from the icon it was sampled from — that is `useAccentColor`'s job and this change doesn't touch it.

---

## Phase 6 — motion & GPU (MERGE GATE)

**This is the last chance to not ship these.** None of it exists on `master`. Do it with a browser open — 375px, desktop hover, and OS Reduce Motion toggled — and with Hayden watching, because he's been tuning this system by feel (`Smoother transition into hover effect`, `Less intense gloss/tilt`, `Improve how we get the card background color`).

- [x] ~~**Reduced motion is ignored by every entrance animation.**~~ **Closed 2026-07-27.** Every enter class is now bound rather than literal and collapses to a plain `opacity-0` fade under Reduce Motion — the card, its title and description, its icon (`Item.vue`, in `setup()`), and both header wordmark rows (`Header.vue`, in `data()`). The stagger went with it: `useReveal.ts` zeroes both the inter-card delay and the initial delay when the query matches. The check itself is `prefersReducedMotion()` in the new `src/composables/useReducedMotion.ts`, which reads `matchMedia` at call time rather than caching, so there is now exactly one definition of the query in the repo (`useTilt` was rewired to it too, no behaviour change). Opacity is deliberately kept: it is not a vestibular trigger, and it keeps the entrance legible rather than deleting it.
  - Note the stagger no longer lives in `App.vue` at all — see the reveal-on-scroll note under **Card redesign**-era changes below. The old line references (`App.vue:36-42`, `Item.vue:21-29`) are dead.
- [x] ~~**24 permanently-promoted compositor layers.**~~ **Fixed 2026-07-26** — `will-change: transform` deleted from `.gloss::before`/`::after`; the rAF-driven transform composites fine without it. Note the new `.rim` added alongside is deliberately *not* promoted: its tilt-driven `box-shadow` offsets repaint per frame by nature, which is why it sits on its own childless overlay rather than on the card, where it would re-rasterise the icon and text on every pointer move.
- [x] ~~**iPad + Magic Keyboard never gets the tilt.** `useTilt.ts:13` gates on `(hover: hover)`; WebKit on iPadOS reports the *primary* pointer as the touchscreen regardless of an attached trackpad ([WebKit #209292](https://bugs.webkit.org/show_bug.cgi?id=209292), open since iOS 13.4). `(any-hover: hover)` is Baseline since 2018 and fixes it.~~ **Fixed 2026-07-27.** **The diagnosis was confirmed on Hayden's own iPad first** rather than taken on faith — over Safari Web Inspector with the Magic Keyboard attached, `matchMedia('(hover: hover)').matches` returned `false` and `(any-hover: hover)` returned `true`. WebKit #209292 is still open.
  - **The TRAP below was resolved at the root, not accepted.** Instead of editing three call sites, Tailwind's `hover:` variant is redefined once in `src/index.css` via `@custom-variant hover { @media (any-hover: hover) { &:hover { @slot; } } }`, and `useTilt.ts` asks the same query. All three utilities (`hover:z-10`, `hover:scale-110`, `hover:rotate-6`) move together, so there is no split to accept and no per-element CSS rewriting. **Verified in the built bundle:** one `@media (any-hover:hover)` block containing all three, **zero** remaining `(hover:hover)` occurrences, and the JS gate reading `any-hover: hover`. **Then confirmed on the iPad itself 2026-07-27 — the tilt and the header icon lift both fire on the Magic Keyboard trackpad.** This one is end-to-end verified on real hardware, not structurally.
  - **`@media (hover: none)` in `Item.vue` is deliberately NOT changed to match.** The two queries ask different questions and on an iPad both answers are yes: `any-hover` asks "can this device hover" (trackpad → tilt), `hover: none` asks "can a finger press this" (touchscreen → press state). Switching the latter to `any-hover: none` would delete the press response from the one device that most needs both. Documented in place at the block.
  - **No effect on touch-only phones** — `any-hover` is false there exactly as `hover` was. Only genuinely-hybrid devices change behaviour.
  - **If you ever change one query, change the other.** The CSS and JS halves of the hover treatment now agree by convention, not by construction; there is no test that would catch them drifting apart.
  - ~~**Second gate since the redesign:** `.card:hover { --wedge }` is plain CSS `:hover`, which *does* fire on an iPad trackpad, so iPad got the wedge wipe but not the tilt.~~ Moot — iPad now gets both.
- [x] ~~`enabled` is latched once at setup (`useTilt.ts:32`) — toggling OS Reduce Motion or plugging in a mouse needs a page reload.~~ **Fixed 2026-07-27.** `enabled` is now re-derived by `syncEnabled()` from a `change` listener on *both* inputs — `(any-hover: hover)` and `(prefers-reduced-motion: reduce)` — with each watcher returning its own teardown, called in `onBeforeUnmount`. `syncEnabled()` also runs once in `onMounted`, since `setup()` and mount are not the same instant.
  - **The unwind had to be split out of `onMouseLeave` to make this correct.** Turning the tilt off mid-hover strands the card tilted: from that moment `onMouseLeave` refuses to run on its `!enabled` guard, and `mouseleave` was the only thing that would ever have flattened it. The body is now `settle()`, which carries no guard of its own; `onMouseLeave` is the guarded wrapper, and `resetIfHovered` (blur/visibilitychange) calls `settle()` directly. A disable mid-hover returns over `RETURN_MS` like a normal pointer exit rather than snapping — deliberate: it's the same 4° already on screen, and one path through the exit beats saving 300ms of it.
  - **The blur/visibilitychange listeners are now attached unconditionally**, where they used to be gated on `enabled` — the gate can open later now, and they are no-ops while it's shut, because `hovered` is only ever set by the (still gated) `onMouseEnter`.
  - `onReducedMotionChange()` was added to `useReducedMotion.ts` and the query string hoisted to a module constant, so the **one-definition property still holds**: verified in the bundle, `(prefers-reduced-motion: reduce)` and `(any-hover: hover)` each appear exactly once. Also confirmed 2 `change` listeners added and 2 removed.
  - **Checked by Hayden 2026-07-27 in a browser — behaves. Don't re-raise.** Tested by flipping DevTools' `prefers-reduced-motion` emulation while holding the pointer on a tilted card: the card unwinds to flat, stops responding while `reduce` is set, and starts tilting again when it's flipped back — all with no reload, which is exactly what was broken.
- [x] ~~`useTilt` has no `blur` / `visibilitychange` reset — Cmd-Tab mid-hover can leave a card frozen tilted, since `mouseleave` doesn't reliably fire.~~ **Fixed 2026-07-27.** A `hovered` flag now tracks whether this card is the tilted one, and `window` `blur` + `document` `visibilitychange` unwind it through the existing `onMouseLeave`, so the card returns over `RETURN_MS` exactly as a normal pointer exit does. Both events are needed — tab switches fire `visibilitychange`, app/window switches fire only `blur` — and the reset is idempotent where they overlap. `visibilitychange` is guarded on `document.hidden` so the fire on the way *back* is a no-op. Listeners are only attached when `enabled` (so never under Reduce Motion or on touch) and are torn down in `onBeforeUnmount` alongside the existing rAF/timer cleanup. **Verified:** clean build on Node 22.23.1, `visibilitychange` present in `dist/`, CSS hash unchanged at `index-Dg1QKxxf.css` — confirming this is behaviour-only and touched no styling. **Checked by Hayden 2026-07-27 in a browser — the gesture behaves. Don't re-raise.**
- [x] ~~Dead no-ops at `Item.vue:10`: `origin-center` and `transform-gpu`.~~ **Gone with the redesign 2026-07-26.** Both fell out when the card's class list was rewritten; neither was re-added.
- [x] ~~`useTilt.ts:51` measures with `getBoundingClientRect()`, which returns the *post-transform* box.~~ **Fixed 2026-07-27.** `render()` now takes the **centre from the rect and the extents from the layout box** — `el.offsetWidth`/`offsetHeight` for the halves, `rect.left + rect.width / 2` for the centre. The rect is still read every frame (the original reason stands: caching on enter tilts around a stale centre when the page scrolls under the pointer). The split is the point: only the *denominator* was inflated by `scale(1.02)` and the rotation, so the offsets ran ~2% short of ±1 and the tilt never quite reached `MAX_TILT_DEG`; the rect's centre was always honest, because the transform is symmetric about it. Invisible either way, as predicted.
- [x] ~~**Overlay duplication — bigger since the redesign.** Five absolutely-positioned overlays (`.shade`, `.slab`, `.grain`, `.gloss`, `.rim`) each repeat `position`/`inset`/`border-radius: inherit`/`pointer-events`. A shared `.overlay` base would carry all five.~~ **Closed as won't-do 2026-07-27 (Hayden). Don't re-raise.** The duplication is smaller than the finding assumes — checked property by property before deciding:
  - Only `position: absolute`, `inset: 0` and `border-radius: inherit` are genuinely shared by all five. `pointer-events: none` is **not**: `.slab` deliberately omits it, because it is the card's colour rather than decorative chrome — the exact caveat the finding raised, and it turns out to be load-bearing.
  - `z-index` differs (`.slab` 0, the rest 2) and is what orders the stack, so it can't move to a base. `.gloss` additionally needs `overflow: hidden` to clip its transformed pseudo-elements — the Safari behaviour verified on real hardware and explicitly marked don't-re-raise.
  - So a base class saves three lines each and leaves every rule with its own tail regardless, in exchange for a blind refactor of the most hand-tuned CSS in the repo, immediately before the merge that ships it. Each overlay's block also carries a comment explaining why that specific layer exists; a shared base separates those from the properties they justify.
- [x] ~~Header translate ladder (`Header.vue:11`) steps `base → md → lg → xl`, but the grid gains its third column at `2xl` (96rem) — above 1536px the banner geometry is frozen while the layout changes underneath it.~~ **Fixed 2026-07-27 — but not the way the finding implies.** The fix is **deleting the `2xl` height override** so xl's `h-[1060px]` carries through. **No `2xl` translate rung was added**, and the ladder deliberately still stops at xl. Net effect on the bundle is *negative* (22.61 → 22.58 kB): one rule removed, nothing added.
  - **The bug was real and was reproduced before being fixed**, at 1600×900: the box clipped to a 757px viewport while the art ran to 1056px, the document was 864px, so scrolling the available 107px exposed a hard horizontal cut straight across the red slab. Screenshotted before and after.
  - **The file's own derivation was re-derived independently and confirmed to the pixel** rather than trusted. `y = translate-y − translate-x + √2 × stack-height` reproduces all four documented crossings (383/553/735/1055) exactly, with the stack measuring 939px in the browser as the comment claims. A binary-search hit-test down the left viewport edge agreed with prediction to 3px — the 3px being the probe sitting at `x=3` on a 45° edge.
  - **The framing "the banner geometry is frozen" is a red herring, and a 2xl rung is the wrong fix.** The real asymmetry is that 2xl is the only breakpoint where the *content gets shorter* (1072 → 864, third column), so it is the only place the header box ends up being the tallest thing on the page. Sizing the box to hold the art — what every breakpoint below already does — is the whole fix.
  - **Both rungs were actually built and measured before being rejected.** `2xl:-translate-x-232` does land the art at 848 with zero dead scroll, but it makes the ladder *reverse*: the banner snaps ~208px left crossing 1536px, against the direction every previous step moves. **Hayden caught this on review and rejected it — it reads wrong, and he is right.** The `translate-y` alternative lands the art identically but lifts the whole stack and puts the wordmarks off the top of the screen (confirmed in a browser; "Lueck" and both social icons gone). Both are now documented in `Header.vue` as *do not add a 2xl rung*, with the reasons.
  - **Accepted tradeoff:** at 2xl the box (1060) outruns the content (864), so on a window under ~1060px tall there is ~196px to scroll past the last card, with the diagonal's tail finishing in it. Signed off deliberately in preference to the reversal. On a taller window there is no extra scroll at all.
  - ⚠️ **Phase 4's Tailwind-scans-prose problem recurred inside a source file, and is worth knowing about.** A draft of the explanatory comment named the old `h-dvh` utility in prose — and that alone kept `.h-dvh{height:100dvh}` alive in the built CSS after the last real usage was gone. `source(none)` does not help: the scoped `@source '../src'` still scans comments inside `.vue` files. Caught by grepping the bundle, reworded, re-verified gone. **Don't name a dead utility in a comment; describe it.**
- [x] ~~`drop-shadow-xl` (`Item.vue:23`) sits on the same element headlessui animates `rotate`/`scale` on.~~ **Fixed by the redesign 2026-07-26.** The icon's wrapper div is gone; `.icon` carries a plain `box-shadow` instead of a `drop-shadow` filter, and a box-shadow is not recomputed by a composited transform.

---

## Verified healthy — don't re-audit

`yarn build` passes in ~3s with zero type errors (Node 22.23.1 via `.nvmrc`). CI's Node pin is correct — the workflow uses `node-version-file: .nvmrc`. `dist/` is properly gitignored. CNAME round-trips into `gh-pages`. 0 npm vulnerabilities.

`useTilt` cancels its rAF and settle timer in `onBeforeUnmount`. `useAccentColor` is the strongest code in the repo — same-origin reasoning is correct (omitting `crossOrigin` is deliberate and right; setting it would fork the cache and double the download), tainted-canvas is caught in a try/catch, the async race is handled, failures degrade to a card with no wedge at all (`v-if="accent"`), which is a clean fallback rather than a broken one. Its `willReadFrequently` is Safari 18+ (above the site's 16.4 floor) but unknown context attributes are ignored per spec, so it's a silent no-op, not a break.

Tailwind v4 migration is clean — no config files, no `@tailwind` directives, no v3 leftovers; the v4 transform-property split broke nothing. No `any`, no non-null assertions, no listener leaks. headlessui transition nesting is correct. Touch users are not stranded. `target="_blank"` without `rel="noopener"` is safe at this site's browser floor (modern browsers imply it), though adding it is free.

⚠️ **The old contrast line here — "passes AA at worst case (12.4:1 tint, 9.7:1 under gloss)" — was deleted, not carried forward.** It described the `.tint` wash, which no longer exists. Do not quote the old figures.

**Resolved 2026-07-27 by the wedge resize** (see above). The 2026-07-26 re-measurement found the description at 2.4:1 where the hover wedge crossed it; the wedge no longer reaches the text column in any state, so no text is drawn over the accent at all. The remaining text-on-card contrast is black/gray-600 on `#fbfbfc`, which is not in question. This becomes live again only if a future hover width exceeds `--gutter`.

## Hardware checks — all clear

Every item on this list has now been checked on real hardware. Nothing here is outstanding.

- [x] ~~**Safari:** `.gloss` leaking transformed pseudo-elements past rounded corners.~~ **Checked by Hayden 2026-07-26 in Safari — renders fine. Don't re-raise.** The `overflow: hidden` + `border-radius: inherit` clip on `.gloss` holds, and it survived the redesign unchanged. iOS was never at risk: the gloss is hover-gated, so it never animates on touch and the leak can't manifest — macOS Safari was the entire test.
- [x] ~~**Safari, new since the redesign:** the card itself no longer sets `overflow`. `.slab` rounds its own corners with `border-radius: inherit` alone, on the reasoning that a background paints to the border box. That is correct per spec, but it is a *different* mechanism from the clip that was tested above, on the one element that paints edge-to-edge colour — so the corner where the wedge meets the card's radius is worth one look in Safari. Not suspected, just untested.~~ **Checked by Hayden 2026-07-27 in Safari — renders fine. Don't re-raise.** The test was the top-left corner (the only one painted in solid accent, since the wedge is a `135deg` gradient) while hovering, i.e. with the card under `useTilt`'s `perspective`/`rotate`/`scale` — the composited-layer path, which is the one the earlier `overflow: hidden` `.gloss` test did not cover. No square corner and no hairline seam. Worth knowing the static case was structurally safe anyway: `.card` is `rounded-2xl` with **no border**, so `.slab`'s `inset: 0` lands exactly on the border box and inherits an identical 16px radius — there is no inner-vs-outer radius mismatch available to get wrong. That reasoning holds only while the card stays borderless.
- ~~**375px viewport:** the icon shave (Phase 1) and the Euclidean description clip (Phase 3)~~ — both checked 2026-07-26, both fine. Nothing further needed at this width.
- [x] ~~**iPad + Magic Keyboard:** confirm the tilt gate before changing it (Phase 6).~~ **Done 2026-07-27, and it did change the outcome.** The gate was measured on the device before being touched (`(hover: hover)` false, `(any-hover: hover)` true) and the tilt confirmed working after. See the Phase 6 item for the fix and for why `@media (hover: none)` was left on the old query.
