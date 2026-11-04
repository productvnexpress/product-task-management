/**
 * Dựng sprite icon VDS cho WMS từ bộ phát hành VDS.
 *
 *   node scripts/build-vds-icon-sprite.mjs <thư mục icons của bộ phát hành VDS>
 *   vd: node scripts/build-vds-icon-sprite.mjs ~/Downloads/vds-0.5.0/icons
 *
 * Chỉ lấy các icon khai báo trong src/components/vds/icon-map.json (theme Regular, cỡ 16/20/24;
 * thêm theme Filled cho FILLED). Ghi ra public/vds/<phiên bản>/icons/sprite.svg.
 * Thêm icon mới: bổ sung icon-map.json rồi chạy lại lệnh.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const VERSION = '0.5.0'
const SIZES = [16, 20, 24]
const FILLED = new Set(['Star', 'Play', 'CheckmarkCircle', 'Circle', 'Alert', 'Warning', 'Info'])

const iconsDir = process.argv[2] && resolve(process.argv[2])
if (!iconsDir || !existsSync(iconsDir)) {
  console.error('Thiếu đường dẫn tới thư mục icons của bộ phát hành VDS.')
  process.exit(1)
}

const map = JSON.parse(readFileSync(join(root, 'src/components/vds/icon-map.json'), 'utf8'))
const names = [...new Set(Object.values(map))].sort()

const symbols = []
const missing = []
for (const name of names) {
  const themes = FILLED.has(name) ? ['Regular', 'Filled'] : ['Regular']
  for (const theme of themes) {
    let found = 0
    for (const size of SIZES) {
      const id = `${name}__${theme}__${size}`
      const file = join(iconsDir, `Icon__${id}.svg`)
      if (!existsSync(file)) continue
      const svg = readFileSync(file, 'utf8')
      const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1] ?? `0 0 ${size} ${size}`
      const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').trim()
      symbols.push(`<symbol id="${id}" viewBox="${viewBox}">${inner}</symbol>`)
      found++
    }
    if (!found) missing.push(`${name}__${theme}`)
  }
}

const out = join(root, `public/vds/${VERSION}/icons/sprite.svg`)
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n${symbols.join('\n')}\n</svg>\n`)
console.log(`✓ ${symbols.length} symbol → ${out}`)
if (missing.length) {
  console.error(`Không tìm thấy: ${missing.join(', ')}`)
  process.exit(1)
}
