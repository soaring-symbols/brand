// Renders every PNG in exports/ from the SVGs in marks/: the icons each
// integration ships and the Figma Community thumbnail.
//   npm run render
// Fonts come from Google Fonts on the first run and are cached in
// node_modules/.cache/brand: Overpass, the brand typeface, and Inter for the
// mock Figma plugin panel, as Figma draws its UI in it. The airline marks in
// the thumbnail come from the soaring-symbols package in node_modules.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { Resvg } from '@resvg/resvg-js'

const ROOT = resolve(import.meta.dirname, '..')
const CACHE = `${ROOT}/node_modules/.cache/brand`
const ASSETS = `${ROOT}/node_modules/soaring-symbols/dist/assets`
mkdirSync(CACHE, { recursive: true })

// TrueType files of a Google Fonts family, one per weight. Google serves
// TTF (which resvg needs) to a client that doesn't ask for WOFF2.
const googleFont = async (family, weights) => {
    const files = weights.map((w) => `${CACHE}/${family}-${w}.ttf`)
    if (files.every((file) => existsSync(file))) return files

    const css = await fetch(
        `https://fonts.googleapis.com/css2?family=${family}:wght@${weights.join(';')}`,
    ).then((res) => res.text())
    for (const [, weight, url] of css.matchAll(
        /font-weight: (\d+);[\s\S]*?url\((\S+?\.ttf)\)/g,
    )) {
        const font = await fetch(url).then((res) => res.arrayBuffer())
        writeFileSync(`${CACHE}/${family}-${weight}.ttf`, Buffer.from(font))
    }
    const missing = files.filter((file) => !existsSync(file))
    if (missing.length) throw new Error(`Fonts not downloaded: ${missing}`)

    return files
}

const FONTS = [
    ...(await googleFont('Overpass', [400, 700, 800])),
    ...(await googleFont('Inter', [400, 700])),
]

const render = (svg, width) =>
    new Resvg(svg, {
        fitTo: { mode: 'width', value: width },
        font: {
            fontFiles: FONTS,
            loadSystemFonts: false,
            defaultFontFamily: 'Overpass',
        },
    })
        .render()
        .asPng()

const write = (path, png) => {
    mkdirSync(dirname(`${ROOT}/exports/${path}`), { recursive: true })
    writeFileSync(`${ROOT}/exports/${path}`, png)
    console.log(`exports/${path}`)
}

const markSvg = (name) => readFileSync(`${ROOT}/marks/${name}.svg`, 'utf8')

// Icons: the square marks fill the frame, for places that crop or round the
// corners themselves (GitHub, Figma); the rounded ones carry their own
// corners and margin (Raycast)
for (const variant of ['signal', 'board']) {
    write(
        `github/avatar-${variant}.png`,
        render(markSvg(`square-${variant}`), 512),
    )
    write(
        `raycast/icon-${variant}.png`,
        render(markSvg(`rounded-${variant}`), 512),
    )
}
write('figma/icon.png', render(markSvg('square-signal'), 128))

// Web icons for the website: the square mark for iOS home screens and the
// manifest's "any" icons, and a maskable one for Android, which masks icons
// to shapes as small as a circle 80% of the icon wide. The square tiles reach
// past that circle, so the maskable mark shrinks them about the center until
// every tile, corners included, fits inside it.
const MASKABLE_SCALE = 0.85

const maskable = (svg) => {
    const tiles = [
        ...svg.matchAll(
            /<clipPath[^>]*><rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)" rx="([\d.]+)"\/>/g,
        ),
    ].map((m) => m.slice(1).map(Number))
    if (!tiles.length) throw new Error('No tiles found in the square mark')

    // The farthest point of a rounded tile from the center lies on the arc of
    // its farthest corner
    const reach = Math.max(
        ...tiles.map(([x, y, w, h, rx]) => {
            const dx = Math.max(
                Math.abs(x + rx - 256),
                Math.abs(x + w - rx - 256),
            )
            const dy = Math.max(
                Math.abs(y + rx - 256),
                Math.abs(y + h - rx - 256),
            )

            return Math.hypot(dx, dy) + rx
        }),
    )
    if (reach * MASKABLE_SCALE > 0.4 * 512) {
        throw new Error('The maskable mark leaves the 80% safe zone')
    }

    // Keep the background rect at full size and scale everything after it
    return svg
        .replace(
            /(<rect width="512" height="512"[^>]*\/>)/,
            `$1\n<g transform="translate(256 256) scale(${MASKABLE_SCALE}) translate(-256 -256)">`,
        )
        .replace('</svg>', '</g>\n</svg>')
}

