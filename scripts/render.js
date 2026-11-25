// Renders every PNG in exports/ from the SVGs in marks/: the icons each
// integration ships and the Figma Community thumbnail.
//   npm run render
// Fonts come from Google Fonts on the first run and are cached in
// node_modules/.cache/brand: Overpass, the brand typeface, and Inter for the
// mock Figma plugin panel, as Figma draws its UI in it. The airline marks in
// the thumbnail come from the soaring-symbols package in node_modules.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { Resvg } from '@resvg/resvg-js'
import { ROOT, googleFont } from './fonts.js'

const AIRLINES = `${ROOT}/node_modules/soaring-symbols/dist/airlines`

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
    readFileSync(`${AIRLINES}/${slug}/${file}.svg`, 'utf8')
const uri = (svg) =>
    `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
const img = (svg, x, y, w, h = w) =>
    `<image href="${uri(svg)}" x="${x}" y="${y}" width="${w}" height="${h}"/>`

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

// The Framer Marketplace images: the plugin's panel drawn as Framer shows
// it, in CSS pixels (a 360 × 560 iframe under Framer's window title bar)
// and scaled up, in Framer's light and dark themes. Framer asks for images
// that show the plugin itself with little text, so the screenshots are the
// panel alone and the thumbnail adds only the name and a headline.
const FRAMER_THEMES = {
    light: {
        window: '#ffffff',
        bg: '#ffffff',
        tertiary: '#f3f3f3',
        divider: '#eeeeee',
        text: '#000000',
        secondary: '#666666',
        tertiaryText: '#999999',
        shadow: 0.18,
    },
    dark: {
        window: '#111111',
        bg: '#111111',
        tertiary: '#2b2b2b',
        divider: '#2b2b2b',
        text: '#ffffff',
        secondary: '#bbbbbb',
        tertiaryText: '#888888',
        shadow: 0.5,
    },
}
const FW = 360,
    FBAR = 40,
    FH = 560 + FBAR

// Framer's plugin window: the plugin's icon and name, and a close button
const framerWindow = (t, body) => `
<defs>
  <filter id="window-shadow" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="#000000" flood-opacity="${t.shadow}"/>
  </filter>
  <clipPath id="window"><rect width="${FW}" height="${FH}" rx="14"/></clipPath>
</defs>
<rect width="${FW}" height="${FH}" rx="14" fill="${t.window}" filter="url(#window-shadow)"/>
<g clip-path="url(#window)" font-family="Inter">
  <svg x="14" y="12" width="16" height="16" viewBox="0 0 512 512">${mark.replace(/<\/?svg[^>]*>/g, '')}</svg>
  <text x="38" y="24.4" font-size="12" font-weight="700" fill="${t.text}">Soaring Symbols</text>
  <path d="M ${FW - 26} 15 l 10 10 M ${FW - 16} 15 l -10 10" stroke="${t.tertiaryText}" stroke-width="1.5" stroke-linecap="round"/>
  <g transform="translate(0 ${FBAR})">${body}</g>
</g>`

// The previews' checkerboard, light in both themes as in the plugin
const checker = (
    id,
) => `<pattern id="${id}" width="12" height="12" patternUnits="userSpaceOnUse">
  <rect width="12" height="12" fill="#ffffff"/>
  <path d="M0 0h6v6H0zM6 6h6v6H6z" fill="#f0f0f0"/>
</pattern>`

// The detail view of an airline: a row per mark type and a column per
// version, as src/main.ts and src/styles.css lay them out
const framerDetail = (t, slug, title, meta, mono) => {
    const colW = (FW - 24 - 16) / 3
    const colX = (i) => 12 + i * (colW + 8)
    const checkerId = `checker-${t.bg.slice(1)}`
    // The marks a little larger than the plugin's 56px, so they read at
    // Marketplace sizes; a logo's square box is mostly empty above and below
    const markSize = { logo: 90, 'logo-stacked': 66, icon: 52 }
    const tileCell = (file, i, y, dark, size, tint) => {
        let svg = asset(slug, file)
        if (tint) svg = svg.replaceAll(/currentColor/gi, tint)
        const x = colX(i)

        return `<rect x="${x + 0.5}" y="${y + 0.5}" width="${colW - 1}" height="81" rx="8" fill="none" stroke="${t.divider}"/>
