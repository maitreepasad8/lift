import { copyText } from '../lib/clipboard'
import { cropImage } from '../lib/crop-image'
import { recognizeText } from '../lib/ocr'
import type { OcrRequestMessage, OcrResponse, RuntimeMessage } from '../types/messages'

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
  if (message.type !== 'lift:ocr' || message.target !== 'offscreen') return false

  handleOcr(message).then(sendResponse)
  return true // keep the channel open for the async response
})

async function handleOcr({ dataUrl, rect, devicePixelRatio }: OcrRequestMessage): Promise<OcrResponse> {
  try {
    const image = await cropImage(dataUrl, rect, devicePixelRatio)
    const text = await recognizeText(image)
    if (text) copyText(text)
    return { ok: true, text }
  } catch (error) {
    console.error('Lift OCR failed', error)
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}
