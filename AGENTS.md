# AGENTS.md

Instructions for AI coding agents working in this repository. Human-facing docs live in `README.md`.

## Project

The Soaring Symbols project's own brand mark (not airline logos, which live in [soaring-symbols/soaring-symbols](https://github.com/soaring-symbols/soaring-symbols)), and the images rendered from it for each integration.

- `marks/` — the source SVGs: `square-*` fill the frame, `rounded-*` are app icons with their own corners and margin; `signal` is on yellow, `board` on dark. The `icon*` marks (light, `dark` and `mono`) and the lockups (`logo*`: horizontal and `stacked`, each in a light, `dark` and `mono` version; the name is Overpass ExtraBold outlined, tracked -0.025em) keep the `square-*` tiles at the same coordinates and crop with their `viewBox`. `scripts/marks.js` writes those nine from `square-signal.svg`, so never edit them by hand: change the tiles in the four icons (they share the tile geometry), or the sizes and spacing at the top of the script, then run `npm run marks`.
- `scripts/marks.js` — writes the `icon*.svg` marks and the `logo*.svg` lockups, copying the tiles of `square-signal.svg` and outlining the name with `fontkitten`.
- `scripts/fonts.js` — downloads Google Fonts into `node_modules/.cache/brand`, for both scripts.
- `scripts/render.js` — renders `exports/` with `@resvg/resvg-js`: the icons from the marks, the Figma Community thumbnail, and the Framer Marketplace thumbnail and screenshots (the plugin window in Framer's light and dark themes) the Framer creator profile's poster, and the Webflow Marketplace logo and screenshots (the extension's panel in the Designer's dark and light colors, and a page with a mark just inserted), the Miro Marketplace screenshots (the app's panel beside Miro's toolbar on a dark board, one with a frame of logos and a mark just dropped), drawn in the script itself (the three plugins' panels share one layout, so `panelDetail` and `panelList` draw all of them, each in its app's colors) with airline SVGs from the `soaring-symbols` package and fonts (Overpass, plus Inter for the mock plugin panel) fetched from Google Fonts into `node_modules/.cache/brand`.
- `exports/` — the rendered PNGs, committed. Never edit them by hand; run `npm run render`.

## Who uses what

The integrations keep a copy of their file; after changing a mark or the thumbnail, render, then copy the new file into each repo that uses it:

| Export                               | Copied to                                                                            |
| :----------------------------------- | :----------------------------------------------------------------------------------- |
| `raycast/icon-signal.png`            | `assets/extension-icon.png` in soaring-symbols/raycast                               |
| `figma/icon.png`                     | `store/icon.png` in soaring-symbols/figma                                            |
| `figma/thumbnail.png`                | `store/thumbnail.png` in soaring-symbols/figma                                       |
| `framer/*.png` (but `poster.png`)    | `store/` in soaring-symbols/framer, under the same names                             |
| `webflow/*.png`                      | `store/` in soaring-symbols/webflow, under the same names                            |
| `miro/*.png`                         | `store/` in soaring-symbols/miro, under the same names                               |
| `framer/poster.png`                  | Uploaded by hand as the poster of the Framer creator profile                         |
| `github/avatar-signal.png`           | Uploaded by hand as the GitHub organization avatar                                   |
| `web/*.png`                          | `public/` in soaring-symbols/website, under the same names                           |
| `marks/icon*.svg`, `marks/logo*.svg` | `public/brand/` in soaring-symbols/website, under the same names, for its Brand page |

The Figma thumbnail and the Framer, Webflow and Miro images show the plugins' UI, so update them when a plugin's look or features change, and keep their text in step with `store/LISTING.md` in the figma, framer, webflow or miro repo. The Webflow panel follows `src/index.html` there, in CSS pixels. The Miro panel follows `src/panel.html` in soaring-symbols/miro, always in its light colors. The Framer panel follows `src/styles.css` there, in CSS pixels.

## Commands

| Command          | What it does                                                         |
| :--------------- | :------------------------------------------------------------------- |
| `npm run marks`  | Write the `icon*.svg` marks and the `logo*.svg` lockups in `marks/`. |
| `npm run render` | Render every file in `exports/`.                                     |
| `npm run lint`   | ESLint, then Prettier in check mode.                                 |
| `npm run format` | Prettier.                                                            |

Dependencies are tracked in both `package-lock.json` and `bun.lock`; update both together.

## Conventions

- Prettier (4 spaces, single quotes, no semicolons, trailing commas, width 80) and ESLint, including a blank line before `return`, as in the other Soaring Symbols repos.
- Commits follow Conventional Commits, e.g. `feat: add a Raycast store screenshot`, `fix: align the hinge line`.