const webMark = markSvg('square-signal')
write('web/apple-touch-icon.png', render(webMark, 180))
for (const width of [192, 512]) {
    write(`web/icon-${width}.png`, render(webMark, width))
    write(`web/icon-maskable-${width}.png`, render(maskable(webMark), width))
}

const mark = markSvg('square-signal')
const asset = (slug, file) =>
    readFileSync(`${ASSETS}/${slug}/${file}.svg`, 'utf8')
const uri = (svg) =>
    `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
const img = (svg, x, y, w, h = w) =>
    `<image href="${uri(svg)}" x="${x}" y="${y}" width="${w}" height="${h}"/>`
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

const DARK = '#1f242b',
    LIGHT = '#ecebe4',
    YELLOW = '#ffc20e'

// The plugin panel, drawn as it looks in Figma's light theme at about 1.8x:
// an airline's marks, a row per mark type and a column per version
const PX = 1040,
    PY = 150,
    PW = 640,
    PH = 820,
    R = 20
const PAD = 28,
    GAP = 14
const columns = ['Color', 'Mono', 'Dark background']
const colW = (PW - 2 * PAD - 2 * GAP) / 3
const colX = (i) => PX + PAD + i * (colW + GAP)
const tileH = 124
const CHECKER = `<pattern id="checker" width="20" height="20" patternUnits="userSpaceOnUse">
  <rect width="20" height="20" fill="#ffffff"/>
  <rect width="10" height="10" fill="#f0f0f0"/>
  <rect x="10" y="10" width="10" height="10" fill="#f0f0f0"/>
</pattern>`
// A tile with its version of the mark: on a checkerboard, or on dark for
// the one made for dark backgrounds
const tile = (svg, i, y, dark, markW) => {
    const x = colX(i)
    const inner = `<rect x="${x + 6}" y="${y + 6}" width="${colW - 12}" height="${tileH - 12}" rx="7" fill="${dark ? '#1e1e1e' : 'url(#checker)'}"/>`

    return `<rect x="${x}" y="${y}" width="${colW}" height="${tileH}" rx="10" fill="#ffffff" stroke="#e6e6e6" stroke-width="2"/>
${inner}${img(svg, x + (colW - markW) / 2, y + (tileH - markW) / 2, markW)}`
}
const markRows = [
    ['Logo', 'logo'],
    ['Stacked logo', 'logo-stacked'],
    ['Icon', 'icon'],
]
const rowsTop = PY + 108 + 64 + 64
const rowH = 40 + tileH + 8
const grid = markRows
    .map(([label, type], r) => {
        const y = rowsTop + r * rowH
        const markW = { logo: 150, 'logo-stacked': 116, icon: 92 }[type]

        return `<text x="${PX + PAD}" y="${y + 28}" font-size="20" font-weight="700" fill="#1e1e1e">${label}</text>
