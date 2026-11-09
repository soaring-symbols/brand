# AGENTS.md

Instructions for AI coding agents working in this repository. Human-facing docs live in `README.md`.

## Project

The Soaring Symbols project's own brand mark (not airline logos, which live in [soaring-symbols/soaring-symbols](https://github.com/soaring-symbols/soaring-symbols)), and the images rendered from it for each integration.

- `marks/` — the source SVGs: `square-*` fill the frame, `rounded-*` are app icons with their own corners and margin; `signal` is on yellow, `board` on dark. They share the tile geometry, so a change to the tiles goes into all four.
- `scripts/render.js` — renders `exports/` with `@resvg/resvg-js`: the icons from the marks, and the Figma Community thumbnail, drawn in the script itself with airline SVGs from the `soaring-symbols` package and fonts (Overpass, plus Inter for the mock plugin panel) fetched from Google Fonts into `node_modules/.cache/brand`.
- `exports/` — the rendered PNGs, committed. Never edit them by hand; run `npm run render`.

## Who uses what

The integrations keep a copy of their file; after changing a mark or the thumbnail, render, then copy the new file into each repo that uses it:

| Export                     | Copied to                                              |
| :------------------------- | :----------------------------------------------------- |
| `raycast/icon-signal.png`  | `assets/extension-icon.png` in soaring-symbols/raycast |
| `figma/icon.png`           | `store/icon.png` in soaring-symbols/figma              |
| `figma/thumbnail.png`      | `store/thumbnail.png` in soaring-symbols/figma         |
| `github/avatar-signal.png` | Uploaded by hand as the GitHub organization avatar     |

The thumbnail shows the plugin's UI, so update it when the plugin's look or features change, and keep its text in step with `store/LISTING.md` in the figma repo.

## Commands

| Command          | What it does                         |
| :--------------- | :----------------------------------- |
| `npm run render` | Render every file in `exports/`.     |
| `npm run lint`   | ESLint, then Prettier in check mode. |
| `npm run format` | Prettier.                            |

Dependencies are tracked in both `package-lock.json` and `bun.lock`; update both together.

## Conventions

- Prettier (4 spaces, single quotes, no semicolons, trailing commas, width 80) and ESLint, including a blank line before `return`, as in the other Soaring Symbols repos.
- Commits follow Conventional Commits, e.g. `feat: add a Raycast store screenshot`, `fix: align the hinge line`.
