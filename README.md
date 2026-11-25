# Soaring Symbols brand

The Soaring Symbols project's own brand mark, and the icons and store images rendered from it. This is the project's identity, not airline branding: the airline logos live in [soaring-symbols/soaring-symbols](https://github.com/soaring-symbols/soaring-symbols).

## The mark

Two split-flap tiles reading "SS", like a departure board, in two colorways:

- **Signal**: the tiles on wayfinding yellow, for app icons and avatars. The only place the yellow goes behind the mark.
- **Board**: the tiles on departure-board dark, their flaps a step lighter so they stand off it, as in the dark marks.

| Color            | Hex       | Use                                       |
| :--------------- | :-------- | :---------------------------------------- |
| Signal           | `#ffc20e` | The one accent: the app icons' background |
| Board            | `#1f242b` | Dark background                           |
| Flap top         | `#2b3139` | Upper half of a tile                      |
| Flap bottom      | `#262b32` | Lower half of a tile                      |
| Dark flap top    | `#38404b` | Upper half of a tile on dark              |
| Dark flap bottom | `#313842` | Lower half of a tile on dark              |
| Hinge            | `#13161a` | The line across a tile                    |
| Paper            | `#ecebe4` | Letters and text on dark                  |

The typeface is [Overpass](https://fonts.google.com/specimen/Overpass), which descends from Highway Gothic, the lettering of road and airport signs.

## Files

`marks/` holds the sources. The icons are 512×512 SVGs:

- `square-signal.svg`, `square-board.svg`: fill the frame, for places that crop or round the corners themselves.
- `rounded-signal.svg`, `rounded-board.svg`: an app icon with its own rounded corners and margin.
- `icon.svg`, `icon-dark.svg`: the tiles alone, on light backgrounds as in the website's header, and on dark with the flaps a step lighter, so they stand off the background.
- `icon-mono.svg`: the simple mark, the tiles alone in one color with the letters cut out and no hinge, so it holds at 16px.

The lockups pair the mark with the name in Overpass ExtraBold, outlined, cropped to their content:

- `logo.svg`, `logo-stacked.svg`: the name beside the tiles, or under them, on light backgrounds, as in the website's header.
- `logo-dark.svg`, `logo-stacked-dark.svg`: the dark tiles of `icon-dark.svg` and the name in paper, on dark backgrounds.
- `logo-mono.svg`, `logo-stacked-mono.svg`: the simple mark and the name in black, for one-color use.

`exports/` holds what is rendered from them, committed so each integration can copy its file:

| File                              | Size      | Used by                                                                                              |
| :-------------------------------- | :-------- | :--------------------------------------------------------------------------------------------------- |
| `github/avatar-signal.png`        | 512×512   | The GitHub organization avatar (`avatar-board.png` is the dark option)                               |
| `raycast/icon-signal.png`         | 512×512   | [Raycast extension](https://github.com/soaring-symbols/raycast) icon                                 |
| `figma/icon.png`                  | 128×128   | [Figma plugin](https://github.com/soaring-symbols/figma) Community icon                              |
| `figma/thumbnail.png`             | 1920×1080 | Figma plugin Community thumbnail                                                                     |
| `framer/icon.png`                 | 128×128   | [Framer plugin](https://github.com/soaring-symbols/framer) Marketplace icon                          |
| `framer/thumbnail.png`            | 1600×1200 | Framer plugin Marketplace thumbnail                                                                  |
| `framer/screenshot-*.png`         | 1600×1200 | Framer plugin Marketplace screenshots: an airline's marks in the light and dark themes, and the list |
| `framer/poster.png`               | 2400×400  | The Framer creator profile's poster, uploaded by hand                                                |
| `web/apple-touch-icon.png`        | 180×180   | The [website](https://github.com/soaring-symbols/website)'s home screen icon on iPhone and iPad      |
| `web/icon-{192,512}.png`          | 192, 512  | The website's web app manifest icons, `purpose: "any"`                                               |
| `web/icon-maskable-{192,512}.png` | 192, 512  | The same, `purpose: "maskable"`: the tiles shrunk to fit Android's 80% safe zone                     |

The website's favicon and social cards are drawn in the [website repo](https://github.com/soaring-symbols/website) itself; its home screen and manifest icons come from `web/`.

## Rendering

The `icon*.svg` marks and the lockups are written by `scripts/marks.js` from the tiles of `square-signal.svg`, with the name outlined from Overpass ExtraBold. After changing the tiles or the script's sizes and spacing:

```bash
npm install
npm run marks
```

Then render the PNGs:

```bash
npm run render
```

`scripts/render.js` renders every file in `exports/` with resvg. Fonts are downloaded from Google Fonts on the first run and cached in `node_modules/.cache/brand`. The airline marks in the Figma and Framer images come from the `soaring-symbols` package.

## License

The Soaring Symbols name and mark, and every file in `marks/` and `exports/`, are © 2026 Anh Thang, all rights reserved. They are not licensed for reuse: you may show them unchanged only to refer or link to the Soaring Symbols project and its integrations. The airline marks in the Figma and Framer images belong to their owners (see the package's [Disclaimer](https://github.com/soaring-symbols/soaring-symbols/blob/main/DISCLAIMER.md)), and Overpass is licensed under the SIL Open Font License 1.1.