<rect x="${x + 5}" y="${y + 5}" width="${colW - 10}" height="72" rx="5" fill="${dark ? '#1e1e1e' : '#ffffff'}"/>
${dark ? '' : `<rect x="${x + 5}" y="${y + 5}" width="${colW - 10}" height="72" rx="5" fill="url(#${checkerId})"/>`}
${img(svg, x + (colW - size) / 2, y + 41 - size / 2, size)}`
    }
    const rows = [
        ['Logo', 'logo'],
        ['Stacked logo', 'logo-stacked'],
        ['Icon', 'icon'],
    ]
        .map(([label, type], r) => {
            const y = 129 + r * 110
            const size = markSize[type]

            return `<text x="12" y="${y + 20}" font-size="12" font-weight="600" fill="${t.text}">${label}</text>
${tileCell(type, 0, y + 28, false, size)}
${tileCell(`${type}-mono`, 1, y + 28, false, size, mono)}
${tileCell(`${type}-dark`, 2, y + 28, true, size)}`
        })
        .join('\n')

    return `<defs>${checker(checkerId)}</defs>
<rect width="${FW}" height="560" fill="${t.bg}"/>
<rect y="0" width="${FW}" height="1" fill="${t.divider}"/>
<path d="M 18 25 h 14 M 18 25 l 6 -6 M 18 25 l 6 6" fill="none" stroke="${t.text}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<text x="46" y="21" font-size="13" font-weight="700" fill="${t.text}">${title}</text>
<text x="46" y="37" font-size="12" fill="${t.tertiaryText}">${meta}</text>
<rect y="50" width="${FW}" height="1" fill="${t.divider}"/>
<text x="12" y="76.4" font-size="12" font-weight="600" fill="${t.text}">Size</text>
<rect x="45" y="59" width="78" height="26" rx="6" fill="${t.tertiary}"/>
<text x="53" y="76.4" font-size="12" font-weight="600" fill="${t.text}">64 × 64</text>
<path d="M 108 70 l 4 4 l 4 -4" fill="none" stroke="${t.text}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
<rect y="93" width="${FW}" height="1" fill="${t.divider}"/>
<text x="${colX(0)}" y="115.4" font-size="12" font-weight="600" fill="${t.tertiaryText}">Color</text>
<text x="${colX(1)}" y="115.4" font-size="12" font-weight="600" fill="${t.tertiaryText}">Mono</text>
<rect x="${colX(1) + 35.5}" y="102.5" width="17" height="17" rx="4" fill="${t.bg}" stroke="${t.divider}"/>
<rect x="${colX(1) + 38}" y="105" width="12" height="12" rx="2" fill="${mono}"/>
<circle cx="${colX(1) + 65}" cy="111" r="8.5" fill="#d99e09" stroke="${t.divider}"/>
<text x="${colX(2)}" y="115.4" font-size="12" font-weight="600" fill="${t.tertiaryText}">Dark background</text>
<rect y="128" width="${FW}" height="1" fill="${t.divider}"/>
${rows}
<rect y="515" width="${FW}" height="1" fill="${t.divider}"/>
<text font-size="12" fill="${t.tertiaryText}">
  <tspan x="12" y="533.4">Click a mark to insert it (it replaces a selected SVG), or</tspan>
  <tspan x="12" y="549.4">drag it onto the canvas. <tspan text-decoration="underline">soaringsymbols.org</tspan></tspan>
</text>`
}

// The list view: the search field, then the alliances with marks and the
// airlines, in the order the plugin lists them for an empty search
const framerList = async (t) => {
    const { listAirlines, listAlliances } = await import('soaring-symbols')
    const hasMarks = (owner) => Object.values(owner.assets).some(Boolean)
    const thumb = (root, owner) => {
        const type = ['icon', 'logo', 'tail'].find((k) => owner.assets[k])
        const info = owner.assets[type]

        return readFileSync(
            `${ROOT}/node_modules/soaring-symbols/dist/${root}/${owner.slug}/${info.color ? type : `${type}-mono`}.svg`,
            'utf8',
        )
    }
    const alliances = listAlliances().filter(hasMarks)
    const airlines = listAirlines().filter((a) => !a.defunct)
    let y = 47
    const parts = []
    const heading = (label) => {
        parts.push(
            `<text x="12" y="${y + 24}" font-size="12" font-weight="600" fill="${t.secondary}">${label}</text>`,
        )
        y += 28
    }
    const row = (svg, name, meta) => {
        parts.push(`${img(svg, 12, y + 6, 28)}
