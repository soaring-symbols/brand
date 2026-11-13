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

// The plugin panel, drawn as it looks in Figma's light theme, at 1.6x
const PX = 1040,
    PY = 150,
    PW = 640,
    PH = 820,
    R = 20
const rows = [
    ['Vietnam Airlines', 'VN · HVN · VN', 'vietnam-airlines'],
    ['Singapore Airlines', 'SQ · SIA · SG', 'singapore-airlines'],
    ['Qatar Airways', 'QR · QTR · QA', 'qatar-airways'],
    ['Turkish Airlines', 'TK · THY · TR', 'turkish-airlines'],
    ['Japan Airlines', 'JL · JAL · JP', 'japan-airlines'],
    ['Air Canada', 'AC · ACA · CA', 'air-canada'],
    ['Lufthansa', 'LH · DLH · DE', 'lufthansa'],
]
const rowH = 84
const list = rows
    .map(([name, codes, slug], i) => {
        const y = PY + 112 + i * rowH
        const hover =
            i === 0
                ? `<rect x="${PX}" y="${y}" width="${PW}" height="${rowH}" fill="#f5f5f5"/>`
                : ''

        return `${hover}${img(asset(slug, 'icon'), PX + 28, y + 18, 48)}
<text x="${PX + 100}" y="${y + 38}" font-size="24" font-weight="700" fill="#1e1e1e">${esc(name)}</text>
<text x="${PX + 100}" y="${y + 66}" font-size="20" fill="#757575">${esc(codes)}</text>`
    })
    .join('\n')

const panel = `
<rect x="${PX}" y="${PY}" width="${PW}" height="${PH}" rx="${R}" fill="#ffffff"/>
<clipPath id="panel"><rect x="${PX}" y="${PY}" width="${PW}" height="${PH}" rx="${R}"/></clipPath>
<g clip-path="url(#panel)" font-family="Inter">
  <rect x="${PX + 20}" y="${PY + 22}" width="${PW - 40}" height="64" rx="10" fill="none" stroke="#0d99ff" stroke-width="2.5"/>
  <rect x="${PX + 42}" y="${PY + 40}" width="2.5" height="30" fill="#1e1e1e"/>
  <text x="${PX + 52}" y="${PY + 63}" font-size="24" fill="#999999">Search by name, IATA or ICAO code</text>
  <rect x="${PX}" y="${PY + 108}" width="${PW}" height="2" fill="#e6e6e6"/>
  ${list}
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
    ['turkish-airlines', 'logo', 340, 760, 180],
    ['japan-airlines', 'logo', 560, 760, 180],
]
    .map(
        ([
            slug,
            file,
            x,
            y,
            s,
        ]) => `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="16" fill="#2b3139"/>
<rect x="${x + 12}" y="${y + 12}" width="${s - 24}" height="${s - 24}" rx="10" fill="#ffffff"/>${img(asset(slug, file), x + 18, y + 18, s - 36)}`,
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
  <tspan x="120" y="572">Search by name, IATA or ICAO code, then click</tspan>
  <tspan x="120" y="620">or drag a logo, icon or tail onto the canvas.</tspan>
</text>
<rect x="120" y="680" width="160" height="12" rx="6" fill="${YELLOW}"/>
${placed}
${panel}
${drag}
</svg>`

write('figma/thumbnail.png', render(thumb, 1920))
