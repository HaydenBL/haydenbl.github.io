# Audit backlog — haydenblai.se

Findings from a five-agent audit (vue, tailwind, web-platform, build, content) run 2026-07-26 against commit `886744b`. Working doc, meant to be picked up across sessions. Nothing here is fixed yet.

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

- [ ] **No `<h1>` anywhere.** The wordmarks at `Header.vue:42-50` are raw `<path>` geometry with no text alternative; the only headings are the six `<h2>` project titles (`Item.vue:34`). Since `index.html:29` ships an empty `<div id="app">`, a crawler that doesn't run JS sees only the `<noscript>` string. For a portfolio meant to rank for its owner's name, that's the whole game. Add a visually-hidden `<h1>Hayden Blaise Lueck</h1>`; `aria-hidden="true"` on the wordmark SVGs.
- [ ] **Social links have no accessible name.** `Header.vue:22` and `:28` contain only `<svg role="img">` with no `<title>`/`aria-label` — an unlabelled `role="img"` announces as nothing, so the links read as bare URLs. Add `aria-label="Instagram"` / `aria-label="GitHub"` to the anchors, `aria-hidden="true"` to the SVGs.
- [ ] **`alt="Icon"` six times.** `Item.vue:24`. The adjacent `<h2>` already names the project — decorative, so `alt=""`.
- [ ] **No `width`/`height` on card images.** `Item.vue:24`. All sources are 512×512; adding them removes first-paint layout shift at zero cost.
- [ ] No `<main>` landmark around the card grid (`App.vue:5-11`).
- [ ] No explicit `:focus-visible` treatment on cards (`Item.vue:10`). The UA default ring does show (nothing sets `outline: none`), but it's untested against the accent wash.
- [ ] `javascript:void(0);` href at `Item.vue:8` is unreachable today (all six projects have a `link`) but produces a focusable link-that-does-nothing if a linkless card is ever added, and any future CSP blocks `javascript:` URLs. Prefer `:href="item.link || undefined"`.

## Phase 6 — motion & GPU (MERGE GATE)

**This is the last chance to not ship these.** None of it exists on `master`. Do it with a browser open — 375px, desktop hover, and OS Reduce Motion toggled — and with Hayden watching, because he's been tuning this system by feel (`Smoother transition into hover effect`, `Less intense gloss/tilt`, `Improve how we get the card background color`).

