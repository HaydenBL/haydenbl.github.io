![Header](/public/assets/hero_img.jpg?raw=true)

Written with Vue 3 + Typescript + Vite, styled with Tailwind CSS

### Setup

Requires Node 22 (`nvm use` picks it up from `.nvmrc`).

Clone the repository and run `yarn install` from the root.

### Scripts

| Command        |           |
| ------------- |-------------|
| `yarn dev` | Start dev server (`yarn start` also works) |
| `yarn build` | Type-check and build production site to `/dist` |
| `yarn build:watch` | Rebuild `/dist` on every change (no type-check) |
| `yarn serve` | Locally preview production build |

### Local development

For the Vue app itself, `yarn dev` with hot reload is all you need.

For the static sub-sites in `/public`, the dev server won't resolve a directory URL to its `index.html` (it falls back to the app homepage).
To view them as they'll be served on GitHub Pages, run `yarn build:watch` in one terminal and `yarn serve` in another,
then browse at the preview URL and refresh after edits. Include the trailing slash — the preview server doesn't
redirect the slashless form the way GitHub Pages does, it falls back to the app homepage.
