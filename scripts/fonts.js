// Fonts from Google Fonts, downloaded on the first run and cached in
// node_modules/.cache/brand, for render.js and marks.js.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

export const ROOT = resolve(import.meta.dirname, '..')
const CACHE = `${ROOT}/node_modules/.cache/brand`

// TrueType files of a Google Fonts family, one per weight. Google serves
// TTF (which resvg needs) to a client that doesn't ask for WOFF2.
export const googleFont = async (family, weights) => {
    mkdirSync(CACHE, { recursive: true })
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