- [ ] **Reduced motion is ignored everywhere except the hover tilt.** `useTilt.ts:14` is the only place in the repo reading the query (grep-confirmed), so the *subtlest* effect is the only one suppressed — while six cards slide in on a 70ms stagger (`App.vue:29-35`), each icon spins 45° and scales 70→100% (`Item.vue:19-21`), and the wordmarks travel 320–480px (`Header.vue:19`, `:38`). Gate the stagger and swap enter classes for an opacity-only fade. **Flagged independently by three agents.** Note the entrance animations *do* exist on master, so this one is partly a live defect.
- [ ] **24 permanently-promoted compositor layers.** `Item.vue:136` puts `will-change: transform` on `.gloss::before`/`::after` — two `.gloss` per card × six cards, each at `inset: -50%` (4× card area). Promoted on touch and under reduced motion too, where the layer is invisible. On the icon they sit inside a `drop-shadow-xl` filter, which re-rasterizes the subtree anyway, so the hint buys nothing there. Scope to hover or delete outright — the rAF-driven transform composites fine without it.
- [ ] **iPad + Magic Keyboard never gets the tilt.** `useTilt.ts:13` gates on `(hover: hover)`; WebKit on iPadOS reports the *primary* pointer as the touchscreen regardless of an attached trackpad ([WebKit #209292](https://bugs.webkit.org/show_bug.cgi?id=209292), open since iOS 13.4). `(any-hover: hover)` is Baseline since 2018 and fixes it.
  - **TRAP:** Tailwind v4's `hover:` variant compiles to `@media (hover: hover)`, so changing only the composable desyncs the two gates — `hover:z-10` (`Item.vue:10`) and the header's `hover:scale-110 hover:rotate-6` would stay off on iPad while the tilt turned on. Move the z-index into the composable or consciously accept the split.
- [ ] `enabled` is latched once at setup (`useTilt.ts:26`) — toggling OS Reduce Motion or plugging in a mouse needs a page reload. Fix with a `matchMedia` `change` listener (and tear it down on unmount).
- [ ] `useTilt` has no `blur` / `visibilitychange` reset — Cmd-Tab mid-hover can leave a card frozen tilted, since `mouseleave` doesn't reliably fire.
- [ ] Dead no-ops at `Item.vue:10`: `origin-center` (already the default) and `transform-gpu` (overwritten by `useTilt`'s inline transform the moment you hover; only applies at rest, where nothing moves).
- [ ] `useTilt.ts:45` measures with `getBoundingClientRect()`, which returns the *post-transform* box — so pointer offsets normalize against a box that grows with `scale(1.02)` and the 3D rotation. ~2% distortion, invisible; `offsetWidth`/`offsetHeight` would make the math honest.
- [ ] `Item.vue:91-96` and `:121-126` duplicate five declarations (`position`/`inset`/`overflow`/`border-radius`/`pointer-events`). A shared `.overlay` base would carry both.
- [ ] Header translate ladder (`Header.vue:11`) steps `base → md → lg → xl`, but the grid gains its third column at `2xl` (96rem) — above 1536px the banner geometry is frozen while the layout changes underneath it.
- [ ] `drop-shadow-xl` (`Item.vue:23`) sits on the same element headlessui animates `rotate`/`scale` on, so a 9px-blur shadow is recomputed each frame for 500ms × 6 icons during the entrance.

---

## Verified healthy — don't re-audit

`yarn build` passes in ~3s with zero type errors (Node 22.23.1 via `.nvmrc`). CI's Node pin is correct — the workflow uses `node-version-file: .nvmrc`. `dist/` is properly gitignored. CNAME round-trips into `gh-pages`. 0 npm vulnerabilities.

`useTilt` cancels its rAF and settle timer in `onBeforeUnmount`. `useAccentColor` is the strongest code in the repo — same-origin reasoning is correct (omitting `crossOrigin` is deliberate and right; setting it would fork the cache and double the download), tainted-canvas is caught in a try/catch, the async race is handled, failures degrade to an untinted card. Its `willReadFrequently` is Safari 18+ (above the site's 16.4 floor) but unknown context attributes are ignored per spec, so it's a silent no-op, not a break.

Tailwind v4 migration is clean — no config files, no `@tailwind` directives, no v3 leftovers; the v4 transform-property split broke nothing. Contrast passes AA at worst case (12.4:1 tint, 9.7:1 under gloss). No `any`, no non-null assertions, no listener leaks. headlessui transition nesting is correct. Touch users are not stranded. `target="_blank"` without `rel="noopener"` is safe at this site's browser floor (modern browsers imply it), though adding it is free.

## Hardware checks — all clear except iPad

Everything on this list has been checked except the iPad item, which is gated on Hayden having the device to hand.

- [x] ~~**Safari:** `.gloss` leaking transformed pseudo-elements past rounded corners.~~ **Checked by Hayden 2026-07-26 in Safari — renders fine. Don't re-raise.** The `overflow: hidden` + `border-radius: inherit` clip at `Item.vue:121-129` holds. iOS was never at risk: the gloss is hover-gated, so it never animates on touch and the leak can't manifest — macOS Safari was the entire test.
- ~~**375px viewport:** the icon shave (Phase 1) and the Euclidean description clip (Phase 3)~~ — both checked 2026-07-26, both fine. Nothing further needed at this width.
- **iPad + Magic Keyboard:** confirm the tilt gate before changing it (Phase 6).
