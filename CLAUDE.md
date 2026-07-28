# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Personal portfolio site (haydenblai.se) built with Vue 3 + TypeScript + Vite, styled with Tailwind CSS. Deployed to GitHub Pages: pushing to `master` triggers `.github/workflows/master_deploy.yml`, which builds and publishes `dist/` to the `gh-pages` branch.

## Commands

Uses yarn (`yarn install` to set up).

- `yarn dev` (or `yarn start`) — start the Vite dev server
- `yarn build` — type-check with `vue-tsc --noEmit`, then build to `dist/`
- `yarn serve` — preview the production build locally

There are no tests or linters; `yarn build` is the verification step.

## Architecture

The whole site is a single page defined in `src/App.vue`, which renders `Header.vue` and a grid of `Item.vue` cards. The project list is hardcoded as a data array in `App.vue` (typed by `src/types/ItemInterface.ts`) — adding/removing a portfolio entry means editing that array and dropping a card image into `public/assets/`.

Entrance animations use `TransitionRoot`/`TransitionChild` from `@headlessui/vue`. Cards are revealed by `src/composables/useReveal.ts` — one shared `IntersectionObserver` holds each card hidden until it scrolls into view, then reveals it, staggering only the cards that arrive together. `App.vue` no longer drives any of this.

Motion is gated in one place: `prefersReducedMotion()` in `src/composables/useReducedMotion.ts`, which reads `matchMedia` at call time rather than caching so an OS toggle takes effect without a reload. Under Reduce Motion the entrance collapses to a plain fade and the stagger goes to zero. `useTilt.ts` (the hover tilt/gloss) asks the same helper and re-checks it on `change`. Don't add a second definition of either query — `useTilt` also owns the `(any-hover: hover)` string, which Tailwind's `hover:` variant is overridden to match in `index.css`.

`public/` also contains standalone static sub-sites served as-is: `euclidean-calc/` (a prebuilt Angular app) and `QuiQuote/` (privacy/license pages). `old-site/` at the repo root is the retired previous version of the site and is not part of the build.

`public/junteo/` is an **intentional placeholder**, not dead code. It serves a privacy page at `haydenblai.se/junteo/privacy/` ahead of an app-store submission, so it is deliberately live while being referenced from nowhere in `src/` and having no project card. Leave it in place; it gets a card if and when the app ships.

## Card copy is Hayden's, not code to improve

The `projects` array in `App.vue` is content he owns. A full audit in July 2026 proposed rewrites to three cards; every one was reviewed with concrete replacement text on the table and **declined**. Don't re-raise them:

- **VSCO Photo Downloader** uses the retired product name, repeats "VSCO", and describes a taken-down tool in the present tense. This was raised as a trademark risk — the README does record VSCO's contact forcing a branding change once before — and a rename plus a fully generic option were both offered. Hayden chose to keep it. It is a judgement call about his own legal exposure and it has been made.
- **QuiQuote** reads present-tense for a delisted app. Past-tense and tense-only rewrites both declined.
- **Quora Clone**'s "It's very bad!" breaks tone on purpose. Declined.

A *factual* error is still worth flagging. Style, tone and tense are not.

**Length ceiling:** `Item.vue` clips descriptions with no ellipsis or fade, so an over-long one truncates silently with nothing to see in review. Treat ~120 characters as the practical maximum for a new card.

## Verifying a change

`yarn build` is the only test, so changes get checked by grepping `dist/`. That lies in three ways, each of which has already caused a fix to be wrongly reported as missing:

- **Variants are escaped.** `lg:grid-cols-2` ships as `.lg\:grid-cols-2`, and a class starting with a digit is escaped with a **trailing space** — `2xl:grid-cols-3` becomes `.\32 xl\:grid-cols-3`. Check for the `@media (width>=96rem)` block instead, and note v4 emits `width>=` range syntax rather than `min-width`.
- **The minifier writes tag names in backticks.** `<h1>` ships as `` Y(`h1`,…) ``, so grepping for `"h1"` finds nothing. Same for `addEventListener("change"` → `` addEventListener(`change` ``.
- **Tailwind scans prose, including comments inside `.vue` files.** Naming a utility in a comment keeps emitting its rule: writing `h-dvh` in a `Header.vue` comment kept `.h-dvh{height:100dvh}` in the bundle after the last real usage was deleted. `source(none)` does not help — the scoped `@source '../src'` still covers comments. Describe a dead utility, don't name it.

Comparing CSS byte counts before and after is a cheap way to prove a change is behaviour-only.

## Settled visual decisions

- **`theme-color` stays `#f3f4f6`, matching `bg-gray-100` — not the header's red.** Red works via `theme-color` on iOS 15–18.7 and Chrome/Android, but Safari 26 ignores it and samples only fixed/sticky elements at the viewport edge; the header is `absolute`, so the sole way to feed it red is a dedicated fixed sliver. Tried and rejected as a hack against a browser that is deliberately deriving the tint from the page.
- **The header's translate ladder has no `2xl` rung, deliberately.** Both ways of adding one were built and measured and both are worse — see the comment in `Header.vue`, which records why.

## Agents

`.claude/agents/` defines five specialists for this repo; delegate to them when a task fits:

- `vue-expert` — component/composable behaviour, reactivity, headlessui transitions, vue-tsc errors
- `tailwind-expert` — Tailwind v4 utilities and theme tokens, layout/breakpoints, the card's overlay CSS (`.slab`, `.gloss`, `.grain`, `.shade`, `.rim`)
- `web-platform-expert` — which browser API to use, support/compatibility, fallbacks and progressive enhancement
- `portfolio-curator` — adding, editing, or reordering a project card (the `projects` array plus `public/assets/`)
- `build-doctor` — build/type-check failures, dependency upgrades, the master → gh-pages deploy
