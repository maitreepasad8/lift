import { createWorker, OEM, type Worker } from 'tesseract.js'

let workerPromise: Promise<Worker> | undefined

/** Lazily creates one Tesseract worker and reuses it for every capture. */
function getWorker(): Promise<Worker> {
  workerPromise ??= createWorker('eng', OEM.LSTM_ONLY, {
    // All assets are bundled under public/tesseract (see scripts/copy-tesseract.mjs).
    workerPath: chrome.runtime.getURL('tesseract/worker.min.js'),
    corePath: chrome.runtime.getURL('tesseract/core'),
    langPath: chrome.runtime.getURL('tesseract/lang'),
    workerBlobURL: false,
    // The language file is local, so IndexedDB caching buys nothing.
    cacheMethod: 'none',
  }).catch((error) => {
    workerPromise = undefined
    throw error
  })
  return workerPromise
}

export async function recognizeText(image: Blob): Promise<string> {
  const worker = await getWorker()
  const { data } = await worker.recognize(image)
  return tidy(data.text)
}

/** Trims trailing spaces on each line and collapses runs of blank lines. */
function tidy(text: string): string {
  return text
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