${tile(asset('vietnam-airlines', type), 0, y + 40, false, markW)}
${tile(asset('vietnam-airlines', `${type}-mono`), 1, y + 40, false, markW)}
${tile(asset('vietnam-airlines', `${type}-dark`), 2, y + 40, true, markW)}`
    })
    .join('\n')

const panel = `
<defs>${CHECKER}</defs>
<rect x="${PX}" y="${PY}" width="${PW}" height="${PH}" rx="${R}" fill="#ffffff"/>
<clipPath id="panel"><rect x="${PX}" y="${PY}" width="${PW}" height="${PH}" rx="${R}"/></clipPath>
<g clip-path="url(#panel)" font-family="Inter">
  <path d="M ${PX + 46} ${PY + 54} h 26 M ${PX + 46} ${PY + 54} l 11 -11 M ${PX + 46} ${PY + 54} l 11 11" fill="none" stroke="#1e1e1e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="${PX + 100}" y="${PY + 48}" font-size="24" font-weight="700" fill="#1e1e1e">Vietnam Airlines</text>
  <text x="${PX + 100}" y="${PY + 78}" font-size="20" fill="#757575">VN · HVN · SkyTeam</text>
  <rect x="${PX}" y="${PY + 106}" width="${PW}" height="2" fill="#e6e6e6"/>
  <text x="${PX + PAD}" y="${PY + 147}" font-size="20" fill="#1e1e1e">Size</text>
  <rect x="${PX + PAD + 56}" y="${PY + 122}" width="132" height="38" rx="7" fill="none" stroke="#e6e6e6" stroke-width="2"/>
  <text x="${PX + PAD + 70}" y="${PY + 147}" font-size="20" fill="#1e1e1e">64 × 64</text>
  <path d="M ${PX + PAD + 162} ${PY + 137} l 7 7 l 7 -7" fill="none" stroke="#1e1e1e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="${PX}" y="${PY + 172}" width="${PW}" height="2" fill="#e6e6e6"/>
  ${columns
      .map(
          (title, i) =>
              `<text x="${colX(i)}" y="${PY + 211}" font-size="20" font-weight="700" fill="#757575">${title}</text>`,
      )
      .join('\n  ')}
  <rect x="${colX(1) + 62}" y="${PY + 191}" width="28" height="28" rx="6" fill="#ffffff" stroke="#e6e6e6" stroke-width="2"/>
  <rect x="${colX(1) + 67}" y="${PY + 196}" width="18" height="18" rx="3" fill="#000000"/>
  <circle cx="${colX(1) + 110}" cy="${PY + 205}" r="14" fill="#d99e09" stroke="#e6e6e6" stroke-width="2"/>
  <rect x="${PX}" y="${PY + 234}" width="${PW}" height="2" fill="#e6e6e6"/>
  ${grid}
  <rect x="${PX}" y="${PY + PH - 64}" width="${PW}" height="64" fill="#ffffff"/>
  <rect x="${PX}" y="${PY + PH - 64}" width="${PW}" height="2" fill="#e6e6e6"/>
  <text x="${PX + 28}" y="${PY + PH - 25}" font-size="19" fill="#757575">Click a mark to insert it, or drag it onto the canvas.</text>
</g>`

// A tile being dragged out of the panel, with the pointer on it
const TX = 760,
    TY = 640,
    TS = 220
const drag = `
<g transform="rotate(-6 ${TX + TS / 2} ${TY + TS / 2})">
  <rect x="${TX}" y="${TY}" width="${TS}" height="${TS}" rx="18" fill="#ffffff" stroke="#0d99ff" stroke-width="4"/>
  ${img(asset('vietnam-airlines', 'icon'), TX + 30, TY + 30, TS - 60)}
</g>
<path d="M ${TX + 170} ${TY + 160} l 0 66 l 16 -15 l 12 28 l 12 -5 l -12 -27 l 22 -1 Z" fill="#1e1e1e" stroke="#ffffff" stroke-width="4" stroke-linejoin="round"/>`

// Marks already placed on the "canvas" behind the text
const placed = [
    ['qatar-airways', 'logo', 120, 760, 180],
    ['turkish-airlines', 'logo-dark', 340, 760, 180],
    ['japan-airlines', 'logo-stacked', 560, 760, 180],
]
    .map(
        ([
            slug,
            file,
            x,
            y,
            s,
        ]) => `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="16" fill="#2b3139"/>
<rect x="${x + 12}" y="${y + 12}" width="${s - 24}" height="${s - 24}" rx="10" fill="${file.endsWith('-dark') ? '#1e1e1e' : '#ffffff'}"/>${img(asset(slug, file), x + 18, y + 18, s - 36)}`,
    )
    .join('\n')

// Text is set by its baseline: a line beside a mark or in a bar goes half its
// cap height (0.7em in Overpass, 0.727em in Inter) below the middle
const brandMark = mark.replace(
    '<svg ',
    '<svg width="56" height="56" x="120" y="110" ',
)

const thumb = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080" font-family="Overpass">
<rect width="1920" height="1080" fill="${DARK}"/>
<g>${brandMark}</g>
<text x="196" y="150.6" font-size="36" font-weight="700" fill="${LIGHT}">Soaring Symbols</text>
<text font-size="92" font-weight="800" fill="${LIGHT}">
  <tspan x="120" y="370">Airline logos,</tspan>
  <tspan x="120" y="476">right in Figma.</tspan>
</text>
<text font-size="34" fill="${LIGHT}" fill-opacity="0.72">
  <tspan x="120" y="572">Search by name or code, then drag a logo, icon</tspan>
  <tspan x="120" y="620">or tail in color, mono or for dark backgrounds.</tspan>
</text>
<rect x="120" y="680" width="160" height="12" rx="6" fill="${YELLOW}"/>
${placed}
${panel}
${drag}
</svg>`

write('figma/thumbnail.png', render(thumb, 1920))
