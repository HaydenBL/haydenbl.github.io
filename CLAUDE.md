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

Entrance animations use `TransitionRoot`/`TransitionChild` from `@headlessui/vue`, driven by staggered `setTimeout` calls in `App.vue`'s `created()` hook that flip each item's `show` flag.

`public/` also contains standalone static sub-sites served as-is: `euclidean-calc/` (a prebuilt Angular app) and `QuiQuote/` (privacy/license pages). `old-site/` at the repo root is the retired previous version of the site and is not part of the build.

`public/junteo/` is an **intentional placeholder**, not dead code. It serves a privacy page at `haydenblai.se/junteo/privacy/` ahead of an app-store submission, so it is deliberately live while being referenced from nowhere in `src/` and having no project card. Leave it in place; it gets a card if and when the app ships.

## Agents

`.claude/agents/` defines five specialists for this repo; delegate to them when a task fits:

- `vue-expert` — component/composable behaviour, reactivity, headlessui transitions, vue-tsc errors
- `tailwind-expert` — Tailwind v4 utilities and theme tokens, layout/breakpoints, the card gloss and tint CSS
- `web-platform-expert` — which browser API to use, support/compatibility, fallbacks and progressive enhancement
- `portfolio-curator` — adding, editing, or reordering a project card (the `projects` array plus `public/assets/`)
- `build-doctor` — build/type-check failures, dependency upgrades, the master → gh-pages deploy
