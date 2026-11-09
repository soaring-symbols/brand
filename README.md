# Soaring Symbols brand

The Soaring Symbols project's own brand mark, and the icons and store images rendered from it. This is the project's identity, not airline branding: the airline logos live in [soaring-symbols/soaring-symbols](https://github.com/soaring-symbols/soaring-symbols).

## The mark

Two split-flap tiles reading "SS", like a departure board, in two colorways:

- **Signal**: the tiles on wayfinding yellow. The main mark.
- **Board**: the tiles on departure-board dark.

| Color       | Hex       | Use                        |
| :---------- | :-------- | :------------------------- |
| Signal      | `#ffc20e` | Background, the one accent |
| Board       | `#1f242b` | Dark background            |
| Flap top    | `#2b3139` | Upper half of a tile       |
| Flap bottom | `#262b32` | Lower half of a tile       |
| Hinge       | `#13161a` | The line across a tile     |
| Paper       | `#ecebe4` | Letters and text on dark   |

The typeface is [Overpass](https://fonts.google.com/specimen/Overpass), which descends from Highway Gothic, the lettering of road and airport signs.

## Files

`marks/` holds the sources, 512×512 SVGs:

- `square-signal.svg`, `square-board.svg`: fill the frame, for places that crop or round the corners themselves.
- `rounded-signal.svg`, `rounded-board.svg`: an app icon with its own rounded corners and margin.

`exports/` holds what is rendered from them, committed so each integration can copy its file:

| File                       | Size      | Used by                                                                 |
| :------------------------- | :-------- | :---------------------------------------------------------------------- |
| `github/avatar-signal.png` | 512×512   | The GitHub organization avatar (`avatar-board.png` is the dark option)  |
| `raycast/icon-signal.png`  | 512×512   | [Raycast extension](https://github.com/soaring-symbols/raycast) icon    |
| `figma/icon.png`           | 128×128   | [Figma plugin](https://github.com/soaring-symbols/figma) Community icon |
| `figma/thumbnail.png`      | 1920×1080 | Figma plugin Community thumbnail                                        |

The website's favicon and social cards are drawn in the [website repo](https://github.com/soaring-symbols/website) itself.

## Rendering

```bash
npm install
npm run render
```

`scripts/render.js` renders every file in `exports/` with resvg. Fonts are downloaded from Google Fonts on the first run and cached in `node_modules/.cache/brand`. The airline marks in the Figma thumbnail come from the `soaring-symbols` package.
