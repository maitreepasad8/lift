import type { Rect } from '../types/messages'

/**
 * Crops a full-tab screenshot to the selected rect and prepares it for OCR:
 * scaled up (Tesseract prefers larger glyphs) and converted to grayscale.
 *
 * `rect` is in CSS pixels; the screenshot is in device pixels.
 */
export async function cropImage(
  dataUrl: string,
  rect: Rect,
  devicePixelRatio: number,
  upscale = 2,
): Promise<Blob> {
  const source = await createImageBitmap(await (await fetch(dataUrl)).blob())

  // Clamp to the screenshot bounds in case the selection touched an edge.
  const sx = clamp(Math.round(rect.x * devicePixelRatio), 0, source.width - 1)
  const sy = clamp(Math.round(rect.y * devicePixelRatio), 0, source.height - 1)
  const sw = clamp(Math.round(rect.width * devicePixelRatio), 1, source.width - sx)
  const sh = clamp(Math.round(rect.height * devicePixelRatio), 1, source.height - sy)

  // Retina screenshots are already large; don't blow them up further.
  const scale = devicePixelRatio >= 2 ? 1 : upscale
  const canvas = new OffscreenCanvas(sw * scale, sh * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')

  ctx.imageSmoothingQuality = 'high'
  ctx.filter = 'grayscale(1)'
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
  source.close()

  return canvas.convertToBlob({ type: 'image/png' })
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
