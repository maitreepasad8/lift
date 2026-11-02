// Generates the toolbar icons (a "T" inside selection brackets) as PNGs with no
// image dependencies. Run with `npm run icons`; output is committed.
import { writeFileSync, mkdirSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const BG = [2, 132, 199] // #0284c7
const FG = [255, 255, 255]

function pixel(x, y) {
  // Work in a 0..1 unit square.
  const r = 0.2 // corner radius
  const cx = Math.min(Math.max(x, r), 1 - r)
  const cy = Math.min(Math.max(y, r), 1 - r)
  if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) return null // outside rounded square

  // Selection brackets in the corners.
  const inBand = (v, a, b) => v >= a && v <= b
  const t = 0.07
  const near = 0.16
  const far = 0.84
  const len = 0.2
  const corner =
    ((inBand(x, near, near + t) || inBand(x, far - t, far)) &&
      (inBand(y, near, near + len) || inBand(y, far - len, far))) ||
    ((inBand(y, near, near + t) || inBand(y, far - t, far)) &&
      (inBand(x, near, near + len) || inBand(x, far - len, far)))

  // The letter T.
  const letter =
    (inBand(y, 0.32, 0.42) && inBand(x, 0.32, 0.68)) || (inBand(x, 0.45, 0.55) && inBand(y, 0.32, 0.7))

  return corner || letter ? FG : BG
}

function png(size) {
  const samples = 4 // supersampling for smooth edges
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0 // filter: none
    for (let x = 0; x < size; x++) {
      let [r, g, b, a] = [0, 0, 0, 0]
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const c = pixel((x + (sx + 0.5) / samples) / size, (y + (sy + 0.5) / samples) / size)
          if (!c) continue
          r += c[0]
          g += c[1]
          b += c[2]
          a += 1
        }
      }
      const offset = y * (size * 4 + 1) + 1 + x * 4
      if (a) {
        raw[offset] = r / a
        raw[offset + 1] = g / a
        raw[offset + 2] = b / a
      }
      raw[offset + 3] = (a / samples ** 2) * 255
    }
  }

  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type), data])
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(body))
    return Buffer.concat([len, body, crc])
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8 // bit depth
  header[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function crc32(buf) {
  let crc = ~0
  for (const byte of buf) {
    crc ^= byte
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return ~crc >>> 0
}

mkdirSync('public/icons', { recursive: true })
for (const size of [16, 48, 128]) writeFileSync(`public/icons/icon-${size}.png`, png(size))
console.log('Icons written to public/icons')