<text x="50" y="${y + 18}" font-size="12" font-weight="700" fill="${t.text}">${name}</text>
<text x="50" y="${y + 34}" font-size="12" fill="${t.tertiaryText}">${meta}</text>`)
        y += 44
    }
    heading('Alliances')
    for (const alliance of alliances) {
        row(
            thumb('alliances', alliance),
            alliance.name,
            `Airline alliance · ${alliance.founded}`,
        )
    }
    heading('Airlines')
    for (const airline of airlines) {
        if (y > 500) break
        row(
            thumb('airlines', airline),
            airline.name,
            [airline.iata, airline.icao, airline.country].join(' · '),
        )
    }

    return `<rect width="${FW}" height="560" fill="${t.bg}"/>
<rect y="0" width="${FW}" height="1" fill="${t.divider}"/>
<rect x="8" y="8" width="${FW - 16}" height="30" rx="8" fill="${t.tertiary}"/>
<text x="16" y="27.4" font-size="12" fill="${t.tertiaryText}">Search airlines or alliances by name or code</text>
<rect y="46" width="${FW}" height="1" fill="${t.divider}"/>
<clipPath id="list"><rect y="47" width="${FW}" height="468"/></clipPath>
<g clip-path="url(#list)">${parts.join('\n')}</g>
<rect y="515" width="${FW}" height="45" fill="${t.bg}"/>
<rect y="515" width="${FW}" height="1" fill="${t.divider}"/>
<text font-size="12" fill="${t.tertiaryText}">
  <tspan x="12" y="533.4">Click a mark to insert it (it replaces a selected SVG), or</tspan>
  <tspan x="12" y="549.4">drag it onto the canvas. <tspan text-decoration="underline">soaringsymbols.org</tspan></tspan>
</text>`
}

const VN = ['vietnam-airlines', 'Vietnam Airlines', 'VN · HVN · SkyTeam']

// A screenshot: the plugin window alone, 1.8x, on the brand's dark board or
// on paper for the dark theme, so the window stands off its background
const screenshot = (t, body, background) => {
    const scale = 1.8
    const x = (1600 - FW * scale) / 2,
        y = (1200 - FH * scale) / 2

    return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200" viewBox="0 0 1600 1200">
<rect width="1600" height="1200" fill="${background}"/>
<g transform="translate(${x} ${y}) scale(${scale})">${framerWindow(t, body)}</g>
</svg>`
}

const { light, dark } = FRAMER_THEMES
write('framer/icon.png', render(markSvg('square-signal'), 128))
write(
    'framer/screenshot-marks-light.png',
    render(
        screenshot(light, framerDetail(light, ...VN, '#000000'), DARK),
        1600,
    ),
)
write(
    'framer/screenshot-marks-dark.png',
    render(screenshot(dark, framerDetail(dark, ...VN, '#d99e09'), LIGHT), 1600),
)
write(
    'framer/screenshot-search-light.png',
    render(screenshot(light, await framerList(light), DARK), 1600),
)

// The thumbnail: the name and a headline beside the plugin window, and a
// tile being dragged out of it onto marks already placed on the canvas
const framerThumb = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080" font-family="Overpass">
<rect width="1920" height="1080" fill="${DARK}"/>
<g>${brandMark}</g>
<text x="196" y="150.6" font-size="36" font-weight="700" fill="${LIGHT}">Soaring Symbols</text>
<text font-size="92" font-weight="800" fill="${LIGHT}">
  <tspan x="120" y="370">Airline logos,</tspan>
  <tspan x="120" y="476">right in Framer.</tspan>
</text>
<rect x="120" y="560" width="160" height="12" rx="6" fill="${YELLOW}"/>
${placed}
<g transform="translate(1100 ${(1080 - FH * 1.6) / 2}) scale(1.6)">${framerWindow(light, framerDetail(light, ...VN, '#000000'))}</g>
${drag.replaceAll('#0d99ff', '#0099ff')}
</svg>`

write('framer/thumbnail.png', render(framerThumb, 1920))
