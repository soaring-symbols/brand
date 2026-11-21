// Writes the icons and the lockups in marks/ from square-signal.svg:
//   npm run marks
// Each copies the tiles of square-signal.svg as they are, at the same
// coordinates, and crops with its viewBox, so a change to the tiles goes
// there first and reaches these files on the next run. The name is Overpass
// ExtraBold outlined, from Google Fonts (see fonts.js), so the files need no
// font. Change the sizes and spacing below, then run it again.
import { readFileSync, writeFileSync } from 'node:fs'
import { create } from 'fontkitten'
import { ROOT, googleFont } from './fonts.js'

const MARKS = `${ROOT}/marks`
const NAME = 'Soaring Symbols'

const BOARD = '#1f242b'
const PAPER = '#ecebe4'
const MONO = '#000000'

// The tiles in square-*.svg
const TILES = { x0: 65, x1: 447, y0: 127, y1: 385, w: 184, h: 258, r: 18 }

// On dark, the flaps a step lighter so they stand off the background, as the
// website's in dark mode: #38404b, and 12% darker below. The letters and the
// hinge stay as they are; signal yellow is kept for the app icons'
// background (square-signal.svg, rounded-signal.svg)
const DARK = {
    '#2b3139': '#38404b', // flap top
    '#262b32': '#313842', // flap bottom
}

// The name: caps 150 high beside the tiles, centred on them and 110 after
// them; 120 high under them, 100 below and centred
const WIDE = { cap: 150, gap: 110 }
const STACKED = { cap: 120, gap: 100 }
// Overpass's cap height, in units of 2000 to the em, and tracking-tight as
// in the website's header
const CAP_HEIGHT = 1400
const TRACKING = -0.025

const [overpass] = await googleFont('Overpass', [800])
const font = create(readFileSync(overpass))

const source = readFileSync(`${MARKS}/square-signal.svg`, 'utf8').split('\n')
const tiles = source
    .slice(
        source.findIndex((line) => line.includes('<clipPath')),
        source.findIndex((line) => line.startsWith('</svg>')),
    )
    .join('\n')
const letters = [...tiles.matchAll(/<path d="([^"]+)"/g)].map((m) => m[1])

const fixed = (n) => n.toFixed(2)
const trim = (n) => String(Math.round(n * 100) / 100)

// The box each file's viewBox crops to, grown by every point drawn
let box
const startBox = (x0, y0, x1, y1) => (box = { x0, y0, x1, y1 })
const grow = (x, y) => {
    box.x0 = Math.min(box.x0, x)
    box.y0 = Math.min(box.y0, y)
    box.x1 = Math.max(box.x1, x)
    box.y1 = Math.max(box.y1, y)
}

const COMMANDS = {
    moveTo: 'M',
    lineTo: 'L',
    quadraticCurveTo: 'Q',
    bezierCurveTo: 'C',
    closePath: 'Z',
}

// The name as one path, caps capHeight high on the baseline, from x or,
// centred, around it
const outline = (capHeight, x, baseline, centred = false) => {
    const glyphs = font.glyphsForString(NAME)
    const scale = capHeight / CAP_HEIGHT
    const track = TRACKING * font.unitsPerEm
    const width =
        glyphs.reduce((w, g) => w + (g.advanceWidth + track) * scale, 0) -
        track * scale
    let pen = centred ? x - width / 2 : x
    let d = ''
    for (const glyph of glyphs) {
        for (const { command, args } of glyph.path.commands) {
            const points = []
            for (let i = 0; i < args.length; i += 2) {
                const px = pen + args[i] * scale
                const py = baseline - args[i + 1] * scale
                grow(px, py)
                points.push(`${fixed(px)} ${fixed(py)}`)
            }
            d += COMMANDS[command] + points.join(' ')
        }
        pen += (glyph.advanceWidth + track) * scale
    }

    return d
}

const roundedRect = (x, y, w, h, r) =>
    `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`

// The simple mark: the tiles alone in one color with their letters cut out
// and no hinge, so it holds at 16px
const monoTiles = [TILES.x0, TILES.x1 - TILES.w]
    .map(
        (x, i) =>
            roundedRect(x, TILES.y0, TILES.w, TILES.h, TILES.r) + letters[i],
    )
    .join('')

const darkTiles = tiles.replace(
    /fill="(#[0-9a-f]{6})"/g,
    (_, hex) => `fill="${DARK[hex] ?? hex}"`,
)
const name = (d, fill) => `  <path d="${d}" fill="${fill}"/>`
const mono = (d) => `  <path d="${d}" fill="${MONO}" fill-rule="evenodd"/>`

const write = (file, ...lines) => {
    const viewBox = [box.x0, box.y0, box.x1 - box.x0, box.y1 - box.y0]
        .map(trim)
        .join(' ')
    writeFileSync(
        `${MARKS}/${file}`,
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img">
  <title>Soaring Symbols</title>
${lines.join('\n')}
</svg>
`,
    )
    console.log(`marks/${file}`)
}

const onTiles = () => startBox(TILES.x0, TILES.y0, TILES.x1, TILES.y1)
const middle = (TILES.y0 + TILES.y1) / 2
const centre = (TILES.x0 + TILES.x1) / 2
const wideBaseline = middle + WIDE.cap / 2

// The icon: the tiles alone, as in the website's header, and recolored for
// dark backgrounds
onTiles()
write('icon.svg', tiles)
onTiles()
write('icon-dark.svg', darkTiles)
onTiles()
write('icon-mono.svg', mono(monoTiles))

// Horizontal: the name beside the tiles, in board on light and paper on dark
onTiles()
write(
    'logo.svg',
    tiles,
    name(outline(WIDE.cap, TILES.x1 + WIDE.gap, wideBaseline), BOARD),
)
onTiles()
write(
    'logo-dark.svg',
    darkTiles,
    name(outline(WIDE.cap, TILES.x1 + WIDE.gap, wideBaseline), PAPER),
)
onTiles()
write(
    'logo-mono.svg',
    mono(monoTiles + outline(WIDE.cap, TILES.x1 + WIDE.gap, wideBaseline)),
)

// Stacked: the name on one line under the mark
const under = (bottom) => bottom + STACKED.gap + STACKED.cap
onTiles()
write(
    'logo-stacked.svg',
    tiles,
    name(outline(STACKED.cap, centre, under(TILES.y1), true), BOARD),
)
onTiles()
write(
    'logo-stacked-dark.svg',
    darkTiles,
    name(outline(STACKED.cap, centre, under(TILES.y1), true), PAPER),
)
onTiles()
write(
    'logo-stacked-mono.svg',
    mono(monoTiles + outline(STACKED.cap, centre, under(TILES.y1), true)),
)
