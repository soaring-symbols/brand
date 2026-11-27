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
// corners themselves (GitHub, Figma, Webflow); the rounded ones carry their own
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
// The app icon in the Webflow app's settings, which asks for 256×256
write('webflow/icon.png', render(markSvg('square-signal'), 256))

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

// The Framer Marketplace images: the plugin's panel drawn as Framer shows
// it, in CSS pixels (a 360 × 560 iframe under Framer's window title bar)
// and scaled up, in Framer's light and dark themes. Framer asks for images
// that show the plugin itself with little text, so the screenshots are the
// panel alone and the thumbnail adds only the name and a headline.
const FRAMER_THEMES = {
    light: {
        bg: '#ffffff',
        tertiary: '#f3f3f3',
        divider: '#eeeeee',
        text: '#000000',
        secondary: '#666666',
        tertiaryText: '#999999',
        shadow: 0.18,
    },
    dark: {
        dark: true,
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
<rect width="${FW}" height="${FH}" rx="14" fill="${t.bg}" filter="url(#window-shadow)"/>
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
  <path d="M0 0h6v6H0zM6 6h6v6H6z" fill="#f5f5f5"/>
</pattern>`

// A line icon from the plugin, drawn from its 16 × 16 path data; `filled`
// parts are painted instead of stroked, as `.filled` in src/styles.css
const panelIcon = (paths, x, y, size, color) =>
    `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 16 16" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${paths.replaceAll('class="filled"', `fill="${color}" stroke="none"`)}</svg>`

const PANEL_ICONS = {
    search: '<circle cx="7" cy="7" r="4.5"/><path d="m10.5 10.5 3 3"/>',
    back: '<path d="M10 3.5 5.5 8l4.5 4.5"/>',
    chevron: '<path d="m5 6.5 3 3 3-3"/>',
    color: '<path d="M8 1.75a6.25 6.25 0 0 0 0 12.5c.9 0 1.25-.6 1.25-1.2 0-.9-.75-1.1-.75-1.8 0-.6.5-1 1.1-1h1.4a3.25 3.25 0 0 0 3.25-3.25c0-2.9-2.8-5.25-6.25-5.25Z"/><circle cx="4.75" cy="7.5" r=".9" class="filled"/><circle cx="6.75" cy="4.75" r=".9" class="filled"/><circle cx="10" cy="4.75" r=".9" class="filled"/>',
    mono: '<circle cx="8" cy="8" r="6.25"/><path d="M8 1.75v12.5a6.25 6.25 0 0 0 0-12.5Z" class="filled"/>',
    dark: '<path d="M13.5 9.6A5.75 5.75 0 1 1 6.4 2.5a4.5 4.5 0 0 0 7.1 7.1Z"/>',
    click: '<path d="M6 1.5V3M2.4 2.9l1.1 1.1M1.5 6.5H3"/><path d="m6 6 7.5 2.75-3.25 1.25-1.25 3.25z" class="filled"/>',
    drag: '<path d="M6.5 1.5h-1m-2 0a1 1 0 0 0-1 1m0 2v1m0 2v1m0 2a1 1 0 0 0 1 1m2 0h1M8.5 1.5h1m2 0a1 1 0 0 1 1 1v1"/><path d="m8 7 7 2.5-3 1-1 3z" class="filled"/>',
}

// The footer: one dashed line with a tip for the view (an example search in
// the list, how to use a mark in the detail view) and the website
const PANEL_TIPS = {
    list: [PANEL_ICONS.search, 'Try VN, HVN or Vietnam'],
    detail: [PANEL_ICONS.drag, 'Click or drag to insert'],
}
const panelFooter = (t, view) => {
    const [tipIcon, tip] = (t.tips ?? PANEL_TIPS)[view]

    return `<rect x="12.5" y="516.5" width="${FW - 25}" height="33" rx="10" fill="none" stroke="${t.tertiaryText}" stroke-opacity="0.45" stroke-dasharray="3 3"/>
${panelIcon(tipIcon, 25, 525, 16, t.tertiaryText)}
<text x="49" y="537.4" font-size="12" fill="${t.tertiaryText}">${tip}</text>
<text x="${FW - 25}" y="537.4" font-size="12" text-anchor="end" fill="${t.tertiaryText}">soaringsymbols.org</text>`
}

// The detail view of an airline, as src/main.ts and src/styles.css lay it
// out: the column names as pills, the size and mono color on the same three
// columns under them, then a row per mark type
const panelDetail = (t, slug, title, meta, mono, primary) => {
    const colW = (FW - 24 - 16) / 3
    const colX = (i) => 12 + i * (colW + 8)
    const checkerId = `checker-${t.bg.slice(1)}`
    // The marks a little larger than the plugin's 60px, so they read at
    // Marketplace sizes; a logo's square box is mostly empty above and below
    const markSize = { logo: 92, 'logo-stacked': 70, icon: 56 }
    const tileCell = (file, i, y, dark, size, tint) => {
        let svg = asset(slug, file)
        if (tint) svg = svg.replaceAll(/currentColor/gi, tint)
        const x = colX(i)

        // A frame around the preview, as in the plugin: the tile's ring,
        // a 5px gap, then the preview, its checker over white so the
        // pattern's seams never let the panel show through
        return `<rect x="${x + 0.5}" y="${y + 0.5}" width="${colW - 1}" height="79" rx="11.5" fill="none" stroke="${t.divider}"/>
<rect x="${x + 5}" y="${y + 5}" width="${colW - 10}" height="70" rx="7" fill="${dark ? '#262626' : '#ffffff'}"/>
${dark ? '' : `<rect x="${x + 5}" y="${y + 5}" width="${colW - 10}" height="70" rx="7" fill="url(#${checkerId})"/>`}
${img(svg, x + (colW - size) / 2, y + 40 - size / 2, size)}`
    }
    const rows = [
        ['Logo', 'logo', 'Mark and name, side by side'],
        ['Stacked logo', 'logo-stacked', 'Name under the mark'],
        ['Icon', 'icon', 'The mark on its own'],
    ]
        .map(([label, type, hint], r) => {
            const y = 133 + r * 114
            const size = markSize[type]

            return `<text x="12" y="${y + 24.4}" font-size="12" font-weight="600" fill="${t.text}">${label}</text>
<text x="${FW - 12}" y="${y + 24}" font-size="11" text-anchor="end" fill="${t.tertiaryText}">${hint}</text>
${tileCell(type, 0, y + 34, false, size)}
${tileCell(`${type}-mono`, 1, y + 34, false, size, mono)}
${tileCell(`${type}-dark`, 2, y + 34, true, size)}`
        })
        .join('\n')
    // A column name: its icon and title, centered in an outlined pill
    const pill = (i, icon, label, textW) => {
        const x = colX(i)
        const left = x + (colW - (14 + 6 + textW)) / 2

        return `<rect x="${x + 0.5}" y="54.5" width="${colW - 1}" height="29" rx="8.5" fill="none" stroke="${t.divider}"/>
${panelIcon(icon, left, 62, 14, t.secondary)}
<text x="${left + 20}" y="73.4" font-size="12" font-weight="500" fill="${t.text}">${label}</text>`
    }
    const field = (
        i,
        body,
        chevron = true,
    ) => `<rect x="${colX(i)}" y="92" width="${colW}" height="30" rx="9" fill="${t.tertiary}"/>
${body}
${chevron ? panelIcon(PANEL_ICONS.chevron, colX(i) + colW - 22, 99, 16, t.tertiaryText) : ''}`
    const swatch = (cx, color) =>
        `<circle cx="${cx}" cy="107" r="7" fill="${color}"/><circle cx="${cx}" cy="107" r="6.5" fill="none" stroke="${t.text}" stroke-opacity="0.2"/>`

    return `<defs>${checker(checkerId)}</defs>
<rect width="${FW}" height="560" fill="${t.bg}"/>
${panelIcon(PANEL_ICONS.back, 15, 17, 16, t.secondary)}
<text x="44" y="21.6" font-size="13" font-weight="700" fill="${t.text}">${title}</text>
<text x="44" y="38.4" font-size="12" fill="${t.tertiaryText}">${meta}</text>
${pill(0, PANEL_ICONS.color, 'Color', 32)}
${pill(1, PANEL_ICONS.mono, 'Mono', 32)}
${pill(2, PANEL_ICONS.dark, 'Dark', 28)}
${field(0, `<text x="${colX(0) + 10}" y="111.4" font-size="12" fill="${t.tertiaryText}">Size</text><text x="${colX(0) + 40}" y="111.4" font-size="12" font-weight="500" fill="${t.text}">${t.size ?? '64 px'}</text>`)}
${field(1, `${swatch(colX(1) + 17, mono)}<text x="${colX(1) + 30}" y="111.4" font-size="12" font-weight="500" fill="${t.text}">${mono.toUpperCase()}</text>`)}
${field(2, `${swatch(colX(2) + colW / 2 - 25, primary)}<text x="${colX(2) + colW / 2 - 12}" y="111.4" font-size="12" font-weight="600" fill="${t.text}">Primary</text>`, false)}
<rect x="12" y="132" width="${FW - 24}" height="1" fill="${t.divider}"/>
${rows}
${panelFooter(t, 'detail')}`
}

const { listAirlines, listAlliances } = await import('soaring-symbols')

// The list view: the search field, then the alliances with marks and the
// airlines, in the order the plugin lists them for an empty search
const panelList = async (t) => {
    const hasMarks = (owner) => Object.values(owner.assets).some(Boolean)
    // A row's mark: on a dark theme (t.dark) its version for dark
    // backgrounds when it has one, else its color one, which Webflow puts on
    // a light chip there (t.chip) so a dark mark still shows
    const thumb = (root, owner) => {
        const type = ['icon', 'logo', 'tail'].find((k) => owner.assets[k])
        const info = owner.assets[type]
        const dark = t.dark && info.dark
        const file = dark ? `${type}-dark` : info.color ? type : `${type}-mono`

        return {
            svg: readFileSync(
                `${ROOT}/node_modules/soaring-symbols/dist/${root}/${owner.slug}/${file}.svg`,
                'utf8',
            ),
            chip: t.dark && t.chip && !dark,
        }
    }
    const alliances = listAlliances().filter(hasMarks)
    const airlines = listAirlines().filter((a) => !a.defunct)
    let y = 46
    const parts = []
    const heading = (label) => {
        parts.push(
            `<text x="12" y="${y + 24.4}" font-size="12" font-weight="600" fill="${t.secondary}">${label}</text>`,
        )
        y += 28
    }
    const row = ({ svg, chip }, name, meta) => {
        parts.push(`${chip ? `<rect x="12" y="${y + 8}" width="28" height="28" rx="6" fill="#ffffff"/>${img(svg, 14, y + 10, 24)}` : img(svg, 12, y + 8, 28)}
<text x="50" y="${y + 20.4}" font-size="12" font-weight="600" fill="${t.text}">${name}</text>
<text x="50" y="${y + 36.4}" font-size="12" fill="${t.tertiaryText}">${meta}</text>`)
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
<rect x="8" y="8" width="${FW - 16}" height="30" rx="8" fill="${t.tertiary}"/>
${panelIcon(PANEL_ICONS.search, 17, 16, 14, t.tertiaryText)}
<text x="37" y="27.4" font-size="12" fill="${t.tertiaryText}">Search airlines and alliances</text>
<clipPath id="list"><rect y="46" width="${FW}" height="466"/></clipPath>
<g clip-path="url(#list)">${parts.join('\n')}</g>
<rect y="512" width="${FW}" height="48" fill="${t.bg}"/>
${panelFooter(t, 'list')}`
}

const VN = ['vietnam-airlines', 'Vietnam Airlines', 'VN · HVN · SkyTeam']
const VN_PRIMARY = '#d99e09'

// The Figma Community thumbnail (1920 × 1080): the name, a headline and a
// line beside the plugin's panel, which src/ui.html in soaring-symbols/figma
// lays out as the Framer plugin's (drawn by panelDetail in Figma's light
// theme colors, 1.6x and without a window title bar), with a tile being
// dragged out of it onto marks placed on the canvas
const FIGMA_LIGHT = {
    bg: '#ffffff',
    tertiary: '#f5f5f5',
    divider: '#e6e6e6',
    text: '#1e1e1e',
    secondary: '#757575',
    tertiaryText: '#b3b3b3',
}
const FIGMA_SCALE = 1.6
const figmaPanel = `<defs>
  <filter id="figma-shadow" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="#000000" flood-opacity="0.3"/>
  </filter>
  <clipPath id="figma-panel"><rect width="${FW}" height="560" rx="12"/></clipPath>
</defs>
<g transform="translate(${1920 - 120 - FW * FIGMA_SCALE} ${(1080 - 560 * FIGMA_SCALE) / 2}) scale(${FIGMA_SCALE})">
  <rect width="${FW}" height="560" rx="12" fill="${FIGMA_LIGHT.bg}" filter="url(#figma-shadow)"/>
  <g clip-path="url(#figma-panel)" font-family="Inter">${panelDetail(FIGMA_LIGHT, ...VN, '#000000', VN_PRIMARY)}</g>
</g>`

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
${figmaPanel}
<g transform="translate(260 0)">${drag}</g>
</svg>`

write('figma/thumbnail.png', render(thumb, 1920))

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
        screenshot(
            light,
            panelDetail(light, ...VN, '#000000', VN_PRIMARY),
            DARK,
        ),
        1600,
    ),
)
write(
    'framer/screenshot-marks-dark.png',
    render(
        screenshot(
            dark,
            panelDetail(dark, ...VN, VN_PRIMARY, VN_PRIMARY),
            LIGHT,
        ),
        1600,
    ),
)
write(
    'framer/screenshot-search-light.png',
    render(screenshot(light, await panelList(light), DARK), 1600),
)

// The thumbnail, at the 1600 × 1200 Framer recommends for a plugin's media:
// the name and a headline beside the plugin window, and a tile being dragged
// out of it onto marks already placed on the canvas (both moved down a
// little from the Figma thumbnail's places, for the taller frame)
const framerThumb = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200" viewBox="0 0 1600 1200" font-family="Overpass">
<rect width="1600" height="1200" fill="${DARK}"/>
<g>${brandMark}</g>
<text x="196" y="150.6" font-size="36" font-weight="700" fill="${LIGHT}">Soaring Symbols</text>
<text font-size="84" font-weight="800" fill="${LIGHT}">
  <tspan x="120" y="420">Airline logos,</tspan>
  <tspan x="120" y="520">right in Framer.</tspan>
</text>
<rect x="120" y="600" width="160" height="12" rx="6" fill="${YELLOW}"/>
<g transform="translate(0 80)">${placed}</g>
<g transform="translate(960 ${(1200 - FH * 1.6) / 2}) scale(1.6)">${framerWindow(light, panelDetail(light, ...VN, '#000000', VN_PRIMARY))}</g>
<g transform="translate(0 80)">${drag.replaceAll('#0d99ff', '#0099ff')}</g>
</svg>`

write('framer/thumbnail.png', render(framerThumb, 1600))

// The poster on the Framer creator profile (2400 × 400): the dark lockup in
// the middle between airline icons on tiles, as on the thumbnails' canvas.
// Everything sits in the middle band, clear of the corners a profile page
// may cover with the avatar or crop on narrow screens.
const lockup = markSvg('logo-dark')
const [, , lockupW, lockupH] = lockup
    .match(/viewBox="([\d.\s]+)"/)[1]
    .split(/\s+/)
    .map(Number)
const LOCKUP_H = 90,
    LOCKUP_W = (LOCKUP_H * lockupW) / lockupH
const lockupX = (2400 - LOCKUP_W) / 2
const POSTER_TILE = 150,
    POSTER_GAP = 28,
    POSTER_MARGIN = 90
const posterTile = (slug, x) => {
    const y = (400 - POSTER_TILE) / 2

    return `<rect x="${x}" y="${y}" width="${POSTER_TILE}" height="${POSTER_TILE}" rx="16" fill="#2b3139"/>
<rect x="${x + 10}" y="${y + 10}" width="${POSTER_TILE - 20}" height="${POSTER_TILE - 20}" rx="10" fill="#ffffff"/>
${img(asset(slug, 'icon'), x + 28, y + 28, POSTER_TILE - 56)}`
}
const groupW = 3 * POSTER_TILE + 2 * POSTER_GAP
const posterGroup = (slugs, left) =>
    slugs
        .map((slug, i) =>
            posterTile(slug, left + i * (POSTER_TILE + POSTER_GAP)),
        )
        .join('\n')

const poster = `<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="400" viewBox="0 0 2400 400">
<rect width="2400" height="400" fill="${DARK}"/>
${posterGroup(['qantas', 'lufthansa', 'singapore-airlines'], lockupX - POSTER_MARGIN - groupW)}
${lockup.replace('<svg ', `<svg x="${lockupX}" y="${(400 - LOCKUP_H) / 2}" width="${LOCKUP_W}" height="${LOCKUP_H}" `)}
${posterGroup(['vietnam-airlines', 'air-france', 'cathay-pacific'], lockupX + LOCKUP_W + POSTER_MARGIN)}
</svg>`

write('framer/poster.png', render(poster, 2400))

// The Webflow Marketplace images: a 900 × 900 logo (a logomark, at most
// 50 KB) and screenshots at 1280 × 846. The screenshots draw the extension's
// panel as soaring-symbols/webflow lays it out in src/index.html (CSS
// pixels, in the Designer's dark panel colors, under the Designer's
// extension title bar), beside a headline, and one shows a page with a mark
// just inserted into the selected element.
write('webflow/logo.png', render(markSvg('square-signal'), 900))

// The panel's colors in the Designer's dark and light appearances, as
// src/index.html in soaring-symbols/webflow sets them
// panelDetail and panelList draw its panel, which is laid out as the
// Framer plugin's, with Webflow's own tips (no dragging: a mark goes into
// the selected element); on the dark panel the list shows marks for dark
// backgrounds, and a light chip under a mark that has none
const WF = {
    bg: '#2b2b2b',
    bar: '#1e1e1e',
    divider: '#444444',
    tertiary: '#363636',
    text: '#f5f5f5',
    secondary: '#a3a3a3',
    tertiaryText: '#7c7c7c',
    blue: '#146ef5',
    dark: true,
    chip: true,
    tips: {
        list: PANEL_TIPS.list,
        detail: [PANEL_ICONS.click, 'Select, then click a mark'],
    },
}
const WF_LIGHT = {
    ...WF,
    bg: '#ffffff',
    bar: '#f5f5f5',
    divider: '#dedede',
    tertiary: '#ebebeb',
    text: '#1e1e1e',
    secondary: '#6b6b6b',
    tertiaryText: '#9a9a9a',
    dark: false,
}
const WW = 360,
    WBAR = 36,
    WH = 560 + WBAR

// The Designer's extension window: the app's icon and name, and a close
// button, then the panel
const webflowWindow = (t, body) => `
<defs>
  <filter id="wf-shadow" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="12" stdDeviation="18" flood-color="#000000" flood-opacity="0.45"/>
  </filter>
  <clipPath id="wf-window"><rect width="${WW}" height="${WH}" rx="6"/></clipPath>
</defs>
<rect width="${WW}" height="${WH}" rx="6" fill="${t.bg}" filter="url(#wf-shadow)"/>
<g clip-path="url(#wf-window)" font-family="Inter">
  <rect width="${WW}" height="${WBAR}" fill="${t.bar}"/>
  <svg x="12" y="10" width="16" height="16" viewBox="0 0 512 512">${mark.replace(/<\/?svg[^>]*>/g, '')}</svg>
  <text x="36" y="22.2" font-size="12" font-weight="700" fill="${t.text}">Soaring Symbols</text>
  <path d="M ${WW - 24} 13 l 10 10 M ${WW - 14} 13 l -10 10" stroke="${t.secondary}" stroke-width="1.5" stroke-linecap="round"/>
  <rect y="${WBAR - 1}" width="${WW}" height="1" fill="${t.divider}"/>
  <g transform="translate(0 ${WBAR})">${body}</g>
</g>`

// Pages in the Designer's canvas, each with a mark just inserted into the
// selected element, outlined in the Designer's blue

// An airline's partner strip
const webflowPartnerPage = (w, h) => {
    const tiles = [
        'vietnam-airlines',
        'singapore-airlines',
        'japan-airlines',
        'qatar-airways',
        'turkish-airlines',
        'emirates',
    ]
    const tileW = (w - 2 * 48 - 2 * 20) / 3,
        tileH = 110
    const cells = tiles
        .map((slug, i) => {
            const x = 48 + (i % 3) * (tileW + 20)
            const y = 196 + Math.floor(i / 3) * (tileH + 20)
            const selected = i === 0

            return `<rect x="${x}" y="${y}" width="${tileW}" height="${tileH}" rx="10" fill="#f4f4f2"/>
${img(asset(slug, 'logo'), x + (tileW - 120) / 2, y + (tileH - 120) / 2, 120)}
${
    selected
        ? `<rect x="${x - 1}" y="${y - 1}" width="${tileW + 2}" height="${tileH + 2}" fill="none" stroke="${WF.blue}" stroke-width="2"/>
<rect x="${x - 2}" y="${y - 22}" width="164" height="20" fill="${WF.blue}"/>
<text x="${x + 6}" y="${y - 8}" font-family="Inter" font-size="11" font-weight="600" fill="#ffffff">Image · soaring-symbols-64</text>`
        : ''
}`
        })
        .join('\n')

    return `<defs><clipPath id="wf-page"><rect width="${w}" height="${h}" rx="8"/></clipPath></defs>
<rect width="${w}" height="${h}" rx="8" fill="#ffffff" filter="url(#wf-shadow)"/>
<g clip-path="url(#wf-page)">
  <rect width="${w}" height="64" fill="#ffffff"/>
  <rect y="64" width="${w}" height="1" fill="#e6e6e6"/>
  <text x="48" y="40" font-size="20" font-weight="800" fill="${DARK}">Skyward</text>
  <g font-family="Inter" font-size="13" fill="#555555" text-anchor="end">
    <text x="${w - 48}" y="39">Contact</text>
    <text x="${w - 118}" y="39">Deals</text>
    <text x="${w - 178}" y="39">Destinations</text>
  </g>
  <text x="48" y="130" font-size="34" font-weight="800" fill="${DARK}">Fly with our partners</text>
  <text x="48" y="164" font-family="Inter" font-size="14" fill="#666666">Airlines that take you further, with one booking.</text>
  ${cells}
</g>`
}

// The hero of the demo site (soaring-symbols.webflow.io), with its row of
// marks for dark backgrounds, the first one just inserted
const webflowDemoPage = (w, h) => {
    const cx = w / 2
    const marks = [
        asset('vietnam-airlines', 'icon-dark'),
        asset('singapore-airlines', 'icon-dark'),
        asset('qatar-airways', 'icon-dark'),
        asset('emirates', 'icon-dark'),
        readFileSync(`${AIRLINES}/../alliances/skyteam/icon-dark.svg`, 'utf8'),
        readFileSync(
            `${AIRLINES}/../alliances/star-alliance/icon-dark.svg`,
            'utf8',
        ),
    ]
    const size = 44,
        gap = 30,
        rowX = cx - (marks.length * size + (marks.length - 1) * gap) / 2,
        rowY = 416
    const row = marks
        .map((svg, i) => img(svg, rowX + i * (size + gap), rowY, size))
        .join('\n')
    const logoH = 30,
        logoW = (logoH * lockupW) / lockupH
    const primaryW = 178,
        secondaryW = 166,
        buttonsX = cx - (primaryW + 10 + secondaryW) / 2

    return `<defs><clipPath id="wf-page"><rect width="${w}" height="${h}" rx="8"/></clipPath></defs>
<rect width="${w}" height="${h}" rx="8" fill="${DARK}" filter="url(#wf-shadow)"/>
<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="7.5" fill="none" stroke="${LIGHT}" stroke-opacity="0.14"/>
<g clip-path="url(#wf-page)">
<g transform="translate(0 ${Math.round((h - (rowY + size - 52)) / 2 - 52)})" text-anchor="middle">
  ${lockup.replace('<svg ', `<svg x="${cx - logoW / 2}" y="52" width="${logoW}" height="${logoH}" `)}
  <rect x="${cx - 46}" y="98" width="92" height="24" rx="12" fill="none" stroke="${YELLOW}" stroke-opacity="0.45"/>
  <text x="${cx}" y="114.5" font-size="11" font-weight="700" fill="${YELLOW}">for Webflow</text>
  <text font-size="38" font-weight="800" fill="${LIGHT}">
    <tspan x="${cx}" y="180">Every airline logo,</tspan>
    <tspan x="${cx}" y="224">ready for your site</tspan>
  </text>
  <text font-size="14" fill="#b5b6b0">
    <tspan x="${cx}" y="264">Search ${airlineCount}+ airlines and the airline alliances by name or code,</tspan>
    <tspan x="${cx}" y="286">then drop their logos onto your page as crisp SVG images.</tspan>
  </text>
  <rect x="${buttonsX}" y="314" width="${primaryW}" height="40" rx="20" fill="${YELLOW}"/>
  <text x="${buttonsX + primaryW / 2}" y="339" font-size="14" font-weight="700" fill="${DARK}">Explore the collection</text>
  <rect x="${buttonsX + primaryW + 10.5}" y="314.5" width="${secondaryW - 1}" height="39" rx="19.5" fill="none" stroke="${LIGHT}" stroke-opacity="0.35"/>
  <text x="${buttonsX + primaryW + 10 + secondaryW / 2}" y="339" font-size="14" font-weight="700" fill="${LIGHT}">Get the Webflow app</text>
  ${row}
  <rect x="${rowX - 4}" y="${rowY - 4}" width="${size + 8}" height="${size + 8}" fill="none" stroke="${WF.blue}" stroke-width="2"/>
  <rect x="${rowX - 5}" y="${rowY - 25}" width="164" height="20" fill="${WF.blue}"/>
  <text x="${rowX + 1}" y="${rowY - 11}" text-anchor="start" font-family="Inter" font-size="11" font-weight="600" fill="#ffffff">Image · soaring-symbols-64</text>
</g>
</g>`
}

const SW = 1280,
    SH = 846
const airlineCount = Math.floor(listAirlines().length / 10) * 10

// A screenshot: a headline over the brand's dark board, or its paper for
// the light panel, and the panel (and, for the insert and demo ones, a page)
// beside it
const webflowShot = ({ title, lines, body, page, theme = WF }) => {
    const light = theme === WF_LIGHT
    const ink = light ? DARK : LIGHT
    const scale = 1.25
    const wx = SW - 64 - WW * scale,
        wy = (SH - WH * scale) / 2
    const text = (x, y, width) => `
<text x="${x}" y="${y}" font-size="44" font-weight="800" fill="${ink}">${title}</text>
<text font-size="22" fill="${ink}" fill-opacity="0.75">${lines
        .map(
            (line, i) =>
                `<tspan x="${x}" y="${y + 52 + i * 32}">${line}</tspan>`,
        )
        .join('')}</text>
<rect x="${x}" y="${y - 82}" width="${width}" height="0" fill="none"/>`
    const left = page
        ? `${text(64, 116, 640)}<g transform="translate(64 ${116 + 52 + lines.length * 32 + 10})">${page(wx - 64 - 48, SH - (116 + 52 + lines.length * 32 + 10) - 56)}</g>`
        : text(80, 330, 600)

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${SW}" height="${SH}" viewBox="0 0 ${SW} ${SH}" font-family="Overpass">
<rect width="${SW}" height="${SH}" fill="${light ? LIGHT : DARK}"/>
${left}
<g transform="translate(${wx} ${wy}) scale(${scale})">${webflowWindow(theme, body)}</g>
</svg>`
}

write(
    'webflow/screenshot-demo.png',
    render(
        webflowShot({
            title: 'Ready for dark sections',
            lines: [
                'Marks for dark backgrounds fit a dark hero, as on',
                'the demo site, soaring-symbols.webflow.io.',
            ],
            body: panelDetail(WF, ...VN, '#000000', VN_PRIMARY),
            page: webflowDemoPage,
        }),
        SW,
    ),
)
write(
    'webflow/screenshot-insert.png',
    render(
        webflowShot({
            title: 'Airline logos, one click away',
            lines: [
                'Select an element, click a mark: it lands as an image,',
                'added to your assets with alt text.',
            ],
            body: panelDetail(WF, ...VN, '#000000', VN_PRIMARY),
            page: webflowPartnerPage,
        }),
        SW,
    ),
)
write(
    'webflow/screenshot-search.png',
    render(
        webflowShot({
            title: `Search ${airlineCount}+ airlines`,
            lines: [
                'By name, IATA or ICAO code, callsign or',
                'slug, plus oneworld, SkyTeam and',
                'Star Alliance.',
            ],
            body: await panelList(WF),
        }),
        SW,
    ),
)
write(
    'webflow/screenshot-versions.png',
    render(
        webflowShot({
            title: 'Every version of a mark',
            lines: [
                'Color, monochrome in any color, and',
                'the version for dark backgrounds, for',
                'each logo, stacked logo, icon and tail.',
            ],
            body: panelDetail(WF, ...VN, VN_PRIMARY, VN_PRIMARY),
        }),
        SW,
    ),
)
write(
    'webflow/screenshot-light.png',
    render(
        webflowShot({
            title: 'Matches your Designer',
            lines: [
                'Light or dark, the panel follows the',
                'Designer’s appearance, and paints mono',
                'marks in any color or the airline’s own.',
            ],
            body: panelDetail(
                WF_LIGHT,
                'japan-airlines',
                'Japan Airlines',
                'JL · JAL · oneworld',
                '#cc0000',
                '#cc0000',
            ),
            theme: WF_LIGHT,
        }),
        SW,
    ),
)

// The Miro Marketplace screenshots: at most 1258 × 706, full bleed, on no
// white or light gray background, with a line or two of text at most. The
// app's panel, as soaring-symbols/miro lays it out in src/panel.html (the
// Webflow panel's light colors, which it always uses, with its own tip),
// docks left of a board in Miro's dark theme, beside Miro's toolbar
const MIRO = {
    ...WF_LIGHT,
    blue: '#4262ff',
    // Its default width on the board, which has no pixels
    size: '256',
    tips: {
        list: PANEL_TIPS.list,
        detail: [PANEL_ICONS.drag, 'Click or drag a mark'],
    },
}
const MSW = 1258,
    MSH = 706
const MW = 360,
    MBAR = 48,
    MH = 560 + MBAR
const MX = 88,
    MY = (MSH - MH) / 2

// Miro's dark board: a dot grid on near black
const miroBoard = `<defs>
  <pattern id="mr-dots" width="24" height="24" patternUnits="userSpaceOnUse">
    <circle cx="12" cy="12" r="1.2" fill="${LIGHT}" fill-opacity="0.12"/>
  </pattern>
  <filter id="mr-shadow" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="8" stdDeviation="14" flood-color="#000000" flood-opacity="0.5"/>
  </filter>
  <clipPath id="mr-panel"><rect width="${MW}" height="${MH}" rx="12"/></clipPath>
</defs>
<rect width="${MSW}" height="${MSH}" fill="${DARK}"/>
<rect width="${MSW}" height="${MSH}" fill="url(#mr-dots)"/>`

// Miro's toolbar: a column of tools, the app's icon last and selected
const miroToolbar = () => {
    const x = 24,
        w = 48,
        tools = 6
    const h = 16 + tools * 40 + 48
    const y = MY

    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="#ffffff" filter="url(#mr-shadow)"/>
${Array.from(
    { length: tools },
    (_, i) =>
        `<rect x="${x + 14}" y="${y + 20 + i * 40}" width="20" height="20" rx="5" fill="none" stroke="#8a8c94" stroke-width="1.6"/>`,
).join('\n')}
<rect x="${x + 6}" y="${y + 12 + tools * 40}" width="36" height="36" rx="8" fill="${MIRO.blue}" fill-opacity="0.12"/>
<svg x="${x + 12}" y="${y + 18 + tools * 40}" width="24" height="24" viewBox="0 0 512 512">${mark.replace(/<\/?svg[^>]*>/g, '')}</svg>`
}

// The app's panel: its name and a close button over the panel itself
const miroPanel = (body) => `
<g transform="translate(${MX} ${MY})">
<rect width="${MW}" height="${MH}" rx="12" fill="${MIRO.bg}" filter="url(#mr-shadow)"/>
<g clip-path="url(#mr-panel)" font-family="Inter">
  <text x="20" y="30" font-size="15" font-weight="700" fill="${MIRO.text}">Soaring Symbols</text>
  <path d="M ${MW - 30} 19 l 10 10 M ${MW - 20} 19 l -10 10" stroke="${MIRO.secondary}" stroke-width="1.5" stroke-linecap="round"/>
  <g transform="translate(0 ${MBAR})">${body}</g>
</g>
</g>`

// The headline right of the panel: a title and at most one line under it
const RX = MX + MW + 64,
    RW = MSW - RX - 56
const miroText = (title, line, y) => `
<text x="${RX}" y="${y}" font-size="36" font-weight="800" fill="${LIGHT}">${title}</text>
${line ? `<text x="${RX}" y="${y + 38}" font-size="20" fill="${LIGHT}" fill-opacity="0.75">${line}</text>` : ''}`

const miroShot = (body, right) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${MSW}" height="${MSH}" viewBox="0 0 ${MSW} ${MSH}" font-family="Overpass">
${miroBoard}
${miroToolbar()}
${miroPanel(body)}
${right}
</svg>`

// A frame on the board holding airline logos, the first one just dropped
// there and selected, with the pointer that dropped it
const miroFrame = () => {
    const x = RX,
        y = 196,
        w = RW,
        h = MSH - y - 52
    const slugs = [
        'vietnam-airlines',
        'singapore-airlines',
        'japan-airlines',
        'qatar-airways',
        'turkish-airlines',
        'emirates',
    ]
    const pad = 36,
        gap = 20,
        cw = (w - 2 * pad - 2 * gap) / 3,
        ch = (h - 2 * pad - gap) / 2,
        size = Math.min(cw, ch) - 16
    const cells = slugs
        .map((slug, i) => {
            const cx = x + pad + (i % 3) * (cw + gap) + cw / 2
            const cy = y + pad + Math.floor(i / 3) * (ch + gap) + ch / 2

            return img(asset(slug, 'logo'), cx - size / 2, cy - size / 2, size)
        })
        .join('\n')
    // The selected logo's box: the drawn part of a 64 × 64 logo, which is
    // wider than tall
    const sx = x + pad + (cw - size) / 2,
        sy = y + pad + (ch - size) / 2 + size * 0.3,
        sw = size,
        sh = size * 0.4
    const handle = (hx, hy) =>
        `<circle cx="${hx}" cy="${hy}" r="5" fill="#ffffff" stroke="${MIRO.blue}" stroke-width="2"/>`

    return `<text x="${x}" y="${y - 10}" font-family="Inter" font-size="13" fill="${LIGHT}" fill-opacity="0.6">Partner airlines</text>
<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#ffffff"/>
${cells}
<rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" fill="none" stroke="${MIRO.blue}" stroke-width="2"/>
${handle(sx, sy)}${handle(sx + sw, sy)}${handle(sx, sy + sh)}${handle(sx + sw, sy + sh)}
<path d="M ${sx + sw - 18} ${sy + sh - 4} l 0 30 l 8 -7 l 6 13 l 6 -2.5 l -6 -12.5 l 11 -0.5 Z" fill="#1e1e1e" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/>`
}

write(
    'miro/screenshot-1.png',
    render(
        miroShot(
            panelDetail(MIRO, ...VN, '#000000', VN_PRIMARY),
            `${miroText('Airline logos on your board', 'Click a mark, or drag it where it goes.', 104)}
${miroFrame()}`,
        ),
        MSW,
    ),
)
write(
    'miro/screenshot-2.png',
    render(
        miroShot(
            await panelList(MIRO),
            miroText(
                `Search ${airlineCount}+ airlines`,
                'By name or code, plus the airline alliances.',
                MSH / 2 - 10,
            ),
        ),
        MSW,
    ),
)
write(
    'miro/screenshot-3.png',
    render(
        miroShot(
            panelDetail(MIRO, ...VN, VN_PRIMARY, VN_PRIMARY),
            miroText(
                'Every version of a mark',
                'Color, mono in any color, and for dark boards.',
                MSH / 2 - 10,
            ),
        ),
        MSW,
    ),
)
